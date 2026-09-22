import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const bank = JSON.parse(await readFile("data/subjects/it1140.json", "utf8"));
const chapter = bank.questions.filter((q) => q.source === "chuong-1-bai-giang");
const question = (n) => chapter.find((q) => q.id.endsWith(`-${String(n).padStart(3, "0")}`));
const correctText = (n) => question(n).choices[question(n).answer];
assert.equal(chapter.length, 124);
assert.equal(chapter.filter((q) => q.responseType === "number").length, 28);
assert.deepEqual([0, 1, 2, 3].map((i) => chapter.filter((q) => q.responseType === "choice" && q.answer === i).length), [24, 24, 24, 24]);
assert.equal(new Set(chapter.map((q) => q.prompt)).size, 124);
assert.deepEqual(bank.topics.filter((t) => t.id.startsWith("c1-")).map((t) => chapter.filter((q) => q.topic === t.id).length), [13, 11, 19, 16, 16, 8, 25, 16]);

// Independent computations: do not derive the expected values from explanations.
const numericKeys = new Map([
  [13, 3 * 8], [14, 1.5 * 1024], [17, 256 * 16 / 1024], [19, 8 ** 3],
  [23, 0b101101 + 0b101 / 2 ** 3], [26, 0o235 + 6 / 8 + 4 / 64],
  [34, 20 - 2], [38, 2 ** 16 - 1], [40, Math.ceil(Math.log2(300 + 1))],
  [44, 0b11010010 - 256], [45, -(2 ** 11)], [52, (197 + 70) % 256],
  [53, (5 - 9 + 256) % 256], [62, -11 * 13], [69, 0xaa ^ 0xaa],
  [75, 0b10000010 - 127], [76, -(1 + 1 / 4) * 2 ** 4], [85, 16383 + 2],
  [90, 0x7e - 0x20 + 1], [93, "a".charCodeAt(0) - "A".charCodeAt(0)],
  [103, 1 / 5 ** 2], [109, (0b00110101 + ((~0b00110101 + 1) & 255)) & 255],
  [111, 0b10000 - 0b00001], [112, -91 / 7], [115, Math.floor(Math.log2(0.15625)) + 127],
  [117, -(1 + 1 / 4) * 2 ** (1019 - 1023)], [118, 2 ** (3 - 23) / 2 ** (0 - 23)],
  [121, 128 - 95],
]);
for (const [n, expected] of numericKeys) assert.equal(question(n).answer, expected, `Numeric question ${n}`);
assert.equal(numericKeys.size, 28);

const bits = (n, width = 8) => (n & (2 ** width - 1)).toString(2).padStart(width, "0");
const binary = (n) => n.toString(2);
const floatBuffer = Buffer.alloc(4);
floatBuffer.writeFloatBE(9.6875);
const encodedFloat = floatBuffer.toString("hex").toUpperCase();
const decodedFloat = Buffer.from("C1560000", "hex").readFloatBE();
const calculatedChoices = new Map([
  [16, `Mỗi giá trị chiếm ${24 / 8} byte.`], [20, `${Math.ceil(Math.log2(1000))} bit.`],
  [21, `${7 + 1}.`], [24, `${binary(124.75)}₂`], [25, `${binary(65.125)}₂`],
  [27, `${String(0x2d + 10 / 16).replace(".", ",")}.`],
  [28, `${(0b110101101011).toString(16).toUpperCase()}₁₆`], [29, `${(0xb7).toString(8)}₈`],
  [30, `0.${(0b1011).toString(16).toUpperCase()}₁₆`], [32, `${binary(13)}₂`], [33, `${binary(0.375)}₂`],
  [37, `Từ 0 đến ${2 ** 8 - 1}.`], [39, `${0b10010110} và −${256 - 0b10010110}.`],
  [41, bits(~0b01011001)], [42, bits(-0b00101101)], [43, bits(-70)],
  [46, `${2 ** 7} giá trị âm và ${2 ** 7 - 1} giá trị dương.`],
  [49, `${bits(-18, 16).slice(0, 8)} ${bits(-18, 16).slice(8)}`],
  [51, `${bits(150 + 19)}, không có bit nhớ ra ngoài.`],
  [54, `Kết quả là ${97 - 52} và không tràn số học có dấu.`],
  [55, `−${256 - (75 + 81)}; có tràn số học.`], [56, `${(-104 - 74 + 256) % 256}, có tràn số học.`],
  [58, bits(52 - 97)], [60, `${binary(0b1011 * 0b1101)}₂`],
  [61, `Thương ${binary(Math.floor(0b10010011 / 0b1011))}₂, dư ${binary(0b10010011 % 0b1011)}₂.`],
  [63, bits(0xaa & 0x0f)], [64, bits(0xaa | 0x0f)], [65, bits(0xaa ^ 0x0f)],
  [66, bits(~0x3c)], [67, bits(255 & ~(1 << 5) & ~(1 << 2))], [68, bits((1 << 5) | (1 << 2))],
  [77, `${encodedFloat}₁₆`], [78, `${String(decodedFloat).replace("-", "−").replace(".", ",")}.`],
  [89, `${2 ** 7} và ${2 ** 8}.`], [94, `${"D".charCodeAt(0).toString(16)}₁₆`],
  [99, `${Buffer.byteLength("IT1140", "ascii")} byte.`], [100, `${0b01000001} và ký tự “${String.fromCharCode(0b01000001)}”.`],
  [104, `${(58.6875).toString(16).toUpperCase()}₁₆`],
  [105, `${(83.375).toString(8)}₈`],
  [106, `${bits(0x6d).slice(0, 4)} ${bits(0x6d).slice(4)}.${bits(0xa, 4)}₂`],
  [110, `${(1 + 1 + 1) % 2} và ${Math.floor((1 + 1 + 1) / 2)}.`],
  [119, `0.${binary(Math.round(0.7 * 2 ** 10))}₂`],
]);
for (const [n, expected] of calculatedChoices) assert.equal(correctText(n), expected, `Choice question ${n}`);

// Check new boundary/representation claims independently of the prose keys.
assert.equal(1 + 15 + 64, 80);
assert.equal(Number.isFinite(Math.fround(1e100)), false);
assert.equal(Number.isFinite(1e100), true);
const nextFloat = (x) => {
  const bytes = Buffer.alloc(4);
  bytes.writeFloatBE(x);
  bytes.writeUInt32BE(bytes.readUInt32BE() + 1);
  return bytes.readFloatBE();
};
assert.equal((nextFloat(8) - 8) / (nextFloat(1) - 1), question(118).answer);
assert.deepEqual(["0", "9", "A", "Z", "a", "z"].map((c) => c.charCodeAt(0)), [0x30, 0x39, 0x41, 0x5a, 0x61, 0x7a]);

// Exercise the actual grading functions, without a browser or new dependencies.
const source = await readFile("assets/js/quiz-app.js", "utf8");
const start = source.indexOf("  function correctAnswers(");
const end = source.indexOf("  function renderTags(", start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({
  state: { answers: {} },
  localizedQuestion: (q) => q,
  optionLabel: (i) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i],
});
vm.runInContext(source.slice(start, end), context);
for (const value of [undefined, null, "", " ", "abc", "1/2", "1,2.3", "0x10", "Infinity", "NaN", "1e999", [], true]) {
  assert.equal(context.parseNumericAnswer(value), null, `Reject ${String(value)}`);
}
for (const [value, expected] of [["0", 0], [0, 0], ["-46", -46], [" 45,625 ", 45.625], ["45.625", 45.625], ["+1.5e3", 1500], [".5", 0.5]]) {
  assert.equal(context.parseNumericAnswer(value), expected);
}
for (const q of chapter) {
  delete context.state.answers[q.id];
  assert.equal(context.isAnswered(q), false, q.id);
  assert.equal(context.answerMatches(q), false, q.id);
  context.state.answers[q.id] = q.responseType === "number" ? String(q.answer).replace(".", ",") : q.answer;
  assert.equal(context.isAnswered(q), true, q.id);
  assert.equal(context.answerMatches(q), true, q.id);
  assert.ok(context.answerLabel(q));
  // Persistence round-trip preserves numeric text and choice indices.
  context.state = JSON.parse(JSON.stringify(context.state));
  assert.equal(context.answerMatches(q), true, q.id);
  context.state.answers[q.id] = q.responseType === "number" ? String(q.answer + 1) : (q.answer + 1) % 4;
  assert.equal(context.answerMatches(q), false, q.id);
}
const multi = { id: "legacy-multiple", choices: ["A", "B", "C"], answer: [0, 2] };
context.state.answers[multi.id] = [2, 0];
assert.equal(context.answerMatches(multi), true);
context.state.answers[multi.id] = [0];
assert.equal(context.answerMatches(multi), false);
assert.equal(context.answerLabel(multi), "A. A; C. C");

console.log(`OK: ${chapter.length} questions, ${numericKeys.size} numeric + ${calculatedChoices.size} choice calculations, balanced keys, numeric parsing, grading and persistence.`);
