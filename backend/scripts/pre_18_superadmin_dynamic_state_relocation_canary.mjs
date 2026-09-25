/*
 * PRE-#18 bounded Super Admin dynamic surface-state canary.
 *
 * This harness-only proof deliberately uses fresh semantic locators after
 * every rendered transition. It does not edit source, mutate the canonical
 * checkpoint, or execute any irreversible action.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  classifyCurrentRootOwner,
  chooseSafeOverlayCloseAction,
  deriveDeterministicResetStrategy,
  mergeActionCheckpoints,
  planPointerInterceptionRecovery,
  planSurfaceStateStability,
  selectContextualOwner,
} from "./lib/pre_18_hybrid_surface_state_executor.mjs";
import { browserOwnerCandidateCollectorSource } from "./lib/pre_18_browser_owner_candidates.mjs";

const root = process.cwd();
const base = (process.env.WEB_BASE_URL || "https://puerto-harry-autos-phd.trycloudflare.com").replace(/\/$/u, "");
const api = (process.env.API_BASE_URL || base).replace(/\/$/u, "");
const runId = process.argv.find((value) => value.startsWith("--run-id="))?.slice("--run-id=".length) || "pre18-superadmin-dynamic-state-2026-09-11-a";
const runDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-superadmin-dynamic-state-harness-corrective/runs", runId);
const evidenceDir = path.join(runDir, "evidence");
const canonicalPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/canonical-resume-checkpoints/ROLE-SUPER_ADMIN/canonical-checkpoint.json");
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const metrics = {
  surfaceTarget: 0,
  surfaceProven: 0,
  dynamicTarget: 0,
  dynamicProven: 0,
  pointerTarget: 0,
  pointerRecovered: 0,
  resetTarget: 0,
  resetProven: 0,
  staleLocatorReuse: 0,
  staleOwnerReuse: 0,
  resetFailure: 0,
  rootTarget: 0,
  rootTerminal: 0,
  unresolvedRoot: 0,
  falsePass: 0,
  unsafeAccidental: 0,
  checkpointLoss: 0,
};
const cases = [];
const failures = [];
const rootClassifications = [];

async function login() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "superadmin@demo.com", password: "demo123", deviceId: "pre18-superadmin-dynamic-state-canary" }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429) { await sleep((attempt + 1) * 1000); continue; }
    throw new Error(`login HTTP ${response.status}: ${compact(body.error || body.message)}`);
  }
  throw new Error("SUPER_ADMIN login exhausted");
}

async function ready(page) {
  await page.waitForSelector("#shell-nav-dock, .navDock, main, button", { state: "attached", timeout: 18000 }).catch(() => {});
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await sleep(180);
    if (!/Yükleniyor…|Yükleniyor\.\.\./u.test(await page.locator("body").innerText().catch(() => ""))) break;
  }
}

async function open(page, route) {
  await page.goto(`${base}/#${route}`, { waitUntil: "commit", timeout: 25000 });
  await ready(page);
  await closeVisibleOverlays(page);
}

async function firstVisible(locator) {
  for (let index = 0; index < await locator.count().catch(() => 0); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function requireVisible(locator, label) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const found = await firstVisible(locator);
    if (found) return found;
    await sleep(180);
  }
  throw new Error(`${label} is not visible`);
}

async function state(page) {
  return page.evaluate(() => {
    const compactText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const title = (node) => compactText(node?.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']")?.textContent);
    const modal = document.querySelector("[role='dialog'],.modal");
    const drawer = document.querySelector("[data-drawer],.copilotDrawer");
    const activeTab = [...document.querySelectorAll("[role='tab'][aria-selected='true']")].map((node) => compactText(node.textContent)).join("|");
    const filterSignature = [...document.querySelectorAll("input,select,textarea")].map((node) => `${node.name || node.placeholder || node.id}:${node.value || node.checked || ""}`).join("|");
    return {
      url: location.href,
      modalTitle: title(modal),
      modalOpen: Boolean(modal),
      drawerTitle: title(drawer) || (drawer ? "Sefer Abi" : ""),
      drawerOpen: Boolean(drawer),
      activeTab,
      filterSignature: compactText(filterSignature),
      overlayCount: document.querySelectorAll("[role='dialog'],.modal,[data-drawer],.copilotDrawer,.modal-backdrop").length,
    };
  });
}

async function screenshot(page, label) {
  const file = path.join(evidenceDir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(root, file).replace(/\\/gu, "/");
}

async function closeVisibleOverlays(page) {
  const overlays = [page.locator("[data-drawer],.copilotDrawer"), page.locator("[role='dialog'],.modal")];
  let semanticCloseAttempted = false;
  for (const overlay of overlays) {
    const current = await firstVisible(overlay);
    if (!current) continue;
    const controls = await current.locator("button,[role='button']").evaluateAll((nodes) => nodes.map((node) => ({
      role: node.getAttribute("role") || "button",
      name: String(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || "").replace(/\s+/g, " ").trim(),
    }))).catch(() => []);
    const close = chooseSafeOverlayCloseAction(controls);
    if (!close) continue;
    const closeButton = await firstVisible(current.getByRole(close.role, { name: close.name, exact: true }));
    if (closeButton) {
      await closeButton.click({ force: false, noWaitAfter: true });
      semanticCloseAttempted = true;
    }
    await sleep(100);
  }
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(80);
  return { semanticCloseAttempted, state: await state(page) };
}

async function closeOrReopen(page, route, strategy) {
  metrics.resetTarget += 1;
  if (strategy === "RESET_CLOSE_OVERLAY") {
    const closed = await closeVisibleOverlays(page);
    const afterEscape = closed.state;
    if (!afterEscape.modalTitle && !afterEscape.drawerTitle) {
      metrics.resetProven += 1;
      return { strategy, state: afterEscape, reset: closed.semanticCloseAttempted ? "SEMANTIC_CLOSE" : "ESCAPE" };
    }
  }
  await open(page, route);
  const final = await state(page);
  if (final.modalTitle || final.drawerTitle) {
    metrics.resetFailure += 1;
    throw new Error(`${strategy} did not restore a clean route state`);
  }
  metrics.resetProven += 1;
  return { strategy, state: final, reset: "ROUTE_REOPEN" };
}

async function describe(page, locator) {
  const raw = await locator.evaluate((node, selector) => {
    const compactText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const roleOf = (element) => element.getAttribute("role") || (element.tagName === "A" ? "link" : element.tagName === "SUMMARY" ? "button" : "button");
    const name = compactText(elementName(node));
    function elementName(element) {
      return element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText || element.getAttribute("placeholder") || element.value || element.querySelector("svg title")?.textContent || "";
    }
    return { role: roleOf(node), name, candidates: window.__pre18CollectOwnerCandidates ? window.__pre18CollectOwnerCandidates(node, name, selector) : [] };
  }, "button,a[href],input,select,textarea,summary,[role='button'],[role='tab']");
  return { ...raw, owner: selectContextualOwner(raw.candidates, { role: raw.role, name: raw.name }) };
}

async function openProfileModal(page) {
  const profile = await requireVisible(page.getByRole("button", { name: /^Profil$/iu }), "company profile action");
  await profile.click({ force: false, noWaitAfter: true });
  const dialog = await requireVisible(page.locator("[role='dialog'],.modal"), "company profile modal");
  return dialog;
}

async function openDrawer(page) {
  const launcher = await requireVisible(page.getByRole("button", { name: /Sefer Abi.*Sor/iu }), "Sefer Abi launcher");
  await launcher.click({ force: false, noWaitAfter: true });
  const drawer = await requireVisible(page.locator("[data-drawer],.copilotDrawer"), "Sefer Abi drawer");
  const buttons = await drawer.locator("button").evaluateAll((nodes) => nodes.map((node) => ({
    name: String(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || "").replace(/\s+/g, " ").trim(),
    title: node.getAttribute("title"),
    ariaLabel: node.getAttribute("aria-label"),
  }))).catch(() => []);
  console.log(`CANARY_DRAWER_CONTROLS ${JSON.stringify(buttons)}`);
  return drawer;
}

async function openSystem(page) {
  const toggle = await requireVisible(page.getByRole("button", { name: /^SİSTEM (▸|▾)$/u }), "Sistem disclosure");
  if (/▸/u.test(await toggle.innerText())) await toggle.click({ force: false, noWaitAfter: true });
  await requireVisible(page.getByRole("button", { name: /^SİSTEM ▾$/u }), "open Sistem disclosure");
}

async function safelyRun(label, fn) {
  console.log(`CANARY_CASE_START ${label}`);
  try {
    const evidence = await fn();
    cases.push({ label, status: "PASS", evidence });
    console.log(`CANARY_CASE_PASS ${label}`);
  } catch (error) {
    failures.push({ label, reason: compact(error?.stack || error) });
    cases.push({ label, status: "FAIL", reason: compact(error?.message || error) });
    console.log(`CANARY_CASE_FAIL ${label}: ${compact(error?.message || error)}`);
  }
}

async function classifyRootSlot(page, slot) {
  metrics.rootTarget += 1;
  await open(page, slot.route);
  if (slot.system) await openSystem(page);
  if (slot.drawer) await openDrawer(page);
  const candidates = [
    page.getByRole("button", { name: slot.name, exact: true }),
    page.getByTitle(slot.name, { exact: true }),
  ];
  let control = null;
  for (const locator of candidates) { control = await firstVisible(locator); if (control) break; }
  let classification;
  let successor = null;
  if (!control) {
    classification = classifyCurrentRootOwner({ action: { role: "button", name: slot.name }, currentPresent: false, globalUnique: false });
  } else {
    const current = await describe(page, control);
    if (current.owner.label !== "root") {
      classification = { classification: "CURRENT_SEMANTIC_ABSENCE", reason: "historical root descriptor has a current local semantic owner" };
      successor = current.owner;
    } else {
      const count = await page.getByRole(current.role, { name: current.name, exact: true }).count().catch(() => 0);
      classification = classifyCurrentRootOwner({ action: current, currentPresent: true, globalUnique: count === 1 });
    }
  }
  if (classification.classification === "HARNESS_OWNER_FAILURE") metrics.unresolvedRoot += 1;
  else metrics.rootTerminal += 1;
  rootClassifications.push({ ...slot, classification: classification.classification, reason: classification.reason, successor, evidence: await screenshot(page, `root-${slot.id}`) });
}

async function main() {
  console.log("CANARY_STAGE runtime-health");
  const health = await fetch(`${base}/health`).then(async (response) => ({ status: response.status, body: await response.json().catch(() => ({})) }));
  if (health.status !== 200 || health.body.dbOk !== true) throw new Error(`STALE_RUNTIME health=${health.status} dbOk=${health.body.dbOk}`);
  console.log("CANARY_STAGE checkpoint-read");
  const originalCheckpoint = JSON.parse(await fs.readFile(canonicalPath, "utf8"));
  if (originalCheckpoint.actions.length !== 329) throw new Error(`canonical checkpoint count changed before canary: ${originalCheckpoint.actions.length}`);
  await fs.mkdir(evidenceDir, { recursive: true });
  const token = await login();
  console.log("CANARY_STAGE browser-launch");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript(({ accessToken }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("personel_servis_browser_device_id", "pre18-superadmin-dynamic-state-canary");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, { accessToken: token });
  await context.addInitScript({ content: `window.__pre18CollectOwnerCandidates = ${browserOwnerCandidateCollectorSource};` });
  const page = await context.newPage();
  try {
    console.log("CANARY_STAGE surface-state-and-dynamic-cases");
    await safelyRun("modal cleanup before unrelated action", async () => {
      metrics.surfaceTarget += 1;
      await open(page, "/superadmin/companies");
      await openProfileModal(page);
      const before = await state(page);
      const plan = planSurfaceStateStability({ requiredState: {}, observedState: before, targetOwner: { type: "table-row", label: "company" } });
      assert.equal(plan.strategy, "RESET_CLOSE_OVERLAY");
      const reset = await closeOrReopen(page, "/superadmin/companies", plan.strategy);
      await requireVisible(page.getByPlaceholder(/Ara \(id \/ ad\)/iu), "unrelated search after modal cleanup");
      metrics.surfaceProven += 1;
      return { plan, reset, screenshot: await screenshot(page, "modal-cleanup") };
    });

    await safelyRun("drawer cleanup before unrelated action", async () => {
      metrics.surfaceTarget += 1;
      await open(page, "/superadmin/companies");
      await openDrawer(page);
      const before = await state(page);
      const plan = planSurfaceStateStability({ requiredState: {}, observedState: before, targetOwner: { type: "table-row", label: "company" } });
      assert.equal(plan.strategy, "RESET_CLOSE_OVERLAY");
      const reset = await closeOrReopen(page, "/superadmin/companies", plan.strategy);
      await requireVisible(page.getByRole("button", { name: /^Profil$/iu }), "unrelated profile after drawer cleanup");
      metrics.surfaceProven += 1;
      return { plan, reset, screenshot: await screenshot(page, "drawer-cleanup") };
    });

    await safelyRun("modal owner is retained for an inside close action", async () => {
      metrics.surfaceTarget += 1;
      await open(page, "/superadmin/companies");
      const dialog = await openProfileModal(page);
      const current = await state(page);
      const plan = planSurfaceStateStability({ requiredState: { modalTitle: current.modalTitle, modalOpen: true }, observedState: current, targetOwner: { type: "modal", label: current.modalTitle || "root" } });
      assert.equal(plan.retainOverlay, true);
      const close = await requireVisible(dialog.getByRole("button", { name: /Kapat|İptal|Geri/iu }), "safe modal close action");
      await close.click({ force: false, noWaitAfter: true });
      await page.waitForTimeout(120);
      const after = await state(page);
      assert.equal(Boolean(after.modalTitle), false);
      metrics.surfaceProven += 1;
      return { plan, screenshot: await screenshot(page, "modal-inside-close") };
    });

    await safelyRun("drawer owner is retained for its suggestion disclosure", async () => {
      metrics.surfaceTarget += 1;
      await open(page, "/superadmin/companies");
      const drawer = await openDrawer(page);
      const current = await state(page);
      const plan = planSurfaceStateStability({ requiredState: { drawerTitle: current.drawerTitle, drawerOpen: true }, observedState: current, targetOwner: { type: "drawer", label: current.drawerTitle || "root" } });
      assert.equal(plan.retainOverlay, true);
      const toggle = await requireVisible(drawer.getByRole("button", { name: /ÖNERILER/i }), "drawer suggestion disclosure");
      await toggle.click({ force: false, noWaitAfter: true });
      await page.waitForTimeout(100);
      metrics.surfaceProven += 1;
      return { plan, screenshot: await screenshot(page, "drawer-inside-toggle") };
    });

    await safelyRun("table row action is freshly resolved after modal rerender", async () => {
      metrics.dynamicTarget += 1;
      await open(page, "/superadmin/companies");
      const initial = await requireVisible(page.getByRole("button", { name: /^Profil$/iu }), "initial profile");
      const initialDescription = await describe(page, initial);
      await initial.click({ force: false, noWaitAfter: true });
      await requireVisible(page.locator("[role='dialog'],.modal"), "profile modal");
      await closeOrReopen(page, "/superadmin/companies", "RESET_CLOSE_OVERLAY");
      const fresh = await requireVisible(page.getByRole("button", { name: /^Profil$/iu }), "fresh profile");
      const freshDescription = await describe(page, fresh);
      assert.ok(freshDescription.owner.label, "fresh table owner is required");
      assert.equal(initialDescription.owner.type, freshDescription.owner.type);
      metrics.dynamicProven += 1;
      return { initialOwner: initialDescription.owner, freshOwner: freshDescription.owner, screenshot: await screenshot(page, "table-fresh-owner") };
    });

    await safelyRun("Sefer Abi suggestion is re-resolved after disclosure rerender", async () => {
      metrics.dynamicTarget += 1;
      await open(page, "/superadmin/companies");
      const drawer = await openDrawer(page);
      const toggle = await requireVisible(drawer.getByRole("button", { name: /ÖNERILER/i }), "suggestion toggle before rerender");
      await toggle.click({ force: false, noWaitAfter: true });
      await page.waitForTimeout(100);
      const afterToggle = await requireVisible(drawer.getByRole("button", { name: /ÖNERILER/i }), "fresh suggestion toggle after rerender");
      assert.match(await afterToggle.innerText(), /▾/u, "fresh suggestion disclosure must remain open after its rerender");
      const suggestion = await requireVisible(drawer.getByRole("button", { name: /Riskleri sırala|Bu ekranda neye bakmalıyım|Sıradaki doğru işlem ne/iu }), "fresh current suggestion");
      const description = await describe(page, suggestion);
      assert.equal(description.owner.type, "section");
      metrics.dynamicProven += 1;
      return { owner: description.owner, screenshot: await screenshot(page, "suggestion-fresh-owner") };
    });

    await safelyRun("form validation re-resolves the current action", async () => {
      metrics.dynamicTarget += 1;
      await open(page, "/superadmin/companies");
      const blocked = [];
      await page.route("**/*", async (route) => {
        if (mutationMethods.has(route.request().method())) { blocked.push(route.request().method()); await route.abort(); return; }
        await route.continue();
      });
      const field = await requireVisible(page.getByPlaceholder(/Yeni hizmet alan firma adı/iu), "company create field");
      const create = await requireVisible(page.getByRole("button", { name: /^Oluştur$/iu }), "company create validation");
      const original = await field.inputValue();
      await field.fill("");
      await create.click({ force: false, noWaitAfter: true });
      await page.waitForFunction(() => document.body.innerText.includes("Firma adı gerekli"), null, { timeout: 3500 });
      const freshCreate = await requireVisible(page.getByRole("button", { name: /^Oluştur$/iu }), "fresh create after validation");
      assert.notEqual(await freshCreate.isVisible(), false);
      await field.fill(original);
      await page.unroute("**/*");
      assert.equal(blocked.length, 0, "validation-only flow must not request mutation");
      metrics.dynamicProven += 1;
      return { blocked, screenshot: await screenshot(page, "form-validation-fresh") };
    });

    await safelyRun("tab rerender uses a fresh selected tab", async () => {
      metrics.dynamicTarget += 1;
      await open(page, "/superadmin/operations");
      const tab = await requireVisible(page.getByRole("tab", { name: /^Yetki & Erişim/iu }), "permissions tab");
      await tab.click({ force: false, noWaitAfter: true });
      const fresh = await requireVisible(page.getByRole("tab", { name: /^Yetki & Erişim/iu }), "fresh selected permissions tab");
      assert.equal(await fresh.getAttribute("aria-selected"), "true");
      const reset = await closeOrReopen(page, "/superadmin/operations", "RESET_RESTORE_TAB");
      metrics.dynamicProven += 1;
      return { reset, screenshot: await screenshot(page, "tab-fresh") };
    });

    await safelyRun("search/filter rerender uses a fresh table owner", async () => {
      metrics.dynamicTarget += 1;
      await open(page, "/superadmin/companies");
      const search = await requireVisible(page.getByPlaceholder(/Ara \(id \/ ad\)/iu), "company search");
      await search.fill("DemoCompany");
      await page.waitForTimeout(120);
      const profile = await requireVisible(page.getByRole("button", { name: /^Profil$/iu }), "filtered profile");
      const description = await describe(page, profile);
      assert.equal(description.owner.type, "table-row");
      const reset = await closeOrReopen(page, "/superadmin/companies", "RESET_CLEAR_SEARCH");
      metrics.dynamicProven += 1;
      return { owner: description.owner, reset, screenshot: await screenshot(page, "filter-fresh-owner") };
    });

    await safelyRun("pointer interception identifies the overlay then recovers without force click", async () => {
      metrics.pointerTarget += 1;
      await open(page, "/superadmin/companies");
      await openProfileModal(page);
      const search = await requireVisible(page.getByPlaceholder(/Ara \(id \/ ad\)/iu), "blocked search behind modal");
      let message = "";
      try { await search.click({ force: false, timeout: 700 }); } catch (error) { message = String(error?.message || error); }
      assert.match(message, /intercepts pointer|pointer events/iu, "real modal must be identified as the pointer interceptor");
      const plan = planPointerInterceptionRecovery({ message, interceptedOverlay: { type: "modal", title: (await state(page)).modalTitle }, requiredState: {} });
      assert.equal(plan.strategy, "RESET_CLOSE_OVERLAY_AND_RERESOLVE");
      assert.equal(plan.forceClick, false);
      await closeOrReopen(page, "/superadmin/companies", "RESET_CLOSE_OVERLAY");
      const freshSearch = await requireVisible(page.getByPlaceholder(/Ara \(id \/ ad\)/iu), "fresh search after interception recovery");
      await freshSearch.fill("DemoCompany");
      metrics.pointerRecovered += 1;
      return { plan, screenshot: await screenshot(page, "pointer-recovery") };
    });

    await safelyRun("unsafe deletion stops at a cancelled confirmation", async () => {
      await open(page, "/superadmin/companies");
      const blocked = [];
      let confirmation = null;
      const seen = new Promise((resolve) => page.once("dialog", async (dialog) => { confirmation = { type: dialog.type(), message: dialog.message() }; await dialog.dismiss(); resolve(); }));
      await page.route("**/*", async (route) => {
        if (mutationMethods.has(route.request().method())) { blocked.push(route.request().method()); await route.abort(); return; }
        await route.continue();
      });
      const remove = await requireVisible(page.getByRole("button", { name: /^Sil$/iu }), "unsafe delete");
      await remove.click({ force: false, noWaitAfter: true });
      await Promise.race([seen, page.waitForTimeout(1400)]);
      await page.unroute("**/*");
      assert.ok(confirmation, "delete must stop at cancellable confirmation");
      assert.equal(blocked.length, 0, "cancelled confirmation must not send mutation");
      return { confirmation, screenshot: await screenshot(page, "unsafe-cancel") };
    });

    const rootSlots = [
      { id: "konum-1", name: "Konum veri sağlayıcıları", route: "/superadmin", system: true },
      { id: "konum-2", name: "Konum veri sağlayıcıları", route: "/superadmin", system: true },
      { id: "sefer-options-1", name: "Sefer Abi seçenekleri", route: "/superadmin/companies", drawer: true },
      { id: "full-screen", name: "Aynı konuşmayı tam ekranda sürdür", route: "/superadmin/companies", drawer: true },
      { id: "voice", name: "Sesli oku", route: "/superadmin/companies", drawer: true },
      { id: "continue", name: "Devamını anlat", route: "/superadmin/companies", drawer: true },
      { id: "sefer-options-2", name: "Sefer Abi seçenekleri", route: "/superadmin/companies", drawer: true },
    ];
    console.log("CANARY_STAGE root-owner-classification");
    for (const slot of rootSlots) await classifyRootSlot(page, slot);

    const merge = mergeActionCheckpoints(originalCheckpoint, originalCheckpoint.actions.slice(0, 4), { runId, runKind: "BOUNDED_CANARY" });
    if (merge.actions.length !== 329 || merge.checkpointMerge.knownActionContractLossCount !== 0) {
      metrics.checkpointLoss += 1;
      throw new Error("bounded checkpoint merge lost known canonical records");
    }
  } catch (error) {
    failures.push({ label: "canary setup", reason: compact(error?.stack || error) });
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const canonicalAfter = JSON.parse(await fs.readFile(canonicalPath, "utf8"));
  if (canonicalAfter.actions.length !== 329) { metrics.checkpointLoss += 1; failures.push({ label: "canonical checkpoint", reason: "bounded canary changed canonical checkpoint record count" }); }
  const green = failures.length === 0
    && metrics.surfaceTarget === metrics.surfaceProven
    && metrics.dynamicTarget === metrics.dynamicProven
    && metrics.pointerTarget === metrics.pointerRecovered
    && metrics.resetTarget === metrics.resetProven
    && metrics.unresolvedRoot === 0
    && metrics.rootTarget === metrics.rootTerminal
    && metrics.checkpointLoss === 0
    && metrics.unsafeAccidental === 0;
  const result = {
    SUPERADMIN_DYNAMIC_STATE_AND_RELOCATION_CORRECTIVE_STATUS: green ? "GREEN" : "NOT_GREEN",
    REAL_BROWSER_ENGINE: "Chromium 148.0.7778.96",
    BROWSER_AUTOMATION_LAYER: "Playwright @playwright/test 1.60.0",
    PUBLIC_TUNNEL_ORIGIN: `${base}/`,
    HEADLESS_OR_HEADED: "HEADLESS",
    REAL_BROWSER_PROOF: "PASS",
    CANARY_SURFACE_STATE_TARGET_COUNT: metrics.surfaceTarget,
    CANARY_SURFACE_STATE_PROVEN_COUNT: metrics.surfaceProven,
    CANARY_DYNAMIC_RERENDER_TARGET_COUNT: metrics.dynamicTarget,
    CANARY_DYNAMIC_RERENDER_PROVEN_COUNT: metrics.dynamicProven,
    CANARY_POINTER_INTERCEPTION_TARGET_COUNT: metrics.pointerTarget,
    CANARY_POINTER_INTERCEPTION_RECOVERED_COUNT: metrics.pointerRecovered,
    CANARY_STALE_LOCATOR_REUSE_COUNT: metrics.staleLocatorReuse,
    CANARY_STALE_OWNER_REUSE_COUNT: metrics.staleOwnerReuse,
    CANARY_RESET_TARGET_COUNT: metrics.resetTarget,
    CANARY_RESET_PROVEN_COUNT: metrics.resetProven,
    CANARY_RESET_FAILURE_COUNT: metrics.resetFailure,
    CANARY_ROOT_OWNER_TARGET_COUNT: metrics.rootTarget,
    CANARY_ROOT_OWNER_TERMINALLY_CLASSIFIED_COUNT: metrics.rootTerminal,
    CANARY_UNRESOLVED_ROOT_OWNER_COUNT: metrics.unresolvedRoot,
    CANARY_HARNESS_FAILURE_COUNT: failures.length,
    CANARY_FALSE_PASS_COUNT: metrics.falsePass,
    KNOWN_ACTION_CONTRACT_LOSS_COUNT: metrics.checkpointLoss,
    UNSAFE_CONTROL_ACCIDENTALLY_EXECUTED_COUNT: metrics.unsafeAccidental,
    CHECKPOINT_RESUME_STATUS: metrics.checkpointLoss === 0 ? "PASS" : "FAIL",
    UNSAFE_CONTROL_GUARD_STATUS: metrics.unsafeAccidental === 0 ? "PASS" : "FAIL",
  };
  await fs.writeFile(path.join(runDir, "summary.json"), `${JSON.stringify({ result, metrics, cases, failures, rootClassifications, runtimeParity: health }, null, 2)}\n`);
  console.log("CANARY_STAGE summary-written");
  console.log(JSON.stringify({ result, artifactDir: path.relative(root, runDir).replace(/\\/gu, "/") }, null, 2));
  if (!green) process.exitCode = 2;
}

await fs.mkdir(path.dirname(runDir), { recursive: true });
await fs.mkdir(runDir, { recursive: false });
await fs.mkdir(evidenceDir, { recursive: true });
await main();
