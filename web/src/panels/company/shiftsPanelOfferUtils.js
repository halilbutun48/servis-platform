const TYPE_TR = { MINIBUS: "Minibüs", MIDIBUS: "Midibüs", OTOBUS: "Otobüs" };

export function vehicleMetaLine(v) {
  const type = TYPE_TR[v?.type] || (v?.type ? String(v.type) : "");
  const bmy = [v?.brand, v?.model, v?.modelYear].filter(Boolean).join(" ");
  const cap = Number.isFinite(v?.capacity) ? `${v.capacity} koltuk` : "";
  return [type, bmy, cap].filter(Boolean).join(" • ");
}

export function roomLabel(r) {
  if (!r) return "";
  const name = r.name || r.title;
  return name
    ? String(name).replace(/^(Room|Oda)\s+/i, "").trim()
    : `Taşımacılık Firması #${r.id}`;
}

export function trimOrNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

export function formatTRY(amount) {
  if (amount == null) return "";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("tr-TR").format(n);
}

export function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function offerGapMeta(amountCompany, amountRoom) {
  const company = Number(amountCompany);
  const room = Number(amountRoom);
  const hasCompany = Number.isFinite(company) && company > 0;
  const hasRoom = Number.isFinite(room) && room > 0;

  if (hasCompany && hasRoom) {
    const diff = room - company;
    if (diff === 0) return { label: "Fiyat farkı", value: "Hizalı", tone: "good", note: "Aynı tutar" };
    if (diff > 0) return { label: "Fiyat farkı", value: `+${formatTRY(diff)} ₺`, tone: "warn", note: "Taşımacılık Firması teklifi daha yüksek" };
    return { label: "Fiyat farkı", value: `-${formatTRY(Math.abs(diff))} ₺`, tone: "good", note: "Hizmet Alan Firma teklifi daha yüksek" };
  }

  if (hasRoom && !hasCompany) return { label: "Fiyat farkı", value: `${formatTRY(room)} ₺`, tone: "warn", note: "Yalnızca taşımacılık firması teklifi var" };
  if (!hasRoom && hasCompany) return { label: "Fiyat farkı", value: `${formatTRY(company)} ₺`, tone: "neutral", note: "Taşımacılık Firması cevabı bekleniyor" };
  return { label: "Fiyat farkı", value: "-", tone: "neutral", note: "Tutar sinyali yok" };
}

function providerAverageScore(score) {
  const avg = Number(score?.averageScore);
  const count = Number(score?.evaluationCount || 0);
  return Number.isFinite(avg) && count > 0 ? avg : 0;
}

function offerDecisionPriority(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COUNTERED") return 2;
  if (normalized === "OPEN") return 1;
  return 0;
}

function offerPriceSortValue(amountCompany, amountRoom) {
  const company = Number(amountCompany);
  const room = Number(amountRoom);
  const hasCompany = Number.isFinite(company) && company > 0;
  const hasRoom = Number.isFinite(room) && room > 0;
  if (hasCompany && hasRoom) return room - company;
  if (hasRoom && !hasCompany) return room + 1000000;
  if (!hasRoom && hasCompany) return 500000;
  return 999999;
}

function offerUpdatedSortValue(offer) {
  const value = Date.parse(offer?.updatedAt || offer?.createdAt || 0);
  return Number.isFinite(value) ? value : 0;
}

function compareRecommendedOffers(a, b, roomScores = {}) {
  const aDecision = offerDecisionPriority(a?.status);
  const bDecision = offerDecisionPriority(b?.status);
  if (aDecision !== bDecision) return bDecision - aDecision;

  const aRoomId = String(Number(a?.room?.id || a?.roomId || 0));
  const bRoomId = String(Number(b?.room?.id || b?.roomId || 0));
  const aScore = providerAverageScore(roomScores[aRoomId] || null);
  const bScore = providerAverageScore(roomScores[bRoomId] || null);
  if (aScore !== bScore) return bScore - aScore;

  const aGap = offerPriceSortValue(a?.amountCompany, a?.amountRoom);
  const bGap = offerPriceSortValue(b?.amountCompany, b?.amountRoom);
  if (aGap !== bGap) return aGap - bGap;

  return offerUpdatedSortValue(b) - offerUpdatedSortValue(a);
}

function buildRecommendationReason(offer, roomScores = {}) {
  const parts = [];
  const status = String(offer?.status || "").toUpperCase();
  if (status === "COUNTERED") parts.push("karşı teklif");
  else if (status === "OPEN") parts.push("açık teklif");

  const roomId = String(Number(offer?.room?.id || offer?.roomId || 0));
  const scoreValue = providerAverageScore(roomScores[roomId] || null);
  if (scoreValue > 0) parts.push(`puan ${scoreValue.toFixed(1)}`);

  const gap = offerGapMeta(offer?.amountCompany, offer?.amountRoom);
  if (gap?.value && gap.value !== "-") {
    parts.push(gap.value === "Hizalı" ? "fiyat hizalı" : `${gap.label.toLowerCase()} ${gap.value}`);
  }

  return parts.join(" • ");
}

function buildRecommendationMeta(offer, bucket = [], roomScores = {}) {
  const reasons = [];
  const statusPriority = offerDecisionPriority(offer?.status);
  const bucketPriorities = bucket.map((item) => offerDecisionPriority(item?.status));
  const bestPriority = bucketPriorities.length ? Math.max(...bucketPriorities) : statusPriority;
  if (statusPriority === bestPriority && bucketPriorities.some((value) => value !== statusPriority)) {
    if (String(offer?.status || "").toUpperCase() === "COUNTERED") reasons.push("Karşı teklif hazır");
    else if (String(offer?.status || "").toUpperCase() === "OPEN") reasons.push("Açık teklif hazır");
  }

  const roomId = String(Number(offer?.room?.id || offer?.roomId || 0));
  const scoreValue = providerAverageScore(roomScores[roomId] || null);
  const bucketScores = bucket.map((item) => {
    const key = String(Number(item?.room?.id || item?.roomId || 0));
    return providerAverageScore(roomScores[key] || null);
  });
  const bestScore = bucketScores.length ? Math.max(...bucketScores) : scoreValue;
  if (scoreValue > 0 && scoreValue === bestScore && bucketScores.some((value) => value < scoreValue)) {
    reasons.push("Taşımacılık Firması puanı daha yüksek");
  }

  const gapValue = offerPriceSortValue(offer?.amountCompany, offer?.amountRoom);
  const bucketGaps = bucket.map((item) => offerPriceSortValue(item?.amountCompany, item?.amountRoom));
  const bestGap = bucketGaps.length ? Math.min(...bucketGaps) : gapValue;
  if (Number.isFinite(gapValue) && gapValue === bestGap && bucketGaps.some((value) => value > gapValue)) {
    reasons.push("Fiyat farkı daha düşük");
  }

  const updatedValue = offerUpdatedSortValue(offer);
  const bucketUpdates = bucket.map((item) => offerUpdatedSortValue(item));
  const latestUpdate = bucketUpdates.length ? Math.max(...bucketUpdates) : updatedValue;
  if (!reasons.length && updatedValue === latestUpdate && bucketUpdates.some((value) => value < updatedValue)) {
    reasons.push("Daha güncel cevap");
  }

  const fallback = buildRecommendationReason(offer, roomScores) || "Bu vardiya için otomatik öne çıktı";
  return {
    short: reasons[0] || fallback,
    summary: reasons.length ? reasons.join(" • ") : fallback,
    reasons: reasons.length ? reasons : [fallback],
  };
}

export function rankOffersWithRecommendation(items, roomScores = {}) {
  const list = Array.isArray(items) ? [...items] : [];
  if (!list.length) return [];

  const byShift = new Map();
  for (const offer of list) {
    const shiftId = Number(offer?.shiftId || offer?.shift?.id || 0);
    const key = shiftId > 0 ? `shift:${shiftId}` : `single:${offer?.id || Math.random()}`;
    const bucket = byShift.get(key) || [];
    bucket.push(offer);
    byShift.set(key, bucket);
  }

  const recommendationMetaById = new Map();
  for (const bucket of byShift.values()) {
    if (!bucket || bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => compareRecommendedOffers(a, b, roomScores));
    const winner = sorted[0];
    if (winner?.id != null) {
      recommendationMetaById.set(winner.id, buildRecommendationMeta(winner, bucket, roomScores));
    }
  }

  return list
    .map((offer) => {
      const meta = recommendationMetaById.get(offer.id);
      return {
        ...offer,
        __recommended: Boolean(meta),
        __recommendationReason: meta?.summary || "",
        __recommendationShort: meta?.short || "",
        __recommendationReasons: meta?.reasons || [],
      };
    })
    .sort((a, b) => {
      const recDiff = Number(Boolean(b.__recommended)) - Number(Boolean(a.__recommended));
      if (recDiff) return recDiff;
      const shiftDiff = Number(b?.shiftId || b?.shift?.id || 0) - Number(a?.shiftId || a?.shift?.id || 0);
      if (shiftDiff) return shiftDiff;
      return compareRecommendedOffers(a, b, roomScores);
    });
}
