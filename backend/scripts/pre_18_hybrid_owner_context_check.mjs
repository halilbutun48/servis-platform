import assert from "node:assert/strict";
import * as hybrid from "./lib/pre_18_hybrid_surface_state_executor.mjs";

const broadSidebar = {
  type: "section",
  label: "Firmalar Taşımacılık Firmaları Kullanıcılar İller ve Bölgeler İşlem Kayıtları Denetim Paneli Canlı İzleme Kabul Merkezi Biniş kayıtları Sistem Standartları Ticari Akış Güven ve Kalite Başvuru İncelemesi Yardımcı Sahaya Çıkış Kontrolü Operasyon Doğrulama İş",
  globalNavigation: true,
  interactiveDescendantCount: 22,
  navigationDescendantCount: 18,
  textLength: 310,
  depth: 5,
};

function owner(candidates, action = { role: "button", name: "Firmalar" }) {
  return hybrid.selectContextualOwner(candidates, action);
}

function actionContract(contextualOwner, overrides = {}) {
  return hybrid.captureActionContract({
    role: "SUPER_ADMIN",
    route: "/superadmin/companies",
    viewport: "desktop",
    surface: { id: "company-directory", title: "Firmalar" },
    materialState: { activeTab: "companies" },
    action: { role: "button", name: "Profili aç", expectedEffectClass: "MODAL_OPEN", safetyClass: "SAFE", ...(overrides.action || {}) },
    owner: contextualOwner,
    ...overrides,
  });
}

const cases = [];
const test = (name, fn) => cases.push({ name, fn });

test("A global sidebar is rejected in favour of a local navigation item", () => {
  const selected = owner([broadSidebar, { type: "navigation", semanticLabel: "Ana menü › Firmalar", interactiveDescendantCount: 1, navigationDescendantCount: 1, textLength: 20, depth: 0 }]);
  assert.deepEqual(selected, { type: "navigation", label: "Ana menü › Firmalar", boundedOrdinal: null });
});

test("B same-name controls in separate cards retain separate contextual owners", () => {
  const first = owner([{ type: "card", semanticLabel: "Denizli Servis", textLength: 30, depth: 1 }], { role: "button", name: "Profili aç" });
  const second = owner([{ type: "card", semanticLabel: "Pamukkale Ulaşım", textLength: 34, depth: 1 }], { role: "button", name: "Profili aç" });
  assert.notEqual(actionContract(first).ACTION_CONTRACT_ID, actionContract(second).ACTION_CONTRACT_ID);
});

test("C same-name row actions retain their table-row owner", () => {
  const first = owner([{ type: "table-row", semanticLabel: "Firma: Denizli Servis", textLength: 24, depth: 1 }], { role: "button", name: "Profil" });
  const second = owner([{ type: "table-row", semanticLabel: "Firma: Pamukkale Ulaşım", textLength: 29, depth: 1 }], { role: "button", name: "Profil" });
  assert.notEqual(first.label, second.label);
  assert.notEqual(actionContract(first, { action: { role: "button", name: "Profil" } }).ACTION_CONTRACT_ID, actionContract(second, { action: { role: "button", name: "Profil" } }).ACTION_CONTRACT_ID);
});

test("D modal action prefers its modal owner over the page sidebar", () => {
  const selected = owner([broadSidebar, { type: "modal", semanticLabel: "Firma Profili", textLength: 40, depth: 1 }], { role: "button", name: "Kapat" });
  assert.equal(selected.type, "modal");
  assert.equal(selected.label, "Firma Profili");
});

test("E drawer action prefers its drawer owner", () => {
  const selected = owner([broadSidebar, { type: "drawer", semanticLabel: "Kayıt ayrıntısı", textLength: 44, depth: 1 }], { role: "button", name: "Kapat" });
  assert.equal(selected.type, "drawer");
  assert.equal(selected.label, "Kayıt ayrıntısı");
});

test("F a section with a heading wins over a global landmark", () => {
  const selected = owner([{ type: "landmark", semanticLabel: "Uygulama", interactiveDescendantCount: 16, textLength: 500, depth: 4 }, { type: "section", semanticLabel: "Denetim bölümleri", interactiveDescendantCount: 6, textLength: 72, depth: 1 }], { role: "tab", name: "Yetki & Erişim" });
  assert.deepEqual(selected, { type: "section", label: "Denetim bölümleri", boundedOrdinal: null });
});

test("G local navigation groups remain distinct", () => {
  const operations = owner([{ type: "navigation", semanticLabel: "Operasyon › Raporlar", interactiveDescendantCount: 1, navigationDescendantCount: 1, textLength: 22, depth: 0 }], { role: "button", name: "Raporlar" });
  const commercial = owner([{ type: "navigation", semanticLabel: "Ticari › Raporlar", interactiveDescendantCount: 1, navigationDescendantCount: 1, textLength: 19, depth: 0 }], { role: "button", name: "Raporlar" });
  assert.notEqual(actionContract(operations, { action: { role: "button", name: "Raporlar" } }).ACTION_CONTRACT_ID, actionContract(commercial, { action: { role: "button", name: "Raporlar" } }).ACTION_CONTRACT_ID);
});

test("H owner labels never use concatenated sidebar descendant text", () => {
  const selected = owner([broadSidebar, { type: "navigation", semanticLabel: "SİSTEM › İşlem Kayıtları", interactiveDescendantCount: 1, navigationDescendantCount: 1, textLength: 25, depth: 0 }], { role: "button", name: "İşlem Kayıtları" });
  assert.equal(selected.label, "SİSTEM › İşlem Kayıtları");
  assert.ok(selected.label.length < 80);
});

test("I wrapper rerender keeps the same semantic local owner", () => {
  const before = owner([{ type: "section", semanticLabel: "Bağlama uygun öneriler", textLength: 74, depth: 2 }], { role: "button", name: "Riskleri sırala" });
  const after = owner([{ type: "surface", textLength: 320, interactiveDescendantCount: 14, depth: 5 }, { type: "section", semanticLabel: "Bağlama uygun öneriler", textLength: 74, depth: 3 }], { role: "button", name: "Riskleri sırala" });
  assert.deepEqual(after, before);
});

test("J existing terminal checkpoint records remain terminal on resume", () => {
  const legacy = { ...actionContract({ type: "section", label: broadSidebar.label, boundedOrdinal: null }), executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, actionResult: "route-opened", expectedEffect: "MODAL_OPEN", observedEffect: "drawer opened", evidence: [{ kind: "screenshot", path: "owner.png" }] };
  const current = actionContract({ type: "navigation", label: "Ana menü › Profili aç", boundedOrdinal: null });
  const resumed = hybrid.reuseCompatibleTerminalAction(current, [legacy]);
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.executionState, "PROVEN_PASS");
  assert.equal(resumed.ownerCompatibility, "UNIQUE_SEMANTIC_ACTION");
});

test("K unsafe classification remains unchanged by owner selection", () => {
  const selected = owner([broadSidebar, { type: "table-row", semanticLabel: "Firma: Denizli Servis", textLength: 24, depth: 1 }], { role: "button", name: "Sil" });
  const record = { ...actionContract(selected, { action: { role: "button", name: "Sil", safetyClass: "UNSAFE", expectedEffectClass: "CONFIRMATION_BOUNDARY" } }), executionState: "NOT_SAFE_TO_EXECUTE_FULLY", classification: "NOT_SAFE_TO_EXECUTE_FULLY", safetyFlowProven: true, unsafeMutationExecuted: false, evidence: [{ kind: "dialog", dismissed: true }] };
  assert.equal(hybrid.isTerminalActionEvidence(record), true);
});

let failures = 0;
for (const item of cases) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

console.log(`PRE_18_HYBRID_OWNER_CONTEXT_CHECK=${failures ? "RED" : "PASS"} (${failures}/${cases.length})`);
if (failures) process.exitCode = 1;
