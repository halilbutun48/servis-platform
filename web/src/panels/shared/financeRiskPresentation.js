function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

const DEFINITIVE_QUOTE_FLOOR_SOURCES = new Set([
  "CANONICAL_PERIOD_PLAN",
  "ROOM_COST_LEDGER_ACTUAL",
  "ACTUAL_LEDGER",
  "COMPLETE",
  "READY",
]);

function normalizedQuoteFloorSource(value) {
  return String(value || "").trim().toUpperCase().replace(/[- ]+/g, "_");
}

export function buildRoomQuoteFloorPresentation({
  quoteFloor = null,
  periodScopeActive = false,
  periodPlanning = null,
} = {}) {
  const source = quoteFloor && typeof quoteFloor === "object" ? quoteFloor : {};
  const missingFields = Array.isArray(source.missingFields) ? source.missingFields.filter(Boolean) : [];
  const periodReady = !periodScopeActive
    || (periodPlanning?.periodCostReady === true && periodPlanning?.comparisonAllowed === true);
  const definitive = source.computed === true
    && missingFields.length === 0
    && DEFINITIVE_QUOTE_FLOOR_SOURCES.has(normalizedQuoteFloorSource(source.baselineSource))
    && periodReady;

  return Object.freeze({
    definitive,
    costLabel: definitive ? "Tahmini hizmet dönemi maliyeti" : "Kısmi planlama maliyeti",
    costNote: definitive
      ? "Seçili dönem için; gerçekleşen giderden ayrıdır"
      : "Yalnız kanıtlanan planlama bileşenleri; tam ekonomik maliyet değildir",
    quoteLabel: definitive ? "Önerilen en düşük teklif" : "Kısmi planlama teklif önizlemesi",
    quoteNote: definitive
      ? "Katkı ve risk payı dahil; kesin net kâr değildir"
      : "Tam ekonomik kanıt oluşmadı; kesin teklif tabanı değildir",
  });
}

function result({ tone, status, icon, label, description }) {
  return Object.freeze({ tone, status, icon, label, description });
}

const GRAY = Object.freeze({
  tone: "muted",
  status: "GRAY",
  icon: "○",
});

export function buildCompanyBudgetRiskPresentation({
  budgetUsageBps = null,
  isDraft = false,
  comparisonReady = true,
} = {}) {
  if (isDraft) {
    return result({
      ...GRAY,
      label: "Taslak bütçe",
      description: "Bütçe henüz aktifleştirilmedi.",
    });
  }

  const usageBps = finiteNumber(budgetUsageBps);
  if (!comparisonReady || usageBps == null || usageBps < 0) {
    return result({
      ...GRAY,
      label: "Bütçe durumu belirsiz",
      description: "Karşılaştırma için yeterli bütçe kullanım kanıtı yok.",
    });
  }

  if (usageBps >= 10_000) {
    return result({
      tone: "danger",
      status: "RED",
      icon: "!",
      label: "Bütçe aşıldı",
      description: "Bütçe kullanım oranı %100'e ulaştı veya aştı.",
    });
  }

  if (usageBps >= 8_000) {
    return result({
      tone: "warm",
      status: "ORANGE",
      icon: "△",
      label: "Bütçeye dikkat",
      description: "Bütçe kullanım oranı %80 ile %100 arasında.",
    });
  }

  return result({
    tone: "good",
    status: "GREEN",
    icon: "✓",
    label: "Bütçe uygun",
    description: "Bütçe kullanım oranı %80'in altında.",
  });
}

export function buildRoomQuoteRiskPresentation({
  offerMinor = null,
  estimatedCostMinor = null,
  quoteFloorMinor = null,
  evidenceReady = false,
  contextBlocked = false,
} = {}) {
  const offer = finiteNumber(offerMinor);
  const estimatedCost = finiteNumber(estimatedCostMinor);
  const quoteFloor = finiteNumber(quoteFloorMinor);

  if (
    !evidenceReady
    || contextBlocked
    || offer == null
    || estimatedCost == null
    || quoteFloor == null
    || offer < 0
    || estimatedCost < 0
    || quoteFloor < 0
  ) {
    return result({
      ...GRAY,
      label: "Ekonomik kanıt eksik",
      description: "Karşılaştırma için yeterli maliyet veya planlama kanıtı yok.",
    });
  }

  if (offer < estimatedCost) {
    return result({
      tone: "danger",
      status: "RED",
      icon: "!",
      label: "Maliyet karşılanmıyor",
      description: "Teklif, doğrulanmış tahmini maliyetin altında.",
    });
  }

  if (offer < quoteFloor) {
    return result({
      tone: "warm",
      status: "ORANGE",
      icon: "△",
      label: "Hedef teklif tabanının altında",
      description: "Maliyet karşılanıyor; ancak hedef katkı ve risk payı tam karşılanmıyor.",
    });
  }

  return result({
    tone: "good",
    status: "GREEN",
    icon: "✓",
    label: "Ekonomik hedef uygun",
    description: "Teklif, tahmini maliyeti ve hedef teklif tabanını karşılıyor.",
  });
}

export function buildCompanyReconciliationRiskPresentation({ status = "" } = {}) {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  if (normalizedStatus === "MATCHED") {
    return result({
      tone: "good",
      status: "GREEN",
      icon: "✓",
      label: "Finans kayıtları uyumlu",
      description: "Hizmet, hakediş ve fatura kanıtları aynı kapsamda eşleşiyor.",
    });
  }
  if (normalizedStatus === "PAYMENT_UNPROVEN") {
    return result({
      tone: "warm",
      status: "ORANGE",
      icon: "△",
      label: "Ödeme kanıtı eksik",
      description: "Hizmet ve fatura kanıtı var; doğrulanmış ödeme/tahsilat bilgisi eksik.",
    });
  }
  if (["REVIEW_REQUIRED", "UNDER_INVOICED", "OVER_INVOICED"].includes(normalizedStatus)) {
    return result({
      tone: "danger",
      status: "RED",
      icon: "!",
      label: "Finans kayıtları uyuşmuyor",
      description: "Hakediş, fatura veya dönem bilgileri aynı ekonomik kapsamda eşleşmiyor.",
    });
  }
  return result({
    ...GRAY,
    label: "Finansal kanıt eksik",
    description: "Gerçekleşen hizmet, hakediş, fatura veya ödeme bilgisi henüz doğrulanmadı.",
  });
}
