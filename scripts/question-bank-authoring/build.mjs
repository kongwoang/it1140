import { readFile, writeFile } from 'node:fs/promises';
import { additions, executionCases, calculationCases, targets } from './core.mjs';
import { reviseExisting } from './revise-existing.mjs';
import { reviseDistractors } from './revise-distractors.mjs';
import './chapter1.mjs';
import './chapter2-3.mjs';
import './chapter4.mjs';
import './chapter5.mjs';
import './chapter6.mjs';
import './chapter7.mjs';
import './chapter8.mjs';
import './chapter9.mjs';
import './chapter10.mjs';
import './chapter11-12.mjs';
import './multiple-answers.mjs';

const bankPath = 'data/subjects/it1140.json';
const fixturePath = 'scripts/fixtures/python-quiz-cases.json';
const bank = JSON.parse(await readFile(bankPath, 'utf8'));
const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'));
// This is a one-time editorial migration. Refuse to regenerate over later human
// edits; future maintenance edits the published JSON and fixtures directly.
if (bank.questions.length !== 1140 || fixtures.length !== 243) throw Error('Expected the reviewed 1,140-question baseline; migration already applied or baseline changed.');
const oldIds = bank.questions.map(q => q.id);
const editor = reviseExisting(bank, fixtures);
reviseDistractors(editor);
let seed = 11402026;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2**32; }
function shuffled(xs) { const a=[...xs]; for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
for(let chapter=1;chapter<=12;chapter++) {
  const old=bank.questions.filter(q=>q.source===`chuong-${chapter}-bai-giang`);
  const fresh=additions.filter(q=>q.source===`chuong-${chapter}-bai-giang`);
  const counts=[0,1,2,3].map(i=>old.filter(q=>q.responseType==='choice'&&!Array.isArray(q.answer)&&q.answer===i).length);
  // Shuffle the new editorial rows within a chapter; do not put all variants or
  // all multiple-answer questions next to each other. Existing IDs stay stable.
  for(const [i,q]of shuffled(fresh).entries()) {
    q.id=`it1140-${q.topic}-${String(old.length+i+1).padStart(3,'0')}`;
    if(q.responseType==='choice') {
      const correct=Array.isArray(q.answer)?q.answer:[q.answer];
      let order;
      if(correct.length===1) {
        const min=Math.min(...counts), candidates=counts.flatMap((n,i)=>n===min?[i]:[]);
        const position=candidates[Math.floor(random()*candidates.length)]; counts[position]++;
        order=shuffled([1,2,3]); order.splice(position,0,0);
      } else order=shuffled([0,1,2,3]);
      q.choices=order.map(index=>q.choices[index]);
      const indices=order.flatMap((old,index)=>correct.includes(old)?[index]:[]);
      q.answer=correct.length===1?indices[0]:indices;
    }
    bank.questions.push(q);
  }
  if(old.length+fresh.length!==targets[chapter-1])throw Error(`Chapter ${chapter}: ${old.length+fresh.length} != ${targets[chapter-1]}`);
}
// Publish chapter order, retain sequential suffixes and all historical IDs.
bank.questions.sort((a,b)=>Number(a.id.match(/^it1140-c(\d+)-/)[1])-Number(b.id.match(/^it1140-c(\d+)-/)[1]) || Number(a.id.slice(-3))-Number(b.id.slice(-3)));
for(const id of oldIds)if(!bank.questions.some(q=>q.id===id))throw Error(`Lost old ID ${id}`);
if(new Set(bank.questions.map(q=>q.prompt)).size!==bank.questions.length)throw Error('Duplicate question prompt');
for(const {question,code,expected,numeric}of executionCases)fixtures.push({id:question.id,code,expected,...(numeric?{numeric:true}:{})});
const mathCases=calculationCases.map(({question,expression})=>({id:question.id,expression}));
await writeFile(bankPath,JSON.stringify(bank,null,2)+'\n');
await writeFile(fixturePath,JSON.stringify(fixtures,null,2)+'\n');
await writeFile('scripts/fixtures/question-bank-calculations.json',JSON.stringify(mathCases,null,2)+'\n');
console.log(JSON.stringify({total:bank.questions.length,added:additions.length,edited:editor.changes,pythonFixtures:fixtures.length,independentCalculations:mathCases.length,chapters:targets},null,2));
