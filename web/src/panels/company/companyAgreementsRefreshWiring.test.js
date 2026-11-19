import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const panelDir = path.dirname(currentFile);
const overviewSource = fs.readFileSync(path.join(panelDir, "companyAgreementsOverviewSection.jsx"), "utf8");
const wizardSource = fs.readFileSync(path.join(panelDir, "AgreementWizard.jsx"), "utf8");

test("COMPANY sözleşme yenileme düğmesi DOM olayını AbortSignal diye iletmez", () => {
  assert.match(overviewSource, /onClick=\{\(\) => onReload\?\.\(\)\}/);
  assert.doesNotMatch(overviewSource, /onClick=\{onReload\}/);
});

test("COMPANY sözleşme taslak firmaları yenilemesi DOM olayını AbortSignal diye iletmez", () => {
  assert.match(wizardSource, /onClick=\{\(\) => onReloadRooms\?\.\(\)\}/);
  assert.doesNotMatch(wizardSource, /onClick=\{onReloadRooms\}/);
});
