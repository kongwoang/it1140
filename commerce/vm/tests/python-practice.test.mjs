import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const root = new URL('../../../', import.meta.url);
const read = path => readFile(new URL(path,root),'utf8');
const practice = await read('assets/js/python-practice.js');
const context = {};runInNewContext(practice,context);
const P = context.IT1140PythonPractice, now = 1792200000000;

test('timed practice uses a persistent deadline, clamps elapsed time and submits once',()=>{
  const s = P.begin('py-one',30,now);
  assert.equal(s.code,'');assert.equal(P.clock(P.remaining(s,now+12345)),'29:48');
  assert.equal(P.remaining(s,now+31*60000),0);
  assert.equal(P.submit(s,now+31*60000),true);assert.equal(s.endedAt-s.startedAt,30*60000);
  assert.equal(P.submit(s,now+40*60000),false);
  assert.equal(P.normalize({session:s}).session.phase,'submitted');
  assert.throws(()=>P.begin('constructor',30,now));assert.throws(()=>P.begin('py-one',91,now));
});

test('corrupt or oversized local practice state is discarded; old drafts can migrate',()=>{
  assert.equal(P.normalize(null).session,null);
  for(const patch of [{code:'x'.repeat(200001)},{input:'x'.repeat(200001)},{phase:'other'},{deadlineAt:now+91*60000},{testCase:-1},{exerciseId:'__proto__'}]) {
    assert.equal(P.normalize({session:{...P.begin('py-one',30,now),...patch}}).session,null);
  }
  const s = P.begin('py-one',30,now);s.phase='submitted';s.endedAt=now-1;
  assert.equal(P.normalize({session:s}).session,null);
  const bad = JSON.parse('{"records":{"constructor":[{}],"py-one":[{"at":1,"mode":"practice","total":0,"passed":0,"assisted":false,"elapsedMs":null}]},"hinted":{"constructor":true,"py-one":true}}');
  const clean=P.normalize(bad);assert.equal(Object.keys(clean.records).length,1);assert.equal(clean.records['py-one'].length,0);
  assert.equal(clean.hinted['py-one'],true);assert.equal(Object.hasOwn(clean.hinted,'constructor'),false);
});

test('recent submissions are bounded and the latest result decides review status',()=>{
  const state=P.normalize(null);
  assert.equal(P.status(state,'py-one',false,false),'new');assert.equal(P.status(state,'py-one',false,true),'draft');
  assert.equal(P.status(state,'py-one',true,true),'passed');
  for(let i=0;i<15;i++) P.record(state,'py-one',{at:now+i,mode:'practice',passed:3,total:3,assisted:false,elapsedMs:null});
  assert.equal(state.records['py-one'].length,10);
  P.record(state,'py-one',{at:now+20,mode:'timed',passed:1,total:3,assisted:false,elapsedMs:4000});
  assert.equal(P.status(state,'py-one',true,true),'review');
  P.record(state,'py-one',{at:now+30,mode:'practice',passed:4,total:3,assisted:false,elapsedMs:null});
  assert.equal(state.records['py-one'].at(-1).passed,1,'invalid grades cannot be recorded');
});

// Exercise the real lab integration (static and commercial builds) with a small
// DOM/worker double. No learner code is executed by this test process.
class Element {
  constructor(){this.value='';this.children=[];this.listeners={};this.style={};this.dataset={};this.hidden=false;this.disabled=false;this.readOnly=false;this.selectionStart=this.selectionEnd=0;this.classList={toggle(){}};}
  addEventListener(name,fn){(this.listeners[name] ||= []).push(fn);}
  emit(name,extra={}){for(const fn of this.listeners[name] || []) fn({target:this,preventDefault(){},...extra});}
  click(){if(!this.disabled)this.emit('click');}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  set innerHTML(value){this.children=[];this.html=value;}
  get innerHTML(){return this.html || '';}
  setAttribute(name,value){this[name]=value;}
  removeAttribute(name){delete this[name];}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
  focus(){} blur(){}
}
const exercise={id:'py-one',title:'One',task:'A task',hint:'A hint',library:'Python',level:'Cơ bản',section:'Part',tests:[{label:'Case 1',input:'0\n',output:'32.00'},{label:'Case 2',input:'100\n',output:'212.00'}]};
async function harness(commercial,store=new Map()) {
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  get('timedMinutes').value='30';
  const events={},intervals=[],workers=[],timeouts=new Map();let wallTime=now,serial=0;
  class Clock extends Date {static now(){return wallTime;}}
  class Worker {
    constructor(){this.events={};this.posts=[];workers.push(this);}
    addEventListener(name,fn){this.events[name]=fn;}
    postMessage(message){this.posts.push(message);}
    terminate(){this.terminated=true;}
    complete(passed=true){const run=this.posts.at(-1);this.events.message({data:{runId:run.runId,mode:run.mode,output:'32.00',error:'',tests:exercise.tests.map(t=>({...t,passed}))}});}
  }
  const scope={Date:Clock,Worker,Option:class extends Element {constructor(label,value){super();this.textContent=label;this.value=value;}},
    localStorage:{getItem:key=>store.get(key) || null,setItem:(key,value)=>store.set(key,value)},
    document:{getElementById:get,createElement:()=>new Element(),addEventListener:(name,fn)=>events[name]=fn},
    setTimeout:(fn,delay)=>{timeouts.set(++serial,{fn,delay});return serial;},clearTimeout:id=>timeouts.delete(id),setInterval:fn=>intervals.push(fn),
    getComputedStyle:()=>({lineHeight:'24'}),
    fetch:async url=>({ok:true,json:async()=>url.endsWith('/py-one')?structuredClone(exercise):{userScope:'test-user',exercises:[structuredClone(exercise)]}}),
    IT1140Text:{render:(el,text)=>el.textContent=text},navigator:{},Blob,URL};
  scope.window=scope;scope.addEventListener=(name,fn)=>{(events[name] ||= []).push(fn);};scope.confirm=()=>true;
  scope.IT1140Study={ready:Promise.resolve(),apiBase:'/api/preview'};
  scope.IT1140CreatePythonWorker=()=>new Worker();
  for(const path of ['assets/js/python-editor.js','assets/js/python-errors.js'])runInNewContext(await read(path),scope);
  runInNewContext(practice,scope);
  runInNewContext(await read(commercial?'.vm-dist/public/assets/js/python-lab.js':'assets/js/python-lab.js'),scope);
  const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};await flush();
  const key=commercial?'it1140-commerce-python:v2:test-user':'it1140-python-lab:v4';
  return {get,workers,store,flush,state:()=>JSON.parse(store.get(key)),fill:(id,text)=>{get(id).value=text;get(id).emit('input');},
    timeouts,fireTimeout:delay=>{const entry=[...timeouts].find(([,v])=>v.delay===delay);assert.ok(entry,`timer ${delay}`);timeouts.delete(entry[0]);entry[1].fn();},
    confirm:value=>scope.confirm=()=>value,
    advance:ms=>{wallTime+=ms;for(const fn of intervals)fn();},stopStudy:()=>{for(const fn of events['it1140:study-stopped'] || [])fn();}};
}

for(const commercial of [false,true]) {
  const name=commercial?'commercial':'static';
  test(`${name}: syntax errors count as an attempt against the full test set without pretending cases ran`,async()=>{
    const h=await harness(commercial);h.fill('pythonEditor','print(');h.get('runPythonBtn').click();const w=h.workers.at(-1),run=w.posts.at(-1);
    w.events.message({data:{runId:run.runId,mode:'tests',error:'SyntaxError',diagnostic:{type:'SyntaxError',message:'unclosed parenthesis',line:1},tests:[]}});
    assert.equal(h.state().practice.records['py-one'][0].total,2);assert.equal(h.state().practice.records['py-one'][0].passed,0);
    assert.equal(h.get('pythonTests').children.length,2);assert.match(h.get('pythonTests').children[0].textContent,/Chưa chạy/);
    assert.equal(h.get('pythonTests').children[0].className,'is-pending');assert.equal(h.get('pythonHistory').hidden,false);
  });
  test(`${name}: infrastructure load timeout differs from program timeout and never records a failed submission`,async()=>{
    const h=await harness(commercial);h.fill('pythonEditor','print(1)');h.get('runPythonBtn').click();h.fireTimeout(120000);
    assert.match(h.get('pythonOutput').textContent,/120 giây/);assert.match(h.get('pythonOutput').textContent,/kiểm tra mạng/);
    assert.equal(h.state().practice.records['py-one'],undefined);assert.equal(h.get('pythonEditor').value,'print(1)');
    h.get('runPythonBtn').click();const w=h.workers.at(-1),run=w.posts.at(-1);
    w.events.message({data:{type:'status',runId:run.runId,status:'running'}});
    assert.equal([...h.timeouts.values()].some(t=>t.delay===120000),false);h.fireTimeout(60000);
    assert.match(h.get('pythonOutput').textContent,/vòng lặp/);assert.equal(h.state().practice.records['py-one'],undefined);
  });
  test(`${name}: late errors from a cancelled worker cannot terminate a newer run`,async()=>{
    const h=await harness(commercial);h.fill('pythonEditor','print(1)');h.get('runPythonBtn').click();const old=h.workers.at(-1);
    h.get('stopPythonBtn').click();h.get('runPythonBtn').click();const current=h.workers.at(-1);old.events.error({message:'late worker error'});
    assert.equal(current.terminated,undefined);assert.equal(h.get('runPythonBtn').disabled,true);current.complete();
    assert.equal(h.state().practice.records['py-one'][0].passed,2);
  });
  test(`${name}: empty results and history stay hidden; running, grading and failures remain visible`,async()=>{
    const h=await harness(commercial);
    assert.equal(h.get('pythonResults').hidden,true);assert.equal(h.get('pythonHistory').hidden,true);assert.equal(h.get('pythonStatus').hidden,true);
    h.fill('pythonEditor','print(0)');h.get('runPythonInputBtn').click();
    assert.equal(h.get('pythonResults').hidden,false);assert.equal(h.get('pythonTestPanel').hidden,true);assert.equal(h.get('pythonStatus').hidden,false);
    h.workers.at(-1).complete();assert.equal(h.get('pythonHistory').hidden,true);assert.equal(h.get('pythonTestPanel').hidden,true);
    h.get('runPythonBtn').click();h.workers.at(-1).complete(false);
    assert.equal(h.get('pythonTestPanel').hidden,false);assert.equal(h.get('pythonHistory').hidden,false);
    h.get('runPythonBtn').click();const w=h.workers.at(-1);
    w.events.message({data:{runId:w.posts.at(-1).runId,type:'fatal',error:'Runtime unavailable'}});
    assert.equal(h.get('pythonResults').hidden,false);assert.equal(h.get('pythonTestPanel').hidden,true);
    assert.equal(h.get('pythonOutput').textContent,'Runtime unavailable');assert.equal(h.get('pythonStatus').hidden,false);
  });
  test(`${name}: timed buffers survive reload, submit immutable code and preserve ordinary drafts`,async()=>{
    const h=await harness(commercial);h.fill('pythonEditor','# ordinary draft');h.get('startTimedBtn').click();await h.flush();
    assert.equal(h.get('pythonEditor').value,'');assert.equal(h.get('toggleHintBtn').hidden,true);
    h.fill('pythonEditor','print(32)');h.advance(2000);
    assert.equal(h.state().code['py-one'],'# ordinary draft');assert.equal(h.state().practice.session.code,'print(32)');
    const loaded=await harness(commercial,h.store);assert.equal(loaded.get('pythonEditor').value,'print(32)');
    loaded.get('runPythonBtn').click();assert.equal(loaded.get('pythonEditor').readOnly,true);
    loaded.workers.at(-1).complete();assert.equal(loaded.state().practice.session.phase,'review');
    assert.equal(loaded.state().practice.records['py-one'].length,1);assert.equal(loaded.state().practice.records['py-one'][0].mode,'timed');
    loaded.get('runPythonBtn').click();assert.equal(loaded.state().practice.records['py-one'].length,1);
    loaded.get('leaveTimedBtn').click();await loaded.flush();
    assert.equal(loaded.get('pythonEditor').value,'# ordinary draft');assert.equal(loaded.state().practice.session,null);
  });
  test(`${name}: expiration cancels a single run and late worker results cannot overwrite the submitted result`,async()=>{
    const h=await harness(commercial);h.get('startTimedBtn').click();await h.flush();h.fill('pythonEditor','while True: pass');
    h.get('runPythonInputBtn').click();const first=h.workers.at(-1);
    h.advance(31*60000);assert.equal(first.terminated,true);assert.equal(h.state().practice.session.phase,'submitted');
    first.complete();assert.equal(h.state().practice.records['py-one'],undefined);
    h.workers.at(-1).complete(false);assert.equal(h.state().practice.records['py-one'][0].elapsedMs,30*60000);
    assert.equal(h.state().practice.records['py-one'][0].passed,0);assert.equal(h.get('pythonEditor').readOnly,true);
  });
  test(`${name}: interrupted grading can retry frozen code; stopping the study disables activity`,async()=>{
    const h=await harness(commercial);h.get('startTimedBtn').click();await h.flush();h.fill('pythonEditor','print(32)');h.get('runPythonBtn').click();
    h.get('stopPythonBtn').click();assert.equal(h.state().practice.session.phase,'submitted');assert.equal(h.get('runPythonBtn').disabled,false);
    const reloaded=await harness(commercial,h.store);assert.equal(reloaded.get('pythonEditor').readOnly,true);
    reloaded.get('runPythonBtn').click();reloaded.workers.at(-1).complete();assert.equal(reloaded.state().practice.records['py-one'].length,1);
    reloaded.stopStudy();assert.equal(reloaded.get('runPythonBtn').disabled,true);assert.equal(reloaded.get('runPythonInputBtn').disabled,true);
  });
  test(`${name}: ordinary submissions track hints and failed latest results appear in review filter`,async()=>{
    const h=await harness(commercial);h.get('toggleHintBtn').click();h.fill('pythonEditor','print(0)');h.get('runPythonBtn').click();h.workers.at(-1).complete(false);
    assert.equal(h.state().practice.records['py-one'][0].assisted,true);
    h.get('exerciseState').value='review';h.get('exerciseState').emit('change');assert.equal(h.get('exerciseList').children.length,2);
    h.get('exerciseState').value='passed';h.get('exerciseState').emit('change');assert.equal(h.get('exerciseList').children[0].textContent,'Không có bài phù hợp.');
  });
  test(`${name}: editing a submitted solution requires consent before replacing a different ordinary draft`,async()=>{
    const h=await harness(commercial);h.fill('pythonEditor','# saved draft');h.get('startTimedBtn').click();await h.flush();
    h.fill('pythonEditor','print(0)');h.get('runPythonBtn').click();h.workers.at(-1).complete(false);
    h.confirm(false);h.get('editSubmittedBtn').click();assert.equal(h.state().practice.session.phase,'review');assert.equal(h.state().code['py-one'],'# saved draft');
    h.confirm(true);h.get('editSubmittedBtn').click();await h.flush();assert.equal(h.state().practice.session,null);
    assert.equal(h.get('pythonEditor').value,'print(0)');assert.equal(h.get('pythonEditor').readOnly,false);
    assert.equal(h.state().practice.records['py-one'].length,1);
  });
  test(`${name}: sample output never masquerades as expected output for a custom input; storage failures warn`,async()=>{
    const h=await harness(commercial);assert.equal(h.get('pythonExpected').hidden,false);assert.equal(h.get('pythonExpectedOutput').textContent,'32.00');
    h.fill('pythonInput','5\n');assert.equal(h.get('pythonExpected').hidden,true);
    h.get('startTimedBtn').click();await h.flush();assert.equal(h.get('pythonExpected').hidden,true);
    assert.equal(h.get('pythonSampleCase').children.length,1,'only first sample is exposed during timed practice');
    h.store.set=()=>{throw Error('quota exceeded');};h.fill('pythonEditor','print(1)');assert.equal(h.get('pythonStorageWarning').hidden,false);
    h.get('runPythonInputBtn').click();assert.equal(h.workers.at(-1).posts.length,1,'storage failure must not break execution');
  });
  test(`${name}: Python errors remain visible without translated coaching before timed submission`,async()=>{
    const h=await harness(commercial);h.get('startTimedBtn').click();await h.flush();h.fill('pythonEditor','print(');
    h.get('runPythonInputBtn').click();const w=h.workers.at(-1),run=w.posts.at(-1);
    w.events.message({data:{runId:run.runId,mode:'single',error:'SyntaxError: missing closing parenthesis',diagnostic:{type:'SyntaxError',message:'missing closing parenthesis',line:1},tests:[]}});
    assert.equal(h.get('pythonDiagnostic').hidden,true);assert.equal(h.get('pythonWarnings').hidden,true);
    assert.match(h.get('pythonOutput').textContent,/SyntaxError/);assert.equal(h.get('runPythonBtn').disabled,false);
  });
}
