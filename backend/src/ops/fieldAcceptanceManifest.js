export const FIELD_ACCEPTANCE_DECISIONS = ["GO", "LIMITED_GO", "NO_GO"];

export const FIELD_ACCEPTANCE_CHECKLIST = [
  { id: "login_ok", label: "Giris akisi tamamlandi", area: "auth" },
  { id: "pin_change_ok", label: "Ilk PIN degisimi anlasilir", area: "auth" },
  { id: "today_screen_ok", label: "Today ekrani net", area: "ux" },
  { id: "gps_permission_ok", label: "GPS izin akisi net", area: "gps" },
  { id: "gps_publish_ok", label: "Surucunun telefon GPS'i yayin verdi", area: "gps" },
  { id: "offline_recovery_ok", label: "Offline toparlama anlasilir", area: "resilience" },
  { id: "kvkk_ok", label: "KVKK blocking dili net", area: "kvkk" },
  { id: "eta_voice_ok", label: "ETA ve sesli rehber yeterli", area: "route" },
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
    driverLabel: "Driver demo",
    deviceModel: "Android demo cihaz",
    osVersion: "Android 14",
    buildProfile: "preview",
    testerLabel: "Field Operator",
    checklist: FIELD_ACCEPTANCE_CHECKLIST.map((item, idx) => ({
      ...item,
      status: idx < 5 ? "PASS" : "PENDING",
    })),
    evidenceCount: 2,
    note: "Saha oncesi acceptance merkezi iskeleti",
  };
}
