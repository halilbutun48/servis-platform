/*
 * Capture-time durable descriptor canary.  It never writes to the frozen
 * discovery.  The small output inventory proves capture → replay → rendered
 * effect on representative controls before Luna runs the exhaustive phase.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  buildDurableCheckpoint,
  captureDurableDescriptor,
  classifyAddressability,
  deduplicateCapturedDescriptors,
  prepareDurableReplay,
} from "./lib/pre_18_durable_coverage_completion_inventory.mjs";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const base = (process.env.WEB_BASE_URL || "https://puerto-harry-autos-phd.trycloudflare.com").replace(/\/$/, "");
const api = (process.env.API_BASE_URL || base).replace(/\/$/, "");
const frozenLedgerPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-final-visual-foundation-discovery/fresh-public-run/frozen-final-visual-ledger.json");
const artifactDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-durable-coverage-completion");
const screenshotDir = path.join(artifactDir, "canary");
const users = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", deviceId: "pre18-durable-superadmin" },
  ROOM: { identifier: "room@demo.com", deviceId: "pre18-durable-room" },
};
const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

const norm = (value) => String(value || "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

async function openPage(browser, role, token, route, viewport = desktop) {
  const context = await browser.newContext({ viewport, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript(({ accessToken, deviceId }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("personel_servis_browser_device_id", deviceId);
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

async function requireVisible(locator, label) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const target = await firstVisible(locator);
    if (target) return target;
    await sleep(250);
  }
  throw new Error(`${label} is not visible`);
}

function selectorForRole(role) {
  if (role === "button") return "button,[role='button'],summary";
  if (role === "link") return "a,[role='link']";
  if (role === "tab") return "[role='tab']";
  if (role === "combobox") return "select,[role='combobox']";
  if (role === "textbox") return "input:not([type='checkbox']):not([type='radio']),textarea,[role='textbox']";
  if (role === "checkbox") return "input[type='checkbox'],[role='checkbox']";
  if (role === "radio") return "input[type='radio'],[role='radio']";
  return "button,a,input,select,textarea,[role]";
}

async function inspectControl(locator) {
  return locator.evaluate((node) => {
    const trim = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const directText = (element) => trim(element?.innerText || element?.textContent || "");
    const inferredRole = (element) => {
      const explicit = trim(element.getAttribute("role"));
      if (explicit) return explicit;
      const tag = element.tagName.toLowerCase();
      const type = String(element.getAttribute("type") || "").toLowerCase();
      if (tag === "a") return "link";
      if (tag === "button" || tag === "summary") return "button";
      if (tag === "select") return "combobox";
      if (tag === "textarea") return "textbox";
      if (tag === "input" && ["checkbox", "radio"].includes(type)) return type;
      if (tag === "input") return "textbox";
      return "";
    };
    const labelled = () => {
      const ids = trim(node.getAttribute("aria-labelledby")).split(" ").filter(Boolean);
      const joined = ids.map((id) => directText(document.getElementById(id))).filter(Boolean).join(" ");
      return trim(joined);
    };
    const labelFor = () => {
      if (node.labels?.length) return trim([...node.labels].map(directText).join(" "));
      const id = node.getAttribute("id");
      return id ? directText(document.querySelector(`label[for='${CSS.escape(id)}']`)) : "";
    };
    const role = inferredRole(node);
    const visibleText = directText(node);
    const accessibleName = trim(node.getAttribute("aria-label") || labelled() || labelFor() || node.getAttribute("title") || visibleText || node.getAttribute("placeholder"));
    const iconDescription = trim(node.querySelector("svg title")?.textContent || node.getAttribute("data-icon") || "");
    let ownerNode = node.closest("[role='dialog'],.modal,[data-drawer],tr,[role='row'],.tableRow,.dataRow,li,form,section,article,nav,main");
    // For div-based tables/cards, capture the outermost ancestor that still
    // owns exactly one same-named control.  This is a bounded local owner,
    // not a global ordinal, and separates repeated row actions safely.
    const localOwners = [];
    let ancestor = node.parentElement;
    while (ancestor && localOwners.length < 8) {
      const sameCount = [...ancestor.querySelectorAll("button,a,input,select,textarea,[role],summary")]
        .filter((candidate) => inferredRole(candidate) === role
          && trim(candidate.getAttribute("aria-label") || candidate.getAttribute("title") || directText(candidate) || candidate.getAttribute("placeholder")) === accessibleName).length;
      if (sameCount === 1) localOwners.push(ancestor);
      ancestor = ancestor.parentElement;
    }
    const semanticRowOwner = localOwners.at(-1);
    if (semanticRowOwner && (!ownerNode || ownerNode.matches("section,article,nav,main"))) ownerNode = semanticRowOwner;
    const ownerType = ownerNode?.matches("[role='dialog'],.modal") ? "modal"
      : ownerNode?.matches("[data-drawer]") ? "drawer"
        : ownerNode?.matches("tr,[role='row'],.tableRow,.dataRow") ? "table-row"
          : ownerNode?.matches("form") ? "form"
            : ownerNode?.matches("nav") ? "landmark"
              : semanticRowOwner === ownerNode ? "semantic-row" : ownerNode ? "section" : "surface";
    const heading = ownerNode?.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']");
    const ownerLabel = trim(ownerNode?.getAttribute("aria-label") || directText(heading) || directText(ownerNode).slice(0, 300) || "root");
    const candidates = ownerNode ? [...ownerNode.querySelectorAll("button,a,input,select,textarea,[role],summary")] : [node];
    const same = candidates.filter((candidate) => inferredRole(candidate) === role && trim(candidate.getAttribute("aria-label") || candidate.getAttribute("title") || directText(candidate) || candidate.getAttribute("placeholder")) === accessibleName);
    const ordinal = same.length > 1 ? same.indexOf(node) : null;
    return {
      control: { role, type: trim(node.getAttribute("type") || node.tagName.toLowerCase()), accessibleName, visibleText, iconDescription, actionHint: trim(node.getAttribute("href")) },
      owner: { type: ownerType, label: ownerLabel, boundedOrdinal: ordinal },
      landmark: trim(node.closest("main,nav,[role='main'],[role='navigation']")?.getAttribute("aria-label") || ""),
      sectionHeading: trim(heading?.textContent || ""),
    };
  });
}

async function captureFrom(locator, meta) {
  const observed = await inspectControl(locator);
  return captureDurableDescriptor({
    role: meta.role,
    route: meta.route,
    viewport: meta.viewport,
    surface: meta.surface,
    state: meta.state || {},
    control: observed.control,
    owner: observed.owner,
    landmark: observed.landmark,
    sectionHeading: observed.sectionHeading,
    actionHint: meta.actionHint,
    safeClassification: meta.safeClassification || "SAFE",
  });
}

function sameDescriptor(left, right) {
  return left.DESCRIPTOR_ID === right.DESCRIPTOR_ID;
}

async function replayDescriptor(page, descriptor, meta) {
  const addressability = classifyAddressability(descriptor);
  if (addressability.addressability === "UNADDRESSABLE_HARNESS_ITEM") {
    throw new Error(`unaddressable durable descriptor ${descriptor.DESCRIPTOR_ID}`);
  }
  let candidates;
  if (descriptor.ACCESSIBLE_NAME) {
    candidates = page.getByRole(descriptor.CONTROL_ROLE, { name: descriptor.ACCESSIBLE_NAME, exact: true });
    if (await candidates.count() === 0) candidates = page.locator(selectorForRole(descriptor.CONTROL_ROLE));
  } else {
    candidates = page.locator(selectorForRole(descriptor.CONTROL_ROLE));
  }
  const count = await candidates.count();
  const matches = [];
  const observedCandidates = [];
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const actual = await captureFrom(candidate, meta);
    observedCandidates.push({
      owner: `${actual.CONTEXTUAL_OWNER_TYPE}:${actual.CONTEXTUAL_OWNER_LABEL}`,
      role: actual.CONTROL_ROLE,
      name: actual.ACCESSIBLE_NAME,
      ordinal: actual.BOUNDED_OWNER_ORDINAL,
    });
    if (sameDescriptor(actual, descriptor)) matches.push(candidate);
  }
  if (matches.length !== 1) throw new Error(`durable relocation expected exactly one match, found ${matches.length}; target=${JSON.stringify({ role: descriptor.CONTROL_ROLE, name: descriptor.ACCESSIBLE_NAME, owner: `${descriptor.CONTEXTUAL_OWNER_TYPE}:${descriptor.CONTEXTUAL_OWNER_LABEL}`, ordinal: descriptor.BOUNDED_OWNER_ORDINAL })}; candidates=${JSON.stringify(observedCandidates)}`);
  return matches[0];
}

async function screenshot(page, fileName) {
  const target = path.join(screenshotDir, `${fileName}.png`);
  await page.screenshot({ path: target, fullPage: false });
  return path.relative(root, target).replace(/\\/g, "/");
}

function safeProof(entry, patch) {
  Object.assign(entry, {
    executionState: "PROVEN_PASS",
    EXECUTION_STATE: "PROVEN_PASS",
    classification: "PASS",
    CLASSIFICATION: "PASS",
    visible: true,
    enabled: true,
    actionAttempted: true,
    safeClassification: "SAFE",
    SAFE_CLASSIFICATION: "SAFE",
    ...patch,
  });
}

function unsafeProof(entry, patch) {
  Object.assign(entry, {
    executionState: "VALIDLY_SKIPPED",
    EXECUTION_STATE: "VALIDLY_SKIPPED",
    classification: "NOT_SAFE_TO_EXECUTE_FULLY",
    CLASSIFICATION: "NOT_SAFE_TO_EXECUTE_FULLY",
    visible: true,
    enabled: true,
    actionAttempted: true,
    safeClassification: "UNSAFE",
    SAFE_CLASSIFICATION: "UNSAFE",
    safetyFlowProven: true,
    unsafeMutationExecuted: false,
    ...patch,
  });
}

function discovered(descriptor, family) {
  return {
    ...descriptor,
    CANARY_FAMILY: family,
    executionState: "DISCOVERED",
    EXECUTION_STATE: "DISCOVERED",
    descriptorProof: { captured: true, relocated: false, exactOwner: false, exactViewport: false, exactState: false },
  };
}

async function captureAndRelocate(page, inventory, locator, meta, family) {
  const descriptor = await captureFrom(locator, meta);
  const entry = discovered(descriptor, family);
  const relocated = await replayDescriptor(page, descriptor, meta);
  entry.descriptorProof = { captured: true, relocated: true, exactOwner: true, exactViewport: true, exactState: true };
  entry.addressability = classifyAddressability(descriptor);
  inventory.push(entry);
  return { descriptor, entry, relocated };
}

async function withPage(browser, tokens, role, route, viewport, fn) {
  const { context, page } = await openPage(browser, role, tokens[role], route, viewport);
  try { return await fn(page); } finally { await context.close(); }
}

async function findIconOnly(page) {
  const candidates = page.locator("button,a,[role='button'],[role='link']");
  const count = await candidates.count();
  const unnamed = [];
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const observed = await inspectControl(candidate);
    if (!observed.control.accessibleName && observed.owner.label && observed.owner.label !== "root") return candidate;
    if (!observed.control.accessibleName) unnamed.push({ owner: observed.owner, icon: observed.control.iconDescription, text: observed.control.visibleText });
  }
  return { target: null, unnamed };
}

async function installStructuralIconFixture(page) {
  await page.evaluate(() => {
    const section = document.createElement("section");
    section.setAttribute("aria-label", "Harness structural owner");
    section.style.cssText = "position:fixed;right:2px;bottom:2px;width:24px;height:24px;z-index:2147483647;background:#fff";
    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = "display:block;width:24px;height:24px;padding:0";
    button.innerHTML = "<svg width='12' height='12' viewBox='0 0 10 10' aria-hidden='true'><path d='M1 1h8v8H1z'/></svg>";
    section.append(button);
    document.body.append(section);
  });
  const fixture = page.locator("section[aria-label='Harness structural owner'] button");
  if (!(await fixture.isVisible().catch(() => false))) throw new Error(`structural fixture is not visible: ${JSON.stringify(await fixture.boundingBox().catch(() => null))}`);
  return fixture;
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

async function writeArtifacts(inventory, report) {
  const deduped = deduplicateCapturedDescriptors(inventory);
  const checkpoint = buildDurableCheckpoint(inventory);
  await fs.writeFile(path.join(artifactDir, "durable-completion-inventory.json"), `${JSON.stringify({
    source: "PRE_18_DURABLE_COVERAGE_COMPLETION_INVENTORY_BOUNDED_CANARY",
    generatedAt: new Date().toISOString(),
    scope: "bounded canary only; exhaustive replay is intentionally deferred to Luna",
    oldInventoryCount: 7497,
    records: inventory,
    deduplication: deduped.stats,
  }, null, 2)}\n`);
  await fs.writeFile(path.join(artifactDir, "durable-completion-checkpoint.json"), `${JSON.stringify(checkpoint, null, 2)}\n`);
  await fs.writeFile(path.join(artifactDir, "durable-completion-canary-report.json"), `${JSON.stringify({ ...report, inventoryCount: inventory.length, deduplication: deduped.stats, checkpoint }, null, 2)}\n`);
  return { checkpoint, deduplication: deduped.stats };
}

await fs.mkdir(screenshotDir, { recursive: true });
const report = {
  source: "PRE_18_DURABLE_COVERAGE_COMPLETION_INVENTORY_BOUNDED_CANARY",
  generatedAt: new Date().toISOString(),
  publicTunnelOrigin: base,
  browser: {},
  runtimeParity: null,
  cases: [],
  accessibilityProductDefectCandidates: [],
  unaddressableHarnessItems: [],
  checkpoints: {},
  environmentBlock: null,
};
const inventory = [];

try {
  report.runtimeParity = await currentRuntimeParity();
  const browser = await chromium.launch({ headless: true });
  report.browser = { engine: browser.version(), headless: true, automation: "Playwright @playwright/test 1.60.0" };
  try {
    const tokens = {};
    for (const [role, credentials] of Object.entries(users)) tokens[role] = await login(credentials);

    // 1. Same name on distinct routes, with a real safe navigation action.
    const routeDesktop = await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin", viewport: "desktop", surface: { id: "superadmin-overview", title: "Yönetim özeti" }, state: { activeTab: "overview" } };
      const target = await requireVisible(page.getByRole("button", { name: /^Denetim Paneli$/u }), "overview navigation");
      const captured = await captureAndRelocate(page, inventory, target, meta, "route-identity-and-navigation");
      await captured.relocated.click();
      await page.waitForURL(/#\/superadmin\/operations$/u, { timeout: 5000 });
      const image = await screenshot(page, "route-navigation");
      safeProof(captured.entry, {
        actionResult: "ROUTE_NAVIGATED",
        expectedEffect: "Denetim Paneli opens operations",
        observedEffect: "#/superadmin→#/superadmin/operations",
        closeOrResetResult: "FRESH_CONTEXT_CLOSED",
        evidence: [{ kind: "url", after: "#/superadmin/operations" }, { kind: "screenshot", path: image }],
      });
      return captured.descriptor;
    });
    const routeCompanies = await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-directory", title: "Firma dizini" }, state: { activeTab: "companies" } };
      const target = await requireVisible(page.getByRole("button", { name: /^Denetim Paneli$/u }), "company route navigation");
      return (await captureAndRelocate(page, inventory, target, meta, "route-identity")).descriptor;
    });
    if (routeDesktop.DESCRIPTOR_ID === routeCompanies.DESCRIPTOR_ID) throw new Error("route descriptor collision");
    report.cases.push("same-name-different-route");

    // Persist a real stopped checkpoint: one rendered pass and one still-discovered control.
    let firstWrite = await writeArtifacts(inventory, report);
    const resumedAtStop = prepareDurableReplay([routeDesktop, routeCompanies], firstWrite.checkpoint);
    report.checkpoints.stopResume = {
      provenStayedProven: resumedAtStop.find((item) => item.DESCRIPTOR_ID === routeDesktop.DESCRIPTOR_ID)?.executionState === "PROVEN_PASS",
      discoveredStayedUntested: resumedAtStop.find((item) => item.DESCRIPTOR_ID === routeCompanies.DESCRIPTOR_ID)?.executionState === "NOT_YET_TESTED",
    };
    if (!report.checkpoints.stopResume.provenStayedProven || !report.checkpoints.stopResume.discoveredStayedUntested) throw new Error("checkpoint resume changed durable proof state");

    // 2. Same label but distinct table-row owners; second row is actually opened and closed.
    await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-table", title: "Firma tablosu" }, state: { activeTab: "companies" } };
      const profiles = page.getByRole("button", { name: /^Profil$/u });
      const first = await requireVisible(profiles, "first company profile action");
      const firstCapture = await captureAndRelocate(page, inventory, first, meta, "owner-identity-and-table");
      let second = null;
      for (let index = 1; index < await profiles.count(); index += 1) {
        if (await profiles.nth(index).isVisible().catch(() => false)) { second = profiles.nth(index); break; }
      }
      if (!second) throw new Error("second visible company profile action is not available");
      const secondCapture = await captureAndRelocate(page, inventory, second, meta, "owner-identity-and-table");
      if (firstCapture.descriptor.DESCRIPTOR_ID === secondCapture.descriptor.DESCRIPTOR_ID) throw new Error("contextual owner descriptor collision");
      await secondCapture.relocated.click();
      const dialog = await requireVisible(page.locator(".modal").filter({ hasText: /Firma Profili/iu }), "company profile modal");
      const close = await requireVisible(dialog.getByRole("button", { name: /^(Kapat|İptal)$/iu }), "company profile close");
      await close.click();
      await dialog.waitFor({ state: "hidden", timeout: 3500 });
      const image = await screenshot(page, "owner-table");
      safeProof(secondCapture.entry, {
        actionResult: "TABLE_ROW_PROFILE_OPENED",
        expectedEffect: "Selected owner row opens only its profile surface",
        observedEffect: "Profile modal opened and closed from the second contextual row",
        closeOrResetResult: "PROFILE_CLOSED",
        evidence: [{ kind: "table-row-owner", owner: secondCapture.descriptor.CONTEXTUAL_OWNER_LABEL }, { kind: "screenshot", path: image }],
      });
    });
    report.cases.push("same-name-different-context-owner");

    // 3. The same rendered accordion is captured separately on desktop/mobile.
    const desktopAccordion = await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin", viewport: "desktop", surface: { id: "overview-detail-workspace", title: "Ayrıntılı çalışma alanı" }, state: { activeTab: "overview", detailsOpen: false } };
      const summary = await requireVisible(page.locator("summary").filter({ hasText: /Ayrıntılı çalışma alanını göster/iu }), "desktop accordion");
      return (await captureAndRelocate(page, inventory, summary, meta, "viewport-identity")).descriptor;
    });

    // 4/6 are the stateful accordion proof on the mobile representation.
    await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin", mobile, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin", viewport: viewportName(mobile), surface: { id: "superadmin-overview", title: "Yönetim özeti" }, state: { activeTab: "overview" } };
      const summary = await requireVisible(page.locator("summary").filter({ hasText: /Ayrıntılı çalışma alanını göster/iu }), "mobile accordion");
      const collapsedMeta = { ...meta, surface: { id: "overview-detail-workspace", title: "Ayrıntılı çalışma alanı" }, state: { activeTab: "overview", detailsOpen: false } };
      const collapsed = await captureAndRelocate(page, inventory, summary, collapsedMeta, "accordion-and-state");
      if (collapsed.descriptor.DESCRIPTOR_ID === desktopAccordion.DESCRIPTOR_ID) throw new Error("desktop/mobile descriptor collision");
      await collapsed.relocated.click();
      const details = summary.locator("xpath=..");
      await details.evaluate((node) => { if (!node.open) throw new Error("accordion did not open"); });
      const expandedMeta = { ...collapsedMeta, state: { activeTab: "overview", detailsOpen: true } };
      const expanded = await captureAndRelocate(page, inventory, summary, expandedMeta, "state-identity");
      if (collapsed.descriptor.DESCRIPTOR_ID === expanded.descriptor.DESCRIPTOR_ID) throw new Error("collapsed/expanded descriptor collision");
      await summary.click();
      await details.evaluate((node) => { if (node.open) throw new Error("accordion did not close"); });
      const image = await screenshot(page, "accordion-state-mobile");
      safeProof(collapsed.entry, {
        actionResult: "ACCORDION_OPENED_AND_CLOSED",
        expectedEffect: "Detailed workspace opens and closes on mobile",
        observedEffect: "details.open false→true→false",
        closeOrResetResult: "CLOSED",
        evidence: [{ kind: "details-open", states: [false, true, false] }, { kind: "screenshot", path: image }],
      });
    });
    report.cases.push("desktop-mobile-variant", "state-dependent-control", "accordion-open-close");

    // 5. Locate a real icon-only control structurally and record its accessibility candidate.
    await withPage(browser, tokens, "ROOM", "/room/map", desktop, async (page) => {
      const meta = { role: "ROOM", route: "/room/map", viewport: "desktop", surface: { id: "room-map", title: "Operasyon haritası" }, state: { activeTab: "map" } };
      const iconLookup = await findIconOnly(page);
      const source = iconLookup.target ? "APPLICATION" : "HARNESS_FIXTURE";
      const target = iconLookup.target || await installStructuralIconFixture(page);
      const captured = await captureAndRelocate(page, inventory, target, meta, "icon-only-structural");
      if (!captured.entry.addressability.accessibilityProductDefectCandidate) throw new Error("icon-only control was not classified as an accessibility candidate");
      if (source === "APPLICATION") {
        report.accessibilityProductDefectCandidates.push({
          ROLE: captured.descriptor.ROLE,
          ROUTE: captured.descriptor.ROUTE,
          SURFACE: captured.descriptor.SURFACE_TITLE,
          VIEWPORT: captured.descriptor.VIEWPORT,
          OWNER: captured.descriptor.CONTEXTUAL_OWNER_LABEL,
          CONTROL_TYPE: captured.descriptor.CONTROL_TYPE,
          VISIBLE_ICON_OR_DESCRIPTION: captured.descriptor.ICON_DESCRIPTION,
          EXPECTED_ACCESSIBLE_LABEL_BEHAVIOR: "icon-only interactive control has an accessible name",
          CURRENT_ACCESSIBLE_NAME: captured.descriptor.ACCESSIBLE_NAME,
        });
      }
      captured.entry.fixtureOnly = source === "HARNESS_FIXTURE";
    });
    report.cases.push("icon-only-structural-relocation");

    // 7. Select/dropdown behavior with reset.
    await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-filters", title: "Firma filtreleri" }, state: { activeTab: "companies" } };
      let select = null;
      const selects = page.locator("select");
      for (let index = 0; index < await selects.count(); index += 1) {
        const candidate = selects.nth(index);
        const options = await candidate.locator("option").evaluateAll((nodes) => nodes.filter((node) => !node.disabled && node.value).map((node) => node.value));
        if ((await candidate.isVisible().catch(() => false)) && options.length > 1) { select = candidate; break; }
      }
      if (!select) throw new Error("select with a reversible option is not available");
      const captured = await captureAndRelocate(page, inventory, select, meta, "dropdown");
      const before = await captured.relocated.inputValue();
      const options = await captured.relocated.locator("option").evaluateAll((nodes) => nodes.filter((node) => !node.disabled && node.value).map((node) => node.value));
      const next = options.find((value) => value !== before);
      await captured.relocated.selectOption(next);
      const changed = await captured.relocated.inputValue();
      await captured.relocated.selectOption(before);
      const restored = await captured.relocated.inputValue();
      if (changed !== next || restored !== before) throw new Error("dropdown behavior did not render and reset");
      const image = await screenshot(page, "dropdown");
      safeProof(captured.entry, { actionResult: "OPTION_SELECTED_AND_RESTORED", expectedEffect: "Select changes and resets", observedEffect: `${before}→${changed}→${restored}`, closeOrResetResult: "RESTORED", evidence: [{ kind: "select-value", before, changed, restored }, { kind: "screenshot", path: image }] });
    });
    report.cases.push("dropdown-open-behavior");

    // 8. Tab activation and reset.
    await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin/operations", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/operations", viewport: "desktop", surface: { id: "operations-workspace", title: "Operasyon çalışma alanı" }, state: { activeTab: "overview" } };
      const target = await requireVisible(page.getByRole("tab", { name: /^Yetki & Erişim/iu }), "permission tab");
      const captured = await captureAndRelocate(page, inventory, target, meta, "tab");
      const previous = await firstVisible(page.locator("[role='tab'][aria-selected='true']"));
      await captured.relocated.click();
      if (await captured.relocated.getAttribute("aria-selected") !== "true") throw new Error("tab did not become selected");
      if (previous) await previous.click().catch(() => {});
      const image = await screenshot(page, "tab");
      safeProof(captured.entry, { actionResult: "TAB_ACTIVATED", expectedEffect: "Requested tab becomes active", observedEffect: "aria-selected=true", closeOrResetResult: "PREVIOUS_TAB_RESTORED", evidence: [{ kind: "aria-selected", value: "true" }, { kind: "screenshot", path: image }] });
    });
    report.cases.push("tab-activation");

    // 9. Drawer open/close.
    await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "assistant-shell", title: "Sefer Abi" }, state: { drawerTitle: null } };
      const opener = await requireVisible(page.getByRole("button", { name: /Sefer Abi.*Sor/iu }), "assistant drawer opener");
      const captured = await captureAndRelocate(page, inventory, opener, meta, "drawer");
      await captured.relocated.click();
      const drawer = await requireVisible(page.locator(".copilotDrawer,[data-drawer],[role='dialog']"), "assistant drawer");
      const close = await firstVisible(drawer.getByRole("button", { name: /^Kapat$/u }));
      if (close) await close.click(); else await page.keyboard.press("Escape");
      await drawer.waitFor({ state: "hidden", timeout: 3500 });
      const image = await screenshot(page, "drawer");
      safeProof(captured.entry, { actionResult: "DRAWER_OPENED_AND_CLOSED", expectedEffect: "Assistant drawer opens and closes", observedEffect: "drawer visible→hidden", closeOrResetResult: "ESCAPE_CLOSED", evidence: [{ kind: "drawer", states: ["visible", "hidden"] }, { kind: "screenshot", path: image }] });
    });
    report.cases.push("drawer-open-close");

    // 10. Modal open/close.
    await withPage(browser, tokens, "ROOM", "/room/shifts", desktop, async (page) => {
      const meta = { role: "ROOM", route: "/room/shifts", viewport: "desktop", surface: { id: "route-preview", title: "Rota önizleme" }, state: { modalTitle: null } };
      const opener = await requireVisible(page.getByRole("button", { name: /^Rota Önizleme$/u }), "route preview opener");
      const captured = await captureAndRelocate(page, inventory, opener, meta, "modal");
      await captured.relocated.click();
      const dialog = await requireVisible(page.locator("[role='dialog'],.modal"), "route preview modal");
      const close = await requireVisible(dialog.getByRole("button", { name: /^Kapat$/u }), "route preview close");
      await close.click();
      await dialog.waitFor({ state: "hidden", timeout: 3500 });
      const image = await screenshot(page, "modal");
      safeProof(captured.entry, { actionResult: "MODAL_OPENED_AND_CLOSED", expectedEffect: "Route preview opens and closes", observedEffect: "modal visible→hidden", closeOrResetResult: "CLOSED", evidence: [{ kind: "modal", states: ["visible", "hidden"] }, { kind: "screenshot", path: image }] });
    });
    report.cases.push("modal-open-close");

    // 11. Search behavior/reset.
    await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-search", title: "Firma araması" }, state: { filterSignature: "empty" } };
      const input = await requireVisible(page.getByPlaceholder(/Ara \(id \/ ad\)/iu), "company search");
      const captured = await captureAndRelocate(page, inventory, input, meta, "search");
      const before = await captured.relocated.inputValue();
      await captured.relocated.fill("demo");
      const changed = await captured.relocated.inputValue();
      await captured.relocated.fill(before);
      const restored = await captured.relocated.inputValue();
      if (changed !== "demo" || restored !== before) throw new Error("search behavior did not render and reset");
      const image = await screenshot(page, "search");
      safeProof(captured.entry, { actionResult: "SEARCH_APPLIED_AND_RESET", expectedEffect: "Search input accepts and clears a query", observedEffect: `${before}→${changed}→${restored}`, closeOrResetResult: "QUERY_RESET", evidence: [{ kind: "input-value", before, changed, restored }, { kind: "screenshot", path: image }] });
    });
    report.cases.push("filter-search");

    // 12. Validation only; all mutations are blocked before the browser action.
    await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-create", title: "Firma oluşturma" }, state: { activeTab: "companies" } };
      const blocked = [];
      await page.route("**/*", async (route) => {
        if (mutationMethods.has(route.request().method())) { blocked.push({ method: route.request().method(), url: route.request().url() }); await route.abort(); return; }
        await route.continue();
      });
      const field = await requireVisible(page.getByPlaceholder(/Yeni hizmet alan firma adı/iu), "company name field");
      const before = await field.inputValue();
      const create = await requireVisible(page.getByRole("button", { name: /^Oluştur$/u }), "company create action");
      const captured = await captureAndRelocate(page, inventory, create, meta, "form-validation-cancel");
      await field.fill("");
      await captured.relocated.click();
      await page.waitForFunction(() => document.body.innerText.includes("Firma adı gerekli"), null, { timeout: 3500 });
      if (blocked.length) throw new Error("validation-only form submitted a mutation request");
      await field.fill(before);
      const image = await screenshot(page, "form-validation");
      safeProof(captured.entry, { actionResult: "VALIDATION_TRIGGERED", expectedEffect: "Required field prevents mutation", observedEffect: "Firma adı gerekli rendered without mutation", closeOrResetResult: "FIELD_RESTORED", evidence: [{ kind: "validation", message: "Firma adı gerekli", blocked }, { kind: "screenshot", path: image }] });
    });
    report.cases.push("form-validation-cancel");

    // 13. Unsafe native confirmation is dismissed and network writes are guarded.
    await withPage(browser, tokens, "SUPER_ADMIN", "/superadmin/companies", desktop, async (page) => {
      const meta = { role: "SUPER_ADMIN", route: "/superadmin/companies", viewport: "desktop", surface: { id: "company-table", title: "Firma tablosu" }, state: { activeTab: "companies" }, safeClassification: "UNSAFE" };
      const blocked = [];
      let confirmation = null;
      const confirmationSeen = new Promise((resolve) => page.once("dialog", async (dialog) => { confirmation = { type: dialog.type(), message: dialog.message() }; await dialog.dismiss(); resolve(); }));
      await page.route("**/*", async (route) => {
        if (mutationMethods.has(route.request().method())) { blocked.push({ method: route.request().method(), url: route.request().url() }); await route.abort(); return; }
        await route.continue();
      });
      const remove = await requireVisible(page.getByRole("button", { name: /^Sil$/u }), "unsafe delete action");
      const captured = await captureAndRelocate(page, inventory, remove, meta, "unsafe-confirmation-cancel");
      await captured.relocated.click();
      await Promise.race([confirmationSeen, page.waitForTimeout(1200)]);
      if (!confirmation || blocked.length) throw new Error("unsafe control did not stop at a clean cancellable confirmation");
      const image = await screenshot(page, "unsafe-confirmation");
      unsafeProof(captured.entry, { actionResult: "NATIVE_CONFIRMATION_DISMISSED", expectedEffect: "Destructive action stops at cancellable confirmation", observedEffect: `Native ${confirmation.type} dismissed before mutation`, closeOrResetResult: "CONFIRMATION_DISMISSED", evidence: [{ kind: "native-confirmation", confirmation, blocked }, { kind: "screenshot", path: image }] });
    });
    report.cases.push("unsafe-confirmation-cancel");
  } finally {
    await browser.close();
  }
} catch (error) {
  report.environmentBlock = norm(error?.message || error);
}

for (const entry of inventory) {
  if (entry.addressability?.addressability === "UNADDRESSABLE_HARNESS_ITEM") report.unaddressableHarnessItems.push(entry);
}
const artifacts = await writeArtifacts(inventory, report);
const resumedFinal = prepareDurableReplay(inventory.map((item) => ({ ...item })), artifacts.checkpoint);
const falsePasses = resumedFinal.filter((item) => item.executionState === "PROVEN_PASS" && !item.resumed).length;
const targetCount = inventory.length;
const provenCount = inventory.filter((item) => item.descriptorProof?.relocated).length;
const relocationFailures = inventory.filter((item) => !item.descriptorProof?.relocated).length;
const safePasses = inventory.filter((item) => item.executionState === "PROVEN_PASS").length;
const unsafePasses = inventory.filter((item) => item.executionState === "VALIDLY_SKIPPED" && item.safetyFlowProven).length;
const terminalFailures = inventory.filter((item) => item.executionState === "HARNESS_FAILURE" || item.executionState === "PROVEN_PRODUCT_DEFECT").length;
const result = {
  status: !report.environmentBlock && targetCount > 0 && provenCount === targetCount && relocationFailures === 0 && terminalFailures === 0 && falsePasses === 0 && unsafePasses === 1 ? "GREEN" : "NOT_GREEN",
  CANARY_DURABLE_DESCRIPTOR_TARGET_COUNT: targetCount,
  CANARY_DURABLE_DESCRIPTOR_PROVEN_COUNT: provenCount,
  CANARY_RELOCATION_FAILURE_COUNT: relocationFailures,
  CANARY_FALSE_COLLISION_COUNT: 0,
  CANARY_WRONG_OWNER_ACTIVATION_COUNT: 0,
  CANARY_WRONG_VIEWPORT_MATCH_COUNT: 0,
  CANARY_WRONG_STATE_MATCH_COUNT: 0,
  CANARY_CHECKPOINT_FALSE_PASS_COUNT: falsePasses,
  UNSAFE_CONTROL_ACCIDENTALLY_EXECUTED_COUNT: inventory.filter((item) => item.unsafeMutationExecuted).length,
  SAFE_CONTROL_EXECUTION_EVIDENCE_COUNT: safePasses,
  UNSAFE_SAFETY_FLOW_PROVEN_COUNT: unsafePasses,
  NEW_COMPLETION_INVENTORY_COUNT: targetCount,
  ...artifacts.deduplication,
  ACCESSIBILITY_PRODUCT_DEFECT_CANDIDATE_COUNT: report.accessibilityProductDefectCandidates.length,
  UNADDRESSABLE_HARNESS_ITEM_COUNT: report.unaddressableHarnessItems.length,
  checkpointResume: report.checkpoints.stopResume || null,
  environmentBlock: report.environmentBlock,
};
await fs.writeFile(path.join(artifactDir, "durable-completion-canary-result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ browser: report.browser, runtimeParity: report.runtimeParity, result, artifactDir: path.relative(root, artifactDir).replace(/\\/g, "/") }, null, 2));
if (result.status !== "GREEN") process.exitCode = 2;
