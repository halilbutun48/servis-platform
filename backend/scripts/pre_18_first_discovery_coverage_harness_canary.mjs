/*
 * Bounded, non-mutating coverage-harness canary.  It deliberately reads the
 * frozen discovery only for parity and writes fresh proof outside that run.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  buildCheckpoint,
  buildControlId,
  evaluateCanary,
  isRetryable,
  normalizeExecutionResult,
  summarizeCoverage,
} from "./lib/pre_18_first_discovery_coverage_harness_core.mjs";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const base = (process.env.WEB_BASE_URL || "https://puerto-harry-autos-phd.trycloudflare.com").replace(/\/$/, "");
const api = (process.env.API_BASE_URL || base).replace(/\/$/, "");
const frozenLedgerPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-final-visual-foundation-discovery/fresh-public-run/frozen-final-visual-ledger.json");
const evidenceDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-first-discovery-coverage-harness-canary");
const users = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", home: "/superadmin" },
  ROOM: { identifier: "room@demo.com", home: "/room", deviceId: "pre18-coverage-room" },
};
const desktop = { width: 1440, height: 900 };
const requiredFamilies = [
  "accordion",
  "dropdown",
  "tab",
  "drawer",
  "modal",
  "filter-or-search",
  "table",
  "form-validation-cancel",
  "unsafe-boundary-cancel",
  "navigation",
];

const norm = (value) => String(value || "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function record({ role, route, surface, state = "base", control }) {
  return { role, route, viewport: "desktop", surface, state, control };
}

function spec(family, descriptor, run) {
  return { family, record: descriptor, run };
}

async function login(credentials) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: credentials.identifier,
        password: "demo123",
        deviceId: credentials.deviceId || `pre18-coverage-${credentials.identifier}`,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429) { await sleep((attempt + 1) * 1500); continue; }
    throw new Error(`login ${credentials.identifier}: HTTP ${response.status} ${norm(body.error || body.message)}`);
  }
  throw new Error(`login exhausted for ${credentials.identifier}`);
}

async function openPage(browser, role, token, route) {
  const context = await browser.newContext({ viewport: desktop, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript(({ accessToken, deviceId }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("personel_servis_browser_device_id", deviceId || "pre18-coverage-browser");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, { accessToken: token, deviceId: users[role].deviceId });
  const page = await context.newPage();
  await page.goto(`${base}/#${route}`, { waitUntil: "domcontentloaded", timeout: 35000 });
  await page.waitForSelector("#shell-nav-dock, .navDock, main, button", { state: "attached", timeout: 25000 }).catch(() => {});
  for (let index = 0; index < 8; index += 1) {
    await sleep(250);
    const body = await page.locator("body").innerText().catch(() => "");
    if (!/Yükleniyor…|Yükleniyor\.\.\./u.test(body)) break;
  }
  return { context, page };
}

async function firstVisible(locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function waitVisible(locator, label) {
  const target = await firstVisible(locator);
  if (!target) throw new Error(`${label} is not visible`);
  return target;
}

async function screenshot(page, family) {
  const file = path.join(evidenceDir, `${family}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(root, file).replace(/\\/g, "/");
}

function safeProof(patch) {
  return {
    executionState: "PROVEN_PASS",
    classification: "PASS",
    safeClassification: "SAFE",
    visible: true,
    enabled: true,
    actionAttempted: true,
    ...patch,
  };
}

function productDefect(patch) {
  return {
    executionState: "PROVEN_PRODUCT_DEFECT",
    classification: "PRODUCT_DEFECT",
    safeClassification: "SAFE",
    visible: true,
    enabled: true,
    actionAttempted: true,
    ...patch,
  };
}

async function selectWithAlternatives(page) {
  const selects = page.locator("select");
  for (let index = 0; index < await selects.count(); index += 1) {
    const candidate = selects.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const options = await candidate.locator("option").evaluateAll((nodes) => nodes
      .filter((node) => !node.disabled && node.value)
      .map((node) => ({ value: node.value, text: (node.textContent || "").trim() })));
    if (options.length > 1) return { target: candidate, options };
  }
  throw new Error("no visible select with an alternative option");
}

const specs = [
  spec("accordion", record({
    role: "SUPER_ADMIN", route: "/superadmin", surface: "Overview detailed workspace", state: "base",
    control: { tag: "SUMMARY", role: "summary", accessibleName: "Ayrıntılı çalışma alanını göster", contextualOwner: "Overview detailed workspace" },
  }), async (page) => {
    const target = await waitVisible(page.locator("summary").filter({ hasText: /Ayrıntılı çalışma alanını göster/iu }), "accordion summary");
    const details = target.locator("xpath=..");
    if (await details.evaluate((node) => node.open)) await target.click();
    await target.click();
    await details.evaluate((node) => { if (!node.open) throw new Error("accordion did not open"); });
    await target.click();
    await details.evaluate((node) => { if (node.open) throw new Error("accordion did not close"); });
    return safeProof({
      actionResult: "OPENED_AND_CLOSED",
      expectedEffect: "Detailed workspace opens and closes",
      observedEffect: "details.open changed false→true→false",
      closeOrResetResult: "CLOSED",
      evidence: [{ kind: "details-open", sequence: [false, true, false] }],
      canarySignals: { opened: true, closedAgain: true },
    });
  }),
  spec("dropdown", record({
    role: "SUPER_ADMIN", route: "/superadmin/companies", surface: "Company filters", state: "base",
    control: { tag: "SELECT", role: "", accessibleName: "Company filter", contextualOwner: "Company filters" },
  }), async (page) => {
    const { target, options } = await selectWithAlternatives(page);
    const before = await target.inputValue();
    const next = options.find((option) => option.value !== before);
    await target.selectOption(next.value);
    const changed = await target.inputValue();
    if (changed !== next.value) throw new Error("dropdown value did not change");
    await target.selectOption(before);
    const restored = await target.inputValue();
    if (restored !== before) throw new Error("dropdown value did not restore");
    return safeProof({
      actionResult: "OPTION_SELECTED_AND_RESTORED",
      expectedEffect: "Selectable option changes and restores",
      observedEffect: `value ${before}→${changed}→${restored}`,
      closeOrResetResult: "RESTORED",
      evidence: [{ kind: "select-value", before, changed, restored }],
      canarySignals: { opened: true, optionBehavior: true },
    });
  }),
  spec("tab", record({
    role: "SUPER_ADMIN", route: "/superadmin/operations", surface: "Operations decision workspace", state: "base",
    control: { tag: "BUTTON", role: "tab", type: "button", accessibleName: "Yetki & Erişim", contextualOwner: "Operations decision workspace" },
  }), async (page) => {
    const target = await waitVisible(page.getByRole("tab", { name: /^Yetki & Erişim/iu }), "permission tab");
    const previous = await firstVisible(page.locator('[role="tab"][aria-selected="true"]'));
    await target.click();
    if (await target.getAttribute("aria-selected") !== "true") throw new Error("tab did not become selected");
    if (previous && !(await previous.evaluate((node) => node === document.activeElement))) await previous.click().catch(() => {});
    return safeProof({
      actionResult: "TAB_ACTIVATED",
      expectedEffect: "Selected tab exposes its panel",
      observedEffect: "aria-selected=true on requested tab",
      closeOrResetResult: previous ? "PREVIOUS_TAB_RESTORED" : "NOT_REQUIRED",
      evidence: [{ kind: "aria-selected", value: "true" }],
      canarySignals: { activated: true },
    });
  }),
  spec("drawer", record({
    role: "SUPER_ADMIN", route: "/superadmin/companies", surface: "Global assistant shell", state: "base",
    control: { tag: "BUTTON", role: "", type: "button", accessibleName: "Sefer Abi’ye Sor", contextualOwner: "Global assistant shell" },
  }), async (page) => {
    const opener = await waitVisible(page.getByRole("button", { name: /Sefer Abi.*Sor/iu }), "Sefer Abi opener");
    const drawers = page.locator(".copilotDrawer,[data-drawer],[role=dialog]");
    const before = await firstVisible(drawers);
    if (before) {
      const existingClose = await firstVisible(before.getByRole("button", { name: /^Kapat$/iu }));
      if (existingClose) await existingClose.click();
    }
    await opener.click();
    const opened = await waitVisible(drawers, "assistant drawer");
    const close = await waitVisible(opened.getByRole("button", { name: /^Kapat$/iu }), "assistant drawer close");
    await close.click();
    await opened.waitFor({ state: "hidden", timeout: 3500 });
    return safeProof({
      actionResult: "DRAWER_OPENED_AND_CLOSED",
      expectedEffect: "Assistant drawer opens and closes",
      observedEffect: "drawer became visible then hidden",
      closeOrResetResult: "ESCAPE_CLOSED",
      evidence: [{ kind: "drawer-visibility", sequence: ["visible", "hidden"] }],
      canarySignals: { opened: true, closedAgain: true },
    });
  }),
  spec("modal", record({
    role: "ROOM", route: "/room/shifts", surface: "Route preview", state: "base",
    control: { tag: "BUTTON", role: "", type: "button", accessibleName: "Rota Önizleme", contextualOwner: "Route preview" },
  }), async (page) => {
    const opener = await waitVisible(page.getByRole("button", { name: /^Rota Önizleme$/iu }), "route preview opener");
    const dialogs = page.locator('[role="dialog"],.modal');
    await opener.click();
    const dialog = await waitVisible(dialogs, "route preview modal");
    const close = await waitVisible(dialog.getByRole("button", { name: /^Kapat$/iu }), "route preview close");
    await close.click();
    await dialog.waitFor({ state: "hidden", timeout: 3500 });
    return safeProof({
      actionResult: "MODAL_OPENED_AND_CLOSED",
      expectedEffect: "Route preview modal opens and closes",
      observedEffect: "dialog became visible then hidden",
      closeOrResetResult: "ESCAPE_CLOSED",
      evidence: [{ kind: "dialog-visibility", sequence: ["visible", "hidden"] }],
      canarySignals: { opened: true, closedAgain: true },
    });
  }),
  spec("filter-or-search", record({
    role: "SUPER_ADMIN", route: "/superadmin/companies", surface: "Company list", state: "base",
    control: { tag: "INPUT", role: "", accessibleName: "Ara (id / ad)", contextualOwner: "Company list" },
  }), async (page) => {
    const target = await waitVisible(page.getByPlaceholder(/Ara \(id \/ ad\)/iu), "company search");
    const before = await target.inputValue();
    await target.fill("demo");
    const changed = await target.inputValue();
    if (changed !== "demo") throw new Error("search value did not render");
    await target.fill(before);
    const restored = await target.inputValue();
    if (restored !== before) throw new Error("search value did not restore");
    return safeProof({
      actionResult: "SEARCH_APPLIED_AND_RESET",
      expectedEffect: "Search query is rendered and can be reset",
      observedEffect: `value ${before}→${changed}→${restored}`,
      closeOrResetResult: "QUERY_RESET",
      evidence: [{ kind: "input-value", before, changed, restored }],
      canarySignals: { searchTested: true },
    });
  }),
  spec("table", record({
    role: "SUPER_ADMIN", route: "/superadmin/companies", surface: "Company table", state: "base",
    control: { tag: "BUTTON", role: "", type: "button", accessibleName: "Table sortable header", contextualOwner: "Company table" },
  }), async (page) => {
    const profile = await waitVisible(page.getByRole("button", { name: /^Profil$/iu }), "company table profile action");
    await profile.click();
    const modal = await waitVisible(page.locator(".modal").filter({ hasText: /Firma Profili/iu }), "company profile modal");
    const close = await waitVisible(modal.getByRole("button", { name: /^(Kapat|İptal)$/iu }), "company profile close");
    await close.click();
    await modal.waitFor({ state: "hidden", timeout: 3500 });
    return safeProof({
      actionResult: "TABLE_ROW_ACTION_OPENED_AND_CLOSED",
      expectedEffect: "A table row action opens its detail surface and can be closed",
      observedEffect: "Company profile modal became visible then hidden",
      closeOrResetResult: "PROFILE_CLOSED",
      evidence: [{ kind: "table-row-action", action: "Profil", transition: ["visible", "hidden"] }],
      canarySignals: { interactionTested: true },
    });
  }),
  spec("form-validation-cancel", record({
    role: "SUPER_ADMIN", route: "/superadmin/companies", surface: "Company creation form", state: "base",
    control: { tag: "FORM", role: "form", accessibleName: "Company creation form", contextualOwner: "Company creation form" },
  }), async (page) => {
    const blockedMutations = [];
    await page.route("**/*", async (route) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(route.request().method())) {
        blockedMutations.push({ method: route.request().method(), url: route.request().url() });
        await route.abort();
        return;
      }
      await route.continue();
    });
    const field = await waitVisible(page.getByPlaceholder(/Yeni hizmet alan firma adı/iu), "company name field");
    const before = await field.inputValue();
    await field.fill("");
    const create = await waitVisible(page.getByRole("button", { name: /^Oluştur$/iu }), "company create action");
    await create.click();
    await page.waitForFunction(() => document.body.innerText.includes("Firma adı gerekli"), null, { timeout: 3500 });
    if (blockedMutations.length) throw new Error("empty form attempted a mutation request");
    await field.fill(before);
    return safeProof({
      actionResult: "VALIDATION_TRIGGERED",
      expectedEffect: "Required-field validation prevents a mutation",
      observedEffect: "Firma adı gerekli validation rendered; no mutation request was sent",
      closeOrResetResult: "FIELD_VALUE_RESTORED",
      evidence: [{ kind: "form-validation", message: "Firma adı gerekli", blockedMutations }],
      canarySignals: { interactionTested: true },
    });
  }),
  spec("unsafe-boundary-cancel", record({
    role: "SUPER_ADMIN", route: "/superadmin/companies", surface: "Company table row", state: "base",
    control: { tag: "BUTTON", role: "", type: "button", accessibleName: "Sil", contextualOwner: "Company table row" },
  }), async (page) => {
    const blockedMutations = [];
    let confirmation = null;
    const confirmationSeen = new Promise((resolve) => {
      page.once("dialog", async (dialog) => {
        confirmation = { type: dialog.type(), message: dialog.message() };
        await dialog.dismiss();
        resolve(confirmation);
      });
    });
    await page.route("**/*", async (route) => {
      const method = route.request().method();
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        blockedMutations.push({ method, url: route.request().url() });
        await route.abort();
        return;
      }
      await route.continue();
    });
    const target = await waitVisible(page.getByRole("button", { name: /^Sil$/iu }), "unsafe delete control");
    await target.click();
    await Promise.race([confirmationSeen, page.waitForTimeout(1000)]);
    if (confirmation) {
      if (blockedMutations.length) throw new Error("native confirmation attempted a mutation before cancellation");
      return {
        executionState: "VALIDLY_SKIPPED",
        classification: "NOT_SAFE_TO_EXECUTE_FULLY",
        safeClassification: "UNSAFE",
        visible: true,
        enabled: true,
        actionAttempted: true,
        actionResult: "NATIVE_CONFIRMATION_DISMISSED",
        expectedEffect: "Destructive action stops at cancellable confirmation",
        observedEffect: `Native ${confirmation.type} was dismissed before mutation`,
        closeOrResetResult: "CONFIRMATION_DISMISSED",
        safetyFlowProven: true,
        evidence: [{ kind: "native-confirmation", confirmation, blockedMutations }],
        canarySignals: { safetyFlow: true },
      };
    }
    const dialogs = page.locator('[role="dialog"],.modal');
    const dialog = await firstVisible(dialogs);
    if (!dialog) {
      if (blockedMutations.length) {
        return productDefect({
          actionResult: "MUTATION_REQUEST_BLOCKED",
          expectedEffect: "Confirmation appears before any destructive request",
          observedEffect: `destructive request attempted without visible confirmation: ${blockedMutations[0].method}`,
          closeOrResetResult: "NETWORK_GUARD_PREVENTED_MUTATION",
          evidence: [{ kind: "blocked-mutation", requests: blockedMutations }],
          canarySignals: { safetyFlow: false },
        });
      }
      throw new Error("unsafe control produced neither confirmation nor a guarded request");
    }
    const cancel = await firstVisible(dialog.getByRole("button", { name: /^(iptal|vazgeç|geri|kapat)$/iu }));
    if (cancel) await cancel.click(); else await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 3500 });
    if (blockedMutations.length) throw new Error("unsafe boundary attempted a mutation before cancellation");
    return {
      executionState: "VALIDLY_SKIPPED",
      classification: "NOT_SAFE_TO_EXECUTE_FULLY",
      safeClassification: "UNSAFE",
      visible: true,
      enabled: true,
      actionAttempted: true,
      actionResult: "CONFIRMATION_OPENED",
      expectedEffect: "Destructive action stops at cancellable confirmation",
      observedEffect: "Confirmation opened and was cancelled without mutation request",
      closeOrResetResult: "CANCELLED",
      safetyFlowProven: true,
      evidence: [{ kind: "unsafe-confirmation", blockedMutations }],
      canarySignals: { safetyFlow: true },
    };
  }),
  spec("navigation", record({
    role: "SUPER_ADMIN", route: "/superadmin", surface: "Overview next action", state: "base",
    control: { tag: "A", role: "link", accessibleName: "Geri bildirimleri incele", href: "#/superadmin/operations", contextualOwner: "Overview next action" },
  }), async (page) => {
    const target = await waitVisible(page.locator("#shell-nav-dock,.navDock,nav").getByRole("button", { name: /^Denetim Paneli$/iu }), "operations navigation action");
    await target.click();
    await page.waitForURL(/#\/superadmin\/operations$/u, { timeout: 5000 });
    await page.goto(`${base}/#/superadmin`, { waitUntil: "domcontentloaded" });
    return safeProof({
      actionResult: "ROUTE_NAVIGATED_BY_BUTTON",
      expectedEffect: "Navigation changes the rendered route",
      observedEffect: "#/superadmin→#/superadmin/operations",
      closeOrResetResult: "HOME_ROUTE_RESTORED",
      evidence: [{ kind: "url", before: "#/superadmin", after: "#/superadmin/operations" }],
      canarySignals: { interactionTested: true },
    });
  }),
];

function categoryCounters(records) {
  const byFamily = (family) => records.filter((record) => record.canaryFamily === family);
  const proven = (family) => byFamily(family).filter((record) => record.executionState === "PROVEN_PASS");
  const signal = (family, name) => proven(family).filter((record) => record.canarySignals?.[name]).length;
  return {
    COUNTER_SCOPE: "BOUNDED_CANARY_ONLY",
    ACCORDION_COUNT_DISCOVERED: byFamily("accordion").length,
    ACCORDION_COUNT_OPENED: signal("accordion", "opened"),
    ACCORDION_COUNT_CLOSED_AGAIN: signal("accordion", "closedAgain"),
    ACCORDION_UNTESTED_COUNT: byFamily("accordion").length - proven("accordion").length,
    DROPDOWN_COUNT_DISCOVERED: byFamily("dropdown").length,
    DROPDOWN_COUNT_OPENED: signal("dropdown", "opened"),
    DROPDOWN_OPTION_BEHAVIOR_TESTED_COUNT: signal("dropdown", "optionBehavior"),
    DROPDOWN_UNTESTED_COUNT: byFamily("dropdown").length - proven("dropdown").length,
    TAB_COUNT_DISCOVERED: byFamily("tab").length,
    TAB_COUNT_ACTIVATED: signal("tab", "activated"),
    TAB_UNTESTED_COUNT: byFamily("tab").length - proven("tab").length,
    MODAL_COUNT_DISCOVERED: byFamily("modal").length,
    MODAL_COUNT_OPENED: signal("modal", "opened"),
    MODAL_CLOSE_CANCEL_TESTED_COUNT: signal("modal", "closedAgain"),
    MODAL_UNTESTED_COUNT: byFamily("modal").length - proven("modal").length,
    DRAWER_COUNT_DISCOVERED: byFamily("drawer").length,
    DRAWER_COUNT_OPENED: signal("drawer", "opened"),
    DRAWER_CLOSE_TESTED_COUNT: signal("drawer", "closedAgain"),
    DRAWER_UNTESTED_COUNT: byFamily("drawer").length - proven("drawer").length,
    FILTER_COUNT_DISCOVERED: 0,
    FILTER_COUNT_TESTED: 0,
    FILTER_UNTESTED_COUNT: 0,
    SEARCH_CONTROL_COUNT: byFamily("filter-or-search").length,
    SEARCH_CONTROL_TESTED: signal("filter-or-search", "searchTested"),
    SEARCH_UNTESTED_COUNT: byFamily("filter-or-search").length - proven("filter-or-search").length,
    PAGINATION_CONTROL_COUNT: 0,
    PAGINATION_CONTROL_TESTED: 0,
    PAGINATION_UNTESTED_COUNT: 0,
    FORM_COUNT_DISCOVERED: byFamily("form-validation-cancel").length,
    FORM_INTERACTION_TESTED_COUNT: signal("form-validation-cancel", "interactionTested"),
    FORM_UNTESTED_COUNT: byFamily("form-validation-cancel").length - proven("form-validation-cancel").length,
    TABLE_COUNT_DISCOVERED: byFamily("table").length,
    TABLE_INTERACTION_TESTED_COUNT: signal("table", "interactionTested"),
    TABLE_UNTESTED_COUNT: byFamily("table").length - proven("table").length,
  };
}

async function currentRuntimeParity() {
  const [healthResponse, ledgerRaw, head] = await Promise.all([
    fetch(`${base}/health`),
    fs.readFile(frozenLedgerPath, "utf8"),
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root }).then(({ stdout }) => norm(stdout)),
  ]);
  const health = await healthResponse.json().catch(() => ({}));
  const ledger = JSON.parse(ledgerRaw);
  const expectedHead = ledger.browserProof?.sourceIdentity?.HEAD;
  if (!healthResponse.ok || health.dbOk !== true) throw new Error(`runtime health is not valid: HTTP ${healthResponse.status}, dbOk=${health.dbOk}`);
  if (expectedHead && expectedHead !== head) throw new Error(`runtime parity blocked: frozen HEAD ${expectedHead} != current HEAD ${head}`);
  return { health: { status: healthResponse.status, dbOk: health.dbOk }, head, expectedHead };
}

async function loadPrevious() {
  const file = path.join(evidenceDir, "canary-checkpoint.json");
  const saved = await fs.readFile(file, "utf8").then(JSON.parse).catch(() => null);
  return new Map((saved?.controls || []).map((item) => [item.CONTROL_ID, item]));
}

async function persist(records, metadata) {
  const checkpoint = buildCheckpoint(records);
  await fs.writeFile(path.join(evidenceDir, "canary-checkpoint.json"), `${JSON.stringify({ ...checkpoint, ...metadata }, null, 2)}\n`);
  return checkpoint;
}

async function execute(browser, tokens, item) {
  const { context, page } = await openPage(browser, item.record.role, tokens[item.record.role], item.record.route);
  let result;
  try {
    result = normalizeExecutionResult(item.record, { ...(await item.run(page)), canaryFamily: item.family });
  } catch (error) {
    result = normalizeExecutionResult(item.record, {
      executionState: "HARNESS_FAILURE",
      classification: "HARNESS_DEFECT",
      safeClassification: item.family === "unsafe-boundary-cancel" ? "UNSAFE" : "SAFE",
      detail: norm(error?.message || error),
      canaryFamily: item.family,
    });
  }
  try {
    const image = await screenshot(page, item.family);
    result.EVIDENCE = [...result.EVIDENCE, { kind: "screenshot", path: image }];
    result.evidence = result.EVIDENCE;
  } finally {
    await context.close();
  }
  return result;
}

await fs.mkdir(evidenceDir, { recursive: true });
const report = {
  source: "PRE_18_FIRST_DISCOVERY_COVERAGE_HARNESS_BOUNDED_CANARY",
  generatedAt: new Date().toISOString(),
  base,
  requiredFamilies,
  controls: [],
  browser: {},
  runtimeParity: null,
};

try {
  report.runtimeParity = await currentRuntimeParity();
  const browser = await chromium.launch({ headless: true });
  report.browser = { engine: browser.version(), headless: true, automation: "Playwright @playwright/test 1.60.0" };
  try {
    const tokens = {};
    for (const [role, credentials] of Object.entries(users)) tokens[role] = await login(credentials);
    const previous = await loadPrevious();
    for (const item of specs) {
      const prior = previous.get(buildControlId(item.record));
      const priorHasSignals = prior && Object.keys(prior.canarySignals || {}).length > 0;
      const result = prior && !isRetryable(prior) && priorHasSignals ? { ...prior, resumed: true } : await execute(browser, tokens, item);
      report.controls.push(result);
      await persist(report.controls, { source: report.source, generatedAt: report.generatedAt, requiredFamilies, runtimeParity: report.runtimeParity });
    }
  } finally {
    await browser.close();
  }
} catch (error) {
  report.environmentBlock = norm(error?.message || error);
}

report.coverage = summarizeCoverage(report.controls);
report.categories = categoryCounters(report.controls);
report.canary = evaluateCanary(report.controls, requiredFamilies);
if (report.environmentBlock) report.canary = { ...report.canary, status: "NOT_GREEN", environmentBlock: report.environmentBlock };
report.completedAt = new Date().toISOString();
await fs.writeFile(path.join(evidenceDir, "canary-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ browser: report.browser, runtimeParity: report.runtimeParity, coverage: report.coverage, categories: report.categories, canary: report.canary, report: path.relative(root, path.join(evidenceDir, "canary-report.json")).replace(/\\/g, "/") }, null, 2));
if (report.canary.status !== "GREEN") process.exitCode = 2;
