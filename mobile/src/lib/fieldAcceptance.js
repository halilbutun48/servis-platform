export const FIELD_ACCEPTANCE_EVIDENCE_TYPES = [
  "CHECKLIST_NOTE",
  "DEVICE_INFO",
  "BUILD_INFO",
  "GPS_SAMPLE",
  "SCREEN_NOTE",
  "OPERATOR_NOTE",
];

export const FIELD_ACCEPTANCE_DEVICE_FIELDS = [
  "deviceModel",
  "osVersion",
  "buildProfile",
  "appVersion",
  "gpsPermission",
];

export function buildMobileAcceptanceSnapshot(input = {}) {
  return {
    source: "SURUCUNUN_TELEFON_GPSI",
    deviceModel: input.deviceModel || "unknown-device",
    osVersion: input.osVersion || "unknown-os",
    buildProfile: input.buildProfile || "preview",
    appVersion: input.appVersion || "0.0.0",
    gpsPermission: input.gpsPermission || "unknown",
  };
}
