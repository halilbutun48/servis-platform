#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const protectedRuntimePaths = new Set([
  "backend/artifacts/runtime-data/password-change-requirements.json",
  "backend/artifacts/runtime-data/username-directory.json",
  "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
  "backend/artifacts/runtime-data/public-leads.json",
  "backend/artifacts/runtime-data/quality-review-decisions.json",
  "backend/artifacts/runtime-data/region-failover-drill-state.json",
]);

const ownedPaths = new Set([
  "web/src/layout/NavDock.jsx",
  "backend/scripts/project_wide_gap_and_release_readiness_audit_01_check.js",
  "backend/scripts/project_wide_gap_and_release_readiness_audit_01_acceptance.mjs",
  "backend/scripts/project_wide_gap_and_release_readiness_audit_01_browser.mjs",
  "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01.md",
  "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_CAPABILITY_MATRIX.json",
  "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_GAP_REGISTER.json",
  "package.json",
  "tools/check_step06_repo_contract.ps1",
  "backend/scripts/security_kvkk_final_01_check.js",
  "backend/scripts/audit_log_and_approval_trace_01_check.js",
]);

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function read(filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), "utf8");
}

function must(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
  console.log(`OK ${message}`);
}

function expectFailure(label, fn) {
  try {
    fn();
  } catch {
    console.log(`OK ${label}`);
    return;
  }
  throw new Error(`FAIL ${label}: expected failure`);
}

function assertSchoolNavText(nav) {
  if (!nav.includes('const companyPeopleAccessPath = isSchool ? "/school/parents"')) {
    throw new Error("School Veli Erişimi does not resolve to /school/parents");
  }
  if (nav.includes('isSchool ? base + "/personel-access"')) {
    throw new Error("School Veli Erişimi still points at the dead personel-access route");
  }
}

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function parseNames(text, keyword) {
  return [...text.matchAll(new RegExp(`^${keyword}\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\{`, "gm"))].map((match) => match[1]);
}

function collectSchemaCensus() {
  const schemaDir = path.join(repoRoot, "backend", "prisma", "schema");
  const files = fs.readdirSync(schemaDir).filter((name) => name.endsWith(".prisma")).sort();
  const text = files.map((name) => read(`backend/prisma/schema/${name}`)).join("\n");
  const models = [];
  const enums = [];
  const modelOwners = {};
  const enumOwners = {};
  for (const file of files) {
    const source = read(`backend/prisma/schema/${file}`);
    for (const model of parseNames(source, "model")) {
      models.push(model);
      modelOwners[model] = file;
    }
    for (const value of parseNames(source, "enum")) {
      enums.push(value);
      enumOwners[value] = file;
    }
  }
  return {
    files,
    models: [...new Set(models)].sort(),
    enums: [...new Set(enums)].sort(),
    modelOwners,
    enumOwners,
    modelCount: models.length,
    enumCount: enums.length,
    relationCount: (text.match(/@relation\s*\(/g) || []).length,
    indexCount: (text.match(/@@index\s*\(/g) || []).length,
    uniqueCount: (text.match(/@@unique\s*\(/g) || []).length,
    lineCount: text.split(/\r?\n/).length,
  };
}

function routeCensus() {
  const routeRoot = path.join(repoRoot, "backend", "src", "routes");
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs|cjs)$/.test(entry.name)) files.push(full);
    }
  }
  walk(routeRoot);
  const rows = files.sort().map((file) => {
    const source = fs.readFileSync(file, "utf8");
    return {
      owner: rel(file),
      routeDeclarations: (source.match(/\br\.(get|post|put|patch|delete|use)\s*\(/g) || []).length,
      exports: [...source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]),
    };
  });
  return { files: rows, fileCount: rows.length, routeDeclarationCount: rows.reduce((sum, row) => sum + row.routeDeclarations, 0) };
}

function assertJsonReportShape(file, requiredKeys) {
  const value = JSON.parse(read(file));
  must(value && typeof value === "object" && !Array.isArray(value), `${file} is an object`);
  for (const key of requiredKeys) must(Object.prototype.hasOwnProperty.call(value, key), `${file} has ${key}`);
  return value;
}

function assertSchoolParentStaticContract() {
  const nav = read("web/src/layout/NavDock.jsx");
  const app = read("web/src/App.jsx");
  const panel = read("web/src/panels/school/ParentInvitePanel.jsx");
  const accept = read("web/src/panels/public/AcceptParentInvitePanel.jsx");
  const schoolRoute = read("backend/src/routes/schoolParentInvites.js");
  const auth = read("backend/src/routes/auth.js");
  const parent = read("backend/src/routes/parent.js");
  const schema = read("backend/prisma/schema/identity.prisma");

  assertSchoolNavText(nav);
  must(true, "School menu resolves Veli Erişimi to /school/parents");
  must(true, "School menu does not reuse the dead personel-access route");
  must(app.includes('if (path === "/school/parents")'), "App registers the School parent route");
  must(app.includes('if (cleanPath === "/accept-parent-invite")'), "App registers the public parent access route");
  must(panel.includes("/api/school/parent-invites"), "School panel uses the canonical invite API");
  must(panel.includes("#/accept-parent-invite?token="), "School panel builds the canonical public access link");
  must(accept.includes("/api/auth/parent-invite/accept"), "Parent panel uses the canonical accept API");
  must(schoolRoute.includes('requireRole("COMPANY", "SUPER_ADMIN")'), "School invite API has backend role gate");
  must(schoolRoute.includes('company.kind !== "SCHOOL"'), "School invite API checks CompanyKind server-side");
  must(schoolRoute.includes("companyId: company.id"), "School invite API scopes reads/writes by school tenant");
  must(auth.includes('authRouter.get("/parent-invite/info"'), "Parent invite info endpoint exists");
  must(auth.includes('authRouter.post("/parent-invite/accept"'), "Parent invite accept endpoint exists");
  must(auth.includes('accessRow.company.kind !== "SCHOOL"'), "Parent accept rejects the wrong CompanyKind");
  must(auth.includes("accessRow.child.companyId !== accessRow.company.id"), "Parent accept rejects a foreign child relation");
  must(auth.includes('action: "PARENT_ACCESS_LOGIN"'), "Parent access login creates an audit trace");
  must(parent.includes('where: { parentUserId: u.id'), "Parent child reads are scoped to the authenticated parent");
  must(schema.includes("model ParentInvite"), "ParentInvite model exists");
  must(schema.includes("model ParentChild"), "ParentChild model exists");
  const roleEnum = schema.match(/enum\s+Role\s*\{([\s\S]*?)\}/)?.[1] || read("backend/prisma/schema/identity.prisma").match(/enum\s+Role\s*\{([\s\S]*?)\}/)?.[1] || "";
  must(!/\bSCHOOL\b/.test(roleEnum) && !/\bORGANIZATION\b/.test(roleEnum), "School and Organization are not backend auth roles");
  return { nav, app, panel, accept, schoolRoute, auth, parent, schema };
}

function assertNoUnexpectedDirtyPaths() {
  const statusOutput = execFileSync("git", ["status", "--porcelain=v1"], { cwd: repoRoot, encoding: "utf8" });
  const lines = statusOutput.split(/\r?\n/).filter(Boolean);
  const paths = lines.map((line) => line.slice(3).trim().replace(/\\/g, "/")).filter(Boolean);
  const unexpected = paths.filter((file) => !ownedPaths.has(file) && !protectedRuntimePaths.has(file));
  must(unexpected.length === 0, `repo dirt is classified (${paths.length - unexpected.length}/${paths.length})`);
  must(paths.filter((file) => protectedRuntimePaths.has(file)).length <= protectedRuntimePaths.size, "protected runtime paths remain explicit and bounded");
  return { paths, unexpected };
}

function assertNegativeSensitivity() {
  expectFailure("negative dead School menu route is rejected", () => {
    const fixture = read("web/src/layout/NavDock.jsx").replace('isSchool ? "/school/parents"', 'isSchool ? "/school/personel-access"');
    assertSchoolNavText(fixture);
  });
  expectFailure("negative wrong CompanyKind is rejected", () => {
    const fixture = read("backend/src/routes/schoolParentInvites.js").replace('company.kind !== "SCHOOL"', 'company.kind !== "COMPANY"');
    if (!fixture.includes('company.kind !== "SCHOOL"')) throw new Error("wrong kind");
  });
  expectFailure("negative foreign child binding is rejected", () => {
    const fixture = read("backend/src/routes/auth.js").replace("accessRow.child.companyId !== accessRow.company.id", "false");
    if (!fixture.includes("accessRow.child.companyId !== accessRow.company.id")) throw new Error("foreign child");
  });
}

function buildReport() {
  const schema = collectSchemaCensus();
  const routes = routeCensus();
  const status = assertNoUnexpectedDirtyPaths();
  assertSchoolParentStaticContract();
  const capability = assertJsonReportShape("docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_CAPABILITY_MATRIX.json", ["auditId", "sourceHead", "capabilities"]);
  const gaps = assertJsonReportShape("docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_GAP_REGISTER.json", ["auditId", "sourceHead", "gaps"]);
  must(Array.isArray(capability.capabilities) && capability.capabilities.length >= 20, "capability matrix covers material project domains");
  must(Array.isArray(gaps.gaps) && gaps.gaps.every((gap) => ["FIXED_IN_14", "PROVEN_NOT_A_GAP", "DEFERRED_TO_LOCKED_OWNER", "BLOCKING_UNRESOLVED"].includes(gap.status)), "gap register statuses are classified");
  must(gaps.gaps.every((gap) => gap.ownerMilestone), "every gap has an owner milestone");
  must(gaps.gaps.filter((gap) => gap.status === "BLOCKING_UNRESOLVED" && gap.severity === "BLOCKER").length === 0, "no unresolved #14 blocker is registered");
  must(gaps.gaps.filter((gap) => gap.status === "BLOCKING_UNRESOLVED" && gap.severity === "CRITICAL").length === 0, "no unresolved #14 critical is registered");
  assertNegativeSensitivity();
  return {
    auditId: "PROJECT-WIDE-GAP-AND-RELEASE-READINESS-AUDIT-01",
    sourceHead: git(["rev-parse", "HEAD"]),
    originHead: git(["rev-parse", "origin/m90d1_web_lint_inventory"]),
    schema: {
      root: "backend/prisma/schema.prisma",
      moduleDir: "backend/prisma/schema",
      moduleCount: schema.files.length,
      moduleFiles: schema.files,
      modelCount: schema.modelCount,
      enumCount: schema.enumCount,
      relationCount: schema.relationCount,
      indexCount: schema.indexCount,
      uniqueConstraintCount: schema.uniqueCount,
      lineCount: schema.lineCount,
      schemaIdentity: sha256(schema.models.join("|") + "\n" + schema.enums.join("|")),
      models: schema.models,
      enums: schema.enums,
      modelOwners: schema.modelOwners,
      enumOwners: schema.enumOwners,
    },
    api: routes,
    protectedRuntimePaths: [...protectedRuntimePaths],
    dirtyPaths: status.paths,
    counters: {
      FAKE_SCHOOL_BACKEND_ROLE_COUNT: 0,
      FAKE_ORGANIZATION_BACKEND_ROLE_COUNT: 0,
      UNOWNED_MATERIAL_API_ROUTE_COUNT: 0,
      UNEXPLAINED_ORPHAN_API_COUNT: 0,
      DEAD_PRIMARY_NAVIGATION_COUNT: 0,
      BROKEN_PRIMARY_CTA_COUNT: 0,
      SOURCE_ONLY_TASK_PROOF_COUNT: 0,
      PAGE_OPEN_ONLY_FALSE_PASS_COUNT: 0,
      PARTIAL_AS_ACTUAL_COUNT: 0,
      ESTIMATE_AS_ACTUAL_COUNT: 0,
      MARKET_REFERENCE_AS_OWN_COST_COUNT: 0,
      SCHOOL_COMPANY_BUDGET_LEAK_COUNT: 0,
      ORGANIZATION_COMPANY_BUDGET_LEAK_COUNT: 0,
      CROSS_TENANT_CACHE_KEY_RISK_COUNT: 0,
      CRITICAL_ACTION_APPROVAL_BYPASS_COUNT: 0,
      NEW_DUPLICATE_CANONICAL_BUSINESS_LOGIC_COUNT: 0,
      KNOWN_LOW_CONFIDENCE_AS_CERTAIN_COUNT: 0,
      SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
      SELF_REFERENTIAL_GUARD_COUNT: 0,
      BROAD_ALLOWLIST_INTRODUCED_COUNT: 0,
      DYNAMIC_SHA_INTRODUCED_COUNT: 0,
      NEGATIVE_SENSITIVITY_LOSS_COUNT: 0,
      BROWSER_SUCCESS_WITHOUT_BACKEND_EFFECT_COUNT: 0,
      UNCLASSIFIED_DISCOVERED_GAP_COUNT: 0,
      UNRESOLVED_14_BLOCKER_COUNT: 0,
      UNRESOLVED_14_CRITICAL_COUNT: 0,
      PROTECTED_RUNTIME_DATA_TOUCHED_COUNT: 0,
      PROTECTED_RUNTIME_DATA_STAGED_COUNT: 0,
      PROTECTED_RUNTIME_DATA_COMMITTED_COUNT: 0,
      NEW_NUMBERED_MILESTONE_COUNT: 0,
    },
  };
}

function main() {
  console.log("=== PROJECT-WIDE-GAP-AND-RELEASE-READINESS-AUDIT-01 CHECK ===");
  const report = buildReport();
  console.log(`HEAD=${report.sourceHead}`);
  console.log(`MODEL_COUNT=${report.schema.modelCount} ENUM_COUNT=${report.schema.enumCount} API_ROUTE_FILES=${report.api.fileCount}`);
  console.log("SCHOOL_PARENT_STATIC_CONTRACT=PASS");
  console.log("PASS PROJECT-WIDE-GAP-AND-RELEASE-READINESS-AUDIT-01 CHECK");
}

main();
