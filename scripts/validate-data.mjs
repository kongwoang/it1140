import { readFile } from "node:fs/promises";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(value, field) {
  requireValue(typeof value === "string" && value.trim().length > 0, `${field} phải là chuỗi không rỗng.`);
}

const manifest = await readJson("data/manifest.json");
requireValue(Array.isArray(manifest.subjects) && manifest.subjects.length > 0, "Danh mục phải có ít nhất một bộ câu hỏi.");

const subjectIds = new Set();
const questionIds = new Set();
let questionCount = 0;

for (const entry of manifest.subjects) {
  requireText(entry.id, "subjects[].id");
  requireText(entry.file, `Đường dẫn dữ liệu của ${entry.id}`);
  requireValue(!subjectIds.has(entry.id), `Trùng mã bộ câu hỏi: ${entry.id}`);
  subjectIds.add(entry.id);

  const subject = await readJson(entry.file.replace(/^\.\//, ""));
  requireValue(subject.id === entry.id, `Mã trong ${entry.file} không khớp manifest.`);
  requireText(subject.title, `${subject.id}.title`);
  requireValue(Array.isArray(subject.sources), `${subject.id}.sources phải là mảng.`);
  requireValue(Array.isArray(subject.topics), `${subject.id}.topics phải là mảng.`);
  requireValue(Array.isArray(subject.questions), `${subject.id}.questions phải là mảng.`);

  const sourceIds = new Set(subject.sources.map((source) => source.id));
  const topicIds = new Set(subject.topics.map((topic) => topic.id));
  requireValue(sourceIds.size === subject.sources.length, `${subject.id} có mã nguồn bị trùng.`);
  requireValue(topicIds.size === subject.topics.length, `${subject.id} có mã chủ đề bị trùng.`);

  for (const question of subject.questions) {
    requireText(question.id, `${subject.id}.questions[].id`);
    requireValue(!questionIds.has(question.id), `Trùng mã câu hỏi: ${question.id}`);
    questionIds.add(question.id);
    requireValue(topicIds.has(question.topic), `${question.id} tham chiếu chủ đề không tồn tại: ${question.topic}`);
    requireValue(sourceIds.has(question.source), `${question.id} tham chiếu nguồn không tồn tại: ${question.source}`);
    requireText(question.prompt, `${question.id}.prompt`);
    requireValue(Array.isArray(question.choices) && question.choices.length >= 2, `${question.id} phải có ít nhất hai lựa chọn.`);
    requireText(question.explanation, `${question.id}.explanation`);

    const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
    requireValue(answers.length > 0, `${question.id} chưa có đáp án.`);
    requireValue(
      answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer < question.choices.length),
      `${question.id} có chỉ số đáp án không hợp lệ.`,
    );
    questionCount += 1;
  }
}

const pythonData = await readJson("data/python-exercises.json");
requireValue(Array.isArray(pythonData.exercises) && pythonData.exercises.length > 0, "Cần ít nhất một bài thực hành Python.");
const exerciseIds = new Set();

for (const exercise of pythonData.exercises) {
  requireText(exercise.id, "exercises[].id");
  requireValue(!exerciseIds.has(exercise.id), `Trùng mã bài Python: ${exercise.id}`);
  exerciseIds.add(exercise.id);
  for (const field of ["title", "level", "library", "description", "task", "starterCode", "hint"]) {
    requireText(exercise[field], `${exercise.id}.${field}`);
  }
  requireValue(Array.isArray(exercise.tests) && exercise.tests.length > 0, `${exercise.id} phải có bộ kiểm tra.`);
  exercise.tests.forEach((test, index) => {
    requireText(test.label, `${exercise.id}.tests[${index}].label`);
    requireText(test.code, `${exercise.id}.tests[${index}].code`);
  });
}

console.log(`Dữ liệu hợp lệ: ${subjectIds.size} bộ, ${questionCount} câu hỏi, ${exerciseIds.size} bài Python.`);
