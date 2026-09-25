/* CAL-01 suffix-boundary RED -> GREEN guard. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const redMode = process.argv.includes("--red");
const sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "lib", "pre_18_room_canonical_replay_selection_profile.mjs");
const source = await fs.readFile(sourcePath, "utf8");

// Presentation badges are concatenated directly to the last label character
// by legacy textContent capture. A semantic label with a space before a number
// is not the same representation and must remain strict/exact.
const attachedBadgeOnly = /captured\.replace\(\/\(\?<=\\p\{L\}\)\\d\+\$\/u/u.test(source);
try {
  assert.equal(attachedBadgeOnly, true, "CAL01_TAB_IDENTITY_SUFFIX_BOUNDARY_MISSING:only directly-attached numeric badge text may be stripped");
  console.log("PRE_18_HARNESS_CAL01_TAB_IDENTITY_SUFFIX_BOUNDARY_CHECK=PASS");
} catch (error) {
  console.log(`FAIL CAL01-RED-11 attached badge suffix boundary: ${error.message}`);
  console.log(JSON.stringify({ CAL01_SUFFIX_RED_TEST_COUNT: 1, CAL01_SUFFIX_RED_OBSERVED_COUNT: 1, CAL01_SUFFIX_RED_UNEXPECTED_PASS_COUNT: 0 }));
  process.exitCode = 1;
}
