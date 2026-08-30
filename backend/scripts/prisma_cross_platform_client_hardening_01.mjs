import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  canonicalPrismaSchemaFiles,
} from "./lib/prismaSchemaSource.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "../..");
export const BACKEND_ROOT = path.join(REPO_ROOT, "backend");
export const CANONICAL_SCHEMA_PATH = path.join(BACKEND_ROOT, "prisma");
export const CANONICAL_SCHEMA_ENTRY_PATH = path.join(CANONICAL_SCHEMA_PATH, "schema.prisma");
export const CANONICAL_SCHEMA_RELATIVE_PATH = "backend/prisma";
export const CANONICAL_GENERATED_CLIENT_PATH = path.join(BACKEND_ROOT, "node_modules", ".prisma", "client");
export const GENERATION_COMMAND = "npm --prefix backend run prisma:generate";
export const PRISMA_HARDENING_EVIDENCE_DIR = path.join(REPO_ROOT, "backend", "artifacts", "browser-smoke", "PRISMA_CROSS_PLATFORM_CLIENT_HARDENING_01");
export const REQUIRED_MODELS = Object.freeze(["User", "Company", "Room", "Agreement", "HakedisRecord", "InvoiceRecord"]);
export const RETRYABLE_GENERATION_CODES = Object.freeze(["EPERM", "EACCES", "EBUSY", "ENOTEMPTY"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function schemaFiles(schemaPath) {
  if (path.resolve(schemaPath) === path.resolve(CANONICAL_SCHEMA_PATH)) {
    return canonicalPrismaSchemaFiles(REPO_ROOT);
  }
  const stats = fs.statSync(schemaPath);
  if (stats.isFile()) return [schemaPath];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== "migrations") visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".prisma")) files.push(absolute);
    }
  };
  visit(schemaPath);
  return files.sort((left, right) => relativePath(left).localeCompare(relativePath(right)));
}

function schemaSourceText(schemaPath) {
  return schemaFiles(schemaPath).map((filePath) => readText(filePath)).join("\n\n");
}

function semanticSchemaText(text, { includeInfrastructure = true } = {}) {
  const blocks = [...String(text || "").matchAll(/^(generator|datasource|enum|model)\s+\w+\s*\{.*?^\}/gms)]
    .filter((match) => includeInfrastructure || ["enum", "model"].includes(match[1]))
    .map((match) => match[0]
      .replace(/\/\/.*$/gm, "")
      .replace(/\s+/g, " ")
      .trim())
    .sort((left, right) => left.localeCompare(right));
  return blocks.join("\n");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function normalizeSchemaText(text) {
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function relativePath(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
    output: `${result.stdout || ""}${result.stderr || ""}`,
  };
}

function gitHead() {
  const result = run("git", ["rev-parse", "HEAD"]);
  return result.status === 0 ? result.stdout.trim() : "UNKNOWN";
}

function npmVersion() {
  const result = run("npm", ["--version"]);
  return result.status === 0 ? result.stdout.trim() : "UNKNOWN";
}

function opensslVersion() {
  const result = run("openssl", ["version"]);
  if (result.status === 0) return result.stdout.trim();
  if (process.platform === "win32") return "Windows OpenSSL runtime via Prisma engine";
  return "UNKNOWN";
}

function parseGeneratorConfig(schemaText) {
  const block = schemaText.match(/generator\s+client\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const value = (key) => block.match(new RegExp(`${key}\\s*=\\s*"([^"]+)"`))?.[1] || null;
  const array = block.match(/binaryTargets\s*=\s*\[([^\]]*)\]/)?.[1];
  const binaryTargets = array
    ? [...array.matchAll(/"([^"]+)"/g)].map((match) => match[1])
    : ["native"];
  return {
    name: "client",
    provider: value("provider"),
    output: value("output"),
    binaryTargets,
    binaryTargetsSource: array ? "explicit" : "implicit-native",
  };
}

function installedPrismaVersions() {
  const lock = readJson(path.join(BACKEND_ROOT, "package-lock.json"));
  const clientVersion = lock.packages?.["node_modules/@prisma/client"]?.version || "UNKNOWN";
  const cliVersion = lock.packages?.["node_modules/prisma"]?.version || "UNKNOWN";
  return {
    clientVersion,
    cliVersion,
    lockfileSha256: sha256(fs.readFileSync(path.join(BACKEND_ROOT, "package-lock.json"))),
  };
}

function expectedNativeTarget() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return process.arch === "arm64" ? "darwin-arm64" : "darwin";
  if (process.platform === "linux") {
    if (fs.existsSync("/etc/alpine-release")) return "linux-musl";
    return "linux-glibc-native";
  }
  return `${process.platform}-${process.arch}`;
}

function engineFiles(generatedDir) {
  if (!fs.existsSync(generatedDir)) return [];
  return fs.readdirSync(generatedDir).filter((name) => /(?:query_engine|libquery_engine|schema-engine)/i.test(name));
}

function currentEngineTargetFromFiles(files) {
  const names = files.join(" ");
  if (names.includes("windows")) return "windows";
  if (names.includes("linux-musl")) return "linux-musl";
  if (names.includes("debian")) return "debian-openssl-3.0.x";
  if (names.includes("linux")) return "linux-native";
  if (names.includes("darwin")) return "darwin";
  return expectedNativeTarget();
}

function modelShape(dmmf) {
  return (dmmf?.datamodel?.models || []).map((model) => ({
    name: model.name,
    fields: (model.fields || []).map((field) => ({
      name: field.name,
      kind: field.kind,
      type: field.type,
      isList: Boolean(field.isList),
      isRequired: Boolean(field.isRequired),
    })),
  }));
}

async function dmmfFromGeneratedDir(generatedDir) {
  const indexPath = path.join(generatedDir, "index.js");
  if (!fs.existsSync(indexPath)) throw new Error(`generated client import missing: ${relativePath(indexPath)}`);
  const module = await import(`${pathToFileURL(indexPath).href}?identity=${Date.now()}`);
  const dmmf = module.Prisma?.dmmf || module.default?.Prisma?.dmmf || null;
  if (!dmmf) throw new Error(`generated client DMMF unavailable: ${relativePath(indexPath)}`);
  return dmmf;
}

export function collectSchemaIdentity(schemaPath = CANONICAL_SCHEMA_PATH) {
  const files = schemaFiles(schemaPath);
  const entryPath = files.find((filePath) => path.basename(filePath) === "schema.prisma") || files[0];
  const raw = fs.readFileSync(entryPath);
  const sourceText = schemaSourceText(schemaPath);
  const sourceIdentity = files.map((filePath) => ({
    path: relativePath(filePath),
    sha256: sha256(fs.readFileSync(filePath)),
  }));
  const text = raw.toString("utf8");
  return {
    path: relativePath(schemaPath),
    rawSha256: sha256(raw),
    normalizedSha256: sha256(normalizeSchemaText(text)),
    sourceSetSha256: sha256(JSON.stringify(sourceIdentity)),
    semanticSha256: sha256(semanticSchemaText(sourceText)),
    modelEnumSemanticSha256: sha256(semanticSchemaText(sourceText, { includeInfrastructure: false })),
    files: sourceIdentity,
    byteLength: raw.length,
  };
}

export function collectGeneratorIdentity(schemaPath = CANONICAL_SCHEMA_PATH) {
  const entryPath = schemaFiles(schemaPath).find((filePath) => path.basename(filePath) === "schema.prisma");
  if (!entryPath) throw new Error(`Prisma schema entry file missing: ${relativePath(schemaPath)}`);
  return parseGeneratorConfig(readText(entryPath));
}

export function collectGeneratedClientMetadata(generatedDir = CANONICAL_GENERATED_CLIENT_PATH) {
  const packagePath = path.join(generatedDir, "package.json");
  const generatedSchemaPath = path.join(generatedDir, "schema.prisma");
  const files = fs.existsSync(generatedDir) ? fs.readdirSync(generatedDir) : [];
  const engines = engineFiles(generatedDir);
  const packageMetadata = fs.existsSync(packagePath) ? readJson(packagePath) : null;
  return {
    path: relativePath(generatedDir),
    exists: fs.existsSync(generatedDir),
    requiredFiles: ["index.js", "index.d.ts", "schema.prisma", "package.json"].map((name) => ({
      name,
      exists: fs.existsSync(path.join(generatedDir, name)),
    })),
    generatedSchemaSha256: fs.existsSync(generatedSchemaPath) ? sha256(fs.readFileSync(generatedSchemaPath)) : null,
    generatedSchemaSemanticSha256: fs.existsSync(generatedSchemaPath)
      ? sha256(semanticSchemaText(readText(generatedSchemaPath), { includeInfrastructure: false }))
      : null,
    packageName: packageMetadata?.name || null,
    packageVersion: packageMetadata?.version || null,
    engineFiles: engines,
    engineTarget: currentEngineTargetFromFiles(engines),
    fileCount: files.length,
  };
}

export async function collectRuntimeModelIdentity(generatedDir = CANONICAL_GENERATED_CLIENT_PATH) {
  const dmmf = await dmmfFromGeneratedDir(generatedDir);
  const models = modelShape(dmmf);
  return {
    modelCount: models.length,
    requiredModelsPresent: REQUIRED_MODELS.every((name) => models.some((model) => model.name === name)),
    dmmfSha256: sha256(JSON.stringify(models)),
    models,
  };
}

export async function collectPrismaIdentity({ generatedDir = CANONICAL_GENERATED_CLIENT_PATH, schemaPath = CANONICAL_SCHEMA_PATH } = {}) {
  const schema = collectSchemaIdentity(schemaPath);
  const generator = collectGeneratorIdentity(schemaPath);
  const versions = installedPrismaVersions();
  const generated = collectGeneratedClientMetadata(generatedDir);
  let runtime = { modelCount: 0, requiredModelsPresent: false, dmmfSha256: null, models: [] };
  let runtimeError = null;
  try {
    runtime = await collectRuntimeModelIdentity(generatedDir);
  } catch (error) {
    runtimeError = error?.message || String(error);
  }
  const clientApiIdentity = sha256(JSON.stringify({
    schema: schema.semanticSha256,
    prismaVersion: versions.clientVersion,
    generator: { provider: generator.provider, output: generator.output, binaryTargets: generator.binaryTargets },
    runtimeModel: runtime.dmmfSha256,
  }));
  return {
    evidenceVersion: "PRISMA-CROSS-PLATFORM-CLIENT-HARDENING-01",
    generatedAt: new Date().toISOString(),
    gitHead: gitHead(),
    platform: {
      os: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      npmVersion: npmVersion(),
      opensslVersion: opensslVersion(),
      expectedNativeTarget: expectedNativeTarget(),
    },
    schema,
    prismaVersion: versions,
    generator,
    generatedClient: generated,
    runtimeModel: runtime,
    runtimeError,
    clientApiIdentity,
    runtimeModelIdentity: runtime.dmmfSha256,
  };
}

export function assertCanonicalGenerationScope({ schemaPath = CANONICAL_SCHEMA_PATH, generatedDir = CANONICAL_GENERATED_CLIENT_PATH } = {}) {
  const canonicalSchema = path.resolve(schemaPath) === path.resolve(CANONICAL_SCHEMA_PATH);
  const canonicalOutput = path.resolve(generatedDir) === path.resolve(CANONICAL_GENERATED_CLIENT_PATH);
  if (!canonicalSchema || !canonicalOutput) {
    throw new Error(`canonical Prisma generation scope rejected: schema=${relativePath(schemaPath)} output=${relativePath(generatedDir)}`);
  }
  return true;
}

function isRetryableGenerationFailure(output) {
  const haystack = String(output || "").toUpperCase();
  return RETRYABLE_GENERATION_CODES.some((code) => haystack.includes(code) || haystack.includes("LOCKED") || haystack.includes("IN USE"));
}

function sleep(milliseconds) {
  const until = Date.now() + milliseconds;
  while (Date.now() < until) {}
}

export function safeReplaceDirectoryWithRetry(target, replacement, { attempts = 8, backoffMs = 200 } = {}) {
  const parent = path.dirname(target);
  const backup = path.join(parent, `.prisma-client-previous-${process.pid}-${Date.now()}`);
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
      if (fs.existsSync(target)) fs.renameSync(target, backup);
      fs.renameSync(replacement, target);
      let backupCleanup = "removed";
      if (fs.existsSync(backup)) {
        try {
          fs.rmSync(backup, { recursive: true, force: true });
        } catch (cleanupError) {
          if (!isRetryableGenerationFailure(cleanupError.code || cleanupError.message)) throw cleanupError;
          backupCleanup = "deferred";
        }
      }
      return { attempts: attempt, recovered: attempt > 1, backupCleanup };
    } catch (error) {
      lastError = error;
      try {
        if (fs.existsSync(backup) && !fs.existsSync(target)) fs.renameSync(backup, target);
      } catch (restoreError) {
        lastError = new Error(`${error.message}; restore failed: ${restoreError.message}`);
      }
      if (attempt < attempts && RETRYABLE_GENERATION_CODES.includes(String(error.code || "").toUpperCase())) {
        sleep(backoffMs * attempt);
        continue;
      }
      break;
    }
  }
  const code = String(lastError?.code || "UNKNOWN");
  throw new Error(`Prisma generated-client replacement failed after ${attempts} bounded attempts (${code}) at ${relativePath(target)}. Check file locks/ACLs and rerun ${GENERATION_COMMAND}.`);
}

export function runPrismaGenerate({ schemaPath = CANONICAL_SCHEMA_PATH, cwd = BACKEND_ROOT } = {}) {
  const cliPath = path.join(BACKEND_ROOT, "node_modules", "prisma", "build", "index.js");
  if (!fs.existsSync(cliPath)) throw new Error(`Prisma CLI is missing: ${relativePath(cliPath)}; run npm --prefix backend ci`);
  const result = run(process.execPath, [cliPath, "generate", "--schema", schemaPath], {
    cwd,
    env: { PRISMA_GENERATE_SKIP_AUTOINSTALL: "1", NPM_CONFIG_UPDATE_NOTIFIER: "false" },
  });
  if (result.status !== 0) {
    const suffix = isRetryableGenerationFailure(result.output) ? " File lock/permission retry condition detected." : "";
    throw new Error(`Prisma generate failed with exit ${result.status}.${suffix} ${result.output.slice(-1200)}`);
  }
  return result;
}

function createIsolatedGenerationWorkspace() {
  const workspaceRoot = fs.mkdtempSync(path.join(BACKEND_ROOT, ".prisma-hardening-"));
  const prismaDir = path.join(workspaceRoot, "prisma");
  const outputDir = path.join(workspaceRoot, "generated-client");
  fs.mkdirSync(prismaDir, { recursive: true });
  const sourceRoot = path.join(BACKEND_ROOT, "prisma");
  for (const sourceFile of schemaFiles(CANONICAL_SCHEMA_PATH)) {
    const relative = path.relative(sourceRoot, sourceFile);
    const destination = path.join(prismaDir, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(sourceFile, destination);
  }
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const source = readText(schemaPath);
  const schema = source.replace(
    /generator\s+client\s*\{([\s\S]*?)\n\}/,
    (match) => match.slice(0, -1) + "  output = \"../generated-client\"\n}",
  );
  fs.writeFileSync(schemaPath, schema, "utf8");
  return { workspaceRoot, prismaDir, schemaPath, outputDir };
}

export function validateGeneratedClientIdentity(identity, { expectedSchemaPath = CANONICAL_SCHEMA_PATH, expectedPrismaVersion = null } = {}) {
  const expectedSchema = collectSchemaIdentity(expectedSchemaPath);
  const requiredFiles = identity.generatedClient.requiredFiles.every((item) => item.exists);
  const schemaMatch = identity.generatedClient.generatedSchemaSemanticSha256 === expectedSchema.modelEnumSemanticSha256;
  const versionMatch = identity.prismaVersion.clientVersion === identity.prismaVersion.cliVersion
    && (!expectedPrismaVersion || identity.prismaVersion.clientVersion === expectedPrismaVersion);
  const models = identity.runtimeModel.requiredModelsPresent;
  const runtimeImport = !identity.runtimeError;
  return {
    requiredFiles,
    schemaMatch,
    versionMatch,
    models,
    runtimeImport,
    ok: requiredFiles && schemaMatch && versionMatch && models && runtimeImport,
  };
}

export async function generateCanonicalClient() {
  assertCanonicalGenerationScope();
  const target = CANONICAL_GENERATED_CLIENT_PATH;
  const workspace = createIsolatedGenerationWorkspace();
  try {
    let identity;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        runPrismaGenerate({ schemaPath: workspace.prismaDir });
        identity = await collectPrismaIdentity({ generatedDir: workspace.outputDir, schemaPath: CANONICAL_SCHEMA_PATH });
        const validation = validateGeneratedClientIdentity(identity);
        if (!validation.ok) throw new Error("isolated generated client rejected: " + JSON.stringify(validation));
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3 && isRetryableGenerationFailure(error.message)) sleep(150 * attempt);
        else break;
      }
    }
    if (lastError) throw lastError;
    return safeReplaceDirectoryWithRetry(target, workspace.outputDir, { attempts: 8, backoffMs: 200 });
  } catch (error) {
    throw new Error("Canonical Prisma client generation was not accepted; existing output was preserved: " + error.message);
  } finally {
    fs.rmSync(workspace.workspaceRoot, { recursive: true, force: true });
  }
}

export function writeEvidence(name, value) {
  fs.mkdirSync(PRISMA_HARDENING_EVIDENCE_DIR, { recursive: true });
  const outputPath = path.join(PRISMA_HARDENING_EVIDENCE_DIR, name);
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return outputPath;
}

function usage() {
  console.log(`Usage: node backend/scripts/prisma_cross_platform_client_hardening_01.mjs <generate|identity|verify>`);
}

async function main() {
  const command = process.argv[2] || "identity";
  if (command === "generate") {
    await generateCanonicalClient();
    const identity = await collectPrismaIdentity();
    writeEvidence("windows-native-generation.json", identity);
    console.log(`PRISMA_GENERATE=PASS`);
    console.log(`CLIENT_API_IDENTITY=${identity.clientApiIdentity}`);
    console.log(`SCHEMA_IDENTITY=${identity.schema.normalizedSha256}`);
    return;
  }
  if (command === "identity" || command === "verify") {
    const identity = await collectPrismaIdentity();
    const requiredFiles = identity.generatedClient.requiredFiles.every((item) => item.exists);
    const models = identity.runtimeModel.requiredModelsPresent;
    const schemaMatch = identity.generatedClient.generatedSchemaSemanticSha256 === identity.schema.modelEnumSemanticSha256;
    const versionMatch = identity.prismaVersion.clientVersion === identity.prismaVersion.cliVersion;
    if (command === "verify" && (!requiredFiles || !models || !schemaMatch || !versionMatch || identity.runtimeError)) {
      throw new Error(`Prisma generated-client integrity failed: ${JSON.stringify({ requiredFiles, models, schemaMatch, versionMatch, runtimeError: identity.runtimeError })}`);
    }
    writeEvidence(`${process.platform}-${process.arch}-identity.json`, identity);
    console.log(JSON.stringify({
      PRISMA_VERIFY: command === "verify" ? "PASS" : "IDENTITY",
      HEAD: identity.gitHead,
      SCHEMA_IDENTITY: identity.schema.normalizedSha256,
      PRISMA_VERSION: identity.prismaVersion.clientVersion,
      GENERATED_CLIENT_IDENTITY: identity.clientApiIdentity,
      RUNTIME_MODEL_IDENTITY: identity.runtimeModelIdentity,
      ENGINE_TARGET: identity.generatedClient.engineTarget,
    }, null, 2));
    return;
  }
  usage();
  process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exit(1);
  });
}
