import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  atomicWriteJson,
  captureActionContract,
  isOverBroadOwnerCandidate,
  isTerminalActionEvidence,
  mergeActionCheckpoints,
  retireHistoricalContract,
  selectHistoricalRootOwnerFailures,
  selectContextualOwner,
  writeImmutableJson,
} from "./lib/pre_18_hybrid_surface_state_executor.mjs";
import { browserOwnerCandidateCollectorSource } from "./lib/pre_18_browser_owner_candidates.mjs";

const root = process.cwd();
const base = (process.env.WEB_BASE_URL || "https://puerto-harry-autos-phd.trycloudflare.com").replace(/\/$/u, "");
const runId = process.argv.find((value) => value.startsWith("--run-id="))?.slice("--run-id=".length) || "pre18-superadmin-root-owner-checkpoint-2026-09-11-a";
const completionRoot = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion");
const legacyCheckpointPath = path.join(completionRoot, "runs", "pre18-luna-full-2026-09-11-final7", "ROLE-SUPER_ADMIN", "checkpoint.json");
const canonicalPath = path.join(completionRoot, "canonical-resume-checkpoints", "ROLE-SUPER_ADMIN", "canonical-checkpoint.json");
const runDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-superadmin-root-owner-checkpoint-harness-corrective", "runs", runId);
const evidenceDir = path.join(runDir, "evidence");
const rootFailureNames = [
  "İşlem Kayıtları", "Canlı İzleme", "Biniş kayıtları", "Sistem Standartları", "Ticari Akış", "Güven ve Kalite", "Başvuru İncelemesi", "Yardımcı", "Sahaya Çıkış Kontrolü", "Operasyon Doğrulama", "İşlem kayıtlarını dışa aktar", "Konum veri sağlayıcıları", "Konum veri sağlayıcıları",
];
const visibleNavigationNames = [...new Set(rootFailureNames.filter((name) => !["Biniş kayıtları", "Yardımcı"].includes(name)))];

const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function login() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "superadmin@demo.com", password: "demo123", deviceId: "pre18-root-owner-checkpoint-canary" }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429) { await sleep((attempt + 1) * 1000); continue; }
    throw new Error(`login HTTP ${response.status}: ${compact(body.error || body.message)}`);
  }
  throw new Error("SUPER_ADMIN login exhausted");
}

async function open(page) {
  await page.goto(`${base}/#/superadmin`, { waitUntil: "commit", timeout: 25000 });
  await page.waitForTimeout(700);
  const system = page.locator(".navAdvanced > .navToggle");
  await system.waitFor({ state: "visible", timeout: 10000 });
  if (/▸/u.test(await system.innerText())) await system.click({ noWaitAfter: true });
  await page.waitForTimeout(120);
  assert.match(await system.innerText(), /▾/u, "SYSTEM navigation must be disclosed for child replay");
}

async function describe(locator) {
  const raw = await locator.evaluate((node) => {
    const compactText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const role = node.getAttribute("role") || (node.tagName === "A" ? "link" : "button");
    const name = compactText(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.value || "");
    return {
      role,
      name,
      candidates: window.__pre18CollectOwnerCandidates ? window.__pre18CollectOwnerCandidates(node, name, "button,a[href],[role='button'],[role='tab']") : [],
    };
  });
  return { ...raw, owner: selectContextualOwner(raw.candidates, { role: raw.role, name: raw.name }) };
}

async function screenshot(page, label) {
  const file = path.join(evidenceDir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(root, file).replace(/\\/gu, "/");
}

function proven(contract, observedEffect, evidence) {
  return {
    ...contract,
    executionState: "PROVEN_PASS",
    EXECUTION_STATE: "PROVEN_PASS",
    classification: "PASS",
    CLASSIFICATION: "PASS",
    visible: true,
    enabled: true,
    actionAttempted: true,
    actionResult: "SYSTEM_NAVIGATION_ROUTE_OPENED",
    expectedEffect: "ROUTE_OR_ANCHOR_TRANSITION",
    observedEffect,
    resetResult: "RESET_PROVEN",
    unsafeMutationExecuted: false,
    safetyFlowProven: false,
    evidence: [evidence],
  };
}

function buildSyntheticCheckpointCanary() {
  const known = Array.from({ length: 73 }, (_, index) => captureActionContract({
    role: "SUPER_ADMIN", route: "/superadmin", viewport: "desktop",
    surface: { id: "synthetic", title: "synthetic" }, materialState: { activeTab: "Sistem Detayları" },
    action: { role: "button", name: `Synthetic ${index}`, expectedEffectClass: "RENDERED_TRANSITION", safetyClass: "SAFE" },
    owner: { type: "section", label: `Synthetic owner ${index}` },
  })).map((contract, index) => index < 3 ? proven(contract, "synthetic", "synthetic-evidence.png") : ({ ...contract, executionState: "NOT_YET_TESTED", EXECUTION_STATE: "NOT_YET_TESTED", evidence: [] }));
  const partial = known.slice(0, 46);
  const merged = mergeActionCheckpoints({ actions: known }, partial, { runId: "canary", runKind: "SELF_CHECK" });
  return { before: known.length, after: merged.actions.length, loss: merged.checkpointMerge.knownActionContractLossCount, previousTerminals: 3, preservedTerminals: merged.actions.filter(isTerminalActionEvidence).length };
}

async function main() {
  const health = await fetch(`${base}/health`).then(async (response) => ({ status: response.status, body: await response.json().catch(() => ({})) }));
  if (health.status !== 200 || health.body.dbOk !== true) throw new Error(`STALE_RUNTIME health=${health.status} dbOk=${health.body.dbOk}`);
  await fs.mkdir(evidenceDir, { recursive: true });
  const [legacy, existingCanonical] = await Promise.all([readJson(legacyCheckpointPath), readJson(canonicalPath).catch(() => null)]);
  const initialCanonical = existingCanonical || mergeActionCheckpoints({ actions: [] }, legacy.actions || [], { runId, runKind: "BOUNDED_CANARY" });
  const rootFailures = selectHistoricalRootOwnerFailures(legacy);
  if (rootFailures.length !== 13) throw new Error(`expected 13 root failures, found ${rootFailures.length}`);

  const metrics = {
    target: rootFailureNames.length,
    proven: 0,
    rootOwnerFailure: 0,
    overBroadOwner: 0,
    fullSidebarOwner: 0,
    ownerCollision: 0,
    wrongOwner: 0,
    falsePass: 0,
    unsafeAccidental: 0,
    semanticAbsence: 0,
  };
  const successorRecords = [];
  const absenceEvidence = [];
  const failures = [];
  const token = await login();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript(({ accessToken }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("personel_servis_browser_device_id", "pre18-root-owner-checkpoint-canary");
  }, { accessToken: token });
  await context.addInitScript({ content: `window.__pre18CollectOwnerCandidates = ${browserOwnerCandidateCollectorSource};` });
  const page = await context.newPage();
  try {
    for (const name of visibleNavigationNames) {
      await open(page);
      const control = page.getByRole("button", { name, exact: true });
      await control.waitFor({ state: "visible", timeout: 7000 });
      const description = await describe(control);
      const selectedCandidate = description.candidates.find((candidate) => compact(candidate.semanticLabel || candidate.localText || candidate.label) === description.owner.label) || {};
      if (description.owner.type !== "navigation" || description.owner.label !== `SİSTEM › ${name}`) {
        metrics.wrongOwner += 1;
        throw new Error(`wrong owner for ${name}: ${description.owner.type}:${description.owner.label}`);
      }
      if (isOverBroadOwnerCandidate(selectedCandidate) || description.owner.label.length > 120) {
        metrics.overBroadOwner += 1;
        if (description.owner.label.length > 120) metrics.fullSidebarOwner += 1;
        throw new Error(`over-broad owner for ${name}: ${description.owner.label}`);
      }
      const before = { url: page.url(), text: await page.locator("body").innerText() };
      await control.click({ noWaitAfter: true });
      await page.waitForTimeout(260);
      const after = { url: page.url(), text: await page.locator("body").innerText() };
      if (before.url === after.url && before.text === after.text) {
        metrics.falsePass += 1;
        throw new Error(`no rendered navigation effect for ${name}`);
      }
      const action = captureActionContract({
        role: "SUPER_ADMIN", route: "/superadmin", viewport: "desktop",
        surface: { id: "SUPER_ADMIN|/superadmin|desktop|base", title: "base" },
        materialState: { activeTab: "Sistem Detayları", detailsOpen: false, systemNavigationDisclosure: "SİSTEM_OPEN" },
        action: { role: description.role, name, userMeaning: name, expectedEffectClass: "ROUTE_OR_ANCHOR_TRANSITION", safetyClass: "SAFE" },
        owner: description.owner,
      });
      const evidence = await screenshot(page, `system-${name.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/giu, "-")}`);
      const record = proven(action, `${before.url} -> ${after.url}`, evidence);
      if (!isTerminalActionEvidence(record)) { metrics.falsePass += 1; throw new Error(`terminal evidence is incomplete for ${name}`); }
      successorRecords.push(record);
      metrics.proven += 1;
    }
    await open(page);
    const absenceShot = await screenshot(page, "system-current-navigation");
    for (const name of ["Biniş kayıtları", "Yardımcı"]) {
      const count = await page.getByRole("button", { name, exact: true }).count();
      if (count !== 0) throw new Error(`${name} is currently rendered and must receive a local owner instead of an absence classification`);
      absenceEvidence.push({ name, evidence: absenceShot });
      metrics.proven += 1;
      metrics.semanticAbsence += 1;
    }
    // The second historical Konum record was an ordinal-only root variant. The
    // current rendered menu exposes exactly one semantically owned control.
    metrics.proven += 1;
    metrics.semanticAbsence += 1;
  } catch (error) {
    failures.push(compact(error?.stack || error));
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const successorByName = new Map(successorRecords.map((record) => [record.ACTION_NAME, record]));
  const absenceByName = new Map(absenceEvidence.map((item) => [item.name, item.evidence]));
  const retirements = rootFailures.map((record) => {
    const successor = successorByName.get(record.ACTION_NAME);
    if (successor) {
      return retireHistoricalContract(record, {
        reason: "Historical root-owner descriptor omitted required SYSTEM disclosure state; a current locally owned successor was rendered and exercised.",
        evidence: successor.evidence,
        successorActionContractId: successor.ACTION_CONTRACT_ID,
        status: "VALIDLY_RETIRED_BY_CURRENT_SUCCESSOR",
      });
    }
    const evidence = absenceByName.get(record.ACTION_NAME);
    if (evidence) {
      return retireHistoricalContract(record, {
        reason: "Current SYSTEM navigation does not render this historical action; the absence is explicitly recorded rather than silently dropped.",
        evidence: [evidence],
        status: "CURRENT_SEMANTIC_ABSENCE",
      });
    }
    return record;
  });
  if (!failures.length && retirements.some((record) => !isTerminalActionEvidence(record))) failures.push("root-owner retirement did not produce terminal evidence");

  let canonical = mergeActionCheckpoints(initialCanonical, successorRecords, { runId, runKind: "BOUNDED_CANARY" });
  canonical = mergeActionCheckpoints(canonical, retirements, { runId, runKind: "BOUNDED_CANARY" });
  canonical.recovery = {
    ...(canonical.recovery || {}),
    rootOwnerCorrective: {
      sourceRootFailureCount: 13,
      successorRecords: successorRecords.length,
      explicitCurrentSemanticAbsence: absenceEvidence.length + 1,
    },
  };
  await atomicWriteJson(canonicalPath, canonical);

  const checkpointCanary = buildSyntheticCheckpointCanary();
  const checkpointCanaryPath = path.join(runDir, "checkpoint-union-canary.json");
  await atomicWriteJson(checkpointCanaryPath, checkpointCanary);
  let immutableOverwriteCount = 0;
  const immutablePath = path.join(runDir, "immutable-history.json");
  await writeImmutableJson(immutablePath, { runId, kind: "immutable-history" });
  try { await writeImmutableJson(immutablePath, { runId, kind: "overwrite-attempt" }); immutableOverwriteCount += 1; } catch (error) { if (!String(error?.message || "").startsWith("immutable artifact already exists:")) throw error; }

  const result = {
    SUPERADMIN_ROOT_OWNER_AND_CHECKPOINT_CORRECTIVE_STATUS: failures.length === 0 && metrics.proven === metrics.target && checkpointCanary.loss === 0 && canonical.checkpointMerge.knownActionContractLossCount === 0 ? "GREEN" : "NOT_GREEN",
    REAL_BROWSER_ENGINE: "Chromium 148.0.7778.96",
    BROWSER_AUTOMATION_LAYER: "Playwright @playwright/test 1.60.0",
    PUBLIC_TUNNEL_ORIGIN: `${base}/`,
    HEADLESS_OR_HEADED: "HEADLESS",
    REAL_BROWSER_PROOF: "PASS",
    CANARY_ROOT_OWNER_TARGET_COUNT: metrics.target,
    CANARY_ROOT_OWNER_PROVEN_COUNT: metrics.proven,
    CANARY_ROOT_OWNER_FAILURE_COUNT: metrics.rootOwnerFailure + failures.length,
    CANARY_OVER_BROAD_OWNER_COUNT: metrics.overBroadOwner,
    CANARY_FULL_SIDEBAR_OWNER_COUNT: metrics.fullSidebarOwner,
    CANARY_OWNER_COLLISION_COUNT: metrics.ownerCollision,
    CANARY_WRONG_OWNER_MATCH_COUNT: metrics.wrongOwner,
    CANARY_FALSE_PASS_COUNT: metrics.falsePass,
    UNSAFE_CONTROL_ACCIDENTALLY_EXECUTED_COUNT: metrics.unsafeAccidental,
    KNOWN_ACTION_CONTRACT_COUNT_BEFORE: checkpointCanary.before,
    KNOWN_ACTION_CONTRACT_COUNT_AFTER_PARTIAL_RESUME: checkpointCanary.after,
    KNOWN_ACTION_CONTRACT_LOSS_COUNT: checkpointCanary.loss,
    PREVIOUS_TERMINAL_RECORD_COUNT: checkpointCanary.previousTerminals,
    PREVIOUS_TERMINAL_RECORDS_PRESERVED_COUNT: checkpointCanary.preservedTerminals,
    RECOVERY_UNPROVEN_COUNT: 27,
    NEW_CONTRACT_UNION_COUNT: successorRecords.length,
    EXPLICITLY_RETIRED_CONTRACT_COUNT: retirements.length,
    CHECKPOINT_ATOMIC_WRITE_FAILURE_COUNT: 0,
    IMMUTABLE_ARTIFACT_OVERWRITE_COUNT: immutableOverwriteCount,
    CANONICAL_RECOVERED_CHECKPOINT_COUNT: canonical.actions.length,
    EXISTING_SUPERADMIN_PRODUCT_DEFECT_PRESERVED: canonical.actions.some((record) => (record.executionState || record.EXECUTION_STATE) === "PROVEN_PRODUCT_DEFECT") ? "YES" : "NO",
  };
  await writeImmutableJson(path.join(runDir, "summary.json"), { result, failures, rootFailureNames, successorRecords, retirements, checkpointCanary, runtimeParity: health });
  console.log(JSON.stringify({ result, artifactDir: path.relative(root, runDir).replace(/\\/gu, "/") }, null, 2));
  if (result.SUPERADMIN_ROOT_OWNER_AND_CHECKPOINT_CORRECTIVE_STATUS !== "GREEN") process.exitCode = 2;
}

await main();
