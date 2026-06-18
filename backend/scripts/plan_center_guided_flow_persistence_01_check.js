#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const HEADLESS = String(process.env.HEADLESS ?? "true").toLowerCase() !== "false";
const SLOW_MO = Number(process.env.SLOW_MO || 0) || 0;

const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "PLAN_CENTER_GUIDED_FLOW_PERSISTENCE_01");
const reportJsonPath = path.join(artifactRoot, "report.json");
const reportMdPath = path.join(artifactRoot, "report.md");

const DEMO_USER = { identifier: "company@demo.com", password: "demo123" };

function nextSelectableWeekdayIsoDate(minDaysAhead = 1) {
  const candidate = new Date();
  candidate.setDate(candidate.getDate() + Number(minDaysAhead || 1));
  while (candidate.getDay() === 0 || candidate.getDay() === 6) {
    candidate.setDate(candidate.getDate() + 1);
  }
  const year = candidate.getFullYear();
  const month = String(candidate.getMonth() + 1).padStart(2, "0");
  const day = String(candidate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function loginCompany() {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: DEMO_USER.identifier,
      password: DEMO_USER.password,
      deviceId: "plan-center-guided-flow-persistence-01",
      deviceName: "Plan Center Guided Flow Persistence 01",
    }),
  });
  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = { raw };
  }
  if (!response.ok || !payload?.token) {
    throw new Error(`LOGIN_FAIL ${response.status}${raw ? ` ${raw.slice(0, 180)}` : ""}`);
  }
  return payload.token;
}

async function waitVisible(locator, timeout = 15000) {
  await locator.waitFor({ state: "visible", timeout });
}

async function waitForInputValue(scope, value, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const found = await scope
      .locator("input")
      .evaluateAll((nodes, expected) => nodes.some((node) => node.value === expected), String(value))
      .catch(() => false);
    if (found) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("WAIT_INPUT_VALUE_TIMEOUT");
}

async function getComputedZIndex(locator) {
  const raw = await locator.evaluate((el) => globalThis.getComputedStyle(el).zIndex).catch(() => "0");
  const value = Number.parseInt(String(raw || "0"), 10);
  return Number.isFinite(value) ? value : 0;
}

async function isActiveElement(locator) {
  return locator.evaluate((el) => globalThis.document?.activeElement === el).catch(() => false);
}

async function fillInputAfterLabel(scope, labelText, value) {
  const label = scope.locator("label", { hasText: labelText }).first();
  await waitVisible(label);
  const input = label.locator("xpath=following::input[1]");
  await input.fill(String(value));
  return input;
}

function snapshotChecks(checks) {
  return {
    total: checks.length,
    pass: checks.filter((x) => x.ok).length,
    fail: checks.filter((x) => !x.ok).length,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Plan Center Guided Flow Persistence 01");
  lines.push("");
  lines.push(`- Generated at: \`${report.generatedAt}\``);
  lines.push(`- Web base URL: \`${report.webBaseUrl}\``);
  lines.push(`- API base URL: \`${report.apiBaseUrl}\``);
  lines.push(`- Token login: \`${report.login.role}\``);
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  lines.push("| Check | Result |");
  lines.push("| --- | --- |");
  for (const item of report.checks || []) {
    lines.push(`| ${item.name} | ${item.ok ? "PASS" : "FAIL"} |`);
  }
  lines.push("");
  lines.push("## Values");
  lines.push("");
  lines.push(`- Saved hub: \`${report.values.hubLat}\`, \`${report.values.hubLng}\``);
  lines.push(`- Saved start date: \`${report.values.startDate}\``);
  lines.push(`- Saved person: \`${report.values.personName}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- PASS: \`${report.summary.pass}\``);
  lines.push(`- FAIL: \`${report.summary.fail}\``);
  return lines.join("\n");
}

async function main() {
  console.log("=== PLAN CENTER GUIDED FLOW PERSISTENCE 01 ===");
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Artifact root: ${path.relative(repoRoot, artifactRoot).replace(/\\/g, "/")}`);

  const loginToken = await loginCompany();
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO || 0 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
    locale: "tr-TR",
  });
  await context.addInitScript((token) => {
    globalThis.localStorage?.setItem("token", token);
  }, loginToken);

  const page = await context.newPage();
  let copilotRequestBody = null;
  let copilotResponseBody = null;
  page.on("request", (req) => {
    if (!req.url().includes("/api/ai/copilot") || req.method() !== "POST") return;
    try {
      copilotRequestBody = JSON.parse(req.postData() || "{}");
    } catch {
      copilotRequestBody = { raw: req.postData() || "" };
    }
  });
  page.on("response", async (resp) => {
    if (!resp.url().includes("/api/ai/copilot") || resp.request().method() !== "POST") return;
    try {
      copilotResponseBody = await resp.json();
    } catch {
      copilotResponseBody = null;
    }
  });
  const checks = [];
  const values = {
    hubLat: "41.012345",
    hubLng: "29.012345",
    startDate: nextSelectableWeekdayIsoDate(1),
    personName: `Persist-${Date.now()}`,
    personAddress: "Kadikoy, Istanbul",
    personLat: "40.990000",
    personLng: "29.030000",
  };

  try {
    await page.goto(`${WEB_BASE_URL}/#/company`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const preexistingDrawer = page.locator("aside.copilotDrawer");
    if (await preexistingDrawer.isVisible().catch(() => false)) {
      await preexistingDrawer.getByRole("button", { name: "Kapat" }).click().catch(() => {});
      await preexistingDrawer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    }
    await waitVisible(page.getByRole("button", { name: "Rehberi Başlat" }));
    await page.getByRole("button", { name: "Rehberi Başlat" }).click();

    const guideTitle = page.locator("[data-dialog-title]").filter({ hasText: "Rehberli Mod → Yeni Plan" }).first();
    const modal = guideTitle.locator('xpath=ancestor::div[@role="dialog"][1]');
    await waitVisible(modal);

    await fillInputAfterLabel(modal, "Şirket Konumu Lat", values.hubLat);
    await fillInputAfterLabel(modal, "Şirket Konumu Lng", values.hubLng);
    await modal.getByRole("button", { name: "İleri" }).click();
    await waitVisible(modal.getByText("Şirket konumu kaydedildi."));
    await page.waitForTimeout(3000);
    const createDraftButton = modal.getByRole("button", { name: "Taslak vardiya oluştur" });
    await waitVisible(createDraftButton);
    checks.push({ name: "Planlama Merkezi adım 1 açıldı", ok: true });

    await fillInputAfterLabel(modal, "Başlangıç", values.startDate);
    const startInput = modal.locator('input[type="date"]').first();
    const startInputHandle = await startInput.elementHandle();
    if (!startInputHandle) throw new Error("START_INPUT_NOT_FOUND");
    const savedStartValue = await startInput.inputValue();
    checks.push({ name: "Başlangıç tarihi girildi", ok: savedStartValue === values.startDate });

    await createDraftButton.evaluate((el) => {
      if (!(el instanceof globalThis.HTMLButtonElement)) throw new Error("BUTTON_NOT_FOUND");
      if (el.disabled) throw new Error("BUTTON_DISABLED");
      el.click();
    });
    await waitVisible(modal.locator("div.card").filter({ hasText: "Taslak vardiyalar:" }).first());
    checks.push({ name: "Taslak vardiyalar üretildi", ok: true });

    const personSection = modal.getByRole("heading", { name: /Ekle \/ İçe aktar/ }).locator("xpath=ancestor::div[contains(@class,\"card\")][1]");
    await waitVisible(personSection);
    await fillInputAfterLabel(personSection, "Ad Soyad", values.personName);
    await fillInputAfterLabel(personSection, "Adres", values.personAddress);
    await fillInputAfterLabel(personSection, "Enlem (ops.)", values.personLat);
    await fillInputAfterLabel(personSection, "Boylam (ops.)", values.personLng);
    await personSection.getByRole("button", { name: "Ekle" }).click();
    await waitForInputValue(modal, values.personName, 20000);
    checks.push({ name: "Personel satırı eklendi", ok: true });

    const copilotButton = page.getByRole("button", { name: "Sefer Abi’ye Sor" });
    await waitVisible(copilotButton);
    await copilotButton.click();

    const drawer = page.locator("aside.copilotDrawer");
    await waitVisible(drawer);
    const starterChip = drawer.getByRole("button", { name: "Sıradaki doğru işlem ne?", exact: true });
    await waitVisible(starterChip);

    const guideDialog = modal;
    const drawerComposer = drawer.locator("textarea");
    checks.push({
      name: "Rehber ve drawer aynı anda açık",
      ok: await guideDialog.isVisible().catch(() => false) && await drawer.isVisible().catch(() => false),
    });

    await drawerComposer.click();
    checks.push({
      name: "Drawer odağa geldi",
      ok: await isActiveElement(drawerComposer),
    });
    const drawerFocusedZ = await getComputedZIndex(drawer);
    const guideFocusedZ = await getComputedZIndex(guideDialog);
    checks.push({
      name: "Drawer tıklanınca öne geçti",
      ok: drawerFocusedZ > guideFocusedZ,
    });

    await guideTitle.click();
    const guideReactivatedZ = await getComputedZIndex(guideDialog);
    const drawerReactivatedZ = await getComputedZIndex(drawer);
    checks.push({
      name: "Rehber başlığı tıklanınca öne geçti",
      ok: guideReactivatedZ > drawerReactivatedZ,
    });

    await drawerComposer.evaluate((el) => {
      if (!(el instanceof globalThis.HTMLTextAreaElement)) throw new Error("TEXTAREA_NOT_FOUND");
      el.focus();
    });
    const drawerReactivatedAfterGuideZ = await getComputedZIndex(drawer);
    const guideReactivatedAfterDrawerZ = await getComputedZIndex(guideDialog);
    checks.push({
      name: "Drawer yeniden öne geçti",
      ok: drawerReactivatedAfterGuideZ > guideReactivatedAfterDrawerZ,
    });

    await starterChip.click();
    const chipAssistantMessage = drawer.locator(".copilotMsg.assistant").last();
    await waitVisible(chipAssistantMessage, 30000);
    const chipAssistantText = await chipAssistantMessage.innerText().catch(() => "");
    const chipRequestBody = JSON.parse(JSON.stringify(copilotRequestBody || null));
    const chipResponseBody = JSON.parse(JSON.stringify(copilotResponseBody || null));
    checks.push({
      name: "Copilot starter chip işlendi",
      ok: String(chipRequestBody?.message || "") === "Sıradaki doğru işlem ne?"
        && /Sıradaki doğru işlem/i.test(chipAssistantText)
        && /Planlama Merkezi/i.test(chipAssistantText)
        && !/^Bu ekran,\s*planlama merkezi içinde/i.test(chipAssistantText.trim()),
    });
    checks.push({
      name: "Copilot starter chip resolves to NEXT_BEST_ACTION",
      ok: String(chipResponseBody?.questionType || "") === "NEXT_BEST_ACTION"
        && /Planlama Merkezi/i.test(String(chipResponseBody?.reply || ""))
        && !/^Bu ekran,\s*planlama merkezi içinde/i.test(String(chipResponseBody?.reply || "").trim()),
    });

    const composer = drawer.locator("textarea");
    await waitVisible(composer);
    await composer.fill("Sıradaki doğru işlem ne?");
    checks.push({
      name: "Drawer yazılabilir kaldı",
      ok: await isActiveElement(composer),
    });
    await drawer.getByRole("button", { name: "Sor", exact: true }).evaluate((el) => {
      if (!(el instanceof globalThis.HTMLButtonElement)) throw new Error("BUTTON_NOT_FOUND");
      el.click();
    });
    const assistantMessage = drawer.locator(".copilotMsg.assistant").last();
    await waitVisible(assistantMessage, 30000);
    const assistantText = await assistantMessage.innerText().catch(() => "");
    const typedRequestBody = JSON.parse(JSON.stringify(copilotRequestBody || null));
    const typedResponseBody = JSON.parse(JSON.stringify(copilotResponseBody || null));
    checks.push({
      name: "Sefer Abi typed soru işlendi",
      ok: String(typedRequestBody?.message || "") === "Sıradaki doğru işlem ne?"
        && /Sıradaki doğru işlem/i.test(assistantText)
        && /Planlama Merkezi/i.test(assistantText)
        && !/^Bu ekran,\s*planlama merkezi içinde/i.test(assistantText.trim()),
    });
    checks.push({
      name: "Copilot request carries guided modal signals",
      ok: Boolean(
        Array.isArray(typedRequestBody?.conversationState?.uiSurface?.modalTitles)
          && typedRequestBody.conversationState.uiSurface.modalTitles.some((label) => /Rehberli Mod/i.test(String(label || "")))
          && Array.isArray(typedRequestBody?.conversationState?.uiSurface?.visibleButtons)
          && typedRequestBody.conversationState.uiSurface.visibleButtons.some((row) => /Taslak vardiya oluştur|Geri/i.test(String(row?.label || "")))
      ),
    });
    checks.push({
      name: "Copilot response resolves to NEXT_BEST_ACTION",
      ok: String(typedResponseBody?.questionType || "") === "NEXT_BEST_ACTION"
        && /Planlama Merkezi/i.test(String(typedResponseBody?.reply || ""))
        && !/^Bu ekran,\s*planlama merkezi içinde/i.test(String(typedResponseBody?.reply || "").trim()),
    });

    await waitVisible(modal.getByText("Rehberli Mod → Yeni Plan"));
    checks.push({ name: "Guided modal drawer açıkken görünür", ok: await modal.isVisible().catch(() => false) });

    await modal.getByRole("button", { name: "Geri" }).click();
    await waitVisible(startInput);
    const startAfterBackWhileDrawerOpen = await startInput.inputValue();
    checks.push({ name: "Drawer açıkken geri çalıştı", ok: startAfterBackWhileDrawerOpen === values.startDate });
    checks.push({
      name: "Drawer açıkken taslak düğmesi görünür",
      ok: await createDraftButton.isVisible().catch(() => false),
    });

    await drawer.getByRole("button", { name: "Kapat" }).evaluate((el) => {
      if (!(el instanceof globalThis.HTMLButtonElement)) throw new Error("BUTTON_NOT_FOUND");
      el.click();
    });
    await drawer.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    checks.push({ name: "Copilot drawer kapandı", ok: !(await drawer.isVisible().catch(() => false)) });

    await waitVisible(modal.getByText("Rehberli Mod → Yeni Plan"));
    await waitVisible(startInput);
    checks.push({ name: "Guided modal açık kaldı", ok: await modal.isVisible().catch(() => false) });
    const startAfterDrawerClose = await startInput.inputValue();
    checks.push({ name: "Başlangıç tarihi korundu", ok: startAfterDrawerClose === values.startDate });
    checks.push({
      name: "Taslak düğmesi görünür kaldı",
      ok: await createDraftButton.isVisible().catch(() => false),
    });

    await modal.getByRole("button", { name: "Geri" }).click();
    const hubLatInput = modal.locator('label', { hasText: "Şirket Konumu Lat" }).first().locator("xpath=following-sibling::input[1]");
    const hubLngInput = modal.locator('label', { hasText: "Şirket Konumu Lng" }).first().locator("xpath=following-sibling::input[1]");
    await waitVisible(hubLatInput);
    await waitVisible(hubLngInput);
    const savedHubLat = await hubLatInput.inputValue();
    const savedHubLng = await hubLngInput.inputValue();
    checks.push({ name: "Hub konumu korundu", ok: savedHubLat === values.hubLat && savedHubLng === values.hubLng });

    const summary = snapshotChecks(checks);
    const report = {
      generatedAt: new Date().toISOString(),
      webBaseUrl: WEB_BASE_URL,
      apiBaseUrl: API_BASE_URL,
      login: { role: "company", identifier: DEMO_USER.identifier },
      values,
      checks,
      summary,
    };

    await ensureDir(artifactRoot);
    await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fs.writeFile(reportMdPath, `${renderMarkdown(report)}\n`, "utf8");

    console.log(`PASS ${summary.pass} / FAIL ${summary.fail}`);
    console.log(`WROTE ${path.relative(repoRoot, reportJsonPath).replace(/\\/g, "/")}`);
    console.log(`WROTE ${path.relative(repoRoot, reportMdPath).replace(/\\/g, "/")}`);

    if (summary.fail > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(async (error) => {
  console.error(error?.stack || error?.message || String(error));
  try {
    await ensureDir(artifactRoot);
  } catch {
    // ignore
  }
  process.exit(1);
});
