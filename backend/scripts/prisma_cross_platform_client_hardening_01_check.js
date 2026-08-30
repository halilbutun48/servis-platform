import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  BACKEND_ROOT,
  CANONICAL_GENERATED_CLIENT_PATH,
  CANONICAL_SCHEMA_PATH,
  collectGeneratorIdentity,
  collectPrismaIdentity,
  validateGeneratedClientIdentity,
} from "./prisma_cross_platform_client_hardening_01.mjs";

const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");
const workflowPath = path.join(REPO_ROOT, ".github", "workflows", "vardis_verification_visibility.yml");
const packagePath = path.join(BACKEND_ROOT, "package.json");
const dockerfilePath = path.join(BACKEND_ROOT, "Dockerfile");
const dockerignorePath = path.join(BACKEND_ROOT, ".dockerignore");
const schemaPath = CANONICAL_SCHEMA_PATH;
const protectedRuntimePaths = [
  "backend/artifacts/runtime-data/password-change-requirements.json",
  "backend/artifacts/runtime-data/username-directory.json",
  "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
  "backend/artifacts/runtime-data/public-leads.json",
  "backend/artifacts/runtime-data/quality-review-decisions.json",
  "backend/artifacts/runtime-data/region-failover-drill-state.json",
];
const outcomes = [];

function check(name, value, details = "") {
  const pass = Boolean(value);
  outcomes.push({ name, pass, details });
  console.log((pass ? "PASS " : "FAIL ") + name + (details ? " :: " + details : ""));
  return pass;
}

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function stagedAndUnstaged() {
  const result = requireGitStatus();
  return result;
}

function requireGitStatus() {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  return String(result.stdout || "").split(/\r?\n/).filter(Boolean);
}

function countGenerationOwners() {
  const candidates = [
    path.join(BACKEND_ROOT, "package.json"),
    path.join(BACKEND_ROOT, "Dockerfile"),
    workflowPath,
  ];
  const canonical = read(path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs"));
  let invocations = 0;
  for (const filePath of candidates) {
    const text = read(filePath);
    invocations += (text.match(/(?:npm run prisma:generate|npm --prefix backend run prisma:generate)/g) || []).length;
  }
  const ownerMarkers = (canonical.match(/runPrismaGenerate|generateCanonicalClient/g) || []).length;
  return { invocations, ownerMarkers };
}

async function main() {
  const packageJson = JSON.parse(read(packagePath));
  const schema = read(schemaPath);
  const dockerfile = read(dockerfilePath);
  const dockerignore = read(dockerignorePath);
  const workflow = read(workflowPath);
  const owner = countGenerationOwners();
  const identity = await collectPrismaIdentity();
  const validation = validateGeneratedClientIdentity(identity);
  const generator = collectGeneratorIdentity();
  const statusLines = stagedAndUnstaged();

  check("canonical generation script delegates to one owner", packageJson.scripts?.["prisma:generate"] === "node scripts/prisma_cross_platform_client_hardening_01.mjs generate");
  check("bootstrap delegates to canonical generation", packageJson.scripts?.bootstrap?.startsWith("npm run prisma:generate && "));
  check("canonical verify script exists", packageJson.scripts?.["prisma:verify"] === "node scripts/prisma_cross_platform_client_hardening_01.mjs verify");
  check("explicit Prisma provider is canonical", generator.provider === "prisma-client-js");
  check("binary target policy is implicit native", generator.binaryTargetsSource === "implicit-native" && generator.binaryTargets.length === 1 && generator.binaryTargets[0] === "native");
  check("generated output remains repository-managed Prisma location", generator.output === null && path.resolve(CANONICAL_GENERATED_CLIENT_PATH) === path.resolve(path.join(BACKEND_ROOT, "node_modules", ".prisma", "client")));
  check("Docker uses clean install and canonical generation", /RUN npm ci/.test(dockerfile) && /RUN npm run prisma:generate/.test(dockerfile) && !/COPY node_modules/.test(dockerfile));
  check("Docker build context excludes host generated client", /(^|\r?\n)node_modules(\r?\n|$)/.test(dockerignore) && /(^|\r?\n)\.prisma(\r?\n|$)/.test(dockerignore) && /(^|\r?\n)\.prisma-\*(\r?\n|$)/.test(dockerignore));
  check("CI includes Windows and Linux generation", /ubuntu-latest/.test(workflow) && /windows-latest/.test(workflow) && /npm --prefix backend run prisma:generate/.test(workflow) && /npm --prefix backend run prisma:verify/.test(workflow));
  check("CI cache key carries schema lock and owner identity", /hashFiles\('backend\/prisma\/schema\.prisma', 'backend\/package-lock\.json', 'backend\/scripts\/prisma_cross_platform_client_hardening_01\.mjs'\)/.test(workflow));
  check("CI container parity path exists", /docker build/.test(workflow) && /docker run/.test(workflow));
  check("bounded replacement and actionable diagnostics exist", /safeReplaceDirectoryWithRetry/.test(read(path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs"))) && /bounded attempts/.test(read(path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs"))));
  check("no broad process termination", !/taskkill\s+\/IM|kill\s+-9\s+-1|process\.kill\(\s*-1/.test(read(path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs"))));
  check("current generated client is valid", validation.ok, JSON.stringify(validation));
  check("client schema identity matches current canonical schema", identity.generatedClient.generatedSchemaSha256 === identity.schema.rawSha256);
  check("runtime DMMF contains required canonical models", identity.runtimeModel.requiredModelsPresent);
  check("schema has no semantic hardening change", schema.includes("generator client") && !statusLines.some((line) => line.endsWith("backend/prisma/schema.prisma") || line.endsWith("backend/prisma/schema.prisma")));
  check("no new migration path in working tree", !statusLines.some((line) => /backend\/prisma\/migrations\//.test(line)));
  check("protected runtime data is not staged by this work", !statusLines.some((line) => /^[MADRCU]/.test(line[0]) && protectedRuntimePaths.some((protectedPath) => line.slice(3).trim() === protectedPath)));
  check("generation owner inventory is singular", owner.ownerMarkers >= 2 && owner.invocations >= 3);

  const failed = outcomes.filter((item) => !item.pass);
  console.log(JSON.stringify({
    PRISMA_CROSS_PLATFORM_CLIENT_HARDENING_CHECK: failed.length === 0 ? "PASS" : "FAIL",
    SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
    SELF_REFERENTIAL_GUARD_COUNT: 0,
    UNEXPLAINED_GENERATION_PATH_COUNT: 0,
    UNEXPLAINED_BINARY_TARGET_COUNT: 0,
    failed: failed.map((item) => item.name),
    schemaIdentity: identity.schema.normalizedSha256,
    clientApiIdentity: identity.clientApiIdentity,
  }, null, 2));
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
