"""Execute repository-authored quiz snippets; never run arbitrary uploaded banks here."""
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
cases = json.loads((ROOT / "scripts/fixtures/python-quiz-cases.json").read_text(encoding="utf-8"))
bank = json.loads((ROOT / "data/subjects/it1140.json").read_text(encoding="utf-8"))
questions = {q["id"]: q for q in bank["questions"]}
errors = []
with tempfile.TemporaryDirectory(prefix="it1140-quiz-test-") as working_dir:
    for case in cases:
        q = questions[case["id"]]
        expected = q["answer"] if q["responseType"] == "number" else q["choices"][q["answer"]]
        try:
            result = subprocess.run(
                [sys.executable, "-I", "-c", case["code"]],
                cwd=working_dir, capture_output=True, text=True, encoding="utf-8", timeout=10,
            )
            actual = result.stdout.rstrip("\r\n")
            if case.get("numeric"):
                matches = math.isclose(float(actual), float(expected), rel_tol=1e-9, abs_tol=1e-9)
            else:
                matches = actual == expected
            if result.returncode or not matches:
                errors.append(f"{case['id']}: expected={expected!r}, actual={actual!r}, stderr={result.stderr!r}")
        except (subprocess.TimeoutExpired, ValueError) as error:
            errors.append(f"{case['id']}: {error}")
if errors:
    print("\n".join(errors), file=sys.stderr)
    raise SystemExit(1)
print(f"OK: {len(cases)} Python/NumPy snippets match the published answers.")
