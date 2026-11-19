const CANONICAL_DEMO_DATABASE_NAME = "seferpakt_clean_demo";
const CANONICAL_DEMO_SCHEMA = "public";
const CANONICAL_DEMO_MIGRATION_COUNT = 68;
const UNCONFIGURED_DATABASE_URL = "postgresql://unconfigured:unconfigured@127.0.0.1:1/UNCONFIGURED_DATABASE?schema=public";

export const DATABASE_MODES = Object.freeze({
  CANONICAL_DEMO: "canonical_demo",
  ISOLATED: "isolated",
  LEGACY: "legacy",
});

export { CANONICAL_DEMO_DATABASE_NAME, CANONICAL_DEMO_SCHEMA, CANONICAL_DEMO_MIGRATION_COUNT, UNCONFIGURED_DATABASE_URL };

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

export function normalizeDatabaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!(parsed.protocol === "postgres:" || parsed.protocol === "postgresql:")) return null;
    if (!parsed.hostname || !parsed.pathname || parsed.pathname === "/") return null;
    if (!parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function databaseTargetFromUrl(value) {
  const parsed = normalizeDatabaseUrl(value);
  if (!parsed) return null;
  return Object.freeze({
    databaseName: decodeURIComponent(parsed.pathname.slice(1)),
    schema: parsed.searchParams.get("schema") || CANONICAL_DEMO_SCHEMA,
    host: parsed.hostname,
    port: parsed.port || "5432",
    username: decodeURIComponent(parsed.username),
  });
}

export function assertDatabaseTarget({ url = process.env.DATABASE_URL, mode = process.env.SEFERPAKT_DATABASE_MODE, label = "DATABASE_URL" } = {}) {
  const parsed = normalizeDatabaseUrl(url);
  if (!parsed) {
    throw fail("DATABASE_TARGET_INVALID", `${label} is required and must be a PostgreSQL URL.`);
  }
  const target = databaseTargetFromUrl(url);
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (normalizedMode === DATABASE_MODES.CANONICAL_DEMO
    && (target.databaseName !== CANONICAL_DEMO_DATABASE_NAME || target.schema !== CANONICAL_DEMO_SCHEMA)) {
    throw fail(
      "CANONICAL_DEMO_DATABASE_REQUIRED",
      `${label} must target ${CANONICAL_DEMO_DATABASE_NAME}.${CANONICAL_DEMO_SCHEMA}.`,
      { target: { ...target, username: undefined } },
    );
  }
  return target;
}

export function isCanonicalDemoTarget(url) {
  const target = databaseTargetFromUrl(url);
  return Boolean(target
    && target.databaseName === CANONICAL_DEMO_DATABASE_NAME
    && target.schema === CANONICAL_DEMO_SCHEMA);
}

export function shouldEnforceCanonicalRuntime({ url = process.env.DATABASE_URL, mode = process.env.SEFERPAKT_DATABASE_MODE } = {}) {
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (normalizedMode === DATABASE_MODES.CANONICAL_DEMO) return true;
  if (normalizedMode === DATABASE_MODES.ISOLATED || normalizedMode === DATABASE_MODES.LEGACY) return false;
  // A development/test process with an explicit URL is treated as an ordinary
  // DEMO run unless it explicitly declares an isolated or legacy target.
  return Boolean(String(url || "").trim())
    && !["production"].includes(String(process.env.NODE_ENV || "").trim().toLowerCase());
}

export async function ensureCanonicalDatabaseReady({ client, url = process.env.DATABASE_URL, expectedMigrationCount = CANONICAL_DEMO_MIGRATION_COUNT } = {}) {
  if (!client || typeof client.$connect !== "function" || typeof client.$queryRawUnsafe !== "function") {
    throw fail("CANONICAL_DATABASE_CLIENT_REQUIRED", "Canonical database client is required.");
  }
  const target = assertDatabaseTarget({ url, mode: DATABASE_MODES.CANONICAL_DEMO });
  await client.$connect();
  const identityRows = await client.$queryRawUnsafe(
    "SELECT current_database() AS database_name, current_schema() AS schema_name, current_user AS current_user, current_setting('server_version_num') AS server_version_num",
  );
  const migrationRows = await client.$queryRawUnsafe(
    "SELECT count(*)::int AS migration_count FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL",
  );
  const identity = identityRows?.[0] || {};
  const migrationCount = Number(migrationRows?.[0]?.migration_count || 0);
  if (identity.database_name !== CANONICAL_DEMO_DATABASE_NAME || identity.schema_name !== CANONICAL_DEMO_SCHEMA) {
    throw fail("CANONICAL_DATABASE_IDENTITY_MISMATCH", "Connected database identity is not the canonical DEMO database.", {
      identity: { databaseName: identity.database_name || null, schema: identity.schema_name || null },
    });
  }
  if (migrationCount !== Number(expectedMigrationCount)) {
    throw fail("CANONICAL_DATABASE_MIGRATION_MISMATCH", `Expected ${expectedMigrationCount} applied migrations, found ${migrationCount}.`, {
      identity: { databaseName: identity.database_name || null, schema: identity.schema_name || null, migrationCount },
    });
  }
  return {
    ...target,
    databaseName: identity.database_name,
    schema: identity.schema_name,
    currentUser: identity.current_user || null,
    serverVersionNum: identity.server_version_num || null,
    migrationCount,
  };
}
