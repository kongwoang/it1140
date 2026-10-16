import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.value = ""; }
  set textContent(value) { this.value = value; this.children = []; }
  get textContent() { return this.value + this.children.map(n => n.textContent).join(""); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren() { this.value = ""; this.children = []; }
  setAttribute(name, value) { this.attributes[name] = value; }
}
const context = vm.createContext({ document: { createElement: tag => new Element(tag) } });
vm.runInContext(await readFile("assets/js/question-content.js", "utf8"), context);
const { blocks, inlineParts, plain, render } = context.IT1140Text;
const code = 'for x in [1, 2]:\n    print("<img onerror=alert(1)>", x)\n\nprint("done")';
const value = `Xét \`x\`.\n\n\`\`\`python\n${code}\n\`\`\`\n\nKết quả là gì?`;
assert.equal(blocks(value).length, 3);
assert.equal(blocks(value)[1].text, code);
assert.equal(plain(value), `Xét x.\n\n${code}\n\nKết quả là gì?`);
assert.equal(inlineParts('Dùng ``"`"`` để biểu diễn ký tự.')[1].text, '"`"');
assert.equal(plain('```python\nprint(1)'), '```python\nprint(1)', "Do not hide unfinished fences");
const root = new Element("div");
render(root, value, { heading: true });
assert.deepEqual(root.children.map(n => n.tag), ["h2", "pre", "p"]);
assert.equal(root.children[1].children[0].tag, "code");
assert.equal(root.children[1].textContent, code);
assert.equal(root.children[1].tabIndex, 0, "Keyboard users can scroll code");
render(root, '<script>alert(1)</script> và `a < b`');
assert.equal(root.textContent, '<script>alert(1)</script> và a < b');
assert.equal(root.children[0].children.some(n => n.tag === "script"), false);
render(root, '1\n  2\n<script>', { code: true });
assert.equal(root.children.length, 1);
assert.equal(root.children[0].tag, "code");
assert.equal(root.textContent, '1\n  2\n<script>');
render(root, "Câu mới", { heading: true });
assert.equal(root.children.length, 1, "No stale code from previous question");

const bank = JSON.parse(await readFile("data/subjects/it1140.json", "utf8"));
const fixtures = JSON.parse(await readFile("scripts/fixtures/python-quiz-cases.json", "utf8"));
const byId = new Map(bank.questions.map(q => [q.id, q]));
let displayedPrograms = 0;
for (const test of fixtures) {
  const q = byId.get(test.id);
  const codeBlocks = blocks(q.prompt).filter(p => p.type === "code");
  if (!codeBlocks.length) continue; // Numerical witness, not a displayed program.
  assert.equal(codeBlocks.length, 1, q.id);
  assert.equal(codeBlocks[0].text, test.code, `Displayed program unchanged: ${q.id}`);
  render(root, q.prompt, { heading: true });
  assert.equal(root.children.find(n => n.tag === "pre").textContent, test.code);
  displayedPrograms++;
}
assert.equal(displayedPrograms, 738);
const question = (c, n) => bank.questions.find(q => q.id.startsWith(`it1140-c${c}-`) && q.id.endsWith(`-${n}`));
const text = (c, n) => plain(question(c, n).prompt);
assert.match(text(4, "144"), /count = 1/);
assert.match(text(4, "166"), /khởi tạo Min bằng phần tử thứ hai/);
assert.match(text(11, "123"), /y = \[4, 4\]/);
assert.match(text(11, "054"), /khoảng cuối lấy cả hai đầu/);
assert.match(text(9, "128"), /thực hiện riêng/);
assert.match(text(8, "146"), /số thực hữu hạn/);
assert.doesNotMatch(text(3, "130"), /cùng mô hình/);

// Execute every choice in the two repaired counterexample tasks, not only the key.
for (const [n, buggy, correct] of [
  ["144", a => { let max = a[0], count = 1; for (const x of a.slice(1)) { if (x > max) { max = x; count = 0; } else if (x === max) count++; } return count; }, a => a.filter(x => x === Math.max(...a)).length],
  ["166", a => Math.min(...a.slice(1)), a => Math.min(...a)],
]) {
  const q = question(4, n);
  const wrong = q.choices.flatMap((choice, i) => { const a = JSON.parse(plain(choice)); return buggy(a) !== correct(a) ? [i] : []; });
  assert.deepEqual(wrong, [q.answer], `Exactly one counterexample: ${q.id}`);
}

const lab = JSON.parse(await readFile("data/python-exercises.json", "utf8"));
assert.match(plain(lab.exercises.find(x => x.id === "py-pdf-1-9").task), /chia hết cho 400/);
const labSource = await readFile("assets/js/python-lab.js", "utf8");
context.els = { files: new Element("details"), fileContents: new Element("div") };
vm.runInContext(labSource.slice(labSource.indexOf("  function renderSampleFiles("), labSource.indexOf("  function setStatus(")), context);
for (const exercise of lab.exercises) {
  context.renderSampleFiles(exercise);
  const files = Object.entries(exercise.tests?.[0]?.files || {});
  assert.equal(context.els.files.hidden, files.length === 0);
  files.forEach(([name, contents], i) => {
    assert.equal(context.els.fileContents.children[2 * i].textContent, name);
    assert.equal(context.els.fileContents.children[2 * i + 1].textContent, contents || "(Tệp rỗng)");
  });
}
context.renderSampleFiles({ tests: [] });
assert.equal(context.els.fileContents.children.length, 0);
const css = await readFile("assets/css/app.css", "utf8");
assert.match(css, /\.question-code code\s*\{[^}]*monospace/s);
assert.match(css, /\.question-code\s*\{[^}]*white-space: pre;/s);
console.log("OK: safe code rendering, 738 exact programs, independent counterexamples, standalone context and sample file visibility.");
