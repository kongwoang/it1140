import { mkdir,readFile,writeFile,cp,readdir,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'.vm-dist/public');
// Retire this exact generated artifact left by an older VM build.
await rm(resolve(out,'assets/js/python-worker.js'),{force:true});
await mkdir(resolve(out,'assets/js'),{recursive:true});await mkdir(resolve(out,'assets/css'),{recursive:true});
for(const name of ['index.html','account.js','study-client.js','quiz.js','legal.html','python-sandbox.js'])await cp(resolve(import.meta.dirname,'public',name),resolve(out,name==='quiz.js'?'assets/js/commerce-quiz.js':name));
for(const name of ['account.css','commerce-sw.js'])await cp(resolve(root,'commerce/public',name),resolve(out,name));
await cp(resolve(import.meta.dirname,'public/commerce-access.js'),resolve(out,'commerce-access.js'));
await cp(resolve(root,'assets/js/question-content.js'),resolve(out,'assets/js/question-content.js'));
let worker=await readFile(resolve(root,'assets/js/python-worker.js'),'utf8');
worker=worker.replace(/^import \{ loadPyodide \} from [^\n]+\n/,'')
  .replace('let pyodidePromise = loadPyodide({ indexURL: PYODIDE_BASE_URL });','let pyodidePromise;')
  .replace('return pyodidePromise;','return pyodidePromise ||= import(PYODIDE_BASE_URL + "pyodide.mjs").then(({ loadPyodide }) => loadPyodide({ indexURL: PYODIDE_BASE_URL }));');
// Do not serve a same-origin Python worker. The opaque iframe creates it from a
// blob and its restrictive CSP permits only pinned runtime downloads, never APIs.
const frame=await readFile(resolve(import.meta.dirname,'public/python-sandbox-frame.js'),'utf8');
await writeFile(resolve(out,'python-sandbox-frame.js'),'const WORKER_SOURCE='+JSON.stringify(worker)+';\n'+frame);
await writeFile(resolve(out,'python-sandbox.html'),'<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Python cách ly</title><script src="/python-sandbox-frame.js" defer></script></head><body></body></html>');
const style=await readFile(resolve(root,'assets/css/app.css'),'utf8');
await writeFile(resolve(out,'assets/css/app.css'),style+`\n.study-block{position:fixed;inset:0;z-index:9999;background:#edf5f2f5;display:grid;place-items:center;padding:24px}.study-block section{max-width:480px;background:white;border:1px solid #b8d4c8;border-radius:16px;padding:28px}.study-block p{line-height:1.7}.choice input{accent-color:#0f766e}.question-map select{grid-column:1/-1;max-width:100%}\n`);
let html=await readFile(resolve(root,'index.html'),'utf8');
html=html.replace('<script src="./assets/js/question-content.js','<script src="/commerce-access.js" defer></script>\n    <script src="/study-client.js" defer></script>\n    <script src="/python-sandbox.js" defer></script>\n    <script src="./assets/js/question-content.js');
html=html.replace('./assets/js/quiz-app.js?v=9','/assets/js/commerce-quiz.js');
html=html.replace('<div class="top-actions">','<div class="top-actions"><a class="ghost-btn" href="/">Tài khoản</a>');
await writeFile(resolve(out,'learn.html'),html);
let lab=await readFile(resolve(root,'assets/js/python-lab.js'),'utf8');
assert.equal(lab.split('./data/python-exercises.json').length,2);
lab=lab.replace('const storageKey = "it1140-python-lab:v4";','let storageKey = "it1140-commerce-python:uninitialized";')
  .replace('let state = loadState();','let state = { code: {}, input: {}, completed: {}, currentId: "" };')
  .replace('fetch("./data/python-exercises.json")','(await window.IT1140Study.ready, fetch("/api/course/python"))')
  .replace('exercises = data.exercises;','storageKey = `it1140-commerce-python:v2:${data.userScope}`;\n      state = loadState();\n      exercises = data.exercises;')
  .replace('function selectExercise(id) {','let selectionGeneration = 0;\n  async function selectExercise(id) {');
// Use a guarded asynchronous detail load: stale responses cannot switch a newer selection.
lab=lab.replace('    currentId = id;\n    state.currentId = id;\n    saveState();\n','');
lab=lab.replace('const exercise = currentExercise();\n    if (!exercise) return;',`const generation = ++selectionGeneration;
    let exercise = exercises.find(item => item.id === id);
    if (!exercise) return;
    els.run.disabled = els.runInput.disabled = true;
    els.editor.disabled = els.input.disabled = true;
    try {
      const response = await fetch('/api/course/python/' + encodeURIComponent(id));
      if (!response.ok) throw new Error('Không tải được bài tập. Hãy kiểm tra phiên học.');
      const detail = await response.json();
      if (generation !== selectionGeneration) return;
      Object.assign(exercise, detail);
      currentId = id; state.currentId = id; saveState();
      els.editor.disabled = els.input.disabled = false;
    } catch (error) {
      if (generation !== selectionGeneration) return;
      els.editor.disabled = els.input.disabled = false;
      els.output.textContent = error.message; return;
    }`);
lab=lab.replace('  initialize();',`  window.addEventListener('it1140:study-stopped', () => {
    worker?.terminate(); worker = undefined; clearTimeout(timeoutId);
    els.run.disabled = els.runInput.disabled = true; saveCurrentCode();
  });
  initialize();`);
lab=lab.replace('worker.addEventListener("error", () => finishWithError("Không khởi động được môi trường Python."));',
  'worker.addEventListener("error", event => { worker?.terminate(); worker = undefined; finishWithError("Không khởi động được Python: " + (event.message || "Không tải được module từ CDN. Hãy kiểm tra mạng và tải lại trang.")); });');
assert.equal(lab.split('new Worker("./assets/js/python-worker.js?v=5", { type: "module" })').length,2);
lab=lab.replace('new Worker("./assets/js/python-worker.js?v=5", { type: "module" })','window.IT1140CreatePythonWorker()');
assert.ok(!lab.includes('new Worker('),'Commercial lab must never construct an account-origin worker');
await writeFile(resolve(out,'assets/js/python-lab.js'),lab);
async function audit(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const p=prefix+entry.name;
    if(entry.isDirectory()){assert.ok(['assets','assets/js','assets/css'].includes(p),`Unexpected public directory ${p}`);await audit(resolve(dir,entry.name),p+'/');}
    else assert.ok(new Set(['index.html','learn.html','account.js','account.css','commerce-sw.js','commerce-access.js','study-client.js','legal.html','python-sandbox.js','python-sandbox.html','python-sandbox-frame.js','assets/js/question-content.js','assets/js/commerce-quiz.js','assets/js/python-lab.js','assets/css/app.css']).has(p),`Unexpected public file ${p}`);
  }
}
await audit(out);console.log('VM public build ready; private bank, keys and SQL excluded.');
