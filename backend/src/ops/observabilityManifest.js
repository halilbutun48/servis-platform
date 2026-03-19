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


export function buildRoomObservabilitySummary(user) {
  const roomLabel = String(user?.roomName || user?.name || user?.email || "ROOM").trim() || "ROOM";
  return {
    scope: "ROOM",
    roomLabel,
    cards: {
      activeDrivers: 4,
      riskyDevices: 1,
      staleOrOffline: 2,
      openIssues: 1,
    },
    wording: {
      gpsSource: "SURUCUNUN_TELEFON_GPSI",
      issueTone: "plain-tr",
    },
    notes: [
      "Bu ekran M59-R1 room operasyon sagligi iskeletidir.",
      "Gercek telemetry ve room kapsam filtreleri sonraki iterasyonda doldurulacak.",
    ],
  };
}

export function buildRoomObservabilityDrivers(user) {
  const roomLabel = String(user?.roomName || user?.name || user?.email || "ROOM").trim() || "ROOM";
  return [
    {
      id: "drv-demo-1",
      driverName: "Demo Surucu 1",
      vehiclePlate: "34 R 1001",
      liveState: "LIVE",
      gpsReliabilityScore: 92,
      permissionState: "GRANTED",
      sessionState: "OK",
      lastGpsAt: "2 dk once",
      issueSummary: "Sorun yok",
      roomLabel,
    },
    {
      id: "drv-demo-2",
      driverName: "Demo Surucu 2",
      vehiclePlate: "34 R 1002",
      liveState: "STALE",
      gpsReliabilityScore: 61,
      permissionState: "GRANTED",
      sessionState: "OK",
      lastGpsAt: "11 dk once",
      issueSummary: "Konum gonderimi gecikmis gorunuyor",
      roomLabel,
    },
    {
      id: "drv-demo-3",
      driverName: "Demo Surucu 3",
      vehiclePlate: "34 R 1003",
      liveState: "OFFLINE",
      gpsReliabilityScore: 38,
      permissionState: "UNKNOWN",
      sessionState: "REFRESH_NEEDED",
      lastGpsAt: "27 dk once",
      issueSummary: "Oturum veya baglanti kontrol edilmeli",
      roomLabel,
    },
  ];
}

export function buildRoomObservabilityIssues(_user) {
  return [
    {
      severity: "HIGH",
      title: "Konum akisi zayif",
      detail: "Bir surucude stale/offline davranisi goruluyor.",
    },
    {
      severity: "MEDIUM",
      title: "Oturum yenileme gerekebilir",
      detail: "Bir surucude session durumu kontrol edilmeli.",
    },
  ];
}
