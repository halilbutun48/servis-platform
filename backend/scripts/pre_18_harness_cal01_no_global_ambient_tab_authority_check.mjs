/* CAL-01 semantic tab identity may not fall back to merged tab textContent. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const redMode = process.argv.includes("--red");
const source = await fs.readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "lib", "pre_18_browser_semantic_descriptor.mjs"), "utf8");
try {
  assert.equal(source.includes("activeTab?.textContent"), false, "CAL01_GLOBAL_AMBIENT_TAB_TEXTCONTENT_FALLBACK_PRESENT");
  assert.equal(source.includes("tabSemanticLabel"), true, "CAL01_TARGET_SCOPED_TAB_SEMANTIC_EXTRACTOR_MISSING");
  console.log("PRE_18_HARNESS_CAL01_NO_GLOBAL_AMBIENT_TAB_AUTHORITY_CHECK=PASS");
} catch (error) {
  console.log(`FAIL CAL01-RED-12 target-scoped tab identity excludes merged ambient text: ${error.message}`);
  console.log(JSON.stringify({ CAL01_AMBIENT_TAB_RED_TEST_COUNT: 1, CAL01_AMBIENT_TAB_RED_OBSERVED_COUNT: 1, CAL01_AMBIENT_TAB_RED_UNEXPECTED_PASS_COUNT: 0 }));
  if (redMode) process.exitCode = 1;
  else process.exitCode = 1;
}
