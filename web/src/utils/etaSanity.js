function compactText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return compactText(value).toLowerCase();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = compactText(value);
    if (text) return text;
  }
  return "";
}

function parseAgeSecondsFromText(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (/(bekleniyor|bilinmiyor|yok|null|none|n\/a|-)/.test(text)) return null;

  const seconds = text.match(/(\d+(?:[.,]\d+)?)\s*(?:sn|s|saniye|sec|secs?|second|seconds)\b/);
  if (seconds?.[1]) return Math.max(0, Math.round(Number(String(seconds[1]).replace(",", "."))));

  const minutes = text.match(/(\d+(?:[.,]\d+)?)\s*(?:dk|dakika|min|mins?|minute|minutes)\b/);
  if (minutes?.[1]) return Math.max(0, Math.round(Number(String(minutes[1]).replace(",", ".")) * 60));

  const hours = text.match(/(\d+(?:[.,]\d+)?)\s*(?:sa|saat|hour|hours|h)\b/);
  if (hours?.[1]) return Math.max(0, Math.round(Number(String(hours[1]).replace(",", ".")) * 3600));

  const days = text.match(/(\d+(?:[.,]\d+)?)\s*(?:gün|gun|day|days|d)\b/);
  if (days?.[1]) return Math.max(0, Math.round(Number(String(days[1]).replace(",", ".")) * 86400));

  return null;
}

function ageSecondsFromInput(input) {
  if (!input) return null;
  if (typeof input === "number" && Number.isFinite(input)) return Math.max(0, Math.round(input));
  if (typeof input === "string") return parseAgeSecondsFromText(input);
  if (typeof input !== "object") return null;

  const gpsLast = input?.gpsLast && typeof input.gpsLast === "object" ? input.gpsLast : null;
  const atIso = firstNonEmpty(
    gpsLast?.at,
    gpsLast?.ts,
    gpsLast?.createdAt,
    gpsLast?.updatedAt,
    input?.gpsLastAt,
    input?.lastGpsAt,
    input?.gpsAt,
    input?.at,
    input?.ts,
  );
  if (atIso) {
    const at = Date.parse(atIso);
    if (Number.isFinite(at)) return Math.max(0, Math.round((Date.now() - at) / 1000));
  }

  return parseAgeSecondsFromText(
    firstNonEmpty(
      input?.gpsAge,
      input?.gpsAgeText,
      input?.gpsAgeLabel,
      gpsLast?.ageText,
      gpsLast?.age,
      input?.lastGps,
      input?.lastGpsText,
      input?.lastGpsLabel,
      input?.gpsStatus,
      input?.status,
      input?.gpsState?.lastUiStatus,
      input?.gpsState?.lastStatus,
      gpsLast?.status,
      gpsLast?.state,
      "",
    ),
  );
}

export function normalizeEtaMinutes(rawEta) {
  if (rawEta == null || rawEta === "") return null;
  if (typeof rawEta === "number" && Number.isFinite(rawEta)) return Math.max(0, Math.round(rawEta));

  const text = compactText(rawEta);
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match?.[1]) return null;
  const parsed = Number(String(match[1]).replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

export function normalizeGpsFreshness(input = {}) {
  const ageSeconds = ageSecondsFromInput(input);
  const statusSource = compactText(firstNonEmpty(
    typeof input === "string" ? input : "",
    input?.gpsStatus,
    input?.status,
    input?.gpsState?.lastUiStatus,
    input?.gpsState?.lastStatus,
    input?.gpsLast?.status,
    input?.gpsLast?.state,
    input?.gpsLast?.freshness,
    input?.gpsLast?.freshnessLabel,
    input?.lastUiStatus,
    input?.ui,
    "",
  ));
  const normalized = normalizeText(statusSource);

  let status = "UNKNOWN";
  if (/(offline|çevrim dışı|cevrim disi|çevrimdışı|offline\b)/.test(normalized)) {
    status = "OFFLINE";
  } else if (/(stale|eski|güncel değil|guncel degil|zayıf|zayif|low signal|düşük sinyal|dusuk sinyal|gecikmeli)/.test(normalized)) {
    status = "STALE";
  } else if (/(live|canlı|canli|active|aktif)/.test(normalized)) {
    status = "LIVE";
  } else if (/(bekleniyor|bilinmiyor|unknown|null|none|-)/.test(normalized)) {
    status = "UNKNOWN";
  }

  if (ageSeconds != null) {
    if (ageSeconds >= 15 * 60) {
      status = status === "OFFLINE" ? "OFFLINE" : "STALE";
    } else if (status === "UNKNOWN") {
      status = "LIVE";
    }
  }

  const ageMinutes = ageSeconds == null ? null : Math.floor(ageSeconds / 60);
  const ageText = getGpsAgeText(input);

  return {
    status,
    statusSource,
    ageSeconds,
    ageMinutes,
    ageText,
    isFresh: status === "LIVE",
    isStale: status === "STALE",
    isOffline: status === "OFFLINE",
    isUnknown: status === "UNKNOWN",
  };
}

export function isGpsFresh(input) {
  return normalizeGpsFreshness(input).isFresh;
}

export function isGpsStale(input) {
  return normalizeGpsFreshness(input).isStale;
}

export function isGpsOffline(input) {
  return normalizeGpsFreshness(input).isOffline;
}

export function getGpsReliabilityLabel(input) {
  const freshness = normalizeGpsFreshness(input);
  if (freshness.isOffline) return "Çevrim dışı";
  if (freshness.isStale) return "Güncel değil";
  if (freshness.isFresh) return "Canlı";
  return "Bekleniyor";
}

export function getGpsAgeText(input) {
  const ageSeconds = ageSecondsFromInput(input);
  if (ageSeconds == null) return "bilinmiyor";
  if (ageSeconds < 60) return `${ageSeconds} sn önce`;
  const ageMinutes = Math.round(ageSeconds / 60);
  if (ageMinutes < 60) return `${ageMinutes} dk önce`;
  const ageHours = Math.round(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours} sa önce`;
  const ageDays = Math.round(ageHours / 24);
  return `${ageDays} gün önce`;
}

export function isEtaSuspicious(etaMinutes, input = {}) {
  const freshness = normalizeGpsFreshness(input);
  const eta = normalizeEtaMinutes(etaMinutes);
  if (eta == null) return false;
  if (!freshness.isFresh) return true;
  return eta > 90;
}

export function getEtaDisplay(input = {}) {
  const etaMinutes = normalizeEtaMinutes(
    firstNonEmpty(
      input?.etaMinutes,
      input?.selectedEta,
      input?.routeEtaMin,
      input?.nextEtaMin,
      input?.eta,
      "",
    ),
  );
  const freshness = normalizeGpsFreshness(input);

  if (freshness.isOffline) return "hesaplanamıyor";
  if (freshness.isStale) return "güncel değil";
  if (freshness.isUnknown) return "hesaplanamıyor";
  if (etaMinutes == null) return "bekleniyor";
  if (etaMinutes > 90) return "olağan dışı yüksek";
  return `${etaMinutes} dk`;
}

export function getLiveTrackingSummary(input = {}) {
  const freshness = normalizeGpsFreshness(input);
  const gpsLabel = getGpsReliabilityLabel(input);
  const ageText = getGpsAgeText(input);
  const nextStopName = firstNonEmpty(
    input?.nextStopName,
    input?.nextStop?.name,
    input?.selectedNext?.name,
    input?.stopName,
    input?.nextStop,
    "",
  );
  const etaText = getEtaDisplay(input);
  const nextLabel = freshness.isFresh ? "Sıradaki durak" : "Son bilinen sıradaki durak";
  const parts = [`GPS ${gpsLabel}`];
  if (ageText && ageText !== "bilinmiyor") parts.push(`Son GPS ${ageText}`);
  else parts.push("Son GPS bilinmiyor");
  if (nextStopName) parts.push(`${nextLabel}: ${nextStopName}`);
  parts.push(`ETA ${etaText}`);
  return parts.join(" · ");
}
