import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Compare what learners read, without treating Markdown code delimiters as data.
const context = vm.createContext({});
vm.runInContext(await readFile(new URL("../assets/js/question-content.js", import.meta.url), "utf8"), context);
export const plainText = context.IT1140Text.plain;
