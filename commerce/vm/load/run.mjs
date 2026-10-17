// Native-Node staging harness. No production login bypass, SMTP calls or payments.
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { stagingOrigin } from '../config.mjs';
const file=new URL('./fixtures.json',import.meta.url),fixture=JSON.parse(await readFile(file,'utf8'));
const vus=Number(process.env.VUS||20),seconds=Number(process.env.DURATION_SECONDS||120),spike=process.env.SPIKE==='true';
if(process.env.ALLOW_LOAD_TEST!=='true'||process.env.APP_ORIGIN!==fixture.origin)throw Error('Explicit ALLOW_LOAD_TEST=true and matching APP_ORIGIN required');
if(!stagingOrigin(fixture.origin))throw Error('Only staging/localhost targets allowed');
if(!Number.isInteger(vus)||vus<1||vus>1000||vus>fixture.users.length||seconds<30||seconds>3600)throw Error('VUS 1–1000 and duration 30–3600 required');
if(Date.now()-Date.parse(fixture.createdAt)>110*60000)throw Error('Synthetic fixture is too old');
const metrics={requests:0,failed:0,status:{},latency:[]},until=performance.now()+seconds*1000;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(user,path,data,validate=()=>true){
  const start=performance.now();let response;
  try{
    response=await fetch(fixture.origin+path,{headers:{Cookie:user.cookie,Origin:fixture.origin,'Content-Type':'application/json'},...(data===undefined?{}:{method:'POST',body:JSON.stringify(data)}),signal:AbortSignal.timeout(10000)});
    const body=await response.json();metrics.requests++;metrics.status[response.status]=(metrics.status[response.status]||0)+1;const ok=response.ok&&validate(body);if(!ok)metrics.failed++;return ok?body:null;
  }catch{metrics.requests++;metrics.failed++;return null;}
  finally{metrics.latency.push(performance.now()-start);}
}
await Promise.all(fixture.users.slice(0,vus).map(async(user,i)=>{
  if(!spike)await sleep((i/vus)*Math.min(30000,seconds*250));
  if(!await request(user,'/api/study/claim',{},v=>typeof v.generation==='string'))return;
  await request(user,'/api/course/catalog',undefined,v=>v.total>0&&Array.isArray(v.chapters));
  let batch=await request(user,'/api/course/questions?chapter=chuong-1&offset='+(i%10)*20,undefined,v=>v.questions?.length>0&&v.questions.every(q=>!('answer'in q))),cursor=0,nextHeartbeat=performance.now()+45000+Math.random()*15000;
  while(performance.now()<until){
    await sleep(10000+Math.random()*30000);
    if(performance.now()>=until)break;
    if(performance.now()>nextHeartbeat){await request(user,'/api/study/heartbeat',{},v=>typeof v.generation==='string');nextHeartbeat=performance.now()+60000;}
    const q=batch?.questions?.[cursor++%batch.questions.length];if(q)await request(user,'/api/course/grade',{id:q.id,answer:q.responseType==='number'?'1':q.multiple?[0,1]:0},v=>v.id===q.id&&typeof v.correct==='boolean');
  }
  // Submission spike measures frozen exam creation/grade rather than real financial actions.
  const exam=await request(user,'/api/course/exams',{chapter:'chuong-1',count:40},v=>typeof v.id==='string'&&v.count===40);if(exam)await request(user,'/api/course/exams/'+exam.id+'/submit',{answers:{}},v=>v.submitted===true&&v.total===40&&v.results?.length===40);
}));
metrics.latency.sort((a,b)=>a-b);const percentile=p=>metrics.latency[Math.max(0,Math.ceil(metrics.latency.length*p)-1)]||0;
const result={vus,seconds,spike,requests:metrics.requests,unexpectedFailureRate:metrics.failed/Math.max(1,metrics.requests),p50Ms:Math.round(percentile(.5)),p95Ms:Math.round(percentile(.95)),p99Ms:Math.round(percentile(.99)),statuses:metrics.status,scope:'HTTP synthetic sessions; not SMTP delivery, browser rendering or production proof'};
console.log(JSON.stringify(result,null,2));if(result.unexpectedFailureRate>=.01||result.p95Ms>=1000)process.exitCode=1;
