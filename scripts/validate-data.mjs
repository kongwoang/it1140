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

function requireExactKeys(value, allowedKeys, field) {
  const unexpected = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  requireValue(unexpected.length === 0, `${field} có trường không được hỗ trợ: ${unexpected.join(", ")}`);
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const questionIdPattern = /^it1140-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{3}$/;
const sourceTypes = new Set(["lecture", "textbook", "exam", "quiz", "reference"]);
const questionKinds = new Set(["theory", "calculation", "code", "application"]);

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
  requireExactKeys(subject, ["$schema", "id", "code", "title", "language", "sources", "topics", "questions"], entry.file);
  requireValue(subject.id === entry.id, `Mã trong ${entry.file} không khớp manifest.`);
  requireValue(slugPattern.test(subject.id), `${subject.id} không phải kebab-case hợp lệ.`);
  requireValue(subject.code === "IT1140", `${subject.id}.code phải là IT1140.`);
  requireText(subject.title, `${subject.id}.title`);
  requireValue(subject.title === "Tin học đại cương", `${subject.id}.title phải là Tin học đại cương.`);
  requireValue(subject.language === "vi", `${subject.id}.language phải là vi.`);
  requireValue(Array.isArray(subject.sources), `${subject.id}.sources phải là mảng.`);
  requireValue(Array.isArray(subject.topics), `${subject.id}.topics phải là mảng.`);
  requireValue(Array.isArray(subject.questions), `${subject.id}.questions phải là mảng.`);

  const sourceIds = new Set(subject.sources.map((source) => source.id));
  const topicIds = new Set(subject.topics.map((topic) => topic.id));
  requireValue(sourceIds.size === subject.sources.length, `${subject.id} có mã nguồn bị trùng.`);
  requireValue(topicIds.size === subject.topics.length, `${subject.id} có mã chủ đề bị trùng.`);
  subject.sources.forEach((source, index) => {
    requireExactKeys(source, ["id", "label", "type"], `${subject.id}.sources[${index}]`);
    requireValue(slugPattern.test(source.id), `${source.id} không phải kebab-case hợp lệ.`);
    requireText(source.label, `${source.id}.label`);
    requireValue(sourceTypes.has(source.type), `${source.id}.type không hợp lệ.`);
  });
  subject.topics.forEach((topic, index) => {
    requireExactKeys(topic, ["id", "label"], `${subject.id}.topics[${index}]`);
    requireValue(slugPattern.test(topic.id), `${topic.id} không phải kebab-case hợp lệ.`);
    requireText(topic.label, `${topic.id}.label`);
  });

  for (const question of subject.questions) {
    requireExactKeys(
      question,
      ["id", "topic", "source", "kind", "difficulty", "responseType", "prompt", "choices", "answer", "explanation", "tags"],
      question.id || `${subject.id}.questions[]`,
    );
    requireText(question.id, `${subject.id}.questions[].id`);
    requireValue(questionIdPattern.test(question.id), `${question.id} không đúng mẫu it1140-<topic>-<nnn>.`);
    requireValue(!questionIds.has(question.id), `Trùng mã câu hỏi: ${question.id}`);
    questionIds.add(question.id);
    requireValue(topicIds.has(question.topic), `${question.id} tham chiếu chủ đề không tồn tại: ${question.topic}`);
    requireValue(sourceIds.has(question.source), `${question.id} tham chiếu nguồn không tồn tại: ${question.source}`);
    requireText(question.prompt, `${question.id}.prompt`);
    const responseType = question.responseType ?? "choice";
    requireValue(["choice", "number"].includes(responseType), `${question.id}.responseType không hợp lệ.`);
    const numeric = responseType === "number";
    requireValue(
      Array.isArray(question.choices) && (numeric ? question.choices.length === 0 : question.choices.length >= 2 && question.choices.length <= 6),
      `${question.id}: câu điền số cần choices rỗng; câu trắc nghiệm cần từ 2 đến 6 lựa chọn.`,
    );
    question.choices.forEach((choice, index) => requireText(choice, `${question.id}.choices[${index}]`));
    requireValue(new Set(question.choices).size === question.choices.length, `${question.id} có lựa chọn bị lặp.`);
    requireText(question.explanation, `${question.id}.explanation`);
    requireValue(questionKinds.has(question.kind), `${question.id}.kind không hợp lệ.`);
    requireValue(Number.isInteger(question.difficulty) && question.difficulty >= 1 && question.difficulty <= 3, `${question.id}.difficulty không hợp lệ.`);

    if (numeric) {
      requireValue(typeof question.answer === "number" && Number.isFinite(question.answer), `${question.id}.answer phải là số hữu hạn.`);
    } else {
      const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
      requireValue(answers.length > 0, `${question.id} chưa có đáp án.`);
      requireValue(!Array.isArray(question.answer) || answers.length >= 2, `${question.id} dùng mảng đáp án nhưng chỉ có một phần tử.`);
      requireValue(new Set(answers).size === answers.length, `${question.id} có đáp án bị lặp.`);
      requireValue(
        answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer < question.choices.length),
        `${question.id} có chỉ số đáp án không hợp lệ.`,
      );
    }
    requireValue(Array.isArray(question.tags) && question.tags.length >= 1 && question.tags.length <= 6, `${question.id} phải có từ 1 đến 6 tags.`);
    question.tags.forEach((tag, index) => requireText(tag, `${question.id}.tags[${index}]`));
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
  for (const field of ["title", "level", "library", "description", "task", "hint"]) {
    requireText(exercise[field], `${exercise.id}.${field}`);
  }
  const browserRunnable = exercise.browserRunnable !== false;
  requireValue(typeof browserRunnable === "boolean", `${exercise.id}.browserRunnable phải là boolean.`);
  requireValue(Array.isArray(exercise.tests), `${exercise.id}.tests phải là mảng.`);
  requireValue(browserRunnable ? exercise.tests.length > 0 : exercise.tests.length === 0, `${exercise.id} có trạng thái chạy/chấm không khớp với tests.`);
  exercise.tests.forEach((test, index) => {
    requireExactKeys(test, ["label", "input", "output", "files", "expectedFiles", "checks"], `${exercise.id}.tests[${index}]`);
    requireText(test.label, `${exercise.id}.tests[${index}].label`);
    requireValue(typeof test.input === "string", `${exercise.id}.tests[${index}].input phải là chuỗi.`);
    requireValue(typeof test.output === "string", `${exercise.id}.tests[${index}].output phải là chuỗi.`);
    for (const field of ["files", "expectedFiles"]) {
      if (test[field] === undefined) continue;
      requireValue(test[field] && typeof test[field] === "object" && !Array.isArray(test[field]), `${exercise.id}.tests[${index}].${field} phải là object.`);
      Object.entries(test[field]).forEach(([name, content]) => requireValue(typeof name === "string" && typeof content === "string", `${exercise.id}.tests[${index}].${field} phải chứa chuỗi.`));
    }
    if (test.checks !== undefined) {
      requireValue(Array.isArray(test.checks), `${exercise.id}.tests[${index}].checks phải là mảng.`);
      test.checks.forEach((check, checkIndex) => requireText(check, `${exercise.id}.tests[${index}].checks[${checkIndex}]`));
    }
  });
}

console.log(`Dữ liệu hợp lệ: ${subjectIds.size} bộ, ${questionCount} câu hỏi, ${exerciseIds.size} bài Python.`);
