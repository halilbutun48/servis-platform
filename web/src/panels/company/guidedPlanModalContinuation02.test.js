import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { buildGuidedBulkReorderPlan } from "./guidedPlanBulkReorder.js";
import { guidedPlanStepTitle, guidedPlanHubSavedMessage } from "./guidedPlanRoleCopy.js";

const css = fs.readFileSync(new URL("../../index.css", import.meta.url), "utf8");
const shiftPeopleSections = fs.readFileSync(new URL("./shiftPeopleTabSections.jsx", import.meta.url), "utf8");
const shiftPeopleTable = fs.readFileSync(new URL("../../components/ShiftPersonelTable.jsx", import.meta.url), "utf8");
const destinationCards = fs.readFileSync(new URL("./guidedPlanModalDestinationCards.jsx", import.meta.url), "utf8");

test("SCHOOL guided plan uses school location language", () => {
  assert.equal(guidedPlanStepTitle(0, "öğrenci", { organization: false, school: true }), "1) Okul konumu");
});

test("SCHOOL guided plan reports the saved school location in role language", () => {
  assert.equal(
    guidedPlanHubSavedMessage({ organization: false, school: true }),
    "Okul konumu kaydedildi.",
  );
});

test("guided plan moves the avatar launcher out of the primary action lane", () => {
  assert.match(
    css,
    /body:has\(\.guidedPlanModalContent--primary\) \.copilotLauncherStack[\s\S]*?top:\s*max\(16px, env\(safe-area-inset-top\)\)/,
  );
  assert.match(
    css,
    /body:has\(\.guidedPlanModalContent--primary\) \.copilotLauncherStack[\s\S]*?right:\s*calc\(max\(18px, env\(safe-area-inset-right\)\) \+ 84px\)\s*!important[\s\S]*?bottom:\s*auto\s*!important/,
  );
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?body:has\(\.guidedPlanModalContent--primary\) \.copilotLauncherStack[\s\S]*?right:\s*calc\(max\(12px, env\(safe-area-inset-right\)\) \+ 72px\)\s*!important/,
  );
});

test("guided plan keeps the launcher behind the modal action surface", () => {
  assert.match(
    css,
    /body:has\(\.guidedPlanModalContent--primary\) \.copilotLauncherStack[\s\S]*?z-index:\s*9050/,
  );
});

test("personel ve durak çalışma alanı dar ekranda tek sütuna iner", () => {
  assert.match(shiftPeopleSections, /className="shiftPeopleOverviewGrid"/);
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?\.shiftPeopleOverviewGrid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/,
  );
  assert.match(css, /\.shiftPeopleOverviewGrid \.tbl\s*\{[\s\S]*?min-width:\s*620px/);
});

test("guided plan student list stays readable and file input fits on narrow screens", () => {
  assert.match(shiftPeopleSections, /className="card shiftPeopleImportCard"/);
  assert.match(shiftPeopleSections, /className="card shiftPeopleListCard"/);
  assert.match(shiftPeopleTable, /className="tbl shiftPeopleTable"/);
  assert.match(css, /\.shiftPeopleImportCard input\[type="file"\][\s\S]*?width:\s*100%/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.shiftPeopleTable\s+thead\s*\{[\s\S]*?display:\s*none/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.shiftPeopleTable\s+td::before\s*\{[\s\S]*?content:/);
});

test("guided plan mobile form fields and organization destinations stay inside the card", () => {
  assert.match(shiftPeopleSections, /className="card shiftPeopleImportCard"/);
  assert.match(shiftPeopleSections, /className="shiftPeopleImportModeField"/);
  assert.match(destinationCards, /className="card guidedDestinationRowCard"/);
  assert.match(destinationCards, /className="card guidedOrganizationPlanCard"/);
  assert.match(destinationCards, /className="guidedOrganizationSummaryGrid"/);
  assert.match(destinationCards, /className="guidedDestinationFields"/);
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?\.shiftPeopleImportCard \.shiftPeopleImportModeField\s*\{[\s\S]*?min-width:\s*0\s*!important/,
  );
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?\.guidedDestinationFields\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/,
  );
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?\.guidedOrganizationPlanCard\s*\{[\s\S]*?overflow-x:\s*hidden\s*!important/,
  );
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?\.guidedOrganizationSummaryGrid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/,
  );
});

test("toplu rota sıralaması durak üretiminden sonra taze taslakları kullanır", () => {
  const staleDrafts = [{ id: 21, stops: [] }];
  const refreshedDrafts = [{
    id: 21,
    stops: [{ id: 301, lat: 41.031, lng: 29.001 }, { id: 302, lat: 41.045, lng: 29.015 }],
  }];

  assert.deepEqual(
    buildGuidedBulkReorderPlan({ draftShifts: staleDrafts, refreshedDraftShifts: refreshedDrafts }),
    { draftShifts: refreshedDrafts, ids: [21] },
  );
});
