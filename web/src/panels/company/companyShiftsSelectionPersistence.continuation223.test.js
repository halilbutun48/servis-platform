import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourcePath = join(dirname(fileURLToPath(import.meta.url)), "ShiftsPanel.jsx");
const source = readFileSync(sourcePath, "utf8");

test("company shift selection is tenant and user scoped across refresh", () => {
  assert.match(source, /company:selectedShiftId:\$\{companyKey\}:\$\{String\(me\?\.id \?\? "session"\)\}/);
  assert.match(source, /localStorage\.setItem\(selectedShiftStorageKey, String\(shiftId\)\)/);
  assert.match(source, /localStorage\.getItem\(selectedShiftStorageKey\)/);
  assert.match(source, /setFocusedTrackShiftId=\{setFocusedCompanyShiftId\}/);
});
