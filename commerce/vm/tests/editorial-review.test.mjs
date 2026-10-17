import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareReview,fingerprint,applyReview} from '../../../scripts/review-question-bank.mjs';
import {mkdtemp,writeFile,readFile,stat,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const original={id:'q-one',topic:'topic-one',source:'lecture',kind:'theory',difficulty:2,responseType:'choice',prompt:'Original question?',choices:['one','two','three','four'],answer:1,explanation:'The second option.',tags:['topic']};
const bank=()=>({questions:[structuredClone(original)]});
function plan(fields={prompt:'Revised question?',difficulty:1}){return [{id:original.id,reason:'Clearer stem and level',beforeSHA:fingerprint(original),afterSHA:fingerprint({...original,...fields}),fields}];}
test('an explicit editorial batch preserves IDs, answer positions, topic and unrelated fields',()=>{
  const before=bank(),result=prepareReview(before,plan());
  assert.equal(before.questions[0].prompt,'Original question?');assert.equal(result.changes.length,1);
  assert.deepEqual(result.bank.questions[0],{...original,prompt:'Revised question?',difficulty:1});
  assert.equal(result.changes[0].before.prompt,original.prompt);
  assert.equal(prepareReview(result.bank,plan()).changes.length,0,'reapplying is a no-op');
});
test('editorial review refuses stale plans, changed answer keys, duplicate IDs and malformed edits',()=>{
  const stale=bank();stale.questions[0].explanation='Another editor changed this';assert.throws(()=>prepareReview(stale,plan()),/changed since review/);
  for(const fields of [{answer:0},{topic:'other'},{id:'q-other'},{choices:['one','one','two','three']},{choices:['one']},{prompt:''},{difficulty:4}])assert.throws(()=>prepareReview(bank(),plan(fields)));
  assert.throws(()=>prepareReview(bank(),[...plan(),...plan()]),/duplicate review ID/);
  const corrupt=plan();corrupt[0].afterSHA='wrong';assert.throws(()=>prepareReview(bank(),corrupt),/checksum mismatch/);
});
async function fixture(t){
  const dir=await mkdtemp(join(tmpdir(),'it1140-editorial-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const paths={bankPath:join(dir,'bank.json'),pythonPath:join(dir,'python.json'),planPath:join(dir,'plan.json'),auditPath:join(dir,'audit.json')};
  const course={...bank(),chapters:[{id:'chapter-one',label:'Chapter one'}],topics:[{id:'topic-one',chapter:'chapter-one',label:'Topic one'}]};
  const python={exercises:[{id:'py-one',title:'Addition',library:'Python',level:'Basic',description:'Add two integers.',task:'Read two integers and print their sum.',hint:'Use input().',tests:[{label:'Example',input:'1 2\n',output:'3\n'}]}]};
  await Promise.all([[paths.bankPath,course],[paths.pythonPath,python],[paths.planPath,plan()]].map(([path,value])=>writeFile(path,JSON.stringify(value)+'\n')));
  return {dir,paths,course};
}
test('file review records both versions privately, applies once and leaves no staging files',async t=>{
  const {dir,paths,course}=await fixture(t),result=await applyReview(paths);
  assert.equal(result.changed,1);
  const audit=JSON.parse(await readFile(paths.auditPath,'utf8')),updated=JSON.parse(await readFile(paths.bankPath,'utf8'));
  assert.deepEqual(audit.changes[0].before,course.questions[0]);
  assert.deepEqual(audit.changes[0].after,updated.questions[0]);
  assert.equal(audit.bankBeforeSHA,result.before);assert.equal(audit.bankAfterSHA,result.after);
  assert.equal((await stat(paths.auditPath)).mode&0o777,0o600);
  assert.equal((await stat(paths.bankPath)).mode&0o777,0o600);
  const immutable=await readFile(paths.auditPath,'utf8');
  assert.deepEqual(await applyReview(paths),{changed:0});
  assert.equal(await readFile(paths.auditPath,'utf8'),immutable);
  assert.equal((await readdir(dir)).some(name=>name.endsWith('.tmp')),false);
});
test('file review refuses an existing audit or stale content without overwriting either',async t=>{
  const {paths,course}=await fixture(t),before=await readFile(paths.bankPath,'utf8');
  await writeFile(paths.auditPath,'existing audit\n');
  await assert.rejects(applyReview(paths),{code:'EEXIST'});
  assert.equal(await readFile(paths.bankPath,'utf8'),before);
  assert.equal(await readFile(paths.auditPath,'utf8'),'existing audit\n');
  course.questions[0].explanation='A newer editorial change';
  await writeFile(paths.bankPath,JSON.stringify(course));
  await assert.rejects(applyReview({...paths,auditPath:paths.auditPath+'.new'}),/changed since review/);
  assert.equal(await readFile(paths.bankPath,'utf8'),JSON.stringify(course));
  await assert.rejects(readFile(paths.auditPath+'.new'),{code:'ENOENT'});
});
