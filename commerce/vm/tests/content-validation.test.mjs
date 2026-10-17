import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse } from '../content-validation.mjs';
import { bank,python } from '../course.mjs';
const sample=()=>({bank:{chapters:[{id:'c1',label:'Chương 1'}],topics:[{id:'t1',chapter:'c1',label:'Bài học'}],questions:[{id:'q1',topic:'t1',prompt:'Một câu đầy đủ?',choices:['A','B'],answer:0,explanation:'Vì A đúng.',kind:'theory',difficulty:1}]},python:{exercises:[{id:'py-one',title:'Bài 1',library:'Python',level:'Cơ bản',description:'Cộng hai số.',task:'Đọc hai số, in tổng.',hint:'Đọc bằng input().',tests:[{label:'Ca 1',input:'1 2\n',output:'3\n'}]}]}});
test('public or private course content passes the startup validator',()=>{
  assert.doesNotThrow(()=>validateCourse(bank,python));
  const s=sample();assert.doesNotThrow(()=>validateCourse(s.bank,s.python));
});
test('startup fails closed on duplicate IDs, missing context and invalid answer keys',()=>{
  const edits=[s=>s.bank.questions.push(structuredClone(s.bank.questions[0])),s=>s.python.exercises.push(structuredClone(s.python.exercises[0])),s=>s.bank.questions[0].topic='unknown',s=>s.bank.questions[0].answer=2,s=>s.bank.questions[0].answer=[0,0],s=>s.bank.questions[0].choices=['A','A'],s=>s.bank.questions[0].responseType='html',s=>s.python.exercises[0].task='',s=>s.python.exercises[0].browserRunnable='false',s=>s.python.exercises[0].tests=[]];
  for(const edit of edits){const s=sample();edit(s);assert.throws(()=>validateCourse(s.bank,s.python),/Invalid course content/);}
});
test('invalid virtual filenames and oversized runner data are rejected before serving',()=>{
  for(const name of ['../x','/etc/passwd','a/../../x','a\\b','a//b','C:/x','bad\0.txt']){
    const s=sample();s.python.exercises[0].tests[0].files={[name]:'data'};
    assert.throws(()=>validateCourse(s.bank,s.python),/filename\/content/);
  }
  const s=sample();s.python.exercises[0].tests[0].files={'examples/input.txt':'safe'};assert.doesNotThrow(()=>validateCourse(s.bank,s.python));
  s.python.exercises[0].tests[0].output='x'.repeat(200001);assert.throws(()=>validateCourse(s.bank,s.python),/test data/);
});
