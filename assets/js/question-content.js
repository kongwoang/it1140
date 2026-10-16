// Only fenced code and inline backticks are supported. Bank text is never HTML.
(function (root) {
  function inlineParts(value) {
    const parts = [];
    let cursor = 0;
    let index = 0;
    while (index < value.length) {
      const start = value.indexOf("`", index);
      if (start < 0) break;
      let end = start;
      while (value[end] === "`") end++;
      const size = end - start;
      let closing = end;
      let found = false;
      while ((closing = value.indexOf("`", closing)) >= 0) {
        let closingEnd = closing;
        while (value[closingEnd] === "`") closingEnd++;
        if (closingEnd - closing === size) {
          if (start > cursor) parts.push({ type: "text", text: value.slice(cursor, start) });
          parts.push({ type: "code", text: value.slice(end, closing) });
          cursor = closingEnd;
          index = closingEnd;
          found = true;
          break;
        }
        closing = closingEnd;
      }
      if (!found) index = end;
    }
    if (cursor < value.length) parts.push({ type: "text", text: value.slice(cursor) });
    return parts;
  }

  function blocks(value) {
    const parts = [];
    const lines = String(value).split("\n");
    let prose = [];
    function flush() {
      if (prose.length) parts.push({ type: "text", text: prose.join("\n") });
      prose = [];
    }
    for (let i = 0; i < lines.length; i++) {
      const opening = lines[i].match(/^(`{3,})([a-z0-9-]*)\s*$/i);
      if (!opening) { prose.push(lines[i]); continue; }
      const closing = lines.findIndex((line, n) => n > i && line === opening[1]);
      if (closing < 0) { prose.push(lines[i]); continue; }
      flush();
      parts.push({ type: "code", language: opening[2], text: lines.slice(i + 1, closing).join("\n") });
      i = closing;
    }
    flush();
    return parts;
  }

  function plain(value) {
    return blocks(value).map(part => part.type === "code" ? part.text : inlineParts(part.text).map(p => p.text).join("")).join("\n");
  }

  function appendInline(element, value) {
    for (const part of inlineParts(value)) {
      const node = document.createElement(part.type === "code" ? "code" : "span");
      node.textContent = part.text;
      element.append(node);
    }
  }

  function render(element, value, { heading = false, code = false, inline = false } = {}) {
    element.replaceChildren();
    if (code) {
      const node = document.createElement("code");
      node.className = "answer-code";
      node.textContent = value;
      element.append(node);
      return;
    }
    if (inline) { appendInline(element, value); return; }
    let first = true;
    for (const part of blocks(value)) {
      if (part.type === "code") {
        const pre = document.createElement("pre");
        pre.className = "question-code";
        pre.tabIndex = 0;
        pre.setAttribute("aria-label", part.language === "python" ? "Mã Python" : "Mã hoặc dữ liệu");
        const node = document.createElement("code");
        node.textContent = part.text;
        pre.append(node);
        element.append(pre);
      } else if (part.text.trim()) {
        const node = document.createElement(heading && first ? "h2" : "p");
        appendInline(node, part.text.trim());
        element.append(node);
      }
      if (part.text.trim()) first = false;
    }
  }

  root.IT1140Text = { blocks, inlineParts, plain, render };
})(globalThis);
