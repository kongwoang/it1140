import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHmac } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';
import { fixture } from './helpers.mjs';
import { configuration,stagingOrigin } from '../config.mjs';
import { createApp } from '../app.mjs';
import { bank,grade,publicQuestion,questions } from '../course.mjs';

test('configuration fails closed; production cannot silently use HTTP or missing secrets',()=>{
  assert.throws(()=>configuration({}),/APP_ORIGIN/);
  assert.throws(()=>configuration({NODE_ENV:'production',APP_ORIGIN:'http://example.com'}),/HTTPS/);
  assert.throws(()=>configuration({NODE_ENV:'production',APP_ORIGIN:'https://example.com',DATABASE_URL:'test',OTP_SECRET:'x'.repeat(64)}),/SMTP/);
  assert.equal(stagingOrigin('https://it1140.hoangpc.io.vn'),false);assert.equal(stagingOrigin('http://localhost.attacker.com'),false);
  assert.equal(stagingOrigin('https://staging.example.com'),true);assert.equal(stagingOrigin('http://localhost:4180'),true);
});
test('OTP HUST domain, browser binding, attempts, expiry, replay and opaque cookies',async()=>{
  const f=await fixture();try{
    const b=f.browser(),stranger=f.browser();
    for(const email of ['x@sis.hust.edu.vn.attacker.com','x@hust.edu.vn.evil','x@gmail.com','x@evil-hust.edu.vn'])assert.equal((await b.call('/api/auth/request',{email})).status,400);
    const start=await b.call('/api/auth/request',{email:'STUDENT@sis.hust.edu.vn'});assert.equal(start.status,200);
    const {challengeId}=await start.json(),code=f.mail.at(-1).text.match(/\b\d{6}\b/)[0];
    assert.equal((await stranger.call('/api/auth/verify',{challengeId,code})).status,400);
    assert.equal((await b.call('/api/auth/request',{email:'student@sis.hust.edu.vn'})).status,429);
    for(let n=0;n<5;n++)assert.equal((await b.call('/api/auth/verify',{challengeId,code:code==='000000'?'000001':'000000'})).status,400);
    assert.equal((await b.call('/api/auth/verify',{challengeId,code})).status,400,'Correct code after attempt cap fails');
    await f.pool.query('delete from app.rate_limits');
    const done=await f.login(b);assert.equal(done.verified.status,200);
    for(const c of done.verified.headers.getSetCookie()){assert.match(c,/HttpOnly/);assert.match(c,/SameSite=Lax/);}
    assert.equal((await b.call('/api/auth/verify',{challengeId:done.challengeId,code:done.code})).status,400);
    const row=(await f.pool.query('select * from app.otp order by created_at desc limit 1')).rows[0];assert.equal(row.code_hash.includes(done.code),false);
    const s=(await f.pool.query('select * from app.sessions')).rows[0];assert.notEqual(s.token_hash,b.jar['it1140-dev-session']);
    assert.equal((await b.call('/api/me')).status,200);
    assert.equal((await b.call('/api/auth/logout',{}, {headers:{Origin:'https://evil.test'}})).status,403);
    await b.call('/api/auth/logout',{});assert.equal((await b.call('/api/me')).status,401);
  }finally{await f.close();}
});
test('two browser slots, verified replacement, per-account cookie scope and revocation',async()=>{
  const f=await fixture();try{
    const a=f.browser(),b=f.browser(),c=f.browser();
    assert.equal((await f.login(a)).verified.status,200);assert.equal((await f.login(b)).verified.status,200);
    const third=await f.login(c);assert.equal(third.verified.status,409);const limited=await third.verified.json();assert.equal(limited.devices.length,2);
    assert.equal((await a.call('/api/auth/enroll',{replaceId:limited.devices[0].id})).status,400);
    assert.equal((await c.call('/api/auth/enroll',{replaceId:limited.devices[0].id,label:'Replacement'})).status,200);
    assert.equal((await a.call('/api/me')).status,401);assert.equal((await c.call('/api/me')).status,200);
    assert.equal((await c.call('/api/auth/enroll',{replaceId:limited.devices[1].id})).status,400,'Enrollment cookie is cleared after use');
    const d=await (await c.call('/api/devices')).json();assert.equal(d.devices.length,2);
    // One browser may use a different account without violating token uniqueness.
    assert.equal((await f.login(c,'another@sis.hust.edu.vn')).verified.status,200);
  }finally{await f.close();}
});
test('OTP expiry, failed mail, recent authentication and replacement cap',async()=>{
  const f=await fixture();try{
    const b=f.browser();const first=await f.login(b);assert.equal(first.verified.status,200);
    const start=await b.call('/api/auth/request',{email:'expired@sis.hust.edu.vn'}),challenge=await start.json();
    const code=f.mail.at(-1).text.match(/\b\d{6}\b/)[0];await f.pool.query("update app.otp set expires_at=now()-interval '1 second' where id=$1",[challenge.challengeId]);
    assert.equal((await b.call('/api/auth/verify',{challengeId:challenge.challengeId,code})).status,400);
    const d=await (await b.call('/api/devices')).json();
    await f.pool.query("update app.sessions set authenticated_at=now()-interval '11 minutes'");
    assert.equal((await b.call('/api/devices/revoke',{id:d.current})).status,403);
    await f.pool.query('update app.sessions set authenticated_at=now()');
    const me=await (await b.call('/api/me')).json();
    await f.pool.query("insert into app.device_changes(user_id,device_id,reason) values($1,$2,'test'),($1,$2,'test')",[me.id,d.current]);
    assert.equal((await b.call('/api/devices/revoke',{id:d.current})).status,429);
    const brokenMail=createApp({pool:f.pool,cfg:f.cfg,sendMail:async()=>{throw Error('SMTP unavailable');}});
    const failed=await brokenMail.fetch(new Request(f.cfg.origin+'/api/auth/request',{method:'POST',headers:{Origin:f.cfg.origin,'Content-Type':'application/json'},body:JSON.stringify({email:'mail-failure@sis.hust.edu.vn'})}));
    assert.equal(failed.status,503);
    assert.ok((await f.pool.query("select consumed_at from app.otp where email='mail-failure@sis.hust.edu.vn'")).rows[0].consumed_at);
  }finally{await f.close();}
});
test('one authoritative study lease; unowned, takeover, stale session and expired lease',async()=>{
  const f=await fixture();try{
    const a=f.browser(),b=f.browser();await f.login(a);await f.login(b);assert.equal((await a.call('/api/study/claim',{})).status,403);
    const owner=await f.grant(a);
    assert.equal((await a.call('/api/study/claim',{})).status,200);
    assert.equal((await b.call('/api/study/claim',{})).status,409);
    assert.equal((await a.call('/api/course/catalog')).status,200);
    assert.equal((await b.call('/api/study/claim',{takeover:true})).status,200);
    assert.equal((await a.call('/api/course/catalog')).status,409);
    assert.equal((await a.call('/api/study/heartbeat',{})).status,409);
    await f.pool.query("update app.leases set expires_at=now()-interval '1 second' where user_id=$1",[owner.id]);
    assert.equal((await b.call('/api/course/catalog')).status,409);
    assert.equal((await a.call('/api/study/claim',{})).status,200);
    await f.pool.query('update app.entitlements set revoked_at=now() where user_id=$1',[owner.id]);assert.equal((await a.call('/api/course/catalog')).status,403);
  }finally{await f.close();}
});
test('private bank excluded, bounded batches, server grading and immutable exam submissions',async()=>{
  const f=await fixture();try{
    const b=f.browser(),other=f.browser();await f.login(b);await f.grant(b);await b.call('/api/study/claim',{});
    for(const path of ['/data/subjects/it1140.json','/.env','/schema.sql','/api/course/bank','/assets/js/quiz-app.js'])assert.equal((await b.call(path)).status,404);
    const response=await b.call('/api/course/questions?chapter=chuong-1');assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);
    const data=await response.json();assert.equal(data.questions.length,20);assert.ok(data.total>20);
    for(const q of data.questions){assert.equal('answer'in q,false);assert.equal('explanation'in q,false);}
    assert.equal((await b.call('/api/course/questions?limit=2096')).status,400);
    assert.equal((await b.call('/api/course/grade',{id:bank.questions.at(-1).id,answer:0})).status,403);
    const q=questions.get(data.questions[0].id);const checked=await (await b.call('/api/course/grade',{id:q.id,answer:q.answer})).json();assert.equal(checked.correct,true);
    const exam=await (await b.call('/api/course/exams',{chapter:'chuong-1',count:4})).json();
    const page=await (await b.call('/api/course/exams/'+exam.id)).json();assert.equal(page.questions.length,4);assert.equal('results'in page,false);
    const answers=Object.fromEntries(page.questions.map(q=>[q.id,questions.get(q.id).answer]));
    const result=await (await b.call('/api/course/exams/'+exam.id+'/submit',{answers})).json();assert.equal(result.correct,4);
    const repeated=await (await b.call('/api/course/exams/'+exam.id+'/submit',{answers:{}})).json();assert.equal(repeated.correct,4);
    await f.login(other,'other@sis.hust.edu.vn');await f.grant(other);await other.call('/api/study/claim',{});assert.equal((await other.call('/api/course/exams/'+exam.id)).status,404);
    const catalogue=await (await b.call('/api/course/python')).json();assert.equal(catalogue.exercises.length,70);assert.equal('tests'in catalogue.exercises[0],false);
    const detail=await (await b.call('/api/course/python/'+catalogue.exercises[0].id)).json();assert.ok(detail.tests.length);
  }finally{await f.close();}
});
test('actual payment SQL: exact price/receiver, transactional dedupe and non-expiring grant',async()=>{
  const f=await fixture();try{
    const b=f.browser();await f.login(b);const me=await (await b.call('/api/me')).json();
    assert.equal((await b.call('/api/orders',{amount:1,paid:true})).status,503);
    const o=(await f.pool.query('select * from app.create_order($1,$2,$3)',[me.id,'IT1140AAAAAAAAAAAAAAAA',f.cfg.BANK_ACCOUNT])).rows[0];assert.equal(o.amount,20000);
    const pay=async(id,amount,valid=true)=>(await f.pool.query('select app.receive_payment($1,$2,$3,$4,$5,now(),$6) r',[id,id,o.transfer_code,amount,f.cfg.BANK_ACCOUNT,valid])).rows[0].r;
    assert.equal((await pay('bad',1)).reason,'wrong_amount');assert.equal((await pay('receiver',20000,false)).reason,'wrong_receiver');
    assert.equal((await pay('ok',20000)).outcome,'granted');assert.equal((await pay('ok',20000)).outcome,'duplicate');
    assert.equal((await f.pool.query('select count(*)::int n from app.entitlements')).rows[0].n,1);
    const raw=JSON.stringify({id:900,transferType:'in',gateway:'MBBank',accountNumber:f.cfg.BANK_ACCOUNT,transferAmount:20000,content:o.transfer_code,transactionDate:'2026-10-17 12:00:00'});
    const t=String(Math.floor(Date.now()/1000)),signature='sha256='+createHmac('sha256',f.cfg.SEPAY_WEBHOOK_SECRET).update(t+'.'+raw).digest('hex');
    const unsigned=await f.app.fetch(new Request(f.cfg.origin+'/api/webhooks/sepay',{method:'POST',headers:{'Content-Type':'application/json'},body:raw}));assert.equal(unsigned.status,401);
    const signed=await f.app.fetch(new Request(f.cfg.origin+'/api/webhooks/sepay',{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Timestamp':t,'X-SePay-Signature':signature},body:raw}));assert.equal(signed.status,200);
  }finally{await f.close();}
});
test('all question types grade correctly; public projection never contains answer keys',()=>{
  for(const q of bank.questions){assert.equal(grade(q,q.answer).correct,true,q.id);const view=publicQuestion(q);assert.equal('answer'in view,false);assert.equal('explanation'in view,false);}
  const number=bank.questions.find(q=>q.responseType==='number');assert.equal(grade(number,' ').correct,false);assert.equal(grade(number,null).correct,false);
});
test('VM build contains no data/source/secrets and no offline private-data cache',async()=>{
  const out=new URL('../../../.vm-dist/public/',import.meta.url); // tests -> vm -> commerce -> root
  const root=await readdir(out);assert.equal(root.includes('data'),false);assert.equal(root.includes('schema.sql'),false);
  const html=await readFile(new URL('learn.html',out),'utf8');assert.match(html,/commerce-quiz\.js/);assert.doesNotMatch(html,/quiz-app\.js/);
  const sw=await readFile(new URL('commerce-sw.js',out),'utf8');assert.doesNotMatch(sw,/addEventListener\(['"]fetch/);
  const lab=await readFile(new URL('assets/js/python-lab.js',out),'utf8');assert.match(lab,/\/api\/course\/python\//);assert.doesNotMatch(lab,/\.\/data\//);
});
test('public assets can cache but authenticated data, HTML and SW never share cache',async()=>{
  const f=await fixture();try{
    const b=f.browser();assert.match((await b.call('/account.css')).headers.get('Cache-Control'),/^public/);
    for(const path of ['/','/commerce-sw.js','/api/config'])assert.match((await b.call(path)).headers.get('Cache-Control'),/private, no-store/);
  }finally{await f.close();}
});
