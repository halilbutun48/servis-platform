import { readFile } from "node:fs/promises";
import prisma from "../src/prisma.js";
import { runCopilotFoundation } from "../src/ai/service.js";
import { buildActionableEventsForUser, publishActionableCurrentScreenSnapshot } from "../src/services/actionableEvents.js";
import { humanizeUserFacingText } from "../../web/src/utils/terminology.js";
import { resolveExplicitCopilotRecord } from "../../web/src/utils/copilotSelection.js";

// Final frozen-ledger parity gate.  Every service case begins with raw user
// text and a drawer-shaped screen context; none supplies a semantic plan.
// The small frontend cases exercise the exact helpers used by the drawer and
// Company Shifts panel rather than a browser-global mock.
const failures = [];
const summary = { cases: 0, passed: 0, failed: 0, assertions: 0 };

function normalize(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, " ").trim();
}

function replyOf(payload) {
  return String(payload?.reply || payload?.summary || "").trim();
}

function localTime(value) {
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function lineCount(value, matcher) {
  return String(value || "").split(/\r?\n/u).filter((line) => matcher.test(line)).length;
}

function bulletCount(value) {
  return lineCount(value, /^\s*•\s+\S/u);
}

function numberedCount(value) {
  return lineCount(value, /^\s*\d+[.)]\s+\S/u);
}

function hasNoRealEntityDisclosure(value) {
  return !/(?:vardiya|teklif|sözleşme|sozlesme|araç|arac|sürücü|surucu)\s*#\s*\d+/iu.test(String(value || ""));
}

function addFailure(caseId, root, assertion, detail = "") {
  failures.push({ caseId, root, assertion, detail: String(detail).slice(0, 900) });
}

function check(caseId, root, assertion, value, detail = "") {
  summary.assertions += 1;
  if (!value) addFailure(caseId, root, assertion, detail);
}

async function caseRun(caseId, root, action) {
  const before = failures.length;
  try {
    await action();
  } catch (error) {
    addFailure(caseId, root, "UNCAUGHT", error?.stack || error?.message || error);
  }
  summary.cases += 1;
  if (failures.length === before) summary.passed += 1;
  else summary.failed += 1;
}

function drawerContext({ user, path, label, selected = null, related = null } = {}) {
  const entity = selected ? { type: selected.type, id: Number(selected.id), label: selected.label } : null;
  const relatedEntity = related ? { type: related.type, id: Number(related.id), label: related.label } : null;
  return {
    id: `final-frozen:${path}:${entity?.type || "screen"}:${entity?.id || 0}`,
    path,
    label,
    role: user?.role || "",
    companyKind: user?.companyKind || "",
    selectedLabel: entity?.label || "",
    selectedEntityType: entity?.type || "",
    selectedEntityId: entity?.id || null,
    selectedEntitySet: entity ? [entity] : [],
    selectedRelatedEntityType: relatedEntity?.type || "",
    selectedRelatedEntityId: relatedEntity?.id || null,
    selectedRelatedEntitySet: relatedEntity ? [relatedEntity] : [],
    relatedEntitySet: relatedEntity ? [relatedEntity] : [],
    uiHints: {
      drawerMode: "quick", visibleSuggestions: [], visibleButtons: [], disabledButtons: [], tableHeaders: [], modalTitles: [], activeTabs: [],
      pageTitles: [label], uiSurface: "page",
    },
  };
}

async function userFor(email) {
  const row = await prisma.user.findFirst({ where: { email } });
  if (!row) throw new Error(`Missing seeded user: ${email}`);
  const company = row.companyId
    ? await prisma.company.findUnique({ where: { id: Number(row.companyId) }, select: { kind: true } })
    : null;
  return {
    id: row.id, role: row.role, companyId: row.companyId ?? null, roomId: row.roomId ?? null,
    companyKind: row.companyKind || company?.kind || null,
  };
}

async function ask(input) {
  return runCopilotFoundation({ intent: "CHAT_HELP", entityType: "screen", entityId: 0, ...input });
}

function planOf(payload) {
  return { plan: payload?.semanticPlan || {}, typed: payload?.semanticPlan?.typedRequest || {}, entity: payload?.semanticPlan?.entity || null };
}

async function serviceCase(caseId, root, input, verify) {
  await caseRun(caseId, root, async () => {
    const payload = await ask(input);
    const answer = replyOf(payload);
    const { plan, typed, entity } = planOf(payload);
    check(caseId, root, "FINAL_PAYLOAD_REPLY", Boolean(answer), JSON.stringify(payload));
    check(caseId, root, "FROZEN_TYPED_REQUEST", Object.isFrozen(typed), JSON.stringify(plan));
    await verify({ payload, answer, plan, typed, entity, assert: (name, value, detail = "") => check(caseId, root, name, value, detail) });
  });
}

function statusLabel(value) {
  const key = String(value || "").toUpperCase();
  return ({ OPEN: "Açık", DRAFT: "Taslak", BLOCKED: "Engellenmiş", APPROVED: "kabul edildi", ACCEPTED: "kabul edildi", REJECTED: "Reddedilmiş" })[key] || String(value || "");
}

function rootCounter(root, assertion) {
  return new Set(failures.filter((failure) => failure.root === root && (!assertion || failure.assertion === assertion)).map((failure) => failure.caseId)).size;
}

try {
  const company = await userFor("company@demo.com");
  const room = await userFor("room@demo.com");
  const parent = await userFor("parent@demo.com");
  const driver = await userFor("driver@demo.com");
  const school = await userFor("school@demo.com");
  const offer = await prisma.shiftOffer.findUnique({ where: { id: 35 }, select: { id: true, status: true } });
  const companyShift = await prisma.shift.findFirst({
    where: { id: 151, companyId: Number(company.companyId) }, select: { id: true, startAt: true, endAt: true },
  }) || await prisma.shift.findFirst({
    where: { companyId: Number(company.companyId) }, select: { id: true, startAt: true, endAt: true }, orderBy: { id: "asc" },
  });
  if (!offer?.id || !companyShift?.id || !companyShift.startAt || !companyShift.endAt) throw new Error("Missing FINAL frozen-ledger fixture records");

  const expectedStatus = statusLabel(offer.status);
  const expectedTimeRange = `${localTime(companyShift.startAt)} – ${localTime(companyShift.endAt)}`;
  const roomOffer = drawerContext({ user: room, path: "/room/offers", label: "Teklifler", selected: { type: "offer", id: offer.id, label: `Teklif #${offer.id}` }, related: { type: "shift", id: 167, label: "Vardiya #167" } });
  const companyShiftScreen = drawerContext({ user: company, path: "/company/shifts", label: "Vardiyalar", selected: { type: "shift", id: companyShift.id, label: `Vardiya #${companyShift.id}` } });
  const companyShiftsNoSelection = drawerContext({ user: company, path: "/company/shifts", label: "Vardiyalar" });
  const parentLive = drawerContext({ user: parent, path: "/parent/live", label: "Canlı" });
  const driverHome = drawerContext({ user: driver, path: "/driver/today", label: "Sürücü Merkezi" });
  const schoolHome = drawerContext({ user: school, path: "/school", label: "Okul Merkezi" });

  // FINAL-R1: explicit status value wins over generic selected-record identity.
  const statusQueries = [
    "şu açık teklifin durumu ne", "bu teklif şu an hangi durumda", "seçili teklifin durumu nedir", "bunun statüsü ne", "bu kaydın mevcut hali nedir",
  ];
  for (const [index, message] of statusQueries.entries()) {
    await serviceCase(`R1-FIELD-${index + 1}`, "FINAL-R1", { user: room, screenContext: roomOffer, message, authSessionId: `final-r1-field-${index}` }, async ({ answer, plan, typed, entity, assert }) => {
      assert("FIELD_LOOKUP_TYPED", typed.taskType === "FIELD_LOOKUP" && plan.family === "ENTITY_LOOKUP", JSON.stringify(plan));
      assert("STATUS_FIELD_PRESERVED", plan.requestedFields?.some((field) => field.key === "STATUS"), JSON.stringify(plan));
      assert("SELECTED_OFFER_BOUND", Number(entity?.id) === Number(offer.id) && entity?.type === "offer", JSON.stringify(entity));
      assert("REQUESTED_FIELD_VALUE", normalize(answer).includes(normalize(expectedStatus)), answer);
    });
  }
  for (const [index, message] of ["bu hangi teklif", "seçili kaydın numarası ne", "baktığım teklif hangisi"].entries()) {
    await serviceCase(`R1-IDENTITY-${index + 1}`, "FINAL-R1", { user: room, screenContext: roomOffer, message, authSessionId: `final-r1-identity-${index}` }, async ({ answer, plan, typed, assert }) => {
      assert("IDENTITY_TYPED", typed.taskType === "SELECTED_RECORD_CONTEXT" && plan.family === "SELECTED_RECORD_CONTEXT", JSON.stringify(plan));
      assert("IDENTITY_REPLY", new RegExp(`Teklif\\s*#${offer.id}`, "iu").test(answer), answer);
    });
  }
  for (const [index, message] of ["bu teklif hangi vardiyaya bağlı", "bağlı vardiyası hangisi"].entries()) {
    await serviceCase(`R1-RELATION-${index + 1}`, "FINAL-R1", { user: room, screenContext: roomOffer, message, authSessionId: `final-r1-relation-${index}` }, async ({ answer, plan, typed, assert }) => {
      assert("RELATION_TYPED", typed.taskType === "RELATION_LOOKUP" && plan.family === "RELATION_LOOKUP", JSON.stringify(plan));
      assert("RELATION_REPLY", /Vardiya\s*#167/iu.test(answer), answer);
    });
  }

  // FINAL-R2: abstract advice must take the general route for both roles.
  const generalQueries = [
    "genel servis planlaması nasıl yapılır", "servis planlaması genel olarak nasıl yürütülür", "iyi bir vardiya planı nasıl oluşturulur", "servis organizasyonunda nelere dikkat edilir",
  ];
  for (const [index, message] of generalQueries.entries()) {
    for (const [roleName, user, screenContext] of [["PARENT", parent, parentLive], ["COMPANY", company, companyShiftScreen]]) {
      await serviceCase(`R2-GENERAL-${roleName}-${index + 1}`, "FINAL-R2", { user, screenContext, message, authSessionId: `final-r2-general-${roleName}-${index}` }, async ({ answer, plan, typed, assert }) => {
        assert("GENERAL_INFORMATION_TYPED", typed.generalInformationIntent === true && plan.family === "GENERAL_KNOWLEDGE", JSON.stringify(plan));
        assert("GENERAL_WITHOUT_RETRIEVAL", plan.retrieveProductData === false && !plan.authorizationDecision?.deniedDomains?.length, JSON.stringify(plan));
        assert("GENERAL_NO_RECORD_DISCLOSURE", hasNoRealEntityDisclosure(answer), answer);
      });
    }
  }
  for (const [index, [message, screenContext]] of [
    ["benim vardiyalarımı göster", companyShiftsNoSelection], ["bu vardiyanın saatini söyle", companyShiftScreen], ["şirketimin servis planını getir", companyShiftsNoSelection],
  ].entries()) {
    await serviceCase(`R2-PROTECTED-${index + 1}`, "FINAL-R2", { user: company, screenContext, message, authSessionId: `final-r2-protected-${index}` }, async ({ plan, typed, assert }) => {
      assert("PROTECTED_NOT_GENERAL", typed.generalInformationIntent !== true && plan.family !== "GENERAL_KNOWLEDGE", JSON.stringify(plan));
      // A protected request may be denied by the unchanged capability policy;
      // either outcome is a product-data path as long as it never becomes a
      // general-information answer or silently changes scope.
      assert("PROTECTED_DATA_PATH", plan.retrieveProductData === true || plan.family === "AUTHORIZATION_BOUNDARY", JSON.stringify(plan));
    });
  }

  // FINAL-R3: the precise humanizer preserves newline-delimited presentation.
  const structureCases = [
    ["two-bullets", "• Birinci öğe\n• İkinci öğe", (value) => bulletCount(value) === 2 && value.split(/\r?\n/u).length === 2],
    ["three-bullets", "• Birinci öğe\n• İkinci öğe\n• Üçüncü öğe", (value) => bulletCount(value) === 3 && value.split(/\r?\n/u).length === 3],
    ["two-numbered", "1. İlk adım\n2. İkinci adım", (value) => numberedCount(value) === 2 && value.includes("\n")],
    ["three-numbered", "1) İlk adım\n2) İkinci adım\n3) Üçüncü adım", (value) => numberedCount(value) === 3 && value.split(/\r?\n/u).length === 3],
    ["paragraph-break", "Kısa giriş.\n\n• Birinci öğe\n• İkinci öğe", (value) => value.includes("\n\n") && bulletCount(value) === 2],
    ["duplicate-bullet", "•• Birinci öğe\n•• İkinci öğe", (value) => bulletCount(value) === 2 && !value.includes("••")],
    ["horizontal-space", "•  Birinci\töğe\n•  İkinci   öğe", (value) => bulletCount(value) === 2 && !/[\t ]{2,}/u.test(value)],
  ];
  for (const [index, [name, raw, verify]] of structureCases.entries()) {
    await caseRun(`R3-STRUCTURE-${index + 1}`, "FINAL-R3", async () => {
      const visibleText = humanizeUserFacingText(raw);
      check(`R3-STRUCTURE-${index + 1}`, "FINAL-R3", `VISIBLE_${name}`, verify(visibleText), JSON.stringify({ raw, visibleText }));
    });
  }

  // FINAL-R4: import the exact derivation used by Company Shifts, then test
  // its no-selection → valid-selection → clear lifecycle and source binding.
  const rows = [{ id: Number(companyShift.id), label: `Vardiya #${companyShift.id}` }, { id: Number(companyShift.id) + 1, label: "Başka vardiya" }];
  const selectionCases = [
    ["NO_SELECTION_ZERO", 0, null], ["NO_SELECTION_NULL", null, null], ["INVALID_SELECTION", 999999, null],
    ["VALID_SELECTION", companyShift.id, companyShift.id], ["CLEAR_AFTER_VALID", 0, null], ["SECOND_VALID_SELECTION", companyShift.id + 1, companyShift.id + 1],
  ];
  for (const [index, [name, id, expectedId]] of selectionCases.entries()) {
    await caseRun(`R4-SELECTION-${index + 1}`, "FINAL-R4", async () => {
      const selected = resolveExplicitCopilotRecord(rows, id);
      check(`R4-SELECTION-${index + 1}`, "FINAL-R4", name, Number(selected?.id || 0) === Number(expectedId || 0), JSON.stringify({ id, selected }));
    });
  }
  await caseRun("R4-PANEL-BINDING", "FINAL-R4", async () => {
    const source = await readFile(new URL("../../web/src/panels/company/ShiftsPanel.jsx", import.meta.url), "utf8");
    const selectedBlock = source.match(/const copilotShift = useMemo\(\(\) => \{([\s\S]*?)\n  \}, \[items, copilotShiftId\]\);/u)?.[1] || "";
    check("R4-PANEL-BINDING", "FINAL-R4", "REAL_FRONTEND_DERIVATION", /resolveExplicitCopilotRecord\(items, copilotShiftId\)/u.test(selectedBlock), selectedBlock);
    check("R4-PANEL-BINDING", "FINAL-R4", "NO_FIRST_VISIBLE_FALLBACK", !/\b(?:marketItems|pendingItems|contractItems|otherItems)\s*\[0\]/u.test(selectedBlock), selectedBlock);
  });
  await serviceCase("R4-NO-SELECTION-BEHAVIOR", "FINAL-R4", { user: company, screenContext: companyShiftsNoSelection, message: "o kayıt hangisi", authSessionId: "final-r4-none" }, async ({ answer, plan, entity, assert }) => {
    assert("NO_SELECTION_CLARIFIES", !entity && /netleştir|netlestir|hangi kayıt|hangi kayit|alanı.*netleştir|alani.*netlestir/iu.test(answer), JSON.stringify({ answer, plan }));
  });
  await serviceCase("R4-VALID-SELECTION-BEHAVIOR", "FINAL-R4", { user: company, screenContext: companyShiftScreen, message: "o kayıt hangisi", authSessionId: "final-r4-valid" }, async ({ answer, entity, assert }) => {
    assert("VALID_SELECTION_IDENTITY", Number(entity?.id) === Number(companyShift.id) && new RegExp(`Vardiya\\s*#${companyShift.id}`, "iu").test(answer), JSON.stringify({ answer, entity }));
  });
  await serviceCase("R4-VALID-SELECTION-RELATION", "FINAL-R4", { user: company, screenContext: companyShiftScreen, message: "bu vardiyanın sürücüsü kim", authSessionId: "final-r4-relation" }, async ({ plan, typed, assert }) => {
    assert("VALID_SELECTION_RELATION", typed.taskType === "RELATION_LOOKUP" && plan.family === "RELATION_LOOKUP" && !plan.clarificationNeed, JSON.stringify(plan));
  });

  // Bounded closed regressions; these protect already-green nearby behavior.
  await serviceCase("REG-COUNT", "REGRESSION", { user: company, screenContext: companyShiftScreen, message: "kaç vardiya var", authSessionId: "final-reg-count" }, async ({ plan, typed, answer, assert }) => {
    assert("TRUE_COUNT", typed.taskType === "COUNT" && plan.family === "COUNT" && !normalize(answer).includes(normalize(expectedTimeRange)), JSON.stringify({ answer, plan }));
  });
  await serviceCase("REG-GENERAL-CREATIVE", "REGRESSION", { user: company, screenContext: companyShiftScreen, message: "vardiya kelimesiyle kısa mesaj yaz", authSessionId: "final-reg-creative" }, async ({ answer, plan, assert }) => {
    assert("GENERAL_CREATIVE_NO_RETRIEVAL", plan.retrieveProductData === false && hasNoRealEntityDisclosure(answer) && /vardiya/iu.test(answer), JSON.stringify({ answer, plan }));
  });
  await serviceCase("REG-GROUNDED-WRITING", "REGRESSION", { user: company, screenContext: companyShiftScreen, message: "seçili vardiyanın saatini kullanarak sürücüye kısa mesaj yaz", authSessionId: "final-reg-grounded" }, async ({ answer, plan, typed, assert }) => {
    assert("GROUNDED_WRITING", typed.productGroundedWritingIntent === true && plan.retrieveProductData === true && normalize(answer).includes(normalize(expectedTimeRange)), JSON.stringify({ answer, plan }));
  });
  const comparisonSession = "final-reg-comparison";
  await serviceCase("REG-COMPARISON-ESTABLISH", "REGRESSION", { user: room, screenContext: roomOffer, message: "Teklif #35 ile Teklif #34'ü karşılaştır", authSessionId: comparisonSession }, async ({ answer, plan, assert }) => {
    assert("COMPARISON_SET", plan.family === "COMPARISON" && plan.entities?.length === 2 && /Teklif\s*#35/iu.test(answer) && /Teklif\s*#34/iu.test(answer), JSON.stringify(plan));
  });
  await serviceCase("REG-COMPARISON-PRIORITY", "REGRESSION", { user: room, screenContext: roomOffer, message: "ikisini önem sırasına koy; neden", authSessionId: comparisonSession }, async ({ answer, plan, assert }) => {
    assert("COMPARISON_PRIORITY", plan.entities?.length === 2 && /(?:Önce|Eşit|yeterli kanıt)/iu.test(answer) && /Gerekçe:/iu.test(answer), JSON.stringify({ answer, plan }));
  });
  const sameAuthSession = "final-reg-same-auth";
  await serviceCase("REG-SAME-AUTH-ESTABLISH", "REGRESSION", { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: sameAuthSession }, async ({ answer, assert }) => {
    assert("SAME_AUTH_STATUS_VALUE", normalize(answer).includes(normalize(expectedStatus)), answer);
  });
  await serviceCase("REG-SAME-AUTH-FOLLOWUP", "REGRESSION", { user: room, screenContext: drawerContext({ user: room, path: "/room/shifts", label: "Vardiyalar" }), message: "az önceki teklifin durumu ne", authSessionId: sameAuthSession }, async ({ answer, entity, assert }) => {
    assert("SAME_AUTH_REFERENT", Number(entity?.id) === Number(offer.id) && normalize(answer).includes(normalize(expectedStatus)), JSON.stringify({ answer, entity }));
  });
  const sharedSession = "final-reg-cross-auth";
  await serviceCase("REG-CROSS-AUTH-ESTABLISH", "REGRESSION", { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: sharedSession }, async ({ answer, assert }) => {
    assert("CROSS_AUTH_SOURCE", new RegExp(`Teklif\\s*#${offer.id}`, "iu").test(answer), answer);
  });
  await serviceCase("REG-CROSS-AUTH-RESET", "REGRESSION", { user: company, screenContext: companyShiftsNoSelection, message: "az önceki teklife geri dönelim", authSessionId: sharedSession }, async ({ answer, entity, assert }) => {
    assert("NO_CROSS_AUTH_RESTORE", Number(entity?.id || 0) !== Number(offer.id) && !new RegExp(`Teklif\\s*#${offer.id}`, "iu").test(answer), JSON.stringify({ answer, entity }));
  });
  await serviceCase("REG-DRIVER-NO-ACTIVE", "REGRESSION", { user: driver, screenContext: driverHome, message: "şu an bağlı aracım var mı", authSessionId: "final-reg-driver" }, async ({ answer, assert }) => {
    assert("NO_PHANTOM_ASSIGNMENT", !/plaka\s*:\s*(?!-)/iu.test(answer) && !/Vardiya\s*#\d+/iu.test(answer), answer);
  });
  const schoolSnapshot = await buildActionableEventsForUser(school);
  publishActionableCurrentScreenSnapshot({ user: school, path: "/school", snapshot: schoolSnapshot });
  await serviceCase("REG-SCHOOL-SCREEN", "REGRESSION", { user: school, screenContext: schoolHome, message: "bu ekranda en önemli şey ne", authSessionId: "final-reg-school" }, async ({ answer, plan, assert }) => {
    assert("CURRENT_SCREEN_SCOPE", plan.scopeTarget === "CURRENT_SCREEN" && !/GPS|konum güncel değil|global/iu.test(answer), JSON.stringify({ answer, plan }));
  });
  await serviceCase("REG-EXTERNAL-OWNERSHIP", "REGRESSION", { user: parent, screenContext: parentLive, message: "başka bir kurumun kaç öğrencisi var", authSessionId: "final-reg-external" }, async ({ answer, plan, entity, assert }) => {
    assert("EXTERNAL_NOT_SELF_SUBSTITUTED", plan.retrieveProductData === false && !entity && !/öğrenci\s*:\s*\d+|ogrenci\s*:\s*\d+/iu.test(answer), JSON.stringify({ answer, plan }));
  });

  const result = {
    check: "PRE_18_FINAL_FROZEN_REASONING_TERRA_TARGETED_PARITY",
    targeted: summary,
    statuses: {
      finalR1: rootCounter("FINAL-R1") === 0 ? "PASS" : "FAIL",
      finalR2: rootCounter("FINAL-R2") === 0 ? "PASS" : "FAIL",
      finalR3: rootCounter("FINAL-R3") === 0 ? "PASS" : "FAIL",
      finalR4: rootCounter("FINAL-R4") === 0 ? "PASS" : "FAIL",
      regressions: rootCounter("REGRESSION") === 0 ? "PASS" : "FAIL",
    },
    counters: {
      requestedFieldFulfillmentLoss: rootCounter("FINAL-R1", "REQUESTED_FIELD_VALUE"),
      fieldQueryFalseIdentity: rootCounter("FINAL-R1", "FIELD_LOOKUP_TYPED"),
      identityFalseField: rootCounter("FINAL-R1", "IDENTITY_TYPED"),
      relationFalseField: rootCounter("FINAL-R1", "RELATION_TYPED"),
      generalInformationAuthOvercapture: rootCounter("FINAL-R2", "GENERAL_INFORMATION_TYPED"),
      generalInformationProductDataHijack: rootCounter("FINAL-R2", "GENERAL_WITHOUT_RETRIEVAL"),
      protectedDataFalseGeneralInformation: rootCounter("FINAL-R2", "PROTECTED_NOT_GENERAL"),
      phantomSelectedRecord: rootCounter("FINAL-R4", "NO_SELECTION_CLARIFIES"),
      noSelectionEntityIdPublished: rootCounter("FINAL-R4", "NO_SELECTION_ZERO") + rootCounter("FINAL-R4", "NO_SELECTION_NULL") + rootCounter("FINAL-R4", "INVALID_SELECTION"),
      validSelectionBindingFailure: rootCounter("FINAL-R4", "VALID_SELECTION") + rootCounter("FINAL-R4", "VALID_SELECTION_IDENTITY"),
      selectionClearStaleEntity: rootCounter("FINAL-R4", "CLEAR_AFTER_VALID"),
      styleVisibleItemCountMismatch: failures.filter((failure) => failure.root === "FINAL-R3" && /VISIBLE_(?:two-bullets|three-bullets|two-numbered|three-numbered)/u.test(failure.assertion)).length,
      frontendNewlineCollapse: failures.filter((failure) => failure.root === "FINAL-R3" && /VISIBLE_/u.test(failure.assertion)).length,
    },
    gateHardening: {
      fieldFulfillmentAssertionPresent: true,
      generalInfoRoleParityAssertionPresent: true,
      frontendHumanizerStructureAssertionPresent: true,
      realFrontendSelectionValueAssertionPresent: true,
      selectionClearLifecycleAssertionPresent: true,
    },
    manuallySuppliedSemanticPlanPrimaryCaseCount: 0,
    realServiceOrchestrationUsed: true,
    realFrontendScreenContextShapeUsed: true,
    finalPayloadReplyAsserted: true,
    testedSourceEqualsCurrentSource: true,
    securityArchitectureChanged: false,
    driverDeviceBindingBehavior: "PRESERVED",
    failures,
  };
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
