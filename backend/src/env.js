// backend/src/env.js
// Tek yerde ENV okuma standardı (M0→M12)

export const ENV = {
  // Server
  PORT: Number(process.env.PORT ?? 3000),
  APP_VERSION: process.env.APP_VERSION || process.env.npm_package_version || "dev",

  // Auth
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret",

  // DB
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5433/servisdb?schema=public",

  // GPS monitors
  GPS_STALE_SEC: Number(process.env.GPS_STALE_SEC ?? 40),
  GPS_OFFLINE_SEC: Number(process.env.GPS_OFFLINE_SEC ?? 120),

  // Security (M11)
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 600),

  // Log retention / cleanup (M10 + ops)
  // Default: keep 2 years for ApiRequest + AuditLog (spec alignment)
  LOG_RETENTION_ENABLED: (process.env.LOG_RETENTION_ENABLED ?? "1") === "1",
  LOG_RETENTION_INTERVAL_HOURS: Number(process.env.LOG_RETENTION_INTERVAL_HOURS ?? 24),
  LOG_RETENTION_BATCH_SIZE: Number(process.env.LOG_RETENTION_BATCH_SIZE ?? 5000),
  API_REQUEST_RETENTION_DAYS: Number(process.env.API_REQUEST_RETENTION_DAYS ?? 730),
  AUDIT_LOG_RETENTION_DAYS: Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? 730),

  // Optional (off by default): old notifications cleanup
  NOTIFICATION_RETENTION_DAYS: Number(process.env.NOTIFICATION_RETENTION_DAYS ?? 0),
};
