import { readFileSync } from 'node:fs';
import { createHash,randomInt,randomUUID } from 'node:crypto';
import { Fault,uuid } from './store.mjs';
const raw=readFileSync(new URL('../../data/subjects/it1140.json',import.meta.url));
// This file lives in commerce/vm, so data is two levels up from commerce.
export const version=createHash('sha256').update(raw).digest('hex').slice(0,16);
export const bank=JSON.parse(raw);
export const python=JSON.parse(readFileSync(new URL('../../data/python-exercises.json',import.meta.url)));
export const questions=new Map(bank.questions.map(q=>[q.id,q]));
const topicChapter=new Map(bank.topics.map(t=>[t.id,t.chapter]));
const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
const searchable=new Map(bank.questions.map(q=>[q.id,fold(q.prompt+' '+q.choices.join(' '))]));
export function selectQuestions(chapter,query=''){
  if(chapter && chapter!=='all'&&!bank.chapters.some(c=>c.id===chapter))throw new Fault(400,'invalid_chapter');
  if(typeof query!=='string'||query.length>150)throw new Fault(400,'invalid_query');
  const text=fold(query.trim());
  return bank.questions.filter(q=>(!chapter||chapter==='all'||topicChapter.get(q.topic)===chapter)&&(!text||searchable.get(q.id).includes(text)));
}
export function publicQuestion(q){return {id:q.id,prompt:q.prompt,choices:q.choices,responseType:q.responseType,
  multiple:Array.isArray(q.answer),difficulty:q.difficulty,kind:q.kind,chapter:topicChapter.get(q.topic)};}
function numeric(value){
  if(typeof value!=='string'&&typeof value!=='number')return null;
  const s=String(value).trim().replace(',','.');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return null;
  const n=Number(s);return Number.isFinite(n)?n:null;
}
export function grade(q,value){
  let correct;
  if(q.responseType==='number')correct=numeric(value)===q.answer;
  else {const selected=Array.isArray(value)?value:[value];const expected=Array.isArray(q.answer)?q.answer:[q.answer];
    correct=selected.length===expected.length&&new Set(selected).size===selected.length&&selected.every(n=>Number.isInteger(n)&&expected.includes(n));}
  return {id:q.id,correct,answer:q.answer,explanation:q.explanation};
}
export function shuffled(list){const out=[...list];for(let i=out.length-1;i>0;i--){const j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
export async function courseRoute(path,method,url,data,db,a){
  if(path==='/api/course/catalog'&&method==='GET')return {version,userScope:a.user_id,chapters:bank.chapters.map(c=>({...c,count:selectQuestions(c.id).length})),total:bank.questions.length};
  if(path==='/api/course/questions'&&method==='GET'){
    let found=selectQuestions(url.searchParams.get('chapter'),url.searchParams.get('q')||'');
    const ids=url.searchParams.get('ids');
    if(ids){const allowed=ids.split(',');if(allowed.length>20)throw new Fault(400,'invalid_batch');found=found.filter(q=>allowed.includes(q.id));}
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||20);
    if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>20)throw new Fault(400,'invalid_batch');
    if(url.searchParams.get('shuffle')==='true')found=shuffled(found);
    const batch=found.slice(offset,offset+limit);
    if(batch.length)await db.query('insert into app.issued(user_id,question_id) select $1,unnest($2::text[]) on conflict do nothing',[a.user_id,batch.map(q=>q.id)]);
    return {total:found.length,offset,ids:found.map(q=>q.id),questions:batch.map(publicQuestion)};
  }
  if(path==='/api/course/grade'&&method==='POST'){
    const q=questions.get(data.id);if(!q)throw new Fault(404,'not_found');
    const issued=await db.query('select 1 from app.issued where user_id=$1 and question_id=$2',[a.user_id,q.id]);
    if(!issued.rows.length)throw new Fault(403,'question_not_issued');
    // A deliberate one-question review is supported, not an unrestricted answer-key API.
    return grade(q,data.review===true?null:data.answer);
  }
  if(path==='/api/course/exams'&&method==='POST'){
    const count=data.count??40;if(!Number.isInteger(count)||count<1||count>100)throw new Fault(400,'invalid_exam');
    const ids=shuffled(selectQuestions(data.chapter,data.query||'')).slice(0,count).map(q=>q.id);
    if(!ids.length)throw new Fault(400,'empty_exam');
    const id=randomUUID();await db.query('insert into app.exams(id,user_id,question_ids,bank_version) values($1,$2,$3,$4)',[id,a.user_id,JSON.stringify(ids),version]);
    return {id,count:ids.length};
  }
  const examMatch=path.match(/^\/api\/course\/exams\/([^/]+)(\/submit)?$/);
  if(examMatch){
    if(!uuid(examMatch[1]))throw new Fault(404,'not_found');
    const exam=(await db.query('select * from app.exams where id=$1 and user_id=$2 for update',[examMatch[1],a.user_id])).rows[0];
    if(!exam)throw new Fault(404,'not_found');
    if(exam.result){
      const offset=Number(url.searchParams.get('offset')||0);
      if(!Number.isInteger(offset)||offset<0)throw new Fault(400,'invalid_batch');
      return {id:exam.id,submitted:true,offset,ids:exam.question_ids,questions:exam.question_ids.slice(offset,offset+20).map(id=>publicQuestion(questions.get(id))),...exam.result};
    }
    if(new Date(exam.expires_at)<new Date())throw new Fault(410,'exam_expired');
    if(exam.bank_version!==version)throw new Fault(409,'exam_version_changed');
    if(examMatch[2]&&method==='POST'){
      if(!data.answers||Array.isArray(data.answers)||typeof data.answers!=='object')throw new Fault(400,'invalid_answers');
      const results=exam.question_ids.map(id=>grade(questions.get(id),data.answers[id]));
      const result={results,correct:results.filter(r=>r.correct).length,total:results.length};
      await db.query('update app.exams set result=$1,submitted_at=now() where id=$2',[JSON.stringify(result),exam.id]);
      return {id:exam.id,submitted:true,...result};
    }
    if(!examMatch[2]&&method==='GET'){
      const offset=Number(url.searchParams.get('offset')||0);
      if(!Number.isInteger(offset)||offset<0)throw new Fault(400,'invalid_batch');
      return {id:exam.id,total:exam.question_ids.length,ids:exam.question_ids,offset,questions:exam.question_ids.slice(offset,offset+20).map(id=>publicQuestion(questions.get(id)))};
    }
  }
  if(path==='/api/course/python'&&method==='GET')return {userScope:a.user_id,exercises:python.exercises.map(e=>({id:e.id,title:e.title,section:e.section,library:e.library,level:e.level}))};
  if(path.startsWith('/api/course/python/')&&method==='GET'){
    const e=python.exercises.find(e=>e.id===path.slice('/api/course/python/'.length));if(!e)throw new Fault(404,'not_found');return e;
  }
  throw new Fault(404,'not_found');
}
