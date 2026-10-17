import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile,mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';

const root = new URL('../../../', import.meta.url);
const editorSource = await readFile(new URL('assets/js/python-editor.js', root), 'utf8');
const errorSource = await readFile(new URL('assets/js/python-errors.js', root), 'utf8');
const context = {}; runInNewContext(editorSource + '\n' + errorSource, context);
const E = context.IT1140PythonEditor, D = context.IT1140PythonErrors;

test('corrupt local draft metadata is ignored without losing valid code or inputs',()=>{
  const state=E.normalizeState({code:{'py-one':'print(1)','py-bad':null},input:{'py-one':'5\n'},testCase:null,completed:{'py-one':true,'py-bad':'yes'},currentId:12});
  assert.equal(state.code['py-one'],'print(1)');assert.equal(state.input['py-one'],'5\n');
  assert.equal(state.code['py-bad'],undefined);assert.equal(state.currentId,'');assert.equal(Object.keys(state.testCase).length,0);
  assert.equal(state.completed['py-one'],true);assert.equal(state.completed['py-bad'],undefined);
  assert.equal(Object.keys(E.normalizeState([]).code).length,0);
});

test('IDE Tab preserves selected lines and indents/outdents exactly four spaces', () => {
  const source = 'a = 1\nprint(a)\nx = 2';
  const edited = E.indent(source, 0, 15);
  assert.equal(edited.value, '    a = 1\n    print(a)\nx = 2');
  assert.equal(E.indent(edited.value, edited.start, edited.end, true).value, source);
  assert.equal(E.indent('ab', 2, 2).value, 'ab  ');
  assert.equal(E.indent('    x\n  y', 0, 9, true).value, 'x\ny');
  const partial=E.indent('  abc\n    def',4,9,true);
  assert.equal(partial.value,'abc\ndef');assert.equal(partial.start,2);assert.equal(partial.end,4);
});

test('IDE autoindent, paired delimiters, comments and smart backspace', () => {
  assert.equal(E.enter('if n:', 5, 5).value, 'if n:\n    ');
  assert.equal(E.enter('items = []', 9, 9).value, 'items = [\n    \n]');
  assert.equal(E.enter('# note:', 7, 7).value, '# note:\n');
  assert.equal(E.pair('abc', 0, 3, '(').value, '(abc)');
  assert.equal(E.pair('()', 1, 1, ')').start, 2);
  assert.equal(E.pair('# note', 6, 6, '('), null);
  assert.equal(E.pair('"text', 5, 5, '('), null);
  assert.equal(E.backspace('    x', 4, 4).value, 'x');
  assert.equal(E.backspace('()', 1, 1).value, '');
  assert.equal(E.comment('a\nb', 0, 3).value, '# a\n# b');
  assert.equal(E.comment('# a\n# b', 0, 7).value, 'a\nb');
});

test('lightweight warnings ignore strings and comments; missing delimiters retain positions', () => {
  assert.equal(E.analyse('print("[") # (').issues.length, 0);
  assert.equal(E.analyse("s = '''[\n('''\nprint(s)").issues.length, 0);
  assert.equal(E.analyse('x = [1,\n 2').issues[0].line, 1);
  assert.match(E.analyse('print("a)').issues[0].message, /nháy/);
  assert.match(E.analyse('if True:\n\tprint(1)').issues[0].message, /Tab/);
  assert.match(D.explain({type:'SyntaxError', message:"expected ':'",line:2}).help, /dấu :/);
  assert.equal(D.outputDifference('a\r\n2  \n','a\n2\n'), null);
  assert.equal(D.outputDifference('a\n3','a\n2').line, 2);
  assert.match(D.explain({type:'IndentationError',message:'unexpected indent'}).help,/Shift\+Tab/);
  assert.match(D.explain({type:'ValueError',message:'too many values to unpack'}).title,/Số giá trị/);
  assert.match(D.explain({type:'TypeError',message:"'int' object is not iterable"}).help,/range\(n\)/);
});

test('editor does not flag the existing Python fixture corpus and whole-block indentation is reversible',async()=>{
  const fixtures=JSON.parse(await readFile(new URL('scripts/fixtures/python-quiz-cases.json',root),'utf8'));
  for(const fixture of fixtures)assert.equal(E.analyse(fixture.code).issues.length,0,fixture.id);
  for(let seed=0;seed<200;seed++){
    const value=Array.from({length:seed%7+1},(_,i)=>' '.repeat((seed+i)%9)+`x${i} = ${seed}`).join('\n')+(seed%2?'\n':'');
    const indented=E.indent(value,0,value.length),restored=E.indent(indented.value,indented.start,indented.end,true);
    assert.equal(restored.value,value,'seed '+seed);
    assert.ok(restored.start>=0&&restored.end<=restored.value.length&&restored.start<=restored.end);
  }
});

test('case grading distinguishes stdout, missing/unreadable files, runtime errors and ad-hoc runs', () => {
  const result={output:'ok\n',error:'',checkError:'',fileResults:{}};
  assert.equal(D.compareCase(result,{output:'ok'}).passed,true);
  const mismatch=D.compareCase(result,{output:'other',input:'5\n'});
  assert.equal(mismatch.passed,false);assert.equal(mismatch.difference.expected,'other');assert.equal(mismatch.input,'5\n');
  assert.equal(D.compareCase(result,{output:'',expectedFiles:{'out.txt':''}}).fileDifference.missing,true);
  const unreadable=D.compareCase({...result,output:'',fileResults:{'out.txt':null}},{output:'',expectedFiles:{'out.txt':''}});
  assert.equal(unreadable.passed,false);assert.equal(unreadable.fileDifference.unreadable,true);
  const equalFile=D.compareCase({...result,output:'',fileResults:{'out.txt':'1\r\n'}},{output:'',expectedFiles:{'out.txt':'1\n'}});
  assert.equal(equalFile.passed,true);
  assert.equal(D.compareCase({...result,output:'',fileResults:{'out.txt':'a'}},{output:'',expectedFiles:{'out.txt':'a\n'}}).passed,false);
  assert.equal(D.compareCase({...result,output:'',fileResults:{'out.txt':'a \n'}},{output:'',expectedFiles:{'out.txt':'a\n'}}).passed,false);
  assert.equal(D.compareCase(result,{output:'',expectedFiles:{'out.txt':'x'}},'single').passed,true);
  const runtime=D.compareCase({...result,error:'traceback',diagnostic:{type:'NameError'}},{output:'different'});
  assert.equal(runtime.difference,null);assert.doesNotMatch(runtime.error,/traceback/);
  assert.equal(D.compareCase({...result,checkError:'Wrong chart'},{output:'ok'}).passed,false);
});

// Run the actual Python execution template with trusted regression fixtures only.
// This is an offline test process, never an endpoint executing learner programs.
const workerSource = await readFile(new URL('assets/js/python-worker.js', root), 'utf8');
const workerContext = { IT1140PythonErrors:D, loadPyodide:()=>Promise.resolve({}), self:{addEventListener(){}}, captured:null };
runInNewContext(workerSource.replace(/^import .*;\n/gm, '') + '\nglobalThis.executeCaseForTest = executeCase;', workerContext);
async function executeNative(code, input='', fixture={}) {
  const values = new Map();let body;
  const fake = {globals:{set:(k,v)=>values.set(k,v),get:k=>values.get(k)},runPythonAsync:async source=>{body=source;}};
  await workerContext.executeCaseForTest(fake, code, input, fixture.files||{}, fixture.cleanupNames||D.caseFileNames([fixture]), fixture.checks||[]);
  const assignments = [...values].map(([key,value])=>`${key} = json.loads(${JSON.stringify(JSON.stringify(value))})`).join('\n');
  const source = 'import json\n' + (fixture.prelude||'') + '\n' + assignments + '\n' + body + '\nprint(json.dumps({"output":_lab_output,"error":_lab_error,"diagnostic":_lab_diagnostic,"fileResults":_lab_file_results,"checkError":_lab_check_error}, ensure_ascii=False))';
  const dir=await mkdtemp(join(tmpdir(),'it1140-runner-test-'));
  try {
    const result = spawnSync(process.env.TEST_PYTHON || 'python3', ['-c', source], {cwd:dir,encoding:'utf8',timeout:10000,maxBuffer:1000000});
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    return JSON.parse(result.stdout);
  }finally{await rm(dir,{recursive:true,force:true});}
}

test('runner supports input(), sys.stdin and mixed reads of the same input stream', async () => {
  const result = await executeNative('import sys\nprint(input())\nprint(sys.stdin.readline().strip())\nprint(sys.stdin.read().strip())','one\ntwo\nthree\n');
  assert.equal(result.error, '');assert.equal(result.output, 'one\ntwo\nthree\n');
  const windows=await executeNative('import sys\nprint(input())\nprint(sys.stdin.read().replace("\\n", "|"))','one\r\ntwo\rthree\n');
  assert.equal(windows.output,'one\ntwo|three|\n');
  const prompt=await executeNative('print(input("Số: "))','5\n');
  assert.equal(prompt.output,'Số: 5\n');assert.equal(D.compareCase(prompt,{output:'5\n'}).passed,false,'input prompts must not silently disappear');
});

test('program metadata and working directory behave like independent main.py runs',async()=>{
  const result=await executeNative('import os, sys\nprint(__name__, __file__, sys.argv[0])\nos.mkdir("sub")\nos.chdir("sub")\nopen("inside.txt","w").write("ok")','',{expectedFiles:{'sub/inside.txt':'ok'}});
  assert.equal(result.error,'');assert.equal(result.output,'__main__ main.py main.py\n');
  assert.equal(result.fileResults['sub/inside.txt'],'ok','runner restores cwd before checking expected files');
});

test('runtime and syntax errors identify main.py, user line and source instead of runner internals', async () => {
  for (const [code,type,line] of [['n = 0\nprint(4 / n)','ZeroDivisionError',2],['print(unknown)','NameError',1],['if True:\nprint(1)','IndentationError',2],['print(1','SyntaxError',1]]) {
    const result = await executeNative(code);
    assert.equal(result.diagnostic.type, type);assert.equal(result.diagnostic.line, line);
    assert.equal(result.diagnostic.source, code.split('\n')[line-1]);
    assert.match(result.error, /main\.py/);
  }
  for (const code of ['tên = 0; print(1 / tên)', 's = "😀"; print(1 / 0)']) {
    const result = await executeNative(code);
    assert.equal(result.diagnostic.column, Array.from(code.slice(0, code.indexOf('1 /'))).length + 1);
  }
});

test('runner handles sys.exit and caps accidental infinite print output', async () => {
  assert.equal((await executeNative('import sys\nprint("done")\nsys.exit(0)')).error, '');
  assert.equal((await executeNative('import sys\nsys.exit(2)')).diagnostic.type, 'SystemExit');
  const large = await executeNative('for i in range(100000):\n    print("x" * 100)');
  assert.equal(large.diagnostic.type, 'OutputLimitExceeded');assert.ok(large.output.length <= 200000);
});

test('file merge tests verify missing sources, final newlines and empty files in the actual runner',async()=>{
  const data=JSON.parse(await readFile(new URL('data/python-exercises.json',root),'utf8'));
  const exercise=data.exercises.find(e=>e.id==='py-pdf-4-7');
  const reference=String.raw`try:
    with open('a.txt',encoding='utf-8') as f: a=f.readlines()
    with open('b.txt',encoding='utf-8') as f: b=f.readlines()
except FileNotFoundError:
    print('THIEU_TEP')
else:
    with open('gop.txt','w',encoding='utf-8') as f:
        for line in a+b: f.write(line if line.endswith('\n') else line+'\n')
    print(len(a)+len(b))`;
  for(const fixture of exercise.tests){const result=await executeNative(reference,fixture.input,fixture);assert.equal(D.compareCase(result,fixture).passed,true,fixture.label);}
  const missing=exercise.tests.find(t=>t.checks?.length);
  const stale={...missing,cleanupNames:D.caseFileNames(exercise.tests),prelude:"open('b.txt','w').write('old data')\nopen('gop.txt','w').write('old result')"};
  const rerun=await executeNative(reference,'',stale);assert.equal(D.compareCase(rerun,missing).passed,true,'single-case cleanup removes files from earlier samples');
  const bad=await executeNative("open('gop.txt','w').close()\nprint('THIEU_TEP')",'',missing);
  assert.equal(D.compareCase(bad,missing).passed,false);assert.match(bad.checkError,/không được tạo/);
});

test('commercial blob worker includes diagnostic helpers but cannot import app-origin code', async () => {
  const compiled = await readFile(new URL('.vm-dist/public/python-sandbox-frame.js', root), 'utf8');
  assert.match(compiled, /_it1140_diagnostic/);assert.doesNotMatch(compiled, /import \\\"\.\/python-errors/);
  const html = await readFile(new URL('.vm-dist/public/preview.html', root), 'utf8');
  for (const name of ['python-editor','python-errors']) assert.match(html, new RegExp(name + '\\.js\\?v=[a-f0-9]{12}'));
});

test('sandbox rejects oversized programs immediately and accepts the documented editor limit',async()=>{
  const source=await readFile(new URL('commerce/vm/public/python-sandbox-frame.js',root),'utf8');
  const parent={},messages=[],runs=[];let initialize;
  const port={postMessage:value=>messages.push(value)};
  class FakeWorker {postMessage(value){runs.push(value);} terminate(){}}
  class FakeURL extends URL {static createObjectURL(){return 'blob:test';} static revokeObjectURL(){}}
  runInNewContext(source,{parent,document:{URL:'http://localhost:4180/python-sandbox.html'},window:{addEventListener:(_,fn)=>initialize=fn},WORKER_SOURCE:'',URL:FakeURL,Blob,Worker:FakeWorker});
  const event={source:parent,origin:'http://localhost:4180',data:{type:'it1140-python-init'},ports:[port]};
  initialize({...event,origin:'https://evil.test'});assert.equal(messages.length,0);
  initialize(event);assert.equal(messages[0].type,'ready');
  port.onmessage({data:{type:'run',runId:1,code:'x'.repeat(200001),tests:[]}});
  assert.equal(messages.at(-1).type,'fatal');assert.equal(messages.at(-1).runId,1);assert.equal(runs.length,0);
  port.onmessage({data:{type:'run',runId:2,code:'x'.repeat(200000),tests:[]}});
  assert.equal(runs.length,1);assert.equal(runs[0].runId,2);
});

test('legacy offline shell versions match the current editor, helpers and stylesheet',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8'),sw=await readFile(new URL('sw.js',root),'utf8');
  const lab=await readFile(new URL('assets/js/python-lab.js',root),'utf8');
  const context={self:{addEventListener(){},skipWaiting(){}}};runInNewContext(sw+'\nglobalThis.shell=APP_SHELL;',context);
  for(const match of html.matchAll(/(?:src|href)="(\.\/assets\/[^" ]+)"/g))assert.ok(context.shell.includes(match[1]),match[1]+' missing from offline shell');
  const worker=lab.match(/new Worker\("([^"]+)"/)[1];assert.ok(context.shell.includes(worker));
  assert.ok(context.shell.includes('./assets/js/python-errors.js'),'worker dependency must also be cached');
});
