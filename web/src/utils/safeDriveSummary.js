import { getGpsAgeText, getGpsReliabilityLabel, normalizeGpsFreshness } from "./etaSanity";

function compactText(value, fallback = "") {
  const text = String(value ?? "")
    .normalize("NFKC")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text || String(fallback || "").trim();
}

function normalizeText(value) {
  return compactText(value).toLowerCase();
}

function firstText(...values) {
  for (const value of values) {
    const text = compactText(value, "");
    if (text) return text;
  }
  return "";
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toneForStatus(status) {
  const key = compactText(status, "INSUFFICIENT_DATA").toUpperCase();
  if (key === "READY") return "OK";
  if (key === "RISKY") return "CRITICAL";
  if (key === "REVIEW_NEEDED") return "WARN";
  return "INFO";
}

function statusLabel(status) {
  const key = compactText(status, "INSUFFICIENT_DATA").toUpperCase();
  const labels = {
    READY: "Hazır",
    REVIEW_NEEDED: "Kontrol edilmeli",
    RISKY: "Risk sinyali",
    INSUFFICIENT_DATA: "Yetersiz veri",
  };
  return labels[key] || key.replace(/_/g, " ");
}

function buildSignal(label, value, status) {
  const text = compactText(value, "Bekleniyor");
  return {
    label,
    value: text,
    status: compactText(status, "INFO").toUpperCase(),
    tone: toneForStatus(status),
    text: `${label}: ${text}`,
  };
}

function classifyGps(input) {
  const freshness = normalizeGpsFreshness(input);
  const label = getGpsReliabilityLabel(input);
  const value = label === "Bekleniyor" ? "Bekleniyor" : label;
  if (freshness.isOffline) {
    return { status: "RISKY", label: "GPS güvenilirliği", value, ageText: getGpsAgeText(input), note: "GPS çevrim dışı" };
  }
  if (freshness.isStale) {
    return { status: "REVIEW_NEEDED", label: "GPS güvenilirliği", value, ageText: getGpsAgeText(input), note: "GPS güncel değil" };
  }
  if (freshness.isFresh) {
    return { status: "READY", label: "GPS güvenilirliği", value, ageText: getGpsAgeText(input), note: "Canlı GPS" };
  }
  return { status: "INSUFFICIENT_DATA", label: "GPS güvenilirliği", value, ageText: getGpsAgeText(input), note: "GPS durumu bekleniyor" };
}

function classifySpeed(input) {
  const speedKmh = toNumber(firstText(
    input?.speedKmh,
    input?.speed,
    input?.gpsSpeedKmh,
    input?.gpsLast?.speed,
    input?.liveLocation?.speedKmh,
    input?.liveLocation?.speed,
  ));
  const limitKmh = toNumber(firstText(
    input?.speedLimitKmh,
    input?.speedLimit,
    input?.vehicle?.speedLimitKmh,
    input?.selectedVehicle?.speedLimitKmh,
  ));

  if (speedKmh == null && limitKmh == null) {
    return {
      status: "INSUFFICIENT_DATA",
      label: "Hız riski",
      value: "Bekleniyor",
      note: "Hız bilgisi yok",
    };
  }

  if (speedKmh != null && limitKmh != null) {
    const over = Math.round(speedKmh - limitKmh);
    if (over > 0) {
      return {
        status: "RISKY",
        label: "Hız riski",
        value: `${Math.round(speedKmh)} / ${Math.round(limitKmh)} km/sa`,
        note: "Hız limiti aşıldı",
      };
    }
    if (speedKmh >= limitKmh * 0.9) {
      return {
        status: "REVIEW_NEEDED",
        label: "Hız riski",
        value: `${Math.round(speedKmh)} / ${Math.round(limitKmh)} km/sa`,
        note: "Hız limiti yakını",
      };
    }
    return {
      status: "READY",
      label: "Hız riski",
      value: `${Math.round(speedKmh)} / ${Math.round(limitKmh)} km/sa`,
      note: "Sınır içinde",
    };
  }

  if (speedKmh != null) {
    return {
      status: "READY",
      label: "Hız riski",
      value: `${Math.round(speedKmh)} km/sa`,
      note: "Hız bilgisi geldi",
    };
  }

  return {
    status: "INSUFFICIENT_DATA",
    label: "Hız riski",
    value: "Bekleniyor",
    note: "Hız bilgisi eksik",
  };
}

function classifyRoute(input, gpsStatus) {
  const raw = normalizeText(firstText(
    input?.routeProgressState,
    input?.routeProgressLabel,
    input?.routeState,
    input?.routeStatus,
    input?.selectedShift?.status,
    input?.liveLocation?.routeProgressState,
    input?.liveLocation?.officialSource,
    input?.nextStopName,
  ));

  if (/(off route|off-route|route deviation|sapma|yol disi|deviat|detour|wrong route)/.test(raw)) {
    return {
      status: "RISKY",
      label: "Rota ilerleme sinyali",
      value: "Sapma",
      note: "Rota sapması görünüyor",
    };
  }

  if (/(paused|bekleniyor|pending|unknown|bilinmiyor|none|n\/a|-)/.test(raw)) {
    return {
      status: "REVIEW_NEEDED",
      label: "Rota ilerleme sinyali",
      value: input?.nextStopName ? "Bekleniyor" : "Kontrol edilmeli",
      note: "Rota ilerlemesi net değil",
    };
  }

  if (input?.nextStopName) {
    return {
      status: gpsStatus === "RISKY" ? "REVIEW_NEEDED" : "READY",
      label: "Rota ilerleme sinyali",
      value: "Normal",
      note: "Sıradaki durak hazır",
    };
  }

  return {
    status: "INSUFFICIENT_DATA",
    label: "Rota ilerleme sinyali",
    value: "Bekleniyor",
    note: "Sıradaki durak bekleniyor",
  };
}

function classifyProof(input) {
  const raw = normalizeText(firstText(
    input?.proofStatus,
    input?.operationProofStatus,
    input?.checkinStatus,
    input?.checkInStatus,
    input?.evidenceStatus,
    input?.selectedShift?.operationProofStatus,
    input?.selectedShift?.proofStatus,
    input?.selectedVehicle?.operationProofStatus,
    input?.selectedVehicle?.proofStatus,
  ));

  if (!raw) {
    return {
      status: "REVIEW_NEEDED",
      label: "Kanıt / check-in durumu",
      value: "Bekleniyor",
      note: "Kanıt durumu görünmüyor",
    };
  }

  if (/(ready|hazir|hazır|verified|matched|ok|done|completed|approved|active)/.test(raw)) {
    return {
      status: "READY",
      label: "Kanıt / check-in durumu",
      value: "Hazır",
      note: "Kanıt hazır",
    };
  }

  if (/(missing|eksik|pending|bekleniyor|review|kontrol|belirgin degil|unknown|n\/a)/.test(raw)) {
    return {
      status: "REVIEW_NEEDED",
      label: "Kanıt / check-in durumu",
      value: "Kontrol edilmeli",
      note: "Kanıt kontrol edilmeli",
    };
  }

  if (/(error|failed|fail|blocked|critical|reject|rejected|disabled)/.test(raw)) {
    return {
      status: "RISKY",
      label: "Kanıt / check-in durumu",
      value: "Risk sinyali",
      note: "Kanıt tarafında sorun görünüyor",
    };
  }

  return {
    status: "REVIEW_NEEDED",
    label: "Kanıt / check-in durumu",
    value: compactText(firstText(input?.proofStatus, input?.operationProofStatus, input?.checkinStatus), "Bekleniyor"),
    note: "Kanıt durumu kontrol edilmeli",
  };
}

function classifyProvider(input) {
  const raw = normalizeText(firstText(
    input?.providerStatus,
    input?.providerState,
    input?.providerHubStatus,
    input?.providerLabel,
    input?.gpsSourceLabel,
    input?.selectedVehicle?.gpsState?.lastSource,
    input?.selectedVehicle?.gpsState?.sourceLabel,
  ));

  if (!raw) return null;
  if (/(ready|active|live|canli|canlı|connected|available|ok)/.test(raw)) {
    return {
      status: "READY",
      label: "Kaynak",
      value: compactText(firstText(input?.providerLabel, input?.gpsSourceLabel), "Canlı"),
      note: "Kaynak hazır",
    };
  }
  if (/(offline|error|disabled|not connected|config required|unmatched|needs review|unknown|pending)/.test(raw)) {
    return {
      status: "REVIEW_NEEDED",
      label: "Kaynak",
      value: compactText(firstText(input?.providerLabel, input?.gpsSourceLabel, input?.providerStatus), "Kontrol edilmeli"),
      note: "Kaynak kontrol edilmeli",
    };
  }
  return {
    status: "INFO",
    label: "Kaynak",
    value: compactText(firstText(input?.providerLabel, input?.gpsSourceLabel, input?.providerStatus), "Bekleniyor"),
    note: "Kaynak etiketi okundu",
  };
}

function compactReasons(items = [], limit = 3) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = compactText(item, "");
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

export function getSafeDriveSummary(input = {}) {
  const gps = classifyGps(input);
  const speed = classifySpeed(input);
  const route = classifyRoute(input, gps.status);
  const proof = classifyProof(input);
  const provider = classifyProvider(input);

  const riskReasons = compactReasons([
    gps.status === "RISKY" ? gps.note : "",
    speed.status === "RISKY" ? speed.note : "",
    route.status === "RISKY" ? route.note : "",
    proof.status === "RISKY" ? proof.note : "",
    provider?.status === "REVIEW_NEEDED" ? provider.note : "",
    compactText(input?.deviceHealth?.risk || "", ""),
  ]);

  const controlNotes = compactReasons([
    gps.status === "REVIEW_NEEDED" ? gps.note : "",
    speed.status === "REVIEW_NEEDED" ? speed.note : "",
    route.status === "REVIEW_NEEDED" ? route.note : "",
    proof.status === "REVIEW_NEEDED" ? proof.note : "",
    provider?.status === "INFO" ? provider.note : "",
  ]);

  const hasAnyData = [gps, speed, route, proof, provider].some((item) => Boolean(item?.value && item.value !== "Bekleniyor")) || Boolean(gps?.ageText && gps.ageText !== "bilinmiyor");
  const status = riskReasons.length ? "RISKY" : controlNotes.length ? "REVIEW_NEEDED" : hasAnyData ? "READY" : "INSUFFICIENT_DATA";
  const primaryReason = riskReasons[0] || controlNotes[0] || "";

  const summaryText =
    status === "RISKY"
      ? `Risk sinyali: ${primaryReason || "canlı sinyal kontrol edilmeli"}. Kontrol edilmeli.`
      : status === "REVIEW_NEEDED"
        ? `Kontrol edilmeli: ${primaryReason || "sinyallerin bir kısmı eksik görünüyor"}.`
        : status === "READY"
          ? "Güvenli sürüş özeti: canlı sinyaller uyumlu görünüyor."
          : "Güvenli sürüş özeti: yeterli veri yok.";

  const requiresHumanApproval = status !== "READY";
  const nextBestAction =
    status === "RISKY"
      ? `İnsan onayı gerekir: ${primaryReason || "önce GPS, hız ve rota sinyallerini birlikte kontrol et"}.`
      : status === "REVIEW_NEEDED"
        ? `İnsan onayı gerekir: ${primaryReason || "sinyallerin tamamını doğrula"}.`
        : "Operasyon kontrol önerisi: canlı izlemeyi sürdür, uygulama yapma.";

  const signals = [
    buildSignal(gps.label, gps.value, gps.status),
    buildSignal(speed.label, speed.value, speed.status),
    buildSignal(route.label, route.value, route.status),
    buildSignal(proof.label, proof.value, proof.status),
    provider ? buildSignal(provider.label, provider.value, provider.status) : null,
    buildSignal("İnsan onayı gerekir", requiresHumanApproval ? "Evet" : "Hayır", requiresHumanApproval ? "REVIEW_NEEDED" : "READY"),
  ].filter(Boolean);

  const boundaryNote = "Readonly sınırı: sadece okur ve özetler; rota uygulanmaz, sürücü/araç ataması değiştirilmez, ödeme/hakediş başlatılmaz, otomatik yönlendirme verilmez.";

  return {
    title: "Güvenli sürüş özeti",
    status,
    statusTone: toneForStatus(status),
    statusText: statusLabel(status),
    summaryText,
    nextBestAction,
    boundaryNote,
    signals,
    riskReasons,
    controlNotes,
    requiresHumanApproval,
    gps,
    speed,
    route,
    proof,
    provider,
  };
}

export { statusLabel as getSafeDriveStatusLabel, toneForStatus as getSafeDriveStatusTone };
