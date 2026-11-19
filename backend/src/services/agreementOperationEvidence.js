const ROLE_LABELS = {
  ROOM: "Taşımacılık Firması",
  COMPANY: "Hizmet Alan Firma",
  DRIVER: "Sürücü",
  SUPER_ADMIN: "Yetkili yönetici",
};

function roleLabel(role) {
  return ROLE_LABELS[String(role || "").trim().toUpperCase()] || "Yetkili kullanıcı";
}

function toDateOnly(value) {
  if (!value) return null;
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function isDateInsideAgreement(sourceShift, agreement) {
  const sourceDate = toDateOnly(sourceShift?.startAt || sourceShift?.date);
  const startDate = toDateOnly(agreement?.startDate);
  const endDate = toDateOnly(agreement?.endDate);
  if (!sourceDate || !startDate || !endDate) return null;
  return sourceDate >= startDate && sourceDate <= endDate;
}

function buildSourceContext({ agreement, sourceShift }) {
  if (!sourceShift) {
    return {
      statusKey: "NO_SOURCE_CONTEXT",
      statusLabel: "Başlangıç kaydı bulunmuyor",
      reason: "Sözleşmenin operasyon başlangıç kaydı bulunamadı.",
      isOperationalEvidence: false,
    };
  }

  const agreementMatch = Number(sourceShift?.agreementId || 0) === Number(agreement?.id || 0);
  const dateMatch = isDateInsideAgreement(sourceShift, agreement);
  const contextMatch = agreementMatch && dateMatch !== false;
  if (!contextMatch) {
    return {
      statusKey: "CONTEXT_MISMATCH",
      statusLabel: "Başlangıç kaydı sözleşmeyle eşleşmiyor",
      reason: "Başlangıç kaydının sözleşme bağlantısı veya tarihi bu sözleşmeyle eşleşmiyor. Bu kayıt operasyon kanıtı sayılmaz.",
      isOperationalEvidence: false,
      agreementMatch,
      dateMatch,
    };
  }

  return {
    statusKey: "SOURCE_CONTEXT_ONLY",
    statusLabel: "Başlangıç kaydı",
    reason: "Bu kayıt yalnız başlangıç bağlamıdır; sözleşmeye bağlı tamamlanmış operasyon kanıtı değildir.",
    isOperationalEvidence: false,
    agreementMatch,
    dateMatch,
  };
}

function stage({ key, label, statusKey, statusLabel, missing, why, responsibleRole, screen, action }) {
  return {
    key,
    label,
    statusKey,
    statusLabel,
    missing: missing || null,
    why: why || null,
    responsibleRole,
    screen,
    action: action || null,
  };
}

function buildRequestedPlan({ agreement, sourceShift, actorRole }) {
  const responsibleRole = "Taşımacılık Firması";
  const primaryAction = String(actorRole || "").toUpperCase() === "ROOM"
    ? {
        key: "ACCEPT_AGREEMENT",
        label: "Sözleşmeyi kabul et",
        requiresExplicitConfirmation: true,
        createsOperationEvidence: false,
        responsibleRole,
        screen: "Sözleşmeler → Kabul Akışı",
      }
    : null;

  return {
    statusKey: "REQUESTED_NO_OPERATION",
    statusLabel: "Kabul kararı bekleniyor; operasyon kaydı yok",
    missing: "Sözleşmeye bağlı vardiya/operasyon kaydı",
    why: "Sözleşme henüz kabul edilmemiş ve bağlı gerçek vardiya oluşturulmamış.",
    responsibleRole,
    screen: "Sözleşmeler → Kabul Akışı",
    primaryAction,
    sourceContext: buildSourceContext({ agreement, sourceShift }),
    stages: [
      stage({
        key: "AGREEMENT_DECISION",
        label: "Sözleşme kararı",
        statusKey: "ACTION_REQUIRED",
        statusLabel: "Kabul kararı bekliyor",
        missing: "Sözleşme kabul kararı",
        why: "REQUESTED durumunda olduğu için operasyon hazırlığı başlatılamaz.",
        responsibleRole,
        screen: "Sözleşmeler → Kabul Akışı",
        action: primaryAction?.label || "Sorumlu kullanıcıdan kabul kararı bekleniyor",
      }),
      stage({
        key: "SHIFT_PREPARATION",
        label: "Vardiya hazırlığı",
        statusKey: "WAITING",
        statusLabel: "Sonraki aşama",
        missing: "Sözleşmeye bağlı vardiya",
        why: "Kabul kararından sonra yetkili operasyon hazırlığı gerekir.",
        responsibleRole: "Hizmet Alan Firma",
        screen: "Vardiyalar",
        action: "Gerçek vardiya kaydı oluşturulmalı",
      }),
      stage({
        key: "OPERATION_COMPLETION",
        label: "Operasyon tamamlanması",
        statusKey: "WAITING",
        statusLabel: "Henüz başlamadı",
        missing: "Gerçek tamamlanma kaydı",
        why: "Vardiya, GPS, biniş ve operatör notları kendi anlamlarıyla ayrıca oluşur.",
        responsibleRole: "Sürücü",
        screen: "Bugünkü vardiya / görev",
        action: "Görev tamamlandığında kanıt yeniden değerlendirilir",
      }),
    ],
  };
}

function buildCompanyDecisionStage({ decision, roomOfferAmountMinor = null }) {
  const accepted = decision === "ACCEPT";
  return stage({
    key: "COMPANY_DECISION",
    label: "Hizmet Alan Firma kararı",
    statusKey: "COMPLETED",
    statusLabel: accepted ? "Karşı teklif kabul edildi" : "Karşı teklif reddedildi",
    why: accepted
      ? "Hizmet Alan Firma karşı teklifi kabul etti; Taşımacılık Firması son onayına geçildi."
      : "Hizmet Alan Firma karşı teklifi kapattı; yeni teklif olmadan bu akışta ilerlenmez.",
    responsibleRole: "Hizmet Alan Firma",
    screen: "Sözleşmeler",
    action: roomOfferAmountMinor ? "Ticari karar kaydı mevcut" : null,
  });
}

function buildAcceptedCompanyDecisionPlan({ agreement, companyDecision, sourceShift, actorRole }) {
  const responsibleRole = "Taşımacılık Firması";
  const primaryAction = String(actorRole || "").toUpperCase() === "ROOM"
    ? {
        key: "ACCEPT_AGREEMENT",
        label: "Sözleşmeyi son onayla",
        requiresExplicitConfirmation: true,
        createsOperationEvidence: false,
        responsibleRole,
        screen: "Sözleşmeler → Kabul Akışı",
      }
    : null;

  return {
    statusKey: "ROOM_APPROVAL_PENDING_NO_OPERATION",
    statusLabel: "Karşı teklif kabul edildi; son onay bekleniyor; operasyon kaydı yok",
    missing: "Araç ve sürücü seçimi",
    why: "Hizmet Alan Firma karşı teklifi kabul etti. Taşımacılık Firması araç ve sürücü seçerek son onayı vermeden gerçek vardiya oluşturulmaz.",
    responsibleRole,
    screen: "Sözleşmeler → Kabul Akışı",
    primaryAction,
    sourceContext: buildSourceContext({ agreement, sourceShift }),
    stages: [
      buildCompanyDecisionStage({ decision: "ACCEPT", roomOfferAmountMinor: companyDecision?.roomOfferAmountMinor }),
      stage({
        key: "ROOM_APPROVAL",
        label: "Taşımacılık Firması son onayı",
        statusKey: String(actorRole || "").toUpperCase() === "ROOM" ? "ACTION_REQUIRED" : "WAITING",
        statusLabel: "Araç ve sürücü seçimi bekleniyor",
        missing: "Araç ve sürücü seçimi",
        why: "Sözleşme son onaylanmadan operasyon hazırlığı başlatılamaz.",
        responsibleRole,
        screen: "Sözleşmeler → Kabul Akışı",
        action: primaryAction?.label || "Taşımacılık Firması son onayı vermeli",
      }),
      stage({
        key: "SHIFT_PREPARATION",
        label: "Vardiya hazırlığı",
        statusKey: "WAITING",
        statusLabel: "Sonraki aşama",
        missing: "Sözleşmeye bağlı vardiya",
        why: "Son onaydan sonra yetkili planlama akışı gerekir.",
        responsibleRole: "Hizmet Alan Firma",
        screen: "Vardiyalar",
        action: "Gerçek vardiya kaydı oluşturulmalı",
      }),
      stage({
        key: "OPERATION_COMPLETION",
        label: "Operasyon tamamlanması",
        statusKey: "WAITING",
        statusLabel: "Henüz başlamadı",
        missing: "Gerçek tamamlanma kaydı",
        why: "Vardiya, GPS, biniş ve operatör notları ayrıca oluşur.",
        responsibleRole: "Sürücü",
        screen: "Bugünkü vardiya / görev",
        action: "Görev tamamlandığında kanıt yeniden değerlendirilir",
      }),
    ],
  };
}

function buildRejectedCompanyDecisionPlan({ agreement, companyDecision, sourceShift }) {
  return {
    statusKey: "COUNTER_REJECTED_NO_OPERATION",
    statusLabel: "Karşı teklif reddedildi; yeni teklif bekleniyor",
    missing: "Yeni teklif veya karar",
    why: "Hizmet Alan Firma karşı teklifi kapattı. Yeni bir teklif olmadan sözleşme veya operasyon başlamaz.",
    responsibleRole: "Taşımacılık Firması",
    screen: "Sözleşmeler → Teklif akışı",
    primaryAction: null,
    sourceContext: buildSourceContext({ agreement, sourceShift }),
    stages: [
      buildCompanyDecisionStage({ decision: "REJECT", roomOfferAmountMinor: companyDecision?.roomOfferAmountMinor }),
      stage({
        key: "NEGOTIATION",
        label: "Yeni teklif görüşmesi",
        statusKey: "WAITING",
        statusLabel: "Yeni teklif bekleniyor",
        missing: "Yeni karşı teklif",
        why: "Reddedilen karşı teklif yeniden kabul edilmiş sayılmaz.",
        responsibleRole: "Taşımacılık Firması",
        screen: "Sözleşmeler → Teklif akışı",
        action: "Gerekirse yeni teklif hazırla",
      }),
      stage({
        key: "OPERATION_COMPLETION",
        label: "Operasyon tamamlanması",
        statusKey: "WAITING",
        statusLabel: "Başlatılmadı",
        missing: "Kabul edilmiş sözleşme ve gerçek vardiya",
        why: "Ret kararı operasyon veya gerçekleşmiş hizmet oluşturmaz.",
        responsibleRole: "Sürücü",
        screen: "Bugünkü vardiya / görev",
        action: "Yeni sözleşme kabul edilirse yeniden değerlendirilir",
      }),
    ],
  };
}

function buildActivePlan({ agreement, sourceShift, generatedCount, lastShift, actorRole }) {
  const hasGeneratedShift = Number(generatedCount || 0) > 0 && Boolean(lastShift?.id);
  const driverDone = normalizeStatus(lastShift?.status) === "DONE";
  const driverRole = "Sürücü";
  const primaryAction = hasGeneratedShift
    ? (String(actorRole || "").toUpperCase() === "DRIVER" && !driverDone
        ? {
            key: "COMPLETE_OPERATION",
            label: "Görevi tamamla",
            requiresExplicitConfirmation: true,
            createsOperationEvidence: true,
            responsibleRole: driverRole,
            screen: "Bugünkü vardiya / görev",
          }
        : {
            key: "OPEN_OPERATION",
            label: "Operasyon kaydını aç",
            requiresExplicitConfirmation: false,
            createsOperationEvidence: false,
            responsibleRole: String(actorRole || "").toUpperCase() === "COMPANY" ? "Hizmet Alan Firma" : "Taşımacılık Firması",
            screen: "Vardiyalar",
          })
    : null;

  const operationStage = hasGeneratedShift
    ? stage({
        key: "OPERATION_COMPLETION",
        label: "Operasyon tamamlanması",
        statusKey: driverDone ? "COMPLETED" : "IN_PROGRESS",
        statusLabel: driverDone ? "Tamamlanma kaydı mevcut" : "Devam ediyor",
        missing: driverDone ? null : "Gerçek tamamlanma kaydı",
        why: driverDone ? "Vardiyanın gerçek durum kaydı bulundu." : "Vardiya henüz tamamlanmadı.",
        responsibleRole: driverRole,
        screen: "Bugünkü vardiya / görev",
        action: driverDone ? "Operasyon kaydını incele" : "Görevi tamamla",
      })
    : stage({
        key: "SHIFT_PREPARATION",
        label: "Vardiya hazırlığı",
        statusKey: "ACTION_REQUIRED",
        statusLabel: "Vardiya kaydı eksik",
        missing: "Sözleşmeye bağlı vardiya",
        why: "Sözleşme aktif, ancak gerçek operasyon vardiyası henüz oluşturulmamış.",
        responsibleRole: "Hizmet Alan Firma",
        screen: "Vardiyalar",
        action: "Vardiya hazırlığını tamamla",
      });

  return {
    statusKey: hasGeneratedShift ? "OPERATION_RECORDED" : "ACTIVE_NO_OPERATION",
    statusLabel: hasGeneratedShift ? "Gerçek operasyon kaydı mevcut" : "Aktif sözleşme; vardiya kaydı bekleniyor",
    missing: hasGeneratedShift ? null : "Sözleşmeye bağlı vardiya/operasyon kaydı",
    why: hasGeneratedShift ? "Bağlı vardiya kaydı sözleşmeyle birlikte bulundu." : "Aktif sözleşme için gerçek vardiya kaydı henüz bulunamadı.",
    responsibleRole: hasGeneratedShift ? operationStage.responsibleRole : "Hizmet Alan Firma",
    screen: hasGeneratedShift ? operationStage.screen : "Vardiyalar",
    primaryAction,
    sourceContext: buildSourceContext({ agreement, sourceShift }),
    stages: [
      stage({
        key: "AGREEMENT_STATUS",
        label: "Sözleşme durumu",
        statusKey: "ACTIVE",
        statusLabel: "Sözleşme aktif",
        responsibleRole: "Hizmet Alan Firma",
        screen: "Sözleşmeler",
        action: "Operasyon aşamasını takip et",
      }),
      operationStage,
    ],
  };
}

export function buildOperationEvidencePlan({
  agreement = null,
  companyDecision = null,
  sourceShift = null,
  generatedCount = 0,
  lastShift = null,
  actorRole = null,
} = {}) {
  if (!agreement) {
    return {
      statusKey: "NO_AGREEMENT",
      statusLabel: "Sözleşme seçilmedi",
      missing: "Yetkili sözleşme kaydı",
      why: "İşleme devam etmek için bir sözleşme seçilmelidir.",
      responsibleRole: roleLabel(actorRole),
      screen: "Sözleşmeler",
      primaryAction: null,
      sourceContext: buildSourceContext({ agreement: {}, sourceShift }),
      stages: [],
    };
  }

  const status = normalizeStatus(agreement.status);
  if (status === "REQUESTED" && Number(generatedCount || 0) <= 0 && !lastShift?.id) {
    const decision = normalizeStatus(companyDecision?.decision);
    const finalStatus = normalizeStatus(companyDecision?.finalStatus);
    if (finalStatus === "REQUESTED" && decision === "ACCEPT") {
      return buildAcceptedCompanyDecisionPlan({ agreement, companyDecision, sourceShift, actorRole });
    }
    if (finalStatus === "REQUESTED" && decision === "REJECT") {
      return buildRejectedCompanyDecisionPlan({ agreement, companyDecision, sourceShift });
    }
    return buildRequestedPlan({ agreement, sourceShift, actorRole });
  }

  return buildActivePlan({ agreement, sourceShift, generatedCount, lastShift, actorRole });
}
