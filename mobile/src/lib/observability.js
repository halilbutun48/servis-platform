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

export const GPS_SOURCE_LABEL = "SURUCUNUN_TELEFON_GPSI";

export function createMobileHealthEvent(type, extra = {}) {
  return {
    type,
    source: GPS_SOURCE_LABEL,
    at: new Date().toISOString(),
    ...extra,
  };
}

export function buildGpsRiskLabel(summary = {}) {
  const lastGpsAt = summary?.lastGpsAt || null;
  const hasSessionFailure = Boolean(summary?.sessionFailure);
  const hasKvkkBlock = Boolean(summary?.kvkkBlocked);

  if (hasKvkkBlock) return "KVKK bloklu";
  if (hasSessionFailure) return "Oturum riski";
  if (!lastGpsAt) return "GPS verisi bekleniyor";
  return "Izleniyor";
}
