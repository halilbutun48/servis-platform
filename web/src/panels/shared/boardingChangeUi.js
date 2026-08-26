const KIND_LABELS = {
  NO_SHOW: "Bugün servisi kullanmayacağım",
  DIFFERENT_STOP: "Farklı durak",
  LATE_TO_STOP: "Durağa yetişememe",
  PICKUP_FROM_LOCATION: "Konumdan alınma",
  TEMPORARY_BOARDING_NOTE: "Geçici biniş notu",
  OPERATION_NOTE: "Operasyon notu",
};

const REQUEST_ENTRY_KIND_LABELS = {
  NO_SHOW: "Bugün binmeyeceğim",
  DIFFERENT_STOP: "Başka durak",
  PICKUP_FROM_LOCATION: "Farklı konumdan alınmak istiyorum",
  TEMPORARY_BOARDING_NOTE: "Geçici biniş notu",
  OPERATION_NOTE: "Geçici biniş notu",
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
  ROOM_ACCEPTED: "Taşımacılık Firması onayı",
  ROOM_CANCELLED: "Taşımacılık Firması iptali",
  DRIVER_ACCEPTED: "Sürücü onayı",
  DRIVER_CANCELLED: "Sürücü iptali",
  COMPANY_ACCEPTED: "Hizmet alan taraf onayı",
  COMPANY_CANCELLED: "Hizmet alan taraf iptali",
  CANCELLED: "İptal edildi",
  NO_SHOW: "No-show",
};

const DECISION_TONES = {
  AUTO_ACCEPTED: "success",
  MANUAL_REVIEW: "info",
  CUTOFF_REVIEW: "warning",
  ROOM_ACCEPTED: "success",
  ROOM_CANCELLED: "critical",
  DRIVER_ACCEPTED: "success",
  DRIVER_CANCELLED: "critical",
  COMPANY_ACCEPTED: "success",
  COMPANY_CANCELLED: "critical",
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

const PREVIEW_STATE_LABELS = {
  PREVIEW_ONLY: "Sadece önizleme",
  READY: "Kabul bekliyor",
  APPLIED: "Operasyona ulaştı",
  REJECTED: "Uygulanmadı",
};

const PREVIEW_STATE_TONES = {
  PREVIEW_ONLY: "info",
  READY: "warning",
  APPLIED: "success",
  REJECTED: "critical",
};

const ROUTE_REFRESH_LABELS = {
  VISIBLE: "Günlük değişiklik rotada görünüyor",
  READY: "Rota güncellemesi bekliyor",
  NOTE_ONLY: "Operasyon notu görünür",
  NONE: "Rota güncellemesi yok",
};

const REQUEST_STATUS_LABELS = {
  OPEN: "Açık / İncelemede",
  MANUAL_REVIEW: "İncelemede",
  CUTOFF_REVIEW: "Onay bekliyor",
  AUTO_ACCEPTED: "Otomatik onaylandı",
  ACCEPTED: "Kabul edildi",
  CANCELLED: "Reddedildi",
  NO_SHOW: "No-show ayrı akış",
  ROOM_ACCEPTED: "Kabul edildi",
  ROOM_CANCELLED: "Reddedildi",
  DRIVER_ACCEPTED: "Kabul edildi",
  DRIVER_CANCELLED: "Reddedildi",
};

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

export function boardingChangeKindLabel(kind) {
  return KIND_LABELS[normalize(kind)] || "Biniş değişikliği";
}

export function boardingChangeRequestEntryKindLabel(kind) {
  return REQUEST_ENTRY_KIND_LABELS[normalize(kind)] || boardingChangeKindLabel(kind);
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

export function boardingChangeDecisionOwnerLabel(itemOrState, context = {}) {
  const state = normalize(itemOrState?.status || itemOrState?.decisionState || itemOrState?.boardingChangeApplicationStatus || itemOrState);
  if (["ACCEPTED", "AUTO_ACCEPTED", "ROOM_ACCEPTED", "ROOM_CANCELLED", "DRIVER_ACCEPTED", "DRIVER_CANCELLED", "COMPANY_ACCEPTED", "COMPANY_CANCELLED", "APPLIED"].includes(state)) {
    return "İşlendi";
  }
  if (["CANCELLED"].includes(state)) return "Kapandı";
  const ownerRole = normalize(itemOrState?.decisionOwnerRole || context?.decisionOwnerRole || itemOrState?.decisionOwner || context?.decisionOwner || "");
  if (ownerRole === "DRIVER") return "Sürücü";
  if (ownerRole === "COMPANY") return "Hizmet alan taraf";
  return "Hizmet alan taraf";
}

export function boardingChangeDecisionOwnerNote(itemOrState, context = {}) {
  const state = normalize(itemOrState?.status || itemOrState?.decisionState || itemOrState?.boardingChangeApplicationStatus || itemOrState);
  if (["ACCEPTED", "AUTO_ACCEPTED", "ROOM_ACCEPTED", "DRIVER_ACCEPTED", "COMPANY_ACCEPTED", "APPLIED"].includes(state)) {
    return "Değişiklik günlük atamaya işlendi.";
  }
  if (["CANCELLED", "ROOM_CANCELLED", "DRIVER_CANCELLED", "COMPANY_CANCELLED"].includes(state)) {
    return "İstek kapandı.";
  }
  const ownerRole = normalize(itemOrState?.decisionOwnerRole || context?.decisionOwnerRole || itemOrState?.decisionOwner || context?.decisionOwner || "");
  if (ownerRole === "DRIVER") {
    return "Aynı rota üzerindeki talep sürücü tarafında karar bekliyor.";
  }
  if (ownerRole === "COMPANY") {
    return "Rota değişikliği içerdiği için hizmet alan taraf karar veriyor.";
  }
  return "Hizmet alan taraf karar veriyor.";
}

export function boardingChangeApplicationStatusLabel(state) {
  return APPLICATION_LABELS[normalize(state)] || "Uygulamaya hazır";
}

export function boardingChangeApplyButtonLabel() {
  return "Kabul edilen değişikliği uygula";
}

function previewStateFrom(itemOrState, context = {}) {
  const requestStatus = normalize(itemOrState?.status || itemOrState?.decisionState || itemOrState?.boardingChangeApplicationStatus || itemOrState?.applicationStatus || context?.status || "");
  const applicationStatus = normalize(itemOrState?.boardingChangeApplicationStatus || itemOrState?.applicationStatus || context?.applicationStatus || "");
  const routeRefreshState = normalize(itemOrState?.boardingChangeRouteRefreshState || itemOrState?.routeRefreshState || context?.routeRefreshState || "");

  if (!requestStatus && !applicationStatus && !routeRefreshState && !itemOrState?.id) {
    return "PREVIEW_ONLY";
  }
  if (["CANCELLED", "REJECTED", "ROOM_CANCELLED", "DRIVER_CANCELLED", "COMPANY_CANCELLED"].includes(requestStatus) || ["CANCELLED", "REJECTED", "BLOCKED"].includes(applicationStatus)) {
    return "REJECTED";
  }
  if (["APPLIED", "VISIBLE"].includes(routeRefreshState) || applicationStatus === "APPLIED") {
    return "APPLIED";
  }
  if (["ACCEPTED", "APPROVED", "OPEN", "REQUESTED", "PENDING", "COUNTERED", "MANUAL_REVIEW", "CUTOFF_REVIEW", "READY"].includes(requestStatus) || applicationStatus === "READY") {
    return "READY";
  }
  return "PREVIEW_ONLY";
}

export function boardingChangePreviewStateLabel(itemOrState, context = {}) {
  return PREVIEW_STATE_LABELS[previewStateFrom(itemOrState, context)] || PREVIEW_STATE_LABELS.PREVIEW_ONLY;
}

export function boardingChangePreviewStateTone(itemOrState, context = {}) {
  return PREVIEW_STATE_TONES[previewStateFrom(itemOrState, context)] || PREVIEW_STATE_TONES.PREVIEW_ONLY;
}

export function boardingChangePreviewStateNote(itemOrState, context = {}) {
  const state = previewStateFrom(itemOrState, context);
  if (state === "APPLIED") return "Günlük atamaya işlendi.";
  if (state === "READY") return "İnsan onayı bekliyor.";
  if (state === "REJECTED") return "İstek kapandı.";
  return "Salt okunur önizleme.";
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

export function boardingChangeRequestStatusLabel(itemOrState, context = {}) {
  const status = normalize(itemOrState?.status || itemOrState?.decisionState || context?.status || "");
  const ownerRole = normalize(itemOrState?.decisionOwnerRole || context?.decisionOwnerRole || "");
  if (status === "ACCEPTED" || status === "AUTO_ACCEPTED" || status === "ROOM_ACCEPTED" || status === "DRIVER_ACCEPTED" || status === "COMPANY_ACCEPTED") {
    return REQUEST_STATUS_LABELS.ACCEPTED;
  }
  if (status === "CANCELLED" || status === "ROOM_CANCELLED" || status === "DRIVER_CANCELLED" || status === "COMPANY_CANCELLED") {
    return REQUEST_STATUS_LABELS.CANCELLED;
  }
  if (status === "NO_SHOW") return REQUEST_STATUS_LABELS.NO_SHOW;
  if (status === "CUTOFF_REVIEW") return REQUEST_STATUS_LABELS.CUTOFF_REVIEW;
  if (ownerRole === "DRIVER") return "Sürücüde bekliyor";
  if (ownerRole === "COMPANY") return "Firma/Okul/Organizasyon tarafında bekliyor";
  if (status === "OPEN" || status === "MANUAL_REVIEW") return REQUEST_STATUS_LABELS.MANUAL_REVIEW;
  return REQUEST_STATUS_LABELS.OPEN;
}

export function boardingChangeRequestStatusTone(itemOrState, context = {}) {
  const status = normalize(itemOrState?.status || itemOrState?.decisionState || context?.status || "");
  if (status === "ACCEPTED" || status === "AUTO_ACCEPTED" || status === "ROOM_ACCEPTED" || status === "DRIVER_ACCEPTED" || status === "COMPANY_ACCEPTED") return "success";
  if (status === "CANCELLED" || status === "ROOM_CANCELLED" || status === "DRIVER_CANCELLED" || status === "COMPANY_CANCELLED") return "critical";
  if (status === "CUTOFF_REVIEW") return "warning";
  if (status === "NO_SHOW") return "info";
  if (normalize(itemOrState?.decisionOwnerRole || context?.decisionOwnerRole || "") === "DRIVER") return "info";
  if (normalize(itemOrState?.decisionOwnerRole || context?.decisionOwnerRole || "") === "COMPANY") return "warning";
  return "info";
}
