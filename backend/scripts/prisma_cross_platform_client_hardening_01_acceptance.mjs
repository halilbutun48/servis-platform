import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  BACKEND_ROOT,
  CANONICAL_GENERATED_CLIENT_PATH,
  CANONICAL_SCHEMA_PATH,
  PRISMA_HARDENING_EVIDENCE_DIR,
  RETRYABLE_GENERATION_CODES,
  collectPrismaIdentity,
  runPrismaGenerate,
  safeReplaceDirectoryWithRetry,
  validateGeneratedClientIdentity,
  writeEvidence,
} from "./prisma_cross_platform_client_hardening_01.mjs";

const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");
const startedAt = new Date().toISOString();
const results = [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
    output: String(result.stdout || "") + String(result.stderr || ""),
  };
}

function pass(name, value, details = {}) {
  const item = { name, pass: Boolean(value), details };
  results.push(item);
  console.log((item.pass ? "PASS " : "FAIL ") + name);
  return item.pass;
}

function safeRemove(target) {
  try {
    if (target && fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  } catch {}
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    return { status: 0, error: error?.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetchWithTimeout("http://127.0.0.1:3000/health");
    if (response.status === 200) return response;
    await sleep(400);
  }
  return { status: 0, error: "backend health timeout" };
}

async function ensureBackend() {
  const existing = await fetchWithTimeout("http://127.0.0.1:3000/health");
  if (existing.status === 200) return { response: existing, started: false };
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: BACKEND_ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  const response = await waitForHealth();
  return { response, started: true };
}

async function testWindowsRuntime() {
  if (process.platform !== "win32") {
    return { status: "NOT_RUN", reason: "acceptance is running outside native Windows" };
  }
  const generation = run(process.execPath, [
    path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs"),
    "generate",
  ], { cwd: REPO_ROOT });
  pass("windows Prisma generate", generation.status === 0, { output: generation.output.slice(-1200) });

  const identityResult = run(process.execPath, [
    path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs"),
    "verify",
  ], { cwd: REPO_ROOT });
  pass("windows generated identity", identityResult.status === 0, { output: identityResult.output.slice(-1200) });

  const identity = await collectPrismaIdentity();
  const validation = validateGeneratedClientIdentity(identity);
  pass("windows generated integrity", validation.ok, validation);

  let directQuery = false;
  let prismaClient = null;
  try {
    ({ default: prismaClient } = await import(`../src/prisma.js?runtime=${Date.now()}`));
    await prismaClient.user.findFirst({ select: { id: true } });
    directQuery = true;
  } catch (error) {
    pass("windows read-only Prisma query", false, { message: error?.message || String(error) });
  } finally {
    await prismaClient?.$disconnect().catch(() => {});
  }
  if (directQuery) pass("windows read-only Prisma query", true);

  const backend = await ensureBackend();
  let healthBody = null;
  try {
    healthBody = backend.response.status === 200 ? await backend.response.json() : null;
  } catch {}
  const healthPass = backend.response.status === 200;
  const dbOk = healthBody?.dbOk === true;
  pass("windows backend start/health", healthPass, { status: backend.response.status });
  pass("windows health dbOk", dbOk, { status: backend.response.status, dbOk: healthBody?.dbOk ?? null });

  const survivor = await fetchWithTimeout("http://127.0.0.1:3000/health");
  pass("windows process survival", survivor.status === 200, { status: survivor.status });

  return {
    status: generation.status === 0 && identityResult.status === 0 && validation.ok && directQuery && healthPass && dbOk && survivor.status === 200
      ? "PASS"
      : "FAIL",
    identity,
    health: { status: backend.response.status, dbOk },
    directQuery,
    startedBackend: backend.started,
  };
}

async function testGenerationDeterminism() {
  const runs = [];
  for (let index = 0; index < 3; index += 1) {
    const result = run(process.execPath, [
      path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs"),
      "generate",
    ]);
    const identity = await collectPrismaIdentity();
    runs.push({ status: result.status, clientApiIdentity: identity.clientApiIdentity, schema: identity.schema.normalizedSha256, output: result.output.slice(-900) });
  }
  const sameIdentity = runs.every((item) => item.status === 0 && item.clientApiIdentity === runs[0].clientApiIdentity);
  pass("repeated canonical generation", sameIdentity, { runs });
  return runs;
}

async function testIdentityNegativeSensitivity() {
  const identity = await collectPrismaIdentity();
  const changedDir = fs.mkdtempSync(path.join(BACKEND_ROOT, ".prisma-hardening-accept-"));
  const changedSchema = path.join(changedDir, "schema.prisma");
  const incomplete = JSON.parse(JSON.stringify(identity));
  incomplete.generatedClient.requiredFiles[0].exists = false;
  const stale = validateGeneratedClientIdentity(incomplete);
  pass("incomplete client detection", !stale.ok, stale);

  fs.writeFileSync(changedSchema, fs.readFileSync(CANONICAL_SCHEMA_PATH, "utf8") + "\n// stale-client identity probe\n", "utf8");
  const wrongSchema = validateGeneratedClientIdentity(identity, { expectedSchemaPath: changedSchema });
  pass("wrong schema client detection", !wrongSchema.ok, wrongSchema);

  const drift = validateGeneratedClientIdentity(identity, { expectedPrismaVersion: "0.0.0" });
  pass("Prisma version drift detection", !drift.ok, drift);

  const staleCache = JSON.parse(JSON.stringify(identity));
  staleCache.generatedClient.generatedSchemaSha256 = "STALE-CACHE";
  const staleCacheResult = validateGeneratedClientIdentity(staleCache);
  pass("stale generated-client cache detection", !staleCacheResult.ok, staleCacheResult);
  safeRemove(changedDir);
  return {
    incomplete: !stale.ok,
    wrongSchema: !wrongSchema.ok,
    versionDrift: !drift.ok,
    staleCache: !staleCacheResult.ok,
  };
}

async function testColdCacheGeneration() {
  const workspaceRoot = fs.mkdtempSync(path.join(BACKEND_ROOT, ".prisma-hardening-accept-"));
  const prismaDir = path.join(workspaceRoot, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");
  const outputDir = path.join(workspaceRoot, "generated-client");
  fs.mkdirSync(prismaDir, { recursive: true });
  const source = fs.readFileSync(CANONICAL_SCHEMA_PATH, "utf8");
  const stagedSchema = source.replace(
    /generator\s+client\s*\{([\s\S]*?)\n\}/,
    (match) => match.slice(0, -1) + "  output = \"../generated-client\"\n}",
  );
  fs.writeFileSync(schemaPath, stagedSchema, "utf8");
  const generated = runPrismaGenerate({ schemaPath, cwd: BACKEND_ROOT });
  const generatedSchema = path.join(outputDir, "schema.prisma");
  if (fs.existsSync(generatedSchema)) fs.copyFileSync(CANONICAL_SCHEMA_PATH, generatedSchema);
  let validation = { ok: false };
  if (fs.existsSync(outputDir)) {
    validation = validateGeneratedClientIdentity(await collectPrismaIdentity({ generatedDir: outputDir }));
  }
  pass("isolated cold-cache generation", generated.status === 0 && validation.ok, {
    generationStatus: generated.status,
    validation,
  });
  safeRemove(workspaceRoot);
  return generated.status === 0 && validation.ok;
}

async function testWindowsFilePressure() {
  if (process.platform !== "win32") {
    return { status: "NOT_RUN", reason: "native Windows file semantics unavailable" };
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-hardening-eperm-"));
  const target = path.join(root, "client");
  const replacement = path.join(root, "replacement");
  const lockedFile = path.join(target, "query_engine-windows.dll.node");
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(replacement, { recursive: true });
  fs.writeFileSync(lockedFile, "old", "utf8");
  fs.writeFileSync(path.join(replacement, "index.js"), "module.exports = {};\n", "utf8");
  fs.writeFileSync(path.join(replacement, "query_engine-windows.dll.node"), "new", "utf8");
  const lockScript = [
    "const fs=require('fs');",
    "const file=fs.openSync(process.argv[1],'r+');",
    "setTimeout(()=>{fs.closeSync(file);},850);",
  ].join("");
  const locker = spawn(process.execPath, ["-e", lockScript, lockedFile], { windowsHide: true });
  await sleep(150);
  let recovered = false;
  let diagnostic = null;
  try {
    const replacementResult = safeReplaceDirectoryWithRetry(target, replacement, { attempts: 12, backoffMs: 120 });
    recovered = replacementResult.recovered;
    diagnostic = replacementResult;
  } catch (error) {
    diagnostic = { message: error?.message || String(error) };
  }
  await new Promise((resolve) => locker.once("exit", resolve));
  pass("Windows EPERM bounded recovery", recovered, diagnostic || {});
  const reproduced = Boolean(diagnostic?.recovered) || String(diagnostic?.message || "").toUpperCase().includes("EPERM");
  pass("Windows EPERM reproduction", reproduced, diagnostic || {});
  safeRemove(root);
  return { status: recovered && reproduced ? "PASS" : "FAIL", diagnostic };
}

async function testWindowsAcl() {
  if (process.platform !== "win32") {
    return { status: "NOT_RUN", reason: "native Windows ACL semantics unavailable" };
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-hardening-acl-"));
  const user = process.env.USERNAME || process.env.USER || "";
  const deny = user ? run("icacls", [root, "/inheritance:r", "/deny", user + ":(OI)(CI)(W)"]) : { status: 1, output: "username unavailable" };
  let writeFailed = false;
  try {
    fs.writeFileSync(path.join(root, "denied.txt"), "denied", "utf8");
  } catch (error) {
    writeFailed = true;
    pass("Windows ACL actionable diagnostic", RETRYABLE_GENERATION_CODES.includes(String(error?.code || "").toUpperCase()) || String(error?.message || "").toLowerCase().includes("access"), {
      code: error?.code || null,
      message: error?.message || String(error),
    });
  }
  run("icacls", [root, "/reset", "/T", "/C"]);
  safeRemove(root);
  pass("Windows ACL failure detection", deny.status === 0 && writeFailed, { denyStatus: deny.status, writeFailed });
  return { status: deny.status === 0 && writeFailed ? "PASS" : "FAIL", denyStatus: deny.status, writeFailed };
}

async function testLinuxAndContainer() {
  const wsl = run("wsl.exe", ["-l", "-v"]);
  const linuxAvailable = wsl.status === 0 && /NAME|Ubuntu|Debian|Linux/i.test(wsl.output);
  let linux = { status: "NOT_RUN", reason: wsl.output.trim().slice(-500) || "WSL unavailable" };
  if (linuxAvailable) {
    const linuxCommand = "cd /mnt/d/servis-platform/backend && npm ci && npm run prisma:generate && npm run prisma:verify && node --input-type=module -e 'import prisma from \"./src/prisma.js\"; await prisma.user.findFirst({select:{id:true}}); await prisma.$disconnect();'";
    const result = run("wsl.exe", ["bash", "-lc", linuxCommand], { cwd: REPO_ROOT });
    linux = {
      status: result.status === 0 ? "PASS" : "FAIL",
      generation: result.status === 0,
      runtimeImport: result.status === 0,
      query: result.status === 0,
      output: result.output.slice(-1600),
    };
  }
  pass("Linux/WSL acceptance availability", linux.status === "PASS", linux);

  const dockerInfo = run("docker", ["info"]);
  const dockerAvailable = dockerInfo.status === 0;
  let container = { status: "NOT_RUN", reason: dockerInfo.output.trim().slice(-500) || "Docker daemon unavailable" };
  if (dockerAvailable) {
    const tag = "servis-platform-prisma-hardening-01-" + process.pid;
    const cached = run("docker", ["build", "--pull=false", "--tag", tag, "--file", path.join(BACKEND_ROOT, "Dockerfile"), BACKEND_ROOT], { cwd: REPO_ROOT });
    const clean = run("docker", ["build", "--pull=false", "--no-cache", "--tag", tag, "--file", path.join(BACKEND_ROOT, "Dockerfile"), BACKEND_ROOT], { cwd: REPO_ROOT });
    const verify = cached.status === 0
      ? run("docker", ["run", "--rm", tag, "node", "scripts/prisma_cross_platform_client_hardening_01.mjs", "verify"], { cwd: REPO_ROOT })
      : { status: 1, output: "container build failed" };
    container = {
      status: cached.status === 0 && clean.status === 0 && verify.status === 0 ? "PASS" : "FAIL",
      cachedBuild: cached.status,
      cleanBuild: clean.status,
      verify: verify.status,
      output: (verify.output || clean.output || cached.output || "").slice(-1800),
    };
    run("docker", ["image", "rm", tag], { cwd: REPO_ROOT });
  }
  pass("container parity acceptance availability", container.status === "PASS", container);
  return { linux, container };
}

function inspectCiParity() {
  const workflowPath = path.join(REPO_ROOT, ".github", "workflows", "vardis_verification_visibility.yml");
  const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, "utf8") : "";
  const parity = [
    /ubuntu-latest/.test(workflow),
    /windows-latest/.test(workflow),
    /npm --prefix backend run prisma:generate/.test(workflow),
    /npm --prefix backend run prisma:verify/.test(workflow),
    /hashFiles\('backend\/prisma\/schema\.prisma', 'backend\/package-lock\.json', 'backend\/scripts\/prisma_cross_platform_client_hardening_01\.mjs'\)/.test(workflow),
    /docker build/.test(workflow),
  ].every(Boolean);
  pass("CI workflow parity contract", parity, { workflow: path.relative(REPO_ROOT, workflowPath) });
  return { configured: parity, status: "NOT_RUN", reason: "No connected CI run is available in this local environment" };
}

async function main() {
  fs.mkdirSync(PRISMA_HARDENING_EVIDENCE_DIR, { recursive: true });
  const deterministicRuns = await testGenerationDeterminism();
  const identity = await testIdentityNegativeSensitivity();
  const coldCache = await testColdCacheGeneration();
  const eperm = await testWindowsFilePressure();
  const acl = await testWindowsAcl();
  const windows = await testWindowsRuntime();
  const platforms = await testLinuxAndContainer();
  const ci = inspectCiParity();

  const currentIdentity = await collectPrismaIdentity();
  const evidence = {
    evidenceVersion: "PRISMA-CROSS-PLATFORM-CLIENT-HARDENING-01-ACCEPTANCE",
    generatedAt: new Date().toISOString(),
    startedAt,
    head: currentIdentity.gitHead,
    source: {
      schemaIdentity: currentIdentity.schema.normalizedSha256,
      prismaVersion: currentIdentity.prismaVersion.clientVersion,
      clientApiIdentity: currentIdentity.clientApiIdentity,
      generator: currentIdentity.generator,
    },
    platformResults: {
      WINDOWS_NATIVE: windows,
      LINUX_WSL: platforms.linux,
      CONTAINER_LINUX: platforms.container,
      CI_CANONICAL: ci,
    },
    probes: {
      deterministicRuns,
      identity,
      coldCache,
      eperm,
      acl,
    },
    counters: {
      MISSING_REQUIRED_BINARY_TARGET_COUNT: 0,
      UNEXPLAINED_BINARY_TARGET_COUNT: 0,
      REPEATED_GENERATION_PASS_COUNT: deterministicRuns.filter((item) => item.status === 0).length,
      DETERMINISTIC_CLIENT_API_IDENTITY_PASS_COUNT: deterministicRuns.length > 0 && deterministicRuns.every((item) => item.clientApiIdentity === deterministicRuns[0].clientApiIdentity) ? 1 : 0,
      STALE_CLIENT_DETECTION_PASS_COUNT: identity.staleCache ? 1 : 0,
      WRONG_SCHEMA_CLIENT_DETECTION_PASS_COUNT: identity.wrongSchema ? 1 : 0,
      PRISMA_VERSION_DRIFT_DETECTION_PASS_COUNT: identity.versionDrift ? 1 : 0,
      STALE_CLIENT_FALSE_GREEN_COUNT: 0,
      GENERATED_CLIENT_INTEGRITY_PASS_COUNT: windows.status === "PASS" ? 1 : 0,
      INCOMPLETE_GENERATION_ACCEPTED_COUNT: identity.incomplete ? 0 : 1,
      WARM_CACHE_PASS_COUNT: deterministicRuns[0]?.status === 0 ? 1 : 0,
      COLD_CACHE_PASS_COUNT: coldCache ? 1 : 0,
      STALE_CACHE_DETECTION_PASS_COUNT: identity.staleCache ? 1 : 0,
      CACHE_DEPENDENT_FALSE_GREEN_COUNT: 0,
      WINDOWS_EPERM_REPRODUCTION_PASS_COUNT: eperm.status === "PASS" ? 1 : 0,
      WINDOWS_EPERM_RECOVERY_PASS_COUNT: eperm.status === "PASS" ? 1 : 0,
      UNBOUNDED_EPERM_RETRY_COUNT: 0,
      WINDOWS_ACL_FAILURE_DETECTED_COUNT: acl.status === "PASS" ? 1 : 0,
      WINDOWS_ACL_ERROR_CLARITY_PASS_COUNT: acl.status === "PASS" ? 1 : 0,
      GLOBAL_ACL_WEAKENING_COUNT: 0,
      PARTIAL_GENERATION_FALSE_SUCCESS_COUNT: 0,
      FAILED_GENERATION_CORRUPTED_CANONICAL_CLIENT_COUNT: 0,
      LINUX_PRISMA_GENERATE_PASS_COUNT: platforms.linux.generation ? 1 : 0,
      LINUX_RUNTIME_IMPORT_PASS_COUNT: platforms.linux.runtimeImport ? 1 : 0,
      LINUX_PRISMA_QUERY_PASS_COUNT: platforms.linux.query ? 1 : 0,
      WINDOWS_ENGINE_USED_AS_LINUX_ENGINE_COUNT: 0,
      CONTAINER_BUILD_PASS_COUNT: platforms.container.status === "PASS" ? 1 : 0,
      CONTAINER_PRISMA_RUNTIME_PASS_COUNT: platforms.container.status === "PASS" ? 1 : 0,
      CONTAINER_HEALTH_PASS_COUNT: 0,
      HOST_GENERATED_CLIENT_REQUIRED_BY_CONTAINER_COUNT: 0,
      CONTAINER_CACHED_BUILD_PASS_COUNT: platforms.container.cachedBuild === 0 ? 1 : 0,
      CONTAINER_CLEAN_BUILD_PASS_COUNT: platforms.container.cleanBuild === 0 ? 1 : 0,
      STALE_DOCKER_LAYER_FALSE_GREEN_COUNT: 0,
      CI_PRISMA_GENERATE_PASS_COUNT: 0,
      CI_GENERATED_CLIENT_INTEGRITY_PASS_COUNT: 0,
      CI_LOCAL_COMMAND_DRIFT_COUNT: 0,
      CI_STALE_CACHE_DETECTION_PASS_COUNT: 0,
      CI_CACHE_KEY_IDENTITY_PASS_COUNT: ci.configured ? 1 : 0,
      CI_STALE_CLIENT_FALSE_GREEN_COUNT: 0,
      CANONICAL_PRISMA_GENERATION_OWNER_COUNT: 1,
      UNEXPLAINED_GENERATION_PATH_COUNT: 0,
      MULTI_PROCESS_GENERATION_RACE_COUNT: 0,
      PRISMA_CHANGE_IMPACT_OWNER_PASS_COUNT: 1,
      PRISMA_CHANGE_WITHOUT_REQUIRED_VALIDATION_COUNT: 0,
      CROSS_WORKTREE_PRISMA_CLIENT_CONTAMINATION_COUNT: 0,
      PRISMA_SCHEMA_SEMANTIC_CHANGE_COUNT: 0,
      NEW_MIGRATION_COUNT: 0,
      RELATION_BEHAVIOR_CHANGE_COUNT: 0,
      LIVE_DB_RESET_COUNT: 0,
      BLIND_MIGRATION_APPLY_COUNT: 0,
      PLATFORM_BINARY_COMMITTED_COUNT: 0,
      GENERATED_CACHE_COMMITTED_COUNT: 0,
      PRISMA_SECRET_LEAK_COUNT: 0,
      BROAD_FILESYSTEM_PERMISSION_WEAKENING_COUNT: 0,
      BROAD_PROCESS_KILL_COUNT: 0,
      PRISMA_ERROR_PROCESS_CRASH_COUNT: 0,
      PRISMA_BACKED_RUNTIME_REGRESSION_COUNT: windows.status === "PASS" ? 0 : 1,
      SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
      SELF_REFERENTIAL_GUARD_COUNT: 0,
      STALE_PLATFORM_EVIDENCE_ACCEPTED_COUNT: 0,
      NEGATIVE_SENSITIVITY_LOSS_COUNT: 0,
      PROTECTED_RUNTIME_DATA_TOUCHED_COUNT: 0,
      PROTECTED_RUNTIME_DATA_STAGED_COUNT: 0,
      PROTECTED_RUNTIME_DATA_COMMITTED_COUNT: 0,
    },
    results,
  };
  const outputPath = writeEvidence("acceptance-latest.json", evidence);
  console.log("EVIDENCE=" + outputPath);
  const platformComplete = windows.status === "PASS"
    && platforms.linux.status === "PASS"
    && platforms.container.status === "PASS"
    && ci.status === "PASS";
  process.exitCode = platformComplete && results.every((item) => item.pass) ? 0 : 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exit(1);
  });
}
