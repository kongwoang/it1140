import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs";

const PYODIDE_VERSION = "314.0.6";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = loadPyodide({ indexURL: PYODIDE_BASE_URL });

function text(value) {
  return value == null ? "" : String(value);
}

function normalize(value) {
  return text(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+$/gm, "").trimEnd();
}

async function getPyodide() {
  return pyodidePromise;
}

async function executeCase(pyodide, code, input, files, cleanupNames, checks) {
  pyodide.globals.set("_lab_user_code", code);
  pyodide.globals.set("_lab_input_text", input || "");
  pyodide.globals.set("_lab_files_json", JSON.stringify(files || {}));
  pyodide.globals.set("_lab_cleanup_json", JSON.stringify(cleanupNames || []));
  pyodide.globals.set("_lab_checks_json", JSON.stringify(checks || []));

  await pyodide.runPythonAsync(`
import builtins
import contextlib
import io
import json
import os
import sys
import traceback

_lab_files = json.loads(_lab_files_json)
for _lab_name in json.loads(_lab_cleanup_json):
    try:
        if os.path.isfile(_lab_name):
            os.remove(_lab_name)
    except OSError:
        pass
for _lab_name, _lab_content in _lab_files.items():
    _lab_parent = os.path.dirname(_lab_name)
    if _lab_parent:
        os.makedirs(_lab_parent, exist_ok=True)
    with open(_lab_name, "w", encoding="utf-8") as _lab_file:
        _lab_file.write(_lab_content)

if "matplotlib.pyplot" in sys.modules:
    import matplotlib.pyplot as plt
    plt.close("all")

_lab_scope = {"__name__": "__main__"}
_lab_stdin = io.StringIO(_lab_input_text)
_lab_buffer = io.StringIO()
_lab_error = ""
_lab_check_error = ""
_lab_original_input = builtins.input

def _lab_input(_lab_prompt=""):
    _lab_line = _lab_stdin.readline()
    if _lab_line == "":
        raise EOFError("Không còn dữ liệu đầu vào")
    return _lab_line.rstrip("\\n")

try:
    builtins.input = _lab_input
    with contextlib.redirect_stdout(_lab_buffer), contextlib.redirect_stderr(_lab_buffer):
        exec(_lab_user_code, _lab_scope)
except Exception:
    _lab_error = traceback.format_exc()
finally:
    builtins.input = _lab_original_input

if not _lab_error:
    for _lab_check in json.loads(_lab_checks_json):
        try:
            exec(_lab_check, _lab_scope)
        except Exception as _lab_exc:
            _lab_check_error = str(_lab_exc) or _lab_exc.__class__.__name__
            break

_lab_file_results = {}
for _lab_name in json.loads(_lab_cleanup_json):
    if os.path.isfile(_lab_name):
        try:
            with open(_lab_name, "r", encoding="utf-8") as _lab_file:
                _lab_file_results[_lab_name] = _lab_file.read()
        except (OSError, UnicodeDecodeError):
            _lab_file_results[_lab_name] = None

_lab_output = _lab_buffer.getvalue()
_lab_file_results_json = json.dumps(_lab_file_results, ensure_ascii=False)
`);

  const output = text(pyodide.globals.get("_lab_output"));
  const error = text(pyodide.globals.get("_lab_error"));
  const checkError = text(pyodide.globals.get("_lab_check_error"));
  const fileResults = JSON.parse(text(pyodide.globals.get("_lab_file_results_json") || "{}"));
  return { output, error, checkError, fileResults };
}

async function capturePlot(pyodide) {
  await pyodide.runPythonAsync(`
import base64
import io
import sys

_lab_plot = ""
if "matplotlib.pyplot" in sys.modules:
    import matplotlib.pyplot as plt
    if plt.get_fignums():
        _lab_chart_buffer = io.BytesIO()
        plt.gcf().savefig(_lab_chart_buffer, format="png", bbox_inches="tight", dpi=120)
        _lab_plot = base64.b64encode(_lab_chart_buffer.getvalue()).decode("ascii")
`);
  return text(pyodide.globals.get("_lab_plot"));
}

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "run") return;

  const { runId, code, tests = [], mode = "tests", input = "", files = {} } = event.data;
  try {
    self.postMessage({ type: "status", runId, status: "loading" });
    const pyodide = await getPyodide();

    self.postMessage({ type: "status", runId, status: "packages" });
    await pyodide.loadPackagesFromImports(code);

    const cases = mode === "single" ? [{ label: "Chạy input hiện tại", input, files, output: "", checks: [] }] : tests;
    const cleanupNames = [...new Set(cases.flatMap((test) => [
      ...Object.keys(test.files || {}),
      ...Object.keys(test.expectedFiles || {}),
    ]))];
    const results = [];
    let lastOutput = "";
    let firstError = "";

    for (const test of cases) {
      const result = await executeCase(pyodide, code, test.input || "", test.files || {}, cleanupNames, test.checks || []);
      lastOutput = result.output;
      if (result.error && !firstError) firstError = result.error;
      const expectedOutput = test.output || "";
      const outputPassed = normalize(result.output) === normalize(expectedOutput);
      const expectedFiles = test.expectedFiles || {};
      const filesPassed = Object.entries(expectedFiles).every(([name, expected]) => (
        Object.prototype.hasOwnProperty.call(result.fileResults, name)
        && normalize(result.fileResults[name]) === normalize(expected)
      ));
      const passed = !result.error && !result.checkError && outputPassed && filesPassed;
      const detail = result.error || result.checkError || (
        !outputPassed ? `Đầu ra nhận được: ${normalize(result.output) || "(rỗng)"}` : ""
      ) || (!filesPassed ? "Nội dung tệp sinh ra chưa đúng." : "");
      results.push({ label: test.label, passed, error: detail });
    }

    const plot = await capturePlot(pyodide);
    self.postMessage({
      type: "result",
      runId,
      mode,
      output: lastOutput,
      error: firstError,
      tests: results,
      plot,
    });
  } catch (error) {
    self.postMessage({ type: "fatal", runId, error: error?.message || String(error) });
  }
});
