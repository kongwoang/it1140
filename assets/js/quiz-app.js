async function loadQuizData() {
  const manifestResponse = await fetch("./data/manifest.json");
  if (!manifestResponse.ok) throw new Error("Không thể tải danh mục câu hỏi.");

  const manifest = await manifestResponse.json();
  const subjects = await Promise.all(
    manifest.subjects.map(async (entry) => {
      const response = await fetch(entry.file);
      if (!response.ok) throw new Error(`Không thể tải dữ liệu ${entry.id}.`);
      return response.json();
    }),
  );

  return { version: manifest.version, subjects };
}

(async function () {
  let data;
  try {
    data = await loadQuizData();
  } catch (error) {
    const questionText = document.getElementById("questionText");
    if (questionText) questionText.textContent = "Không tải được ngân hàng câu hỏi. Vui lòng tải lại trang.";
    console.error(error);
    return;
  }

  const storageKey = "it1140-quiz-state:v2";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const supportedLanguages = ["vi"];
  const i18n = {
    vi: {
      documentTitle: "Tin học đại cương – IT1140",
      languageAria: "Ngôn ngữ",
      subjectLabel: "Nội dung",
      searchLabel: "Tìm",
      chapterLabel: "Chương",
      pinnedOnly: "Đã ghim",
      progressLabel: "Tiến độ",
      correctLabel: "Đúng",
      wrongLabel: "Sai",
      accuracyLabel: "Tỉ lệ",
      questionsLabel: "Câu hỏi",
      searchPlaceholder: "Nhập từ khóa câu hỏi...",
      modeAria: "Chế độ quiz",
      modes: {
        practice: "Luyện",
        exam: "Thi",
        review: "Ôn",
      },
      shuffle: "Trộn",
      shuffleTitle: "Trộn câu",
      reset: "Đặt lại",
      resetTitle: "Xóa tiến độ hiện tại",
      bookmarkTitle: "Ghim câu hỏi",
      allChapters: "Tất cả chương",
      generatedTag: "Từ bài giảng",
      multipleAnswerTag: "Chọn nhiều đáp án",
      noQuestion: "Chưa có câu hỏi phù hợp. Ngân hàng IT1140 đang được cập nhật.",
      questionCount: (current, total) => `Câu ${current}/${total}`,
      questionCountEmpty: "Câu 0/0",
      feedbackCorrect: (answer) => `Đúng: ${answer}`,
      feedbackUnanswered: (answer) => `Chưa trả lời. Đáp án: ${answer}`,
      feedbackWrong: (answer) => `Sai. Đáp án: ${answer}`,
      submitCheck: "Kiểm tra",
      submitChecked: "Đã kiểm tra",
      submitExam: "Nộp bài",
      submitExamDone: "Đã nộp",
      submitAnswer: "Đáp án",
      prev: "Trước",
      next: "Tiếp",
      difficulty: {
        1: "Cơ bản",
        2: "Vừa",
        3: "Khó",
      },
    },
  };

  const els = {
    subjectCode: document.getElementById("subjectCode"),
    subjectTitle: document.getElementById("subjectTitle"),
    subjectSelect: document.getElementById("subjectSelect"),
    searchInput: document.getElementById("searchInput"),
    chapterFilter: document.getElementById("chapterFilter"),
    bookmarkOnly: document.getElementById("bookmarkOnly"),
    modeSwitch: document.getElementById("modeSwitch"),
    modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
    staticLabels: Array.from(document.querySelectorAll("[data-i18n]")),
    shuffleBtn: document.getElementById("shuffleBtn"),
    resetBtn: document.getElementById("resetBtn"),
    progressText: document.getElementById("progressText"),
    progressBar: document.getElementById("progressBar"),
    correctText: document.getElementById("correctText"),
    wrongText: document.getElementById("wrongText"),
    accuracyText: document.getElementById("accuracyText"),
    questionCount: document.getElementById("questionCount"),
    tagRow: document.getElementById("tagRow"),
    bookmarkBtn: document.getElementById("bookmarkBtn"),
    questionText: document.getElementById("questionText"),
    choiceList: document.getElementById("choiceList"),
    feedbackBox: document.getElementById("feedbackBox"),
    prevBtn: document.getElementById("prevBtn"),
    submitBtn: document.getElementById("submitBtn"),
    nextBtn: document.getElementById("nextBtn"),
    filteredCount: document.getElementById("filteredCount"),
    questionMap: document.getElementById("questionMap"),
  };

  const initialSubjectId = data.subjects[0] ? data.subjects[0].id : "";
  let state = loadState();
  state.language = normalizeLanguage(state.language);

  function setupSectionTabs() {
    const buttons = Array.from(document.querySelectorAll(".section-tab"));
    const views = Array.from(document.querySelectorAll("[data-section-view]"));
    let savedView = "";
    try {
      savedView = localStorage.getItem("it1140-active-view");
    } catch (_error) {
      // Dùng trang mặc định nếu trình duyệt chặn localStorage.
    }
    const initialView = views.some((view) => view.id === savedView) ? savedView : "quizView";

    function activate(viewId) {
      views.forEach((view) => {
        view.hidden = view.id !== viewId;
      });
      buttons.forEach((button) => {
        const active = button.dataset.view === viewId;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
      });
      const quizActions = document.querySelector(".top-actions");
      if (quizActions) quizActions.hidden = viewId !== "quizView";
      try {
        localStorage.setItem("it1140-active-view", viewId);
      } catch (_error) {
        // Việc ghi nhớ thẻ đang mở là tùy chọn.
      }
      if (viewId === "pythonLabView") window.dispatchEvent(new CustomEvent("python-lab:visible"));
    }

    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.view)));
    activate(initialView);
  }

  function defaultState() {
    return {
      subjectId: initialSubjectId,
      language: "vi",
      mode: "practice",
      chapter: "all",
      query: "",
      bookmarkOnly: false,
      currentIndex: 0,
      answers: {},
      submitted: {},
      examRevealed: {},
      bookmarks: {},
      orders: {},
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      const restored = { ...defaultState(), ...(saved || {}) };
      const subject = data.subjects.find((item) => item.id === restored.subjectId) || data.subjects[0];
      if (!Object.prototype.hasOwnProperty.call(saved || {}, "chapter")) {
        restored.chapter = subject?.topics.find((topic) => topic.id === restored.topic)?.chapter || "all";
      }
      delete restored.topic;
      delete restored.source;
      return restored;
    } catch (_error) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (_error) {
      // Một số chế độ riêng tư có thể chặn localStorage; quiz vẫn tiếp tục hoạt động trong phiên hiện tại.
    }
  }

  function currentSubject() {
    return data.subjects.find((item) => item.id === state.subjectId) || data.subjects[0];
  }

  function normalizeLanguage(language) {
    return supportedLanguages.includes(language) ? language : "vi";
  }

  function dictionary(language = state.language) {
    return i18n[normalizeLanguage(language)] || i18n.vi;
  }

  function t(key, ...args) {
    const value = dictionary()[key] ?? i18n.vi[key] ?? key;
    return typeof value === "function" ? value(...args) : value;
  }

  function mapText(group, id, fallback) {
    const value = dictionary()[group] && dictionary()[group][id];
    const fallbackValue = i18n.vi[group] && i18n.vi[group][id];
    return value || fallbackValue || fallback || id;
  }

  function subjectTitle(subject) {
    return mapText("subjects", subject.id, subject.title);
  }

  function difficultyLabel(level) {
    return mapText("difficulty", level, i18n.vi.difficulty[2]);
  }

  function localizedQuestion(question) {
    return {
      prompt: question.prompt,
      choices: question.choices,
      explanation: question.explanation,
    };
  }

  function chapterForQuestion(subject, question) {
    const topic = subject.topics.find((item) => item.id === question.topic);
    return (subject.chapters || []).find((chapter) => chapter.id === topic?.chapter);
  }

  function fold(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  }

  function questionHaystack(question) {
    const variants = [question.prompt, question.choices.join(" "), question.explanation];
    return fold(
      [
        ...variants,
        question.tags ? question.tags.join(" ") : "",
      ].join(" "),
    );
  }

  function filteredQuestions() {
    const subject = currentSubject();
    if (!subject) return [];

    const query = fold(state.query.trim());
    const base = subject.questions.filter((question) => {
      const matchesChapter = state.chapter === "all" || chapterForQuestion(subject, question)?.id === state.chapter;
      const matchesBookmark = !state.bookmarkOnly || Boolean(state.bookmarks[question.id]);
      const matchesQuery = !query || questionHaystack(question).includes(query);
      return matchesChapter && matchesBookmark && matchesQuery;
    });

    const order = state.orders[subject.id] || [];
    if (!order.length) return base;

    const rank = new Map(order.map((id, index) => [id, index]));
    return base.slice().sort((a, b) => {
      const aRank = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bRank = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  }

  function activeQuestion() {
    const questions = filteredQuestions();
    if (state.currentIndex >= questions.length) state.currentIndex = Math.max(0, questions.length - 1);
    return questions[state.currentIndex];
  }

  function examScopeKey() {
    return `${state.subjectId}:${state.chapter}`;
  }

  function isExamRevealed() {
    return Boolean(state.examRevealed[examScopeKey()]);
  }

  function isRevealed(question) {
    if (!question) return false;
    return state.mode === "review" || Boolean(state.submitted[question.id]) || (state.mode === "exam" && isExamRevealed());
  }

  function isLocked(question) {
    if (!question) return true;
    return state.mode === "review" || Boolean(state.submitted[question.id]) || (state.mode === "exam" && isExamRevealed());
  }

  function setCurrentById(questionId) {
    const questions = filteredQuestions();
    const index = questions.findIndex((question) => question.id === questionId);
    if (index >= 0) {
      state.currentIndex = index;
      render();
    }
  }

  function optionLabel(index) {
    return letters[index] || String(index + 1);
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function applyStaticLanguage() {
    document.documentElement.lang = state.language;
    document.title = t("documentTitle");
    els.staticLabels.forEach((element) => {
      const key = element.dataset.i18n;
      element.textContent = t(key);
    });

    els.searchInput.placeholder = t("searchPlaceholder");
    els.modeSwitch.setAttribute("aria-label", t("modeAria"));
    els.bookmarkBtn.title = t("bookmarkTitle");
    els.bookmarkBtn.setAttribute("aria-label", t("bookmarkTitle"));
    els.shuffleBtn.textContent = t("shuffle");
    els.shuffleBtn.title = t("shuffleTitle");
    els.resetBtn.textContent = t("reset");
    els.resetBtn.title = t("resetTitle");
    els.prevBtn.textContent = t("prev");
    els.nextBtn.textContent = t("next");

    els.modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === state.mode;
      button.textContent = dictionary().modes[button.dataset.mode] || button.dataset.mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

  }

  function populateSubjectSelect() {
    els.subjectSelect.innerHTML = "";
    data.subjects.forEach((subject) => {
      const option = document.createElement("option");
      option.value = subject.id;
      option.textContent = subjectTitle(subject);
      option.selected = subject.id === state.subjectId;
      els.subjectSelect.append(option);
    });
  }

  function populateFilters(subject) {
    const chapters = subject.chapters || [];
    if (!chapters.some((chapter) => chapter.id === state.chapter)) state.chapter = "all";
    els.chapterFilter.innerHTML = "";
    els.chapterFilter.append(new Option(t("allChapters"), "all", state.chapter === "all", state.chapter === "all"));
    chapters.forEach((chapter) => {
      els.chapterFilter.append(new Option(chapter.label, chapter.id, state.chapter === chapter.id, state.chapter === chapter.id));
    });
  }

  function correctAnswers(question) {
    return Array.isArray(question.answer) ? question.answer : [question.answer];
  }

  function selectedAnswers(question) {
    const value = state.answers[question.id];
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  }

  function answerLabel(question) {
    if (question.responseType === "number") return String(question.answer).replace(".", ",");
    const content = localizedQuestion(question);
    return correctAnswers(question)
      .map((index) => `${optionLabel(index)}. ${content.choices[index] || ""}`.trim())
      .join("; ");
  }

  function isAnswered(question) {
    const value = state.answers[question.id];
    if (question.responseType === "number") return parseNumericAnswer(value) !== null;
    return Array.isArray(value) ? value.length > 0 : value !== undefined;
  }

  function answerMatches(question) {
    if (question.responseType === "number") return parseNumericAnswer(state.answers[question.id]) === question.answer;
    const selected = selectedAnswers(question).slice().sort((a, b) => a - b);
    const correct = correctAnswers(question).slice().sort((a, b) => a - b);
    return selected.length === correct.length && selected.every((value, index) => value === correct[index]);
  }

  function parseNumericAnswer(value) {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const text = String(value).trim().replace(",", ".");
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function renderTags(subject, question) {
    els.tagRow.innerHTML = "";
    if (!question) return;

    const chapter = chapterForQuestion(subject, question);
    const tags = [
      ...(chapter ? [{ text: chapter.label, className: "" }] : []),
      { text: difficultyLabel(question.difficulty), className: "" },
    ];

    if (question.kind === "generated") {
      tags.push({ text: t("generatedTag"), className: "generated" });
    }

    if (Array.isArray(question.answer)) {
      tags.push({ text: t("multipleAnswerTag"), className: "generated" });
    }
    if (question.responseType === "number") {
      tags.push({ text: "Điền số", className: "" });
    }

    tags.forEach((tag) => {
      const item = document.createElement("span");
      item.className = `tag ${tag.className}`.trim();
      item.textContent = tag.text;
      els.tagRow.append(item);
    });
  }

  function renderChoices(question) {
    els.choiceList.innerHTML = "";
    if (!question) return;

    const revealed = isRevealed(question);
    if (question.responseType === "number") {
      const label = document.createElement("label");
      label.className = "numeric-answer";
      const title = document.createElement("span");
      title.textContent = "Đáp án";
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "text"; // Keep minus and decimal comma accessible on mobile keyboards.
      input.autocomplete = "off";
      input.spellcheck = false;
      input.value = state.answers[question.id] ?? "";
      input.disabled = isLocked(question);
      if (revealed) input.classList.add(answerMatches(question) ? "is-correct" : "is-wrong");
      input.addEventListener("input", () => {
        if (isLocked(question)) return;
        if (input.value.trim()) state.answers[question.id] = input.value;
        else delete state.answers[question.id];
        input.setAttribute("aria-invalid", String(Boolean(input.value.trim()) && !isAnswered(question)));
        saveState();
        const questions = filteredQuestions();
        renderControls(question, questions);
        renderStats(questions);
        renderMap(questions);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && state.mode === "practice" && !els.submitBtn.disabled) {
          event.preventDefault();
          els.submitBtn.click();
        }
      });
      label.append(title, input);
      els.choiceList.append(label);
      return;
    }
    const selected = selectedAnswers(question);
    const correct = correctAnswers(question);
    const isMultiple = Array.isArray(question.answer);
    const content = localizedQuestion(question);
    content.choices.forEach((choice, index) => {
      const option = document.createElement("label");
      option.className = "choice";
      if (selected.includes(index)) option.classList.add("is-selected");
      if (revealed && correct.includes(index)) option.classList.add("is-correct");
      if (revealed && selected.includes(index) && !correct.includes(index)) option.classList.add("is-wrong");
      if (isLocked(question)) option.classList.add("is-disabled");

      const control = document.createElement("input");
      control.className = "choice-control";
      control.type = isMultiple ? "checkbox" : "radio";
      control.name = `answer-${question.id}`;
      control.checked = selected.includes(index);
      control.disabled = isLocked(question);
      control.setAttribute("aria-label", `${optionLabel(index)}. ${choice}`);

      const letter = document.createElement("span");
      letter.className = "choice-letter";
      letter.textContent = optionLabel(index);

      const text = document.createElement("span");
      text.className = "choice-text";
      text.textContent = choice;

      option.append(control, letter, text);
      option.addEventListener("click", (event) => {
        event.preventDefault();
        if (isLocked(question)) return;
        if (isMultiple) {
          const next = selected.includes(index)
            ? selected.filter((value) => value !== index)
            : [...selected, index].sort((a, b) => a - b);
          if (next.length) state.answers[question.id] = next;
          else delete state.answers[question.id];
        } else {
          state.answers[question.id] = index;
        }
        saveState();
        render();
      });
      els.choiceList.append(option);
    });
  }

  function renderFeedback(question) {
    els.feedbackBox.hidden = true;
    els.feedbackBox.className = "feedback";
    els.feedbackBox.innerHTML = "";

    if (!question || !isRevealed(question)) return;

    const correct = answerMatches(question);
    const content = localizedQuestion(question);
    const title = document.createElement("strong");
    if (correct) {
      title.textContent = t("feedbackCorrect", answerLabel(question));
      els.feedbackBox.classList.add("good");
    } else if (!isAnswered(question)) {
      title.textContent = t("feedbackUnanswered", answerLabel(question));
      els.feedbackBox.classList.add("bad");
    } else {
      title.textContent = t("feedbackWrong", answerLabel(question));
      els.feedbackBox.classList.add("bad");
    }

    const detail = document.createElement("div");
    detail.textContent = content.explanation || "";
    els.feedbackBox.append(title, detail);
    els.feedbackBox.hidden = false;
  }

  function renderStats(questions) {
    let progress = 0;
    let correct = 0;
    let wrong = 0;

    if (state.mode === "exam" && isExamRevealed()) {
      progress = questions.length;
      correct = questions.filter(answerMatches).length;
      wrong = questions.length - correct;
    } else if (state.mode === "exam") {
      progress = questions.filter(isAnswered).length;
    } else if (state.mode === "practice") {
      const checked = questions.filter((question) => state.submitted[question.id]);
      progress = checked.length;
      correct = checked.filter(answerMatches).length;
      wrong = checked.length - correct;
    }

    const totalScored = correct + wrong;
    const accuracy = totalScored ? Math.round((correct / totalScored) * 100) : 0;
    const percent = questions.length ? Math.round((progress / questions.length) * 100) : 0;

    els.progressText.textContent = `${progress}/${questions.length}`;
    els.progressBar.style.width = `${percent}%`;
    els.correctText.textContent = String(correct);
    els.wrongText.textContent = String(wrong);
    els.accuracyText.textContent = `${accuracy}%`;
  }

  function renderMap(questions) {
    els.questionMap.innerHTML = "";
    questions.forEach((question, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-btn";
      button.textContent = String(index + 1);
      if (index === state.currentIndex) button.classList.add("is-current");
      if (isAnswered(question)) button.classList.add("is-answered");
      if (state.mode === "exam" && isExamRevealed()) {
        button.classList.toggle("is-correct", answerMatches(question));
        button.classList.toggle("is-wrong", !answerMatches(question));
      }
      if (state.mode === "practice" && state.submitted[question.id]) {
        button.classList.toggle("is-correct", answerMatches(question));
        button.classList.toggle("is-wrong", !answerMatches(question));
      }
      button.addEventListener("click", () => setCurrentById(question.id));
      els.questionMap.append(button);
    });
  }

  function renderControls(question, questions) {
    els.prevBtn.disabled = state.currentIndex <= 0 || questions.length === 0;
    els.nextBtn.disabled = state.currentIndex >= questions.length - 1 || questions.length === 0;

    if (!question) {
      els.submitBtn.disabled = true;
      els.submitBtn.textContent = t("submitCheck");
      return;
    }

    if (state.mode === "exam") {
      els.submitBtn.textContent = isExamRevealed() ? t("submitExamDone") : t("submitExam");
      els.submitBtn.disabled = isExamRevealed();
      return;
    }

    if (state.mode === "review") {
      els.submitBtn.textContent = t("submitAnswer");
      els.submitBtn.disabled = true;
      return;
    }

    els.submitBtn.textContent = state.submitted[question.id] ? t("submitChecked") : t("submitCheck");
    els.submitBtn.disabled = !isAnswered(question) || Boolean(state.submitted[question.id]);
  }

  function render() {
    const subject = currentSubject();
    if (!subject) return;

    applyStaticLanguage();
    populateSubjectSelect();
    populateFilters(subject);

    const questions = filteredQuestions();
    const question = activeQuestion();
    const content = question ? localizedQuestion(question) : null;

    els.subjectCode.textContent = "IT1140";
    els.subjectTitle.textContent = "Tin học đại cương";
    els.searchInput.value = state.query;
    els.bookmarkOnly.checked = state.bookmarkOnly;

    els.filteredCount.textContent = String(questions.length);
    els.questionCount.textContent = question ? t("questionCount", state.currentIndex + 1, questions.length) : t("questionCountEmpty");
    els.questionText.textContent = content ? content.prompt : t("noQuestion");
    els.bookmarkBtn.classList.toggle("is-active", Boolean(question && state.bookmarks[question.id]));
    els.bookmarkBtn.textContent = question && state.bookmarks[question.id] ? "★" : "☆";

    renderTags(subject, question);
    renderChoices(question);
    renderFeedback(question);
    renderStats(questions);
    renderMap(questions);
    renderControls(question, questions);

    saveState();
  }

  els.subjectSelect.addEventListener("change", (event) => {
    state.subjectId = event.target.value;
    state.currentIndex = 0;
    render();
  });

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.currentIndex = 0;
    render();
  });

  els.chapterFilter.addEventListener("change", (event) => {
    state.chapter = event.target.value;
    state.currentIndex = 0;
    render();
  });

  els.bookmarkOnly.addEventListener("change", (event) => {
    state.bookmarkOnly = event.target.checked;
    state.currentIndex = 0;
    render();
  });

  els.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      render();
    });
  });

  els.shuffleBtn.addEventListener("click", () => {
    const subject = currentSubject();
    const questions = filteredQuestions();
    state.orders[subject.id] = shuffle(questions.map((question) => question.id));
    state.currentIndex = 0;
    render();
  });

  els.resetBtn.addEventListener("click", () => {
    const subject = currentSubject();
    subject.questions.forEach((question) => {
      delete state.answers[question.id];
      delete state.submitted[question.id];
    });
    Object.keys(state.examRevealed).forEach((key) => {
      if (key === subject.id || key.startsWith(`${subject.id}:`)) delete state.examRevealed[key];
    });
    state.currentIndex = 0;
    render();
  });

  els.bookmarkBtn.addEventListener("click", () => {
    const question = activeQuestion();
    if (!question) return;
    if (state.bookmarks[question.id]) {
      delete state.bookmarks[question.id];
    } else {
      state.bookmarks[question.id] = true;
    }
    render();
  });

  els.prevBtn.addEventListener("click", () => {
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    render();
  });

  els.nextBtn.addEventListener("click", () => {
    const questions = filteredQuestions();
    state.currentIndex = Math.min(questions.length - 1, state.currentIndex + 1);
    render();
  });

  els.submitBtn.addEventListener("click", () => {
    const question = activeQuestion();
    if (!question) return;

    if (state.mode === "exam") {
      state.examRevealed[examScopeKey()] = true;
    } else if (state.mode === "practice" && isAnswered(question)) {
      state.submitted[question.id] = true;
    }
    render();
  });

  setupSectionTabs();
  render();

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Trang vẫn hoạt động bình thường nếu trình duyệt không cho phép bộ nhớ đệm ngoại tuyến.
      });
    });
  }
})();
