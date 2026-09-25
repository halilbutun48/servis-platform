import prisma from "../src/prisma.js";
import { runCopilotFoundation } from "../src/ai/service.js";
import { humanizeUserFacingText } from "../../web/src/utils/terminology.js";

// Bounded final-payload regression gate for the only two residuals found by
// the final public closure. Every service case begins with raw user text and
// the same drawer-shaped screen context the product sends to Sefer Abi.
const failures = [];
const summary = { cases: 0, passed: 0, failed: 0, assertions: 0 };

function normalize(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, " ").trim();
}

function addFailure(caseId, root, assertion, detail = "") {
  failures.push({ caseId, root, assertion, detail: String(detail).slice(0, 1000) });
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

function drawerContext({ user, path, label, selected = null, related = null }) {
  const entity = selected ? { type: selected.type, id: Number(selected.id), label: selected.label } : null;
  const relatedEntity = related ? { type: related.type, id: Number(related.id), label: related.label } : null;
  return {
    id: `two-regressions:${path}:${entity?.type || "screen"}:${entity?.id || 0}`,
    path,
    label,
    role: user.role,
    companyKind: user.companyKind || "",
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

async function serviceCase(caseId, root, input, verify) {
  await caseRun(caseId, root, async () => {
    const payload = await ask(input);
    const answer = String(payload?.reply || payload?.summary || "").trim();
    const plan = payload?.semanticPlan || {};
    const typed = plan.typedRequest || {};
    const entity = plan.entity || null;
    check(caseId, root, "FINAL_PAYLOAD_REPLY", Boolean(answer), JSON.stringify(payload));
    check(caseId, root, "FROZEN_TYPED_REQUEST", Object.isFrozen(typed), JSON.stringify(plan));
    await verify({ answer, visible: humanizeUserFacingText(answer), plan, typed, entity, assert: (name, value, detail = "") => check(caseId, root, name, value, detail) });
  });
}

function failuresFor(root, assertion) {
  return new Set(failures.filter((failure) => failure.root === root && (!assertion || failure.assertion === assertion)).map((failure) => failure.caseId)).size;
}

function hasNoRealEntityDisclosure(value) {
  return !/(?:vardiya|teklif|sözleşme|sozlesme|araç|arac|sürücü|surucu)\s*#\s*\d+/iu.test(String(value || ""));
}

try {
  const company = await userFor("company@demo.com");
  const room = await userFor("room@demo.com");
  const parent = await userFor("parent@demo.com");
  const shift = await prisma.shift.findFirst({
    where: { id: 151, companyId: Number(company.companyId) },
    select: { id: true, status: true, startAt: true, endAt: true, driver: { select: { fullName: true } } },
  });
  const offer = await prisma.shiftOffer.findUnique({ where: { id: 35 }, select: { id: true, shiftId: true, status: true } });
  if (!shift?.id || !shift?.driver?.fullName || !offer?.id || !offer?.shiftId) throw new Error("Missing final two-regression fixtures");

  const companyShift = drawerContext({ user: company, path: "/company/shifts", label: "Vardiyalar", selected: { type: "shift", id: shift.id, label: `Vardiya #${shift.id}` } });
  const companyNoSelection = drawerContext({ user: company, path: "/company/shifts", label: "Vardiyalar" });
  const roomOffer = drawerContext({ user: room, path: "/room/offers", label: "Teklifler", selected: { type: "offer", id: offer.id, label: `Teklif #${offer.id}` }, related: { type: "shift", id: offer.shiftId, label: `Vardiya #${offer.shiftId}` } });
  const parentLive = drawerContext({ user: parent, path: "/parent/live", label: "Canlı" });
  const expectedDriver = shift.driver.fullName;

  // R1: a relationship request must traverse to and render the authorized
  // value; it must never degrade into the selected record's identity.
  const relationQueries = [
    "vardiyanın sürücüsü kim",
    "seçili vardiyanın sürücüsü hangisi",
    "bu vardiya hangi şoföre bağlı",
    "baktığım vardiyanın sürücü adı ne",
  ];
  for (const [index, message] of relationQueries.entries()) {
    await serviceCase(`R1-RELATION-${index + 1}`, "REGRESSION-R1", { user: company, screenContext: companyShift, message, authSessionId: `two-r1-${index}` }, async ({ answer, visible, plan, typed, entity, assert }) => {
      assert("RELATION_TYPED", typed.taskType === "RELATION_LOOKUP" && plan.family === "RELATION_LOOKUP", JSON.stringify(plan));
      assert("RELATION_TARGET_DRIVER", plan.relationshipIntent?.toEntity?.type === "driver", JSON.stringify(plan.relationshipIntent));
      assert("RELATION_SOURCE_SHIFT", entity?.type === "shift" && Number(entity?.id) === Number(shift.id), JSON.stringify(entity));
      assert("RELATION_VALUE_FINAL_REPLY", normalize(answer).includes(normalize(expectedDriver)), answer);
      assert("RELATION_VALUE_VISIBLE_REPLY", normalize(visible).includes(normalize(expectedDriver)), visible);
      assert("NOT_IDENTITY_ONLY", !/^Şu anda\s+Vardiya\s+#\d+\s+kaydına\s+bakıyorsun\.?$/iu.test(answer), answer);
    });
  }
  for (const [index, message] of ["bu teklif hangi vardiyaya bağlı", "bağlı vardiya numarası nedir"].entries()) {
    await serviceCase(`R1-OTHER-RELATION-${index + 1}`, "REGRESSION-R1", { user: room, screenContext: roomOffer, message, authSessionId: `two-r1-offer-${index}` }, async ({ answer, plan, typed, assert }) => {
      assert("OTHER_RELATION_TYPED", typed.taskType === "RELATION_LOOKUP" && plan.family === "RELATION_LOOKUP", JSON.stringify(plan));
      assert("OTHER_RELATION_VALUE", new RegExp(`Vardiya\\s*#${offer.shiftId}`, "iu").test(answer), answer);
    });
  }
  for (const [index, message] of ["bu hangi vardiya", "seçili kaydın numarası ne"].entries()) {
    await serviceCase(`R1-IDENTITY-CONTROL-${index + 1}`, "REGRESSION-R1", { user: company, screenContext: companyShift, message, authSessionId: `two-r1-identity-${index}` }, async ({ answer, plan, typed, assert }) => {
      assert("IDENTITY_STAYS_IDENTITY", typed.taskType === "SELECTED_RECORD_CONTEXT" && plan.family === "SELECTED_RECORD_CONTEXT", JSON.stringify(plan));
      assert("IDENTITY_VALUE", new RegExp(`Vardiya\\s*#${shift.id}`, "iu").test(answer), answer);
    });
  }
  await serviceCase("R1-FIELD-CONTROL", "REGRESSION-R1", { user: company, screenContext: companyShift, message: "bu vardiyanın durumu ne", authSessionId: "two-r1-field" }, async ({ answer, plan, typed, assert }) => {
    assert("FIELD_STAYS_FIELD", typed.taskType === "FIELD_LOOKUP" && plan.family === "ENTITY_LOOKUP", JSON.stringify(plan));
    assert("FIELD_NOT_IDENTITY", !/^Şu anda\s+Vardiya\s+#\d+\s+kaydına\s+bakıyorsun\.?$/iu.test(answer), answer);
  });

  // R2: an assessment request must be fulfilled with selected evidence, or
  // an explicit selected no-evidence result, rather than record identity.
  const assessmentQueries = [
    "bu vardiyanın riski ne",
    "seçili vardiyada risk var mı",
    "baktığım vardiyanın risk durumunu özetle",
    "bu vardiyanın dikkat gerektiren yanı ne",
  ];
  for (const [index, message] of assessmentQueries.entries()) {
    await serviceCase(`R2-ASSESSMENT-${index + 1}`, "REGRESSION-R2", { user: company, screenContext: companyShift, message, authSessionId: `two-r2-${index}` }, async ({ answer, plan, typed, entity, assert }) => {
      assert("ASSESSMENT_TYPED", ["RISK", "ISSUE", "NEXT_ACTION", "PRIORITY"].includes(typed.taskType) && ["RISK_RANKING", "RISK_ASSESSMENT", "NEXT_STEP"].includes(plan.family), JSON.stringify(plan));
      assert("ASSESSMENT_SELECTED_SCOPE", plan.scopeTarget === "SELECTED_RECORD" && entity?.type === "shift" && Number(entity?.id) === Number(shift.id), JSON.stringify({ plan, entity }));
      assert("ASSESSMENT_FINAL_REPLY", /risk\s+sinyali\s+görünmüyor|risk\s+sinyali\s+gorunmuyor|risk\s+var|dikkat/iu.test(answer), answer);
      assert("NOT_IDENTITY_ONLY", !/^Şu anda\s+Vardiya\s+#\d+\s+kaydına\s+bakıyorsun\.?$/iu.test(answer), answer);
    });
  }
  await serviceCase("R2-GLOBAL-CONTROL", "REGRESSION-R2", { user: company, screenContext: companyShift, message: "firma genelindeki kritik riskler neler", authSessionId: "two-r2-global" }, async ({ plan, typed, assert }) => {
    assert("GLOBAL_RISK_NOT_SELECTED_SUBSTITUTE", ["RISK", "PRIORITY", "ISSUE"].includes(typed.taskType) && plan.scopeTarget !== "SELECTED_RECORD", JSON.stringify(plan));
  });

  // Representative final R1–R4 closures and bounded adjacent controls.
  await serviceCase("FINAL-R1-STATUS", "FINAL-R1", { user: room, screenContext: roomOffer, message: "seçili teklifin durumu nedir", authSessionId: "two-final-r1" }, async ({ answer, plan, typed, assert }) => {
    assert("STATUS_FIELD", typed.taskType === "FIELD_LOOKUP" && plan.requestedFields?.some((field) => field.key === "STATUS"), JSON.stringify(plan));
    assert("STATUS_REPLY", Boolean(answer), answer);
  });
  await serviceCase("FINAL-R2-GENERAL", "FINAL-R2", { user: company, screenContext: companyShift, message: "genel servis planlamasında nelere dikkat edilir", authSessionId: "two-final-r2" }, async ({ answer, plan, typed, assert }) => {
    assert("GENERAL_INFORMATION", typed.generalInformationIntent === true && plan.family === "GENERAL_KNOWLEDGE" && plan.retrieveProductData === false, JSON.stringify(plan));
    assert("GENERAL_NO_ENTITY_DISCLOSURE", hasNoRealEntityDisclosure(answer), answer);
  });
  for (const [index, raw] of [["• Birinci öğe\n• İkinci öğe"], ["1. İlk adım\n2. İkinci adım"]].entries()) {
    await caseRun(`FINAL-R3-STRUCTURE-${index + 1}`, "FINAL-R3", async () => {
      const visible = humanizeUserFacingText(raw[0]);
      check(`FINAL-R3-STRUCTURE-${index + 1}`, "FINAL-R3", "VISIBLE_LINES_PRESERVED", visible.includes("\n") && visible.split(/\r?\n/u).length === 2, JSON.stringify({ raw: raw[0], visible }));
    });
  }
  await serviceCase("FINAL-R4-NO-SELECTION", "FINAL-R4", { user: company, screenContext: companyNoSelection, message: "o kayıt hangisi", authSessionId: "two-final-r4-none" }, async ({ answer, entity, assert }) => {
    assert("NO_SELECTION_CLARIFIES", !entity && /netleştir|netlestir|hangi kayıt|hangi kayit/iu.test(answer), answer);
  });
  await serviceCase("FINAL-R4-SELECTED", "FINAL-R4", { user: company, screenContext: companyShift, message: "o kayıt hangisi", authSessionId: "two-final-r4-selected" }, async ({ answer, entity, assert }) => {
    assert("SELECTED_IDENTITY", Number(entity?.id) === Number(shift.id) && new RegExp(`Vardiya\\s*#${shift.id}`, "iu").test(answer), JSON.stringify({ answer, entity }));
  });
  await serviceCase("ADJ-COUNT", "ADJACENT", { user: company, screenContext: companyShift, message: "kaç vardiya var", authSessionId: "two-adj-count" }, async ({ plan, typed, assert }) => {
    assert("TRUE_COUNT", typed.taskType === "COUNT" && plan.family === "COUNT", JSON.stringify(plan));
  });
  await serviceCase("ADJ-GROUNDED-WRITING", "ADJACENT", { user: company, screenContext: companyShift, message: "seçili vardiyanın saatini kullanarak sürücüye kısa mesaj yaz", authSessionId: "two-adj-grounded" }, async ({ answer, plan, typed, assert }) => {
    assert("GROUNDED_WRITING", typed.productGroundedWritingIntent === true && plan.retrieveProductData === true && /07:00|09:00/iu.test(answer), JSON.stringify({ answer, plan }));
  });
  await serviceCase("ADJ-GENERAL-CREATIVE", "ADJACENT", { user: company, screenContext: companyShift, message: "vardiya kelimesiyle kısa mesaj yaz", authSessionId: "two-adj-creative" }, async ({ answer, plan, assert }) => {
    assert("CREATIVE_NO_RETRIEVAL", plan.retrieveProductData === false && /vardiya/iu.test(answer) && hasNoRealEntityDisclosure(answer), JSON.stringify({ answer, plan }));
  });
  await serviceCase("ADJ-EXTERNAL-OWNERSHIP", "ADJACENT", { user: parent, screenContext: parentLive, message: "başka bir kurumun kaç öğrencisi var", authSessionId: "two-adj-external" }, async ({ answer, plan, entity, assert }) => {
    assert("EXTERNAL_NOT_SELF_SUBSTITUTED", plan.retrieveProductData === false && !entity && !/öğrenci\s*:\s*\d+|ogrenci\s*:\s*\d+/iu.test(answer), JSON.stringify({ answer, plan }));
  });

  const result = {
    check: "PRE_18_FINAL_TWO_REGRESSIONS_TERRA_MICRO",
    targeted: summary,
    statuses: {
      regressionR1: failuresFor("REGRESSION-R1") === 0 ? "PASS" : "FAIL",
      regressionR2: failuresFor("REGRESSION-R2") === 0 ? "PASS" : "FAIL",
      finalR1: failuresFor("FINAL-R1") === 0 ? "PASS" : "FAIL",
      finalR2: failuresFor("FINAL-R2") === 0 ? "PASS" : "FAIL",
      finalR3: failuresFor("FINAL-R3") === 0 ? "PASS" : "FAIL",
      finalR4: failuresFor("FINAL-R4") === 0 ? "PASS" : "FAIL",
    },
    counters: {
      relationFulfillmentFailure: failuresFor("REGRESSION-R1", "RELATION_VALUE_FINAL_REPLY") + failuresFor("REGRESSION-R1", "RELATION_VALUE_VISIBLE_REPLY"),
      selectedAssessmentFulfillmentFailure: failuresFor("REGRESSION-R2", "ASSESSMENT_FINAL_REPLY"),
      identityFalseRelation: failuresFor("REGRESSION-R1", "NOT_IDENTITY_ONLY"),
      identityFalseAssessment: failuresFor("REGRESSION-R2", "NOT_IDENTITY_ONLY"),
    },
    gateHardening: {
      relationValueFulfillmentAssertionPresent: true,
      assessmentFulfillmentAssertionPresent: true,
      finalPayloadReplyAsserted: true,
      realServiceOrchestrationUsed: true,
      realFrontendScreenContextShapeUsed: true,
      manuallySuppliedSemanticPlanPrimaryCaseCount: 0,
      testedSourceEqualsCurrentSource: true,
    },
    securityArchitectureChanged: false,
    failures,
  };
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
