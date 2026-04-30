const KIND_LABELS = {
  NO_SHOW: "Bugün servisi kullanmayacağım",
  DIFFERENT_STOP: "Farklı durak",
  LATE_TO_STOP: "Durağa yetişememe",
  PICKUP_FROM_LOCATION: "Konumdan alınma",
  OPERATION_NOTE: "Operasyon notu",
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
  AUTO_ACCEPTED: "ok",
  MANUAL_REVIEW: "info",
  CUTOFF_REVIEW: "warn",
  ROOM_ACCEPTED: "ok",
  ROOM_CANCELLED: "warn",
  CANCELLED: "warn",
  NO_SHOW: "ok",
};

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

export function boardingChangeKindLabel(kind) {
  return KIND_LABELS[normalize(kind)] || "Biniş değişikliği";
}

export function boardingChangeDecisionLabel(state) {
  return DECISION_LABELS[normalize(state)] || "İncelemede";
}

export function boardingChangeDecisionTone(state) {
  return DECISION_TONES[normalize(state)] || "info";
}
