export const FIELD_ACCEPTANCE_DECISIONS = ["GO", "LIMITED_GO", "NO_GO"];

export const FIELD_ACCEPTANCE_CHECKLIST = [
  { id: "login_ok", label: "Giriş akışı tamamlandı", area: "auth" },
  { id: "pin_change_ok", label: "İlk PIN değişimi anlaşılır", area: "auth" },
  { id: "today_screen_ok", label: "Bugün ekranı net", area: "ux" },
  { id: "gps_permission_ok", label: "Konum izni akışı net", area: "gps" },
  { id: "gps_publish_ok", label: "Sürücünün telefonundan konum paylaşımı çalışıyor", area: "gps" },
  { id: "offline_recovery_ok", label: "Çevrim dışı toparlama anlaşılır", area: "resilience" },
  { id: "kvkk_ok", label: "KVKK görünürlük dili net", area: "kvkk" },
  { id: "eta_voice_ok", label: "Tahmini varış ve sesli rehber yeterli", area: "route" },
];

export const FIELD_ACCEPTANCE_EVIDENCE_TYPES = [
  "CHECKLIST_NOTE",
  "DEVICE_INFO",
  "BUILD_INFO",
  "GPS_SAMPLE",
  "SCREEN_NOTE",
  "OPERATOR_NOTE",
];

export function getFieldAcceptanceManifest() {
  return {
    decisions: FIELD_ACCEPTANCE_DECISIONS,
    checklist: FIELD_ACCEPTANCE_CHECKLIST,
    evidenceTypes: FIELD_ACCEPTANCE_EVIDENCE_TYPES,
  };
}

export function buildFieldAcceptanceSkeletonSession() {
  return {
    sessionId: "M60-SKELETON-001",
    decision: "LIMITED_GO",
    driverLabel: "Sürücü demosu",
    deviceModel: "Android demo cihaz",
    osVersion: "Android 14",
    buildProfile: "önizleme",
    testerLabel: "Saha operatörü",
    checklist: FIELD_ACCEPTANCE_CHECKLIST.map((item, idx) => ({
      ...item,
      status: idx < 5 ? "PASS" : "PENDING",
    })),
    evidenceCount: 2,
    note: "Saha öncesi kabul merkezi taslağı",
  };
}
