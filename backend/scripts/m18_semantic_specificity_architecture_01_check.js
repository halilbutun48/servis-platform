import assert from "node:assert/strict";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";
import { hasFinancialReadinessEvidence } from "../src/ai/chat/semanticSpecificityResolver.js";

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = "NEW";

const ROLES = ["COMPANY", "ROOM", "SCHOOL", "ORGANIZATION", "DRIVER", "PERSONEL", "PARENT", "SUPER_ADMIN"];
const SCREEN_PATH = {
  COMPANY: "/company/operations",
  ROOM: "/room/shifts",
  SCHOOL: "/school/operations",
  ORGANIZATION: "/organization/operations",
  DRIVER: "/driver/today",
  PERSONEL: "/personel/operations",
  PARENT: "/parent/children",
  SUPER_ADMIN: "/superadmin/operations",
};

const activeContinuation = {
  activeGuidedTask: { taskId: "specificity-task", semanticPlan: { workflowIntent: "CREATE_SHIFT", family: "UI_GUIDANCE" } },
  lastSettledResult: { requestId: "specificity-settled", continuationDepth: 1 },
};
const selectedAgreement = {
  uniqueDiscourseReferent: { type: "agreement", id: 184, validated: true },
  lastSettledResult: { requestId: "specificity-record", continuationDepth: 0 },
};

function resolve(role, message, conversationState = null) {
  return resolveCanonicalConversationRequest({
    message,
    user: { role, companyId: 1, companyKind: "COMPANY" },
    screenContext: { path: SCREEN_PATH[role], label: `${role} yüzeyi`, role },
    conversationState,
  });
}

function projection(result) {
  return {
    mode: result?.request?.typedEvidence?.requestMode?.value || null,
    scope: result?.request?.semanticScope?.class || null,
    action: result?.request?.semanticAction?.actionClass || null,
    object: result?.request?.semanticAction?.objectClass || null,
    task: result?.canonicalShape?.taskType || null,
    operation: result?.request?.operation || null,
    reference: result?.request?.typedEvidence?.reference?.value || null,
    resolution: result?.request?.semanticAction?.resolutionStatus || null,
  };
}

function specific(result, task, operation) {
  const p = projection(result);
  return p.task === task && p.operation === operation;
}

// Lexical readiness evidence must not promote scalar payment fields into a
// financial risk task.  These are pure RED/ GREEN guards for the shared
// resolver, before the wider role matrix below runs.
assert.equal(
  hasFinancialReadinessEvidence("Planlama Merkezi içindeki vardiya kaydının ödeme limitini görebilir miyim?"),
  false,
  "scalar payment limit question is not financial readiness evidence",
);
assert.equal(
  hasFinancialReadinessEvidence("Seçili sözleşmenin ödeme üst limiti nedir?"),
  false,
  "selected agreement payment ceiling is not financial readiness evidence",
);
assert.equal(
  hasFinancialReadinessEvidence("Seçili sözleşmenin fatura tutarı hangi alanda yer alır?"),
  false,
  "selected invoice amount field question is not financial readiness evidence",
);
assert.equal(
  hasFinancialReadinessEvidence("Ödeme hazırlığı hangi aşamada?"),
  true,
  "payment preparation stage remains financial readiness evidence",
);
assert.equal(
  hasFinancialReadinessEvidence("Bu hakediş neden hazır değil?"),
  true,
  "unready hakediş remains financial readiness evidence",
);

const boundaries = [
  {
    id: "01_FIELD_VS_SCREEN_CONTEXT",
    variants: [
      "Planlama Merkezi içindeki vardiya kaydının saatini değiştirebilir miyim?",
      "Planlama Merkezi içindeki vardiya kaydının ödeme limitini görebilir miyim?",
    ],
    check: (r) => specific(r, "FIELD_LOOKUP", "LOOK_UP_FIELD"),
  },
  {
    id: "02_CAPABILITY_FIELD_VS_SCREEN_CONTEXT",
    variants: [
      "Vardiya kaydının saatini değiştirme yetkim var mı?",
      "Sözleşmenin ödeme limitini düzenleme iznim bulunuyor mu?",
    ],
    check: (r) => specific(r, "FIELD_LOOKUP", "LOOK_UP_FIELD"),
  },
  {
    id: "03_CAPABILITY_RECORD_VS_ROLE_HELP",
    variants: [
      "Vardiya kaydını düzenleme yetkim var mı?",
      "Sözleşme kaydını güncelleme iznim var mı?",
    ],
    check: (r) => projection(r).task === "FIELD_LOOKUP" && projection(r).operation === "LOOK_UP_FIELD",
  },
  {
    id: "04_SELECTED_REFERENT_FIELD_VS_RISK",
    variants: [
      "Seçili sözleşmenin ödeme üst limiti nedir?",
      "Seçili sözleşmenin fatura tutarı hangi alanda yer alır?",
    ],
    state: selectedAgreement,
    check: (r) => specific(r, "FIELD_LOOKUP", "LOOK_UP_FIELD"),
  },
  {
    id: "05_EXPLICIT_RISK_VS_FIELD_LOOKUP",
    variants: [
      "Seçili sözleşmenin maliyet riskini değerlendirir misin?",
      "Bu ödeme yapısı riskli mi?",
    ],
    state: selectedAgreement,
    check: (r) => projection(r).task === "RISK" && projection(r).operation === "ASSESS_CURRENT_RISK",
  },
  {
    id: "06_COUNT_VS_ROLE_HELP",
    variants: [
      "Veli servis takibindeki vardiyaların toplamını çıkarabilir misin?",
      "Planlama Merkezindeki vardiya sayısını öğrenebilir miyim?",
    ],
    check: (r) => specific(r, "COUNT", "COUNT_AUTHORIZED_RECORDS"),
  },
  {
    id: "07_PRODUCT_DOMAIN_VS_OOS",
    variants: [
      "Bu hafta sonu evde yaratıcı bir etkinlik önerir misin?",
      "Tatil için evde yapılabilecek bir etkinlik fikri verir misin?",
    ],
    check: (r) => projection(r).scope === "OFF_TOPIC_GENUINE" && projection(r).task === "OFF_TOPIC",
  },
  {
    id: "08_NAVIGATION_VS_EXPLANATION",
    variants: [
      "Planlama Merkezi ekranına geçelim.",
      "Vardiya panelini açıp oraya gidelim.",
    ],
    check: (r) => projection(r).action === "NAVIGATE" && projection(r).operation === "NAVIGATE_AUTHORIZED_SURFACE",
  },
  {
    id: "09_SURFACE_HELP_VS_FIELD_LOOKUP",
    variants: [
      "Bu ekran ne işe yarıyor?",
      "Planlama Merkezi panelinin amacı nedir?",
    ],
    check: (r) => specific(r, "SCREEN_CONTEXT", "EXPLAIN_CURRENT_SURFACE"),
  },
  {
    id: "10_CREATE_PREPARE_VS_CAPABILITY",
    variants: [
      "Yeni bir vardiya kaydını hazırlamak için hangi başlangıç adımlarını izlemeliyim?",
      "Vardiya oluşturma yetkim var mı?",
    ],
    check: (r) => projection(r).action !== "CREATE",
  },
  {
    id: "11_UPDATE_VS_CAPABILITY",
    variants: [
      "Vardiya kaydını değiştirme yetkim var mı?",
      "Bu değişikliği yapabilir miyim?",
    ],
    check: (r) => projection(r).action !== "UPDATE",
  },
  {
    id: "12_CONTINUATION_VS_NAVIGATION",
    variants: [
      "Devamını anlat.",
      "Planlama Merkezi ekranına geçelim.",
    ],
    states: [activeContinuation, null],
    check: (r, index) => index === 0
      ? projection(r).action === "CONTINUE" && projection(r).operation === "CONTINUE_EXPLANATION"
      : projection(r).action === "NAVIGATE",
  },
  {
    id: "13_CONTINUATION_VS_GENERIC_EXPLANATION",
    variants: ["Devam et.", "Devamını anlatır mısın?"] ,
    state: activeContinuation,
    check: (r) => projection(r).action === "CONTINUE" && projection(r).operation === "CONTINUE_EXPLANATION",
  },
  {
    id: "14_AUTHORIZATION_DENIAL_VS_SEMANTICS",
    variants: [
      "Vardiya kaydının saatini değiştirebilir miyim?",
      "Sözleşmenin ödeme limitini görme iznim var mı?",
    ],
    check: (r) => projection(r).task === "FIELD_LOOKUP" && projection(r).operation === "LOOK_UP_FIELD",
  },
  {
    id: "15_AMBIGUITY_VS_OOS",
    variants: ["Bunu açıklar mısın?", "Şu kaydı açabilir misin?"],
    check: (r) => projection(r).scope !== "OFF_TOPIC_GENUINE" && projection(r).resolution !== "RESOLVED",
  },
  {
    id: "16_EXPLICIT_RECORD_VS_GENERIC_SURFACE",
    variants: ["Vardiya kaydının durumu nedir?", "Sözleşme kaydının tarihi nedir?"],
    check: (r) => specific(r, "FIELD_LOOKUP", "LOOK_UP_FIELD"),
  },
  {
    id: "17_EXPLICIT_FIELD_VS_GENERAL_INFORMATION",
    variants: ["Sözleşmenin ödeme tutarı nedir?", "Vardiya kaydının saati kaç?"],
    check: (r) => specific(r, "FIELD_LOOKUP", "LOOK_UP_FIELD"),
  },
  {
    id: "18_SELECTED_REFERENT_VS_GENERIC_DOMAIN_HELP",
    variants: ["Seçili sözleşmenin ödeme tutarı nedir?", "Seçili sözleşmenin fatura bedeli nedir?"],
    state: selectedAgreement,
    check: (r) => specific(r, "FIELD_LOOKUP", "LOOK_UP_FIELD"),
  },
];

let total = 0;
let pass = 0;
const failures = [];
for (const boundary of boundaries) {
  for (const role of ROLES) {
    for (let index = 0; index < boundary.variants.length; index += 1) {
      const state = boundary.states ? boundary.states[index] : boundary.state || null;
      const result = resolve(role, boundary.variants[index], state);
      total += 1;
      if (boundary.check(result, index)) pass += 1;
      else failures.push({ boundary: boundary.id, role, variant: index + 1, actual: projection(result) });
    }
  }
}

assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 20), null, 2));
assert.equal(pass, total);
console.log(`status=PASS total=${total} pass=${pass} fail=${failures.length}`);
console.log(`boundaries=${boundaries.length} roles=${ROLES.length}`);
