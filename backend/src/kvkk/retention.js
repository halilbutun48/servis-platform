import { ENV } from "../env.js";
import { sanitizeAuditMeta } from "./enforcement.js";

export const KVKK_RETENTION_VERSION = "2026-04-23-m77.6";

export const KVKK_ANONYMIZE_TARGETS = [
  {
    area: "Consent",
    mode: "retain-proof",
    live: true,
    hotRetentionDays: null,
    archiveMode: "full-db-snapshot",
    archiveRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
    rule: "Kabul / geri alma izi silinmez; belge kanıtı için tutulur.",
  },
  {
    area: "ApiRequest",
    mode: "delete-by-retention",
    live: true,
    hotRetentionDays: ENV.API_REQUEST_RETENTION_DAYS,
    archiveMode: "none",
    archiveRetentionDays: 0,
    rule: "ENV.API_REQUEST_RETENTION_DAYS üstünden silinir.",
  },
  {
    area: "AuditLog",
    mode: "delete-by-retention",
    live: true,
    hotRetentionDays: ENV.AUDIT_LOG_RETENTION_DAYS,
    archiveMode: "none",
    archiveRetentionDays: 0,
    rule: "ENV.AUDIT_LOG_RETENTION_DAYS üstünden silinir.",
  },
  {
    area: "Notification",
    mode: "delete-by-retention",
    live: ENV.NOTIFICATION_RETENTION_DAYS > 0,
    hotRetentionDays: ENV.NOTIFICATION_RETENTION_DAYS,
    archiveMode: "full-db-snapshot",
    archiveRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
    rule: "Notification cleanup hot pencerede yürür; uzun dönem kanıtlar archive snapshot ile korunur.",
  },
  {
    area: "CheckinEvent",
    mode: "delete-by-retention",
    live: ENV.CHECKIN_EVENT_RETENTION_DAYS > 0,
    hotRetentionDays: ENV.CHECKIN_EVENT_RETENTION_DAYS,
    archiveMode: "full-db-snapshot",
    archiveRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
    rule: "Check-in kanıtı hot pencerede tutulur; archive snapshot ile uzun dönem saklanır.",
  },
  {
    area: "GpsPoint",
    mode: "delete-by-retention",
    live: ENV.GPS_POINT_RETENTION_DAYS > 0,
    hotRetentionDays: ENV.GPS_POINT_RETENTION_DAYS,
    archiveMode: "full-db-snapshot",
    archiveRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
    rule: "GPS history için 30 günlük hot pencere; uzun dönem saklama archive snapshot üzerinden yürür.",
  },
  {
    area: "RefreshSession",
    mode: "short-lived-token",
    live: true,
    hotRetentionDays: ENV.REFRESH_TOKEN_TTL_DAYS,
    archiveMode: "none",
    archiveRetentionDays: 0,
    rule: "Refresh session istek yaşam döngüsüyle sınırlıdır; archive hedefi değildir.",
  },
  {
    area: "Invite / ParentInvite",
    mode: "short-lived-token",
    live: true,
    hotRetentionDays: null,
    archiveMode: "none",
    archiveRetentionDays: 0,
    rule: "Invite ve parent invite kayıtları expiry/revoke odaklıdır; archive hedefi değildir.",
  },
  {
    area: "ParentChild / Personel iletişim alanları",
    mode: "response-masking",
    live: true,
    hotRetentionDays: null,
    archiveMode: "response-mask",
    archiveRetentionDays: 0,
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
      checkinEventRetentionDays: ENV.CHECKIN_EVENT_RETENTION_DAYS,
      gpsPointRetentionDays: ENV.GPS_POINT_RETENTION_DAYS,
      logRetentionEnabled: ENV.LOG_RETENTION_ENABLED,
      archive: {
        mode: "full-db-snapshot",
        backupLocalDir: ENV.BACKUP_LOCAL_DIR,
        backupLocalRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
        backupDumpFormat: ENV.BACKUP_DUMP_FORMAT,
      },
    },
    anonymizeTargets: KVKK_ANONYMIZE_TARGETS.map((x) => ({ ...x })),
    trackedAuditActions: [...KVKK_EXPORT_AUDIT_ACTIONS],
    notes: [
      "Retention ve anonymize kararı tablo bazında ayrı tutulur.",
      "Hot tablolar kısa/orta pencerede tutulur; uzun dönem kanıtlar archive snapshot ile korunur.",
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
      checkinEvent: x.checkinEvent || null,
      gpsPoint: x.gpsPoint || null,
      consent: x.consent || null,
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
