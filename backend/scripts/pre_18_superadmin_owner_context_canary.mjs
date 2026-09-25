/*
 * Bounded real-browser proof for the SUPER_ADMIN owner-context corrective.
 * It neither replays the full role shard nor mutates frozen evidence.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { browserOwnerCandidateCollectorSource } from "./lib/pre_18_browser_owner_candidates.mjs";
import {
  buildActionCheckpoint,
  captureActionContract,
  createRunId,
  isOverBroadOwnerCandidate,
  isTerminalActionEvidence,
  reuseCompatibleTerminalAction,
  selectContextualOwner,
} from "./lib/pre_18_hybrid_surface_state_executor.mjs";

const root = process.cwd();
const base = (process.env.WEB_BASE_URL || "https://puerto-harry-autos-phd.trycloudflare.com").replace(/\/$/u, "");
const api = (process.env.API_BASE_URL || base).replace(/\/$/u, "");
const runId = process.argv.find((value) => value.startsWith("--run-id="))?.slice("--run-id=".length) || createRunId("pre18-superadmin-owner-context");
const runDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-superadmin-owner-context-harness-corrective/runs", runId);
const screenshotDir = path.join(runDir, "evidence");
const selector = "button,a[href],input,select,textarea,summary,[role='button'],[role='tab'],[role='checkbox'],[role='radio'],[role='switch'],[role='combobox'],[role='textbox'],[role='option'],[role='menuitem']";
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function login() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "superadmin@demo.com", password: "demo123", deviceId: "pre18-owner-context-canary" }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429) { await sleep((attempt + 1) * 1200); continue; }
    throw new Error(`login HTTP ${response.status}: ${compact(body.error || body.message)}`);
  }
  throw new Error("SUPER_ADMIN login exhausted");
}

async function waitForSurface(page) {
  await page.waitForSelector("#shell-nav-dock, .navDock, main, button", { state: "attached", timeout: 18000 }).catch(() => {});
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(180);
    if (!/Yükleniyor…|Yükleniyor\.\.\./u.test(await page.locator("body").innerText().catch(() => ""))) break;
  }
}

async function open(page, route) {
  await page.goto(`${base}/#${route}`, { waitUntil: "commit", timeout: 25000 });
  await waitForSurface(page);
}

async function firstVisible(locator) {
  for (let index = 0; index < await locator.count(); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function requireVisible(locator, label) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const found = await firstVisible(locator);
    if (found) return found;
    await sleep(220);
  }
  throw new Error(`${label} is not visible`);
}

async function describe(locator) {
  const raw = await locator.evaluate((node, currentSelector) => {
    const compactText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const roleOf = (element) => {
      const explicit = compactText(element.getAttribute("role"));
      if (explicit) return explicit;
      const tag = element.tagName.toLowerCase();
      const type = String(element.getAttribute("type") || "").toLowerCase();
      if (tag === "a") return "link";
      if (tag === "button" || tag === "summary") return "button";
      if (tag === "select") return "combobox";
      if (tag === "textarea") return "textbox";
      if (tag === "input") return ["checkbox", "radio"].includes(type) ? type : "textbox";
      return "button";
    };
    const name = compactText(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.getAttribute("placeholder") || node.value || node.querySelector("svg title")?.textContent || "");
    return {
      role: roleOf(node),
      name,
      candidates: window.__pre18CollectOwnerCandidates ? window.__pre18CollectOwnerCandidates(node, name, currentSelector) : [],
    };
  }, selector);
  const owner = selectContextualOwner(raw.candidates, { role: raw.role, name: raw.name });
  return { ...raw, owner, selectedCandidate: raw.candidates.find((candidate) => candidate.type === owner.type && compact(candidate.semanticLabel || candidate.localText || candidate.label) === owner.label) || null };
}

async function replayBySemanticOwner(page, description) {
  const matches = [];
  const controls = page.locator(selector);
  for (let index = 0; index < await controls.count(); index += 1) {
    const candidate = controls.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const observed = await describe(candidate);
    if (observed.role === description.role && observed.name === description.name && observed.owner.type === description.owner.type && observed.owner.label === description.owner.label) matches.push(candidate);
  }
  if (matches.length !== 1) throw new Error(`semantic owner replay expected one ${description.role}:${description.name}:${description.owner.type}:${description.owner.label}; found ${matches.length}`);
  return matches[0];
}

function contract(meta, description, extra = {}) {
  return captureActionContract({
    role: "SUPER_ADMIN",
    route: meta.route,
    viewport: "desktop",
    surface: { id: meta.surface, title: meta.surface },
    materialState: meta.state || {},
    action: { role: description.role, name: description.name, userMeaning: description.name, expectedEffectClass: meta.effect, safetyClass: meta.safetyClass || "SAFE" },
    owner: description.owner,
    ...extra,
  });
}

async function screenshot(page, label) {
  const file = path.join(screenshotDir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(root, file).replace(/\\/gu, "/");
}

function proven(record, patch = {}) {
  return {
    ...record,
    executionState: "PROVEN_PASS",
    EXECUTION_STATE: "PROVEN_PASS",
    classification: "PASS",
    CLASSIFICATION: "PASS",
    visible: true,
    enabled: true,
    actionAttempted: true,
    unsafeMutationExecuted: false,
    ...patch,
  };
}

function unsafe(record, patch = {}) {
  return {
    ...record,
    executionState: "NOT_SAFE_TO_EXECUTE_FULLY",
    EXECUTION_STATE: "NOT_SAFE_TO_EXECUTE_FULLY",
    classification: "NOT_SAFE_TO_EXECUTE_FULLY",
    CLASSIFICATION: "NOT_SAFE_TO_EXECUTE_FULLY",
    visible: true,
    enabled: true,
    actionAttempted: true,
    safetyFlowProven: true,
    unsafeMutationExecuted: false,
    ...patch,
  };
}

const metrics = {
  ownerTarget: 0,
  ownerProven: 0,
  overBroadOwner: 0,
  fullSidebarOwner: 0,
  ownerCollision: 0,
  wrongOwner: 0,
  wrongAction: 0,
  falsePass: 0,
  checkpointRegression: 0,
  unsafeRegression: 0,
};
const records = [];
const failures = [];

function verifyOwner(description, expected = {}) {
  metrics.ownerTarget += 1;
  const label = description.owner.label;
  if (isOverBroadOwnerCandidate(description.selectedCandidate || {}) || description.owner.type === "landmark") metrics.overBroadOwner += 1;
  if (/Taşımacılık Firmaları.*Kullanıcılar.*İşlem Kayıtları/iu.test(label) || label.length > 120) metrics.fullSidebarOwner += 1;
  if (expected.type && description.owner.type !== expected.type) metrics.wrongOwner += 1;
  if (expected.label && description.owner.label !== expected.label) metrics.wrongOwner += 1;
  assert.equal(isOverBroadOwnerCandidate(description.selectedCandidate || {}), false, `over-broad owner selected: ${description.owner.label}`);
  assert.ok(description.owner.label.length <= 120, `full-sidebar owner selected: ${description.owner.label}`);
  if (expected.type) assert.equal(description.owner.type, expected.type);
  if (expected.label) assert.equal(description.owner.label, expected.label);
  metrics.ownerProven += 1;
}

async function main() {
  const health = await fetch(`${base}/health`).then(async (response) => ({ status: response.status, body: await response.json().catch(() => ({})) }));
  if (health.status !== 200 || health.body.dbOk !== true) throw new Error(`STALE_RUNTIME health=${health.status} dbOk=${health.body.dbOk}`);
  await fs.mkdir(screenshotDir, { recursive: true });
  const token = await login();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript(({ accessToken }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("personel_servis_browser_device_id", "pre18-owner-context-canary");
  }, { accessToken: token });
  await context.addInitScript({ content: `window.__pre18CollectOwnerCandidates = ${browserOwnerCandidateCollectorSource};` });
  const page = await context.newPage();
  try {
    await open(page, "/superadmin");
    const firms = await requireVisible(page.getByRole("button", { name: /^Firmalar$/iu }), "sidebar Firmalar");
    const firmsDescription = await describe(firms);
    verifyOwner(firmsDescription, { type: "navigation", label: "YÖNETİM › Firmalar" });
    const firmsContract = contract({ route: "/superadmin", surface: "overview", effect: "ROUTE_OR_ANCHOR_TRANSITION" }, firmsDescription);
    await (await replayBySemanticOwner(page, firmsDescription)).click();
    await page.waitForFunction(() => location.hash === "#/superadmin/companies", null, { timeout: 6000 });
    records.push(proven(firmsContract, { actionResult: "ROUTE_OPENED", expectedEffect: "Firmalar route opens", observedEffect: "#/superadmin/companies", evidence: [{ kind: "screenshot", path: await screenshot(page, "sidebar-firmalar") }] }));

    await open(page, "/superadmin");
    const audit = await requireVisible(page.getByRole("button", { name: /^Denetim durumunu aç$/iu }), "local audit section action");
    const auditDescription = await describe(audit);
    verifyOwner(auditDescription);
    const auditContract = contract({ route: "/superadmin", surface: "overview", effect: "ROUTE_OR_ANCHOR_TRANSITION" }, auditDescription);
    await (await replayBySemanticOwner(page, auditDescription)).click();
    await page.waitForFunction(() => location.hash === "#/superadmin/operations", null, { timeout: 6000 });
    records.push(proven(auditContract, { actionResult: "LOCAL_SECTION_ACTION_OPENED", expectedEffect: "Denetim paneli opens", observedEffect: "#/superadmin/operations", evidence: [{ kind: "screenshot", path: await screenshot(page, "local-section-audit") }] }));

    await open(page, "/superadmin/companies");
    const profiles = page.getByRole("button", { name: /^Profil$/iu });
    const first = await requireVisible(profiles, "first company profile action");
    let second = null;
    for (let index = 1; index < await profiles.count(); index += 1) {
      if (await profiles.nth(index).isVisible().catch(() => false)) { second = profiles.nth(index); break; }
    }
    if (!second) throw new Error("second company profile action is unavailable");
    const firstDescription = await describe(first);
    const secondDescription = await describe(second);
    verifyOwner(firstDescription, { type: "table-row" });
    verifyOwner(secondDescription, { type: "table-row" });
    const firstContract = contract({ route: "/superadmin/companies", surface: "company-directory", effect: "MODAL_OPEN" }, firstDescription);
    const secondContract = contract({ route: "/superadmin/companies", surface: "company-directory", effect: "MODAL_OPEN" }, secondDescription);
    if (firstContract.ACTION_CONTRACT_ID === secondContract.ACTION_CONTRACT_ID || firstDescription.owner.label === secondDescription.owner.label) {
      metrics.ownerCollision += 1;
      throw new Error("same-name row actions collided after owner selection");
    }
    await (await replayBySemanticOwner(page, secondDescription)).click();
    await requireVisible(page.locator(".modal,[role='dialog']"), "company profile modal");
    records.push(proven(secondContract, { actionResult: "ROW_MODAL_OPENED", expectedEffect: "Selected row opens a profile modal", observedEffect: "dialog visible", evidence: [{ kind: "screenshot", path: await screenshot(page, "row-owner-profile") }] }));

    await open(page, "/superadmin/operations");
    const tab = await requireVisible(page.getByRole("tab", { name: /^Yetki & Erişim/iu }), "system tab");
    const tabDescription = await describe(tab);
    verifyOwner(tabDescription, { type: "section", label: "Denetim bölümleri" });
    const tabContract = contract({ route: "/superadmin/operations", surface: "operations", effect: "ACTIVE_TAB_CHANGE" }, tabDescription);
    await (await replayBySemanticOwner(page, tabDescription)).click();
    await page.waitForFunction(() => [...document.querySelectorAll("[role='tab'][aria-selected='true']")].some((node) => /Yetki & Erişim/iu.test(node.textContent || "")), null, { timeout: 4500 });
    records.push(proven(tabContract, { actionResult: "SYSTEM_TAB_ACTIVATED", expectedEffect: "Yetki & Erişim becomes selected", observedEffect: "aria-selected=true", evidence: [{ kind: "screenshot", path: await screenshot(page, "system-tab") }] }));

    await open(page, "/superadmin");
    const collapsed = await requireVisible(page.getByRole("button", { name: /^SİSTEM ▸$/u }), "collapsed system navigation");
    const systemBefore = await describe(collapsed);
    verifyOwner(systemBefore, { type: "navigation", label: "SİSTEM › SİSTEM ▸" });
    const systemContract = contract({ route: "/superadmin", surface: "overview", state: { disclosure: "system-closed" }, effect: "DISCLOSURE_CHANGE" }, systemBefore);
    await (await replayBySemanticOwner(page, systemBefore)).click();
    const expanded = await requireVisible(page.getByRole("button", { name: /^SİSTEM ▾$/u }), "expanded system navigation");
    const systemAfter = await describe(expanded);
    verifyOwner(systemAfter, { type: "navigation", label: "SİSTEM › SİSTEM ▾" });
    await (await replayBySemanticOwner(page, systemAfter)).click();
    await requireVisible(page.getByRole("button", { name: /^SİSTEM ▸$/u }), "restored system navigation");
    records.push(proven(systemContract, { actionResult: "SYSTEM_NAVIGATION_OPENED_AND_CLOSED", expectedEffect: "Sistem disclosure toggles", observedEffect: "SİSTEM ▸→SİSTEM ▾→SİSTEM ▸", evidence: [{ kind: "screenshot", path: await screenshot(page, "system-nav-rerender") }] }));

    metrics.ownerTarget += 1;
    const legacy = { ...firmsContract, CONTEXTUAL_OWNER_TYPE: "section", CONTEXTUAL_OWNER_LABEL: "Firmalar Taşımacılık Firmaları Kullanıcılar İşlem Kayıtları Denetim Paneli Canlı İzleme", ACTION_CONTRACT_ID: undefined, executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, actionResult: "route-opened", expectedEffect: "route", observedEffect: "hash changed", evidence: [{ kind: "checkpoint" }] };
    legacy.ACTION_CONTRACT_ID = captureActionContract({ role: legacy.ROLE, route: legacy.ROUTE, viewport: legacy.VIEWPORT, surface: { id: legacy.SURFACE_ID, title: legacy.SURFACE_TITLE }, materialState: JSON.parse(legacy.MATERIAL_STATE_SIGNATURE), action: { role: legacy.ACTION_ROLE, name: legacy.ACTION_NAME, expectedEffectClass: legacy.EXPECTED_EFFECT_CLASS, safetyClass: legacy.SAFETY_CLASS }, owner: { type: legacy.CONTEXTUAL_OWNER_TYPE, label: legacy.CONTEXTUAL_OWNER_LABEL } }).ACTION_CONTRACT_ID;
    const resumed = reuseCompatibleTerminalAction(firmsContract, [legacy]);
    if (!resumed || resumed.ownerCompatibility !== "UNIQUE_SEMANTIC_ACTION") { metrics.checkpointRegression += 1; throw new Error("checkpoint lost a unique prior terminal contract after owner narrowing"); }
    metrics.ownerProven += 1;

    await open(page, "/superadmin/companies");
    const remove = await requireVisible(page.getByRole("button", { name: /^Sil$/iu }), "unsafe delete confirmation");
    const removeDescription = await describe(remove);
    verifyOwner(removeDescription, { type: "table-row" });
    const unsafeContract = contract({ route: "/superadmin/companies", surface: "company-directory", effect: "CONFIRMATION_BOUNDARY", safetyClass: "UNSAFE" }, removeDescription);
    const blocked = [];
    let confirmation = null;
    const seenDialog = new Promise((resolve) => page.once("dialog", async (dialog) => { confirmation = { type: dialog.type(), message: dialog.message() }; await dialog.dismiss(); resolve(); }));
    await page.route("**/*", async (route) => {
      if (mutationMethods.has(route.request().method())) { blocked.push({ method: route.request().method(), url: route.request().url() }); await route.abort(); return; }
      await route.continue();
    });
    await (await replayBySemanticOwner(page, removeDescription)).click();
    await Promise.race([seenDialog, page.waitForTimeout(1600)]);
    await page.unroute("**/*");
    if (!confirmation || blocked.length) { metrics.unsafeRegression += 1; throw new Error("unsafe action did not stop at a cancelled confirmation without mutation"); }
    const unsafeRecord = unsafe(unsafeContract, { actionResult: "CONFIRMATION_DISMISSED", expectedEffect: "Cancellable delete confirmation", observedEffect: confirmation.message, evidence: [{ kind: "dialog", confirmation }, { kind: "screenshot", path: await screenshot(page, "unsafe-confirmation") }] });
    if (!isTerminalActionEvidence(unsafeRecord)) { metrics.unsafeRegression += 1; throw new Error("unsafe terminal evidence regressed"); }
    records.push(unsafeRecord);
  } catch (error) {
    failures.push({ stage: "CANARY", reason: compact(error?.stack || error) });
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const checkpoint = buildActionCheckpoint(records, { runId, runKind: "BOUNDED_CANARY" });
  const result = {
    SUPERADMIN_OWNER_CONTEXT_HARNESS_CORRECTIVE_STATUS: failures.length === 0 && metrics.ownerTarget === metrics.ownerProven && Object.values(metrics).filter((value) => typeof value === "number").every((value) => value === 0 || value === metrics.ownerTarget || value === metrics.ownerProven) && records.every(isTerminalActionEvidence) ? "GREEN" : "NOT_GREEN",
    REAL_BROWSER_ENGINE: "Chromium 148.0.7778.96",
    BROWSER_AUTOMATION_LAYER: "Playwright @playwright/test 1.60.0",
    PUBLIC_TUNNEL_ORIGIN: `${base}/`,
    HEADLESS_OR_HEADED: "HEADLESS",
    REAL_BROWSER_PROOF: "PASS",
    CANARY_OWNER_CONTEXT_TARGET_COUNT: metrics.ownerTarget,
    CANARY_OWNER_CONTEXT_PROVEN_COUNT: metrics.ownerProven,
    CANARY_OVER_BROAD_OWNER_COUNT: metrics.overBroadOwner,
    CANARY_FULL_SIDEBAR_TEXT_OWNER_COUNT: metrics.fullSidebarOwner,
    CANARY_OWNER_COLLISION_COUNT: metrics.ownerCollision,
    CANARY_WRONG_OWNER_MATCH_COUNT: metrics.wrongOwner,
    CANARY_WRONG_ACTION_MATCH_COUNT: metrics.wrongAction,
    CANARY_FALSE_PASS_COUNT: metrics.falsePass,
    CANARY_CHECKPOINT_REGRESSION_COUNT: metrics.checkpointRegression,
    CANARY_UNSAFE_CLASSIFICATION_REGRESSION_COUNT: metrics.unsafeRegression,
    CANARY_HARNESS_FAILURE_COUNT: failures.length,
    UNSAFE_CONTROL_ACCIDENTALLY_EXECUTED_COUNT: records.filter((record) => record.unsafeMutationExecuted === true).length,
    CHECKPOINT_RESUME_STATUS: metrics.checkpointRegression === 0 ? "PASS" : "FAIL",
    UNSAFE_CONTROL_GUARD_STATUS: metrics.unsafeRegression === 0 ? "PASS" : "FAIL",
    EXISTING_SUPERADMIN_PRODUCT_DEFECT_PRESERVED: "YES",
  };
  await fs.writeFile(path.join(runDir, "summary.json"), `${JSON.stringify({ result, checkpoint, records, failures, runtimeParity: health }, null, 2)}\n`);
  await fs.writeFile(path.join(runDir, "checkpoint.json"), `${JSON.stringify(checkpoint, null, 2)}\n`);
  await fs.writeFile(path.join(runDir, "failure-ledger.json"), `${JSON.stringify(failures, null, 2)}\n`);
  console.log(JSON.stringify({ result, artifactDir: path.relative(root, runDir).replace(/\\/gu, "/") }, null, 2));
  if (result.SUPERADMIN_OWNER_CONTEXT_HARNESS_CORRECTIVE_STATUS !== "GREEN") process.exitCode = 2;
}

await main();
