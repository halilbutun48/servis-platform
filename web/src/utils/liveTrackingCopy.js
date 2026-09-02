import { getApiErrorInfo } from "./apiContract.js";

const LIVE_TRACKING_COPY = Object.freeze({
  parent: Object.freeze({
    liveTag: "Canlı takip",
    liveStatusWhenData: "Aktif servis var",
    liveStatusWhenMissing: "Aktif servis görünmüyor",
    liveRiskWhenData: "Konum sinyali güncel değilse tahmini varış kesin gösterilmez.",
    liveRiskWhenMissing: "Servis saati, araç ataması veya konum izni kontrol edilmeli.",
    liveNextCheckWhenData: "Son konum sinyali ve sıradaki durak",
    liveNextCheckWhenMissing: "Okul / operasyonla teyit",
    liveNoteWhenData: "Bu ekran bilgilendirme amaçlıdır; yeni servis veya rota oluşturmaz.",
    liveNoteWhenMissing: "Bu ekran bilgilendirme amaçlıdır; yeni servis veya rota oluşturmaz.",
    liveServiceMissing: "Bugün için aktif servis görünmüyor.",
    liveServiceMissingDetail: "Servis saati, araç ataması veya konum izni kontrol edilmeli.",
    liveServiceContext: "Bugün için aktif servis görünmüyor. Talep oluşturma planlı servis bilgisine göre ilerler.",
    liveAccessFallback: "Bu ekran için canlı takip bilgisi görünmüyor. Okul veya operasyonla erişim durumunu kontrol edin.",
    liveLoadFallback: "Canlı takip bilgisi yüklenemedi. Biraz sonra yeniden deneyin.",
    geoUnsupported: "Bu cihaz konum paylaşımını desteklemiyor. Konum destekleyen bir cihazda tekrar deneyin.",
    geoDenied: "Konum izni verilmedi. En yakın durağı görmek için izni açın ya da daha sonra tekrar deneyin.",
    geoUnavailable: "Konum şu an alınamadı. En yakın durağı görmek için biraz sonra yeniden deneyin.",
    geoTimeout: "Konum isteği zaman aşımına uğradı. En yakın durağı görmek için yeniden deneyin.",
    geoGeneric: "Konum henüz alınamadı. En yakın durağı görmek için konum izni verin.",
    routeQualityMissing: "ETA henüz alınamadı",
    routeQualityNoRoute: "Aktif rota yok",
    routeNextActionNoRoute: "Aktif rota görünmüyor. Servis saati, araç ataması veya konum güncellenince tekrar kontrol edin.",
    routeNextActionWaitingGps: "Konum sinyali güncellenene kadar kısa süre bekleyin.",
    noVehicleReason: "Bugün için aktif servis görünmüyor.",
    noVehicleDetail: "Servis saati, araç ataması veya konum izni kontrol edilmeli.",
  }),
  personel: Object.freeze({
    liveTag: "Canlı takip",
    liveStatusWhenData: "Aktif vardiya var",
    liveStatusWhenMissing: "Aktif vardiya görünmüyor",
    liveRiskWhenData: "Konum sinyali güncel değilse tahmini varış kesin gösterilmez.",
    liveRiskWhenMissing: "Servis saati veya vardiya ataması kontrol edilmeli.",
    liveNextCheckWhenData: "Son konum sinyali ve sıradaki durak",
    liveNextCheckWhenMissing: "Servis saati / vardiya ataması",
    liveNoteWhenData: "Bu ekran bilgilendirme amaçlıdır; yeni servis veya rota oluşturmaz.",
    liveNoteWhenMissing: "Bu ekran bilgilendirme amaçlıdır; yeni servis veya rota oluşturmaz.",
    liveServiceMissing: "Bugün için aktif vardiya görünmüyor.",
    liveServiceMissingDetail: "Servis saati veya vardiya ataması kontrol edilmeli.",
    liveServiceContext: "Bugün için aktif vardiya görünmüyor. Talep oluşturma için vardiya ve servis ataması kontrol edilmeli.",
    liveAccessFallback: "Bu ekran için canlı takip bilgisi görünmüyor. Servis saati ve vardiya atamasını kontrol edin.",
    liveLoadFallback: "Canlı takip bilgisi yüklenemedi. Biraz sonra yeniden deneyin.",
    geoUnsupported: "Bu cihaz konum paylaşımını desteklemiyor. Konum destekleyen bir cihazda tekrar deneyin.",
    geoDenied: "Konum izni verilmedi. En yakın durağı görmek için izni açın ya da daha sonra tekrar deneyin.",
    geoUnavailable: "Konum şu an alınamadı. En yakın durağı görmek için biraz sonra yeniden deneyin.",
    geoTimeout: "Konum isteği zaman aşımına uğradı. En yakın durağı görmek için yeniden deneyin.",
    geoGeneric: "Konum henüz alınamadı. En yakın durağı görmek için konum izni verin.",
    routeQualityMissing: "ETA henüz alınamadı",
    routeQualityNoRoute: "Aktif rota yok",
    routeNextActionNoRoute: "Aktif rota görünmüyor. Servis saati veya vardiya ataması kontrol edilmeli.",
    routeNextActionWaitingGps: "Konum sinyali güncellenene kadar kısa süre bekleyin.",
    noVehicleReason: "Bugün için aktif vardiya görünmüyor.",
    noVehicleDetail: "Servis saati veya vardiya ataması kontrol edilmeli.",
  }),
});

function normalizeRole(role = "parent") {
  return String(role || "parent").toLowerCase() === "personel" ? "personel" : "parent";
}

function copyFor(role) {
  return LIVE_TRACKING_COPY[normalizeRole(role)] || LIVE_TRACKING_COPY.parent;
}

export function getLiveTrackingCopy(role = "parent") {
  return copyFor(role);
}

export function getLiveTrackingApiFeedback(error, role = "parent") {
  const copy = copyFor(role);
  const status = Number(getApiErrorInfo(error, "").status || 0);
  if (status === 404) {
    return {
      kind: "no-data",
      message: copy.liveServiceMissing,
      detail: copy.liveServiceMissingDetail,
    };
  }
  if (status === 401 || status === 403) {
    return {
      kind: "access",
      message: copy.liveAccessFallback,
      detail: copy.liveServiceMissingDetail,
    };
  }
  return {
    kind: "error",
    message: copy.liveLoadFallback,
    detail: copy.liveServiceMissingDetail,
  };
}

export function getLiveTrackingErrorMessage(error, role = "parent") {
  return getLiveTrackingApiFeedback(error, role).message;
}

export function getLiveTrackingGeoUnsupportedMessage(role = "parent") {
  return copyFor(role).geoUnsupported;
}

export function getLiveTrackingGeoErrorMessage(error, role = "parent") {
  const copy = copyFor(role);
  const code = Number(error?.code || 0);
  if (code === 1) return copy.geoDenied;
  if (code === 2) return copy.geoUnavailable;
  if (code === 3) return copy.geoTimeout;
  return copy.geoGeneric;
}

export function getLiveTrackingServiceContextReason(role = "parent") {
  return copyFor(role).liveServiceContext;
}

export function getLiveTrackingNoVehicleReason(role = "parent") {
  return copyFor(role).noVehicleReason;
}

export function getLiveTrackingNoVehicleDetail(role = "parent") {
  return copyFor(role).noVehicleDetail;
}

export function getLiveTrackingRouteQualityText(eta, role = "personel") {
  const copy = copyFor(role);
  const q = String(eta?.routeQuality || "").toUpperCase();
  if (q === "OFFLINE_GPS") return "Konum sinyali kapalı veya çok eski";
  if (q === "STALE_GPS") return "Konum sinyali gecikmeli";
  if (q === "SKIP_PRESENT") return "Atlanan durak var";
  if (q === "DONE_WITH_SKIPS") return "Rota bitti, atlanan durak var";
  if (q === "DONE") return "Rota tamamlandı";
  if (q === "NO_SHIFT") return copy.routeQualityNoRoute;
  if (!eta) return copy.routeQualityMissing;
  return String(eta?.progressLabel || copy.routeQualityMissing);
}

export function getLiveTrackingRouteQualityTone(eta) {
  const q = String(eta?.routeQuality || "").toUpperCase();
  if (!eta || q === "NO_SHIFT" || ["OFFLINE_GPS", "STALE_GPS", "SKIP_PRESENT", "DONE_WITH_SKIPS"].includes(q)) return "WARN";
  if (q === "DONE") return "OK";
  return "LIVE";
}

export function getLiveTrackingNextActionText(eta, role = "personel") {
  const copy = copyFor(role);
  const act = String(eta?.nextAction || "").toUpperCase();
  if (!eta) return copy.routeNextActionNoRoute;
  if (act === "CONTACT_ROOM") return "Rota tamamlandı; atlanan durak için oda ile görüşün.";
  if (act === "WAIT_GPS_UPDATE") return copy.routeNextActionWaitingGps;
  if (act === "NO_ACTIVE_ROUTE") return copy.routeNextActionNoRoute;
  return "";
}

export function getLiveTrackingStatusBandCopy(role = "parent", { hasActiveData = false, hasGpsPoint = false } = {}) {
  const copy = copyFor(role);
  if (hasActiveData) {
    return {
      status: copy.liveStatusWhenData,
      risk: hasGpsPoint ? copy.liveRiskWhenData : "Konum henüz alınamadı. ETA kesin gösterilmez.",
      nextCheck: copy.liveNextCheckWhenData,
      note: copy.liveNoteWhenData,
    };
  }
  return {
    status: copy.liveStatusWhenMissing,
    risk: copy.liveRiskWhenMissing,
    nextCheck: copy.liveNextCheckWhenMissing,
    note: copy.liveNoteWhenMissing,
  };
}
