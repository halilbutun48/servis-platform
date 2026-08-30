import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  BACKEND_ROOT,
  collectPrismaIdentity,
} from "./prisma_cross_platform_client_hardening_01.mjs";
import prisma from "../src/prisma.js";

const platform = process.env.PRISMA_HARDENING_PLATFORM || `${process.platform}-${process.arch}`;
const sourceHead = process.env.PRISMA_SOURCE_HEAD || "UNKNOWN";
const evidencePath = process.env.PRISMA_HARDENING_EVIDENCE_PATH || "";
const healthUrl = process.env.PRISMA_HEALTH_URL || "";

function safeError(error) {
  const code = error?.code || error?.name || "RUNTIME_ERROR";
  return String(code).replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgresql://[redacted]");
}

async function readHealth() {
  if (!healthUrl) return { status: "NOT_CONFIGURED", dbOk: null };
  try {
    const response = await fetch(healthUrl);
    let body = null;
    try {
      body = await response.json();
    } catch {}
    return { status: response.status, dbOk: body?.dbOk === true };
  } catch (error) {
    return { status: 0, dbOk: false, error: safeError(error) };
  }
}

async function main() {
  const identity = await collectPrismaIdentity();
  let queryPass = false;
  let processSurvival = false;
  let queryError = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.user.findFirst({ select: { id: true } });
    queryPass = true;
    await prisma.$queryRaw`SELECT 1`;
    processSurvival = true;
  } catch (error) {
    queryError = safeError(error);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  const health = await readHealth();
  const evidence = {
    evidenceVersion: "PRISMA-CROSS-PLATFORM-CLIENT-HARDENING-01-RUNTIME",
    generatedAt: new Date().toISOString(),
    sourceHead,
    executionEnvironment: platform,
    schemaIdentity: identity.schema.normalizedSha256,
    prismaVersion: identity.prismaVersion.clientVersion,
    engineTarget: identity.generatedClient.engineTarget,
    clientApiIdentity: identity.clientApiIdentity,
    runtimeModelIdentity: identity.runtimeModelIdentity,
    generatedClientIntegrity: Boolean(identity.generatedClient.exists && identity.runtimeModel.requiredModelsPresent && !identity.runtimeError),
    runtimeImport: !identity.runtimeError,
    query: queryPass,
    processSurvival,
    queryError,
    health,
    databaseUrlEmitted: false,
  };

  if (evidencePath) {
    const resolvedEvidencePath = path.resolve(evidencePath);
    fs.mkdirSync(path.dirname(resolvedEvidencePath), { recursive: true });
    fs.writeFileSync(resolvedEvidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  }

  console.log(`PRISMA_RUNTIME_EVIDENCE=${JSON.stringify(evidence)}`);
  process.exitCode = evidence.generatedClientIntegrity && evidence.runtimeImport && queryPass && processSurvival
    && (healthUrl ? health.status === 200 && health.dbOk === true : true)
    ? 0
    : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(`Prisma runtime acceptance failed: ${safeError(error)}`);
    process.exitCode = 1;
  });
}
