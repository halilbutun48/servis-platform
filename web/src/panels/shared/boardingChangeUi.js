const KIND_LABELS = {
  NO_SHOW: "Bugün servisi kullanmayacağım",
  DIFFERENT_STOP: "Farklı durak",
  LATE_TO_STOP: "Durağa yetişememe",
  PICKUP_FROM_LOCATION: "Konumdan alınma",
  OPERATION_NOTE: "Operasyon notu",
};

const PREVIEW_KIND_LABELS = {
  NO_SERVICE_TODAY: "Bugün servis dışı",
  ALTERNATE_STOP_TODAY: "Farklı durak önizleme",
  TEMPORARY_BOARDING_NOTE: "Geçici biniş notu",
};

const DECISION_LABELS = {
  AUTO_ACCEPTED: "Otomatik onay",
  MANUAL_REVIEW: "İncelemede",
  CUTOFF_REVIEW: "Cutoff incelemesi",
  ROOM_ACCEPTED: "Oda onayı",
  ROOM_CANCELLED: "Oda iptali",
  CANCELLED: "İptal edildi",
  NO_SHOW: "No-show",
};

const DECISION_TONES = {
  AUTO_ACCEPTED: "success",
  MANUAL_REVIEW: "info",
  CUTOFF_REVIEW: "warning",
  ROOM_ACCEPTED: "success",
  ROOM_CANCELLED: "critical",
  CANCELLED: "critical",
  NO_SHOW: "warning",
};

const APPLICATION_LABELS = {
  READY: "Uygulamaya hazır",
  APPLIED: "Günlük atamaya işlendi",
  NOTE_ONLY: "Not kaydı",
  NOOP: "Değişiklik yok",
  BLOCKED: "Uygulanamadı",
};

const ROUTE_REFRESH_LABELS = {
  VISIBLE: "Günlük değişiklik rotada görünüyor",
  READY: "Rota güncellemesi bekliyor",
  NOTE_ONLY: "Operasyon notu görünür",
  NONE: "Rota güncellemesi yok",
};

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

export function boardingChangeKindLabel(kind) {
  return KIND_LABELS[normalize(kind)] || "Biniş değişikliği";
}

export function boardingChangePreviewKindLabel(kind) {
  return PREVIEW_KIND_LABELS[normalize(kind)] || boardingChangeKindLabel(kind);
}

export function boardingChangeDecisionLabel(state) {
  return DECISION_LABELS[normalize(state)] || "İncelemede";
}

export function boardingChangeDecisionTone(state) {
  return DECISION_TONES[normalize(state)] || "info";
}

export function boardingChangeApplicationStatusLabel(state) {
  return APPLICATION_LABELS[normalize(state)] || "Uygulamaya hazır";
}

export function boardingChangeApplyButtonLabel() {
  return "Kabul edilen değişikliği uygula";
}

export function boardingChangeApplyBoundaryNote() {
  return "Bu işlem sadece günlük atama etkisi uygular. Sürücü rotası yenilenmez.";
}

export function boardingChangeApplySuccessNote() {
  return "Değişiklik günlük atamaya işlendi. Sürücü rotası henüz yenilenmedi.";
}

export function boardingChangeRouteRefreshLabel(itemOrState) {
  const state = normalize(itemOrState?.boardingChangeRouteRefreshState || itemOrState?.routeRefreshState || itemOrState?.state || itemOrState);
  if (state === "APPLIED") return ROUTE_REFRESH_LABELS.VISIBLE;
  if (state === "READY") return ROUTE_REFRESH_LABELS.READY;
  if (state === "NOTE_ONLY") return ROUTE_REFRESH_LABELS.NOTE_ONLY;
  if (state === "VISIBLE") return ROUTE_REFRESH_LABELS.VISIBLE;
  return ROUTE_REFRESH_LABELS.NONE;
}

export function boardingChangeRouteRefreshNote(itemOrState) {
  const state = normalize(itemOrState?.boardingChangeRouteRefreshState || itemOrState?.routeRefreshState || itemOrState?.state || itemOrState);
  if (state === "APPLIED" || state === "VISIBLE") {
    return "Sürücü rota ekranında görünür; SMS/push yok; kalıcı rota değişmez.";
  }
  if (state === "READY") {
    return "Kabul edilen değişiklik uygulandığında sürücü rota ekranında görünür.";
  }
  if (state === "NOTE_ONLY") {
    return "Bu kayıt not olarak görünür; StopAssignment yazımı yok.";
  }
  return "Bu vardiyada uygulanan günlük değişiklik yok.";
}
