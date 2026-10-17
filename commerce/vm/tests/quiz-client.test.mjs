import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('../public/quiz.js',import.meta.url),'utf8');
class Element {
  constructor(){this.children=[];this.listeners={};this.value='';this.dataset={};this.style={};this.classList={toggle(){},add(){}};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  append(...nodes){this.children.push(...nodes);}
  prepend(node){this.children.unshift(node);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(){}
  async emit(name){await this.listeners[name]?.();}
  async click(){if(!this.disabled)await this.emit('click');}
}
const q=id=>({id,chapter:'c1',prompt:id,choices:['A','B']});
async function harness(saved={},options={}){
  const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new Element());return els.get(id);};
  const modes=['practice','exam','review'].map(mode=>Object.assign(new Element(),{dataset:{mode}}));
  const tabs=['quizView','pythonLabView'].map(view=>Object.assign(new Element(),{dataset:{view}}));
  const views=['quizView','pythonLabView'].map(id=>Object.assign(get(id),{id}));
  const timers=[],pending=[],store=new Map([['it1140-commerce-quiz:v3:test',JSON.stringify({chapter:'c1',...saved})]]);
  let defer=false,fail=options.failDetail;
  const context={window:{IT1140Study:{ready:Promise.resolve(),apiBase:'/api/preview'},dispatchEvent(){}},
    document:{getElementById:get,createElement:()=>new Element(),querySelector:get,querySelectorAll:s=>s==='.mode-btn'?modes:s==='.section-tab'?tabs:s==='[data-section-view]'?views:[]},CustomEvent:class {},
    Option:Element,IT1140Text:{render:(el,text)=>el.textContent=text},
    localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
    setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},confirm:()=>false,
    fetch:async url=>{
      if(url.endsWith('/catalog'))return {ok:true,json:async()=>({userScope:'test',chapters:[{id:'c1',label:'Chapter',count:2}]})};
      if(url.includes('questions?ids=')){
        if(fail){fail=false;throw Error('Network lost');}
        return {ok:true,json:async()=>({questions:[q('q-one'),q('q-two')]})};
      }
      if(defer)return new Promise(resolve=>pending.push(data=>resolve({ok:true,json:async()=>data})));
      return {ok:true,json:async()=>({ids:['q-one','q-two'],questions:[q('q-one')]})};
    }};
  runInNewContext(source,context);const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};await flush();
  return {get,tabs,flush,pending,store,defer:()=>defer=true,search:term=>{get('searchInput').value=term;get('searchInput').emit('input');timers.at(-1)();}};
}

test('quiz restores the saved question and a failed detail request can retry without locked controls',async()=>{
  const h=await harness({index:1},{failDetail:true});
  assert.equal(h.get('questionCount').textContent,'Câu 2/2');assert.equal(h.get('prevBtn').disabled,false);
  assert.equal(h.get('shuffleBtn').disabled,false);assert.match(h.get('feedbackBox').children[0].textContent,/Network lost/);
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
