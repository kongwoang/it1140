import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs";
import "./python-errors.js";

const PYODIDE_VERSION = "314.0.6";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = loadPyodide({ indexURL: PYODIDE_BASE_URL });

function text(value) {
  return value == null ? "" : String(value);
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
${globalThis.IT1140PythonErrors.pythonHelpers}

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

_lab_scope = {"__name__": "__main__", "__file__": "main.py", "__package__": None}
_lab_stdin = io.StringIO(_lab_input_text, newline=None)
_lab_buffer = _IT1140Output()
_lab_error = ""
_lab_diagnostic = None
_lab_check_error = ""
_lab_original_input = builtins.input
_lab_original_stdin = sys.stdin
_lab_original_argv = sys.argv
_lab_original_cwd = os.getcwd()

def _lab_input(_lab_prompt="", /):
    print(_lab_prompt, end="")
    _lab_line = _lab_stdin.readline()
    if _lab_line == "":
        raise EOFError("Không còn dữ liệu đầu vào")
    return _lab_line.rstrip("\\n")

try:
    builtins.input = _lab_input
    sys.stdin = _lab_stdin
    sys.argv = ["main.py"]
    with contextlib.redirect_stdout(_lab_buffer), contextlib.redirect_stderr(_lab_buffer):
        exec(compile(_lab_user_code, "main.py", "exec"), _lab_scope)
except BaseException as _lab_exc:
    if not (isinstance(_lab_exc, SystemExit) and _lab_exc.code in (None, 0)):
        _lab_diagnostic = _it1140_diagnostic(_lab_exc, _lab_user_code)
        _lab_error = _lab_diagnostic["traceback"]
finally:
    builtins.input = _lab_original_input
    sys.stdin = _lab_original_stdin
    sys.argv = _lab_original_argv
    os.chdir(_lab_original_cwd)

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
                _lab_file_results[_lab_name] = _lab_file.read(1000001)
        except (OSError, UnicodeDecodeError):
            _lab_file_results[_lab_name] = None

_lab_output = _lab_buffer.getvalue()
_lab_file_results_json = json.dumps(_lab_file_results, ensure_ascii=False)
_lab_diagnostic_json = json.dumps(_lab_diagnostic, ensure_ascii=False)
`);

  const output = text(pyodide.globals.get("_lab_output"));
  const error = text(pyodide.globals.get("_lab_error"));
  const checkError = text(pyodide.globals.get("_lab_check_error"));
  const fileResults = JSON.parse(text(pyodide.globals.get("_lab_file_results_json") || "{}"));
  const diagnostic = JSON.parse(text(pyodide.globals.get("_lab_diagnostic_json") || "null"));
  return { output, error, checkError, fileResults, diagnostic };
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

    // Compile before import discovery: syntax errors should point to the learner's
    // file, not an internal Pyodide/package-loader traceback.
    pyodide.globals.set("_lab_user_code", code);
    await pyodide.runPythonAsync(`${globalThis.IT1140PythonErrors.pythonHelpers}
import json
try:
    compile(_lab_user_code, "main.py", "exec")
    _lab_syntax_json = "null"
except SyntaxError as exc:
    _lab_syntax_json = json.dumps(_it1140_diagnostic(exc, _lab_user_code), ensure_ascii=False)
`);
    const syntax = JSON.parse(text(pyodide.globals.get("_lab_syntax_json")));
    if (syntax) {
      self.postMessage({ type: "result", runId, mode, output: "", error: syntax.traceback, diagnostic: syntax, tests: [], plot: "" });
      return;
    }

    self.postMessage({ type: "status", runId, status: "packages" });
    await pyodide.loadPackagesFromImports(code);
    self.postMessage({ type: "status", runId, status: "running" });

    const cases = mode === "single" ? [{ label: "Chạy input hiện tại", input, files, output: "", checks: [] }] : tests;
    // Single-case runs must also remove other samples' files: otherwise a
    // previously present source would remain when selecting a "missing file" case.
    const cleanupNames = globalThis.IT1140PythonErrors.caseFileNames([...tests, ...cases]);
    const results = [];
    let lastOutput = "";
    let firstError = "";
    let diagnostic = null;

    for (const test of cases) {
      const result = await executeCase(pyodide, code, test.input || "", test.files || {}, cleanupNames, test.checks || []);
      lastOutput = result.output;
      if (result.error && !firstError) { firstError = result.error; diagnostic = result.diagnostic; }
      results.push(globalThis.IT1140PythonErrors.compareCase(result,test,mode));
      if (result.error) break;
    }

    const plot = await capturePlot(pyodide);
    self.postMessage({
      type: "result",
      runId,
      mode,
      output: lastOutput,
      error: firstError,
      diagnostic,
      tests: results,
      plot,
    });
  } catch (error) {
    self.postMessage({ type: "fatal", runId, error: error?.message || String(error) });
  }
});
