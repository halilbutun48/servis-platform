import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { createWriteFreezeController, isWriteOperation } from "./services/globalWriteFreeze.js";
import { getRedis } from "./redis/index.js";
import {
  assertDatabaseTarget,
  databaseTargetFromUrl,
  ensureCanonicalDatabaseReady,
  shouldEnforceCanonicalRuntime,
  UNCONFIGURED_DATABASE_URL,
  DATABASE_MODES,
} from "./databaseTarget.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
export const WORKER_DATABASE_CONNECT_TIMEOUT_MS = 5_000;

for (const envPath of [path.join(repoRoot, ".env"), path.join(repoRoot, "backend", ".env")]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

// Never invent a local database target. The explicit canonical compose mode
// is fail-closed; an unconfigured process receives an unreachable placeholder
// only so unit imports remain loadable and fail on the first real DB action.
if (shouldEnforceCanonicalRuntime()) {
  assertDatabaseTarget({ mode: DATABASE_MODES.CANONICAL_DEMO });
}

export const runtimeWriteFreezeController = createWriteFreezeController({ redis: getRedis() });

export function resolveWorkerDatabaseUrl({
  workerDatabaseUrl,
  databaseUrl,
  mode = process.env.SEFERPAKT_DATABASE_MODE,
  enforceCanonical,
} = {}) {
  const hasExplicitUrls = workerDatabaseUrl !== undefined || databaseUrl !== undefined;
  const workerValue = workerDatabaseUrl === undefined ? process.env.WORKER_DATABASE_URL : workerDatabaseUrl;
  const appValue = databaseUrl === undefined ? process.env.DATABASE_URL : databaseUrl;
  const worker = databaseTargetFromUrl(workerValue);
  const app = databaseTargetFromUrl(appValue);
  if (!worker || !app) return null;
  const shouldValidateCanonical = enforceCanonical ?? (!hasExplicitUrls && shouldEnforceCanonicalRuntime({ url: appValue, mode }));
  if (shouldValidateCanonical) {
    assertDatabaseTarget({ url: appValue, mode: DATABASE_MODES.CANONICAL_DEMO });
    assertDatabaseTarget({ url: workerValue, mode: DATABASE_MODES.CANONICAL_DEMO, label: "WORKER_DATABASE_URL" });
  }
  // Worker and API credentials must not be the same runtime identity. They may
  // still point at the same database with different least-privilege roles.
  if (String(workerValue) === String(appValue)) return null;
  return String(workerValue);
}

export function createRuntimePrismaClient({
  datasources,
  freezeController = runtimeWriteFreezeController,
  PrismaClientClass = PrismaClient,
} = {}) {
  let clientOptions;
  if (datasources) {
    clientOptions = { datasources };
  } else if (process.env.DATABASE_URL) {
    if (shouldEnforceCanonicalRuntime()) {
      assertDatabaseTarget({ mode: DATABASE_MODES.CANONICAL_DEMO });
    }
    clientOptions = undefined;
  } else {
    clientOptions = { datasources: { db: { url: UNCONFIGURED_DATABASE_URL } } };
  }
  const client = new PrismaClientClass(clientOptions);
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          if (isWriteOperation(operation)) {
            await freezeController.assertWritable({ operation });
          }
          return query(args);
        },
      },
    },
  });
}

export function createWorkerRuntimePrismaClient({
  workerDatabaseUrl,
  databaseUrl,
  mode = process.env.SEFERPAKT_DATABASE_MODE,
  enforceCanonical,
  freezeController = runtimeWriteFreezeController,
  PrismaClientClass = PrismaClient,
} = {}) {
  const resolvedUrl = resolveWorkerDatabaseUrl({ workerDatabaseUrl, databaseUrl, mode, enforceCanonical });
  if (!resolvedUrl) return null;

  const workerUrl = new URL(resolvedUrl);
  workerUrl.searchParams.set("connection_limit", "1");
  workerUrl.searchParams.set("pool_timeout", "5");
  workerUrl.searchParams.set("connect_timeout", "5");

  return createRuntimePrismaClient({
    datasources: { db: { url: workerUrl.toString() } },
    freezeController,
    PrismaClientClass,
  });
}

export async function ensureWorkerDatabaseReady({
  workerClient = workerPrisma,
  timeoutMs = WORKER_DATABASE_CONNECT_TIMEOUT_MS,
} = {}) {
  if (!workerClient || typeof workerClient.$connect !== "function") {
    const error = new Error("WORKER_DATABASE_URL_REQUIRED");
    error.code = "WORKER_DATABASE_URL_REQUIRED";
    throw error;
  }

  const boundedTimeoutMs = Math.max(1, Number(timeoutMs) || WORKER_DATABASE_CONNECT_TIMEOUT_MS);
  let timer = null;
  try {
    const connectAndProbe = (async () => {
      await workerClient.$connect();
      if (typeof workerClient.$queryRawUnsafe !== "function") return { currentUser: null, sessionUser: null };
      const rows = await workerClient.$queryRawUnsafe("SELECT current_user, session_user");
      return {
        currentUser: rows?.[0]?.current_user || null,
        sessionUser: rows?.[0]?.session_user || null,
      };
    })();
    await Promise.race([
      connectAndProbe,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error("Worker veritabanı bağlantısı zamanında kurulamadı.");
          error.code = "WORKER_DATABASE_CONNECT_TIMEOUT";
          reject(error);
        }, boundedTimeoutMs);
      }),
    ]);
    return await connectAndProbe;
  } catch (cause) {
    if (cause?.code === "WORKER_DATABASE_CONNECT_TIMEOUT" || cause?.code === "WORKER_DATABASE_URL_REQUIRED") {
      throw cause;
    }
    const error = new Error("Worker veritabanı bağlantısı kurulamadı.");
    error.code = "WORKER_DATABASE_CONNECT_FAILED";
    error.cause = cause;
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const prisma = createRuntimePrismaClient();
export const workerPrisma = createWorkerRuntimePrismaClient();

export { ensureCanonicalDatabaseReady };
export default prisma;

