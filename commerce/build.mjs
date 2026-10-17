import { mkdir, readFile, writeFile, cp, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, '.commerce-dist/public');
await mkdir(output, { recursive: true });
for (const name of ['index.html','account.js','account.css','commerce-sw.js']) {
  await cp(resolve(root, 'commerce/public', name), resolve(output, name));
}
await cp(resolve(root, 'assets'), resolve(output, 'assets'), { recursive: true });
let html = await readFile(resolve(root, 'index.html'), 'utf8');
html = html.replace('<script src="./assets/js/question-content.js', '<script src="./commerce-access.js?v=1" defer></script>\n    <script src="./assets/js/question-content.js');
html = html.replace('<div class="top-actions">', '<div class="top-actions"><a class="ghost-btn" href="/">Tài khoản</a>');
await writeFile(resolve(output, 'learn.html'), html);
let quiz = await readFile(resolve(root, 'assets/js/quiz-app.js'), 'utf8');
assert.equal(quiz.split('./data/manifest.json').length, 2);
quiz = quiz.replace('./data/manifest.json', '/api/course/manifest').replace('navigator.serviceWorker.register("./sw.js")', 'navigator.serviceWorker.register("/commerce-sw.js")');
assert.ok(quiz.includes('return { version: manifest.version, subjects };'));
quiz = quiz.replace('return { version: manifest.version, subjects };', 'return { version: manifest.version, subjects, userScope: manifest.userScope };');
quiz = quiz.replace('const storageKey = "it1140-quiz-state:v2";', 'const storageKey = `it1140-commerce-quiz:v1:${data.userScope}`;');
await writeFile(resolve(output, 'assets/js/quiz-app.js'), quiz);
let python = await readFile(resolve(root, 'assets/js/python-lab.js'), 'utf8');
assert.equal(python.split('./data/python-exercises.json').length, 2);
python = python.replace('./data/python-exercises.json', '/api/course/python');
python = python.replace('const storageKey = "it1140-python-lab:v4";', 'let storageKey = "it1140-commerce-python:uninitialized";');
python = python.replace('let state = loadState();', 'let state = { code: {}, input: {}, completed: {}, currentId: "" };');
python = python.replace('exercises = data.exercises;', 'storageKey = `it1140-commerce-python:v1:${data.userScope}`;\n      state = loadState();\n      exercises = data.exercises;');
await writeFile(resolve(output, 'assets/js/python-lab.js'), python);
await cp(resolve(root, 'commerce/public/commerce-access.js'), resolve(output, 'commerce-access.js'));

// Fail closed if a stale build ever leaves private/source files in the asset dir.
async function check(dir, prefix = '') {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = `${prefix}${file.name}`;
    if (file.isDirectory()) {
      assert.ok(['assets','assets/css','assets/js'].includes(path), `Unexpected public directory: ${path}`);
      await check(resolve(dir, file.name), path + '/');
    } else assert.ok(/\.(html|css|js)$/.test(path) && !path.includes('..'), `Unexpected public asset: ${path}`);
  }
}
await check(output);
console.log('Commerce assets built. No data JSON, SQL, env files or fixtures are public assets.');
