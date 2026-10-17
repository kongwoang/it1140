import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';

const root = new URL('../../../', import.meta.url);
const editorSource = await readFile(new URL('assets/js/python-editor.js', root), 'utf8');
const errorSource = await readFile(new URL('assets/js/python-errors.js', root), 'utf8');
const context = {}; runInNewContext(editorSource + '\n' + errorSource, context);
const E = context.IT1140PythonEditor, D = context.IT1140PythonErrors;

test('IDE Tab preserves selected lines and indents/outdents exactly four spaces', () => {
  const source = 'a = 1\nprint(a)\nx = 2';
  const edited = E.indent(source, 0, 15);
  assert.equal(edited.value, '    a = 1\n    print(a)\nx = 2');
  assert.equal(E.indent(edited.value, edited.start, edited.end, true).value, source);
  assert.equal(E.indent('ab', 2, 2).value, 'ab  ');
  assert.equal(E.indent('    x\n  y', 0, 9, true).value, 'x\ny');
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
async function executeNative(code, input='') {
  const values = new Map();let body;
  const fake = {globals:{set:(k,v)=>values.set(k,v),get:k=>values.get(k)},runPythonAsync:async source=>{body=source;}};
  await workerContext.executeCaseForTest(fake, code, input, {}, [], []);
  const assignments = [...values].map(([key,value])=>`${key} = json.loads(${JSON.stringify(JSON.stringify(value))})`).join('\n');
  const source = 'import json\n' + assignments + '\n' + body + '\nprint(json.dumps({"output":_lab_output,"error":_lab_error,"diagnostic":_lab_diagnostic}, ensure_ascii=False))';
  const result = spawnSync(process.env.TEST_PYTHON || 'python3', ['-c', source], {encoding:'utf8',timeout:10000,maxBuffer:1000000});
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout);
}

test('runner supports input(), sys.stdin and mixed reads of the same input stream', async () => {
  const result = await executeNative('import sys\nprint(input())\nprint(sys.stdin.readline().strip())\nprint(sys.stdin.read().strip())','one\ntwo\nthree\n');
  assert.equal(result.error, '');assert.equal(result.output, 'one\ntwo\nthree\n');
});

test('runtime and syntax errors identify main.py, user line and source instead of runner internals', async () => {
  for (const [code,type,line] of [['n = 0\nprint(4 / n)','ZeroDivisionError',2],['print(unknown)','NameError',1],['if True:\nprint(1)','IndentationError',2],['print(1','SyntaxError',1]]) {
    const result = await executeNative(code);
    assert.equal(result.diagnostic.type, type);assert.equal(result.diagnostic.line, line);
    assert.equal(result.diagnostic.source, code.split('\n')[line-1]);
    assert.match(result.error, /main\.py/);
  }
});

test('runner handles sys.exit and caps accidental infinite print output', async () => {
  assert.equal((await executeNative('import sys\nprint("done")\nsys.exit(0)')).error, '');
  assert.equal((await executeNative('import sys\nsys.exit(2)')).diagnostic.type, 'SystemExit');
  const large = await executeNative('for i in range(100000):\n    print("x" * 100)');
  assert.equal(large.diagnostic.type, 'OutputLimitExceeded');assert.ok(large.output.length <= 200000);
});

test('commercial blob worker includes diagnostic helpers but cannot import app-origin code', async () => {
  const compiled = await readFile(new URL('.vm-dist/public/python-sandbox-frame.js', root), 'utf8');
  assert.match(compiled, /_it1140_diagnostic/);assert.doesNotMatch(compiled, /import \\\"\.\/python-errors/);
  const html = await readFile(new URL('.vm-dist/public/preview.html', root), 'utf8');
  for (const name of ['python-editor','python-errors']) assert.match(html, new RegExp(name + '\\.js\\?v=[a-f0-9]{12}'));
});
