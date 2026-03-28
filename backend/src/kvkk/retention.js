import { ENV } from "../env.js";
import { sanitizeAuditMeta } from "./enforcement.js";

export const KVKK_RETENTION_VERSION = "2026-03-28-m77.5";

export const KVKK_ANONYMIZE_TARGETS = [
  {
    area: "Consent",
    mode: "retain-proof",
    live: true,
    rule: "Kabul / geri alma izi silinmez; belge kanıtı için tutulur.",
  },
  {
    area: "ApiRequest",
    mode: "delete-by-retention",
    live: true,
    rule: "ENV.API_REQUEST_RETENTION_DAYS üstünden silinir.",
  },
  {
    area: "AuditLog",
    mode: "delete-by-retention",
    live: true,
    rule: "ENV.AUDIT_LOG_RETENTION_DAYS üstünden silinir.",
  },
  {
    area: "GpsPoint",
    mode: "delete-by-retention",
    live: ENV.GPS_POINT_RETENTION_DAYS > 0,
    rule: "GPS history için retention 0 ise otomatik silme kapalıdır; açılırsa ENV.GPS_POINT_RETENTION_DAYS ile yürür.",
  },
  {
    area: "Notification",
    mode: "delete-by-retention",
    live: ENV.NOTIFICATION_RETENTION_DAYS > 0,
    rule: "Notification cleanup opsiyoneldir; 0 ise kapalıdır.",
  },
  {
    area: "ParentChild / Personel iletişim alanları",
    mode: "response-masking",
    live: true,
    rule: "Bu turda DB anonymize değil; response masking ile görünürlük daraltılır.",
  },
];

export const KVKK_EXPORT_AUDIT_ACTIONS = ["LOG_EXPORT", "RETENTION_RUN", "KVKK_DOC_ACCEPT", "KVKK_DOC_REVOKE"];

export function buildKvkkRetentionEnforcementSummary() {
  return {
    version: KVKK_RETENTION_VERSION,
    policy: {
      apiRequestRetentionDays: ENV.API_REQUEST_RETENTION_DAYS,
      auditLogRetentionDays: ENV.AUDIT_LOG_RETENTION_DAYS,
      notificationRetentionDays: ENV.NOTIFICATION_RETENTION_DAYS,
      gpsPointRetentionDays: ENV.GPS_POINT_RETENTION_DAYS,
      logRetentionEnabled: ENV.LOG_RETENTION_ENABLED,
    },
    anonymizeTargets: KVKK_ANONYMIZE_TARGETS.map((x) => ({ ...x })),
    trackedAuditActions: [...KVKK_EXPORT_AUDIT_ACTIONS],
    notes: [
      "Retention ve anonymize kararı tablo bazında ayrı tutulur.",
      "Export audit izi ham email/ip filtrelerini olduğu gibi yazmamalıdır.",
      "DB anonymize ile response masking aynı şey değildir; her ikisi ayrı katman olarak izlenir.",
    ],
  };
}

export function sanitizeRetentionRunResult(result) {
  const x = result && typeof result === "object" ? result : {};
  return {
    cutoffs: sanitizeAuditMeta(x.cutoffs || null),
    counts: sanitizeAuditMeta({
      apiRequest: x.apiRequest || null,
      auditLog: x.auditLog || null,
      notification: x.notification || null,
      gpsPoint: x.gpsPoint || null,
    }),
  };
}

export function buildKvkkRetentionRunAuditMeta({ dryRun, result }) {
  return {
    class: "KVKK_RETENTION_RUN",
    dryRun: !!dryRun,
    policyVersion: KVKK_RETENTION_VERSION,
    summary: sanitizeRetentionRunResult(result),
  };
}

export function buildKvkkExportAuditMeta(meta) {
  const raw = meta && typeof meta === "object" ? meta : {};
  return {
    class: "KVKK_EXPORT_TRAIL",
    endpoint: raw.endpoint || null,
    kind: raw.kind || null,
    kindRaw: raw.kindRaw || null,
    targetType: raw.targetType || null,
    targetId: raw.targetId || null,
    childId: raw.childId || null,
    format: raw.format || null,
    take: raw.take || null,
    rowCount: raw.rowCount || 0,
    reason: raw.reason || null,
    rangeTR: sanitizeAuditMeta(raw.rangeTR || null),
    filters: sanitizeAuditMeta(raw.filters || null),
    policyVersion: KVKK_RETENTION_VERSION,
  };
}
