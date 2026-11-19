import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourcePath = join(dirname(fileURLToPath(import.meta.url)), "AgreementsPanel.jsx");
const source = readFileSync(sourcePath, "utf8");

test("room agreements persists the selected agreement across refresh", () => {
  assert.match(source, /ROOM_AGREEMENT_SELECTION_KEY\s*=\s*["']psv1:room:agreements:selected:v1["']/);
  assert.match(source, /useState\(readPersistedRoomAgreementId\)/);
  assert.match(source, /sessionStorage\.setItem\(ROOM_AGREEMENT_SELECTION_KEY, String\(selectedAgreementId\)\)/);
  assert.match(source, /sessionStorage\.removeItem\(ROOM_AGREEMENT_SELECTION_KEY\)/);
});

test("room agreement bridge exposes the existing ROOM income action", () => {
  assert.match(source, /roomSummaryMode\s*\n\s*collectionEnabled\s*\n\s*periodStart/);
});
