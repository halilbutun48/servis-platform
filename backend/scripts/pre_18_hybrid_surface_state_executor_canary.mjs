/*
 * Sol approach-C canary.  This deliberately executes action contracts in the
 * same freshly-rendered surface state where they are enumerated.  It does not
 * use persisted control descriptors as a later replay locator.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  buildActionCheckpoint,
  captureActionContract,
  createFailureLedgerEntry,
  createRunArtifactManifest,
  createRunId,
  deduplicateActionContracts,
  isTerminalActionEvidence,
  prepareActionResume,
} from "./lib/pre_18_hybrid_surface_state_executor.mjs";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const base = (process.env.WEB_BASE_URL || "https://puerto-harry-autos-phd.trycloudflare.com").replace(/\/$/u, "");
const api = (process.env.API_BASE_URL || base).replace(/\/$/u, "");
const frozenLedgerPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-final-visual-foundation-discovery/fresh-public-run/frozen-final-visual-ledger.json");
const artifactRoot = path.join(root, "backend/artifacts/browser-smoke/pre-18-hybrid-surface-state-executor");
const users = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", deviceId: "pre18-hybrid-superadmin" },
  ROOM: { identifier: "room@demo.com", deviceId: "pre18-hybrid-room" },
  COMPANY: { identifier: "company@demo.com", deviceId: "pre18-hybrid-company" },
  SCHOOL: { identifier: "school@demo.com", deviceId: "pre18-hybrid-school" },
  PERSONEL: { identifier: "personel@demo.com", deviceId: "pre18-hybrid-personel" },
};
const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const norm = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function viewportName(viewport) {
  return viewport.width <= 500 ? "mobile" : viewport.width <= 1100 ? "tablet" : "desktop";
}

async function login(credentials) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: credentials.identifier, password: "demo123", deviceId: credentials.deviceId }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429) { await sleep((attempt + 1) * 1500); continue; }
    throw new Error(`login ${credentials.identifier}: HTTP ${response.status} ${norm(body.error || body.message)}`);
  }
  throw new Error(`login exhausted for ${credentials.identifier}`);
}

async function openSurface(browser, tokens, role, route, viewport) {
  const context = await browser.newContext({ viewport, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript(({ token, deviceId }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("personel_servis_browser_device_id", deviceId);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, { token: tokens[role], deviceId: users[role].deviceId });
  const page = await context.newPage();
  await page.goto(`${base}/#${route}`, { waitUntil: "domcontentloaded", timeout: 35000 });
  await page.waitForSelector("#shell-nav-dock, .navDock, main, button", { state: "attached", timeout: 25000 }).catch(() => {});
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(200);
    const body = await page.locator("body").innerText().catch(() => "");
    if (!/Yükleniyor…|Yükleniyor\.\.\./u.test(body)) break;
  }
  return { context, page };
}

async function withSurface(browser, tokens, role, route, viewport, action) {
  const { context, page } = await openSurface(browser, tokens, role, route, viewport);
  try {
    return await action(page);
  } finally {
    await context.close();
  }
}

async function firstVisible(locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function requireVisible(locator, label) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const target = await firstVisible(locator);
    if (target) return target;
    await sleep(250);
  }
  throw new Error(`${label} is not visible`);
}

async function inspectControl(locator) {
  return locator.evaluate((node) => {
    const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
    const visibleText = (element) => compact(element?.innerText || element?.textContent || "");
    const inferRole = (element) => {
      const explicit = compact(element.getAttribute("role"));
      if (explicit) return explicit;
      const tag = element.tagName.toLowerCase();
      const type = compact(element.getAttribute("type")).toLowerCase();
      if (tag === "a") return "link";
      if (tag === "button" || tag === "summary") return "button";
      if (tag === "select") return "combobox";
      if (tag === "textarea" || tag === "input") return type === "checkbox" || type === "radio" ? type : "textbox";
      return "";
    };
    const labelledBy = () => compact(compact(node.getAttribute("aria-labelledby")).split(" ")
      .filter(Boolean).map((id) => visibleText(document.getElementById(id))).filter(Boolean).join(" "));
    const associatedLabel = () => {
      if (node.labels?.length) return compact([...node.labels].map(visibleText).join(" "));
      const id = node.getAttribute("id");
      return id ? visibleText(document.querySelector(`label[for='${CSS.escape(id)}']`)) : "";
    };
    const role = inferRole(node);
    const text = visibleText(node);
    const accessibleName = compact(node.getAttribute("aria-label") || labelledBy() || associatedLabel() || node.getAttribute("title") || text || node.getAttribute("placeholder"));
    const candidateSelector = "button,a,input,select,textarea,[role],summary";
    let owner = node.closest("[role='dialog'],.modal,[data-drawer],tr,[role='row'],.tableRow,.dataRow,form,section,article,nav,main");
    const nearestUniqueOwners = [];
    let cursor = node.parentElement;
    while (cursor && nearestUniqueOwners.length < 8) {
      const same = [...cursor.querySelectorAll(candidateSelector)].filter((candidate) => {
        const candidateName = compact(candidate.getAttribute("aria-label") || candidate.getAttribute("title") || visibleText(candidate) || candidate.getAttribute("placeholder"));
        return inferRole(candidate) === role && candidateName === accessibleName;
      });
      if (same.length === 1) nearestUniqueOwners.push(cursor);
      cursor = cursor.parentElement;
    }
    // Prefer the nearest unique owner that contains meaningful business
    // context, not merely the one-button action cell.  A bounded action cell
    // remains the fallback for controls that legitimately have no richer
    // semantic owner.
    const uniqueOwner = nearestUniqueOwners.find((candidate) => visibleText(candidate).length > Math.max(accessibleName.length * 2, 40)) || nearestUniqueOwners[0];
    if (uniqueOwner && (!owner || owner.matches("section,article,nav,main"))) owner = uniqueOwner;
    const heading = owner?.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']");
    const ownerType = owner?.matches("[role='dialog'],.modal") ? "modal"
      : owner?.matches("[data-drawer]") ? "drawer"
        : owner?.matches("tr,[role='row'],.tableRow,.dataRow") ? "table-row"
          : owner?.matches("form") ? "form"
            : owner?.matches("nav") ? "landmark"
              : owner === uniqueOwner ? "semantic-owner" : owner ? "section" : "surface";
    const ownerLabel = compact(owner?.getAttribute("aria-label") || visibleText(heading) || visibleText(owner).slice(0, 260) || "root");
    const siblings = owner ? [...owner.querySelectorAll(candidateSelector)] : [node];
    const equalInOwner = siblings.filter((candidate) => inferRole(candidate) === role
      && compact(candidate.getAttribute("aria-label") || candidate.getAttribute("title") || visibleText(candidate) || candidate.getAttribute("placeholder")) === accessibleName);
    return {
      action: {
        role: role || "button",
        name: accessibleName || null,
        userMeaning: accessibleName || text || null,
        expectedEffectClass: "RENDERED_TRANSITION",
        safetyClass: "SAFE",
      },
      owner: { type: ownerType, label: ownerLabel, boundedOrdinal: equalInOwner.length > 1 ? equalInOwner.indexOf(node) : null },
      raw: { accessibleName, visibleText: text, controlType: compact(node.getAttribute("type") || node.tagName.toLowerCase()) },
    };
  });
}

function stateSignature(state = {}) {
  return {
    activeTab: state.activeTab || null,
    disclosure: state.disclosure || null,
    detailsOpen: typeof state.detailsOpen === "boolean" ? state.detailsOpen : null,
    modalTitle: state.modalTitle || null,
    drawerTitle: state.drawerTitle || null,
    filterSignature: state.filterSignature || null,
    selectedBusinessContext: state.selectedBusinessContext || null,
  };
}

async function contractFrom(locator, meta) {
  const observed = await inspectControl(locator);
  return captureActionContract({
    role: meta.role,
    route: meta.route,
    viewport: meta.viewport,
    surface: meta.surface,
    materialState: stateSignature(meta.state),
    action: { ...observed.action, ...meta.action },
    owner: meta.owner || observed.owner,
  });
}

function pass(contract, patch = {}) {
  return {
    ...contract,
    executionState: "PROVEN_PASS",
    EXECUTION_STATE: "PROVEN_PASS",
    classification: "PASS",
    CLASSIFICATION: "PASS",
    visible: true,
    enabled: true,
    actionAttempted: true,
    attemptCount: 1,
    resetResult: "FRESH_SURFACE_REOPENED",
    unsafeMutationExecuted: false,
    ...patch,
  };
}

function skip(contract, patch = {}) {
  return {
    ...contract,
    executionState: "VALIDLY_SKIPPED",
    EXECUTION_STATE: "VALIDLY_SKIPPED",
    classification: "DATA_DEPENDENCY",
    CLASSIFICATION: "DATA_DEPENDENCY",
    visible: true,
    enabled: true,
    actionAttempted: false,
    attemptCount: 0,
    resetResult: "FRESH_SURFACE_REOPENED",
    unsafeMutationExecuted: false,
    ...patch,
  };
}

function unsafe(contract, patch = {}) {
  return {
    ...contract,
    executionState: "NOT_SAFE_TO_EXECUTE_FULLY",
    EXECUTION_STATE: "NOT_SAFE_TO_EXECUTE_FULLY",
    classification: "NOT_SAFE_TO_EXECUTE_FULLY",
    CLASSIFICATION: "NOT_SAFE_TO_EXECUTE_FULLY",
    visible: true,
    enabled: true,
    actionAttempted: true,
    attemptCount: 1,
    safetyFlowProven: true,
    unsafeMutationExecuted: false,
    resetResult: "CONFIRMATION_DISMISSED_AND_FRESH_SURFACE_REOPENED",
    ...patch,
  };
}

async function closeOverlay(page, overlay) {
  const close = await firstVisible(overlay.getByRole("button", { name: /^(Kapat|İptal|Vazgeç)$/iu }));
  if (close) await close.click(); else await page.keyboard.press("Escape");
  await overlay.waitFor({ state: "hidden", timeout: 3500 });
}

async function currentRuntimeParity() {
  const [healthResponse, ledgerRaw, headResult] = await Promise.all([
    fetch(`${base}/health`),
    fs.readFile(frozenLedgerPath, "utf8"),
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root }),
  ]);
  const health = await healthResponse.json().catch(() => ({}));
  const ledger = JSON.parse(ledgerRaw);
  const head = norm(headResult.stdout);
  const expectedHead = ledger.browserProof?.sourceIdentity?.HEAD;
  if (!healthResponse.ok || health.dbOk !== true) throw new Error(`runtime health invalid: HTTP ${healthResponse.status}, dbOk=${health.dbOk}`);
  if (expectedHead && expectedHead !== head) throw new Error(`runtime parity blocked: frozen HEAD ${expectedHead} != current HEAD ${head}`);
  return { health: { status: healthResponse.status, dbOk: health.dbOk }, head, expectedHead };
}

const runId = createRunId("pre18-hybrid-canary");
const manifest = createRunArtifactManifest({ root: artifactRoot.replace(/\\/gu, "/"), runId, runKind: "BOUNDED_CANARY" });
const runDir = manifest.runDirectory;
const evidenceDir = manifest.evidenceDirectory;
const report = {
  source: "PRE_18_HYBRID_SURFACE_STATE_EXECUTOR_BOUNDED_CANARY",
  generatedAt: new Date().toISOString(),
  RUN_ID: runId,
  PUBLIC_TUNNEL_ORIGIN: base,
  runtimeParity: null,
  browser: null,
  cases: [],
  historicalArtifactLimitation: "The historical full durable-inventory bytes were overwritten by a later bounded smoke. This run does not recreate or modify historical evidence.",
  metrics: { wrongRoute: 0, wrongOwner: 0, wrongViewport: 0, wrongState: 0, falsePass: 0, resetFailure: 0, artifactOverwrite: 0 },
  currentSemanticStateEvidence: [],
};
const records = [];
const failures = [];

async function evidence(page, name) {
  const target = path.join(evidenceDir, `${String(records.length + 1).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  return path.relative(root, target).replace(/\\/gu, "/");
}

function append(record) {
  records.push(record);
  if (!isTerminalActionEvidence(record)) {
    report.metrics.falsePass += record.executionState === "PROVEN_PASS" ? 1 : 0;
    failures.push(createFailureLedgerEntry({
      runId,
      contract: record,
      failureStage: "TERMINAL_EVIDENCE",
      failureReason: "terminal action record lacks required rendered or safety evidence",
      evidence: record.evidence || [],
      resetResult: record.resetResult,
    }));
  }
}

async function captureLocationState(browser, tokens, role, route, surfaceTitle) {
  await withSurface(browser, tokens, role, route, desktop, async (page) => {
    const meta = { role, route, viewport: "desktop", surface: { id: `${role.toLowerCase()}-location`, title: surfaceTitle }, state: { selectedBusinessContext: "location-permission-unrequested" }, action: { expectedEffectClass: "LOCATION_PERMISSION_BOUNDARY", safetyClass: "LOCATION_PRIVACY_BOUNDARY" } };
    const control = await requireVisible(page.getByRole("button", { name: /Konumumu Al/iu }), `${role} current location action`);
    const contract = await contractFrom(control, meta);
    const screenshot = await evidence(page, `${role.toLowerCase()}-current-location`);
    append(skip(contract, {
      expectedEffect: "Current location action is reconstructed by its rendered semantic name and contextual owner.",
      observedEffect: "Current action was visible as ‘Konumumu Al’; permission/location capture was intentionally not invoked in the public acceptance runtime.",
      evidence: [{ kind: "current-rendered-semantic", action: contract.ACTION_NAME, owner: contract.CONTEXTUAL_OWNER_LABEL }, { kind: "screenshot", path: screenshot }],
    }));
    report.currentSemanticStateEvidence.push({ role, route, action: contract.ACTION_NAME, owner: contract.CONTEXTUAL_OWNER_LABEL });
  });
}

async function runCanary() {
  report.runtimeParity = await currentRuntimeParity();
  const browser = await chromium.launch({ headless: true });
  report.browser = { engine: browser.version(), automation: "Playwright @playwright/test 1.60.0", headless: true };
  try {
    const tokens = {};
    for (const [role, credentials] of Object.entries(users)) tokens[role] = await login(credentials);

    // A/F/M: current assistant semantic state, on two routes, immediately opened and closed.
    const assistantContracts = [];
    for (const [role, route] of [["COMPANY", "/company"], ["SCHOOL", "/school"]]) {
      await withSurface(browser, tokens, role, route, desktop, async (page) => {
        const meta = { role, route, viewport: "desktop", surface: { id: "assistant-shell", title: "Sefer Abi" }, state: { drawerTitle: null }, action: { expectedEffectClass: "DRAWER_OPEN" } };
        const opener = await requireVisible(page.getByRole("button", { name: /Sefer Abi.*Sor/iu }), `${role} current Sefer Abi entry`);
        const contract = await contractFrom(opener, meta);
        await opener.click();
        const drawer = await requireVisible(page.locator(".copilotDrawer,[data-drawer],[role='dialog']"), `${role} Sefer Abi drawer`);
        await closeOverlay(page, drawer);
        const screenshot = await evidence(page, `${role.toLowerCase()}-sefer-abi`);
        append(pass(contract, {
          actionResult: "DRAWER_OPENED_AND_CLOSED",
          expectedEffect: "Current rendered Sefer Abi entry opens its assistant surface.",
          observedEffect: "Assistant drawer visible then hidden after close.",
          evidence: [{ kind: "current-rendered-semantic", action: contract.ACTION_NAME, owner: contract.CONTEXTUAL_OWNER_LABEL }, { kind: "screenshot", path: screenshot }],
        }));
        assistantContracts.push(contract);
        report.currentSemanticStateEvidence.push({ role, route, action: contract.ACTION_NAME, owner: contract.CONTEXTUAL_OWNER_LABEL });
      });
    }
    if (assistantContracts[0].ACTION_CONTRACT_ID === assistantContracts[1].ACTION_CONTRACT_ID) {
      report.metrics.wrongRoute += 1;
      throw new Error("same current assistant action collapsed across routes");
    }
    report.cases.push("Sefer Abi current state", "same action name distinct route", "drawer open/close");

    // B/C: current equivalents for old Personel/Öğrenci Konum state labels.
    await captureLocationState(browser, tokens, "COMPANY", "/company/hub", "Personel konum bağlamı");
    await captureLocationState(browser, tokens, "SCHOOL", "/school/georeview", "Öğrenci konum bağlamı");
    report.cases.push("Personel Konum current equivalent", "Öğrenci Konum current equivalent");

    // D: dynamic Market state: current filter is applied and immediately reset.
    await withSurface(browser, tokens, "COMPANY", "/company/commercial-flow", desktop, async (page) => {
      const meta = { role: "COMPANY", route: "/company/commercial-flow", viewport: "desktop", surface: { id: "commercial-flow", title: "Ticari akış" }, state: { filterSignature: "market-current" }, action: { expectedEffectClass: "FILTER_CHANGE_AND_RESET" } };
      const select = await requireVisible(page.getByRole("combobox", { name: /^Akış filtresi$/iu }), "current Market flow filter");
      const contract = await contractFrom(select, meta);
      const before = await select.inputValue();
      let values = [];
      for (let attempt = 0; attempt < 20; attempt += 1) {
        values = await select.locator("option").evaluateAll((nodes) => nodes.filter((node) => !node.disabled && node.value).map((node) => node.value));
        if (values.some((value) => value !== before)) break;
        await sleep(250);
      }
      const next = values.find((value) => value !== before);
      if (!next) throw new Error("dynamic Market filter has no reversible option");
      await select.selectOption(next);
      const changed = await select.inputValue();
      await select.selectOption(before);
      const restored = await select.inputValue();
      if (changed !== next || restored !== before) throw new Error("dynamic Market filter did not apply and reset");
      const screenshot = await evidence(page, "company-market-filter");
      append(pass(contract, {
        actionResult: "FILTER_APPLIED_AND_RESET",
        expectedEffect: "Current market/status filter changes rendered control state and resets.",
        observedEffect: `${before}→${changed}→${restored}`,
        evidence: [{ kind: "select-value", before, changed, restored }, { kind: "screenshot", path: screenshot }],
      }));
    });

    // D: current equivalent for old service-status label is a safe same-session navigation.
    await withSurface(browser, tokens, "PERSONEL", "/personel/live", desktop, async (page) => {
      const meta = { role: "PERSONEL", route: "/personel/live", viewport: "desktop", surface: { id: "personel-live", title: "Canlı servis" }, state: {}, action: { expectedEffectClass: "ROUTE_NAVIGATION" } };
      const control = await requireVisible(page.getByRole("button", { name: /^Servisim$/iu }), "current servis state action");
      const contract = await contractFrom(control, meta);
      const before = await page.evaluate(() => location.hash);
      await control.click();
      await page.waitForFunction((previous) => location.hash !== previous, before, { timeout: 5000 });
      const after = await page.evaluate(() => location.hash);
      const screenshot = await evidence(page, "personel-servisim-navigation");
      append(pass(contract, {
        actionResult: "ROUTE_NAVIGATED",
        expectedEffect: "Current service action opens its rendered service surface.",
        observedEffect: `${before}→${after}`,
        evidence: [{ kind: "url", before, after }, { kind: "screenshot", path: screenshot }],
      }));
    });
    report.cases.push("dynamic Market filter", "current Servisim state");

    // E/G/N/O: separate row-owner contracts immediately open and close their own modal.
    await withSurface(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-directory", title: "Firma dizini" }, state: { activeTab: "companies" }, action: { expectedEffectClass: "MODAL_OPEN" } };
      const profiles = page.getByRole("button", { name: /^Profil$/iu });
      const first = await requireVisible(profiles, "first company profile");
      const firstContract = await contractFrom(first, meta);
      let second = null;
      for (let index = 1; index < await profiles.count(); index += 1) {
        if (await profiles.nth(index).isVisible().catch(() => false)) { second = profiles.nth(index); break; }
      }
      if (!second) throw new Error("second contextual company profile is unavailable");
      const secondContract = await contractFrom(second, meta);
      if (firstContract.ACTION_CONTRACT_ID === secondContract.ACTION_CONTRACT_ID) {
        report.metrics.wrongOwner += 1;
        throw new Error("same profile action collapsed across company-row owners");
      }
      await second.click();
      const dialog = await requireVisible(page.locator(".modal,[role='dialog']").filter({ hasText: /Firma Profili/iu }), "second company profile modal");
      await closeOverlay(page, dialog);
      const screenshot = await evidence(page, "superadmin-company-profile-row");
      append(pass(secondContract, {
        actionResult: "TABLE_ROW_MODAL_OPENED_AND_CLOSED",
        expectedEffect: "Selected company row opens only its profile modal.",
        observedEffect: `Second contextual owner ${secondContract.CONTEXTUAL_OWNER_LABEL} opened then closed its modal.`,
        evidence: [{ kind: "owner", owner: secondContract.CONTEXTUAL_OWNER_LABEL }, { kind: "screenshot", path: screenshot }],
      }));
    });
    report.cases.push("SUPER_ADMIN current owner", "same action distinct row owner", "table-row action", "modal open/close");

    // E/L: use current tabs, not a persisted broad owner, and restore the previous tab.
    await withSurface(browser, tokens, "SUPER_ADMIN", "/superadmin/operations", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/operations", viewport: "desktop", surface: { id: "operations-workspace", title: "Operasyon çalışma alanı" }, state: { activeTab: "overview" }, action: { expectedEffectClass: "TAB_ACTIVATION" } };
      const target = await requireVisible(page.getByRole("tab", { name: /^Yetki & Erişim/iu }), "current system permission tab");
      const previous = await firstVisible(page.locator("[role='tab'][aria-selected='true']"));
      const contract = await contractFrom(target, meta);
      await target.click();
      if (await target.getAttribute("aria-selected") !== "true") throw new Error("current system tab did not become selected");
      if (previous) await previous.click();
      const screenshot = await evidence(page, "superadmin-system-tab");
      append(pass(contract, {
        actionResult: "TAB_ACTIVATED_AND_RESTORED",
        expectedEffect: "Current system tab becomes active and the prior tab can be restored.",
        observedEffect: "aria-selected=true then previous tab restored",
        evidence: [{ kind: "aria-selected", value: "true" }, { kind: "screenshot", path: screenshot }],
      }));
    });
    report.cases.push("SUPER_ADMIN system tab current owner", "tab activation");

    // E: the old replay's broad owner is deliberately not reused.  The
    // current refresh action is observed in-place through its rendered busy
    // attribute transition, then the fresh surface provides isolation.
    await withSurface(browser, tokens, "SUPER_ADMIN", "/superadmin", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin", viewport: "desktop", surface: { id: "superadmin-overview", title: "Yönetim özeti" }, state: {}, action: { expectedEffectClass: "REFRESH_BUSY_CYCLE" } };
      const refresh = await firstVisible(page.getByRole("button", { name: /^Özeti Yenile$/iu }));
      if (!refresh) {
        report.currentSemanticStateEvidence.push({ role: "SUPER_ADMIN", route: "/superadmin", historicalAction: "Özeti Yenile", classification: "NOT_RENDERED_IN_CURRENT_PUBLIC_RUNTIME" });
        return;
      }
      const contract = await contractFrom(refresh, meta);
      await page.evaluate(() => {
        const target = [...document.querySelectorAll("button")].find((node) => node.textContent?.trim() === "Özeti Yenile");
        if (!target) throw new Error("refresh button missing while installing rendered-state observer");
        window.__pre18RefreshTransitions = [];
        new MutationObserver(() => window.__pre18RefreshTransitions.push(target.disabled)).observe(target, { attributes: true, attributeFilter: ["disabled"] });
      });
      await refresh.click();
      await page.waitForTimeout(350);
      const transitions = await page.evaluate(() => window.__pre18RefreshTransitions || []);
      if (!transitions.includes(true) || !transitions.includes(false)) throw new Error(`current refresh did not expose rendered busy cycle: ${JSON.stringify(transitions)}`);
      const screenshot = await evidence(page, "superadmin-overview-refresh");
      append(pass(contract, {
        actionResult: "RENDERED_BUSY_CYCLE_COMPLETED",
        expectedEffect: "Overview refresh exposes and completes a rendered busy state.",
        observedEffect: `disabled transitions ${JSON.stringify(transitions)}`,
        evidence: [{ kind: "disabled-transitions", transitions }, { kind: "screenshot", path: screenshot }],
      }));
    });

    // E: a current navigation/system action is opened and restored by the
    // same surface session, independent of any historical wrapper identity.
    await withSurface(browser, tokens, "SUPER_ADMIN", "/superadmin", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin", viewport: "desktop", surface: { id: "system-navigation", title: "Sistem menüsü" }, state: { disclosure: "advanced-closed" }, action: { expectedEffectClass: "NAVIGATION_DISCLOSURE_TOGGLE" } };
      const system = await requireVisible(page.getByRole("button", { name: /^SİSTEM (▸|▾)$/u }), "current system navigation disclosure");
      const contract = await contractFrom(system, meta);
      await system.click();
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some((node) => node.textContent?.trim() === "SİSTEM ▾"), null, { timeout: 3500 });
      const expanded = await requireVisible(page.getByRole("button", { name: /^SİSTEM ▾$/u }), "expanded system navigation disclosure");
      await expanded.click();
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some((node) => node.textContent?.trim() === "SİSTEM ▸"), null, { timeout: 3500 });
      const screenshot = await evidence(page, "superadmin-system-navigation");
      append(pass(contract, {
        actionResult: "NAVIGATION_DISCLOSURE_OPENED_AND_CLOSED",
        expectedEffect: "Current system navigation opens advanced entries and restores the compact state.",
        observedEffect: "SİSTEM ▸→SİSTEM ▾→SİSTEM ▸",
        evidence: [{ kind: "navigation-disclosure", states: ["SİSTEM ▸", "SİSTEM ▾", "SİSTEM ▸"] }, { kind: "screenshot", path: screenshot }],
      }));
    });
    report.cases.push("SUPER_ADMIN overview refresh current-semantics check", "SUPER_ADMIN system navigation current owner");

    // H/I/J/K: execute the disclosure in each viewport/state in its own fresh surface.
    const accordionContracts = [];
    for (const viewport of [desktop, mobile]) {
      await withSurface(browser, tokens, "SUPER_ADMIN", "/superadmin", viewport, async (page) => {
        const name = viewportName(viewport);
        const baseMeta = { role: "SUPER_ADMIN", route: "/superadmin", viewport: name, surface: { id: "overview-detail-workspace", title: "Ayrıntılı çalışma alanı" }, action: { expectedEffectClass: "DISCLOSURE_TOGGLE" } };
        const summary = await requireVisible(page.locator("summary").filter({ hasText: /Ayrıntılı çalışma alanını göster/iu }), `${name} current details disclosure`);
        const details = summary.locator("xpath=..");
        if (await details.evaluate((node) => node.open)) await summary.click();
        const collapsed = await contractFrom(summary, { ...baseMeta, state: { detailsOpen: false, disclosure: "details-closed" } });
        const equivalent = await contractFrom(summary, { ...baseMeta, state: { detailsOpen: false, disclosure: "details-closed" } });
        const equivalentResult = deduplicateActionContracts([collapsed, equivalent]);
        if (equivalentResult.contracts.length !== 1 || equivalentResult.equivalentOccurrencesCollapsed !== 1) throw new Error(`${name} equivalent action contract did not collapse`);
        await summary.click();
        if (!(await details.evaluate((node) => node.open))) throw new Error(`${name} disclosure did not open`);
        const expanded = await contractFrom(summary, { ...baseMeta, state: { detailsOpen: true, disclosure: "details-open" } });
        if (collapsed.ACTION_CONTRACT_ID === expanded.ACTION_CONTRACT_ID) {
          report.metrics.wrongState += 1;
          throw new Error(`${name} disclosure states collapsed`);
        }
        await summary.click();
        if (await details.evaluate((node) => node.open)) throw new Error(`${name} disclosure did not close`);
        const screenshot = await evidence(page, `${name}-accordion`);
        append(pass(collapsed, {
          actionResult: "DISCLOSURE_OPENED_AND_CLOSED",
          expectedEffect: "Detailed workspace opens and closes in the current viewport.",
          observedEffect: "details.open false→true→false",
          evidence: [{ kind: "details-open", states: [false, true, false], equivalentOccurrencesCollapsed: 1 }, { kind: "screenshot", path: screenshot }],
        }));
        append(pass(expanded, {
          actionResult: "DISCLOSURE_CLOSED",
          expectedEffect: "Expanded details state supports the close action.",
          observedEffect: "details.open true→false",
          evidence: [{ kind: "details-open", states: [true, false] }, { kind: "screenshot", path: screenshot }],
        }));
        accordionContracts.push({ name, collapsed });
      });
    }
    if (accordionContracts[0].collapsed.ACTION_CONTRACT_ID === accordionContracts[1].collapsed.ACTION_CONTRACT_ID) {
      report.metrics.wrongViewport += 1;
      throw new Error("desktop and mobile disclosure contracts collapsed");
    }
    report.cases.push("desktop/mobile distinct contract", "material state distinction", "equivalent duplicate collapse", "accordion open/close");

    // P: validation only, with every network mutation guarded and the field restored.
    await withSurface(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const blocked = [];
      await page.route("**/*", async (route) => {
        if (mutationMethods.has(route.request().method())) { blocked.push({ method: route.request().method(), url: route.request().url() }); await route.abort(); return; }
        await route.continue();
      });
      const field = await requireVisible(page.getByPlaceholder(/Yeni hizmet alan firma adı/iu), "company name field");
      const create = await requireVisible(page.getByRole("button", { name: /^Oluştur$/iu }), "company create validation action");
      const contract = await contractFrom(create, { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-create", title: "Firma oluşturma" }, state: {}, action: { expectedEffectClass: "FORM_VALIDATION" } });
      const before = await field.inputValue();
      await field.fill("");
      await create.click();
      await page.waitForFunction(() => document.body.innerText.includes("Firma adı gerekli"), null, { timeout: 3500 });
      if (blocked.length) throw new Error("validation-only flow attempted a mutation");
      await field.fill(before);
      const screenshot = await evidence(page, "form-validation-cancel");
      append(pass(contract, {
        actionResult: "VALIDATION_TRIGGERED_AND_FIELD_RESTORED",
        expectedEffect: "Required field stops mutation and renders validation.",
        observedEffect: "Firma adı gerekli rendered; no mutation request occurred.",
        evidence: [{ kind: "validation", message: "Firma adı gerekli", blocked }, { kind: "screenshot", path: screenshot }],
      }));
    });
    report.cases.push("form validation/cancel");

    // Q: unsafe flow stops at the native confirmation; writes are both prevented and observed as absent.
    await withSurface(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const blocked = [];
      let confirmation = null;
      const confirmationSeen = new Promise((resolve) => page.once("dialog", async (dialog) => { confirmation = { type: dialog.type(), message: dialog.message() }; await dialog.dismiss(); resolve(); }));
      await page.route("**/*", async (route) => {
        if (mutationMethods.has(route.request().method())) { blocked.push({ method: route.request().method(), url: route.request().url() }); await route.abort(); return; }
        await route.continue();
      });
      const remove = await requireVisible(page.getByRole("button", { name: /^Sil$/iu }), "unsafe delete action");
      const contract = await contractFrom(remove, { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-directory", title: "Firma dizini" }, state: {}, action: { expectedEffectClass: "CONFIRMATION_BOUNDARY", safetyClass: "UNSAFE" } });
      await remove.click();
      await Promise.race([confirmationSeen, page.waitForTimeout(1200)]);
      if (!confirmation || blocked.length) throw new Error("unsafe flow did not stop at a clean cancellable confirmation");
      const screenshot = await evidence(page, "unsafe-confirmation-cancel");
      append(unsafe(contract, {
        actionResult: "NATIVE_CONFIRMATION_DISMISSED",
        expectedEffect: "Destructive action stops at a cancellable confirmation boundary.",
        observedEffect: `Native ${confirmation.type} dismissed before any mutation.`,
        evidence: [{ kind: "native-confirmation", confirmation, blocked }, { kind: "screenshot", path: screenshot }],
      }));
    });
    report.cases.push("unsafe confirmation/cancel", "action reset/isolation");
  } finally {
    await browser.close();
  }
}

async function persistArtifacts(result) {
  const checkpoint = buildActionCheckpoint(records, { runId, runKind: "BOUNDED_CANARY" });
  await fs.writeFile(manifest.manifestPath, `${JSON.stringify({
    ...manifest,
    generatedAt: report.generatedAt,
    immutable: true,
    primaryExecutionModel: "ROLE→ROUTE→VIEWPORT→SURFACE_STATE→ENUMERATE_CURRENT_ACTION_CONTRACTS→EXECUTE_IMMEDIATELY→OBSERVE→RESET→PERSIST",
    frozenArtifactsMutated: false,
  }, null, 2)}\n`);
  await fs.writeFile(path.join(runDir, "action-contracts.json"), `${JSON.stringify({ records, primaryMetric: "ACTION_CONTRACT_COUNT" }, null, 2)}\n`);
  await fs.writeFile(manifest.checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await fs.writeFile(manifest.failureLedgerPath, `${JSON.stringify({ RUN_ID: runId, entries: failures }, null, 2)}\n`);
  await fs.writeFile(manifest.summaryPath, `${JSON.stringify({ report, result, checkpoint }, null, 2)}\n`);
  return checkpoint;
}

await fs.mkdir(path.dirname(runDir), { recursive: true });
try {
  await fs.mkdir(runDir);
} catch (error) {
  report.metrics.artifactOverwrite += 1;
  throw new Error(`immutable run directory already exists: ${runDir}; ${norm(error.message)}`);
}
await fs.mkdir(evidenceDir);

let executionError = null;
try {
  await runCanary();
} catch (error) {
  executionError = norm(error?.stack || error);
  failures.push({ RUN_ID: runId, FAILURE_STAGE: "CANARY_EXECUTION", FAILURE_REASON: executionError, RETRYABLE: true, EVIDENCE: [] });
}

// This stop/resume probe is intentionally separate from the canary records so
// an incomplete probe cannot inflate or deflate canary completion counters.
const checkpointProbeContract = records[0] || captureActionContract({ role: "SUPER_ADMIN", route: "/superadmin", viewport: "desktop", surface: { id: "probe" }, action: { name: "probe" } });
const pendingProbe = captureActionContract({ role: "SUPER_ADMIN", route: "/superadmin", viewport: "desktop", surface: { id: "probe" }, materialState: { disclosure: "pending" }, action: { name: "pending probe" } });
const probeCheckpoint = buildActionCheckpoint([records[0], pendingProbe], { runId, runKind: "BOUNDED_CANARY" });
const resumedProbe = prepareActionResume([checkpointProbeContract, pendingProbe], probeCheckpoint);
const checkpointResumeOkay = resumedProbe.some((item) => item.ACTION_CONTRACT_ID === checkpointProbeContract.ACTION_CONTRACT_ID && item.resumed === true)
  && resumedProbe.some((item) => item.ACTION_CONTRACT_ID === pendingProbe.ACTION_CONTRACT_ID && item.executionState === "NOT_YET_TESTED");
if (!checkpointResumeOkay) {
  report.metrics.falsePass += 1;
  failures.push(createFailureLedgerEntry({ runId, contract: pendingProbe, failureStage: "CHECKPOINT_RESUME", failureReason: "terminal/pass and pending actions did not preserve distinct resume semantics" }));
}

const counts = (state) => records.filter((record) => (record.executionState || record.EXECUTION_STATE) === state).length;
const safeCount = records.filter((record) => record.SAFETY_CLASS === "SAFE").length;
const unsafeCount = records.length - safeCount;
const result = {
  status: !executionError
    && counts("HARNESS_FAILURE") === 0
    && counts("NOT_YET_TESTED") === 0
    && failures.length === 0
    && Object.values(report.metrics).every((value) => value === 0)
    && records.every(isTerminalActionEvidence) ? "GREEN" : "NOT_GREEN",
  CANARY_SURFACE_STATE_COUNT: new Set(records.map((record) => `${record.ROLE}|${record.ROUTE}|${record.VIEWPORT}|${record.SURFACE_ID}|${record.MATERIAL_STATE_SIGNATURE}`)).size,
  CANARY_ACTION_CONTRACT_COUNT: records.length,
  CANARY_SAFE_ACTION_CONTRACT_COUNT: safeCount,
  CANARY_UNSAFE_ACTION_CONTRACT_COUNT: unsafeCount,
  CANARY_PROVEN_PASS_COUNT: counts("PROVEN_PASS"),
  CANARY_PRODUCT_DEFECT_COUNT: counts("PROVEN_PRODUCT_DEFECT"),
  CANARY_ACCESSIBILITY_PRODUCT_DEFECT_COUNT: counts("ACCESSIBILITY_PRODUCT_DEFECT"),
  CANARY_HARNESS_FAILURE_COUNT: counts("HARNESS_FAILURE") + failures.length,
  CANARY_NOT_YET_TESTED_COUNT: counts("NOT_YET_TESTED"),
  CANARY_WRONG_ROUTE_MATCH_COUNT: report.metrics.wrongRoute,
  CANARY_WRONG_OWNER_MATCH_COUNT: report.metrics.wrongOwner,
  CANARY_WRONG_VIEWPORT_MATCH_COUNT: report.metrics.wrongViewport,
  CANARY_WRONG_STATE_MATCH_COUNT: report.metrics.wrongState,
  CANARY_FALSE_PASS_COUNT: report.metrics.falsePass,
  CANARY_RESET_FAILURE_COUNT: report.metrics.resetFailure,
  CANARY_ARTIFACT_OVERWRITE_COUNT: report.metrics.artifactOverwrite,
  UNSAFE_CONTROL_ACCIDENTALLY_EXECUTED_COUNT: records.filter((record) => record.unsafeMutationExecuted === true).length,
  CHECKPOINT_RESUME_STATUS: checkpointResumeOkay ? "PASS" : "FAIL",
  CANARY_FAILURE_LEDGER_ENTRY_COUNT: failures.length,
  executionError,
};
const finalCheckpoint = await persistArtifacts(result);
console.log(JSON.stringify({ report: { browser: report.browser, runtimeParity: report.runtimeParity, cases: report.cases }, result, artifactDir: path.relative(root, runDir).replace(/\\/gu, "/"), checkpoint: finalCheckpoint.progress }, null, 2));
if (result.status !== "GREEN") process.exitCode = 2;
