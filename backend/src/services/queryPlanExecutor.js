import { createHash } from 'node:crypto';

const TERMINAL_STATUSES = new Set(["RESOLVED", "NO_DATA", "UNAUTHORIZED", "AMBIGUOUS"]);

function entityKey(entity) {
  if (!entity) return "";
  return `${entity.type}:${entity.id || entity.plate || ""}`;
}

const COLLECTION_ENTITY_TYPES = {
  AGREEMENTS: "AGREEMENT",
  OFFERS: "OFFER",
  SHIFTS: "SHIFT",
  VEHICLES: "VEHICLE",
  DRIVERS: "DRIVER",
  SERVICE_REQUESTS: "SERVICE_REQUEST",
  ORGANIZATION_PLANS: "ORGANIZATION_PLAN",
  PERSONNEL: "PERSONNEL",
};

function isCollectionWideRead(plan, domain) {
  const typedRequest = plan?.typedRequest || {};
  const taskType = String(typedRequest.taskType || plan?.taskType || "").toUpperCase();
  const targetEntityType = String(
    typedRequest.targetEntityType ||
    typedRequest.countTarget?.targetEntityType ||
    plan?.semanticEntityType ||
    "",
  ).toUpperCase();
  const collectionSummary = typedRequest.collectionSummaryIntent === true || plan?.collectionSummaryIntent === true;
  const collectionCount = taskType === "COUNT" && targetEntityType === COLLECTION_ENTITY_TYPES[domain];
  return collectionSummary || collectionCount;
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function factsFingerprint(values) {
  return createHash('sha256')
    .update(JSON.stringify(Array.isArray(values) ? values : []))
    .digest('hex');
}

function normalizeFacts(result) {
  if (Array.isArray(result?.facts)) return result.facts.filter(Boolean);
  return (Array.isArray(result?.records) ? result.records : []).filter(Boolean).map((text) => ({ text }));
}

function fieldValue(fact, key) {
  const values = fact?.fields || fact || {};
  if (key === "DATE_RANGE") {
    const start = values.startAtText || values.startDateText || values.startTime || values.startAt || values.startDate || null;
    const end = values.endAtText || values.endDateText || values.endTime || values.endAt || values.endDate || null;
    if (start == null && end == null) return null;
    return { start, end };
  }
  if (key === "TIME_RANGE") {
    const start = values.startTime || values.startAtText || values.startAt || null;
    const end = values.endTime || values.endAtText || values.endAt || null;
    if (start == null && end == null) return null;
    return { start, end };
  }
  const aliases = {
    STATUS: ["statusText", "status", "state"],
    DATE: ["dateText", "date", "updatedAt", "periodStart"],
    START_TIME: ["startAtText", "startTime", "startAt", "dateText"],
    END_TIME: ["endAtText", "endTime", "endAt"],
    SERVICE_BUYER_AMOUNT: ["serviceBuyerAmountText", "amountCompanyText", "serviceBuyerAmount", "amountCompany"],
    CARRIER_AMOUNT: ["carrierAmountText", "amountRoomText", "carrierAmount", "amountRoom"],
    NOTE: ["note", "noteText", "description", "noteRoom", "noteCompany"],
    NOTE_COMPANY: ["noteCompany"],
    NOTE_ROOM: ["noteRoom"],
    AGREEMENT_COMPANY_OFFER_AMOUNT: ["companyOfferAmountText", "companyOfferAmount"],
    QUALITY_STATE: ["qualityStateText", "qualityState", "quality"],
    RISK_STATE: ["riskStateText", "riskState", "risk"],
    OPERATION_STATUS: ["operationStatusText", "operationStatus", "readiness", "readinessText"],
    PLATE: ["plate", "vehiclePlate"],
    // A parent can be authorized to see that a child's live vehicle is not
    // currently assigned. Keep that visible state distinct from a plate so a
    // missing assignment never turns into an invented vehicle.
    VEHICLE: ["vehicle", "plate", "vehiclePlate", "vehicleState", "noActiveVehicleText"],
    DRIVER: ["driver", "driverName"],
    ETA: ["eta", "etaText"],
    GPS: ["gps", "gpsStatus", "location", "locationStatus"],
    ROUTE: ["route", "nextStop", "stopCount"],
    STOP_COUNT: ["stopCount"],
    PERSONNEL_COUNT: ["personnelCount", "personelCount", "peopleCount"],
    PASSENGER_COUNT: ["passengerCount", "personnelCount", "personelCount", "peopleCount"],
    BOARDING_COUNT: ["boardingCount", "boardCount", "checkinBoardingCount"],
    ALIGHTING_COUNT: ["alightingCount", "alightCount", "checkinAlightingCount"],
    OFFER: ["offer", "offerId", "offerStatus"],
    AGREEMENT: ["agreement", "agreementId", "agreementStatus"],
    SHIFT: ["shift", "shiftId"],
    PLAN: ["plan", "planId", "planStatus"],
    SERVICE_REQUEST: ["serviceRequest", "requestId", "requestStatus"],
    COST: ["cost", "amount", "amountText"],
    PARENT_ACCESS: ["parentAccess", "parentAccessCount"],
  };
  const match = (aliases[key] || []).find((name) => values[name] != null && String(values[name]).trim() !== "");
  if (!match) return null;
  const value = values[match];
  if (["SERVICE_BUYER_AMOUNT", "CARRIER_AMOUNT", "AGREEMENT_COMPANY_OFFER_AMOUNT"].includes(key)
    && (value == null || String(value).trim() === "-")) return null;
  const freshness = String(values.freshness || "").toUpperCase();
  if (key === "GPS" && freshness === "STALE") {
    // A stale provider label (for example "Canlı") is not the current
    // product state. Never expose it as if the old sample were live.
    return "Konum sinyali güncel değil • veri tazeliği: eski; güncel kabul edilmemeli";
  }
  if (key === "GPS" && freshness === "OFFLINE") {
    return "Konum sinyali çevrim dışı • veri tazeliği: eski; güncel kabul edilmemeli";
  }
  if (key === "GPS" && freshness === "UNKNOWN") {
    return "Konum bilgisi bilinmiyor • veri tazeliği: bilinmiyor";
  }
  if (key === "ETA" && freshness === "STALE") {
    return `${value == null ? "veri yok" : value} • veri tazeliği: eski; güncel kabul edilmemeli`;
  }
  if (key === "ETA" && freshness === "UNKNOWN") {
    return `${value == null ? "veri yok" : value} • veri tazeliği: bilinmiyor`;
  }
  return value;
}

function fieldLabel(key) {
  return {
    STATUS: "durum",
    DATE: "tarih",
    DATE_RANGE: "tarih aralığı",
    TIME_RANGE: "saat aralığı",
    START_TIME: "başlangıç saati",
    END_TIME: "bitiş saati",
    SERVICE_BUYER_AMOUNT: "hizmet alanı bedeli",
    CARRIER_AMOUNT: "taşımacı bedeli",
    NOTE: "notlar",
    NOTE_COMPANY: "hizmet alan firma notu",
    NOTE_ROOM: "taşımacılık firması notu",
    AGREEMENT_COMPANY_OFFER_AMOUNT: "firma teklif bedeli",
    QUALITY_STATE: "kalite durumu",
    RISK_STATE: "risk durumu",
    OPERATION_STATUS: "operasyon durumu",
    PLATE: "plaka",
    VEHICLE: "araç",
    DRIVER: "sürücü",
    ETA: "ETA",
    GPS: "konum",
    ROUTE: "rota/durak",
    STOP_COUNT: "durak sayısı",
    PERSONNEL_COUNT: "personel sayısı",
    PASSENGER_COUNT: "yolcu sayısı",
    BOARDING_COUNT: "biniş sayısı",
    ALIGHTING_COUNT: "iniş sayısı",
    OFFER: "teklif",
    AGREEMENT: "sözleşme",
    SHIFT: "vardiya",
    PLAN: "plan",
    SERVICE_REQUEST: "servis talebi",
    COST: "maliyet",
    PARENT_ACCESS: "veli erişimi",
  }[key] || String(key || "alan").toLocaleLowerCase("tr-TR");
}

function offerRecordValue(fact) {
  const values = fact?.fields || fact || {};
  const offerId = values.offerId;
  if (offerId == null || String(offerId).trim() === "") return null;
  const status = values.statusText || values.status || null;
  return status ? `kayıt #${offerId} (${status})` : `kayıt #${offerId}`;
}

function domainLabel(domain) {
  return {
    OFFERS: "teklif",
    AGREEMENTS: "sözleşme",
    SHIFTS: "vardiya",
    VEHICLES: "araç",
    DRIVERS: "sürücü",
    PERSONNEL: "personel/veli/öğrenci",
    SERVICE_REQUESTS: "servis talebi",
    OPERATIONS: "operasyon",
    BUDGET: "bütçe ve maliyet",
    FINANCE: "mali kayıt",
    NOTIFICATIONS: "bildirim",
    ORGANIZATION_PLANS: "organizasyon planı",
    TENANT_ACCESS: "tenant erişimi",
  }[String(domain || "").toUpperCase()] || "yetkili kayıt alanı";
}

function displayFieldValue(value) {
  if (value == null || String(value).trim() === "") return "yetkili kayıtta yok";
  if (typeof value === "object" && !(value instanceof Date)) {
    const start = value.start == null || String(value.start).trim() === "" ? "başlangıç bulunamadı" : displayFieldValue(value.start);
    const end = value.end == null || String(value.end).trim() === "" ? "bitiş bulunamadı" : displayFieldValue(value.end);
    return `${start} – ${end}`;
  }
  if (value instanceof Date) return value.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  }
  if (typeof value === "string" && /^\d{1,2}:\d{2}:\d{2}$/.test(value.trim())) return value.trim().slice(0, 5);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [year, month, day] = value.trim().split("-");
    return `${day}.${month}.${year}`;
  }
  return String(value);
}

function factsForEntity(items, entity) {
  const key = entityKey(entity);
  return items
    .filter((item) => !entity || !item.entity || entityKey(item.entity) === key)
    .flatMap((item) => item.facts || [])
    .filter((fact) => !entity || entityMatches(fact, entity));
}

function factsForField(items, entity, field) {
  const entityFacts = factsForEntity(items, entity);
  if (!field?.domain) return entityFacts;
  const domainFacts = items
    .filter((item) => item?.domain === field.domain)
    .flatMap((item) => item.facts || [])
    .filter((fact) => !entity || entityMatches(fact, entity));
  return domainFacts.length ? domainFacts : entityFacts;
}

function relationDerivedValue(relation, sourceFacts) {
  if (relation?.fromEntity?.type === "agreement" && relation?.toEntity?.type === "shift") {
    return sourceFacts
      .flatMap((fact) => Array.isArray(fact?.generatedShiftIds) ? fact.generatedShiftIds : [])
      .find((value) => value != null && String(value).trim() !== "") ?? null;
  }
  const targetField = relation?.toEntity?.type === "shift" ? "SHIFT"
    : relation?.toEntity?.type === "vehicle" ? "VEHICLE"
      : relation?.toEntity?.type === "driver" ? "DRIVER"
        : relation?.toEntity?.type === "agreement" ? "AGREEMENT"
          : relation?.toEntity?.type === "offer" ? "OFFER" : "SHIFT";
  return sourceFacts
    .map((fact) => fieldValue(fact, targetField))
    .find((value) => value != null && String(value).trim() !== "") ?? null;
}

function normalizeContinuationValue(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function continuationNovelDetails(plan, fact) {
  if (!fact) return [];
  const previous = normalizeContinuationValue(plan?.previousAnswerText);
  const candidates = [
    ["DATE_RANGE", fact.startAtText && fact.endAtText ? `${fact.startAtText} – ${fact.endAtText}` : null],
    ["DATE", fact.startAtText || fact.dateText || fact.updatedAtText || null],
    ["NOTE", fact.note || fact.noteText || fact.description || null],
    ["STOP_COUNT", fact.stopCount != null ? fact.stopCount : null],
    ["PASSENGER_COUNT", fact.passengerCount != null ? fact.passengerCount : (fact.personnelCount != null ? fact.personnelCount : null)],
    ["BOARDING_COUNT", fact.boardingCount != null ? fact.boardingCount : null],
    ["ALIGHTING_COUNT", fact.alightingCount != null ? fact.alightingCount : null],
    ["AMOUNT", fact.amountText || fact.roomOfferAmountText || fact.companyOfferAmountText || null],
    ["COMPANY", fact.companyName || fact.company || fact.companyLabel || null],
    ["ROUTE", fact.routeText || fact.nextStop || null],
    ["ETA", fact.etaText || null],
  ];
  return candidates
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([key, value]) => ({ key, value: displayFieldValue(value) }))
    .filter(({ key, value }) => {
      const label = normalizeContinuationValue(fieldLabel(key));
      const normalizedValue = normalizeContinuationValue(value);
      return !previous
        || (!previous.includes(label) && (!normalizedValue || !previous.includes(normalizedValue)));
    });
}

function continuationState(plan, items) {
  if (plan?.family !== "CONTINUE_CURRENT_REASONING") return null;
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const fact = factsForEntity(items, entity)[0] || null;
  const continuationFamily = String(plan?.continuationOfFamily || "");
  const genericFamily = ![
    "RELATION_LOOKUP",
    "COMPARISON",
    "PRIORITY",
    "RISK_RANKING",
    "RECORD_DETAILS",
    "NEXT_STEP",
  ].includes(continuationFamily);
  const novelDetails = genericFamily ? continuationNovelDetails(plan, fact) : [];
  return {
    complete: genericFamily && novelDetails.length === 0,
    hasNewDetail: novelDetails.length > 0,
  };
}

function buildRelationReply(plan, items) {
  const relation = plan?.relationshipIntent || plan?.relationSpec;
  if (relation?.kind === "AGREEMENT_TO_SHIFT_COLLECTION") {
    const shifts = items
      .filter((item) => item?.domain === "SHIFTS")
      .flatMap((item) => item?.facts || [])
      .filter((fact) => Number(fact?.agreementId) > 0 && Number(fact?.id || fact?.shiftId) > 0);
    if (!shifts.length) return "Bu ekranda yetkili sözleşme kaynaklı vardiya görünmüyor.";
    const labels = shifts.slice(0, 5).map((fact) => {
      const shiftId = Number(fact.id || fact.shiftId);
      const agreementId = Number(fact.agreementId);
      return `Vardiya #${shiftId} (Sözleşme #${agreementId})`;
    });
    const suffix = shifts.length > labels.length ? ` İlk doğrulanmış kayıtlar: ${labels.join(", ")}.` : `: ${labels.join(", ")}.`;
    return `Sözleşmeden üretilen yetkili vardiyalar${suffix}`;
  }
  if (!relation?.fromEntity || !relation?.toEntity) return "İstenen bağlı kayıt yetkili kanıtla doğrulanamadı.";
  const target = relation.toEntity;
  const targetFacts = Number(target.id) > 0 ? factsForEntity(items, target) : [];
  const relationLabel = target.type === "shift" ? "bağlı vardiya"
    : target.type === "vehicle" ? "bağlı araç"
      : target.type === "driver" ? "bağlı sürücü"
        : target.type === "agreement" ? "bağlı sözleşme"
          : target.type === "offer" ? "bağlı teklif"
          : "bağlı kayıt";
  const targetField = target.type === "shift" ? "SHIFT" : target.type === "vehicle" ? "VEHICLE" : target.type === "driver" ? "DRIVER" : target.type === "agreement" ? "AGREEMENT" : target.type === "offer" ? "OFFER" : "SHIFT";
  const sourceFacts = factsForEntity(items, relation.fromEntity);
  const relatedOfferFact = target.type === "offer" && Number(relation.fromEntity?.id) > 0
    ? items
      .filter((item) => item?.domain === "OFFERS")
      .flatMap((item) => item?.facts || [])
      .find((fact) => Number(fact?.shiftId) === Number(relation.fromEntity.id) && Number(fact?.offerId || fact?.id) > 0)
    : null;
  const derivedValue = relatedOfferFact?.offerId ?? relationDerivedValue(relation, sourceFacts);
  if (!targetFacts.length && derivedValue == null) {
    const unauthorized = items.some((item) => item?.status === "UNAUTHORIZED");
    if (!unauthorized && relation.fromEntity?.type === "agreement" && target.type === "shift") {
      return `${labelForEntity(relation.fromEntity)} için bağlı üretilmiş vardiya bulunmuyor.`;
    }
    return `${labelForEntity(relation.fromEntity)} için ${fieldLabel(targetField)} yetkili kayıtta doğrulanamadı.`;
  }
  if (!target.id && derivedValue != null) {
    if (relation.fromEntity.type === "shift" && target.type === "offer") {
      const offerStatus = relatedOfferFact?.statusText || relatedOfferFact?.status;
      return `${labelForEntity(relation.fromEntity)} için bağlı teklif: Teklif #${displayFieldValue(derivedValue)}${offerStatus ? ` (${offerStatus})` : ""}.`;
    }
    if (relation.fromEntity.type === "driver" && target.type === "vehicle") {
      const driverName = sourceFacts
        .map((fact) => String(fact?.driverName || fact?.driver || "").trim())
        .find(Boolean);
      if (driverName) return `${driverName}'ın bağlı aracı: ${displayFieldValue(derivedValue)}.`;
      return `Sürücü #${relation.fromEntity.id} için bağlı araç: ${displayFieldValue(derivedValue)}.`;
    }
    const valueLabel = target.type === "vehicle" ? `Araç ${displayFieldValue(derivedValue)}`
      : target.type === "driver" ? `Sürücü ${displayFieldValue(derivedValue)}`
        : target.type === "shift" ? `Vardiya #${displayFieldValue(derivedValue)}`
          : displayFieldValue(derivedValue);
    return `${labelForEntity(relation.fromEntity)} için ${relationLabel}: ${valueLabel}.`;
  }
  return `${labelForEntity(relation.fromEntity)} için ${relationLabel}: ${labelForEntity(target)}.`;
}

function relationTargetFieldKey(relation) {
  const targetType = String(relation?.toEntity?.type || '').toLowerCase();
  return targetType === 'shift' ? 'SHIFT'
    : targetType === 'vehicle' ? 'VEHICLE'
      : targetType === 'driver' ? 'DRIVER'
        : targetType === 'agreement' ? 'AGREEMENT'
          : targetType === 'offer' ? 'OFFER'
            : null;
}

function buildRecordDetailsReply(plan, items) {
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const facts = factsForEntity(items, entity);
  const fact = facts[0] || null;
  if (!entity || !fact) {
    return `${labelForEntity(entity)} için yetkili ayrıntı bulunamadı; başka bir kaydı bunun yerine kullanmıyorum.`;
  }
  const label = labelForEntity(entity);
  const lines = [];
  const add = (labelText, value) => {
    if (value == null || String(value).trim() === "") return;
    lines.push(`${labelText}: ${value}`);
  };
  const amount = (value) => value == null || String(value).trim() === "" || String(value).trim() === "-"
    ? "henüz girilmemiş"
    : displayFieldValue(value);
  if (entity.type === "offer") {
    add("Firma", fact.companyName);
    add("Durum", fact.statusText || fact.status);
    if (fact.shiftId != null) add("Bağlı vardiya", `Vardiya #${fact.shiftId}`);
    const start = fact.startAtText || fact.startAt || null;
    const end = fact.endAtText || fact.endAt || null;
    if (start || end) add("Tarih aralığı", `${start ? displayFieldValue(start) : "başlangıç bilgisi yok"} – ${end ? displayFieldValue(end) : "bitiş bilgisi yok"}`);
    if (fact.serviceBuyerAmount != null || fact.amountCompany != null || fact.amountCompanyText != null) add("Hizmet alan firma tutarı", amount(fact.serviceBuyerAmountText ?? fact.amountCompanyText ?? fact.serviceBuyerAmount ?? fact.amountCompany));
    if (fact.carrierAmount != null || fact.amountRoom != null || fact.amountRoomText != null) add("Taşımacılık Firması tutarı", amount(fact.carrierAmountText ?? fact.amountRoomText ?? fact.carrierAmount ?? fact.amountRoom));
    if (fact.noteCompany != null || fact.noteRoom != null) {
      add("Not (Hizmet Alan Firma)", fact.noteCompany);
      add("Not (Taşımacılık Firması)", fact.noteRoom);
    } else {
      add("Not", fact.note || fact.noteText || fact.description);
    }
    add("Kalite", fact.qualityStateText || fact.qualityState);
    add("Risk", fact.riskStateText || fact.riskState);
  } else {
    add("Durum", fact.statusText || fact.status);
    add("Tarih", fact.dateText || fact.date);
    if (entity.type === "shift") {
      add("Araç", fact.vehiclePlate || fact.vehicle);
      add("Sürücü", fact.driverName || fact.driver);
    } else if (entity.type === "driver") {
      add("Sürücü", fact.driverName || fact.driver);
      add("Bağlı araç", fact.vehiclePlate || fact.vehicle);
      add("Aktif vardiyalar", Array.isArray(fact.activeShiftIds) ? fact.activeShiftIds.map((id) => `#${id}`).join(", ") : fact.activeShiftIds);
      add("Vardiya durumu", fact.statusText || fact.status);
    }
  }
  return `${label} ayrıntıları: ${lines.length ? `${lines.join(". ")}.` : "Yetkili kayıtta gösterilebilir ayrıntı bulunmuyor."}`;
}

function buildFieldReply(plan, items) {
  const fields = plan?.requestedFields || [];
  if (!fields.length) return "";
  // A discourse follow-up without a resolved entity must be clarified. It
  // cannot safely use the first same-named field from a domain-wide result.
  if (plan.typedRequest?.taskType === "FIELD_LOOKUP" && plan.discourseReference && !plan.entity) {
    return "Bahsettiğin kaydın hangisi olduğunu netleştirir misin?";
  }
  const scopedFacts = plan.entity
    ? factsForEntity(items, plan.entity).filter((fact) => entityMatches(fact, plan.entity))
    : [];
  const fieldFacts = plan.entity ? scopedFacts : items.flatMap((item) => item.facts || []);
  if (plan.entity && !fieldFacts.length) {
    return `${labelForEntity(plan.entity)} için istenen alanı doğrulayan yetkili kayıt bulunamadı; başka bir kaydı bunun yerine kullanmıyorum.`;
  }
  const values = fields.map((field) => {
    const scopedFieldFacts = factsForField(items, plan.entity, field);
    const fact = scopedFieldFacts[0] || null;
    if (field.key === "NOTE" && plan.entity?.type === "offer" && fact) {
      const noteLines = [
        fact.noteCompany != null && String(fact.noteCompany).trim() !== ""
          ? `Hizmet alan firma notu: ${displayFieldValue(fact.noteCompany)}` : null,
        fact.noteRoom != null && String(fact.noteRoom).trim() !== ""
          ? `Taşımacılık Firması notu: ${displayFieldValue(fact.noteRoom)}` : null,
      ].filter(Boolean);
      if (noteLines.length) return noteLines.join(" • ");
    }
    const value = field.key === "OFFER"
      ? scopedFieldFacts.map((fact) => offerRecordValue(fact)).find((candidate) => candidate != null)
      : scopedFieldFacts.map((fact) => fieldValue(fact, field.key)).find((candidate) => candidate != null);
    const commercialNoValue = ["SERVICE_BUYER_AMOUNT", "CARRIER_AMOUNT", "AGREEMENT_COMPANY_OFFER_AMOUNT"].includes(field.key) && value == null;
    const label = field.key === "OFFER" ? "teklif kaydı" : fieldLabel(field.key);
    return `${label}: ${commercialNoValue ? "henüz girilmemiş" : displayFieldValue(value)}`;
  });
  return `${plan.entity ? `${labelForEntity(plan.entity, fieldFacts)} için ` : "Yetkili sonuç için "}${values.join(" • ")}.`;
}

function outputSlotResults(plan, items, comparison) {
  const slots = [];
  const unauthorized = items.some((item) => item.status === "UNAUTHORIZED");
  const terminalFor = (resolved) => unauthorized ? "UNAUTHORIZED" : resolved ? "RESOLVED" : "NO_DATA";
  const relation = plan?.relationshipIntent || plan?.relationSpec;
  if (relation?.fromEntity && relation?.toEntity) {
    const sourceFacts = factsForEntity(items, relation.fromEntity);
    const related = Number(relation.toEntity.id) > 0 && factsForEntity(items, relation.toEntity).length > 0
      || relationDerivedValue(relation, sourceFacts) != null;
    slots.push({ category: "RELATION", key: `${relation.fromEntity.type}->${relation.toEntity.type}`, status: terminalFor(related) });
  }
  for (const field of plan?.requestedFields || []) {
    const facts = plan?.entity ? factsForField(items, plan.entity, field) : items.flatMap((item) => item.facts || []);
    const resolved = facts.some((fact) => fieldValue(fact, field.key) != null);
    slots.push({ category: field.key === "DATE_RANGE" || field.key === "TIME_RANGE" || field.key === "DATE" || field.key === "START_TIME" || field.key === "END_TIME" ? "TEMPORAL_FIELD" : "SCALAR_FIELD", key: field.key, status: terminalFor(resolved) });
  }
  for (const slot of plan?.requiredOutputSlots || []) {
    if (["GROUNDED_FACT", "WRITTEN_OUTPUT"].includes(slot)) continue;
    const orderSlot = ["WINNER_OR_ORDER", "ORDER_DECISION"].includes(slot);
    const comparisonDecision = orderSlot && comparison ? resolveComparisonDecision(comparison) : null;
    const selectedEvidence = plan?.entity ? factsForEntity(items, plan.entity).length > 0 : false;
    slots.push({
      category: "TASK_OR_REASONING_SLOT",
      key: slot,
      status: comparisonDecision?.status === "INSUFFICIENT_EVIDENCE" ? "UNKNOWN" : terminalFor(orderSlot ? Boolean(comparisonDecision) || selectedEvidence : true),
    });
  }
  return slots;
}

function buildContinuationReply(plan, items, comparison, currentFactsFingerprint = '') {
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const fact = factsForEntity(items, entity)[0] || null;
  const depth = Number(plan?.continuationDepth || 1);
  const continuationFamily = String(plan?.continuationOfFamily || "");
  const relation = plan?.relationshipIntent || plan?.relationSpec;
  const isCollectionRelation = relation?.kind === "AGREEMENT_TO_SHIFT_COLLECTION";
  const label = entity
    ? labelForEntity(entity)
    : continuationFamily === "RISK_RANKING"
      ? "Bu risk özeti"
      : continuationFamily === "COMPARISON"
        ? "Bu karşılaştırma"
        : continuationFamily === "PRIORITY"
          ? "Bu önceliklendirme"
          : labelForEntity(entity);
  const reasoningContinuation = ["COMPARISON", "PRIORITY", "RISK_RANKING"].includes(continuationFamily);
  // A collection relation is intentionally not represented by one selected
  // record.  Its evidence is the authorized relation result (the source and
  // target collections), so the generic single-record guard must not erase
  // the relation continuation before its dedicated branch can compose it.
  const requiresRecordEvidence = !reasoningContinuation
    && continuationFamily !== "SCREEN_CONTEXT"
    && !isCollectionRelation;
  if (!entity && requiresRecordEvidence) {
    return "Bu konuşmada tek bir kayıt seçili değil; ilk satırı veya eski bir kaydı varsaymıyorum. İncelemek istediğin kayıt ya da alanı belirtmen gerekir.";
  }
  if (!fact && requiresRecordEvidence) return "Bu konuşmada paylaşılabilecek yeni bir ayrıntı bulunamadı; başka bir kaydı veya ilişkiyi varsaymıyorum.";
  if (plan.continuationOfFamily === "RELATION_LOOKUP") {
    if (isCollectionRelation) {
      const relationReply = buildRelationReply(plan, items);
      const continuationAction = String(plan?.continuationAction || plan?.typedRequest?.continuationAction || "CONTINUE").toUpperCase();
      if (continuationAction === "BACK") {
        if (depth <= 1) {
          return `Bu ilişkinin ilk adımındasın; geri dönülecek önceki bir adım yok. Yetkili vardiya listesini koruyorum. ${relationReply}`;
        }
        return `Bir önceki ilişki adımına döndüm; yeni bir kayıt varsaymıyorum. ${relationReply}`;
      }
      if (continuationAction === "RECOVER") {
        return `İlişki görevinde kaybolduysan Vardiyalar ekranındaki Sözleşmeden Üretilen sekmesinden aynı yetkili listeye dönebilirsin. ${relationReply}`;
      }
      if (depth === 1) {
        return `Adım adım ilerleyelim: önce yetkili sözleşme kaynaklı vardiyaları doğruluyorum; ardından Vardiyalar ekranında bu listeyi açıyorum. ${relationReply}`;
      }
      if (depth === 2) {
        return `Aynı ilişki bağlamında ikinci adım: sözleşme kaynaklı vardiya kayıtlarını ve sözleşme bağlantılarını karşılaştırıyorum. ${relationReply}`;
      }
      return `Bu ilişkinin doğrulanmış sonucu aynı kaldı; yeni bir kayıt varsaymadan sonraki alanı belirtmen gerekir. ${relationReply}`;
    }
    const target = relation?.toEntity;
    const targetType = target?.type
      || relation?.requestedRelation
      || String(plan?.canonicalRequest?.semanticAction?.objectClass || "").toLowerCase()
      || ((plan?.requestedDomains || []).includes("AGREEMENTS") ? "agreement" : "record");
    const targetField = targetType === "shift" ? "SHIFT"
      : targetType === "vehicle" ? "VEHICLE"
        : targetType === "driver" ? "DRIVER"
          : targetType === "agreement" ? "AGREEMENT" : null;
    const sourceFacts = relation?.fromEntity ? factsForEntity(items, relation.fromEntity) : [fact];
    const targetFacts = target && Number(target.id) > 0 ? factsForEntity(items, target) : [];
    const derivedValue = targetField ? relationDerivedValue(relation, sourceFacts) : null;
    const verifiedTarget = Boolean(target && (
      (Number(target.id) > 0 && targetFacts.length > 0)
      || (Number(target.id) <= 0 && derivedValue != null)
    ));
    if (!verifiedTarget) {
      const relationLabel = targetType === "agreement" ? "bağlı sözleşme" : "bağlı kayıt";
      return `${label} için ${relationLabel} yetkili kayıtta doğrulanmadı; yeni bir kayıt varsaymıyorum.`;
    }
    const targetLabel = labelForEntity(target);
    if (depth === 1) return label + " ile " + targetLabel + " arasındaki ilişki yetkili kanıtla doğrulandı. Bunun dışında yeni bir bağlı kayıt veya ilişki kanıtı eklemiyorum.";
    if (depth === 2) return label + " için doğrulanmış bağ " + targetLabel + " ile sınırlı. Bu turda aynı ilişkiyi başka bir kayda genişletmiyorum; yeni ilişki kanıtı oluşmadı.";
    return label + " ile " + targetLabel + " bağı zaten açıklığa kavuştu. Aynı ilişkiyi yeniden üretmek yerine ilerlemek için yeni bir alan veya ilişki hedefi belirtmek gerekir.";
  }
  if (plan.continuationOfFamily === "COMPARISON" || plan.continuationOfFamily === "PRIORITY" || plan.continuationOfFamily === "RISK_RANKING") {
    const continuationAction = String(plan?.continuationAction || plan?.typedRequest?.continuationAction || "CONTINUE").toUpperCase();
    const analyticStepState = plan?.analyticStepState;
    if (analyticStepState?.family === plan.continuationOfFamily && Array.isArray(analyticStepState.steps)) {
      const targetOrdinal = Math.max(1, Number(analyticStepState.targetOrdinal || analyticStepState.cursor || 1) || 1);
      const targetStep = analyticStepState.steps.find((step) => Number(step?.ordinal || 0) === targetOrdinal);
      const factsStillMatch = !targetStep?.factsFingerprint
        || !currentFactsFingerprint
        || targetStep.factsFingerprint === currentFactsFingerprint;
      if (factsStillMatch && targetStep?.reply && (continuationAction !== 'BACK' || analyticStepState.canRestorePrevious)) {
        return String(targetStep.reply);
      }
    }
    if (continuationAction === "BACK") {
      return depth <= 1
        ? "Bu analitik açıklamanın ilk adımındasın; geri dönülecek önceki bir açıklama yok. Mevcut yetkili özeti koruyorum."
        : "Bir önceki analitik açıklamaya döndüm. Mevcut yetkili kanıtla sınırlı kalıyor, yeni bir karşılaştırma varsaymıyorum.";
    }
    if (continuationAction === "RECOVER") {
      return "Bu analitik akışta ayrı bir hedef doğrulanmadı; mevcut yetkili özetteki kanıtları yeniden kontrol edebilirsin. Yeni bir kayıt veya karşılaştırma varsaymıyorum.";
    }
    if (comparison?.status === "RESOLVED") {
      const difference = Object.entries(comparison.difference || {})
        .filter(([, row]) => row && !row.equal)
        .map(([key, row]) => fieldLabel(key) + " bakımından " + displayFieldValue(row.left) + " / " + displayFieldValue(row.right) + " farkı var")
        .join("; ");
      if (depth === 1) {
        return difference
          ? "Kararın dayanağını açayım: " + difference + ". Bu fark, karşılaştırmadaki mevcut yetkili alanlardan çıkarıldı."
          : "Karşılaştırmadaki yetkili alanlar arasında yeni bir fark bulunmadı; bu nedenle ek bir üstünlük iddiası kurmuyorum.";
      }
      if (depth === 2) {
        return difference
          ? "Bu farklar yalnızca karşılaştırılan kayıtların tarih ve vardiya kanıtlarından kaynaklanıyor; bunlara dayanarak desteklenmeyen bir neden eklemiyorum."
          : "İki kaydın karşılaştırılabilir yetkili alanları aynı görünüyor; bu nedenle birini diğerinden üstün gösteren ek bir gerekçe yok.";
      }
      return "Karşılaştırmanın mevcut yetkili kanıtı tamamlandı. Yeni bir fark veya öncelik iddiası üretmiyorum; devam etmek için yeni bir karşılaştırma boyutu belirtmek gerekir.";
    }
    if (depth === 1) return label + " için kararın dayanağı, yetkili kayıtta görülen risk ve kalite bilgileridir; karşılaştırma kanıtı olmayan başka bir kaydı eklemiyorum.";
    if (depth === 2) return "Karşılaştırma için gerekli ikinci tarafın yetkili kanıtı tamamlanmadı; bu nedenle yeni bir öncelik veya fark sonucu kurmuyorum.";
    return "Bu karşılaştırma zincirinde yeni yetkili kanıt oluşmadı. İlerlemek için karşılaştırılacak kaydı veya boyutu açıkça belirtmek gerekir.";
  }
  if (plan.continuationOfFamily === "RECORD_DETAILS") {
    const missing = Array.isArray(fact.qualityMissingFields) ? fact.qualityMissingFields : [];
    const riskReasons = Array.isArray(fact.riskReasons) ? fact.riskReasons : [];
    if (depth === 1 && missing.length) return "Ayrıntının kritik noktası şu: " + label + " kaydında " + missing.join(", ") + " eksik. Bu eksiklik kalite durumunu etkiliyor; eksik alanlar tamamlanmadan kesin karar vermiyorum.";
    if (depth === 3 && riskReasons.length) return label + " için güvenli devam adımı: " + riskReasons.join(", ") + " giderilmeden kabul veya red kararı verme; aynı kaydı güncel kanıt geldikten sonra yeniden doğrula.";
    if (depth === 4) return label + " için mevcut yetkili kanıt katmanı tamamlandı. Yeni bilgi üretmek yerine incelemek istediğin alanı belirt; aynı yanıtı tekrarlamıyorum.";
    if (depth === 5) return label + " için bu kanıt kümesinde ek doğrulanmış ayrıntı yok. Devam etmek için yeni bir alan veya soru hedefi gerekir.";
    if (depth > 5) return label + " kaydında yeni kanıt oluşmadı; bu nedenle devam zincirini güvenli biçimde sonlandırıyorum.";
    if (riskReasons.length) return label + " için devam eden kanıt: " + riskReasons.join(", ") + ". Bunun etkisi, kaydın operasyonel uygunluğunu yeniden doğrulamayı gerektiriyor; yeni bir ilişki varsaymıyorum.";
    if (fact.statusText) return label + " kaydının durum dayanağı " + fact.statusText + ". Bu turda yeni bir alan veya ilişki kanıtlanmadığı için mevcut yetkili içerikle sınırlı kalıyorum.";
  }
  if (plan.continuationOfFamily === "NEXT_STEP") {
    if (depth === 1) return "Önerilen sonraki adımın dayanağı " + label + " kaydındaki mevcut yetkili kanıttır. Yeni bir işlem başlatmadan önce aynı kaydın güncel durumunu yeniden doğrulamak gerekir.";
    if (depth === 2) return label + " için önerilen kontrol tamamlanmadan yeni bir işlem veya kayıt açmıyorum. Önce mevcut kaydın güncel kanıtını doğrulamak gerekir.";
    return label + " için güvenli sonraki adım zaten belirtildi; aynı talimatı tekrarlamıyorum. İlerlemek için kontrol sonucunu veya yeni hedefi paylaşmak gerekir.";
  }
  const novelDetails = continuationNovelDetails(plan, fact);
  if (novelDetails.length) {
    return `${label} için ek doğrulanmış bilgi: ${novelDetails.map(({ key, value }) => `${fieldLabel(key)}: ${value}`).join(" • ")}.`;
  }
  return `${label} için ilk açıklamada doğrulanabilen bilgiler tamamlandı. Yeni bir ayrıntı görünmüyor; başka bir alanı sorabilirsin.`;
}

function buildNextStepReply(plan, items) {
  const resolved = (Array.isArray(items) ? items : []).filter((item) => item.status === "RESOLVED" && (item.facts || []).length);
  if (!resolved.length) return "Sıradaki güvenli adımı belirlemek için yetkili güncel kayıt kanıtı bulunamadı; başka bir kaydı varsaymıyorum.";
  const item = resolved[0];
  const entity = item.entity || plan?.entity || plan?.entities?.[0] || null;
  const label = labelForEntity(entity);
  const nextAction = String(item.nextAction || "").trim();
  if (nextAction) return `${label} için sıradaki güvenli adım: ${nextAction}`;
  return `${label} için sıradaki güvenli adım, mevcut yetkili kanıtı yeniden doğrulamak; bu doğrulama tamamlanmadan yeni bir işlem başlatmamaktır.`;
}

function entityMatches(fact, entity) {
  if (!entity) return true;
  if (entity.type === "vehicle") {
    if (entity.id) return Number(fact?.vehicleId ?? fact?.id) === Number(entity.id);
    return String(fact?.plate || fact?.vehiclePlate || "").replace(/\s+/g, "").toUpperCase() === String(entity.plate || "").replace(/\s+/g, "").toUpperCase();
  }
  const typedId = fact?.[`${entity.type}Id`]
    ?? (entity.type === "personnel" ? fact?.personelId : null)
    ?? (entity.type === "student" ? fact?.personelId : null)
    ?? (entity.type === "parent" ? fact?.parentUserId : null)
    ?? (entity.type === "organizationPlan" ? fact?.planId : null)
    ?? (entity.type === "serviceRequest" ? fact?.requestId : null);
  const explicitFactType = String(fact?.entityType || fact?.type || "").toLowerCase();
  const id = Number(typedId ?? (explicitFactType === String(entity.type).toLowerCase() ? fact?.id : null));
  return Number(entity.id) === id;
}

function itemStatus({ result, denied, ambiguous }) {
  if (denied) return "UNAUTHORIZED";
  if (ambiguous) return "AMBIGUOUS";
  return Number(result?.count || 0) > 0 ? "RESOLVED" : "NO_DATA";
}

function labelForEntity(entity, facts = []) {
  if (!entity) return "istenen kayıt";
  if (entity.type === "vehicle") return `Araç ${entity.plate || `#${entity.id || "?"}`}`;
  if (entity.type === "organizationPlan") return `Organizasyon planı #${entity.id}`;
  if (entity.type === "serviceRequest") return `Servis talebi #${entity.id}`;
  if (["personnel", "student"].includes(entity.type)) {
    // A parent-facing no-service fact is deliberately synthesized only after
    // the selected child has passed the read-model scope check. Prefer that
    // same authorized person's label when it is available; a generic numeric
    // identifier would make an otherwise visible selected-child fact look
    // detached from the UI record.
    const personLabel = facts
      .map((fact) => String(fact?.personLabel || fact?.person || "").trim())
      .find(Boolean);
    const semanticLabel = entity.type === "student" ? "Öğrenci" : "Öğrenci/personel";
    return personLabel ? `${semanticLabel} ${personLabel}` : `${semanticLabel} #${entity.id}`;
  }
  if (entity.type === "driver") {
    const driverName = facts
      .map((fact) => String(fact?.driverName || fact?.driver || "").trim())
      .find(Boolean);
    return driverName || `Sürücü #${entity.id}`;
  }
  if (entity.type === "parent") return `Veli #${entity.id}`;
  return `${entity.type === "shift" ? "Vardiya" : entity.type === "offer" ? "Teklif" : entity.type === "agreement" ? "Sözleşme" : "Kayıt"} #${entity.id}`;
}

function comparableValue(value) {
  if (value && typeof value === "object" && !(value instanceof Date)) return JSON.stringify(value);
  return String(value ?? "");
}

function riskRank(fact) {
  const value = String(fact?.riskState || "").toUpperCase();
  if (value.includes("HIGH") || value.includes("YÜKSEK") || value.includes("YUKSEK")) return 3;
  if (value.includes("MEDIUM") || value.includes("ORTA")) return 2;
  if (value.includes("LOW") || value.includes("DÜŞÜK") || value.includes("DUSUK")) return 1;
  return 0;
}

function priorityEvidenceForFact(fact) {
  if (!fact) return [];
  const evidence = [];
  const riskReasons = Array.isArray(fact.riskReasons) ? fact.riskReasons.filter(Boolean) : [];
  if (riskReasons.length) evidence.push(riskReasons.join(", "));
  if (fact.riskStateText || fact.riskState) evidence.push(`risk ${fact.riskStateText || fact.riskState}`);
  if (fact.qualityStateText || fact.qualityState) evidence.push(`kalite ${fact.qualityStateText || fact.qualityState}`);
  const missing = Array.isArray(fact.qualityMissingFields) ? fact.qualityMissingFields.filter(Boolean) : [];
  if (missing.length) evidence.push(`eksik alanlar: ${missing.join(", ")}`);
  if (fact.reasonText || fact.reason) evidence.push(String(fact.reasonText || fact.reason));
  if (fact.statusText || fact.status) evidence.push(`durum ${fact.statusText || fact.status}`);
  if (fact.startAtText) evidence.push(`başlangıç ${fact.startAtText}`);
  return unique(evidence);
}

function prioritySafeNextStep(entity, fact, item = null) {
  const label = labelForEntity(entity, fact ? [fact] : []);
  const riskReasons = Array.isArray(fact?.riskReasons) ? fact.riskReasons.filter(Boolean) : [];
  if (entity?.type === "offer" && riskReasons.length) {
    return `${label} için ${riskReasons.join(", ")} bilgisini ve bağlı vardiya koşullarını doğrula; kabul veya red işlemi başlatma.`;
  }
  if (entity?.type === "shift" && (!fact?.vehiclePlate || !fact?.driverName)) {
    return `${label} için araç ve sürücü bağını doğrula; atama yapmadan önce güncel kaydı yeniden kontrol et.`;
  }
  if (entity?.type === "vehicle" && /güncel değil|guncel degil|offline|stale/i.test(String(fact?.gpsStatus || fact?.locationStatus || ""))) {
    return `${label} için konum bağlantısını ve son sinyal zamanını doğrula; yeni ETA üretmeden önce canlı konumu yeniden kontrol et.`;
  }
  const itemNextAction = String(item?.nextAction || "").trim();
  if (itemNextAction) return `${label} için ${itemNextAction}`;
  return `${label} için güncel yetkili kanıtı yeniden doğrula; doğrulama tamamlanmadan işlem başlatma.`;
}

function buildSelectedPriorityReply(plan, items) {
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const facts = factsForEntity(items, entity);
  const fact = facts[0] || null;
  const item = (items || []).find((current) => current?.entity && entityKey(current.entity) === entityKey(entity)) || null;
  const label = labelForEntity(entity, fact ? [fact] : []);
  if (!entity || !fact) {
    return `Öncelik için ${label} kaydının yetkili kanıtı bulunamadı. Gerekçe: doğrulanmış risk, kalite veya durum kanıtı olmadan sıralama yapmıyorum. Sonraki güvenli adım: hedef kaydı açıp güncel yetkili durumu doğrula.`;
  }
  const evidence = priorityEvidenceForFact(fact);
  const reason = evidence.length
    ? evidence.join("; ")
    : "seçili kayıt için karşılaştırılabilir bir risk veya kalite ayrımı görünmüyor; bu nedenle kayıt sıralama yerine doğrulama önceliği taşıyor";
  return `Önce ${label} kaydını ele al. Gerekçe: ${reason}. Sonraki güvenli adım: ${prioritySafeNextStep(entity, fact, item)}`;
}

function buildSelectedRiskReply(plan, items) {
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const fact = factsForEntity(items, entity)[0] || null;
  const label = labelForEntity(entity, fact ? [fact] : []);
  if (!entity || !fact) return `${label} için risk değerlendirmesini doğrulayacak yetkili kayıt bulunamadı; başka bir kaydı ikame etmiyorum.`;
  const evidence = priorityEvidenceForFact(fact);
  const risk = fact.riskStateText || fact.riskState || "doğrulanmış risk seviyesi yok";
  const impact = evidence.length
    ? "Eksik veya riskli kanıt çözülmeden güvenli bir kabul, atama ya da sonraki işlem başlatılamaz."
    : "Doğrulanmış risk kanıtı görünmediği için ek işlem önermiyorum.";
  return `${label} için risk: ${risk}. Kanıt: ${evidence.join("; ") || "doğrulanmış ek kanıt yok"}. Etki: ${impact} Sonraki güvenli adım: ${prioritySafeNextStep(entity, fact)}`;
}

function buildResolutionReply(plan, items, comparison) {
  if (comparison?.status === "RESOLVED") {
    return `${buildPriorityReply(comparison)} Çözüm sırası: önce öncelikli kaydın risk ve eksik kanıtlarını doğrula; ardından ikinci kaydı aynı ölçütlerle yeniden değerlendir. Doğrulama tamamlanmadan yazma işlemi başlatma.`;
  }
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const fact = factsForEntity(items, entity)[0] || null;
  const label = labelForEntity(entity, fact ? [fact] : []);
  if (!fact) return `${label} için çözüm sırasını kanıtlayacak yetkili kayıt bulunamadı; önce hedef kaydı netleştir.`;
  return `Çözüm sırası: 1. ${label} kaydındaki risk, kalite ve durum kanıtını doğrula. 2. ${prioritySafeNextStep(entity, fact)} 3. Aynı kaydı yeniden okuyup etkinin giderildiğini doğrula. Kanıt oluşmadan yeni işlem başlatma.`;
}

function resolveComparisonDecision(comparison) {
  if (!comparison || comparison.status !== "RESOLVED") return { status: "INSUFFICIENT_EVIDENCE", missing: ["ENTITY_SET"] };
  const candidates = [
    { entity: comparison.left.entity, fact: comparison.left.facts?.[0] },
    { entity: comparison.right.entity, fact: comparison.right.facts?.[0] },
  ].filter((candidate) => candidate.fact);
  if (candidates.length < 2) return { status: "INSUFFICIENT_EVIDENCE", missing: ["BOTH_ENTITY_FACTS"] };
  const [left, right] = candidates;
  const riskDifference = riskRank(left.fact) - riskRank(right.fact);
  const leftAt = new Date(left.fact.startAt || 0).getTime();
  const rightAt = new Date(right.fact.startAt || 0).getTime();
  let first = null;
  let second = null;
  let decisionReason = "";
  if (riskDifference !== 0) {
    [first, second] = riskDifference > 0 ? [left, right] : [right, left];
    decisionReason = "yetkili risk ve kalite kanıtları ayrışıyor";
  } else if (Number.isFinite(leftAt) && Number.isFinite(rightAt) && leftAt !== rightAt) {
    [first, second] = leftAt < rightAt ? [left, right] : [right, left];
    decisionReason = "risk seviyeleri aynı; daha erken başlayan kayıt zaman baskısı nedeniyle öne çıkıyor";
  } else {
    return {
      status: "TIE",
      order: candidates.map((candidate) => candidate.entity),
      evidence: candidates.map((candidate) => `${labelForEntity(candidate.entity)}: risk ${candidate.fact.riskStateText || candidate.fact.riskState || "belirgin değil"}`),
      reason: "iki kayıt için öncelik ayrımı yapacak yeterli yetkili fark yok",
      safeNextStep: "İki kaydın eksik risk, kalite ve zaman kanıtını aynı anda doğrula; eşit kanıt varken keyfi sıra verme.",
    };
  }
  const evidence = [];
  if (first.fact.riskStateText || first.fact.riskState) evidence.push(`risk ${first.fact.riskStateText || first.fact.riskState}`);
  if (first.fact.qualityStateText || first.fact.qualityState) evidence.push(`kalite ${first.fact.qualityStateText || first.fact.qualityState}`);
  if (first.fact.startAtText) evidence.push(`başlangıç ${first.fact.startAtText}`);
  return {
    status: "ORDERED",
    winner: first.entity,
    order: [first.entity, second.entity],
    evidence,
    reason: decisionReason,
    safeNextStep: prioritySafeNextStep(first.entity, first.fact),
  };
}

function buildPriorityReply(comparison) {
  const decision = resolveComparisonDecision(comparison);
  if (decision.status === "INSUFFICIENT_EVIDENCE") return "Önceliklendirme için karşılaştırma kümesindeki iki kaydın yetkili kanıtı birlikte bulunamadı.";
  if (decision.status === "TIE") return `Karşılaştırma sonucu eşit: ${decision.evidence.join("; ")}. Gerekçe: ${decision.reason}. Sonraki güvenli adım: ${decision.safeNextStep}`;
  const [first, second] = decision.order;
  return `Önce ${labelForEntity(first)} incelenmeli. Gerekçe: ${decision.evidence.join(", ") || "kayıda ait yetkili karşılaştırma kanıtı"}; ${decision.reason}. Sonraki güvenli adım: ${decision.safeNextStep} Sonraki kayıt: ${labelForEntity(second)}.`;
}

function buildIssueReply(plan, items, comparison) {
  const candidates = comparison?.status === "RESOLVED"
    ? [
      { entity: comparison.left.entity, fact: comparison.left.facts?.[0] },
      { entity: comparison.right.entity, fact: comparison.right.facts?.[0] },
    ]
    : [{ entity: plan?.entity || plan?.entities?.[0] || null, fact: items.flatMap((item) => item.facts || [])[0] }];
  const diagnosed = candidates.filter((candidate) => candidate.fact).map(({ entity, fact }) => {
    const signals = [];
    if (String(fact.qualityState || "").toUpperCase() === "INCOMPLETE") signals.push(`kalite eksik (${(fact.qualityMissingFields || []).join(", ") || "eksik alan var"})`);
    if (String(fact.riskState || "").toUpperCase() === "HIGH") signals.push(`risk yüksek${fact.riskReasons?.length ? `: ${fact.riskReasons.join(", ")}` : ""}`);
    return `${labelForEntity(entity)}: ${signals.length ? signals.join("; ") : "doğrulanmış açık sorun görünmüyor"}`;
  });
  return `Sorun teşhisi: ${diagnosed.join(" • ") || "Yetkili teklif kaydında doğrulanmış açık sorun görünmüyor."} Bilgi ve fırsat sinyallerini sorun olarak saymıyorum.`;
}

function buildCauseReply(plan, items, comparison) {
  if (comparison?.status === "RESOLVED") {
    const candidates = [
      { entity: comparison.left.entity, fact: comparison.left.facts?.[0] },
      { entity: comparison.right.entity, fact: comparison.right.facts?.[0] },
    ].filter((candidate) => candidate.fact);
    const reasons = candidates.map(({ entity, fact }) => {
      const evidence = [
        fact.riskStateText || fact.riskState ? `risk ${fact.riskStateText || fact.riskState}` : "",
        fact.qualityStateText || fact.qualityState ? `kalite ${fact.qualityStateText || fact.qualityState}` : "",
        fact.startAtText ? `başlangıç ${fact.startAtText}` : "",
      ].filter(Boolean).join(", ");
      return `${labelForEntity(entity)} için ${evidence || "yetkili karşılaştırma kanıtı"}`;
    });
    if (plan?.taskVariant === "IMPACT") {
      return `Etkisi, karşılaştırılan kayıtlardaki bu risk, kalite ve zaman farklarının karar sırasını etkileyebilmesidir: ${reasons.join("; ")}. Bu nedenle doğrulanmamış bir kabul veya değişiklik yapılmamalı.`;
    }
    return `Öncelik gerekçesi, karşılaştırılan kayıtların yetkili risk, kalite ve zaman kanıtlarına dayanıyor: ${reasons.join("; ")}.`;
  }
  const fact = (items || []).flatMap((item) => item.facts || [])[0];
  const entity = plan?.entity || plan?.entities?.[0] || null;
  if (!fact) return `${labelForEntity(entity)} için nedeni doğrulayacak yetkili kanıt bulunamadı; başka bir kaydı varsaymıyorum.`;
  const evidence = [
    fact.riskStateText || fact.riskState ? `risk ${fact.riskStateText || fact.riskState}` : "",
    fact.qualityStateText || fact.qualityState ? `kalite ${fact.qualityStateText || fact.qualityState}` : "",
    fact.startAtText ? `başlangıç ${fact.startAtText}` : "",
  ].filter(Boolean).join(", ");
  if (plan?.taskVariant === "IMPACT") {
    return `${labelForEntity(entity)} için etkisi, ${evidence || "mevcut durum kanıtı"} doğrulanmadan güvenli bir kabul, atama veya sonraki işlem yapılamamasıdır.`;
  }
  return `${labelForEntity(entity)} için görünen neden, yetkili kayıttaki ${evidence || "mevcut durum kanıtıdır"}.`;
}

function factTimestamp(fact) {
  return fact?.freshnessAt || fact?.updatedAt || fact?.observedAt || fact?.generatedAt || fact?.date || null;
}

function factTimestampText(fact) {
  return fact?.freshnessAtText || fact?.updatedAtText || fact?.observedAtText || fact?.dateText || displayFieldValue(factTimestamp(fact));
}

function buildFreshnessReply(plan, items) {
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const facts = entity ? factsForEntity(items, entity) : items.flatMap((item) => item.facts || []);
  const fact = facts.find((candidate) => factTimestamp(candidate) || candidate?.freshness) || facts[0] || null;
  const label = entity ? labelForEntity(entity) : "Bu bilgi";
  if (!fact) return `${label} için güncelliği doğrulayacak yetkili kayıt bulunamadı; güncel olduğu sonucuna varmıyorum.`;
  const freshness = String(fact.freshness || "").toUpperCase();
  const at = factTimestampText(fact);
  if (freshness === "STALE") return `${label} güncel görünmüyor${at ? `; son gözlem zamanı ${at}` : ""}. Yeni bir doğrulama yapılmadan bunu mevcut durum olarak kullanmamak gerekir.`;
  if (freshness === "FRESH") return `${label} güncel olarak işaretlenmiş${at ? `; doğrulanan zaman ${at}` : ""}.`;
  if (at) return `${label} için görünen son kayıt zamanı ${at}. Kaynak ayrıca güncellik durumu vermediği için yalnızca bu zaman damgasına dayanarak kesin güncel diyemem.`;
  return `${label} için kayıt bulundu, ancak güncellik zamanı görünmüyor; bu nedenle bilginin hâlâ güncel olduğunu doğrulayamıyorum.`;
}

function buildEvidenceSufficiencyReply(plan, items) {
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const facts = entity ? factsForEntity(items, entity) : items.flatMap((item) => item.facts || []);
  const missingItems = items.filter((item) => item.status === "NO_DATA");
  const evidenceCount = facts.reduce((count, fact) => count + (fact?.evidence || fact?.text || fact?.summary ? 1 : 0), 0);
  const label = entity ? labelForEntity(entity) : "Mevcut sonuç";
  if (!facts.length) return `${label} için yeterli yetkili kanıt yok; kesin bir sonuca varmak güvenli değil.`;
  const missingFields = unique(facts.flatMap((fact) => Array.isArray(fact?.qualityMissingFields) ? fact.qualityMissingFields : []));
  if (missingItems.length || missingFields.length) {
    const missing = missingFields.length ? missingFields.join(", ") : unique(missingItems.map((item) => domainLabel(item.domain))).join(", ");
    return `${label} için bazı kanıtlar var, ancak ${missing || "gerekli alanlar"} eksik; kanıt kesin karar için yeterli değil.`;
  }
  const timestamped = facts.some((fact) => factTimestamp(fact));
  return `${label} için ${evidenceCount || facts.length} doğrulanmış kanıt bulundu${timestamped ? " ve kayıt zamanı görülebiliyor" : ""}. Bu kapsamda sonuç destekleniyor; yeni veya çelişkili veri gelirse yeniden değerlendirmek gerekir.`;
}

function buildReturnToProductReply(plan) {
  const entities = Array.isArray(plan?.entities) ? plan.entities.filter(Boolean) : plan?.entity ? [plan.entity] : [];
  if (entities.length > 1) return `${entities.map(labelForEntity).join(" ve ")} bağlamına döndük; karşılaştırma kümesi ve önceki değerlendirme konusu korunuyor.`;
  if (entities.length === 1) return `${labelForEntity(entities[0])} bağlamına döndük; önceki değerlendirme konusu korunuyor.`;
  const domain = plan?.requestedDomains?.[0];
  return domain ? `${domainLabel(domain)} bağlamına döndük; devam etmek istediğin görevi söyleyebilirsin.` : "Önceki ürün bağlamı bulunamadı; hangi ekran veya kayda dönmek istediğini belirtir misin?";
}

function buildComparison(plan, items) {
  const spec = plan?.comparisonSpec;
  if (!spec) return null;
  if (spec.kind === "CURRENT_VS_BASELINE") {
    const budget = items.find((item) => item.domain === "BUDGET" || item.domain === "FINANCE");
    const comparison = budget?.comparison || null;
    const current = comparison?.currentId != null
      ? budget?.facts?.find((fact) => Number(fact?.id ?? fact?.budgetId) === Number(comparison.currentId)) || null
      : null;
    const previous = comparison?.previousId != null
      ? budget?.facts?.find((fact) => Number(fact?.id ?? fact?.budgetId) === Number(comparison.previousId)) || null
      : null;
    return {
      status: comparison ? "RESOLVED" : "NO_DATA",
      left: current,
      right: previous,
      dimensions: spec.dimensions || [],
      difference: comparison,
      evidenceClassification: budget?.costEvidenceClassification || {
        status: "INSUFFICIENT_COMPARABLE_RECORDS",
        classification: "CANNOT_SUPPORT_INCREASE_CLAIM",
      },
      interpretation: comparison?.direction ? `Güncel değer ${comparison.direction}.` : "Güncel ve referans kayıt karşılaştırılamadı; artış iddiası kurmuyorum.",
    };
  }
  const leftEntity = spec.leftEntity;
  const rightEntity = spec.rightEntity;
  const leftItems = items.filter((item) => item.entity && entityKey(item.entity) === entityKey(leftEntity));
  const rightItems = items.filter((item) => item.entity && entityKey(item.entity) === entityKey(rightEntity));
  const left = leftItems.flatMap((item) => item.facts || []);
  const right = rightItems.flatMap((item) => item.facts || []);
  const dimensions = spec.dimensions || [];
  const difference = {};
  for (const dimension of dimensions) {
    const leftValue = left.map((fact) => fieldValue(fact, dimension)).find((value) => value != null) ?? null;
    const rightValue = right.map((fact) => fieldValue(fact, dimension)).find((value) => value != null) ?? null;
    difference[dimension] = { left: leftValue, right: rightValue, equal: comparableValue(leftValue) === comparableValue(rightValue) };
  }
  return {
    status: left.length && right.length ? "RESOLVED" : "NO_DATA",
    left: { entity: leftEntity, facts: left },
    right: { entity: rightEntity, facts: right },
    dimensions,
    difference,
      interpretation: left.length && right.length ? "İki açık kayıt ayrı ayrı çözüldü. Fark yalnızca eşleşen kanıt alanlarından çıkarıldı." : "Karşılaştırma için iki tarafın da yetkili kanıtı gerekli.",
  };
}

function buildReply(plan, items, comparison, currentFactsFingerprint = '') {
  const unauthorized = items.filter((item) => item.status === "UNAUTHORIZED");
  if (unauthorized.length) {
    return `Bu sorgudaki ${unique(unauthorized.map((item) => item.domain)).join(", ")} alanları bu oturum için yetkili değil; korunmuş kayıtlar okunmadı.`;
  }
  const noData = items.filter((item) => item.status === "NO_DATA");
  if (plan?.role === "DRIVER" && plan?.currentAssignmentIntent && !items.some((item) => (item.facts || []).length)) {
    return "Bu oturumda güncel aktif vardiya veya bağlı araç kaydı görünmüyor; geçmiş kaydı güncel durum olarak kullanmıyorum.";
  }
  if (plan?.returnOperation || plan?.typedRequest?.taskType === "RETURN_TO_PRODUCT") return buildReturnToProductReply(plan);
  if (plan.family === "CONTINUE_CURRENT_REASONING") return buildContinuationReply(plan, items, comparison, currentFactsFingerprint);
  if (plan.family === "FRESHNESS_CHECK") return buildFreshnessReply(plan, items);
  if (["UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY"].includes(plan.family)) return buildEvidenceSufficiencyReply(plan, items);
  if (plan.family === "NEXT_STEP") return comparison?.status === "RESOLVED" ? `${buildPriorityReply(comparison)} Bu sıraya göre ilk kaydın güncel durumunu doğrula.` : buildNextStepReply(plan, items);
  if (plan.family === "CAUSE_WHY") return buildCauseReply(plan, items, comparison);
  if (plan.family === "RECORD_DETAILS") {
    return buildRecordDetailsReply(plan, items);
  }
  if (plan.family === "RELATION_LOOKUP" && !(plan.requestedFields || []).length) return buildRelationReply(plan, items);
  if (plan.family === "RELATION_LOOKUP" && (plan.requestedFields || []).length) {
    const relation = plan?.relationshipIntent || plan?.relationSpec;
    const relationFieldKey = relationTargetFieldKey(relation);
    const distinctFields = relationFieldKey
      ? plan.requestedFields.filter((field) => String(field?.key || '').toUpperCase() !== relationFieldKey)
      : plan.requestedFields;
    const relationReply = buildRelationReply(plan, items);
    return distinctFields.length
      ? `${relationReply} ${buildFieldReply({ ...plan, requestedFields: distinctFields }, items)}`.trim()
      : relationReply;
  }
  if (plan.family === "COMPARISON" && (plan?.typedRequest?.requiredOutputSlots || []).some((slot) => ["WINNER_OR_ORDER", "ORDER_DECISION"].includes(slot))) return buildPriorityReply(comparison);
  if (plan.answerMode === "SIDE_BY_SIDE") {
    const fields = plan.requestedFields || [];
    const rows = (plan.entities || []).map((entity) => {
      const facts = factsForEntity(items, entity);
      const values = fields.map((field) => {
        const value = facts.map((fact) => fieldValue(fact, field.key)).find((candidate) => candidate != null);
        return `${fieldLabel(field.key)}: ${displayFieldValue(value)}`;
      });
      return `${labelForEntity(entity)} — ${values.join(" • ")}`;
    });
    return rows.join(" | ") || "İstenen entity seti için yetkili kanıt bulunamadı.";
  }
  if (plan.family === "ISSUE_DIAGNOSTIC") return buildIssueReply(plan, items, comparison);
  if (["PRIORITY", "RISK_RANKING"].includes(plan.family) && comparison) return buildPriorityReply(comparison);
  if (plan.family === "RISK_RANKING") return buildSelectedRiskReply(plan, items);
  if (plan.family === "PRIORITY") return buildSelectedPriorityReply(plan, items);
  if (plan.family === "RESOLUTION_PLAN") return buildResolutionReply(plan, items, comparison);
  if (plan?.typedRequest?.productGroundedWritingIntent || plan?.productGroundedWritingIntent) {
    const entity = plan?.entity || plan?.entities?.[0] || null;
    const fact = factsForEntity(items, entity)[0] || null;
    const time = fieldValue(fact, "TIME_RANGE");
    if (time == null) {
      return `${labelForEntity(entity)} için yazım isteğinde kullanılacak saat aralığı yetkili kayıtta doğrulanamadı; saat uydurmuyorum.`;
    }
    const audience = String(plan?.typedRequest?.outputAudience || plan?.outputAudience || "").toUpperCase() === "DRIVER" ? "Sürücüye kısa mesaj" : "Kısa mesaj";
    return `${audience}: Merhaba, seçili vardiya ${displayFieldValue(time)} arasında planlı. Lütfen bu saat aralığında hazır olun.`;
  }
  if (plan.answerMode === "COMPARISON" && comparison) {
    if (comparison.status !== "RESOLVED") {
      if (comparison.difference == null && plan.comparisonSpec?.kind === "CURRENT_VS_BASELINE") {
        const classification = comparison.evidenceClassification?.classification || "CANNOT_SUPPORT_INCREASE_CLAIM";
        return `Güncel ve önceki karşılaştırılabilir bütçe kaydı birlikte bulunamadı; maliyet artışı iddiası kurmuyorum. Kanıt sınıfı: ${classification}.`;
      }
      return "Karşılaştırma için istenen iki kaydın yetkili kanıtı birlikte bulunamadı; başka bir kaydı ikame etmiyorum.";
    }
    if (plan.comparisonSpec?.kind === "CURRENT_VS_BASELINE") {
      const difference = comparison.difference;
      return `Güncel bütçe ${difference.currentAmountText}, önceki bütçe ${difference.previousAmountText}; fark ${difference.deltaText} ile ${difference.direction}.`;
    }
    const differenceLines = (comparison.dimensions || [])
      .map((dimension) => {
        const row = comparison.difference?.[dimension];
        if (!row) return "";
        const left = displayFieldValue(row.left);
        const right = displayFieldValue(row.right);
        return `${fieldLabel(dimension)}: sol=${left}, sağ=${right}${row.equal ? " (aynı)" : " (farklı)"}`;
      })
      .filter(Boolean);
    return `${labelForEntity(comparison.left?.entity || plan.entities?.[0])} ve ${labelForEntity(comparison.right?.entity || plan.entities?.[1])} ayrı ayrı çözüldü. ${differenceLines.join(" • ")} ${comparison.interpretation}`.trim();
  }
  const fields = plan.requestedFields || [];
  if (fields.length) {
    return buildFieldReply(plan, items);
  }
  // A field task without a resolved field is an incomplete semantic contract,
  // not permission to substitute an entity count.  Returning "1 vardiya
  // kaydı" here made temporal lookups look successful while silently losing
  // their requested value.
  if (plan?.typedRequest?.taskType === "FIELD_LOOKUP") {
    return "İstenen alanı bu ifadeden güvenle çıkaramadım; başlangıç/bitiş saati, durum veya başka alanı netleştirir misin?";
  }
  const countTargetType = String(plan?.typedRequest?.countTarget?.targetEntityType || plan?.semanticEntityType || '').toUpperCase();
  const temporalMode = String(
    plan?.temporalMode
      || plan?.temporalScope?.mode
      || plan?.typedRequest?.temporalScope?.mode
      || '',
  ).toUpperCase();
  if (countTargetType === 'SHIFT' && temporalMode === 'PENDING') {
    const resolvedFacts = items
      .filter((item) => item.status === 'RESOLVED')
      .flatMap((item) => item.facts || [])
      .map((fact) => fact?.text || fact?.summary || '')
      .filter(Boolean)
      .slice(0, 5);
    const count = items
      .filter((item) => item.status === 'RESOLVED')
      .reduce((sum, item) => sum + Number(item.count || 0), 0);
    return `${count} yetkili bekleyen vardiya kaydı bulundu. Vardiyalar ekranındaki Bekleyen Talepler sekmesinden inceleyebilirsin.${resolvedFacts.length ? ` ${resolvedFacts.join(' ')}` : ''}`.trim();
  }
  if (plan?.typedRequest?.collectionSummaryIntent) {
    if (plan?.typedRequest?.collectionStatusDistributionIntent || plan?.collectionStatusDistributionIntent) {
      const agreementFacts = items
        .filter((item) => item?.domain === "AGREEMENTS" && item?.status === "RESOLVED")
        .flatMap((item) => item.facts || [])
        .filter(Boolean);
      if (!agreementFacts.length) return "Yetkili sözleşme kaydı bulunamadı; durum dağılımı hesaplanamadı.";
      const labels = {
        REQUESTED: "İnceleme bekliyor",
        ACTIVE: "Aktif",
        DONE: "Tamamlandı",
        APPROVED: "Onaylandı",
        REJECTED: "Reddedildi",
      };
      const groups = new Map();
      for (const fact of agreementFacts) {
        const code = String(fact?.status || fact?.agreementStatus || "UNKNOWN").toUpperCase();
        const label = labels[code] || String(fact?.statusText || fact?.agreementStatus || code);
        const current = groups.get(code) || { label, count: 0 };
        current.count += 1;
        groups.set(code, current);
      }
      const distribution = [...groups.values()]
        .map(({ label, count }) => `${label}: ${count}`)
        .join(" • ");
      return `Sözleşme durum dağılımı: ${distribution} • Toplam: ${agreementFacts.length}.`;
    }
    const label = plan.typedRequest?.countTarget?.targetEntityType === "AGREEMENT"
      ? "sözleşme"
      : plan.typedRequest?.countTarget?.targetEntityType === "OFFER"
        ? "teklif"
        : plan.typedRequest?.countTarget?.targetEntityType === "SHIFT"
          ? "vardiya"
          : "kayıt";
    const resolvedFacts = items
      .filter((item) => item.status === "RESOLVED")
      .flatMap((item) => item.facts || [])
      .map((fact) => fact?.text || fact?.summary || "")
      .filter(Boolean)
      .slice(0, 12);
    const count = items
      .filter((item) => item.status === "RESOLVED")
      .reduce((sum, item) => sum + Number(item.count || 0), 0);
    return `${count} yetkili ${label} kaydı bulundu.${resolvedFacts.length ? ` ${resolvedFacts.join(" ")}` : ""}`.trim();
  }
  const resolved = items.filter((item) => item.status === "RESOLVED");
  const summary = resolved.map((item) => {
    const label = plan.typedRequest?.countTarget?.targetEntityType === "PARENT" || plan.semanticEntityType === "PARENT"
      ? "veli"
      : plan.typedRequest?.countTarget?.targetEntityType === "STUDENT" || plan.semanticEntityType === "STUDENT"
      ? "öğrenci"
      : (plan.typedRequest?.countTarget?.targetEntityType === "PERSONNEL" || plan.semanticEntityType === "PERSONNEL") && item.domain === "PERSONNEL"
        ? "personel"
        : plan.typedRequest?.countTarget?.targetEntityType === "SHIFT"
          ? "vardiya"
          : plan.typedRequest?.countTarget?.targetEntityType === "OFFER"
            ? "teklif"
            : plan.typedRequest?.countTarget?.targetEntityType === "AGREEMENT"
              ? "sözleşme"
              : plan.typedRequest?.countTarget?.targetEntityType === "VEHICLE"
                ? "araç"
                : plan.typedRequest?.countTarget?.targetEntityType === "DRIVER"
                  ? "sürücü"
                  : plan.typedRequest?.countTarget?.targetEntityType === "SERVICE_REQUEST"
                    ? "servis talebi"
                : domainLabel(item.domain);
    return `${item.count} ${label} kaydı`;
  }).join(", ");
  return `${summary || "İstenen alanlarda yetkili kayıt yok"}.${noData.length ? ` Eksik alanlar: ${noData.map((item) => domainLabel(item.domain)).join(", ")}.` : ""}`.trim();
}

export async function executeSemanticQueryPlan({ plan, readDomain, allowedDomains = [] } = {}) {
  const requestedDomains = Array.isArray(plan?.requestedDomains) ? plan.requestedDomains : [];
  const entities = Array.isArray(plan?.entities) ? plan.entities : plan?.entity ? [plan.entity] : [];
  const domainResults = [];
  const items = [];
  if (!plan || typeof readDomain !== "function") {
    return { status: "AMBIGUOUS", items: [], facts: [], missingFacts: ["query plan or domain reader"], unauthorizedFacts: [], inferences: [], recommendation: "Sorguyu yeniden dene.", reply: "Sorgu planı oluşturulamadığı için güvenli yanıt üretilemedi." };
  }
  if (plan.clarificationNeed) {
    return { status: "AMBIGUOUS", items: [], facts: [], missingFacts: [plan.clarificationNeed], unauthorizedFacts: [], inferences: [], recommendation: "Hangi kayıt veya alanı istediğini netleştir.", reply: "Hangi kayıt ya da karşılaştırma boyutunu istediğini netleştirir misin?" };
  }
  const domainWork = await Promise.all(requestedDomains.map(async (domain) => {
    const denied = plan.deniedDomains?.includes(domain) || (allowedDomains.length > 0 && !allowedDomains.includes(domain));
    const isNativeDomainEntity = (entity) => {
      if (entity.type === "shift") return domain === "SHIFTS";
      if (entity.type === "vehicle") return domain === "VEHICLES";
      if (entity.type === "driver") return domain === "DRIVERS";
      if (entity.type === "offer") return domain === "OFFERS";
      if (entity.type === "agreement") return domain === "AGREEMENTS";
      if (entity.type === "organizationPlan") return domain === "ORGANIZATION_PLANS";
      if (entity.type === "serviceRequest") return domain === "SERVICE_REQUESTS";
      if (["personnel", "student", "parent"].includes(entity.type)) return domain === "PERSONNEL";
      return false;
    };
    // When a request names records in the reader's native domain, those IDs
    // are authoritative.  Do not mix an origin record into that reader just
    // because a relationship traversal also touches the domain.
    const nativeDomainEntities = entities.filter(isNativeDomainEntity);
    const domainEntities = nativeDomainEntities.length ? nativeDomainEntities : entities.filter((entity) => {
      if (entity.type === "shift") return domain === "SHIFTS" || plan.relationshipTraversal?.some((link) => link.from === "shift" && ["vehicle", "driver", "route/gps/eta", "offer", "agreement"].includes(link.to) && ["VEHICLES", "DRIVERS", "OPERATIONS", "OFFERS", "AGREEMENTS"].includes(domain));
      if (entity.type === "vehicle") return domain === "VEHICLES";
      if (entity.type === "driver") return domain === "DRIVERS";
      if (entity.type === "offer") return domain === "OFFERS" || domain === "SHIFTS" || domain === "AGREEMENTS";
      if (entity.type === "agreement") return domain === "AGREEMENTS" || domain === "SHIFTS";
      if (entity.type === "organizationPlan") return domain === "ORGANIZATION_PLANS" || domain === "SHIFTS" || domain === "OPERATIONS";
      if (entity.type === "serviceRequest") return domain === "SERVICE_REQUESTS";
      if (["personnel", "student"].includes(entity.type)) return ["PERSONNEL", "SHIFTS", "VEHICLES", "OPERATIONS", "SERVICE_REQUESTS"].includes(domain);
      if (entity.type === "parent") return domain === "PERSONNEL";
      return false;
    });
    if (denied) return { domain, result: null, items: [{ domain, entity: domainEntities[0] || null, status: "UNAUTHORIZED", count: 0, facts: [], evidence: [] }] };
    // Domain readers must receive only the portion of a typed request that is
    // meaningful for their domain.  Passing the full entity set here allowed a
    // selected record from another domain to influence a reader and then made
    // a first matching fact look like the requested record.
    const collectionWideRead = isCollectionWideRead(plan, domain);
    const effectiveDomainEntities = collectionWideRead ? [] : domainEntities;
    const scopedPlan = {
      ...plan,
      requestedDomains: [domain],
      entities: effectiveDomainEntities,
      entity: effectiveDomainEntities.length === 1 ? effectiveDomainEntities[0] : null,
    };
    const result = await readDomain(domain, { entities: effectiveDomainEntities, plan: scopedPlan });
    const facts = normalizeFacts(result);
    const nextItems = effectiveDomainEntities.length
      ? effectiveDomainEntities.map((entity) => {
        const entityFacts = facts.filter((fact) => entityMatches(fact, entity));
        return { domain, entity, status: itemStatus({ result: { count: entityFacts.length }, ambiguous: false }), count: entityFacts.length, facts: entityFacts, evidence: entityFacts.map((fact) => fact.evidence || fact.text).filter(Boolean), nextAction: result?.nextAction || null };
      })
      : [{ domain, entity: null, status: itemStatus({ result, ambiguous: false }), count: Number(result?.count || facts.length || 0), facts, evidence: facts.map((fact) => fact.evidence || fact.text).filter(Boolean), comparison: result?.comparison || null, costEvidenceClassification: result?.costEvidenceClassification || null, nextAction: result?.nextAction || null }];
    return { domain, result, items: nextItems };
  }));
  domainResults.push(...domainWork.map((entry) => ({ domain: entry.domain, result: entry.result })));
  items.push(...domainWork.flatMap((entry) => entry.items));
  const allFacts = items.flatMap((item) => item.facts || []);
  const comparison = buildComparison(plan, items);
  const missingFacts = items.filter((item) => item.status === "NO_DATA").map((item) => `${item.domain}${item.entity ? `:${entityKey(item.entity)}` : ""}`);
  const unauthorizedFacts = items.filter((item) => item.status === "UNAUTHORIZED").map((item) => item.domain);
  const status = items.some((item) => !TERMINAL_STATUSES.has(item.status)) ? "AMBIGUOUS" : unauthorizedFacts.length ? "UNAUTHORIZED" : missingFacts.length && !allFacts.length ? "NO_DATA" : "RESOLVED";
  const facts = allFacts.map((fact) => fact.text || fact.summary || fact);
  const recommendation = unauthorizedFacts.length
    ? "Yetkili servis, plan veya operasyon alanında devam et."
    : missingFacts.length ? "Eksik kayıt veya alanı açıkça belirt; başka bir kaydı ikame etme." : "İlişkili kanıtları birlikte kontrol et.";
  const requiredOutputSlots = plan?.typedRequest?.requiredOutputSlots || plan?.requiredOutputSlots || [];
  const comparisonDecision = comparison && requiredOutputSlots.some((slot) => ["WINNER_OR_ORDER", "ORDER_DECISION"].includes(slot))
    ? resolveComparisonDecision(comparison)
    : null;
  const slotResults = outputSlotResults(plan, items, comparison);
  const outputContract = {
    requiredOutputSlots,
    slotResults,
    status: slotResults.some((slot) => slot.status === "UNKNOWN") || comparisonDecision?.status === "INSUFFICIENT_EVIDENCE" ? "INSUFFICIENT_EVIDENCE" : "SATISFIED",
    comparisonDecision,
  };
  // Some authorized analytical continuations intentionally do not execute a
  // second domain read; a null fingerprint means the same-auth, same-screen
  // canonical snapshot is being resumed, not that an empty fact set proved a
  // changed result.
  const currentFactsFingerprint = facts.length ? factsFingerprint(facts) : null;
  const reply = buildReply(plan, items, comparison, currentFactsFingerprint);
  const continuation = continuationState(plan, items);
  return {
    status,
    intentFamily: plan.intentFamily,
    answerMode: plan.answerMode,
    items,
    domainResults,
    facts,
    structuredFacts: allFacts,
    missingFacts,
    unauthorizedFacts,
    inferences: [],
    comparison,
    outputContract,
    continuationComplete: Boolean(continuation?.complete),
    continuationHasNewDetail: Boolean(continuation?.hasNewDetail),
    recommendation,
    reply,
  };
}
