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
};
