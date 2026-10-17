import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, verifyWebhook, paymentCode, bankTime } from '../worker.mjs';
import { readFile, readdir } from 'node:fs/promises';

const ORIGIN = 'https://staging.example.test';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ID = '11111111-1111-4111-8111-111111111111';
const SECRET = 'test-only-hmac-secret-not-for-live-123456789';
const timestamp = 1792170000;
const env = { APP_ORIGIN: ORIGIN, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'test-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'test-server-only', PAYMENTS_ENABLED: 'true', BANK_CODE: 'MB', BANK_ACCOUNT: '0000000000',
  BANK_ACCOUNT_NAME: 'TEST ONLY', SUPPORT_EMAIL: 'support@example.test', SEPAY_WEBHOOK_SECRET: SECRET,
  ASSETS: { fetch: async request => new Response('asset:' + new URL(request.url).pathname) } };
const encode = value => new TextEncoder().encode(value);
async function signature(bytes, time = timestamp) {
  const key = await crypto.subtle.importKey('raw',encode(SECRET),{ name:'HMAC',hash:'SHA-256' },false,['sign']);
  const prefix = encode(`${time}.`), message = new Uint8Array(prefix.length+bytes.length);
  message.set(prefix);message.set(bytes,prefix.length);
  return 'sha256=' + [...new Uint8Array(await crypto.subtle.sign('HMAC',key,message))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function req(path, { user = true, method = 'GET', data, origin = ORIGIN, headers = {} } = {}) {
  return new Request(ORIGIN + path, { method, headers: { 'Content-Type':'application/json', Origin:origin,
    ...(user?{Cookie:'__Host-it1140-access=test-token'}:{}),...headers }, body: data === undefined ? undefined : JSON.stringify(data) });
}
function mock({ owned = false, invalidAuth = false } = {}) {
  const calls=[];
  const app = createApp({ now:()=>timestamp*1000, fetcher:async(url, options)=> {
    const path=new URL(url).pathname; const body=options.body&&JSON.parse(options.body);
    calls.push({url,options,body});
    let result;
    if(path==='/auth/v1/user') {
      if(invalidAuth)return new Response('{}',{status:401});
      result={ id:A,email:'student@example.test',email_confirmed_at:'2026-01-01' };
    } else if(path==='/rest/v1/commerce_entitlements')result=owned?[{expires_at:null,revoked_at:null}]:[];
    else if(path==='/rest/v1/rpc/commerce_rate_limit')result=true;
    else if(path==='/rest/v1/rpc/commerce_receive_payment')result={outcome:'granted'};
    else if(path==='/rest/v1/commerce_products')result=[{amount:20000,active:true}];
    else if(path==='/rest/v1/rpc/commerce_create_order')result={id:ID,user_id:A,amount:20000,account_number:env.BANK_ACCOUNT,transfer_code:'IT1140AAAAAAAAAAAAAAAA',expires_at:new Date(timestamp*1000+1800000).toISOString(),status:'pending'};
    else if(path==='/rest/v1/commerce_orders')result=[];
    else if(path==='/rest/v1/commerce_payments')result=[];
    else if(path==='/auth/v1/token')result={access_token:'access-secret',refresh_token:'refresh-secret',expires_in:3600,user:{id:A,email_confirmed_at:'2026-01-01'}};
    else if(path==='/auth/v1/signup')result={};
    else throw Error('Unexpected fetch '+url);
    return Response.json(result);
  }});
  return {app,calls};
}
test('HMAC uses original bytes, timestamp, secret and constant-time verification',async()=> {
  const bytes=encode('{"message":"Tiếng Việt", "amount":20000}');
  const sig=await signature(bytes);
  const request=req('/api/webhooks/sepay',{headers:{'X-SePay-Timestamp':String(timestamp),'X-SePay-Signature':sig}});
  assert.equal(await verifyWebhook(request,bytes,SECRET,timestamp*1000),true);
  assert.equal(await verifyWebhook(request,encode('{"message":"Tiếng Việt","amount":20000}'),SECRET,timestamp*1000),false);
  assert.equal(await verifyWebhook(request,bytes,SECRET,timestamp*1000+301000),false);
  assert.equal(await verifyWebhook(request,bytes,'x'.repeat(40),timestamp*1000),false);
  assert.equal(await verifyWebhook(req('/'),bytes,SECRET,timestamp*1000),false);
});
test('payment parsing rejects ambiguity and invalid Vietnam bank dates',()=> {
  const code='IT1140AAAAAAAAAAAAAAAA';
  assert.equal(paymentCode({content:`Thanh toan ${code} don hang`}),code);
  assert.equal(paymentCode({content:`${code} IT1140BBBBBBBBBBBBBBBB`}),null);
  assert.equal(paymentCode({content:'prefix'+code}),null);
  assert.equal(paymentCode({code:code.toLowerCase(),content:code}),code);
  assert.equal(bankTime('2026-10-17 07:00:00'),'2026-10-17T00:00:00.000Z');
  assert.equal(bankTime('2026-02-30 01:00:00'),null);
  assert.equal(bankTime('2026-10-17T00:00:00Z'),null);
});
test('unauthenticated/unpaid/revoked requests cannot access learning data or raw files',async()=> {
  const {app}=mock();
  for(const path of ['/api/course/manifest','/api/course/bank','/api/course/python']) {
    assert.equal((await app.fetch(req(path,{user:false}),env)).status,401);
    assert.equal((await app.fetch(req(path),env)).status,403);
  }
  for(const path of ['/data/subjects/it1140.json','/data/python-exercises.json','/worker.mjs','/.env','/schema.sql','/assets/data/it1140.json'])assert.equal((await app.fetch(req(path),env)).status,404);
  assert.equal((await app.fetch(req('/learn'),env)).status,303);
  assert.equal((await mock({invalidAuth:true}).app.fetch(req('/api/me'),env)).status,401);
  const paid=mock({owned:true});
  const content=await paid.app.fetch(req('/api/course/bank'),env);
  assert.equal(content.status,200);assert.equal((await content.json()).questions.length,2096);
  assert.match(content.headers.get('Cache-Control'),/no-store/);
  assert.equal((await paid.app.fetch(req('/learn'),env)).status,200);
  assert.equal((await app.fetch(req('/api/course/bank'),{})).status,503);
});
test('server price and owner cannot be overridden; new sales default off',async()=> {
  const {app,calls}=mock();
  const result=await app.fetch(req('/api/orders',{method:'POST',data:{amount:1,user_id:B,account_number:'ATTACKER',paid:true}}),env);
  assert.equal(result.status,201);const data=await result.json();assert.equal(data.amount,20000);assert.equal(data.account,env.BANK_ACCOUNT);
  const rpc=calls.find(x=>x.url.endsWith('/commerce_create_order'));
  assert.equal(rpc.body.p_user_id,A);assert.equal(rpc.body.p_account,env.BANK_ACCOUNT);assert.equal('amount'in rpc.body,false);
  assert.equal((await app.fetch(req('/api/orders',{method:'POST',data:{},origin:'https://evil.example'}),env)).status,403);
  assert.equal((await app.fetch(req('/api/orders',{method:'POST',data:{}}),{...env,PAYMENTS_ENABLED:'false'})).status,503);
  assert.equal((await mock({owned:true}).app.fetch(req('/api/orders',{method:'POST',data:{}}),env)).status,409);
  assert.equal((await app.fetch(req('/api/orders/'+ID),env)).status,404);
  assert.ok(calls.some(c=>c.url.includes('/commerce_orders?')&&c.url.includes('user_id=eq.'+A)));
});
test('webhook only processes signed incoming payments; no browser callback can grant',async()=> {
  const {app,calls}=mock();
  const payload={id:111,gateway:'MBBank',transferType:'in',transferAmount:20000,accountNumber:env.BANK_ACCOUNT,content:'IT1140AAAAAAAAAAAAAAAA',transactionDate:'2026-10-17 07:00:00'};
  async function send(data,valid=true){const raw=JSON.stringify(data),bytes=encode(raw);return app.fetch(new Request(ORIGIN+'/api/webhooks/sepay',{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Timestamp':String(timestamp),'X-SePay-Signature':valid?await signature(bytes):'sha256='+'0'.repeat(64)},body:raw}),env);}
  assert.equal((await send(payload,false)).status,401);
  assert.equal(calls.some(c=>c.url.endsWith('commerce_receive_payment')),false);
  assert.equal((await send({...payload,transferType:'out'})).status,200);
  assert.equal(calls.some(c=>c.url.endsWith('commerce_receive_payment')),false);
  assert.equal((await send(payload)).status,200);
  const grant=calls.find(c=>c.url.endsWith('commerce_receive_payment'));
  assert.equal(grant.body.p_valid_receiver,true);assert.equal(grant.body.p_transaction_id,'111');
  assert.equal((await app.fetch(req('/api/paid?success=true',{method:'POST',data:{paid:true}}),env)).status,404);
});
test('auth cookies are HttpOnly; secrets not returned; cross-origin sign-in is rejected',async()=> {
  const {app}=mock();
  const response=await app.fetch(req('/api/auth/login',{method:'POST',user:false,data:{email:'student@example.test',password:'test-password-12345'}}),env);
  assert.equal(response.status,200);
  assert.equal((await response.clone().text()).includes('access-secret'),false);
  const cookies=response.headers.getSetCookie();assert.equal(cookies.length,2);
  for(const cookie of cookies){assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);}
  assert.equal((await app.fetch(req('/api/auth/login',{method:'POST',origin:'https://evil.example',data:{}}),env)).status,403);
  const config=await app.fetch(req('/api/config',{user:false}),env);
  const text=await config.text();assert.equal(text.includes(env.SUPABASE_SERVICE_ROLE_KEY),false);assert.equal(text.includes(SECRET),false);
});
test('commerce build has no private JSON and uses authenticated API and scoped storage',async()=> {
  const config=await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8');
  // Prevent Static Assets from redirecting /index.html back to / while the
  // Worker maps / to /index.html (an otherwise infinite redirect loop).
  assert.match(config,/"html_handling"\s*:\s*"none"/);
  const quiz=await readFile(new URL('../../.commerce-dist/public/assets/js/quiz-app.js',import.meta.url),'utf8');
  const python=await readFile(new URL('../../.commerce-dist/public/assets/js/python-lab.js',import.meta.url),'utf8');
  assert.match(quiz,/\/api\/course\/manifest/);assert.doesNotMatch(quiz,/\.\/data\/manifest/);
  assert.match(quiz,/it1140-commerce-quiz:v1:\$\{data.userScope\}/);
  assert.match(python,/it1140-commerce-python:v1:\$\{data.userScope\}/);
  const sw=await readFile(new URL('../public/commerce-sw.js',import.meta.url),'utf8');
  assert.doesNotMatch(sw,/addEventListener\(['"]fetch/);assert.doesNotMatch(sw,/cache\.put|addAll/);
  const root=await readdir(new URL('../../.commerce-dist/public/',import.meta.url));
  assert.equal(root.includes('data'),false);assert.equal(root.includes('schema.sql'),false);
});
