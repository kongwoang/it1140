import { PGlite } from '@electric-sql/pglite';
import { readFile,readdir } from 'node:fs/promises';
import { createApp } from '../app.mjs';
import { configuration } from '../config.mjs';
export async function fixture(){
  const db=new PGlite();
  for(const name of (await readdir(new URL('../migrations/',import.meta.url))).sort())await db.exec(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
  let tail=Promise.resolve();
  async function lock(){let release;const wait=tail;tail=new Promise(r=>{release=r;});await wait;return release;}
  const pool={async connect(){const release=await lock();return {query:(...args)=>db.query(...args),release};},async query(...args){const release=await lock();try{return await db.query(...args);}finally{release();}}};
  const mail=[];
  const cfg={...configuration({NODE_ENV:'development',APP_ORIGIN:'http://localhost:4180',DATABASE_URL:'test',OTP_SECRET:'test-only-secret-'.repeat(6)}),smtpReady:true,live:false,BANK_ACCOUNT:'0000000000',BANK_ACCOUNT_NAME:'TEST ONLY',SEPAY_WEBHOOK_SECRET:'test-only-webhook-secret-'.repeat(3)};
  const app=createApp({pool,cfg,sendMail:async message=>mail.push(message),logger:{warn(){},error(){}}});
  function browser(){const jar={};return {jar,async call(path,data,options={}){
    const response=await app.fetch(new Request(cfg.origin+path,{method:data===undefined?'GET':'POST',headers:{Origin:cfg.origin,'Content-Type':'application/json',Cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; '),...options.headers},body:data===undefined?undefined:JSON.stringify(data)}),options.ip||'127.0.0.1');
    for(const c of response.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar[pair.slice(0,i)]=pair.slice(i+1);}
    return response;
  }};}
  async function login(b,email='student@sis.hust.edu.vn',label='Test browser'){
    // Tests advance cooldown in SQL; production has no bypass or test OTP endpoint.
    await pool.query("update app.otp set created_at=now()-interval '61 seconds' where email=$1",[email]);
    const r=await b.call('/api/auth/request',{email});const challenge=await r.json();
    const code=mail.at(-1)?.text.match(/\b\d{6}\b/)[0];
    const verified=await b.call('/api/auth/verify',{challengeId:challenge.challengeId,code,label});return {verified,challengeId:challenge.challengeId,code};
  }
  async function grant(b){const me=await (await b.call('/api/me')).json();await pool.query("insert into app.entitlements(user_id,product_id) values($1,'it1140-lifetime') on conflict do nothing",[me.id]);return me;}
  return {db,pool,cfg,app,browser,mail,login,grant,close:()=>db.close()};
}
