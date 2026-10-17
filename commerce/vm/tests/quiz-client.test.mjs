import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('../public/quiz.js',import.meta.url),'utf8');
class Element {
  constructor(){this.children=[];this.listeners={};this.attributes={};this.value='';this.dataset={};this.style={};this.classes=new Set();this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key),add:key=>this.classes.add(key)};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  append(...nodes){this.children.push(...nodes);}
  prepend(node){this.children.unshift(node);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(key,value){this.attributes[key]=value;}
  async emit(name){await this.listeners[name]?.();}
  async click(){if(!this.disabled)await this.emit('click');}
}
const q=id=>({id,chapter:'c1',prompt:id,choices:['A','B']});
async function harness(saved={},options={}){
  const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new Element());return els.get(id);};
  const modes=['practice','exam','review'].map(mode=>Object.assign(new Element(),{dataset:{mode}}));
  const tabs=['quizView','pythonLabView'].map(view=>Object.assign(new Element(),{dataset:{view}}));
  const views=['quizView','pythonLabView'].map(id=>Object.assign(get(id),{id}));
  const timers=new Map(),pending=[],store=new Map([['it1140-commerce-quiz:v3:test',JSON.stringify({chapter:'c1',...saved})]]);let serial=0;
  const requests=[],question=id=>({...q(id),...options.question});
  let defer=false,fail=options.failDetail;
  const context={window:{IT1140Study:{ready:Promise.resolve(),apiBase:'/api/preview'},dispatchEvent(){}},
    document:{getElementById:get,createElement:()=>new Element(),querySelector:get,querySelectorAll:s=>s==='.mode-btn'?modes:s==='.section-tab'?tabs:s==='[data-section-view]'?views:s==='#questionMap button[data-question-id]'?get('questionMap').children.filter(el=>el.dataset.questionId):[]},CustomEvent:class {},
    AbortController,Option:Element,IT1140Text:{render:(el,text)=>el.textContent=text},
    localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
    setTimeout:(fn,delay)=>{timers.set(++serial,{fn,delay});return serial;},clearTimeout:id=>timers.delete(id),confirm:()=>false,
    fetch:async (url,request)=>{
      requests.push({url,request});
      if(url.endsWith('/catalog'))return {ok:true,json:async()=>({userScope:'test',chapters:[{id:'c1',label:'Chapter',count:2},{id:'c2',label:'Other',count:2}]})};
      if(url.endsWith('/grade'))return {ok:true,json:async()=>({correct:true,answer:0.5,explanation:'Explanation'})};
      if(url.includes('questions?ids=')){
        if(options.stallDetail)return new Promise((resolve,reject)=>request.signal.addEventListener('abort',()=>reject(Error('offline'))));
        if(fail){fail=false;throw Error('Network lost');}
        return {ok:true,json:async()=>({questions:[question('q-one'),question('q-two')]})};
      }
      if(defer)return new Promise(resolve=>pending.push(data=>resolve({ok:true,json:async()=>data})));
      return {ok:true,json:async()=>({ids:['q-one','q-two'],questions:[question('q-one')]})};
    }};
  runInNewContext(source,context);const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};await flush();
  return {get,tabs,modes,requests,flush,pending,store,timers,defer:()=>defer=true,search:term=>{get('searchInput').value=term;get('searchInput').emit('input');[...timers.values()].filter(t=>t.delay===400).at(-1).fn();}};
}

test('quiz restores the saved question and a failed detail request can retry without locked controls',async()=>{
  const h=await harness({index:1},{failDetail:true});
  assert.equal(h.get('questionCount').textContent,'Câu 2/2');assert.equal(h.get('prevBtn').disabled,false);
  assert.equal(h.get('shuffleBtn').disabled,false);assert.match(h.get('feedbackBox').children[0].textContent,/Không kết nối/);
  const retry=h.get('feedbackBox').children[1];assert.equal(retry.textContent,'Thử lại');assert.equal(retry.disabled,false);
  await retry.click();await h.flush();assert.equal(h.get('questionText').textContent,'q-two');assert.equal(h.get('feedbackBox').hidden,true);
});

test('a late search response cannot replace the latest scope or re-enable controls while it loads',async()=>{
  const h=await harness();h.defer();h.search('older');h.search('newer');
  assert.equal(h.pending.length,2);assert.equal(h.get('shuffleBtn').disabled,true);
  h.pending[0]({ids:['old'],questions:[q('old')]});await h.flush();assert.equal(h.get('shuffleBtn').disabled,true);
  h.pending[1]({ids:['new'],questions:[q('new')]});await h.flush();assert.equal(h.get('questionText').textContent,'new');
  assert.equal(h.get('shuffleBtn').disabled,false);
});

test('cancelling replacement of an unfinished exam keeps its question and chapter intact',async()=>{
  const h=await harness({mode:'exam',chapter:'c1',exam:{id:'exam-one',chapter:'c1',answers:{'q-one':0}}});
  assert.equal(h.get('questionText').textContent,'q-one');await h.get('shuffleBtn').click();await h.flush();
  assert.equal(h.get('questionText').textContent,'q-one');assert.equal(h.get('chapterFilter').value,'c1');assert.equal(h.get('shuffleBtn').disabled,false);
  assert.equal(h.pending.length,0);
});

test('unfinished exams show answered progress immediately without revealing a score',async()=>{
  const h=await harness({mode:'exam',exam:{id:'exam-one',chapter:'c1',answers:{}}});
  assert.equal(h.get('progressText').textContent,'0/2');assert.equal(h.get('.score-grid').hidden,true);
  const input=h.get('choiceList').children[0].children[0];await input.emit('change');
  assert.equal(h.get('progressText').textContent,'1/2');
});

test('corrupt local maps are repaired, Python tab survives reload and empty selection is not graded',async()=>{
  const h=await harness({view:'pythonLabView',pins:null,results:[],answers:{'q-one':[]},query:44});
  assert.equal(h.get('pythonLabView').hidden,false);assert.equal(h.get('quizView').hidden,true);
  await h.tabs[0].click();await h.get('submitBtn').click();
  assert.match(h.get('feedbackBox').children[0].textContent,/Hãy chọn/);
  const state=JSON.parse(h.store.get('it1140-commerce-quiz:v3:test'));assert.equal(state.view,'quizView');assert.deepEqual(state.pins,{});
});

test('invalid numeric input cannot be graded; comma decimals match the server and update exam map live',async()=>{
  const h=await harness({answers:{'q-one':'1/2'}},{question:{responseType:'number'}});
  await h.get('submitBtn').click();assert.match(h.get('feedbackBox').children[0].textContent,/số hợp lệ/);
  assert.equal(h.requests.some(r=>r.url.endsWith('/grade')),false);
  const input=h.get('choiceList').children[0].children[0];input.value='0,5';await input.emit('input');
  assert.equal(h.get('feedbackBox').hidden,true,'answer-format feedback must clear when the learner edits the answer');
  assert.equal(input.attributes['aria-invalid'],'false');await h.get('submitBtn').click();
  assert.equal(JSON.parse(h.requests.find(r=>r.url.endsWith('/grade')).request.body).answer,'0,5');
  const exam=await harness({mode:'exam',exam:{id:'exam-one',chapter:'c1',answers:{}}},{question:{responseType:'number'}});
  const number=exam.get('choiceList').children[0].children[0];number.value='-';await number.emit('input');
  assert.equal(exam.get('progressText').textContent,'0/2');assert.equal(number.attributes['aria-invalid'],'true');
  number.value='1e2';await number.emit('input');assert.equal(exam.get('progressText').textContent,'1/2');
  assert.equal(exam.get('questionMap').children[0].classes.has('is-answered'),true);
  number.value='';await number.emit('input');assert.equal(exam.get('questionMap').children[0].classes.has('is-answered'),false);
});

test('multiple choice can be fully unchecked without falsely marking the question answered',async()=>{
  const h=await harness({mode:'exam',exam:{id:'exam-one',chapter:'c1',answers:{}}},{question:{multiple:true}});
  const input=h.get('choiceList').children[0].children[0];input.checked=true;await input.emit('change');assert.equal(h.get('progressText').textContent,'1/2');
  input.checked=false;await input.emit('change');assert.equal(h.get('progressText').textContent,'0/2');assert.equal(h.get('questionMap').children[0].classes.has('is-answered'),false);
});

test('cancelling an old unfinished exam from another mode rolls back mode and chapter, not just the dropdown',async()=>{
  const h=await harness({mode:'practice',chapter:'c2',exam:{id:'exam-one',chapter:'c1',answers:{'q-one':0}}});
  const calls=h.requests.length;await h.modes[1].click();await h.flush();
  const saved=JSON.parse(h.store.get('it1140-commerce-quiz:v3:test'));
  assert.equal(saved.mode,'practice');assert.equal(saved.chapter,'c2');assert.equal(h.requests.length,calls);
  assert.equal(h.get('questionText').textContent,'q-one');assert.equal(h.get('chapterFilter').value,'c2');
});

test('saved shuffled order is intersected with server IDs and resumes the same question',async()=>{
  const h=await harness({locations:{practice:{key:JSON.stringify(['practice','c1','',false]),id:'q-two',index:0,order:['paid-forged','q-two','q-two','q-one']}}});
  assert.equal(h.get('questionText').textContent,'q-two');assert.equal(h.get('questionCount').textContent,'Câu 1/2');
  const saved=JSON.parse(h.store.get('it1140-commerce-quiz:v3:test'));assert.deepEqual(saved.locations.practice.order,['q-two','q-one']);
  await h.modes[2].click();await h.flush();await h.modes[0].click();await h.flush();
  assert.equal(h.get('questionText').textContent,'q-two');
});

test('removing a bookmark from the pinned view immediately removes that question',async()=>{
  const h=await harness({pinned:true,pins:{'q-one':true}});assert.equal(h.get('questionCount').textContent,'Câu 1/1');
  await h.get('bookmarkBtn').click();await h.flush();assert.equal(h.get('questionCount').textContent,'Câu 0/0');
});

test('a hung question request releases controls and offers a manual retry after its deadline',async()=>{
  const h=await harness({index:1},{stallDetail:true});assert.equal(h.get('shuffleBtn').disabled,true);
  [...h.timers.values()].find(t=>t.delay===20000).fn();await h.flush();
  assert.equal(h.get('shuffleBtn').disabled,false);assert.match(h.get('feedbackBox').children[0].textContent,/Không kết nối/);
  assert.equal(h.get('feedbackBox').children[1].textContent,'Thử lại');assert.equal(h.get('feedbackBox').children[1].disabled,false);
});
