import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs";

const PYODIDE_VERSION = "314.0.6";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = loadPyodide({ indexURL: PYODIDE_BASE_URL });

async function getPyodide() {
  return pyodidePromise;
}

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "run") return;

  const { runId, code, tests } = event.data;
  try {
    self.postMessage({ type: "status", runId, status: "loading" });
    const pyodide = await getPyodide();

    self.postMessage({ type: "status", runId, status: "packages" });
    await pyodide.loadPackagesFromImports(code);
    pyodide.globals.set("_lab_user_code", code);

    await pyodide.runPythonAsync(`
import contextlib
import io
import sys
import traceback

if "matplotlib.pyplot" in sys.modules:
    import matplotlib.pyplot as plt
    plt.close("all")

_lab_scope = {"__name__": "__main__"}
_lab_buffer = io.StringIO()
_lab_error = ""
try:
    with contextlib.redirect_stdout(_lab_buffer), contextlib.redirect_stderr(_lab_buffer):
        exec(_lab_user_code, _lab_scope)
except Exception:
    _lab_error = traceback.format_exc()
_lab_output = _lab_buffer.getvalue()
`);

    const error = pyodide.globals.get("_lab_error");
    const output = pyodide.globals.get("_lab_output");
    const testResults = [];

    if (!error) {
      for (const test of tests) {
        pyodide.globals.set("_lab_test_code", test.code);
        await pyodide.runPythonAsync(`
_lab_test_passed = False
_lab_test_error = ""
try:
    exec(_lab_test_code, _lab_scope)
    _lab_test_passed = True
except Exception as exc:
    _lab_test_error = str(exc) or exc.__class__.__name__
`);
        testResults.push({
          label: test.label,
          passed: Boolean(pyodide.globals.get("_lab_test_passed")),
          error: String(pyodide.globals.get("_lab_test_error") || ""),
        });
      }
    }

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

    self.postMessage({
      type: "result",
      runId,
      output: String(output || ""),
      error: String(error || ""),
      tests: testResults,
      plot: String(pyodide.globals.get("_lab_plot") || ""),
    });
  } catch (error) {
    self.postMessage({ type: "fatal", runId, error: error?.message || String(error) });
  }
});
