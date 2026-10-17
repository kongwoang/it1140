import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../public/study-client.js',import.meta.url),'utf8');

async function harness(preview=false){
  const elements=new Map(),timers=new Map(),events={},requests=[],dispatched=[];let serial=0,now=1792200000000;
  class Clock extends Date {static now(){return now;}}
  const node=()=>({children:[],attributes:{},append(...items){this.children.push(...items);},setAttribute(k,v){this.attributes[k]=v;},set id(id){this.key=id;elements.set(id,this);},get id(){return this.key;}});
  const app=node(),body=node();body.dataset={access:preview?'preview':'paid'};
  const ctx={Date:Clock,window:{dispatchEvent:event=>dispatched.push(event.type)},Event:class{constructor(type){this.type=type;}},AbortController,navigator:{},
    document:{body,hidden:false,getElementById:id=>elements.get(id),createElement:node,querySelector:()=>app,addEventListener:(name,fn)=>events[name]=fn},
    setTimeout:(fn,delay)=>{timers.set(++serial,{fn,delay});return serial;},clearTimeout:id=>timers.delete(id),
    fetch:(url,options)=>{
      if(url.endsWith('/claim'))return Promise.resolve({ok:true});
      return new Promise((resolve,reject)=>{const request={url,options,resolve,reject};requests.push(request);options.signal.addEventListener('abort',()=>reject(Error('timeout')));});
    }};
  runInNewContext(source,ctx);const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};await flush();
  return {ctx,app,body,timers,requests,dispatched,elements,flush,advance:ms=>now+=ms,focus:()=>events.visibilitychange(),fire:delay=>{const entry=[...timers].find(([,v])=>v.delay===delay);assert.ok(entry,`timer ${delay}`);timers.delete(entry[0]);entry[1].fn();}};
}

test('switching tabs repeatedly coalesces study heartbeats and keeps one future heartbeat',async()=>{
  const h=await harness();for(let i=0;i<20;i++)h.focus();assert.equal(h.requests.length,1);
  assert.equal([...h.timers.values()].filter(t=>t.delay>=55000).length,0);
  h.requests[0].resolve({ok:true});await h.flush();assert.equal([...h.timers.values()].filter(t=>t.delay>=55000).length,1);
  assert.equal([...h.timers.values()].filter(t=>t.delay===15000).length,0);
  for(let i=0;i<20;i++)h.focus();assert.equal(h.requests.length,1,'rapid sequential focus must not cancel the future heartbeat or flood the DB');
  assert.equal([...h.timers.values()].filter(t=>t.delay>=55000).length,1);
  h.advance(6000);h.focus();assert.equal(h.requests.length,2);
});

test('a hung heartbeat times out, blocks the old study UI and never resumes on its own',async()=>{
  const h=await harness();h.focus();h.fire(15000);await h.flush();
  assert.equal(h.app.attributes.inert,'');assert.ok(h.elements.has('studyBlock'));assert.deepEqual(h.dispatched,['it1140:study-stopped']);
  for(let i=0;i<5;i++)h.focus();assert.equal(h.requests.length,1);assert.equal(h.timers.size,0);
});

test('late heartbeat success cannot restart a blocked study and denial dispatches stop only once',async()=>{
  const h=await harness();h.focus();h.ctx.window.IT1140Study.block('Stopped');h.requests[0].resolve({ok:true});await h.flush();
  assert.equal(h.timers.size,0);assert.equal(h.dispatched.length,1);
  const denied=await harness();denied.focus();denied.requests[0].resolve({ok:false,status:401});await denied.flush();
  denied.focus();assert.equal(denied.dispatched.length,1);assert.equal(denied.requests.length,1);assert.equal(denied.timers.size,0);
});

test('anonymous preview never claims or refreshes an authenticated study lease',async()=>{
  const h=await harness(true);await h.ctx.window.IT1140Study.ready;for(let i=0;i<10;i++)h.focus();
  assert.equal(h.requests.length,0);assert.equal(h.timers.size,0);
});
