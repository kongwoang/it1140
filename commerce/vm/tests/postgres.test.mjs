import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { database } from '../db.mjs';
import { migrate } from '../migrate.mjs';
import { transaction,issueSession,guard,claim,token } from '../store.mjs';
import { createApp } from '../app.mjs';

test('real PostgreSQL: migrations, concurrent slot enrollment and atomic lease takeover',{skip:!process.env.TEST_DATABASE_URL},async()=>{
  if(process.env.ALLOW_TEST_DATABASE_CREATE!=='true')throw Error('Explicit ALLOW_TEST_DATABASE_CREATE=true required');
  const admin=database(process.env.TEST_DATABASE_URL,2),name='it1140_test_'+randomUUID().replaceAll('-','');
  let db;
  try{
    await admin.query('create database "'+name+'"');
    const u=new URL(process.env.TEST_DATABASE_URL);u.pathname='/'+name;db=database(u.href,10);
    await migrate(db);await migrate(db);
    const email='race@sis.hust.edu.vn',browserTokens=[token(),token(),token()];
    const outcomes=await Promise.all(browserTokens.map(browserToken=>transaction(db,client=>issueSession(client,{email,browserToken,label:'Concurrent browser'}))));
    assert.equal(outcomes.filter(o=>o.limited).length,1);assert.equal(outcomes.filter(o=>o.sessionToken).length,2);
    const sessions=outcomes.map((o,i)=>({...o,browserToken:browserTokens[i]})).filter(o=>o.sessionToken),a=await guard(db,sessions[0].sessionToken,{browserToken:sessions[0].browserToken}),b=await guard(db,sessions[1].sessionToken,{browserToken:sessions[1].browserToken});
    await db.query("insert into app.entitlements(user_id,product_id) values($1,'it1140-lifetime')",[a.user_id]);
    const claims=await Promise.allSettled([claim(db,a),claim(db,b)]);assert.equal(claims.filter(c=>c.status==='fulfilled').length,1);
    const winner=claims[0].status==='fulfilled'?a:b,loser=winner===a?b:a;
    await claim(db,loser,true);
    const stale=winner===a?sessions[0]:sessions[1];
    await assert.rejects(guard(db,stale.sessionToken,{browserToken:stale.browserToken,paid:true,study:true}),/study_conflict/);
    // Separate buyer with no entitlement tests duplicate delivery under actual concurrency.
    const other=await transaction(db,c=>issueSession(c,{email:'payment@sis.hust.edu.vn',browserToken:token(),label:'Payment'}));
    const o=(await db.query('select * from app.create_order($1,$2,$3)',[other.userId,'IT1140BBBBBBBBBBBBBBBB','0000000000'])).rows[0];
    const deliveries=await Promise.all(Array.from({length:10},()=>db.query('select app.receive_payment($1,$2,$3,20000,$4,now(),true) r',['same-id','same-hash',o.transfer_code,'0000000000'])));
    assert.equal(deliveries.filter(r=>r.rows[0].r.outcome==='granted').length,1);assert.equal(deliveries.filter(r=>r.rows[0].r.outcome==='duplicate').length,9);
    assert.equal((await db.query('select count(*)::int n from app.entitlements where user_id=$1',[other.userId])).rows[0].n,1);
    // Two eligible anonymous requests race for the very last mail slot.
    const mails=[],origin='http://localhost:4180';
    const app=createApp({pool:db,cfg:{dev:true,origin,smtpReady:true,domains:['sis.hust.edu.vn'],OTP_SECRET:'test-secret'.repeat(8),OTP_MAX_PER_HOUR:1},sendMail:async m=>mails.push(m)});
    const request=email=>app.fetch(new Request(origin+'/api/auth/request',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email})}),'127.0.0.1');
    const attempts=await Promise.all([request('one@sis.hust.edu.vn'),request('two@sis.hust.edu.vn')]);
    assert.deepEqual(attempts.map(r=>r.status).sort(),[200,429]);assert.equal(mails.length,1);
    assert.equal((await db.query("select hits from app.rate_limits where key='otp-global'")).rows[0].hits,1);
  }finally{
    await db?.end();
    // Exact generated disposable DB only; never run this against a named production database.
    if(/^it1140_test_[a-f0-9]{32}$/.test(name))await admin.query('drop database if exists "'+name+'"');
    await admin.end();
  }
});
