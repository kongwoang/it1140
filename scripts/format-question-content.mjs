// Mechanical migration only: add presentation markers, without changing text/code.
// Idempotent, so newly authored unformatted snippets can use the same migration.
import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({});
vm.runInContext(await readFile("assets/js/question-content.js", "utf8"), context);
const { blocks, inlineParts, plain } = context.IT1140Text;
const fixtures = JSON.parse(await readFile("scripts/fixtures/python-quiz-cases.json", "utf8"));
const byId = new Map(fixtures.map(t => [t.id, t]));

function fence(code, language = "python") {
  const marker = "`".repeat(Math.max(3, ...[...code.matchAll(/`+/g)].map(m => m[0].length + 1)));
  return `${marker}${language}\n${code}\n${marker}`;
}

// Recognize complete call/index expressions only; quoted arguments may contain
// parentheses, brackets and escaped quotes. This is authoring, not HTML parsing.
function expressionEnd(text, start) {
  let i = start;
  while (/[\w.]/.test(text[i] || "") && i < text.length) i++;
  while (text[i] === "(" || text[i] === "[") {
    const stack = [text[i] === "(" ? ")" : "]"];
    let quote = "";
    i++;
    while (i < text.length && stack.length) {
      const ch = text[i++];
      if (quote) {
        if (ch === "\\") i++;
        else if (ch === quote) quote = "";
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "(" || ch === "[" || ch === "{") stack.push({ "(": ")", "[": "]", "{": "}" }[ch]);
      else if (ch === stack.at(-1)) stack.pop();
      else if (ch === "\n" || /[^\x00-\x7f]/.test(ch)) return start;
    }
    if (stack.length) return start;
    const chain = text.slice(i).match(/^\.[A-Za-z_]\w*/);
    if (chain) i += chain[0].length;
  }
  return i;
}

function annotateRaw(text) {
  // Leave existing explicit inline formatting alone.
  if (text.includes("`")) return text;
  const ranges = [];
  for (const match of text.matchAll(/\b[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*(?=[([])/g)) {
    if (ranges.some(r => match.index < r[1])) continue;
    const end = expressionEnd(text, match.index);
    if (end > match.index) ranges.push([match.index, end]);
  }
  for (const match of text.matchAll(/\b(?:None|True|False|__name__|__main__|__doc__|__all__|__init__|__pycache__|TypeError|ValueError|NameError|SyntaxError|FileNotFoundError|StopIteration|LinAlgError)\b/g)) {
    if (!ranges.some(([a, b]) => match.index >= a && match.index < b)) ranges.push([match.index, match.index + match[0].length]);
  }
  for (const match of text.matchAll(/\b(?:[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+|int|float|str|bytes|list|tuple|dict|set|lambda|return|print|input|break|continue|while|for|elif|else|match|case|assert|import|sum|sorted|zip|range|len)\b/g)) ranges.push([match.index, match.index + match[0].length]);
  for (const match of text.matchAll(/\[/g)) {
    const end = expressionEnd(text, match.index);
    if (end > match.index) ranges.push([match.index, end]);
  }
  for (const match of text.matchAll(/\b[A-Za-z_]\w*\s*=(?!=)\s*(?:"(?:\\.|[^"\n])*"|'(?:\\.|[^'\n])*'|-?\d+(?:\.\d+)?)/g)) ranges.push([match.index, match.index + match[0].length]);
  // Prefer the outer expression; never insert overlapping inline delimiters.
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const selected = [];
  for (const range of ranges) if (!selected.length || range[0] >= selected.at(-1)[1]) selected.push(range);
  for (const [a, b] of selected.reverse()) text = `${text.slice(0, a)}\`${text.slice(a, b)}\`${text.slice(b)}`;
  return text;
}

function annotateProse(text) {
  return inlineParts(text).map(part => {
    if (part.type === "text") return annotateRaw(part.text);
    const marker = "`".repeat(Math.max(1, ...[...part.text.matchAll(/`+/g)].map(m => m[0].length + 1)));
    return `${marker}${part.text}${marker}`;
  }).join("");
}

function annotate(value) {
  return blocks(value).map(part => part.type === "code" ? fence(part.text, part.language) : annotateProse(part.text)).join("\n");
}

const bankPath = "data/subjects/it1140.json";
const bank = JSON.parse(await readFile(bankPath, "utf8"));
let fenced = 0;
for (const q of bank.questions) {
  const before = { prompt: q.prompt, choices: [...q.choices], explanation: q.explanation };
  const fixture = byId.get(q.id);
  if (fixture && q.prompt.endsWith(fixture.code) && !blocks(q.prompt).some(p => p.type === "code")) {
    q.prompt = q.prompt.slice(0, -fixture.code.length) + fence(fixture.code);
    fenced++;
  }
  if (q.id === "it1140-c6-dieu-kien-009" && !q.prompt.includes("```")) {
    const [intro, code] = q.prompt.split("\n\n");
    q.prompt = `${intro}\n\n${fence(code)}`;
  }
  if (/^it1140-c4-bieu-dien-0(49|50)$/.test(q.id) && !q.prompt.includes("```")) {
    const [intro, code, question] = q.prompt.split("\n\n");
    q.prompt = `${intro}\n\n${fence(code, "text")}\n\n${question}`;
  }
  // Actual assembly in chapter 2 is inline rather than a complete program.
  if (q.kind === "code" && !fixture && !q.prompt.includes("`")) q.prompt = q.prompt.replace("ADD AX, BX", "`ADD AX, BX`");
  if (Number(q.id.match(/-c(\d+)-/)[1]) >= 5) {
    q.prompt = annotate(q.prompt);
    q.explanation = annotate(q.explanation);
    if (!fixture && q.kind !== "code") q.choices = q.choices.map(choice => {
      if (!choice.includes("`") && /^[\x00-\x7f]+$/.test(choice) && /[()[\]=_]|^["']|^(int|float|str|bytes|list|dict|tuple|set|r\+|w\+)$/.test(choice)) return `\`${choice}\``;
      return annotate(choice);
    });
  }
  assert.equal(plain(q.prompt).trim(), plain(before.prompt).trim(), `Prompt text preserved: ${q.id}`);
  assert.equal(plain(q.explanation), plain(before.explanation), `Explanation text preserved: ${q.id}`);
  q.choices.forEach((choice, i) => assert.equal(plain(choice), plain(before.choices[i]), `Choice preserved: ${q.id}/${i}`));
}
await writeFile(bankPath, JSON.stringify(bank, null, 2) + "\n");

const labPath = "data/python-exercises.json";
const lab = JSON.parse(await readFile(labPath, "utf8"));
for (const exercise of lab.exercises) for (const key of ["task", "hint"]) {
  const before = exercise[key];
  exercise[key] = annotate(before);
  assert.equal(plain(exercise[key]), plain(before), `${exercise.id}/${key}`);
}
await writeFile(labPath, JSON.stringify(lab, null, 2) + "\n");
console.log(`Formatted ${fenced} Python programs; verified every field's plain text is unchanged.`);
