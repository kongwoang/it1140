import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const bank=JSON.parse(await readFile('data/subjects/it1140.json','utf8'));
const counts=[208,208,248,218,118,158,158,158,158,208,128,128];
assert.equal(bank.questions.length,2096);
assert.equal(new Set(bank.questions.map(q=>q.id)).size,2096);
assert.equal(new Set(bank.questions.map(q=>q.prompt)).size,2096);
assert.equal(bank.questions.filter(q=>Array.isArray(q.answer)).length,96);
for(let n=1;n<=12;n++) {
  const qs=bank.questions.filter(q=>q.source===`chuong-${n}-bai-giang`);
  assert.equal(qs.length,counts[n-1]);
  assert.deepEqual(qs.map(q=>Number(q.id.slice(-3))),Array.from({length:qs.length},(_,i)=>i+1));
  for(const level of [1,2,3])assert.ok(qs.some(q=>q.difficulty===level),`Chapter ${n}: missing difficulty ${level}`);
  assert.equal(qs.filter(q=>Array.isArray(q.answer)).length,8);
  const singles=qs.filter(q=>q.responseType==='choice'&&!Array.isArray(q.answer));
  const keys=[0,1,2,3].map(i=>singles.filter(q=>q.answer===i).length);
  assert.ok(Math.max(...keys)-Math.min(...keys)<=1,`Chapter ${n}: balanced single-answer keys`);
  for(const q of qs)if(Array.isArray(q.answer)) {
    assert.match(q.prompt,/Chọn tất cả đáp án đúng\./);
    assert.ok(q.answer.length===2||q.answer.length===3);
    assert.deepEqual(q.answer,[...new Set(q.answer)].sort((a,b)=>a-b));
  }
}
const fixtures=JSON.parse(await readFile('scripts/fixtures/python-quiz-cases.json','utf8'));
// Chapter 2 also contains two assembly/byte-counting examples, checked by the
// independent assertions in test-quiz.mjs rather than a Python interpreter.
for(const q of bank.questions.filter(q=>q.kind==='code' && q.source!=='chuong-2-bai-giang'))assert.ok(fixtures.some(f=>f.id===q.id),`No executable evidence: ${q.id}`);
const calculations=JSON.parse(await readFile('scripts/fixtures/question-bank-calculations.json','utf8'));
assert.equal(calculations.length,171);
assert.equal(new Set(calculations.map(c=>c.id)).size,calculations.length);
assert.ok(calculations.every(c=>bank.questions.some(q=>q.id===c.id&&q.responseType==='number')));
console.log('OK: 2,096 questions; 96 multiple-answer questions; 12 chapter counts, distinct IDs/prompts, difficulty coverage and execution evidence.');
