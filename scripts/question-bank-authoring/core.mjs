// Editorial helpers. This directory contains repository-authored content only.
// No downloaded code is executed or turned into questions automatically.
export const additions = [];
export const executionCases = [];
export const calculationCases = [];
export const targets = [208, 208, 248, 218, 118, 158, 158, 158, 158, 208, 128, 128];
export function choice(topic, difficulty, prompt, correct, wrong, explanation, tag = 'vận dụng', reference) {
  if (wrong.length !== 3 || new Set([correct, ...wrong]).size !== 4) throw Error(`Invalid choices: ${prompt}`);
  const chapter = Number(topic.match(/^c(\d+)-/)[1]);
  const question = {
    topic, source: `chuong-${chapter}-bai-giang`, kind: 'application', difficulty,
    responseType: 'choice', prompt, choices: [correct, ...wrong], answer: 0,
    explanation: `${explanation}${reference ? ` ${reference}` : ''}`,
    tags: [tag, `chương ${chapter}`],
  };
  additions.push(question);
  return question;
}
export function number(topic, difficulty, prompt, answer, explanation, tag = 'tính toán', reference) {
  if (!Number.isFinite(answer)) throw Error(`Non-finite answer: ${prompt}`);
  const q = choice(topic, difficulty, prompt, '0', ['1', '2', '3'], explanation, tag, reference);
  Object.assign(q, { kind: 'calculation', responseType: 'number', choices: [], answer });
  return q;
}
export function code(topic, difficulty, program, expected, wrong, explanation, tag = 'đọc mã', preface = '') {
  if (!preface && program.includes('from io import StringIO')) preface = 'StringIO mô phỏng một tệp văn bản trong bộ nhớ; con trỏ ban đầu ở đầu nội dung.';
  if (!preface && program.includes('from io import BytesIO')) preface = 'BytesIO mô phỏng một tệp nhị phân trong bộ nhớ; các vị trí được tính theo byte.';
  if (!preface && program.includes('PurePosixPath')) preface = 'PurePosixPath xử lý đường dẫn kiểu POSIX, không đọc hoặc tạo tệp.';
  const numeric = typeof expected === 'number';
  const prompt = `${preface ? `${preface}\n\n` : ''}${numeric ? 'Đoạn mã Python 3 sau in ra số nào? Điền giá trị số.' : 'Đoạn mã Python 3 sau in ra kết quả nào?'}\n\n${program}`;
  const q = numeric ? number(topic, difficulty, prompt, expected, explanation, tag) :
    choice(topic, difficulty, prompt, expected, wrong, explanation, tag);
  q.kind = 'code';
  executionCases.push({ question: q, code: program, expected: String(expected), ...(numeric ? { numeric: true } : {}) });
  return q;
}
export function numeric(topic, difficulty, prompt, expected, expression, explanation, tag) {
  const q = number(topic, difficulty, prompt, expected, explanation, tag);
  calculationCases.push({ question: q, expression });
  return q;
}
export function multi(topic, difficulty, prompt, correct, wrong, explanation, tag = 'nhiều đáp án') {
  if (correct.length < 2 || correct.length > 3 || correct.length + wrong.length !== 4) throw Error('Invalid multi-answer question');
  const q = choice(topic, difficulty, `${prompt}\nChọn tất cả đáp án đúng.`, correct[0], [...correct.slice(1), ...wrong], explanation, tag);
  q.answer = correct.map((_,i) => i);
  return q;
}
export function count(chapter) { return additions.filter(q => q.source === `chuong-${chapter}-bai-giang`).length; }
// A small, explicitly selected set of contrasting inputs (boundary / branch /
// normal). Never generate unlimited random variants to reach a target count.
export function family(topic, difficulty, makeProgram, cases, explanation, tag = 'theo dõi trạng thái', preface = '') {
  if (cases.length > 3) throw Error('At most three contrasting inputs per family');
  for (const [input, expected, wrong] of cases) code(topic, difficulty, makeProgram(input), expected, wrong, explanation, tag, preface);
}
export function requireCount(chapter, expected) {
  if (count(chapter) !== expected) throw Error(`Chapter ${chapter}: expected ${expected} additions; got ${count(chapter)}`);
}
