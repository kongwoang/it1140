import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import { bank,python,questions,version,selectQuestions,publicQuestion,grade,shuffled } from './course.mjs';
import { contentRoot } from './content.mjs';
import { Fault,keyed,equal } from './store.mjs';

export function previewPolicy(manifest,course=bank,exercises=python){
  const validate=(ids,items)=>{
    if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.length>Math.ceil(items.length*0.12))throw Error('Preview must be a distinct subset of about 10%, never the full bank');
    const known=new Set(items.map(q=>q.id));
    if(ids.some(id=>typeof id!=='string'||!known.has(id)))throw Error('Preview has unknown IDs; update private preview-access.json for this bank');
    return new Set(ids);
  };
  return {questionIds:validate(manifest.questionIds,course.questions),pythonIds:validate(manifest.pythonIds,exercises.exercises)};
}
let manifest;
try{manifest=JSON.parse(readFileSync(resolve(contentRoot(),'preview-access.json'),'utf8'));}
catch(e){if(e.code!=='ENOENT')throw e;manifest=JSON.parse(readFileSync(new URL('./preview-access.json',import.meta.url),'utf8'));}
export const preview=previewPolicy(manifest);
export const previewVersion=createHash('sha256').update(version+JSON.stringify(manifest)).digest('hex').slice(0,16);
export const previewSummary={questions:preview.questionIds.size,totalQuestions:bank.questions.length,exercises:preview.pythonIds.size,totalExercises:python.exercises.length};
const visible=(chapter,query)=>selectQuestions(chapter,query).filter(q=>preview.questionIds.has(q.id));
const locked=()=>{throw new Fault(403,'purchase_required');};
function offsetOf(url){const n=Number(url.searchParams.get('offset')||0);if(!Number.isInteger(n)||n<0)throw new Fault(400,'invalid_batch');return n;}
function readExam(id,secret){
  if(typeof id!=='string'||id.length>8192)throw new Fault(404,'not_found');
  const [payload,signature,...extra]=id.split('.');
  if(extra.length||!payload||!/^[A-Za-z0-9_-]+$/.test(payload)||!/^[a-f0-9]{64}$/.test(signature||'')||!equal(signature,keyed(secret,'preview-exam:'+payload)))throw new Fault(404,'not_found');
  let e;try{e=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{throw new Fault(404,'not_found');}
  if(!e||e.scope!=='preview'||!Array.isArray(e.ids)||!e.ids.length||e.ids.length>100||new Set(e.ids).size!==e.ids.length)throw new Fault(404,'not_found');
  if(e.version!==previewVersion)throw new Fault(409,'exam_version_changed');
  if(e.ids.some(q=>!preview.questionIds.has(q)))throw new Fault(404,'not_found');
  if(!Number.isFinite(e.expires)||e.expires<Date.now())throw new Fault(410,'exam_expired');
  return e;
}
// Separate public namespace, separate fixed allowlist. Never consult a client
// percentage, login cookie, query flag, or paid exam ID to decide what is free.
export function previewRoute(path,method,url,data,cfg){
  if(path==='/api/preview/catalog'&&method==='GET')return {version:previewVersion,userScope:'preview:'+previewVersion,preview:true,...previewSummary,
    chapters:bank.chapters.map(c=>({...c,count:visible(c.id).length,fullCount:selectQuestions(c.id).length})),total:preview.questionIds.size};
  if(path==='/api/preview/questions'&&method==='GET'){
    let found=visible(url.searchParams.get('chapter'),url.searchParams.get('q')||'');
    const ids=url.searchParams.get('ids');
    if(ids){const selected=ids.split(',');if(selected.length>20)throw new Fault(400,'invalid_batch');if(selected.some(id=>!preview.questionIds.has(id)))locked();found=found.filter(q=>selected.includes(q.id));}
    const offset=offsetOf(url),limit=Number(url.searchParams.get('limit')||20);
    if(!Number.isInteger(limit)||limit<1||limit>20)throw new Fault(400,'invalid_batch');
    if(url.searchParams.get('shuffle')==='true')found=shuffled(found);
    return {total:found.length,offset,ids:found.map(q=>q.id),questions:found.slice(offset,offset+limit).map(publicQuestion)};
  }
  if(path==='/api/preview/grade'&&method==='POST'){
    if(!preview.questionIds.has(data.id))locked();
    return grade(questions.get(data.id),data.review===true?null:data.answer);
  }
  if(path==='/api/preview/python'&&method==='GET')return {userScope:'preview:'+previewVersion,exercises:python.exercises.filter(e=>preview.pythonIds.has(e.id)).map(e=>({id:e.id,title:e.title,section:e.section,library:e.library,level:e.level}))};
  if(path.startsWith('/api/preview/python/')&&method==='GET'){
    const id=path.slice('/api/preview/python/'.length);if(!preview.pythonIds.has(id))locked();return python.exercises.find(e=>e.id===id);
  }
  if(path==='/api/preview/exams'&&method==='POST'){
    const count=data.count??40;if(!Number.isInteger(count)||count<1||count>100)throw new Fault(400,'invalid_exam');
    const ids=shuffled(visible(data.chapter,data.query||'')).slice(0,count).map(q=>q.id);if(!ids.length)throw new Fault(400,'empty_exam');
    const payload=Buffer.from(JSON.stringify({scope:'preview',version:previewVersion,ids,expires:Date.now()+86400000,nonce:randomUUID()})).toString('base64url');
    return {id:payload+'.'+keyed(cfg.OTP_SECRET,'preview-exam:'+payload),count:ids.length};
  }
  const match=path.match(/^\/api\/preview\/exams\/([^/]+)(\/submit)?$/);
  if(match){
    const e=readExam(match[1],cfg.OTP_SECRET);
    if(match[2]&&method==='POST'){
      if(!data.answers||Array.isArray(data.answers)||typeof data.answers!=='object')throw new Fault(400,'invalid_answers');
      const results=e.ids.map(id=>grade(questions.get(id),data.answers[id]));
      return {id:match[1],submitted:true,results,correct:results.filter(r=>r.correct).length,total:results.length};
    }
    if(!match[2]&&method==='GET'){const offset=offsetOf(url);return {id:match[1],total:e.ids.length,ids:e.ids,offset,questions:e.ids.slice(offset,offset+20).map(id=>publicQuestion(questions.get(id)))};}
  }
  throw new Fault(404,'not_found');
}
