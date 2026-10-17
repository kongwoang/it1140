// Validate operator-edited data before serving any paid/free API. Never execute
// checks or reference code here: Python still runs only in the learner sandbox.
export function validateCourse(bank, python) {
  const need=(condition,field)=>{if(!condition)throw Error('Invalid course content: '+field);};
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const text=(v,max=50000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
  function unique(items,label,max){
    need(Array.isArray(items)&&items.length>0&&items.length<=max,label);
    const ids=new Set();
    for(const item of items){need(object(item)&&text(item.id,160)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id),label+' id');need(!ids.has(item.id),label+' duplicate id '+item.id);ids.add(item.id);}
    return ids;
  }
  need(object(bank)&&object(python),'root objects');
  const chapters=unique(bank.chapters,'chapters',100),topics=unique(bank.topics,'topics',1000);
  unique(bank.questions,'questions',100000);unique(python.exercises,'Python exercises',10000);
  for(const c of bank.chapters)need(text(c.label,300),'chapter label');
  for(const t of bank.topics)need(chapters.has(t.chapter)&&text(t.label,300),'topic chapter/label');
  for(const q of bank.questions){
    need(topics.has(q.topic)&&text(q.prompt)&&text(q.explanation),'question '+q.id+' context');
    need(['theory','calculation','code','application'].includes(q.kind)&&Number.isInteger(q.difficulty)&&q.difficulty>=1&&q.difficulty<=3,'question '+q.id+' classification');
    need(Array.isArray(q.choices),'question '+q.id+' choices');
    if(q.responseType==='number')need(q.choices.length===0&&typeof q.answer==='number'&&Number.isFinite(q.answer),'question '+q.id+' number');
    else {
      need(q.responseType===undefined||q.responseType==='choice','question '+q.id+' response type');
      need(q.choices.length>=2&&q.choices.length<=6&&q.choices.every(c=>text(c))&&new Set(q.choices).size===q.choices.length,'question '+q.id+' options');
      const answers=Array.isArray(q.answer)?q.answer:[q.answer];
      need(answers.length>0&&(!Array.isArray(q.answer)||answers.length>=2)&&new Set(answers).size===answers.length&&answers.every(a=>Number.isInteger(a)&&a>=0&&a<q.choices.length),'question '+q.id+' answer');
    }
  }
  const filename=name=>typeof name==='string'&&name.length<=200&&!/[\x00-\x1f\\:]/.test(name)&&name.split('/').every(p=>p&&p!=='.'&&p!=='..');
  function files(value,label){
    if(value===undefined)return;
    need(object(value)&&Object.keys(value).length<=20,label);
    let total=0;
    for(const [name,content]of Object.entries(value)){need(filename(name)&&typeof content==='string',label+' filename/content');total+=content.length;}
    need(total<=1000000,label+' too large');
  }
  for(const e of python.exercises){
    for(const field of ['title','library','level'])need(text(e[field],300),'Python '+e.id+' '+field);
    need(text(e.task)&&text(e.hint)&&text(e.description),'Python '+e.id+' context');
    need(e.browserRunnable===undefined||typeof e.browserRunnable==='boolean','Python '+e.id+' browserRunnable');
    need(Array.isArray(e.tests)&&e.tests.length<=100&&(e.browserRunnable===false?e.tests.length===0:e.tests.length>0),'Python '+e.id+' tests');
    for(const t of e.tests){
      need(object(t)&&text(t.label,300)&&typeof t.input==='string'&&t.input.length<=1000000&&typeof t.output==='string'&&t.output.length<=200000,'Python '+e.id+' test data');
      files(t.files,'Python '+e.id+' input files');files(t.expectedFiles,'Python '+e.id+' output files');
      if(t.checks!==undefined)need(Array.isArray(t.checks)&&t.checks.length<=20&&t.checks.every(c=>text(c,20000)),'Python '+e.id+' checks');
    }
  }
}
