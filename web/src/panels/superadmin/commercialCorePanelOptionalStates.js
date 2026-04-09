function buildOptionalEndpointState(kind, status) {
  const baseCards = { commercialSources: 0, agreementSources: 0, shiftSeriesSources: 0, settlementPlans: 0, paymentAccounts: 0, commissionRules: 0 };
  if (kind === "paymentBackbone") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        summary: "TOTP step-up tamamlanmadan payment backbone özeti okunamıyor.",
        activeMilestone: "Step-up gerekli",
        dormant: true,
        cards: baseCards,
        activeRule: null,
      };
    }
    return {
      endpointStatus: "missing",
      summary: "Bu backend sürümünde payment backbone status endpointi henüz yok veya sunucu yeniden başlatılmadı.",
      activeMilestone: "Endpoint bulunamadı",
      dormant: true,
      cards: baseCards,
      activeRule: null,
    };
  }
  if (kind === "pilotStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        candidateCount: 0,
        readyCount: 0,
        dormantCount: 0,
        activeSourceIds: [],
        summary: "TOTP step-up tamamlanmadan opsiyonel ödeme pilot özeti okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadı",
      candidateCount: 0,
      readyCount: 0,
      dormantCount: 0,
      activeSourceIds: [],
      summary: "Bu backend sürümünde opsiyonel ödeme pilot endpointi henüz yok veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "pilotCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan opsiyonel pilot aday listesi okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend sürümünde opsiyonel pilot aday endpointi henüz yok veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "requiredStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        candidateCount: 0,
        activeCount: 0,
        disabledCount: 0,
        waitingCount: 0,
        summary: "TOTP step-up tamamlanmadan zorunlu odeme rollout ozeti okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadi",
      candidateCount: 0,
      activeCount: 0,
      disabledCount: 0,
      waitingCount: 0,
      summary: "Bu backend surumunde zorunlu odeme rollout endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "requiredCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan zorunlu rollout aday listesi okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend surumunde zorunlu rollout aday endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "accountStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        companyCandidateCount: 0,
        roomCandidateCount: 0,
        companyReadyCount: 0,
        roomReadyCount: 0,
        companyMissingCount: 0,
        roomMissingCount: 0,
        companyErrorCount: 0,
        roomErrorCount: 0,
        summary: "TOTP step-up tamamlanmadan odeme hesabi hazirlik ozeti okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadi",
      companyCandidateCount: 0,
      roomCandidateCount: 0,
      companyReadyCount: 0,
      roomReadyCount: 0,
      companyMissingCount: 0,
      roomMissingCount: 0,
      companyErrorCount: 0,
      roomErrorCount: 0,
      summary: "Bu backend surumunde odeme hesabi hazirlik endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "accountCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan odeme hesabi aday listesi okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend surumunde odeme hesabi aday endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "settlementStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        candidateCount: 0,
        readyCount: 0,
        plannedCount: 0,
        executedCount: 0,
        blockedCount: 0,
        financeReadyCount: 0,
        summary: "TOTP step-up tamamlanmadan settlement operasyon ozeti okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadi",
      candidateCount: 0,
      readyCount: 0,
      plannedCount: 0,
      executedCount: 0,
      blockedCount: 0,
      financeReadyCount: 0,
      summary: "Bu backend surumunde settlement operasyon endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "settlementQueue") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan settlement operasyon kuyrugu okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend surumunde settlement operasyon kuyruk endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "reconciliationStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        candidateCount: 0,
        pendingCount: 0,
        matchedCount: 0,
        reviewCount: 0,
        mismatchCount: 0,
        closedCount: 0,
        overduePlannedCount: 0,
        missingProviderRefCount: 0,
        summary: "TOTP step-up tamamlanmadan settlement mutabakat ozeti okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadi",
      candidateCount: 0,
      pendingCount: 0,
      matchedCount: 0,
      reviewCount: 0,
      mismatchCount: 0,
      closedCount: 0,
      overduePlannedCount: 0,
      missingProviderRefCount: 0,
      summary: "Bu backend surumunde settlement mutabakat endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "reconciliationQueue") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan settlement mutabakat kuyrugu okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend surumunde settlement mutabakat kuyruk endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (status === 403) {
    return {
      endpointStatus: "forbidden",
      summary: "TOTP step-up tamamlanmadan ticari ayarlar okunamıyor.",
      paymentModes: ["OFF", "OPTIONAL", "REQUIRED"],
      globalRule: { paymentMode: "OFF", commissionBps: 0, note: "", updatedAt: null },
      roomOverrides: [],
      roomOverrideCount: 0,
    };
  }
  return {
    endpointStatus: "missing",
    summary: "Bu backend sürümünde payment backbone settings endpointi henüz yok veya sunucu yeniden başlatılmadı.",
    paymentModes: ["OFF", "OPTIONAL", "REQUIRED"],
    globalRule: { paymentMode: "OFF", commissionBps: 0, note: "", updatedAt: null },
    roomOverrides: [],
    roomOverrideCount: 0,
  };
}

async function readOptional(path, fallbackKind) {
  try {
    const result = await api(path);
    return { ok: true, data: result };
  } catch (e) {
    const status = Number(e?.status || 0);
    if (status === 403 || status === 404) {
      return { ok: false, data: buildOptionalEndpointState(fallbackKind, status), status };
    }
    throw e;
  }
}

export { buildOptionalEndpointState };
