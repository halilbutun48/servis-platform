import { cachedGet } from "../../utils/uiDataCache";

function buildOptionalEndpointState(kind, status) {
  const baseCards = { commercialSources: 0, agreementSources: 0, shiftSeriesSources: 0, settlementPlans: 0, paymentAccounts: 0, commissionRules: 0 };
  if (kind === "paymentBackbone") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        summary: "Ek doğrulama tamamlanmadan ödeme hazırlık özeti okunamıyor.",
        activeMilestone: "Ek doğrulama gerekli",
        dormant: true,
        cards: baseCards,
        activeRule: null,
      };
    }
    return {
      endpointStatus: "missing",
      summary: "Bu sunucuda ödeme hazırlık özeti henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
      activeMilestone: "Özet bulunamadı",
      dormant: true,
      cards: baseCards,
      activeRule: null,
    };
  }
  if (kind === "pilotStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Ek doğrulama gerekli",
        candidateCount: 0,
        readyCount: 0,
        dormantCount: 0,
        activeSourceIds: [],
        summary: "Ek doğrulama tamamlanmadan isteğe bağlı ödeme pilot özeti okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Özet bulunamadı",
      candidateCount: 0,
      readyCount: 0,
      dormantCount: 0,
      activeSourceIds: [],
      summary: "Bu sunucuda isteğe bağlı ödeme pilot özeti henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "pilotCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "Ek doğrulama tamamlanmadan isteğe bağlı pilot aday listesi okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu sunucuda isteğe bağlı pilot aday listesi henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "requiredStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Ek doğrulama gerekli",
        candidateCount: 0,
        activeCount: 0,
        disabledCount: 0,
        waitingCount: 0,
        summary: "Ek doğrulama tamamlanmadan zorunlu ödeme geçiş özeti okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Özet bulunamadı",
      candidateCount: 0,
      activeCount: 0,
      disabledCount: 0,
      waitingCount: 0,
      summary: "Bu sunucuda zorunlu ödeme geçiş özeti henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "requiredCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "Ek doğrulama tamamlanmadan zorunlu geçiş aday listesi okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu sunucuda zorunlu geçiş aday listesi henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "accountStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Ek doğrulama gerekli",
        companyCandidateCount: 0,
        roomCandidateCount: 0,
        companyReadyCount: 0,
        roomReadyCount: 0,
        companyMissingCount: 0,
        roomMissingCount: 0,
        companyErrorCount: 0,
        roomErrorCount: 0,
        summary: "Ek doğrulama tamamlanmadan ödeme hesabı hazırlık özeti okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Özet bulunamadı",
      companyCandidateCount: 0,
      roomCandidateCount: 0,
      companyReadyCount: 0,
      roomReadyCount: 0,
      companyMissingCount: 0,
      roomMissingCount: 0,
      companyErrorCount: 0,
      roomErrorCount: 0,
      summary: "Bu sunucuda ödeme hesabı hazırlık özeti henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "accountCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "Ek doğrulama tamamlanmadan ödeme hesabı aday listesi okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu sunucuda ödeme hesabı aday listesi henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "settlementStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Ek doğrulama gerekli",
        candidateCount: 0,
        readyCount: 0,
        plannedCount: 0,
        executedCount: 0,
        blockedCount: 0,
        financeReadyCount: 0,
        summary: "Ek doğrulama tamamlanmadan mutabakat operasyon özeti okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Özet bulunamadı",
      candidateCount: 0,
      readyCount: 0,
      plannedCount: 0,
      executedCount: 0,
      blockedCount: 0,
      financeReadyCount: 0,
      summary: "Bu sunucuda mutabakat operasyon özeti henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "settlementQueue") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "Ek doğrulama tamamlanmadan mutabakat operasyon kuyruğu okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu sunucuda mutabakat operasyon kuyruğu henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "reconciliationStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Ek doğrulama gerekli",
        candidateCount: 0,
        pendingCount: 0,
        matchedCount: 0,
        reviewCount: 0,
        mismatchCount: 0,
        closedCount: 0,
        overduePlannedCount: 0,
        missingProviderRefCount: 0,
        summary: "Ek doğrulama tamamlanmadan mutabakat eşleştirme özeti okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Özet bulunamadı",
      candidateCount: 0,
      pendingCount: 0,
      matchedCount: 0,
      reviewCount: 0,
      mismatchCount: 0,
      closedCount: 0,
      overduePlannedCount: 0,
      missingProviderRefCount: 0,
      summary: "Bu sunucuda mutabakat eşleştirme özeti henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "reconciliationQueue") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "Ek doğrulama tamamlanmadan mutabakat eşleştirme kuyruğu okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu sunucuda mutabakat eşleştirme kuyruğu henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    };
  }
  if (status === 403) {
    return {
      endpointStatus: "forbidden",
      summary: "Ek doğrulama tamamlanmadan ticari ayarlar okunamıyor.",
      paymentModes: ["OFF", "OPTIONAL", "REQUIRED"],
      globalRule: { paymentMode: "OFF", commissionBps: 0, note: "", updatedAt: null },
      roomOverrides: [],
      roomOverrideCount: 0,
    };
  }
  return {
    endpointStatus: "missing",
    summary: "Bu sunucuda ödeme hazırlık ayarları henüz kullanılamıyor veya sunucu yeniden başlatılmadı.",
    paymentModes: ["OFF", "OPTIONAL", "REQUIRED"],
    globalRule: { paymentMode: "OFF", commissionBps: 0, note: "", updatedAt: null },
    roomOverrides: [],
    roomOverrideCount: 0,
  };
}

function buildRateLimitedOptionalState(kind) {
  const base = buildOptionalEndpointState(kind, 404);
  const summaryByKind = {
    paymentBackbone: "İstek sınırı aşıldı; ticari omurga özeti geçici olarak ertelendi.",
    settings: "İstek sınırı aşıldı; ticari ayarlar geçici olarak ertelendi.",
    pilotStatus: "İstek sınırı aşıldı; pilot özeti geçici olarak ertelendi.",
    pilotCandidates: "İstek sınırı aşıldı; pilot aday listesi geçici olarak ertelendi.",
    requiredStatus: "İstek sınırı aşıldı; zorunlu rollout özeti geçici olarak ertelendi.",
    requiredCandidates: "İstek sınırı aşıldı; zorunlu rollout aday listesi geçici olarak ertelendi.",
    accountStatus: "İstek sınırı aşıldı; ödeme hesabı hazırlığı geçici olarak ertelendi.",
    accountCandidates: "İstek sınırı aşıldı; ödeme hesabı aday listesi geçici olarak ertelendi.",
    settlementStatus: "İstek sınırı aşıldı; mutabakat operasyon özeti geçici olarak ertelendi.",
    settlementQueue: "İstek sınırı aşıldı; mutabakat operasyon kuyruğu geçici olarak ertelendi.",
    reconciliationStatus: "İstek sınırı aşıldı; mutabakat özeti geçici olarak ertelendi.",
    reconciliationQueue: "İstek sınırı aşıldı; mutabakat kuyruğu geçici olarak ertelendi.",
  };
  return {
    ...base,
    endpointStatus: "limited",
    summary: summaryByKind[kind] || "İstek sınırı aşıldı; bu bölümün verileri geçici olarak ertelendi.",
  };
}

export async function readOptional(path, fallbackKind) {
  try {
    const result = await cachedGet(path, { ttlMs: 10 * 60 * 1000, delayMs: 90 });
    return { ok: true, data: result };
  } catch (e) {
    const status = Number(e?.status || 0);
    if (status === 403 || status === 404) {
      return { ok: false, data: buildOptionalEndpointState(fallbackKind, status), status };
    }
    if (status === 429) {
      return { ok: false, data: buildRateLimitedOptionalState(fallbackKind), status };
    }
    throw e;
  }
}

export { buildOptionalEndpointState };
