const ROOM_COST_INTENTS = Object.freeze([
  "COST_ENTRY_CREATE",
  "COST_ENTRY_UPDATE",
  "COST_SUMMARY",
  "COST_MISSING_DATA",
  "COST_RECURRING_REVIEW",
  "COST_PROFITABILITY_EXPLAIN",
]);

const SALARY_CATEGORIES = new Set([
  "EMPLOYER_MONTHLY_COST", "BASE_SALARY", "BENEFIT", "OVERTIME", "PER_DIEM",
  "MEAL_ALLOWANCE", "SOCIAL_COST", "OTHER_DRIVER",
]);

const TARGETS = Object.freeze({
  LEDGER: "room:financial-operations:cost-ledger",
  ENTRY_FORM: "room:financial-operations:cost-entry-form",
  SUMMARY: "room:financial-operations:cost-summary",
});

function text(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return text(value).toUpperCase();
}

function finiteId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function fold(value) {
  return text(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function sameRoom(value, roomId) {
  const candidateRoom = finiteId(value?.roomId);
  return candidateRoom !== null && candidateRoom === finiteId(roomId);
}

function safeReference(value, kind) {
  if (!value || typeof value !== "object") return null;
  const type = upper(value.type || value.entityType || kind);
  const id = finiteId(value.id || value.entityId);
  const plate = text(value.plate || value.licensePlate || value.label);
  return {
    type: type || kind,
    id,
    plate: plate || null,
    roomId: finiteId(value.roomId),
  };
}

function collectionFor(activeContext, kind) {
  return kind === "VEHICLE"
    ? (Array.isArray(activeContext?.authorizedVehicles) ? activeContext.authorizedVehicles : [])
    : (Array.isArray(activeContext?.authorizedDrivers) ? activeContext.authorizedDrivers : []);
}

function matchAuthorized(reference, activeContext, kind) {
  const candidate = safeReference(reference, kind);
  if (!candidate || candidate.type !== kind) return null;
  const activeRoomId = finiteId(activeContext?.roomId);
  if (candidate.roomId !== null && candidate.roomId !== activeRoomId) return null;
  const records = collectionFor(activeContext, kind)
    .filter((item) => sameRoom(item, activeContext?.roomId))
    .map((item) => safeReference(item, kind))
    .filter((item) => item?.type === kind);
  const selected = safeReference(activeContext?.selectedRecord, kind);
  const candidates = records.length
    ? records
    : (selected && selected.type === kind && sameRoom(selected, activeContext?.roomId) ? [selected] : []);
  return candidates.find((item) => (
    (candidate.id !== null && item.id === candidate.id)
      || (candidate.plate && fold(item.plate) === fold(candidate.plate))
  )) || null;
}

function normalizeCategory(value) {
  const key = upper(value?.key || value);
  return key || null;
}

function normalizeFields(fields = {}) {
  const categoryKey = normalizeCategory(fields.category?.key || fields.category || fields.categoryKey);
  const vehicle = safeReference(fields.vehicle, "VEHICLE")
    || safeReference(fields.vehicleRef, "VEHICLE")
    || (finiteId(fields.vehicleId) ? { type: "VEHICLE", id: finiteId(fields.vehicleId), plate: null, roomId: finiteId(fields.roomId) } : null);
  const driver = safeReference(fields.driver, "DRIVER")
    || safeReference(fields.driverRef, "DRIVER")
    || (finiteId(fields.driverId) ? { type: "DRIVER", id: finiteId(fields.driverId), plate: null, roomId: finiteId(fields.roomId) } : null);
  const period = fields.period && typeof fields.period === "object"
    ? {
      kind: upper(fields.period.kind) || null,
      value: text(fields.period.value) || null,
      start: text(fields.period.start) || null,
      end: text(fields.period.end) || null,
    }
    : null;
  const amount = Number.isSafeInteger(fields.amountMinor) && fields.amountMinor > 0 ? fields.amountMinor : null;
  const currencyCode = /^[A-Z]{3}$/u.test(upper(fields.currencyCode)) ? upper(fields.currencyCode) : null;
  const evidenceRef = text(fields.evidenceRef) || null;
  return {
    category: categoryKey ? { key: categoryKey } : null,
    vehicle,
    driver,
    period,
    amountMinor: amount,
    currencyCode,
    evidenceRef,
    salaryRequested: Boolean(fields.salaryRequested),
  };
}

function previousDraft(activeContext) {
  const state = activeContext?.conversationState;
  const settledPlan = state?.lastSettledResult?.semanticPlan;
  const settledConversationState = settledPlan?.roomCostConversationState;
  const roomCostState = state?.roomCost || state?.roomCostConversationState;
  if (roomCostState?.draft && typeof roomCostState.draft === "object") {
    return {
      ...roomCostState,
      ...roomCostState.draft,
    };
  }
  const draft = state?.draft
    || state?.roomCostDraft
    || state?.costDraft
    || settledConversationState?.draft
    || settledPlan?.roomCostDraft;
  return draft && typeof draft === "object" ? draft : null;
}

function hasCrossRoomReference(fields, activeContext) {
  const activeRoomId = finiteId(activeContext?.roomId);
  return [fields?.vehicle, fields?.driver].some((reference) => {
    const candidateRoomId = finiteId(reference?.roomId);
    return candidateRoomId !== null && candidateRoomId !== activeRoomId;
  });
}

function contextChanged(fields, activeContext) {
  const roomId = finiteId(activeContext?.roomId);
  if (!roomId || !sameRoom(activeContext?.selectedRecord, roomId) && activeContext?.selectedRecord) return true;
  const selected = safeReference(activeContext?.selectedRecord, "VEHICLE");
  const vehicle = fields.vehicle;
  const driver = fields.driver;
  if (selected?.type === "VEHICLE" && vehicle?.id && selected.id !== vehicle.id) return true;
  if (selected?.type === "DRIVER" && driver?.id && selected.id !== driver.id) return true;
  return false;
}

function requireFields(fields, intent) {
  const missing = [];
  if (intent !== "COST_ENTRY_CREATE" && intent !== "COST_ENTRY_UPDATE") return missing;
  const category = fields.category?.key;
  if (!category) missing.push("CATEGORY");
  const needsDriver = SALARY_CATEGORIES.has(category) || fields.salaryRequested;
  if (needsDriver ? !fields.driver : !fields.vehicle) missing.push(needsDriver ? "DRIVER" : "VEHICLE");
  if (!fields.period?.kind || !fields.period?.value && !fields.period?.start) missing.push("PERIOD");
  if (fields.amountMinor === null) missing.push("AMOUNT");
  if (!fields.currencyCode) missing.push("CURRENCY");
  if (!fields.evidenceRef) missing.push("EVIDENCE_REF");
  return missing;
}

function targetFor(intent) {
  if (["COST_ENTRY_CREATE", "COST_ENTRY_UPDATE"].includes(intent)) return TARGETS.ENTRY_FORM;
  if (["COST_SUMMARY", "COST_RECURRING_REVIEW", "COST_PROFITABILITY_EXPLAIN"].includes(intent)) return TARGETS.SUMMARY;
  return TARGETS.LEDGER;
}

function targetDescriptor(targetKey, activeContext) {
  if (!targetKey) return null;
  return {
    status: "REQUESTED",
    targetKey,
    semanticId: `product:${targetKey}`,
    screenPath: "/room/financial-operations",
    roomId: finiteId(activeContext?.roomId),
  };
}

function normalizedRequest(semanticRequest) {
  return semanticRequest?.roomCostRequest
    || semanticRequest?.request?.roomCostRequest
    || semanticRequest?.canonicalRequest?.roomCostRequest
    || semanticRequest?.typedRequest?.roomCostRequest
    || null;
}

function mergeContinuationFields(requestFields, previous, action) {
  if (!previous || !["CONTINUE", "BACK", "RECOVER"].includes(action)) return requestFields;
  const oldFields = normalizeFields(previous.fields || previous);
  return {
    ...oldFields,
    ...requestFields,
    category: requestFields.category || oldFields.category,
    vehicle: requestFields.vehicle || oldFields.vehicle,
    driver: requestFields.driver || oldFields.driver,
    period: requestFields.period || oldFields.period,
    amountMinor: requestFields.amountMinor ?? oldFields.amountMinor,
    currencyCode: requestFields.currencyCode || oldFields.currencyCode,
    evidenceRef: requestFields.evidenceRef || oldFields.evidenceRef,
  };
}

export function resolveRoomCostRequest({ semanticRequest, activeContext = {} } = {}) {
  const request = normalizedRequest(semanticRequest) || {};
  const intent = ROOM_COST_INTENTS.includes(upper(request.intent)) ? upper(request.intent) : "COST_MISSING_DATA";
  const continuationAction = upper(request.continuationAction || request.continuation || "NEW_REQUEST") || "NEW_REQUEST";
  const previous = previousDraft(activeContext);
  let fields = mergeContinuationFields(normalizeFields(request.fields || {}), previous, continuationAction);
  const categoryKey = fields.category?.key;
  if (hasCrossRoomReference(fields, activeContext)) {
    return {
      intent,
      fields: { category: null, vehicle: null, driver: null, period: null, amountMinor: null, currencyCode: null, evidenceRef: null, salaryRequested: false },
      missing: ["CONTEXT_STALE"],
      target: null,
      requiresSalaryCapability: false,
      confirmationRequired: false,
      continuationAction,
      stale: true,
    };
  }
  if (fields.vehicle) fields.vehicle = matchAuthorized(fields.vehicle, activeContext, "VEHICLE");
  if (fields.driver) fields.driver = matchAuthorized(fields.driver, activeContext, "DRIVER");

  const requiresSalaryCapability = Boolean(fields.salaryRequested || SALARY_CATEGORIES.has(categoryKey));
  const salaryAllowed = activeContext?.salaryAccess === true;
  const stale = contextChanged(fields, activeContext)
    || Boolean(previous?.roomId && finiteId(previous.roomId) !== finiteId(activeContext?.roomId))
    || Boolean(previous?.selectedRecordKey && text(previous.selectedRecordKey) !== text(activeContext?.selectedRecordKey || ""));
  if (stale) {
    return {
      intent,
      fields: { category: fields.category, vehicle: null, driver: null, period: null, amountMinor: null, currencyCode: null, evidenceRef: null, salaryRequested: false },
      missing: ["CONTEXT_STALE"],
      target: null,
      requiresSalaryCapability: false,
      confirmationRequired: false,
      continuationAction,
      stale: true,
    };
  }

  const missing = requireFields(fields, intent);
  if (requiresSalaryCapability && !salaryAllowed) missing.push("SALARY_CAPABILITY");
  const targetKey = requiresSalaryCapability && !salaryAllowed ? null : targetFor(intent);
  if (continuationAction === "BACK" || continuationAction === "RECOVER") {
    return {
      intent,
      fields,
      missing,
      target: targetDescriptor(TARGETS.LEDGER, activeContext),
      requiresSalaryCapability,
      confirmationRequired: false,
      continuationAction,
      stale: false,
    };
  }
  return {
    intent,
    fields,
    missing,
    target: targetDescriptor(targetKey, activeContext),
    requiresSalaryCapability,
    confirmationRequired: ["COST_ENTRY_CREATE", "COST_ENTRY_UPDATE"].includes(intent),
    continuationAction,
    stale: false,
  };
}

function missingLabel(value) {
  return {
    CATEGORY: "kategori",
    VEHICLE: "araç",
    DRIVER: "sürücü",
    PERIOD: "dönem",
    AMOUNT: "tutar",
    CURRENCY: "para birimi",
    EVIDENCE_REF: "kanıt referansı",
  }[value] || "gerekli bilgi";
}

export function buildRoomCostDraftReply({ draft = {}, access = {}, missing = [] } = {}) {
  const categoryKey = upper(draft?.fields?.category?.key);
  const salaryRequested = draft?.fields?.salaryRequested === true;
  const salarySensitive = SALARY_CATEGORIES.has(categoryKey) || salaryRequested;
  const salaryDenied = salarySensitive && access?.salaryAllowed !== true;
  if (salaryDenied) {
    return {
      answerTr: "Bu finansal ayrıntı için yetkili erişim gerekiyor. Yetkili ekran olmadan ayrıntı göstermiyorum.",
      guidedTarget: null,
      conversationState: {
        subject: "ROOM_COST",
        continuationAction: draft.continuationAction || "NEW_REQUEST",
        confirmationRequired: false,
        draft: { persisted: false, writeAction: false },
        audit: { readOnly: true, writeAction: false, redacted: true },
      },
      suggestedQuestions: [],
    };
  }

  const uniqueMissing = [...new Set((Array.isArray(missing) ? missing : []).filter((item) => item !== "SALARY_CAPABILITY"))];
  const missingText = uniqueMissing.length
    ? `Devam etmek için ${uniqueMissing.map(missingLabel).join(", ")} bilgisini netleştirelim.`
    : "Gider taslağı hazır; merkezi Gider Yönetimi formunda inceleyip açıkça onaylayabilirsin.";
  const safeFields = draft.fields || {};
  const vehiclePlate = text(safeFields.vehicle?.plate);
  const answerTr = draft.intent === "COST_MISSING_DATA"
    ? "Merkezi Gider Yönetimi ekranında eksik maliyet kanıtını ve kapsamını kontrol edebilirsin."
    : draft.intent === "COST_SUMMARY"
      ? `${vehiclePlate ? `${vehiclePlate} aracının ` : ""}yetkili gider özetini merkezi Gider Yönetimi ekranında gösteriyorum. Gerçekleşen kayıtları, dağıtım ilişkilerini ve eksik veriyi ayrı tutuyorum; otomatik kayıt veya onay yapmıyorum.`
    : draft.intent === "COST_PROFITABILITY_EXPLAIN"
      ? "Kârlılık açıklamasını merkezi Gider Yönetimi özetindeki yetkili gerçek kayıtlar ve eksik veri işaretleriyle sınırlı tutuyorum."
      : `${missingText} Otomatik kayıt veya onay yapmıyorum.`;
  const suggestedQuestions = uniqueMissing.length
    ? uniqueMissing.map((item) => `Eksik ${missingLabel(item)} bilgisini girelim.`)
    : ["Taslağı merkezi Gider Yönetimi formunda göster.", "Gider özetini aç."];
  const conversationState = {
    subject: "ROOM_COST_DRAFT",
    intent: draft.intent || null,
    continuationAction: draft.continuationAction || "NEW_REQUEST",
    confirmationRequired: draft.confirmationRequired === true,
    roomId: finiteId(draft.target?.roomId)
      || finiteId(safeFields.vehicle?.roomId)
      || finiteId(safeFields.driver?.roomId),
    selectedRecordKey: safeFields.vehicle?.id ? `VEHICLE:${safeFields.vehicle.id}` : safeFields.driver?.id ? `DRIVER:${safeFields.driver.id}` : null,
    draft: {
      persisted: false,
      writeAction: false,
      category: safeFields.category?.key || null,
      vehicleId: safeFields.vehicle?.id || null,
      driverId: safeFields.driver?.id || null,
      period: safeFields.period || null,
      amountMinor: safeFields.amountMinor,
      currencyCode: safeFields.currencyCode,
      evidenceRef: safeFields.evidenceRef,
    },
    audit: { readOnly: true, writeAction: false, salaryRedacted: false },
  };
  return {
    answerTr,
    guidedTarget: draft.target || null,
    conversationState,
    suggestedQuestions,
  };
}

export const ROOM_COST_SALARY_CATEGORIES = SALARY_CATEGORIES;
export const ROOM_COST_ASSISTANT_TARGETS = TARGETS;
export { ROOM_COST_INTENTS };
