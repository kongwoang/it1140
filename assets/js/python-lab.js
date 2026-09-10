(function () {
  const storageKey = "it1140-python-lab:v4";
  const runTimeoutMs = 60000;
  const els = {
    list: document.getElementById("exerciseList"),
    count: document.getElementById("exerciseProgress"),
    title: document.getElementById("exerciseTitle"),
    task: document.getElementById("exerciseTask"),
    library: document.getElementById("exerciseLibrary"),
    level: document.getElementById("exerciseLevel"),
    editor: document.getElementById("pythonEditor"),
    highlight: document.getElementById("pythonHighlight"),
    lineNumbers: document.getElementById("pythonLineNumbers"),
    editorStats: document.getElementById("pythonEditorStats"),
    copy: document.getElementById("copyPythonBtn"),
    download: document.getElementById("downloadPythonBtn"),
    input: document.getElementById("pythonInput"),
    run: document.getElementById("runPythonBtn"),
    runInput: document.getElementById("runPythonInputBtn"),
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

  const pythonKeywords = new Set([
    "and", "as", "assert", "async", "await", "break", "case", "class", "continue", "def", "del",
    "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is",
    "lambda", "match", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while",
    "with", "yield", "True", "False", "None",
  ]);
  const pythonBuiltins = new Set([
    "abs", "all", "any", "bool", "dict", "enumerate", "filter", "float", "input", "int", "len",
    "list", "map", "max", "min", "open", "print", "range", "set", "sorted", "str", "sum", "tuple",
    "zip",
  ]);

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function token(className, value) {
    return `<span class="tok-${className}">${escapeHtml(value)}</span>`;
  }

  function highlightPython(code) {
    let html = "";
    let index = 0;
    while (index < code.length) {
      const character = code[index];
      if (character === "#") {
        const end = code.indexOf("\n", index);
        const value = end === -1 ? code.slice(index) : code.slice(index, end);
        html += token("comment", value);
        index += value.length;
        continue;
      }
      if (character === "'" || character === '"') {
        const quote = character;
        const triple = code.slice(index, index + 3) === quote.repeat(3);
        const marker = triple ? quote.repeat(3) : quote;
        let end = index + marker.length;
        while (end < code.length) {
          if (code[end] === "\\") {
            end += 2;
            continue;
          }
          if (code.slice(end, end + marker.length) === marker) {
            end += marker.length;
            break;
          }
          end += 1;
        }
        html += token("string", code.slice(index, end));
        index = end;
        continue;
      }
      if (/[A-Za-z_]/.test(character)) {
        const match = code.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
        const after = code[index + match.length];
        const className = pythonKeywords.has(match)
          ? "keyword"
          : pythonBuiltins.has(match)
            ? "builtin"
            : after === "(" && /^[A-Za-z_]/.test(match)
              ? "function"
              : "plain";
        html += className === "plain" ? escapeHtml(match) : token(className, match);
        index += match.length;
        continue;
      }
      if (/\d/.test(character) && (index === 0 || !/[A-Za-z_]/.test(code[index - 1]))) {
        const match = code.slice(index).match(/^(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?)/)[0];
        html += token("number", match);
        index += match.length;
        continue;
      }
      if (character === "@") {
        const match = code.slice(index).match(/^@[A-Za-z_][A-Za-z0-9_.]*/);
        if (match) {
          html += token("decorator", match[0]);
          index += match[0].length;
          continue;
        }
      }
      html += escapeHtml(character);
      index += 1;
    }
    return html || "\n";
  }

  function updateEditorChrome() {
    const code = els.editor.value;
    const lineCount = Math.max(1, code.split("\n").length);
    els.highlight.innerHTML = highlightPython(code);
    els.lineNumbers.innerHTML = `<div class="line-number-list">${Array.from({ length: lineCount }, (_, index) => `<span>${index + 1}</span>`).join("")}</div>`;
    els.editorStats.textContent = `${lineCount} dòng · ${code.length} ký tự`;
    syncEditorScroll();
  }

  function syncEditorScroll() {
    els.highlight.style.transform = `translate(${-els.editor.scrollLeft}px, ${-els.editor.scrollTop}px)`;
    const lineNumberList = els.lineNumbers.firstElementChild;
    if (lineNumberList) lineNumberList.style.transform = `translateY(${-els.editor.scrollTop}px)`;
  }

  function setEditorValue(value) {
    els.editor.value = value;
    updateEditorChrome();
  }

  function loadState() {
    try {
      return {
        code: {},
        input: {},
        completed: {},
        currentId: "",
        ...(JSON.parse(localStorage.getItem(storageKey)) || {}),
      };
    } catch (_error) {
      return { code: {}, input: {}, completed: {}, currentId: "" };
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
    state.input[currentId] = els.input.value;
    saveState();
  }

  function renderList() {
    els.list.innerHTML = "";
    let lastSection = "";
    exercises.forEach((exercise, index) => {
      if (exercise.section && exercise.section !== lastSection) {
        const section = document.createElement("div");
        section.className = "exercise-section";
        section.textContent = exercise.section;
        els.list.append(section);
        lastSection = exercise.section;
      }
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
    els.task.textContent = exercise.task;
    els.library.textContent = exercise.library;
    els.level.textContent = exercise.level;
    setEditorValue(state.code[id] ?? "");
    els.input.value = state.input[id] ?? exercise.tests?.[0]?.input ?? "";
    els.hintBox.textContent = exercise.hint;
    els.hintBox.hidden = true;
    els.hint.textContent = "Xem gợi ý";
    els.output.textContent = exercise.browserRunnable === false
      ? (exercise.executionNote || "Bài này cần chạy trên máy có môi trường Python phù hợp.")
      : "Kết quả chạy mã sẽ xuất hiện tại đây.";
    els.tests.innerHTML = "";
    els.chart.hidden = true;
    els.chart.removeAttribute("src");
    els.run.disabled = exercise.browserRunnable === false;
    els.runInput.disabled = exercise.browserRunnable === false;
    if (exercise.browserRunnable === false) {
      const item = document.createElement("li");
      item.className = "is-pending";
      item.textContent = "Bài Turtle: nộp mã và ảnh kết quả sau khi chạy trên máy.";
      els.tests.append(item);
      setStatus("Chạy trên máy", "ready");
    } else {
      setStatus("Sẵn sàng", "ready");
    }
    renderList();
  }

  function setStatus(text, kind = "ready") {
    els.status.textContent = text;
    els.status.dataset.status = kind;
  }

  function getWorker() {
    if (!worker) {
      worker = new Worker("./assets/js/python-worker.js?v=5", { type: "module" });
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
    els.runInput.disabled = false;
    if (message.type === "fatal") {
      finishWithError(message.error);
      return;
    }

    const output = message.output || "";
    els.output.textContent = message.error || output || "Chương trình chạy xong nhưng không in ra kết quả.";
    if (message.mode === "single") {
      els.tests.innerHTML = "";
      const item = document.createElement("li");
      item.className = message.error ? "is-failed" : "is-passed";
      item.textContent = message.error ? "× Chạy input — mã có lỗi" : "✓ Chạy input hiện tại";
      els.tests.append(item);
      setStatus(message.error ? "Mã có lỗi" : "Đã chạy", message.error ? "error" : "success");
    } else {
      const allPassed = !message.error && message.tests.length > 0 && message.tests.every((test) => test.passed);
      renderTests(message.tests);
      if (allPassed) {
        state.completed[currentId] = true;
        setStatus("Hoàn thành", "success");
        saveState();
        renderList();
      } else {
        setStatus(message.error ? "Mã có lỗi" : "Chưa đạt tất cả kiểm tra", "error");
      }
    }

    if (message.plot) {
      els.chart.src = `data:image/png;base64,${message.plot}`;
      els.chart.hidden = false;
    }
  }

  function finishWithError(message) {
    clearTimeout(timeoutId);
    els.run.disabled = false;
    els.runInput.disabled = false;
    els.output.textContent = message;
    setStatus("Không thể chạy", "error");
  }

  function startRun(mode) {
    const exercise = currentExercise();
    if (!exercise || exercise.browserRunnable === false || els.run.disabled) return;
    saveCurrentCode();
    els.run.disabled = true;
    els.runInput.disabled = true;
    els.tests.innerHTML = "";
    els.chart.hidden = true;
    els.output.textContent = "Đang chuẩn bị…";
    setStatus("Đang chạy", "running");
    activeRunId += 1;

    getWorker().postMessage({
      type: "run",
      runId: activeRunId,
      mode,
      code: els.editor.value,
      input: els.input.value,
      files: exercise.tests?.[0]?.files || {},
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

  els.editor.addEventListener("input", () => {
    updateEditorChrome();
    saveCurrentCode();
  });
  els.editor.addEventListener("scroll", syncEditorScroll);
  els.input.addEventListener("input", saveCurrentCode);
  els.editor.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      startRun("tests");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveCurrentCode();
      setStatus("Đã lưu trên thiết bị", "success");
      return;
    }
    const closingBracket = { "(": ")", "[": "]", "{": "}" }[event.key];
    if (closingBracket && els.editor.selectionStart === els.editor.selectionEnd) {
      event.preventDefault();
      const caret = els.editor.selectionStart;
      els.editor.setRangeText(`${event.key}${closingBracket}`, caret, caret, "end");
      els.editor.setSelectionRange(caret + 1, caret + 1);
      updateEditorChrome();
      saveCurrentCode();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const start = els.editor.selectionStart;
      const end = els.editor.selectionEnd;
      const value = els.editor.value;
      if (event.shiftKey) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const remove = value.slice(lineStart, lineStart + 4) === "    " ? 4 : value[lineStart] === " " ? 1 : 0;
        if (remove) {
          els.editor.setRangeText("", lineStart, lineStart + remove, "preserve");
          els.editor.setSelectionRange(Math.max(lineStart, start - remove), Math.max(lineStart, end - remove));
        }
      } else {
        els.editor.setRangeText("    ", start, end, "end");
      }
      updateEditorChrome();
      saveCurrentCode();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const start = els.editor.selectionStart;
      const end = els.editor.selectionEnd;
      const value = els.editor.value;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.slice(lineStart, start);
      const indent = currentLine.match(/^\s*/)[0];
      const extraIndent = currentLine.trimEnd().endsWith(":") ? "    " : "";
      els.editor.setRangeText(`\n${indent}${extraIndent}`, start, end, "end");
      updateEditorChrome();
      saveCurrentCode();
    }
  });
  els.run.addEventListener("click", () => startRun("tests"));
  els.runInput.addEventListener("click", () => startRun("single"));
  els.reset.addEventListener("click", () => {
    const exercise = currentExercise();
    if (!exercise) return;
    setEditorValue("");
    els.input.value = exercise.tests?.[0]?.input ?? "";
    delete state.code[exercise.id];
    delete state.input[exercise.id];
    delete state.completed[exercise.id];
    saveState();
    selectExercise(exercise.id);
  });
  els.copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(els.editor.value);
      setStatus("Đã chép mã", "success");
    } catch (_error) {
      setStatus("Không thể chép mã", "error");
    }
  });
  els.download.addEventListener("click", () => {
    const blob = new Blob([els.editor.value], { type: "text/x-python;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentExercise()?.title.split(" · ")[0] || "bai-python"}.py`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Đã tải file Python", "success");
  });
  els.hint.addEventListener("click", () => {
    els.hintBox.hidden = !els.hintBox.hidden;
    els.hint.textContent = els.hintBox.hidden ? "Xem gợi ý" : "Ẩn gợi ý";
  });

  initialize();
})();
