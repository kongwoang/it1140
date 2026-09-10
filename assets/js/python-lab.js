(function () {
  const storageKey = "it1140-python-lab:v1";
  const runTimeoutMs = 60000;
  const els = {
    list: document.getElementById("exerciseList"),
    count: document.getElementById("exerciseProgress"),
    title: document.getElementById("exerciseTitle"),
    description: document.getElementById("exerciseDescription"),
    task: document.getElementById("exerciseTask"),
    library: document.getElementById("exerciseLibrary"),
    level: document.getElementById("exerciseLevel"),
    editor: document.getElementById("pythonEditor"),
    run: document.getElementById("runPythonBtn"),
    reset: document.getElementById("resetPythonBtn"),
    hint: document.getElementById("toggleHintBtn"),
    hintBox: document.getElementById("exerciseHint"),
    status: document.getElementById("pythonStatus"),
    output: document.getElementById("pythonOutput"),
    tests: document.getElementById("pythonTests"),
    chart: document.getElementById("pythonChart"),
  };

  let exercises = [];
  let currentId = "";
  let worker;
  let activeRunId = 0;
  let timeoutId;
  let state = loadState();

  function loadState() {
    try {
      return {
        code: {},
        completed: {},
        currentId: "",
        ...(JSON.parse(localStorage.getItem(storageKey)) || {}),
      };
    } catch (_error) {
      return { code: {}, completed: {}, currentId: "" };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (_error) {
      // Trình soạn thảo vẫn hoạt động trong phiên nếu localStorage bị chặn.
    }
  }

  function currentExercise() {
    return exercises.find((exercise) => exercise.id === currentId);
  }

  function saveCurrentCode() {
    if (!currentId) return;
    state.code[currentId] = els.editor.value;
    saveState();
  }

  function renderList() {
    els.list.innerHTML = "";
    exercises.forEach((exercise, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "exercise-item";
      button.classList.toggle("is-active", exercise.id === currentId);
      button.classList.toggle("is-complete", Boolean(state.completed[exercise.id]));
      button.innerHTML = `
        <span class="exercise-number">${state.completed[exercise.id] ? "✓" : index + 1}</span>
        <span><strong>${exercise.title}</strong><small>${exercise.library} · ${exercise.level}</small></span>
      `;
      button.addEventListener("click", () => selectExercise(exercise.id));
      els.list.append(button);
    });
    const completed = exercises.filter((exercise) => state.completed[exercise.id]).length;
    els.count.textContent = `${completed}/${exercises.length} hoàn thành`;
  }

  function selectExercise(id) {
    saveCurrentCode();
    currentId = id;
    state.currentId = id;
    saveState();
    const exercise = currentExercise();
    if (!exercise) return;

    els.title.textContent = exercise.title;
    els.description.textContent = exercise.description;
    els.task.textContent = exercise.task;
    els.library.textContent = exercise.library;
    els.level.textContent = exercise.level;
    els.editor.value = state.code[id] ?? exercise.starterCode;
    els.hintBox.textContent = exercise.hint;
    els.hintBox.hidden = true;
    els.hint.textContent = "Xem gợi ý";
    els.output.textContent = "Kết quả chạy mã sẽ xuất hiện tại đây.";
    els.tests.innerHTML = "";
    els.chart.hidden = true;
    els.chart.removeAttribute("src");
    setStatus("Sẵn sàng", "ready");
    renderList();
  }

  function setStatus(text, kind = "ready") {
    els.status.textContent = text;
    els.status.dataset.status = kind;
  }

  function getWorker() {
    if (!worker) {
      worker = new Worker("./assets/js/python-worker.js?v=4", { type: "module" });
      worker.addEventListener("message", handleWorkerMessage);
      worker.addEventListener("error", () => finishWithError("Không khởi động được môi trường Python."));
    }
    return worker;
  }

  function renderTests(results) {
    els.tests.innerHTML = "";
    results.forEach((result) => {
      const item = document.createElement("li");
      item.className = result.passed ? "is-passed" : "is-failed";
      item.textContent = `${result.passed ? "✓" : "×"} ${result.label}${result.error ? ` — ${result.error}` : ""}`;
      els.tests.append(item);
    });
  }

  function handleWorkerMessage(event) {
    const message = event.data;
    if (message.runId !== activeRunId) return;

    if (message.type === "status") {
      setStatus(
        message.status === "loading" ? "Đang khởi động Python…" : "Đang nạp thư viện…",
        "running",
      );
      return;
    }

    clearTimeout(timeoutId);
    els.run.disabled = false;
    if (message.type === "fatal") {
      finishWithError(message.error);
      return;
    }

    const allPassed = !message.error && message.tests.length > 0 && message.tests.every((test) => test.passed);
    els.output.textContent = message.error || message.output || "Chương trình chạy xong nhưng không in ra kết quả.";
    renderTests(message.tests);

    if (message.plot) {
      els.chart.src = `data:image/png;base64,${message.plot}`;
      els.chart.hidden = false;
    }

    if (allPassed) {
      state.completed[currentId] = true;
      setStatus("Hoàn thành", "success");
      saveState();
      renderList();
    } else {
      setStatus(message.error ? "Mã có lỗi" : "Chưa đạt tất cả kiểm tra", "error");
    }
  }

  function finishWithError(message) {
    clearTimeout(timeoutId);
    els.run.disabled = false;
    els.output.textContent = message;
    setStatus("Không thể chạy", "error");
  }

  function runCode() {
    const exercise = currentExercise();
    if (!exercise || els.run.disabled) return;
    saveCurrentCode();
    els.run.disabled = true;
    els.tests.innerHTML = "";
    els.chart.hidden = true;
    els.output.textContent = "Đang chuẩn bị…";
    setStatus("Đang chạy", "running");
    activeRunId += 1;

    getWorker().postMessage({
      type: "run",
      runId: activeRunId,
      code: els.editor.value,
      tests: exercise.tests,
    });

    timeoutId = setTimeout(() => {
      worker?.terminate();
      worker = undefined;
      finishWithError("Chương trình chạy quá 60 giây và đã được dừng. Hãy kiểm tra vòng lặp hoặc tối ưu lại mã.");
    }, runTimeoutMs);
  }

  async function initialize() {
    try {
      const response = await fetch("./data/python-exercises.json");
      if (!response.ok) throw new Error("Không tải được danh sách bài tập.");
      const data = await response.json();
      exercises = data.exercises;
      selectExercise(exercises.some((item) => item.id === state.currentId) ? state.currentId : exercises[0]?.id);
    } catch (error) {
      els.output.textContent = error.message;
      setStatus("Không tải được bài tập", "error");
    }
  }

  els.editor.addEventListener("input", saveCurrentCode);
  els.editor.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runCode();
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const start = els.editor.selectionStart;
      els.editor.setRangeText("    ", start, els.editor.selectionEnd, "end");
      saveCurrentCode();
    }
  });
  els.run.addEventListener("click", runCode);
  els.reset.addEventListener("click", () => {
    const exercise = currentExercise();
    if (!exercise) return;
    els.editor.value = exercise.starterCode;
    delete state.code[exercise.id];
    delete state.completed[exercise.id];
    saveState();
    selectExercise(exercise.id);
  });
  els.hint.addEventListener("click", () => {
    els.hintBox.hidden = !els.hintBox.hidden;
    els.hint.textContent = els.hintBox.hidden ? "Xem gợi ý" : "Ẩn gợi ý";
  });

  initialize();
})();
