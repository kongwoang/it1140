(async()=>{
  const $=id=>document.getElementById(id),cache=new Map(),reviewResults={};
  let catalogue,state,key,ids=[],index=0,busy=false,revision=0,scopeRevision=0,searchTimer,lastError='',retryAction=null;
  async function api(path,data){path=path.replace(/^\/api\/course(?=\/)/,window.IT1140Study.apiBase);const response=await fetch(path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result=await response.json();if(!response.ok)throw Error(({study_conflict:'Phiên học đã chuyển sang nơi khác.',exam_expired:'Bài thi đã hết hạn. Chọn Trộn để tạo bài mới.',exam_version_changed:'Bộ đề đã cập nhật. Chọn Trộn để tạo bài thi mới.',rate_limited:'Bạn thao tác quá nhanh. Hãy thử lại sau.'})[result.error]||'Không thể tải dữ liệu. Kiểm tra mạng và thử lại.');return result;}
  function save(){try{localStorage.setItem(key,JSON.stringify(state));$('quizStorageWarning').hidden=true;}catch{$('quizStorageWarning').hidden=false;}}
  const hasAnswer=value=>Array.isArray(value)?value.length>0:typeof value==='number'?Number.isInteger(value)&&value>=0:typeof value==='string'&&value.trim()!=='';
  const answers=()=>state.mode==='exam'?state.exam?.answers||{}:state.answers;
  const results=()=>state.mode==='exam'?state.exam?.results||{}:state.mode==='review'?reviewResults:state.results;
  function feedback(message,retry=null){lastError=message;retryAction=retry;$('feedbackBox').hidden=false;$('feedbackBox').replaceChildren();const p=document.createElement('p');p.textContent=message;$('feedbackBox').append(p);if(retry){const b=document.createElement('button');b.type='button';b.className='secondary-btn';b.textContent='Thử lại';b.disabled=busy;b.addEventListener('click',retry);$('feedbackBox').append(b);}}
  function remember(batch){for(const q of batch)cache.set(q.id,q);while(cache.size>100)cache.delete(cache.keys().next().value);}
  async function loadIndex(next){
    lastError='';retryAction=null;const generation=++revision;index=Math.max(0,Math.min(next,ids.length-1));state.index=index;save();
    const qid=ids[index];if(qid&&!cache.has(qid)){
      busy=true;render();
      try{const start=Math.floor(index/20)*20;
        const response=state.mode==='exam'?await api('/api/course/exams/'+state.exam.id+'?offset='+start):await api('/api/course/questions?ids='+encodeURIComponent(ids.slice(start,start+20).join(',')));
        if(generation!==revision)return;remember(response.questions||[]);
        if(state.mode==='exam'&&response.submitted)state.exam.results=Object.fromEntries(response.results.map(r=>[r.id,r]));
      }catch(e){if(generation===revision)feedback(e.message,()=>loadIndex(index));return;}finally{if(generation===revision){busy=false;render();}}
    }
    if(generation!==revision)return;
    render();
    if(state.mode==='review'&&qid&&!reviewResults[qid]){
      try{const r=await api('/api/course/grade',{id:qid,review:true});if(generation!==revision)return;reviewResults[qid]={...r,review:true};render();}catch(e){if(generation===revision)feedback(e.message,()=>loadIndex(index));}
    }
  }
  async function loadScope({shuffle=false,newExam=false,resume=false}={}){
    const replaceExam=state.mode==='exam'&&(newExam||!state.exam||state.exam.chapter!==state.chapter);
    if(replaceExam&&state.exam&&!state.exam.results&&Object.keys(state.exam.answers||{}).length&&!confirm('Tạo bài thi mới và bỏ câu trả lời của bài đang làm?')){state.chapter=state.exam.chapter;$('chapterFilter').value=state.chapter;render();return;}
    const generation=++scopeRevision;revision++;const wantedIndex=resume?state.index||0:0;
    lastError='';retryAction=null;busy=true;cache.clear();render();
    try{
      if(state.mode==='exam'){
        if(replaceExam){
          const exam=await api('/api/course/exams',{chapter:state.chapter,count:40});if(generation!==scopeRevision)return;state.exam={id:exam.id,chapter:state.chapter,answers:{}};
        }
        const data=await api('/api/course/exams/'+state.exam.id);if(generation!==scopeRevision)return;ids=data.ids||[];remember(data.questions||[]);
        if(data.submitted)state.exam.results=Object.fromEntries(data.results.map(r=>[r.id,r]));
      }else{
        const data=await api('/api/course/questions?chapter='+encodeURIComponent(state.chapter)+'&q='+encodeURIComponent(state.query||'')+(shuffle?'&shuffle=true':''));
        if(generation!==scopeRevision)return;
        ids=data.ids||[];if(state.pinned)ids=ids.filter(id=>state.pins[id]);remember(data.questions||[]);
      }
      save();busy=false;await loadIndex(wantedIndex);
    }catch(e){if(generation===scopeRevision)feedback(e.message,()=>loadScope());}finally{if(generation===scopeRevision){busy=false;render();}}
  }
  function render(){
    if(!state)return;
    const q=cache.get(ids[index]),a=answers(),r=results()[q?.id];
    $('questionCount').textContent=ids.length?`Câu ${index+1}/${ids.length}`:'Câu 0/0';$('filteredCount').textContent=String(ids.length);
    $('subjectCode').textContent='IT1140';$('subjectTitle').textContent='Tin học đại cương';
    document.querySelectorAll('.mode-btn').forEach(b=>{b.classList.toggle('is-active',b.dataset.mode===state.mode);b.disabled=busy;});
    $('chapterFilter').disabled=busy;$('searchInput').disabled=busy||state.mode==='exam';$('bookmarkOnly').disabled=busy||state.mode==='exam';
    $('shuffleBtn').disabled=busy;$('resetBtn').disabled=busy;
    $('bookmarkBtn').textContent=state.pins[q?.id]?'★':'☆';$('bookmarkBtn').disabled=!q||busy;
    $('tagRow').replaceChildren();
    if(q){for(const label of [catalogue.chapters.find(c=>c.id===q.chapter)?.label,q.multiple?'Chọn nhiều đáp án':q.responseType==='number'?'Điền số':null].filter(Boolean)){const span=document.createElement('span');span.className='tag';span.textContent=label;$('tagRow').append(span);}}
    IT1140Text.render($('questionText'),busy?'Đang tải câu hỏi…':q?.prompt||'Chưa có câu hỏi phù hợp.',{heading:true});
    $('choiceList').replaceChildren();$('feedbackBox').hidden=true;
    if(q&&!busy){
      const disabled=Boolean(r)||Boolean(state.mode==='exam'&&state.exam.results);
      if(q.responseType==='number'){
        const label=document.createElement('label'),input=document.createElement('input');label.className='numeric-answer';input.type='text';input.inputMode='decimal';input.setAttribute('aria-label','Câu trả lời bằng số');input.value=a[q.id]??'';input.disabled=disabled;
        input.addEventListener('input',()=>{a[q.id]=input.value;save();renderProgress();});label.append(input);$('choiceList').append(label);
      }else q.choices.forEach((choice,i)=>{
        const label=document.createElement('label'),input=document.createElement('input'),letter=document.createElement('span'),text=document.createElement('span');
        label.className='choice';input.className='choice-control';input.type=q.multiple?'checkbox':'radio';input.name=q.id;input.disabled=disabled;input.checked=Array.isArray(a[q.id])?a[q.id].includes(i):a[q.id]===i;
        const correct=Array.isArray(r?.answer)?r.answer:[r?.answer];if(r&&correct.includes(i))label.classList.add('is-correct');
        if(r&&input.checked&&!correct.includes(i))label.classList.add('is-wrong');letter.className='choice-letter';letter.textContent=String.fromCharCode(65+i);text.className='choice-text';IT1140Text.render(text,choice,{code:q.kind==='code'});
        input.addEventListener('change',()=>{if(q.multiple){const set=new Set(a[q.id]||[]);input.checked?set.add(i):set.delete(i);a[q.id]=[...set];}else a[q.id]=i;save();renderProgress();});label.append(input,letter,text);$('choiceList').append(label);
      });
      if(r){$('feedbackBox').hidden=false;$('feedbackBox').replaceChildren();const title=document.createElement('strong'),detail=document.createElement('div');
        const answer=q.responseType==='number'?r.answer:(Array.isArray(r.answer)?r.answer:[r.answer]).map(i=>String.fromCharCode(65+i)).join(', ');
        title.textContent=`${r.review?'Đáp án':r.correct?'Đúng':'Sai'}: ${answer}`;IT1140Text.render(detail,r.explanation);$('feedbackBox').append(title,detail);}
    }
    $('prevBtn').disabled=busy||index<=0;$('nextBtn').disabled=busy||index>=ids.length-1;
    $('submitBtn').textContent=state.mode==='exam'?(state.exam?.results?'Đã nộp':'Nộp bài'):state.mode==='review'?'Đáp án':r?'Đã kiểm tra':'Kiểm tra';
    $('submitBtn').disabled=busy||!q||(state.mode==='exam'?Boolean(state.exam?.results):state.mode==='review'||Boolean(r));
    renderProgress();
    $('questionMap').replaceChildren();const start=Math.floor(index/100)*100;
    for(let i=start;i<Math.min(start+100,ids.length);i++){const b=document.createElement('button');b.type='button';b.className='map-btn';b.textContent=String(i+1);b.disabled=busy;b.classList.toggle('is-current',i===index);b.classList.toggle('is-answered',a[ids[i]]!==undefined);if(results()[ids[i]]&&!results()[ids[i]].review)b.classList.add(results()[ids[i]].correct?'is-correct':'is-wrong');b.addEventListener('click',()=>loadIndex(i));$('questionMap').append(b);}
    if(ids.length>100){const select=document.createElement('select');select.setAttribute('aria-label','Nhóm câu hỏi');for(let n=0;n<ids.length;n+=100)select.append(new Option(`${n+1}–${Math.min(n+100,ids.length)}`,String(n),false,n===start));select.addEventListener('change',()=>loadIndex(Number(select.value)));$('questionMap').prepend(select);}
    if(lastError)feedback(lastError,retryAction);save();
  }
  function renderProgress(){
    const unsubmitted=state.mode==='exam'&&!state.exam?.results;
    const scored=ids.filter(id=>results()[id]&&!results()[id].review),correct=scored.filter(id=>results()[id].correct).length;
    const count=unsubmitted?ids.filter(id=>hasAnswer(answers()[id])).length:scored.length;
    $('progressText').textContent=`${count}/${ids.length}`;$('progressBar').style.width=(ids.length?100*count/ids.length:0)+'%';$('correctText').textContent=String(correct);$('wrongText').textContent=String(scored.length-correct);$('accuracyText').textContent=(scored.length?Math.round(100*correct/scored.length):0)+'%';
    document.querySelector('.score-grid').hidden=unsubmitted;
  }
  function tabs(){
    function activate(view){state.view=view;document.querySelectorAll('[data-section-view]').forEach(v=>v.hidden=v.id!==view);document.querySelectorAll('.section-tab').forEach(t=>{t.classList.toggle('is-active',t.dataset.view===view);t.setAttribute('aria-selected',String(t.dataset.view===view));});document.querySelector('.top-actions').hidden=view!=='quizView';save();if(view==='pythonLabView')window.dispatchEvent(new CustomEvent('python-lab:visible'));}
    document.querySelectorAll('.section-tab').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.view)));activate(state.view==='pythonLabView'?'pythonLabView':'quizView');
  }
  try{
    await window.IT1140Study.ready;catalogue=await api('/api/course/catalog');key='it1140-commerce-quiz:v3:'+catalogue.userScope;
    const initial={chapter:'chuong-1',query:'',mode:'practice',pinned:false,pins:{},answers:{},results:{},exam:null};
    try{state={...initial,...JSON.parse(localStorage.getItem(key)||'{}')};}catch{state=initial;}
    for(const field of ['pins','answers','results'])if(!state[field]||typeof state[field]!=='object'||Array.isArray(state[field]))state[field]={};
    if(!state.exam||typeof state.exam!=='object'||typeof state.exam.id!=='string'||typeof state.exam.chapter!=='string')state.exam=null;
    if(state.exam&&(!state.exam.answers||typeof state.exam.answers!=='object'||Array.isArray(state.exam.answers)))state.exam.answers={};
    state.query=typeof state.query==='string'?state.query.slice(0,150):'';state.index=Number.isSafeInteger(state.index)&&state.index>=0?state.index:0;
    if(!['practice','exam','review'].includes(state.mode))state.mode='practice';
    if(!catalogue.chapters.some(c=>c.id===state.chapter)&&state.chapter!=='all')state.chapter='chuong-1';
    $('subjectSelect').append(new Option('Tin học đại cương','it1140'));
    if(catalogue.preview)$('previewSummary').textContent=`Học thử · ${catalogue.total}/${catalogue.totalQuestions} câu hỏi · ${catalogue.exercises}/${catalogue.totalExercises} bài Python`;
    $('chapterFilter').append(new Option('Tất cả chương','all'));catalogue.chapters.forEach(c=>$('chapterFilter').append(new Option(c.label+' ('+c.count+(catalogue.preview?'/'+c.fullCount+' miễn phí':'')+')',c.id)));$('chapterFilter').value=state.chapter;$('searchInput').value=state.query;$('bookmarkOnly').checked=state.pinned;
    $('chapterFilter').addEventListener('change',()=>{state.chapter=$('chapterFilter').value;loadScope();});
    $('searchInput').addEventListener('input',()=>{state.query=$('searchInput').value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadScope(),400);});
    $('bookmarkOnly').addEventListener('change',()=>{state.pinned=$('bookmarkOnly').checked;loadScope();});
    document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;loadScope();}));
    $('shuffleBtn').addEventListener('click',()=>loadScope({shuffle:true,newExam:state.mode==='exam'}));
    $('resetBtn').addEventListener('click',()=>{if(confirm('Xóa câu trả lời và tiến độ cục bộ của phần luyện tập?')){state.answers={};state.results={};save();render();}});
    $('bookmarkBtn').addEventListener('click',()=>{const id=ids[index];state.pins[id]=!state.pins[id];render();});
    $('prevBtn').addEventListener('click',()=>loadIndex(index-1));$('nextBtn').addEventListener('click',()=>loadIndex(index+1));
    $('submitBtn').addEventListener('click',async()=>{
      if(busy)return;lastError='';retryAction=null;busy=true;render();try{
        if(state.mode==='exam'){
          const missing=ids.filter(id=>!hasAnswer(state.exam.answers[id])).length;
          if(!confirm((missing?`Còn ${missing} câu chưa trả lời. `:'')+'Nộp toàn bộ bài thi? Sau khi nộp không thể sửa câu trả lời.'))return;
          const r=await api('/api/course/exams/'+state.exam.id+'/submit',{answers:state.exam.answers});state.exam.results=Object.fromEntries(r.results.map(v=>[v.id,v]));
        }else{const q=cache.get(ids[index]);if(!hasAnswer(answers()[q.id]))throw Error('Hãy chọn đáp án hoặc nhập số trước khi kiểm tra.');state.results[q.id]=await api('/api/course/grade',{id:q.id,answer:answers()[q.id]});}
      }catch(e){feedback(e.message);}finally{busy=false;save();render();}
    });tabs();await loadScope({resume:true});
  }catch(e){$('questionText').textContent=e.message;}
})();
