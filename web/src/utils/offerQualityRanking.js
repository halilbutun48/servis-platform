import { getSafeDriveSummary } from "./safeDriveSummary";

function compactText(value, fallback = "") {
  const text = String(value ?? "")
    .normalize("NFKC")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text || String(fallback || "").trim();
}

function toNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function compactList(values = [], limit = 6) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const text = compactText(raw, "");
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function formatTRY(amount) {
  const n = toNumber(amount, null);
  if (n == null) return "-";
  return new Intl.NumberFormat("tr-TR").format(Math.trunc(n));
}

function formatPriceSignal(amountCompany, amountRoom) {
  const company = toNumber(amountCompany, null);
  const room = toNumber(amountRoom, null);
  const hasCompany = Number.isFinite(company) && company > 0;
  const hasRoom = Number.isFinite(room) && room > 0;

  if (hasCompany && hasRoom) {
    const diff = room - company;
    if (diff === 0) {
      return {
        ready: true,
        label: "Fiyat sinyali",
        value: "Hizalı",
        tone: "good",
        reason: "Fiyatlar aynı görünüyor",
      };
    }
    if (diff > 0) {
      return {
        ready: true,
        label: "Fiyat sinyali",
        value: `+${formatTRY(diff)} ₺`,
        tone: "warn",
        reason: "Room tutarı daha yüksek",
      };
    }
    return {
      ready: true,
      label: "Fiyat sinyali",
      value: `-${formatTRY(Math.abs(diff))} ₺`,
      tone: "good",
      reason: "Company tutarı daha yüksek",
    };
  }

  if (hasRoom && !hasCompany) {
    return {
      ready: false,
      label: "Fiyat sinyali",
      value: `${formatTRY(room)} ₺`,
      tone: "warn",
      reason: "Sadece room teklifi var",
    };
  }

  if (!hasRoom && hasCompany) {
    return {
      ready: false,
      label: "Fiyat sinyali",
      value: `${formatTRY(company)} ₺`,
      tone: "neutral",
      reason: "Room cevabı bekleniyor",
    };
  }

  return {
    ready: false,
    label: "Fiyat sinyali",
    value: "-",
    tone: "neutral",
    reason: "Fiyat sinyali eksik",
  };
}

function signalLabel(signal) {
  if (!signal) return "";
  if (typeof signal === "string") return compactText(signal, "");
  if (typeof signal === "object") {
    return compactText(signal.text || signal.label || signal.note || signal.value || signal.id || "", "");
  }
  return "";
}

function buildProofMeta(summary = null) {
  const checklist = Array.isArray(summary?.checklist) ? summary.checklist : [];
  const status = compactText(summary?.status, "NOT_READY").toUpperCase();
  const ready = ["READY_FOR_REVIEW", "REVIEWED"].includes(status);
  const partial = status === "SIGNALS_PARTIAL";
  const needsReview = status === "NEEDS_REVIEW";
  const positiveSignals = compactList(
    checklist
      .filter((item) => item?.done)
      .map((item) => item?.label || item?.note || item?.id || ""),
    4
  );
  const missingSignals = compactList(
    checklist
      .filter((item) => !item?.done)
      .map((item) => item?.label || item?.note || item?.id || ""),
    4
  );
  const summaryText = compactText(summary?.summaryText, ready ? "Kanıt / check-in hazır" : partial ? "Kanıt kısmi" : needsReview ? "Kanıt tekrar kontrol gerekli" : "Kanıt bekleniyor");

  return {
    status,
    ready,
    partial,
    needsReview,
    summaryText,
    nextAction: compactText(summary?.nextAction, ready ? "Kanıtı incele ve sonraki adıma geç" : "Kanıtı tamamla"),
    positiveSignals,
    missingSignals,
    reason: ready ? "Kanıt / check-in hazır" : partial ? "Kanıt kısmi" : needsReview ? "Kanıt tekrar kontrol gerekli" : "Kanıt bekleniyor",
  };
}

function buildDraftMeta(summary = null) {
  const checklist = Array.isArray(summary?.checklist) ? summary.checklist : [];
  const status = compactText(summary?.status, "NO_SCORE").toUpperCase();
  const ready = ["DRAFT_READY_FOR_REVIEW", "REVIEWED_DRAFT"].includes(status);
  const reviewed = status === "REVIEWED_DRAFT";
  const partial = status === "DRAFT_PARTIAL";
  const needsReview = status === "NEEDS_REVIEW";
  const positiveSignals = compactList(
    checklist
      .filter((item) => item?.done)
      .map((item) => item?.label || item?.note || item?.id || ""),
    4
  );
  const missingSignals = compactList(
    checklist
      .filter((item) => !item?.done)
      .map((item) => item?.label || item?.note || item?.id || ""),
    4
  );

  return {
    status,
    ready,
    reviewed,
    partial,
    needsReview,
    summaryText: compactText(summary?.summaryText, reviewed ? "İncelenmiş taslak" : ready ? "Taslak kalite skoru hazır" : needsReview ? "Tekrar kontrol gerekli" : "Taslak kalite skoru bekleniyor"),
    nextAction: compactText(summary?.nextAction, reviewed ? "Taslak kaliteyi kontrol et" : "Taslak kaliteyi hazırla"),
    positiveSignals,
    missingSignals,
    reason: reviewed ? "Taslak kalite incelendi" : ready ? "Taslak kalite hazır" : needsReview ? "Tekrar kontrol gerekli" : "Taslak kalite bekleniyor",
  };
}

function buildReviewMeta(summary = null) {
  const checklist = Array.isArray(summary?.checklist) ? summary.checklist : [];
  const reviewStatus = compactText(summary?.reviewStatus || summary?.status, "REVIEW_PENDING").toUpperCase();
  const reviewed = reviewStatus === "REVIEWED";
  const needsRecheck = reviewStatus === "NEEDS_RECHECK";
  const pending = reviewStatus === "REVIEW_PENDING";
  const ignored = reviewStatus === "IGNORED_FOR_NOW";
  const positiveSignals = compactList(
    checklist
      .filter((item) => item?.done)
      .map((item) => item?.label || item?.note || item?.id || ""),
    4
  );
  const missingSignals = compactList(
    checklist
      .filter((item) => !item?.done)
      .map((item) => item?.label || item?.note || item?.id || ""),
    4
  );

  return {
    status: reviewStatus,
    reviewed,
    needsRecheck,
    pending,
    ignored,
    summaryText: compactText(summary?.summaryText, reviewed ? "İncelendi" : needsRecheck ? "Tekrar kontrol gerekli" : ignored ? "Şimdilik dikkate alınmadı" : "Kalite incelemesi bekliyor"),
    nextAction: compactText(summary?.nextAction, reviewed ? "İnceleme kararını kontrol et" : "Kalite incelemesi yap"),
    positiveSignals,
    missingSignals,
    reason: reviewed ? "İnceleme kararı kaydedildi" : needsRecheck ? "Tekrar kontrol gerekli" : pending ? "İnceleme bekliyor" : ignored ? "Şimdilik dikkate alınmadı" : "İnceleme kararı bekliyor",
  };
}

function buildSafeDriveMeta(summary = null, fallbackInput = null) {
  const safeDrive = summary || getSafeDriveSummary(fallbackInput || {});
  const signals = Array.isArray(safeDrive?.signals) ? safeDrive.signals : [];
  const status = compactText(safeDrive?.status, "INSUFFICIENT_DATA").toUpperCase();
  const ready = status === "READY";
  const risky = status === "RISKY";
  const reviewNeeded = status === "REVIEW_NEEDED";
  const hasAnyData = status !== "INSUFFICIENT_DATA";
  const gpsReady = signals.some((signal) => /GPS/i.test(signalLabel(signal)));
  const speedReady = signals.some((signal) => /Hız/i.test(signalLabel(signal)));
  const routeReady = signals.some((signal) => /Rota/i.test(signalLabel(signal)));
  const evidenceReady = signals.some((signal) => /Kanıt|check-in/i.test(signalLabel(signal)));
  const positiveSignals = compactList(
    signals.map((signal) => signalLabel(signal)),
    4
  );
  const missingSignals = compactList(
    [
      !gpsReady ? "GPS reliability" : "",
      !speedReady ? "Hız/overspeed risk" : "",
      !routeReady ? "Rota ilerleme" : "",
      !evidenceReady ? "Check-in / evidence readiness" : "",
    ],
    4
  );
  const riskReasons = compactList(Array.isArray(safeDrive?.riskReasons) ? safeDrive.riskReasons : [], 4);
  const controlNotes = compactList(Array.isArray(safeDrive?.controlNotes) ? safeDrive.controlNotes : [], 4);
  const nextBestAction = compactText(safeDrive?.nextBestAction, reviewNeeded ? "Önce telematics ve güvenli sürüş sinyallerini kontrol et." : "Telematics sinyallerini izle");

  return {
    status,
    ready,
    risky,
    reviewNeeded,
    hasAnyData,
    gpsReady,
    speedReady,
    routeReady,
    evidenceReady,
    summaryText: compactText(safeDrive?.summaryText, ready ? "Güvenli sürüş sinyali hazır" : risky ? "Risk sinyali" : reviewNeeded ? "Kontrol edilmeli" : "Telematics verisi eksik"),
    nextBestAction,
    positiveSignals,
    missingSignals,
    riskReasons,
    controlNotes,
    reason: risky ? riskReasons[0] || "Risk sinyali" : reviewNeeded ? controlNotes[0] || "Kontrol edilmeli" : ready ? "Telematics sinyali hazır" : "Telematics verisi eksik",
  };
}

function deriveScope(me = null, summaryParams = {}) {
  const companyId = Number(summaryParams?.companyId || me?.companyId || 0) || 0;
  const roomId = Number(summaryParams?.roomId || me?.roomId || 0) || 0;
  const shiftId = Number(summaryParams?.shiftId || 0) || 0;
  const role = compactText(me?.role || summaryParams?.role || "", "").toUpperCase();
  const scopeLabel =
    compactText(summaryParams?.scopeLabel, "") ||
    (role === "ROOM"
      ? "Room teklifleri"
      : role === "COMPANY"
        ? "Company teklifleri"
        : role === "SUPER_ADMIN"
          ? "Super Admin denetim görünümü"
          : "Teklif karşılaştırması");

  return { companyId, roomId, shiftId, role, scopeLabel };
}

function rowRoomName(offer = {}) {
  return compactText(offer?.room?.name || offer?.room?.title || offer?.roomName || `Room #${offer?.roomId || offer?.room?.id || "-"}`);
}

function roomScoreSummary(score = null) {
  const average = toNumber(score?.averageScore, null);
  const evaluationCount = Math.max(0, Math.trunc(toNumber(score?.evaluationCount, 0) || 0));
  const recommendRate = toNumber(score?.recommendRate, null);
  const summaryLabel =
    compactText(score?.summaryLabel, "") ||
    (average != null
      ? `${average.toFixed(1)} / 5 • ${evaluationCount} değerlendirme`
      : "Henüz puan yok");

  return {
    average,
    evaluationCount,
    recommendRate,
    summaryLabel,
    ready: average != null && evaluationCount > 0,
    reason: average != null && evaluationCount > 0 ? `Room puanı ${average.toFixed(1)} / 5` : "Room puanı yok",
  };
}

function buildOfferSafeDriveInput(offer = {}) {
  const shift = offer?.shift || {};
  const vehicle = shift?.vehicle || offer?.vehicle || null;
  const driver = shift?.driver || offer?.driver || null;

  return {
    ...shift,
    selectedShift: shift,
    selectedVehicle: vehicle,
    selectedDriver: driver,
    vehicle,
    driver,
    proofStatus: shift?.operationProofStatus || shift?.proofStatus || offer?.proofStatus || offer?.operationProofStatus || null,
    checkinStatus: shift?.checkinStatus || shift?.checkInStatus || offer?.checkinStatus || offer?.checkInStatus || null,
    evidenceStatus: shift?.evidenceStatus || offer?.evidenceStatus || null,
    routeStatus: shift?.routeStatus || shift?.routeProgressState || offer?.routeStatus || offer?.routeProgressState || null,
    routeProgressState: shift?.routeProgressState || offer?.routeProgressState || null,
    nextStopName: shift?.nextStopName || offer?.nextStopName || null,
    providerStatus: shift?.providerStatus || offer?.providerStatus || null,
    providerLabel: shift?.providerLabel || offer?.providerLabel || null,
    gpsSourceLabel: shift?.gpsSourceLabel || offer?.gpsSourceLabel || null,
    speedKmh: shift?.speedKmh || offer?.speedKmh || null,
    speedLimitKmh: shift?.speedLimitKmh || vehicle?.speedLimitKmh || offer?.speedLimitKmh || null,
  };
}

function buildOfferRow(offer, context) {
  const roomId = Number(offer?.room?.id || offer?.roomId || 0) || 0;
  const roomScore = roomScoreSummary(context.roomScores?.[String(roomId)] || null);
  const priceSignal = formatPriceSignal(offer?.amountCompany, offer?.amountRoom);
  const safeDrive = buildSafeDriveMeta(null, buildOfferSafeDriveInput(offer));
  const proof = context.proofMeta;
  const draft = context.draftMeta;
  const review = context.reviewMeta;
  const offerStatus = compactText(offer?.status, "-").toUpperCase();
  const shiftStatus = compactText(offer?.shift?.status, "-").toUpperCase();
  const priceMissing = !priceSignal.ready;
  const positiveSignals = compactList(
    [
      roomScore.ready ? "Room / supplier readiness" : "",
      proof.ready ? "Kanıt / check-in hazır" : "",
      draft.reviewed ? "Taslak kalite incelendi" : draft.ready ? "Taslak kalite hazır" : "",
      review.reviewed ? "İnceleme kararı kaydedildi" : "",
      safeDrive.ready ? "Telematics hazır" : safeDrive.hasAnyData ? "Telematics sinyali var" : "",
      priceSignal.ready ? "Fiyat verisi görünür" : "",
    ],
    6
  );
  const missingSignals = compactList(
    [
      roomScore.ready ? "" : "Verified supplier readiness",
      proof.ready ? "" : "Check-in / evidence readiness",
      safeDrive.hasAnyData ? "" : "Telematics readiness",
      safeDrive.gpsReady ? "" : "GPS reliability",
      safeDrive.speedReady ? "" : "Hız/overspeed risk",
      safeDrive.routeReady ? "" : "Rota ilerleme",
      safeDrive.evidenceReady ? "" : "Evidence readiness",
      priceMissing ? "Fiyat sinyali" : "",
    ],
    6
  );
  const reviewReasons = compactList(
    [
      roomScore.reason,
      priceSignal.reason,
      proof.reason,
      draft.reason,
      review.reason,
      safeDrive.reason,
    ],
    6
  );

  let confidence = 0;
  if (roomScore.ready) confidence += Math.min(24, 10 + Math.round((roomScore.average || 0) * 3) + Math.min(roomScore.evaluationCount, 8));
  if (priceSignal.ready) confidence += 10;
  if (proof.ready) confidence += 16;
  else if (proof.partial) confidence += 8;
  if (draft.reviewed) confidence += 12;
  else if (draft.partial) confidence += 6;
  if (review.reviewed) confidence += 12;
  else if (review.needsRecheck) confidence -= 8;
  if (safeDrive.ready) confidence += 15;
  else if (safeDrive.hasAnyData) confidence += 8;
  else confidence -= 6;
  if (safeDrive.risky) confidence -= 18;
  if (safeDrive.reviewNeeded) confidence -= 8;
  if (missingSignals.length) confidence -= Math.min(15, missingSignals.length * 3);
  confidence = clamp(Math.round(confidence), 0, 100);

  const riskScore =
    (safeDrive.risky ? 4 : 0) +
    (safeDrive.reviewNeeded ? 2 : 0) +
    (review.needsRecheck ? 2 : 0) +
    (proof.needsReview ? 2 : 0) +
    (missingSignals.length > 2 ? 2 : 0) +
    (confidence < 40 ? 2 : 0);
  const riskLevel = riskScore >= 5 ? "Yüksek" : riskScore >= 3 ? "Orta" : "Düşük";
  const qualityLabel = safeDrive.risky
    ? "Risk sinyali"
    : missingSignals.length >= 3
      ? "Eksik veri"
      : confidence >= 70
        ? "Kalite destekli teklif karşılaştırması"
        : confidence >= 45
          ? "İnceleme önerilir"
          : "Eksik veri";

  const nextReviewStep =
    safeDrive.nextBestAction ||
    reviewReasons[0] ||
    (missingSignals[0] ? `Önce ${missingSignals[0].toLowerCase()} kontrol et.` : "Karar kullanıcıdadır.");

  const reviewPriority = confidence + (safeDrive.risky ? -30 : 0) + (safeDrive.reviewNeeded ? -15 : 0) + (missingSignals.length > 0 ? -Math.min(12, missingSignals.length * 2) : 0) + (roomScore.ready ? Math.min(10, roomScore.evaluationCount) : -5) + (priceSignal.ready ? 4 : -4);

  return {
    id: Number(offer?.id || 0) || 0,
    offerId: Number(offer?.id || 0) || 0,
    roomId,
    roomName: rowRoomName(offer),
    shiftId: Number(offer?.shiftId || offer?.shift?.id || 0) || 0,
    offerStatus,
    shiftStatus,
    amountCompany: offer?.amountCompany ?? null,
    amountRoom: offer?.amountRoom ?? null,
    priceSignal,
    roomScore,
    qualityLabel,
    riskLevel,
    confidence,
    positiveSignals,
    missingSignals,
    reviewReasons,
    nextReviewStep,
    humanApprovalRequired: true,
    autoSelectionBlocked: true,
    autoAcceptBlocked: true,
    reviewPriority,
    updatedAt: offer?.updatedAt || offer?.shift?.updatedAt || offer?.createdAt || null,
    comparisonSummary: compactList(
      [
        roomScore.reason,
        priceSignal.reason,
        safeDrive.summaryText,
        proof.summaryText,
        draft.summaryText,
        review.summaryText,
      ],
      4
    ),
    hasAnyReadinessSignal: positiveSignals.length > 0 || missingSignals.length > 0,
    summaryText: qualityLabel === "Kalite destekli teklif karşılaştırması"
      ? "Fiyat tek başına karar değildir."
      : qualityLabel === "Risk sinyali"
        ? "Risk sinyali bulundu."
        : qualityLabel === "İnceleme önerilir"
          ? "İnceleme önerilir."
          : "Eksik veri.",
  };
}

function aggregateSignals(rows, key) {
  return compactList(
    rows.flatMap((row) => Array.isArray(row?.[key]) ? row[key] : []),
    6
  );
}

export function buildOfferQualityRanking(input = {}) {
  const offers = Array.isArray(input?.offers) ? [...input.offers] : [];
  const roomScores = input?.roomScores && typeof input.roomScores === "object" ? input.roomScores : {};
  const proofMeta = buildProofMeta(input?.proofSummary || null);
  const draftMeta = buildDraftMeta(input?.draftScoreSummary || null);
  const reviewMeta = buildReviewMeta(input?.reviewDecisionSummary || null);
  const safeDriveFallback = input?.safeDriveInput || offers[0]?.shift || input?.summaryParams?.safeDrive || null;
  const safeDriveMeta = buildSafeDriveMeta(input?.safeDriveSummary || null, safeDriveFallback);
  const scope = deriveScope(input?.me || null, input?.summaryParams || {});

  const rows = offers
    .map((offer, index) => ({
      ...buildOfferRow(offer, {
        roomScores,
        proofMeta,
        draftMeta,
        reviewMeta,
        safeDriveMeta,
      }),
      offerIndex: index,
    }))
    .sort((a, b) => {
      const priorityDiff = Number(b.reviewPriority || 0) - Number(a.reviewPriority || 0);
      if (priorityDiff) return priorityDiff;
      const confidenceDiff = Number(b.confidence || 0) - Number(a.confidence || 0);
      if (confidenceDiff) return confidenceDiff;
      const roomCountDiff = Number(b.roomScore?.evaluationCount || 0) - Number(a.roomScore?.evaluationCount || 0);
      if (roomCountDiff) return roomCountDiff;
      const priceReadyDiff = Number(Boolean(b.priceSignal?.ready)) - Number(Boolean(a.priceSignal?.ready));
      if (priceReadyDiff) return priceReadyDiff;
      const updatedDiff = Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0);
      if (Number.isFinite(updatedDiff) && updatedDiff) return updatedDiff;
      return Number(a.offerIndex || 0) - Number(b.offerIndex || 0);
    })
    .map((row, index) => ({
      ...row,
      reviewOrder: index + 1,
    }));

  const positiveSignals = compactList([
    ...aggregateSignals(rows.slice(0, 4), "positiveSignals"),
    ...(safeDriveMeta.positiveSignals || []),
    ...(proofMeta.positiveSignals || []),
    ...(draftMeta.positiveSignals || []),
    ...(reviewMeta.positiveSignals || []),
  ], 8);

  const missingSignals = compactList([
    ...aggregateSignals(rows.slice(0, 4), "missingSignals"),
    ...(safeDriveMeta.missingSignals || []),
    ...(proofMeta.missingSignals || []),
    ...(draftMeta.missingSignals || []),
    ...(reviewMeta.missingSignals || []),
  ], 8);

  const reviewReasons = compactList([
    rows[0]?.reviewReasons?.[0] || "",
    rows[0]?.reviewReasons?.[1] || "",
    rows[0]?.reviewReasons?.[2] || "",
    proofMeta.reason,
    draftMeta.reason,
    reviewMeta.reason,
    safeDriveMeta.reason,
    rows.length ? `${rows.length} teklif incelenebilir` : "Karşılaştırılacak teklif yok",
  ], 8);

  const topRow = rows[0] || null;
  const confidence = rows.length
    ? Math.round(rows.slice(0, Math.min(rows.length, 3)).reduce((sum, row) => sum + Number(row.confidence || 0), 0) / Math.min(rows.length, 3))
    : clamp(Math.round((safeDriveMeta.ready ? 60 : 25) + (proofMeta.ready ? 10 : 0) + (draftMeta.ready ? 10 : 0) + (reviewMeta.reviewed ? 10 : 0)), 0, 100);

  const hasRisk = Boolean(topRow?.riskLevel === "Yüksek" || safeDriveMeta.risky || reviewMeta.needsRecheck || proofMeta.needsReview);
  const qualityLabel = rows.length
    ? (topRow?.qualityLabel || "Kalite destekli teklif karşılaştırması")
    : (safeDriveMeta.hasAnyData || proofMeta.ready || draftMeta.ready || reviewMeta.reviewed ? "Karşılaştırılacak teklif yok" : "Eksik veri");
  const riskLevel = hasRisk
    ? "Yüksek"
    : (missingSignals.length >= 3 || confidence < 55)
      ? "Orta"
      : "Düşük";
  const nextReviewStep = topRow?.nextReviewStep || safeDriveMeta.nextBestAction || "Karar kullanıcıdadır.";

  return {
    scope,
    scopeLabel: scope.scopeLabel,
    offerCount: rows.length,
    qualityLabel,
    riskLevel,
    confidence,
    positiveSignals,
    missingSignals,
    reviewReasons,
    nextReviewStep,
    humanApprovalRequired: true,
    autoSelectionBlocked: true,
    summaryText: rows.length
      ? "Fiyat tek başına karar değildir. Kalite, güven, telematics, kanıt/check-in ve operasyon riski birlikte okunur."
      : "Karşılaştırılacak teklif yok. Kalite / güven / telematics sinyalleri hazır olduğunda teklifler incelenebilir.",
    summaryNote: rows.length
      ? "Önerilen kontrol sırası, karar sırası değildir; auto-selection ve auto-accept kapalıdır."
      : "Eksik veri varsa önce bağlantı ve teklif kaynağını doğrula.",
    safeDriveSummary: safeDriveMeta.summaryText,
    proofSummary: proofMeta.summaryText,
    draftScoreSummary: draftMeta.summaryText,
    reviewDecisionSummary: reviewMeta.summaryText,
    autoAcceptBlocked: true,
    contractExecuteBlocked: true,
    paymentExecuteBlocked: true,
    aiRuntimeActionBlocked: true,
    rows,
  };
}

export { deriveScope as deriveOfferQualityScope };
