(function () {
  const storageKey = "it1140-python-lab:v4";
  const runTimeoutMs = 60000;
  const els = {
    list: document.getElementById("exerciseList"),
    count: document.getElementById("exerciseProgress"),
    title: document.getElementById("exerciseTitle"),
    task: document.getElementById("exerciseTask"),
    files: document.getElementById("exerciseFiles"),
    fileContents: document.getElementById("exerciseFileContents"),
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
    warnings: document.getElementById("pythonWarnings"),
    diagnostic: document.getElementById("pythonDiagnostic"),
  };

  let exercises = [];
  let currentId = "";
  let worker;
  let activeRunId = 0;
  let timeoutId;
  let warningTimer;
  let errorLine = null;
  let runningCode = "";
  let selectedTestIndex = 0;
  let editHistory = [], historyIndex = -1;
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
    els.lineNumbers.innerHTML = `<div class="line-number-list">${Array.from({ length: lineCount }, (_, index) => `<span${index + 1 === errorLine ? ' class="error-line"' : ''}>${index + 1}</span>`).join("")}</div>`;
    els.editorStats.textContent = `${lineCount} dòng · ${code.length} ký tự`;
    syncEditorScroll();
    clearTimeout(warningTimer);
    warningTimer = setTimeout(renderWarnings, 350);
  }

  function goToLine(line, column = 1) {
    const lines = els.editor.value.split("\n");
    const index = Math.min(lines.length, Math.max(1, line)) - 1;
    const start = lines.slice(0, index).reduce((sum, text) => sum + text.length + 1, 0);
    els.editor.focus();
    const characterOffset = Array.from(lines[index]).slice(0, Math.max(0, column - 1)).join("").length;
    els.editor.setSelectionRange(start + characterOffset, start + lines[index].length);
    els.editor.scrollTop = Math.max(0, (index - 3) * (parseFloat(getComputedStyle(els.editor).lineHeight) || 24));
    syncEditorScroll();
  }

  function renderWarnings() {
    els.warnings.replaceChildren();
    const issues = IT1140PythonEditor.analyse(els.editor.value).issues;
    for (const issue of issues) {
      const li = document.createElement("li"), button = document.createElement("button");
      button.type = "button"; button.textContent = `Dòng ${issue.line}: ${issue.message}`;
      button.addEventListener("click", () => goToLine(issue.line, issue.column));
      li.append(button); els.warnings.append(li);
    }
    els.warnings.hidden = !issues.length;
  }

  function renderDiagnostic(diagnostic) {
    els.diagnostic.replaceChildren(); els.diagnostic.hidden = !diagnostic;
    errorLine = null;
    if (diagnostic) {
      const info = IT1140PythonErrors.explain(diagnostic);
      const title = document.createElement("strong"), help = document.createElement("p");
      title.textContent = info.title; help.textContent = info.help;
      els.diagnostic.append(title, help);
      if (info.line) {
        const jump = document.createElement("button");jump.type = "button";
        const unchanged = els.editor.value === runningCode;
        jump.textContent = unchanged ? `${info.type} · Dòng ${info.line}${info.column ? `, cột ${info.column}` : ""} — xem mã` : `${info.type} · Dòng ${info.line} trong mã đã chạy (mã hiện tại đã thay đổi)`;
        jump.disabled = !unchanged;
        jump.addEventListener("click", () => goToLine(info.line, info.column || 1));
        els.diagnostic.append(jump);errorLine = unchanged ? info.line : null;
      }
      const details = document.createElement("details"), summary = document.createElement("summary"), pre = document.createElement("pre");
      summary.textContent = "Thông báo Python đầy đủ";pre.textContent = info.traceback || info.detail;
      details.append(summary, pre);els.diagnostic.append(details);
    }
    updateEditorChrome();
  }

  function cancelRun() {
    clearTimeout(timeoutId);activeRunId++;
    worker?.terminate();worker = undefined;
  }

  function syncEditorScroll() {
    els.highlight.style.transform = `translate(${-els.editor.scrollLeft}px, ${-els.editor.scrollTop}px)`;
    const lineNumberList = els.lineNumbers.firstElementChild;
    if (lineNumberList) lineNumberList.style.transform = `translateY(${-els.editor.scrollTop}px)`;
  }

  function setEditorValue(value) {
    els.editor.value = value;
    editHistory = [];historyIndex = -1;rememberEdit();
    updateEditorChrome();
  }

  function rememberEdit() {
    const entry = { value:els.editor.value, start:els.editor.selectionStart, end:els.editor.selectionEnd };
    if (editHistory[historyIndex]?.value === entry.value) {editHistory[historyIndex] = entry;return;}
    editHistory.splice(historyIndex + 1);editHistory.push(entry);
    // Bound memory even when a learner pastes a large program.
    while (editHistory.length > 100 || (editHistory.length > 1 && editHistory.reduce((sum, item) => sum + item.value.length, 0) > 2000000)) editHistory.shift();
    historyIndex = editHistory.length - 1;
  }

  function undoEdit(redo) {
    historyIndex = Math.min(editHistory.length - 1, Math.max(0, historyIndex + (redo ? 1 : -1)));
    const entry = editHistory[historyIndex];if (!entry) return;
    els.editor.value = entry.value;els.editor.setSelectionRange(entry.start, entry.end);
    renderDiagnostic(null);saveCurrentCode();
  }

  function loadState() {
    try {
      return IT1140PythonEditor.normalizeState(JSON.parse(localStorage.getItem(storageKey)));
    } catch (_error) {
      return { code: {}, input: {}, testCase: {}, completed: {}, currentId: "" };
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
    const fold = text => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    const query = fold(document.getElementById("exerciseSearch").value.trim()), sectionFilter = document.getElementById("exerciseSection").value;
    let shown = 0;
    exercises.forEach((exercise, index) => {
      if ((sectionFilter && exercise.section !== sectionFilter) || (query && !fold(exercise.title + " " + exercise.library).includes(query))) return;
      shown++;
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
      const number = document.createElement("span");
      number.className = "exercise-number";
      number.textContent = state.completed[exercise.id] ? "✓" : index + 1;
      const description = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = exercise.title;
      const metadata = document.createElement("small");
      metadata.textContent = `${exercise.library} · ${exercise.level}`;
      description.append(title, metadata);
      button.append(number, description);
      button.addEventListener("click", () => selectExercise(exercise.id));
      els.list.append(button);
    });
    if (!shown) {const empty = document.createElement("p");empty.textContent = "Không có bài phù hợp.";els.list.append(empty);}
    const completed = exercises.filter((exercise) => state.completed[exercise.id]).length;
    els.count.textContent = `${completed}/${exercises.length} hoàn thành`;
  }

  function selectExercise(id) {
    cancelRun();
    renderDiagnostic(null);
    saveCurrentCode();
    currentId = id;
    state.currentId = id;
    saveState();
    const exercise = currentExercise();
    if (!exercise) return;

    els.title.textContent = exercise.title;
    IT1140Text.render(els.task, exercise.task);
    selectedTestIndex = Number.isInteger(state.testCase[id]) && exercise.tests?.[state.testCase[id]] ? state.testCase[id] : 0;
    renderSampleFiles(exercise, selectedTestIndex);
    const samples = document.getElementById("pythonSampleCase");samples.replaceChildren();
    (exercise.tests || []).forEach((test,index) => samples.append(new Option(test.label, String(index))));
    samples.value = String(selectedTestIndex);samples.hidden = !exercise.tests?.length;
    els.library.textContent = exercise.library;
    els.level.textContent = exercise.level;
    setEditorValue(state.code[id] ?? "");
    els.input.value = state.input[id] ?? exercise.tests?.[selectedTestIndex]?.input ?? "";
    IT1140Text.render(els.hintBox, exercise.hint);
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

  function renderSampleFiles(exercise, testIndex = 0) {
    const files = Object.entries(exercise.tests?.[testIndex]?.files || {});
    els.files.hidden = files.length === 0;
    els.files.open = false;
    els.fileContents.replaceChildren();
    for (const [name, content] of files) {
      const title = document.createElement("h3");
      const filename = document.createElement("code");
      filename.textContent = name;
      title.append(filename);
      const pre = document.createElement("pre");
      pre.className = "question-code";
      pre.tabIndex = 0;
      const code = document.createElement("code");
      code.textContent = content || "(Tệp rỗng)";
      pre.append(code);
      els.fileContents.append(title, pre);
    }
  }

  function setStatus(text, kind = "ready") {
    els.status.textContent = text;
    els.status.dataset.status = kind;
  }

  function getWorker() {
    if (!worker) {
      worker = new Worker("./assets/js/python-worker.js?v=6", { type: "module" });
      worker.addEventListener("message", handleWorkerMessage);
      worker.addEventListener("error", () => finishWithError("Không khởi động được môi trường Python."));
    }
    return worker;
  }

  function renderTests(results) {
    els.tests.innerHTML = "";
    results.forEach((result, index) => {
      const item = document.createElement("li");
      item.className = result.passed ? "is-passed" : "is-failed";
      item.textContent = `${result.passed ? "✓" : "×"} ${result.label}${result.error ? ` — ${result.error}` : ""}`;
      if (!result.passed && result.difference) {
        const pre = document.createElement("pre"), d = result.difference;
        pre.textContent = `Dòng đầu tiên khác: ${d.line}\nCần in: ${d.expected}\nĐã in:  ${d.actual}\n${d.help}`;
        item.append(pre);
      }
      if (!result.passed && result.fileDifference) {
        const pre = document.createElement("pre"), d = result.fileDifference;
        pre.textContent = d.missing ? `Chưa tạo tệp: ${d.name}` : d.unreadable ? `Không đọc được tệp ${d.name} dưới dạng văn bản UTF-8.` : `Tệp ${d.name} · Dòng ${d.line || 1}\nCần ghi: ${JSON.stringify(d.expected ?? "")}\nĐã ghi:  ${JSON.stringify(d.actual ?? "")}\n${d.help || ""}`;
        item.append(pre);
      }
      if (!result.passed) {
        const details = document.createElement("details"), summary = document.createElement("summary"), pre = document.createElement("pre");
        summary.textContent = "stdin của ca này";pre.textContent = result.input || "(Không có dữ liệu stdin)";
        details.append(summary, pre);item.append(details);
        const use = document.createElement("button");use.type = "button";use.className = "text-btn";use.textContent = "Dùng dữ liệu ca này";
        use.addEventListener("click", () => selectSample(index));item.append(use);
      }
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
    els.output.textContent = output || (message.error ? "Chương trình dừng vì lỗi." : "Chương trình chạy xong nhưng không in ra kết quả.");
    renderDiagnostic(message.diagnostic);
    if (message.error && !message.diagnostic) els.output.textContent = message.error;
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
      if (allPassed && els.editor.value === runningCode) {
        state.completed[currentId] = true;
        setStatus("Hoàn thành", "success");
        saveState();
        renderList();
      } else if (allPassed) {
        setStatus("Mã đã chạy đạt — mã hiện tại đã thay đổi", "ready");
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
    if (els.editor.value.length > 200000) { finishWithError("Mã vượt 200.000 ký tự. Hãy rút gọn chương trình trước khi chạy.");return; }
    runningCode = els.editor.value;
    renderDiagnostic(null);
    saveCurrentCode();
    els.run.disabled = true;
    els.runInput.disabled = true;
    els.tests.innerHTML = "";
    els.chart.hidden = true;
    els.output.textContent = "Đang chuẩn bị…";
    setStatus("Đang chạy", "running");
    activeRunId += 1;

    try { getWorker().postMessage({
      type: "run",
      runId: activeRunId,
      mode,
      code: els.editor.value,
      input: els.input.value,
      files: exercise.tests?.[selectedTestIndex]?.files || {},
      tests: exercise.tests,
    }); } catch (error) {
      cancelRun();finishWithError("Không khởi động được Python. Hãy tải lại trang hoặc kiểm tra mạng. " + error.message);return;
    }

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
      const sections = document.getElementById("exerciseSection");
      for (const section of new Set(exercises.map(e => e.section).filter(Boolean))) sections.append(new Option(section, section));
      selectExercise(exercises.some((item) => item.id === state.currentId) ? state.currentId : exercises[0]?.id);
    } catch (error) {
      els.output.textContent = error.message;
      setStatus("Không tải được bài tập", "error");
    }
  }

  els.editor.addEventListener("input", () => {
    renderDiagnostic(null);
    updateEditorChrome();
    saveCurrentCode();
    rememberEdit();
  });
  els.editor.addEventListener("scroll", syncEditorScroll);
  els.input.addEventListener("input", saveCurrentCode);
  function selectSample(index) {
    const exercise = currentExercise(), test = exercise?.tests?.[index];if (!test) return;
    selectedTestIndex = index;state.testCase[currentId] = index;
    document.getElementById("pythonSampleCase").value = String(index);
    els.input.value = test.input || "";renderSampleFiles(exercise, index);saveCurrentCode();
  }
  document.getElementById("pythonSampleCase").addEventListener("change", event => selectSample(Number(event.target.value)));
  document.getElementById("exerciseSearch").addEventListener("input", renderList);
  document.getElementById("exerciseSection").addEventListener("change", renderList);
  els.editor.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "Escape") {event.preventDefault();els.editor.blur();return;}
    if ((event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase())) {
      event.preventDefault();undoEdit(event.key.toLowerCase() === "y" || event.shiftKey);return;
    }
    rememberEdit();
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
    if (event.isComposing || event.altKey) return;
    const value = els.editor.value, start = els.editor.selectionStart, end = els.editor.selectionEnd;
    let edit;
    if ((event.ctrlKey || event.metaKey) && event.key === "/") edit = IT1140PythonEditor.comment(value, start, end);
    else if (event.ctrlKey || event.metaKey) return;
    else if (event.key === "Tab") edit = IT1140PythonEditor.indent(value, start, end, event.shiftKey);
    else if (event.key === "Enter") edit = IT1140PythonEditor.enter(value, start, end);
    else if (event.key === "Backspace") edit = IT1140PythonEditor.backspace(value, start, end);
    else if (event.key.length === 1) edit = IT1140PythonEditor.pair(value, start, end, event.key);
    if (edit) { event.preventDefault(); applyEdit(edit); }
  });
  function applyEdit(edit) {
    // Change the smallest range, preserving textarea scroll and browser edit history
    // where supported, rather than replacing the whole document for every key.
    const value = els.editor.value;let from = 0, oldEnd = value.length, newEnd = edit.value.length;
    while (from < oldEnd && from < newEnd && value[from] === edit.value[from]) from++;
    while (oldEnd > from && newEnd > from && value[oldEnd - 1] === edit.value[newEnd - 1]) { oldEnd--;newEnd--; }
    els.editor.setRangeText(edit.value.slice(from, newEnd), from, oldEnd, "preserve");
    els.editor.setSelectionRange(edit.start, edit.end);els.editor.focus();
    renderDiagnostic(null);updateEditorChrome();saveCurrentCode();
    rememberEdit();
  }
  for (const [id, remove] of [["indentPythonBtn", false], ["outdentPythonBtn", true]]) document.getElementById(id).addEventListener("click", () => applyEdit(IT1140PythonEditor.indent(els.editor.value, els.editor.selectionStart, els.editor.selectionEnd, remove)));
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
    delete state.testCase[exercise.id];
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
