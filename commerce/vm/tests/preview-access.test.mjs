import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from '../app.mjs';
import { bank,python,questions } from '../course.mjs';
import { preview,previewPolicy,previewVersion } from '../preview.mjs';
import { keyed } from '../store.mjs';
import { fixture } from './helpers.mjs';

test('fixed preview covers all chapters at about 10% and validates its editable allowlist',()=>{
  assert.equal(preview.questionIds.size,210);assert.equal(preview.pythonIds.size,7);
  const chapters=new Map(bank.topics.map(t=>[t.id,t.chapter]));
  for(const c of bank.chapters){const all=bank.questions.filter(q=>chapters.get(q.topic)===c.id),free=all.filter(q=>preview.questionIds.has(q.id));assert.ok(free.length>0);assert.ok(Math.abs(free.length-all.length/10)<=1);}
  assert.throws(()=>previewPolicy({questionIds:bank.questions.map(q=>q.id),pythonIds:[...preview.pythonIds]}),/distinct subset/);
  assert.throws(()=>previewPolicy({questionIds:['unknown'],pythonIds:[...preview.pythonIds]}),/unknown IDs/);
  assert.throws(()=>previewPolicy({questionIds:[[...preview.questionIds][0],[...preview.questionIds][0]],pythonIds:[...preview.pythonIds]}),/distinct subset/);
});

function publicClient(){
  const cfg={dev:true,origin:'http://localhost:4180',OTP_SECRET:'preview-test-only-secret'.repeat(4)};
  const app=createApp({cfg,pool:{query(){throw Error('Public preview must not access database');}},sendMail(){throw Error('Preview must not send mail');}});
  const call=(path,data,origin=cfg.origin)=>app.fetch(new Request(cfg.origin+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),'127.0.0.1');
  return {cfg,call};
}

test('anonymous preview works without SMTP, database writes, cookies or answer keys in batches',async()=>{
  const {call}=publicClient();
  const page=await call('/preview');assert.equal(page.status,200);assert.equal(page.headers.has('Set-Cookie'),false);
  assert.match(await page.text(),/data-access="preview"/);
  const catalogue=await call('/api/preview/catalog').then(r=>r.json());assert.equal(catalogue.total,210);assert.equal(catalogue.totalQuestions,2096);assert.equal(catalogue.chapters.length,12);
  const first=await call('/api/preview/questions?limit=20').then(r=>r.json());assert.equal(first.questions.length,20);assert.equal(first.ids.length,210);
  for(const q of first.questions){assert.ok(preview.questionIds.has(q.id));assert.equal('answer'in q,false);assert.equal('explanation'in q,false);}
  const shuffled=await call('/api/preview/questions?shuffle=true&percent=100&paid=true').then(r=>r.json());
  assert.deepEqual([...shuffled.ids].sort(),[...first.ids].sort());
  const q=questions.get(first.questions[0].id);
  const result=await call('/api/preview/grade',{id:q.id,answer:q.answer}).then(r=>r.json());assert.equal(result.correct,true);
  const review=await call('/api/preview/grade',{id:q.id,review:true}).then(r=>r.json());assert.deepEqual(review.answer,q.answer);
  const meta=await call('/api/preview/python').then(r=>r.json());assert.equal(meta.exercises.length,7);assert.equal('tests'in meta.exercises[0],false);
  const detail=await call('/api/preview/python/'+meta.exercises[0].id).then(r=>r.json());assert.ok(detail.tests.length);
});

test('preview cannot fetch or grade paid IDs even with client flags or forged exam tokens',async()=>{
  const {call,cfg}=publicClient();
  const paid=bank.questions.find(q=>!preview.questionIds.has(q.id)),paidPython=python.exercises.find(e=>!preview.pythonIds.has(e.id));
  for(const path of ['/api/preview/questions?ids='+paid.id,'/api/preview/python/'+paidPython.id])assert.equal((await call(path)).status,403);
  assert.equal((await call('/api/preview/grade',{id:paid.id,answer:paid.answer,paid:true,percent:100})).status,403);
  const payload=Buffer.from(JSON.stringify({scope:'preview',version:previewVersion,ids:[paid.id],expires:Date.now()+60000})).toString('base64url');
  const forged=payload+'.'+keyed(cfg.OTP_SECRET,'preview-exam:'+payload);
  assert.equal((await call('/api/preview/exams/'+forged)).status,404);
  assert.equal((await call('/api/preview/exams/'+forged+'/submit',{answers:{}})).status,404);
  assert.equal((await call('/api/preview/grade',{id:[...preview.questionIds][0],review:true},'null')).status,403);
});

test('public exam tokens are signed, bounded, expiring and isolated from paid exams',async()=>{
  const {call,cfg}=publicClient();
  const exam=await call('/api/preview/exams',{chapter:'all',count:100,paid:true}).then(r=>r.json());assert.equal(exam.count,100);
  const page=await call('/api/preview/exams/'+exam.id).then(r=>r.json());assert.equal(page.questions.length,20);assert.equal(page.ids.length,100);
  assert.ok(page.ids.every(id=>preview.questionIds.has(id)));
  const answers=Object.fromEntries(page.ids.map(id=>[id,questions.get(id).answer]));
  const result=await call('/api/preview/exams/'+exam.id+'/submit',{answers}).then(r=>r.json());assert.equal(result.correct,100);
  const [payload,signature]=exam.id.split('.');
  assert.equal((await call('/api/preview/exams/'+payload+'.'+(signature[0]==='0'?'1':'0')+signature.slice(1))).status,404);
  const changed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));changed.expires=Date.now()-1;
  const expired=Buffer.from(JSON.stringify(changed)).toString('base64url');
  assert.equal((await call('/api/preview/exams/'+expired+'.'+keyed(cfg.OTP_SECRET,'preview-exam:'+expired))).status,410);
  const f=await fixture();try{
    const b=f.browser();assert.equal((await b.call('/api/course/catalog')).status,401);
    await f.login(b);assert.equal((await b.call('/api/course/exams/'+exam.id)).status,403);
    await f.grant(b);await b.call('/api/study/claim',{});
    assert.equal((await b.call('/api/course/exams/'+exam.id)).status,404);
    assert.equal((await b.call('/api/preview/exams/12345678-1234-1234-1234-123456789abc')).status,404);
  }finally{await f.close();}
});

test('preview and paid clients select server namespaces and separate local progress',async()=>{
  const out=new URL('../../../.vm-dist/public/',import.meta.url);
  const demo=await readFile(new URL('preview.html',out),'utf8'),paid=await readFile(new URL('learn.html',out),'utf8');
  assert.match(demo,/data-access="preview"/);assert.doesNotMatch(paid,/data-access="preview"/);
  assert.match(demo,/Mở toàn bộ/);assert.match(demo,/python-lab\.js\?v=[a-f0-9]{12}/);
  const client=await readFile(new URL('../public/study-client.js',import.meta.url),'utf8');
  assert.match(client,/if\(preview\)\{resolveReady\(\);return;\}/);
  assert.match(client,/serviceWorker\.register/);
  const lab=await readFile(new URL('assets/js/python-lab.js',out),'utf8');assert.match(lab,/IT1140Study\.apiBase/);
});
