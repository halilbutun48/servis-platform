import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rel = (value) => path.join(root, value);
const read = (value) => fs.readFileSync(rel(value), "utf8");
const checks = [];

const PRODUCT_FLOW_EXECUTABLE_RUNNER = [
  "backend/scripts",
  ["product", "flow", "button", "audit", "01.mjs"].join("_"),
].join("/");
const NO_BROWSER_STATIC_CHECKS = Object.freeze([
  "backend/scripts/pre_18_sol_owner_architecture_bounded_corrective_check.mjs",
  "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
  "backend/scripts/product_flow_button_audit_01_check.js",
  "backend/scripts/pre_18_topo_02_shared_browser_lifecycle_check.mjs",
  "backend/scripts/pre_18_topo_01_topo_04_provenance_foundation_check.mjs",
  "backend/scripts/pre_18_room_root_hit190_durable_closure_recovery.mjs",
  "backend/scripts/pre_18_room_root_hit190_replay_cli.mjs",
]);

function check(condition, label) {
  checks.push({ label, pass: Boolean(condition) });
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
}

function checkRoute(resolveRouteScope, me, route, expected, label) {
  check(
    typeof resolveRouteScope === "function" && resolveRouteScope(me, route) === expected,
    label,
  );
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function hasExecutableProductFlowRunnerImport(sourceText) {
  const runnerBasename = PRODUCT_FLOW_EXECUTABLE_RUNNER.split("/").at(-1).replaceAll(".", "\\.");
  return new RegExp(
    `(?:\\bimport\\s*\\(\\s*["'][^"']*${runnerBasename}["']\\s*\\)|\\bimport\\s+(?:[^;\\n]*?\\s+from\\s+)?["'][^"']*${runnerBasename}["'])`,
    "u",
  ).test(String(sourceText || ""));
}

function hasDirectProductFlowRunnerExecutionGuard(sourceText) {
  return /if\s*\(\s*process\.argv\[1\]\s*&&\s*path\.resolve\(process\.argv\[1\]\)\s*===\s*__filename\s*\)\s*\{\s*main\(\)\.catch\(/u.test(
    String(sourceText || ""),
  );
}

async function proveWrongAppIdentityIsRejected(appSource) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pre18-app-identity-"));
  try {
    const guardDirectory = path.join(fixtureRoot, "backend", "scripts", "lib");
    const appDirectory = path.join(fixtureRoot, "web", "src");
    fs.mkdirSync(guardDirectory, { recursive: true });
    fs.mkdirSync(appDirectory, { recursive: true });

    const guardSource = read("backend/scripts/lib/guardGitScope.js").replace(
      /sha256: "[A-F0-9]{64}"/,
      `sha256: "${sha256(appSource)}"`,
    );
    const fixtureGuardPath = path.join(guardDirectory, "guardGitScope.js");
    const fixtureAppPath = path.join(appDirectory, "App.jsx");
    fs.writeFileSync(fixtureGuardPath, guardSource, "utf8");
    fs.writeFileSync(fixtureAppPath, appSource, "utf8");

    const acceptedGuard = await import(`${pathToFileURL(fixtureGuardPath).href}?accepted`);
    const accepted = acceptedGuard.isAppJsxRoleTenantScopePath("web/src/App.jsx");

    fs.writeFileSync(fixtureAppPath, `${appSource}\n// deliberate unapproved identity fixture\n`, "utf8");
    const rejectedGuard = await import(`${pathToFileURL(fixtureGuardPath).href}?rejected`);
    let rejected = false;
    try {
      rejectedGuard.isAppJsxRoleTenantScopePath("web/src/App.jsx");
    } catch {
      rejected = true;
    }
    return { accepted, rejected };
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

async function main() {
  const appSource = read("web/src/App.jsx");
  const commercialSource = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  const agreementsSource = read("web/src/panels/company/AgreementsPanel.jsx");
  const parentSource = read("web/src/panels/parent/LivePanel.jsx");
  const personelSource = read("web/src/panels/personel/LivePanel.jsx");
  const authorizationSource = read("backend/src/ai/chat/authorizationGate.js");
  const packageJson = JSON.parse(read("backend/package.json"));

  const [navigation, guardScope] = await Promise.all([
    import(pathToFileURL(rel("web/src/utils/roleNavigation.js")).href),
    import(pathToFileURL(rel("backend/scripts/lib/guardGitScope.js")).href),
  ]);
  {
    const { getRoleDefaultPath, resolveRouteScope } = navigation;

    check(typeof resolveRouteScope === "function", "canonical route-scope resolver is exported by roleNavigation");
    check(typeof getRoleDefaultPath === "function", "canonical recovery home resolver is exported by roleNavigation");
    check(!appSource.includes("function scopedRouteAllowed"), "App has no independent route-prefix policy authority");
    check(!appSource.includes('cleanPath.startsWith("/superadmin")'), "App has no local SUPER_ADMIN route-policy exception");
    check(appSource.includes("resolveRouteScope(me, cleanPath)"), "App consumes canonical route-scope policy");
    check(appSource.includes("getRoleDefaultPath(me)"), "App consumes canonical recovery-home policy");

    let currentAppIdentityAccepted = false;
    try {
      currentAppIdentityAccepted = guardScope.isAppJsxRoleTenantScopePath("web/src/App.jsx");
    } catch {
      currentAppIdentityAccepted = false;
    }
    check(currentAppIdentityAccepted, "current approved App.jsx matches the canonical role-tenant identity baseline");

    const identityFixture = await proveWrongAppIdentityIsRejected(appSource);
    check(identityFixture.accepted, "identity guard accepts the exact explicitly pinned App.jsx fixture");
    check(identityFixture.rejected, "identity guard rejects a deliberate wrong App.jsx identity fixture");

    const mobilePreflight = spawnSync(
      process.execPath,
      [rel("backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js"), "--preflight"],
      { encoding: "utf8" },
    );
    check(
      mobilePreflight.status === 0 && mobilePreflight.stdout.includes("PRE-RUN STATIC IDENTITY PASS"),
      "Mobile static preflight accepts the approved current source state without treating stale browser evidence as current",
    );

    const productFlowRunnerSource = read(PRODUCT_FLOW_EXECUTABLE_RUNNER);
    const unsafeStaticImporters = NO_BROWSER_STATIC_CHECKS.filter((staticCheckPath) =>
      hasExecutableProductFlowRunnerImport(read(staticCheckPath)),
    );
    check(
      unsafeStaticImporters.length === 0,
      "no-browser static validation checks do not import the executable Product Flow runner",
    );
    check(
      hasExecutableProductFlowRunnerImport([
        "await",
        "import",
        `("./${PRODUCT_FLOW_EXECUTABLE_RUNNER.split("/").at(-1)}");`,
      ].join(" ")),
      "no-browser import guard rejects a deliberate executable Product Flow runner import fixture",
    );
    check(
      !hasExecutableProductFlowRunnerImport('const source = fs.readFileSync("backend/scripts/product_flow_button_audit_01.mjs", "utf8");'),
      "no-browser import guard permits static source inspection of the Product Flow runner",
    );
    check(
      hasDirectProductFlowRunnerExecutionGuard(productFlowRunnerSource),
      "Product Flow browser execution is guarded against import-time main invocation",
    );

    const contexts = [
      { label: "SUPER_ADMIN unrestricted client scope", me: { role: "SUPER_ADMIN" }, route: "/room/map", home: "/superadmin" },
      { label: "ROOM same-context deep link", me: { role: "ROOM" }, route: "/room/operation-health", home: "/room" },
      { label: "COMPANY same-context deep link", me: { role: "COMPANY", companyKind: "COMPANY" }, route: "/company/agreements", home: "/company" },
      { label: "SCHOOL companyKind deep link", me: { role: "COMPANY", companyKind: "SCHOOL" }, route: "/school/parents", home: "/school" },
      { label: "ORGANIZATION companyKind deep link", me: { role: "COMPANY", companyKind: "ORGANIZATION" }, route: "/organization/plans", home: "/organization" },
      { label: "DRIVER same-context deep link", me: { role: "DRIVER" }, route: "/driver/route", home: "/driver/today" },
      { label: "PERSONEL same-context deep link", me: { role: "PERSONEL" }, route: "/personel/my", home: "/personel/live" },
      { label: "PARENT same-context deep link", me: { role: "PARENT" }, route: "/parent/live", home: "/parent/live" },
    ];
    for (const context of contexts) {
      checkRoute(resolveRouteScope, context.me, context.route, "ALLOW", context.label);
      check(typeof getRoleDefaultPath === "function" && getRoleDefaultPath(context.me) === context.home, `${context.label} recovery home`);
    }

    checkRoute(resolveRouteScope, { role: "ROOM" }, "/driver/today", "DENY", "ROOM cross-role deep link is denied");
    checkRoute(resolveRouteScope, { role: "COMPANY", companyKind: "COMPANY" }, "/school/parents", "DENY", "COMPANY to SCHOOL deep link is denied");
    checkRoute(resolveRouteScope, { role: "COMPANY", companyKind: "SCHOOL" }, "/company/agreements", "DENY", "SCHOOL to COMPANY deep link is denied");
    checkRoute(resolveRouteScope, { role: "COMPANY", companyKind: "ORGANIZATION" }, "/school/parents", "DENY", "ORGANIZATION to SCHOOL deep link is denied");
    checkRoute(resolveRouteScope, { role: "PARENT" }, "/personel/live", "DENY", "PARENT cross-role deep link is denied");
    checkRoute(resolveRouteScope, { role: "ROOM" }, "/superadmin/operations", "DENY", "ROOM SUPER_ADMIN deep link is denied");
    checkRoute(resolveRouteScope, { role: "ROOM" }, "/shared/notifications", "ALLOW", "shared route remains allowed");
    checkRoute(resolveRouteScope, { role: "ROOM" }, "/not-a-real-route", "UNKNOWN", "unknown route remains explicit recovery");
    checkRoute(resolveRouteScope, { role: "ROOM" }, "/roomish", "UNKNOWN", "route namespace matching remains segment-bounded");

    check(commercialSource.includes('{ key: "prep", label: "Ödeme hazırlık önizlemesi" }'), "Commercial preparation preview is a visible tab");
    check(commercialSource.includes('viewTab === "prep" ? ('), "Commercial preparation branch is reachable without execution permission");
    check(!commercialSource.includes('viewTab === "prep" && showCommercialExecutionControls ?'), "Commercial preparation visibility is separated from execution controls");
    check(commercialSource.includes('data-commercial-preparation-readonly="true"'), "Commercial preparation announces read-only state");
    check(commercialSource.includes("Ödeme hazırlık omurgası durumu"), "Commercial preparation status remains visible");
    check(commercialSource.includes("Aktivasyon checklist"), "Commercial preparation checklist remains visible");
    check(commercialSource.includes("Mutabakat hazırlığı"), "Commercial preparation settlement summary remains visible");
    check(commercialSource.includes("showCommercialExecutionControls ? ("), "Commercial write controls remain explicitly gated");
    check(commercialSource.includes("const showCommercialExecutionControls = false;"), "Commercial payment execution and write controls remain unavailable");

    check(agreementsSource.includes("entityType: selectedAgreementCopilotContext.selectedRecordType || 'agreement'"), "agreement assistant context uses selected agreement type");
    check(agreementsSource.includes("entityId: Number(selectedAgreementCopilotContext.selectedRecordId || 0) || null"), "agreement assistant context uses selected agreement ID");
    check(!agreementsSource.includes("|| 2103"), "agreement assistant context has no fallback 2103 substitution");
    check(authorizationSource.includes('if (type === "agreement")') && authorizationSource.includes('roomId: integer(user?.roomId) || -1') && authorizationSource.includes('companyId: integer(user?.companyId) || -1'), "foreign agreement rejection remains in authoritative authorization boundary");

    check(parentSource.includes("entityType: 'personnel'"), "parent assistant context uses selected child personnel identity");
    check(parentSource.includes("entityId: Number(selected?.id || 0) || null"), "parent assistant context carries selected child ID");
    check(authorizationSource.includes('id: { in: await parentPersonelIdsForUser(user) }'), "foreign child rejection remains in authoritative authorization boundary");
    check(parentSource.includes("Son konum güncellemesi"), "parent freshness wording remains presentation-only");

    check(personelSource.includes('function etaEstimateKind(vehicle, stop)'), "personel ETA source distinguishes reported and derived values");
    check(personelSource.includes('nextEtaKind === "derived" ? "Hesaplanan tahmini süre" : "Tahmini süre"'), "personel derived ETA uses truthful label");
    check(personelSource.includes("Konum ve yaklaşık mesafeden hesaplanır; veri güncel olmayabilir."), "personel derived ETA includes stale-data wording");

    const aliases = [
      ["check:semantic-intent-adversarial", "scripts/semantic_intent_adversarial_check.js", "KEEP_ACTIVE"],
      ["check:pre18-round7-query-plan-browser", "scripts/pre_18_round_7_query_plan_browser.mjs", "REMOVE_LATER_AFTER_PRE18"],
      ["check:pre18-round9-final-execution-browser", "scripts/pre_18_round_9_final_execution_browser.mjs", "REMOVE_LATER_AFTER_PRE18"],
      ["check:pre18-round10-conversation-routing-browser", "scripts/pre_18_round_10_conversation_routing_browser.mjs", "REMOVE_LATER_AFTER_PRE18"],
      ["check:pre18-round11-deterministic-conversation-browser", "scripts/pre_18_round_11_deterministic_conversation_browser.mjs", "REMOVE_LATER_AFTER_PRE18"],
      ["check:pre18-round12-canonical-authorization-browser", "scripts/pre_18_round_12_canonical_authorization_browser.mjs", "REMOVE_LATER_AFTER_PRE18"],
    ];
    for (const [alias, target] of aliases) {
      check(packageJson.scripts?.[alias] === `node ${target}`, `${alias} keeps its approved target`);
      check(fs.existsSync(rel(`backend/${target}`)), `${alias} target exists`);
      const syntax = spawnSync(process.execPath, ["--check", rel(`backend/${target}`)], { encoding: "utf8" });
      check(syntax.status === 0, `${alias} target has valid Node syntax`);
    }

    const failures = checks.filter((item) => !item.pass);
    console.log(JSON.stringify({ total: checks.length, passed: checks.length - failures.length, failed: failures.length, failures: failures.map((item) => item.label) }, null, 2));
    if (failures.length) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
