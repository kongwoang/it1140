import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../public/account.js',import.meta.url),'utf8');
class Element {
  constructor(){this.value='';this.hidden=false;this.disabled=false;this.children=[];this.listeners={};this.classList={toggle(){}};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  async emit(name){await this.listeners[name]?.({preventDefault(){}});}
  async click(){if(!this.disabled)await this.emit('click');}
  replaceChildren(...children){this.children=children;}
  append(...children){this.children.push(...children);}
  removeAttribute(key){delete this[key];}
  focus(){}
}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const response=(value,status=200)=>({ok:status<400,status,json:async()=>value});
async function harness({member=false,ready=true,routes:initial={}}={}){
  const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new Element());return els.get(id);};
  for(const id of ['otpForm','member','enrollment','order','takeover'])get(id).hidden=true;
  get('requestOtp').disabled=true;get('email').value='student@sis.hust.edu.vn';get('otp').value='123456';get('label').value='Test browser';
  const routes=new Map(Object.entries(initial)),timers=new Map(),intervals=new Map(),calls=[],visited=[];let now=1792200000000,serial=0;
  class Clock extends Date {static now(){return now;}}
  const defaults={
    '/api/config':()=>response({ready,paymentsEnabled:true,price:20000,questions:2096,exercises:200,domains:['sis.hust.edu.vn'],preview:{questions:210,exercises:20}}),
    '/api/me':()=>member?response({email:'student@sis.hust.edu.vn',lifetime:true}):response({error:'unauthenticated'},401),
    '/api/devices':()=>response({devices:[],current:'one'}),
    '/api/auth/request':()=>response({challengeId:'challenge-one'}),
    '/api/auth/verify':()=>response({}),'/api/auth/logout':()=>response({}),
    '/api/orders':()=>response({id:'order-one',qrUrl:'https://example.test/qr.png',amount:20000,accountName:'Test',account:'0000000000',code:'TEST',expiresAt:new Date(now+60000).toISOString()}),
    '/api/orders/order-one':()=>response({status:'pending',expiresAt:new Date(now+60000).toISOString()}),
  };
  const ctx={window:{},navigator:{},Date:Clock,AbortController,DOMException,
    document:{hidden:false,getElementById:get,createElement:()=>new Element(),addEventListener(){},head:new Element()},
    setTimeout:(fn,delay)=>{timers.set(++serial,{fn,at:now+delay});return serial;},clearTimeout:id=>timers.delete(id),
    setInterval:(fn,delay)=>{intervals.set(++serial,{fn,delay});return serial;},clearInterval:id=>intervals.delete(id),confirm:()=>true,
    location:{assign:path=>visited.push(path)},fetch:(url,options)=>{
      calls.push({url,options});const handler=routes.get(url)||defaults[url];assert.ok(handler,`Unexpected request ${url}`);
      return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));Promise.resolve(handler(options)).then(resolve,reject);});
    }};
  runInNewContext(source,ctx);const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};await flush();
  return {get,calls,routes,timers,intervals,visited,flush,submit:id=>get(id).emit('submit'),advance:async ms=>{now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}await flush();},poll:()=>{for(const t of intervals.values())t.fn();}};
}

test('OTP cooldown survives changing form, is scoped to email and does not send duplicates',async()=>{
  const h=await harness();await h.submit('emailForm');assert.equal(h.get('otpForm').hidden,false);assert.match(h.get('status').textContent,/student@sis.hust.edu.vn/);
  await h.get('changeEmail').click();assert.equal(h.get('requestOtp').disabled,true);assert.match(h.get('requestOtp').textContent,/60s/);
  await h.submit('emailForm');assert.equal(h.calls.filter(c=>c.url.endsWith('/request')).length,1);
  h.get('email').value='other@sis.hust.edu.vn';await h.get('email').emit('input');assert.equal(h.get('requestOtp').disabled,false);
  h.get('email').value='student@sis.hust.edu.vn';await h.get('email').emit('input');assert.equal(h.get('requestOtp').disabled,true);
  await h.advance(61000);assert.equal(h.get('requestOtp').disabled,false);
});

test('pending OTP request and verification are single-flight and lock only their active controls',async()=>{
  const request=deferred(),verify=deferred();const h=await harness({routes:{'/api/auth/request':()=>request.promise,'/api/auth/verify':()=>verify.promise}});
  const first=h.submit('emailForm'),duplicate=h.submit('emailForm');assert.equal(h.get('email').disabled,true);
  assert.equal(h.calls.filter(c=>c.url.endsWith('/request')).length,1);request.resolve(response({challengeId:'challenge-one'}));await Promise.all([first,duplicate]);
  const verification=h.submit('otpForm');await h.submit('otpForm');assert.equal(h.get('changeEmail').disabled,true);
  assert.equal(h.calls.filter(c=>c.url.endsWith('/verify')).length,1);
  h.routes.set('/api/me',()=>response({email:'student@sis.hust.edu.vn',lifetime:true}));verify.resolve(response({}));await verification;
  assert.equal(h.get('member').hidden,false);assert.equal(h.get('changeEmail').disabled,false);
});

test('request timeout and non-JSON responses show Vietnamese feedback without automatic POST retries',async()=>{
  const h=await harness({routes:{'/api/auth/request':()=>new Promise(()=>{})}});const pending=h.submit('emailForm');await h.flush();await h.advance(31000);await pending;
  assert.match(h.get('status').textContent,/Không nhận được phản hồi/);assert.equal(h.get('requestOtp').disabled,false);assert.equal(h.get('email').disabled,false);
  assert.equal(h.calls.filter(c=>c.url.endsWith('/request')).length,1);
  h.routes.set('/api/auth/request',()=>({ok:false,json:async()=>{throw SyntaxError('Invalid JSON');}}));await h.submit('emailForm');assert.match(h.get('status').textContent,/Không nhận được phản hồi/);
});

test('unconfigured mail cannot be submitted by bypassing the disabled HTML button',async()=>{
  const h=await harness({ready:false});await h.submit('emailForm');assert.equal(h.calls.some(c=>c.url.endsWith('/request')),false);
});

test('late order creation cannot restore private checkout UI after logout',async()=>{
  const order=deferred();const h=await harness({member:true,routes:{'/api/orders':()=>order.promise}});
  const buying=h.get('buy').click();await h.get('logout').click();
  order.resolve(response({id:'old-order',qrUrl:'https://example.test/old.png',amount:20000}));await buying;
  assert.equal(h.get('order').hidden,true);assert.equal(h.get('qr').src,undefined);assert.equal(h.get('code').textContent,'');assert.equal(h.get('emailForm').hidden,false);
});

test('late device responses and stale takeover buttons do not leak into the next auth view',async()=>{
  const devices=deferred();const h=await harness({member:true,routes:{'/api/devices':()=>devices.promise}});
  h.get('takeover').hidden=false;await h.get('reauth').click();devices.resolve(response({devices:[{id:'old',label:'Old account'}]}));await h.flush();
  assert.equal(h.get('deviceList').children.length,0);assert.equal(h.get('takeover').hidden,true);assert.equal(h.get('member').hidden,true);
});

test('manual order checks and background polling share a single request; stale replies are ignored',async()=>{
  const check=deferred();const h=await harness({member:true,routes:{'/api/orders/order-one':()=>check.promise}});await h.get('buy').click();
  h.poll();h.poll();await h.get('check').click();assert.equal(h.calls.filter(c=>c.url.endsWith('/order-one')).length,1);
  await h.get('logout').click();check.resolve(response({status:'paid'}));await h.flush();
  assert.equal(h.get('member').hidden,true);assert.equal(h.get('order').hidden,true);assert.equal(h.intervals.size,0);
});

test('a late study claim cannot navigate or display takeover after logout',async()=>{
  for(const code of [200,409]){
    const claim=deferred(),h=await harness({member:true,routes:{'/api/study/claim':()=>claim.promise}});
    const entering=h.get('enter').click();await h.get('logout').click();claim.resolve(response(code===200?{}:{error:'study_conflict'},code));await entering;
    assert.deepEqual(h.visited,[]);assert.equal(h.get('takeover').hidden,true);assert.equal(h.get('status').textContent,'Đã đăng xuất.');
  }
});
