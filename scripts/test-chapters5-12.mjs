import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bank = JSON.parse(await readFile("data/subjects/it1140.json", "utf8"));
const fixtures = JSON.parse(await readFile("scripts/fixtures/python-quiz-cases.json", "utf8"));
const byId = new Map(bank.questions.map(q => [q.id, q]));
const fixtureIds = new Set(fixtures.map(t => t.id));
assert.equal(fixtureIds.size, fixtures.length, "No duplicate execution fixtures");
assert.equal(fixtures.length, 243);
const totals = [52, 52, 55, 60, 58, 92, 65, 74];
const numericTotals = [15, 12, 8, 2, 5, 4, 10, 2];
for (let n = 5; n <= 12; n++) {
  const qs = bank.questions.filter(q => q.source === `chuong-${n}-bai-giang`);
  assert.equal(qs.length, totals[n - 5], `Chapter ${n} count`);
  assert.equal(qs.filter(q => q.responseType === "number").length, numericTotals[n - 5]);
  assert.equal(new Set(qs.map(q => q.prompt)).size, qs.length, `Chapter ${n} unique prompts`);
  const topics = bank.topics.filter(t => t.chapter === `chuong-${n}`);
  for (const t of topics) assert.ok(qs.some(q => q.topic === t.id), `Covered topic ${t.id}`);
  const choices = qs.filter(q => q.responseType === "choice");
  const keys = [0,1,2,3].map(i => choices.filter(q => q.answer === i).length);
  assert.ok(Math.max(...keys) - Math.min(...keys) <= 1, `Balanced keys, chapter ${n}`);
  for (const q of qs) {
    assert.ok(topics.some(t => t.id === q.topic));
    assert.ok(q.explanation.includes(`Chương ${n}, tr.`), q.id);
    if (q.kind === "code") assert.ok(fixtureIds.has(q.id), `Executable fixture for ${q.id}`);
    if (q.responseType === "choice") {
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      if (q.kind !== "code") {
        const longestWrong = Math.max(...q.choices.filter((_,i) => i !== q.answer).map(s => s.length));
        assert.ok(q.choices[q.answer].length <= longestWrong * 1.55, `Length cue: ${q.id}`);
      }
    }
  }
}
for (const t of fixtures) {
  const q = byId.get(t.id);
  assert.ok(q, t.id);
  const expected = q.responseType === "number" ? String(q.answer) : q.choices[q.answer];
  assert.equal(t.expected, expected, `Fixture follows published answer: ${t.id}`);
  if (q.kind === "code") assert.ok(q.prompt.endsWith(t.code), `Fixture executes displayed code: ${t.id}`);
}
// Independent checks for non-executable mathematical and graphics questions.
const find = fragment => {
  const found = bank.questions.filter(q => /^it1140-c(?:[5-9]|1[0-2])-/.test(q.id) && q.prompt.includes(fragment));
  assert.equal(found.length, 1, fragment);
  return found[0];
};
const numericChecks = [
  ["Điền f(0)", 7], ["tổng số lời gọi fact", 5 + 1],
  ["Điền F(12)", 233], ["nghiệm x bằng", (15 - 10) / 5],
  ["Độ rộng nét bút mặc định", 1], ["Góc quay ngoài mỗi lần", 360 / 5],
  ["Mỗi lần left", 360 / 3], ["Tổng độ dài các đoạn", 2 * (0+1+2+3+4+5)],
  ["Tổng góc quay thêm", 36 * 10], ["Tổng góc quay là", 5 * 144],
  ["mặc định tạo bao nhiêu giá trị x", 256], ["Chiều rộng ảnh danh nghĩa", 8 * 80],
  ["Số phần tử ở bin cuối", [0,1,2,3,4].filter(x => x >= 2 && x <= 4).length],
  ["Điền IQR", 18 - 10], ["sau 60 giây nhận", 100 * 20 * 60],
  ["Giá trị của khóa", "a b a b a".split(" ").filter(x => x === "a").length],
];
for (const [fragment, expected] of numericChecks) assert.equal(find(fragment).answer, expected, fragment);
const pascal = [1,3,3,1];
assert.deepEqual([1, ...pascal.slice(1).map((x,i) => x + pascal[i]), 1], [1,4,6,4,1]);
const circle = find("Gọi circle(50,90)");
assert.equal(circle.choices[circle.answer], "(50,50), hướng bắc");
const css = await readFile("assets/css/app.css", "utf8");
assert.match(css, /\.question-panel h2\s*\{[^}]*white-space: pre-wrap/s);
assert.match(css, /\.choice-text\s*\{[^}]*white-space: pre-wrap/s);
console.log("OK: chapters 5–12 — 508 questions, coverage groups, balanced keys, code fixtures, 16 independent numeric checks, preserved indentation.");
