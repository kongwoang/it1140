import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "_site"); // Generated Pages artifact only, never the source tree.
const rootFiles = ["index.html", "sw.js", "CNAME", ".nojekyll", "code.pdf"];
const runtimeData = ["manifest.json", "subjects/it1140.json", "python-exercises.json"];
const allowedExerciseKeys = new Set([
  "id", "title", "level", "library", "description", "task", "hint", "tests",
  "section", "browserRunnable", "executionNote", "provenance",
]);
const bank = JSON.parse(await readFile(resolve(root, "data/subjects/it1140.json"), "utf8"));
const python = JSON.parse(await readFile(resolve(root, "data/python-exercises.json"), "utf8"));
assert.equal(bank.questions.length, 2096);
assert.equal(python.exercises.length, 200);
assert.equal(new Set(python.exercises.map(e => e.id)).size, 200);
for (const exercise of python.exercises) {
  assert.ok(Object.keys(exercise).every(key => allowedExerciseKeys.has(key)), `Unexpected public field: ${exercise.id}`);
  if (exercise.id.startsWith("py-extra-")) assert.ok(exercise.tests.length >= 4, `Missing cases: ${exercise.id}`);
}
const pdf = await readFile(resolve(root, "code.pdf"));
assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-", "code.pdf must be the supplied PDF document");

// Explicit allowlist: never copy the repository root, commerce, private sources,
// solutions, credentials or backups into a public Pages artifact.
await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, "data/subjects"), { recursive: true });
for (const file of rootFiles) {
  await cp(resolve(root, file), resolve(out, file));
}
await cp(resolve(root, "assets"), resolve(out, "assets"), { recursive: true });
for (const file of runtimeData) await cp(resolve(root, "data", file), resolve(out, "data", file));

async function audit(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), `Symlink in public artifact: ${path}`);
    if (entry.isDirectory()) {
      assert.ok(["assets", "assets/js", "assets/css", "data", "data/subjects"].includes(path), `Unexpected directory: ${path}`);
      await audit(resolve(dir, entry.name), path + "/");
    } else {
      const expected = [...rootFiles, ...runtimeData.map(file => "data/" + file)];
      assert.ok(expected.includes(path) || /^assets\/(?:js\/[^/]+\.js|css\/[^/]+\.css)$/.test(path), `Unexpected public file: ${path}`);
    }
  }
}
await audit(out);
const html = await readFile(resolve(out, "index.html"), "utf8");
assert.ok(!html.includes("code.pdf"), "The PDF is direct-link only, with no main-page UI entry");
assert.ok((await readFile(resolve(out, "code.pdf"))).equals(pdf), "Published PDF must remain byte-for-byte unchanged");
for (const match of html.matchAll(/(?:src|href)="\.\/([^"?]+\.(?:js|css))(?:\?[^"\s]*)?"/g)) {
  await readFile(resolve(out, match[1]));
}
console.log(`Pages artifact verified: ${bank.questions.length} questions, ${python.exercises.length} Python exercises; no backend or private authoring files.`);
