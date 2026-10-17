import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { configuration } from '../config.mjs';
import { verifyBot } from '../bot.mjs';
import { token } from '../store.mjs';
import { contentRoot } from '../content.mjs';
import { readFile } from 'node:fs/promises';
import { verifyWebhook,paymentCode,bankTime } from '../../payments.mjs';
import { createApp } from '../app.mjs';
import { randomUUID } from 'node:crypto';

test('rejected OTP resends do not consume global mail capacity',async()=>{
  const f=await fixture();try{
    f.cfg.OTP_MAX_PER_HOUR=2;
    const b=f.browser();
    assert.equal((await b.call('/api/auth/request',{email:'first@sis.hust.edu.vn'})).status,200);
    for(let i=0;i<10;i++)assert.equal((await b.call('/api/auth/request',{email:'first@sis.hust.edu.vn'})).status,429);
    assert.equal((await f.pool.query("select hits from app.rate_limits where key='otp-global'")).rows[0].hits,1);
    assert.equal((await f.browser().call('/api/auth/request',{email:'second@sis.hust.edu.vn'})).status,200);
    assert.equal((await f.browser().call('/api/auth/request',{email:'third@sis.hust.edu.vn'})).status,429);
    assert.equal(f.mail.length,2);
  }finally{await f.close();}
});

test('production content must be explicitly mounted; image never embeds the public bank',async()=>{
  assert.throws(()=>contentRoot({NODE_ENV:'production'}),/private COURSE_DATA_DIR/);
  assert.throws(()=>contentRoot({COURSE_DATA_DIR:'relative/path'}),/absolute/);
  assert.equal(contentRoot({NODE_ENV:'production',COURSE_DATA_DIR:'/run/it1140-content'}),'/run/it1140-content');
  const docker=await readFile(new URL('../deploy/Dockerfile',import.meta.url),'utf8');
  assert.doesNotMatch(docker,/COPY data|COPY commerce\/worker/);
  assert.match(docker,/COPY commerce\/payments/);
  assert.equal(bankTime('2026-02-30 01:00:00'),null);
  assert.equal(paymentCode({content:'IT1140AAAAAAAAAAAAAAAA IT1140BBBBBBBBBBBBBBBB'}),null);
  assert.equal(await verifyWebhook(new Request('https://example.test'),new Uint8Array(),'secret'),false);
});

test('another browser cannot invalidate an OTP already delivered to its owner',async()=>{
  const f=await fixture();try{
    const owner=f.browser(),stranger=f.browser(),email='student@sis.hust.edu.vn';
    const start=await owner.call('/api/auth/request',{email}),challenge=await start.json();
    const code=f.mail[0].text.match(/\b\d{6}\b/)[0];
    await f.pool.query("update app.otp set created_at=now()-interval '61 seconds'");
    assert.equal((await stranger.call('/api/auth/request',{email})).status,200);
    assert.equal((await owner.call('/api/auth/verify',{challengeId:challenge.challengeId,code})).status,200);
  }finally{await f.close();}
});

test('copied session alone, wrong browser credential and revoked sessions are denied',async()=>{
  const f=await fixture();try{
    const owner=f.browser(),clone=f.browser();await f.login(owner);await f.grant(owner);await owner.call('/api/study/claim',{});
    clone.jar['it1140-dev-session']=owner.jar['it1140-dev-session'];
    assert.equal((await clone.call('/api/me')).status,401);
    clone.jar['it1140-dev-browser']=token();
    for(const path of ['/api/me','/api/course/catalog','/api/devices'])assert.equal((await clone.call(path)).status,401);
    assert.equal((await clone.call('/api/study/heartbeat',{})).status,401);
    assert.equal((await clone.call('/learn')).status,303);
    assert.equal((await owner.call('/api/course/catalog')).status,200);
    clone.jar['it1140-dev-browser']=owner.jar['it1140-dev-browser'];
    // Both copied credentials remain bearer credentials; never claim physical-device binding.
    assert.equal((await clone.call('/api/me')).status,200);
    await owner.call('/api/auth/logout',{});
    assert.equal((await clone.call('/api/me')).status,401);
  }finally{await f.close();}
});

test('Turnstile fails closed on network failures, forged tokens, wrong host/action and replay',async()=>{
  const cfg={dev:false,origin:'https://staging.example.test',TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET:'secret'};
  const response=value=>async()=>new Response(JSON.stringify(value));
  await assert.rejects(verifyBot(cfg,undefined,'127.0.0.1'),/bot_required/);
  await assert.rejects(verifyBot(cfg,'x'.repeat(2049),'127.0.0.1'),/bot_required/);
  for(const value of [{success:false},{success:true,hostname:'evil.test',action:'otp'},{success:true,hostname:'staging.example.test',action:'other'}])await assert.rejects(verifyBot(cfg,'proof','127.0.0.1',response(value)),/bot_invalid/);
  await assert.rejects(verifyBot(cfg,'proof','127.0.0.1',async()=>{throw Error('offline');}),/bot_unavailable/);
  await verifyBot(cfg,'proof','127.0.0.1',async(url,options)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(JSON.parse(options.body).response,'proof');
    return new Response(JSON.stringify({success:true,hostname:'staging.example.test',action:'otp'}));
  });
  await assert.rejects(verifyBot(cfg,'used-proof','127.0.0.1',response({success:false,'error-codes':['timeout-or-duplicate']})),/bot_invalid/);
  const env={NODE_ENV:'production',APP_ORIGIN:cfg.origin,DATABASE_URL:'test',OTP_SECRET:'x'.repeat(64),SMTP_HOST:'smtp.test',SMTP_USER:'test',SMTP_PASSWORD:'test',SMTP_FROM:'test@example.test'};
  assert.throws(()=>configuration(env),/Turnstile/);
  assert.throws(()=>configuration({...env,TURNSTILE_SITE_KEY:'1x00000000000000000000AA',TURNSTILE_SECRET:'test'}),/real Turnstile/);
});

test('Python uses an opaque sandbox with no account API network capability',async()=>{
  const f=await fixture();try{
    const b=f.browser();
    const frame=await b.call('/python-sandbox.html');assert.equal(frame.status,200);
    const policy=frame.headers.get('Content-Security-Policy');
    assert.match(policy,/sandbox allow-scripts;/);assert.doesNotMatch(policy,/allow-same-origin/);
    assert.match(policy,/connect-src https:\/\/cdn\.jsdelivr\.net\/pyodide\/v314\.0\.6\/full\/;/);
    assert.match(policy,/frame-ancestors 'self'/);
    assert.equal(frame.headers.get('X-Frame-Options'),'SAMEORIGIN');
    const account=await b.call('/');assert.match(account.headers.get('Content-Security-Policy'),/worker-src http:\/\/localhost:4180\/commerce-sw\.js;/);
    assert.equal((await b.call('/assets/js/python-worker.js')).status,404);
    // Opaque runner requests cannot mutate account state even if credentials are forced.
    await f.login(b);
    assert.equal((await b.call('/api/auth/logout',{}, {headers:{Origin:'null'}})).status,403);
    assert.equal((await b.call('/api/me')).status,200);
    const lab=await readFile(new URL('../../../.vm-dist/public/assets/js/python-lab.js',import.meta.url),'utf8');
    assert.match(lab,/IT1140CreatePythonWorker\(\)/);assert.doesNotMatch(lab,/new Worker\(/);
    const bridge=await readFile(new URL('../public/python-sandbox-frame.js',import.meta.url),'utf8');
    assert.match(bridge,/event\.source!==parent/);assert.match(bridge,/event\.origin!==new URL\(document\.URL\)\.origin/);
    assert.doesNotMatch(lab,/<strong>\$\{exercise\.title\}/);
    assert.match(lab,/title\.textContent = exercise\.title/);
  }finally{await f.close();}
});

test('production rejects missing bot proof without sending mail or charging global mail budget',async()=>{
  const f=await fixture();try{
    const cfg={...f.cfg,dev:false,origin:'https://staging.example.test',TURNSTILE_SITE_KEY:'real-site',TURNSTILE_SECRET:'real-secret'};
    const app=createApp({pool:f.pool,cfg,sendMail:async m=>f.mail.push(m)});
    const response=await app.fetch(new Request(cfg.origin+'/api/auth/request',{method:'POST',headers:{Origin:cfg.origin,'Content-Type':'application/json'},body:JSON.stringify({email:'student@sis.hust.edu.vn'})}));
    assert.equal(response.status,400);assert.equal((await response.json()).error,'bot_required');
    assert.equal(f.mail.length,0);
    assert.equal((await f.pool.query("select * from app.rate_limits where key='otp-global'")).rows.length,0);
    assert.equal((await f.pool.query('select * from app.otp')).rows.length,0);
  }finally{await f.close();}
});

test('anonymous enrollment is bounded and uses an indexed token lookup',async()=>{
  const f=await fixture();try{
    const b=f.browser(),replaceId=randomUUID();
    b.jar['it1140-dev-enroll']='oversized'.repeat(100);
    assert.equal((await b.call('/api/auth/enroll',{replaceId})).status,400);
    b.jar['it1140-dev-enroll']=token();
    // Seed the exhausted abuse bucket; no 600 HTTP requests needed for this test.
    const { keyed }=await import('../store.mjs');
    await f.pool.query('select app.rate_limit($1,600,900)',['enroll-ip:'+keyed(f.cfg.OTP_SECRET,'127.0.0.1')]);
    await f.pool.query("update app.rate_limits set hits=600 where key like 'enroll-ip:%'");
    assert.equal((await b.call('/api/auth/enroll',{replaceId})).status,429);
    assert.equal((await f.pool.query("select 1 from pg_indexes where schemaname='app' and indexname='otp_enrollment_active'")).rows.length,1);
  }finally{await f.close();}
});
