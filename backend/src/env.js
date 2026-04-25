// backend/src/env.js
// Tek yerde ENV okuma standardı (M0→M12)

const RUNTIME_MODE = String(process.env.NODE_ENV || process.env.APP_ENV || "development").toLowerCase();
const IS_PRODUCTION = RUNTIME_MODE === "production";
const JWT_SECRET_RAW = String(process.env.JWT_SECRET || "").trim();

if (IS_PRODUCTION && !JWT_SECRET_RAW) {
  throw new Error("JWT_SECRET is required in production");
}

export const ENV = {
  // Server
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: RUNTIME_MODE,
  APP_VERSION: process.env.APP_VERSION || process.env.npm_package_version || "dev",

  // Auth
  JWT_SECRET: JWT_SECRET_RAW || "dev-secret",
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "7d", // backward compatible default
  PRIVILEGED_ACCESS_TOKEN_EXPIRES_IN: process.env.PRIVILEGED_ACCESS_TOKEN_EXPIRES_IN ?? "1h",
  // ✅ M46.9: optional tighter access token TTL for DRIVER (e.g. "12h" or "1h")
  DRIVER_ACCESS_TOKEN_EXPIRES_IN: process.env.DRIVER_ACCESS_TOKEN_EXPIRES_IN ?? "",
  // ✅ M46.9: cap active refresh sessions per user (0 = unlimited)
  MAX_REFRESH_SESSIONS_PER_USER: Number(process.env.MAX_REFRESH_SESSIONS_PER_USER ?? 10),
  // ✅ M46.9: if session/device is bound, require deviceId on refresh (prod only)
  REFRESH_REQUIRE_DEVICE_ID_FOR_BOUND: (process.env.REFRESH_REQUIRE_DEVICE_ID_FOR_BOUND ?? "1") === "1",
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  STEP_UP_REQUIRED_ROLES: process.env.STEP_UP_REQUIRED_ROLES ?? "SUPER_ADMIN,ROOM,COMPANY",
  STEP_UP_TOTP_WINDOW_SEC: Number(process.env.STEP_UP_TOTP_WINDOW_SEC ?? 12 * 60 * 60),
  STEP_UP_TOTP_ISSUER: process.env.STEP_UP_TOTP_ISSUER ?? "Personel-Servis V1",
  TOTP_SECRET_VAULT_KEY: process.env.TOTP_SECRET_VAULT_KEY ?? "",
  GOOGLE_AUTH_ENABLED: (process.env.GOOGLE_AUTH_ENABLED ?? "0") === "1",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",

  // M46: AI Copilot Foundation
  AI_COPILOT_ENABLED: (process.env.AI_COPILOT_ENABLED ?? "1") === "1",

  // M47.3: production resilience + edge security
  EDGE_SECURITY_ENABLED: (process.env.EDGE_SECURITY_ENABLED ?? "1") === "1",
  EDGE_SECURITY_HEADERS_ENABLED: (process.env.EDGE_SECURITY_HEADERS_ENABLED ?? "1") === "1",
  EDGE_BLOCK_SUSPICIOUS_UA: (process.env.EDGE_BLOCK_SUSPICIOUS_UA ?? "1") === "1",
  EDGE_BLOCK_TRACE_METHOD: (process.env.EDGE_BLOCK_TRACE_METHOD ?? "1") === "1",
  EDGE_BLOCKED_UA_NEEDLES: process.env.EDGE_BLOCKED_UA_NEEDLES ?? "sqlmap,nikto,masscan,nmap,zgrab,acunetix,nessus",
  EDGE_SNAPSHOT_WINDOW_MINUTES: Number(process.env.EDGE_SNAPSHOT_WINDOW_MINUTES ?? 60),
  EDGE_WARN_5XX_RATIO_PCT: Number(process.env.EDGE_WARN_5XX_RATIO_PCT ?? 3),
  EDGE_WARN_429_RATIO_PCT: Number(process.env.EDGE_WARN_429_RATIO_PCT ?? 5),
  TRUST_PROXY_HOPS: Number(process.env.TRUST_PROXY_HOPS ?? 1),

  // M47.2: capacity / load baseline
  CAPACITY_BASELINE_ENABLED: (process.env.CAPACITY_BASELINE_ENABLED ?? "1") === "1",
  CAPACITY_BASELINE_WINDOW_MINUTES: Number(process.env.CAPACITY_BASELINE_WINDOW_MINUTES ?? 15),
  CAPACITY_BASELINE_WARN_RPM: Number(process.env.CAPACITY_BASELINE_WARN_RPM ?? 300),
  CAPACITY_BASELINE_WARN_P95_MS: Number(process.env.CAPACITY_BASELINE_WARN_P95_MS ?? 1200),
  CAPACITY_BASELINE_WARN_429_RATIO_PCT: Number(process.env.CAPACITY_BASELINE_WARN_429_RATIO_PCT ?? 5),
  CAPACITY_BASELINE_WARN_INFLIGHT: Number(process.env.CAPACITY_BASELINE_WARN_INFLIGHT ?? 60),
  CAPACITY_BASELINE_WARN_WS_CONNECTIONS: Number(process.env.CAPACITY_BASELINE_WARN_WS_CONNECTIONS ?? 500),
  CAPACITY_BASELINE_WARN_EVENT_LOOP_LAG_MS: Number(process.env.CAPACITY_BASELINE_WARN_EVENT_LOOP_LAG_MS ?? 250),

  // Redis
  REDIS_URL: process.env.REDIS_URL ?? "",
  RATE_LIMIT_STORE: (process.env.RATE_LIMIT_STORE ?? "").toLowerCase(),
  GPS_THROTTLE_STORE: (process.env.GPS_THROTTLE_STORE ?? "").toLowerCase(),

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

  // ✅ M77: route-based rate limit (optional tuning)
  AUTH_RATE_LIMIT_WINDOW_MS: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  AUTH_RATE_LIMIT_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 5),

  READ_RATE_LIMIT_WINDOW_MS: Number(process.env.READ_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  READ_RATE_LIMIT_MAX: Number(process.env.READ_RATE_LIMIT_MAX ?? 120),

  WRITE_RATE_LIMIT_WINDOW_MS: Number(process.env.WRITE_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  WRITE_RATE_LIMIT_MAX: Number(process.env.WRITE_RATE_LIMIT_MAX ?? 60),

  GPS_RATE_LIMIT_WINDOW_MS: Number(process.env.GPS_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  GPS_RATE_LIMIT_MAX: Number(process.env.GPS_RATE_LIMIT_MAX ?? 60),

  // Step 2.5 / M44: telematics ingest
  TELEMATICS_ENABLED: (process.env.TELEMATICS_ENABLED ?? "0") === "1",
  TELEMATICS_VENDOR_SECRET_GENERIC: process.env.TELEMATICS_VENDOR_SECRET_GENERIC ?? "",
  TELEMATICS_VENDOR_SECRET_TRACCAR: process.env.TELEMATICS_VENDOR_SECRET_TRACCAR ?? "",
  TELEMATICS_VENDOR_SHARED_SECRET: process.env.TELEMATICS_VENDOR_SHARED_SECRET ?? "",
  TELEMATICS_VENDOR_SHARED_SECRET_LEGACY_ALLOWED: (process.env.TELEMATICS_VENDOR_SHARED_SECRET_LEGACY_ALLOWED ?? "0") === "1",
  TELEMATICS_VENDOR_REPLAY_WINDOW_SEC: Number(process.env.TELEMATICS_VENDOR_REPLAY_WINDOW_SEC ?? 300),
  TELEMATICS_RATE_LIMIT_WINDOW_MS: Number(process.env.TELEMATICS_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  TELEMATICS_RATE_LIMIT_MAX: Number(process.env.TELEMATICS_RATE_LIMIT_MAX ?? 240),
  TELEMATICS_HISTORY_MIN_SEC: Number(process.env.TELEMATICS_HISTORY_MIN_SEC ?? 30),
  TELEMATICS_HISTORY_MIN_METERS: Number(process.env.TELEMATICS_HISTORY_MIN_METERS ?? 50),

  // Test-only override flags
  GREENPACK_BYPASS_ENABLED: (process.env.GREENPACK_BYPASS_ENABLED ?? "0") === "1",

  // Step 1 foundation: export/download path limiter (WAF-style app guard)
  EXPORT_RATE_LIMIT_WINDOW_MS: Number(process.env.EXPORT_RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000),
  EXPORT_RATE_LIMIT_MAX: Number(process.env.EXPORT_RATE_LIMIT_MAX ?? 10),

  // Log retention / cleanup (M10 + ops)
  // Default: keep 2 years for ApiRequest + AuditLog, shorter hot windows for telemetry/log fanout
  LOG_RETENTION_ENABLED: (process.env.LOG_RETENTION_ENABLED ?? "1") === "1",
  LOG_RETENTION_INTERVAL_HOURS: Number(process.env.LOG_RETENTION_INTERVAL_HOURS ?? 24),
  LOG_RETENTION_BATCH_SIZE: Number(process.env.LOG_RETENTION_BATCH_SIZE ?? 5000),
  API_REQUEST_RETENTION_DAYS: Number(process.env.API_REQUEST_RETENTION_DAYS ?? 730),
  AUDIT_LOG_RETENTION_DAYS: Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? 730),

  // Hot retention, with archive snapshots keeping the long-term proof trail
  NOTIFICATION_RETENTION_DAYS: Number(process.env.NOTIFICATION_RETENTION_DAYS ?? 180),
  CHECKIN_EVENT_RETENTION_DAYS: Number(process.env.CHECKIN_EVENT_RETENTION_DAYS ?? 180),

  // ✅ M39: GPS points retention (30d hot window by default, archive snapshot keeps the long tail)
  GPS_POINT_RETENTION_DAYS: Number(process.env.GPS_POINT_RETENTION_DAYS ?? 30),

  // ✅ M45: backup policy / local snapshot output (archive layer)
  BACKUP_LOCAL_DIR: process.env.BACKUP_LOCAL_DIR ?? "/app/artifacts/backups",
  BACKUP_LOCAL_RETENTION_DAYS: Number(process.env.BACKUP_LOCAL_RETENTION_DAYS ?? 730),
  BACKUP_DUMP_FORMAT: process.env.BACKUP_DUMP_FORMAT ?? "plain",

  // ✅ M19: route learning (optional)
  OSRM_URL: process.env.OSRM_URL ?? "",
  ROUTE_LEARN_ENABLED: (process.env.ROUTE_LEARN_ENABLED ?? "0") === "1",
  ROUTE_LEARN_INTERVAL_MS: Number(process.env.ROUTE_LEARN_INTERVAL_MS ?? 30000),
  ROUTE_LEARN_MAX_SAMPLES: Number(process.env.ROUTE_LEARN_MAX_SAMPLES ?? 20),

  // ✅ M33.2: Plan Builder solver (optional)
  // When running with docker-compose, default is http://solver:8000
  PLAN_SOLVER_URL: process.env.PLAN_SOLVER_URL ?? "",
};
