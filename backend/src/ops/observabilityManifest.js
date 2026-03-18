export const MOBILE_HEALTH_EVENT_TYPES = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "PIN_CHANGED",
  "GPS_PERMISSION_CHANGED",
  "GPS_PUBLISH_SUCCESS",
  "GPS_PUBLISH_FAILURE",
  "OFFLINE_ENTERED",
  "ONLINE_RECOVERED",
  "SESSION_FAILURE",
  "KVKK_BLOCKED",
  "ISSUE_REPORTED",
];

export const M59_OBSERVABILITY_WIDGETS = [
  { key: "mobileHealth", label: "Mobil sağlık olayları" },
  { key: "deviceHealth", label: "Cihaz sağlık özeti" },
  { key: "gpsReliability", label: "GPS güven skoru" },
  { key: "issueInbox", label: "Sorun bildir" },
  { key: "shiftTimeline", label: "Vardiya olay akışı" },
];

export function getObservabilityManifest() {
  return {
    milestone: "M59",
    title: "Gözlemleme + Saha Teşhis",
    mobileHealthEventTypes: MOBILE_HEALTH_EVENT_TYPES,
    widgets: M59_OBSERVABILITY_WIDGETS,
    scope: {
      room: true,
      superAdmin: true,
      company: false,
      driver: false,
    },
  };
}

export function buildObservabilitySkeletonSummary() {
  return {
    status: "SCAFFOLD",
    gpsReliability: {
      label: "GPS güven skoru",
      bucket: "hazirlik",
      score: null,
      notes: [
        "M59 iskeleti acildi.",
        "Gercek telemetry toplama M59 ilerledikce doldurulacak.",
      ],
    },
    deviceHealth: {
      label: "Cihaz sağlık özeti",
      lastSyncAt: null,
      lastGpsAt: null,
      risk: "unknown",
    },
    wording: {
      gpsSource: "SURUCUNUN_TELEFON_GPSI",
      issueTone: "plain-tr",
    },
  };
}
