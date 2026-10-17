"""Independent Python witnesses for authored numerical questions (not uploads)."""
import json
import argparse
import math
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description="Check fixed repository-authored arithmetic witnesses against a selected bank.")
parser.add_argument("--bank", type=Path, default=ROOT / "data/subjects/it1140.json")
args = parser.parse_args()
bank = json.loads(args.bank.read_text(encoding="utf-8"))
questions = {q["id"]: q for q in bank["questions"]}
cases = json.loads((ROOT / "scripts/fixtures/question-bank-calculations.json").read_text(encoding="utf-8"))
errors = []
with tempfile.TemporaryDirectory(prefix="it1140-calculation-check-") as work:
    for case in cases:
        expression = case["expression"]
        program = expression.removeprefix("program:") if expression.startswith("program:") else f"print({expression})"
        result = subprocess.run([sys.executable, "-I", "-c", program], cwd=work, text=True, capture_output=True, timeout=5)
        expected = questions[case["id"]]["answer"]
        try:
            actual = float(result.stdout.strip())
            valid = result.returncode == 0 and math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-12)
        except ValueError:
            valid = False
        if not valid:
            errors.append(f"{case['id']}: expected={expected}, actual={result.stdout!r}, stderr={result.stderr!r}")
if errors:
    print("\n".join(errors), file=sys.stderr)
    raise SystemExit(1)
print(f"OK: {len(cases)} independent numerical/algorithm checks.")
