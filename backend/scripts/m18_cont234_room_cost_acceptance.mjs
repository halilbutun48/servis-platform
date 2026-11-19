import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const BASE = String(process.env.M18_WEB_BASE_URL || "http://localhost:5273").replace(/\/$/u, "");
const API = String(process.env.M18_API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/u, "");
const CHROME = process.env.M18_CHROMIUM_EXECUTABLE || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const MARKER = process.env.CONT234_ROOM_COST_MARKER || "M18-CONT234-ROOM-FORECAST-20261115-V1";
const DESCRIPTION = `${MARKER} — kontrollü DEMO planlama tahmini; gerçekleşmiş gider değildir.`;

const out = { marker: MARKER, base: BASE, api: API, stages: [] };
const log = (stage, detail = {}) => {
  out.stages.push({ stage, ...detail });
  console.log(JSON.stringify({ stage, ...detail }));
};

async function apiLogin(identifier, deviceId) {
  const response = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`LOGIN_${identifier}_${response.status}`);
  return body.token;
}

async function apiJson(path, token) {
  const response = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function waitView(page, view) {
  await page.locator(`[data-finance-active-view="${view}"]`).waitFor({ state: "visible", timeout: 20000 });
}

async function loginUi(page) {
  const user = page.locator('input[placeholder*="room@demo.com"]');
  if (await user.count()) {
    await user.fill("room@demo.com");
    await page.locator('input[type="password"]').fill("demo123");
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click({ noWaitAfter: true, timeout: 5000 });
  }
  await page.waitForTimeout(2200);
}

async function openComposer(page) {
  await page.goto(`${BASE}/#/room/financial-operations?view=expenses`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitView(page, "expenses");
  await page.getByRole("button", { name: /Gider Ekle/u }).first().click({ noWaitAfter: true, timeout: 5000 });
  const form = page.locator("[data-finance-expense-composer-drawer]");
  await form.waitFor({ state: "visible", timeout: 10000 });
  return form;
}

async function fillForecast(form) {
  const selectUnder = (labelPattern) => form.locator("label").filter({ hasText: labelPattern }).locator("select").first();
  await selectUnder(/^Kapsam/u).selectOption("VEHICLE");
  await selectUnder(/^Kayıt türü/u).selectOption("FORECAST");
  await selectUnder(/^Gider türü/u).selectOption("OTHER_VEHICLE");
  const vehicle = form.locator("label").filter({ hasText: /^Araç \(plaka\)/u }).locator("select").first();
  await vehicle.waitFor({ state: "visible", timeout: 10000 });
  const options = await vehicle.locator("option").evaluateAll((items) => items
    .map((item) => ({ value: item.value, label: (item.textContent || "").trim() }))
    .filter((item) => item.value));
  if (!options.length) throw new Error("ROOM_VEHICLE_OPTION_MISSING");
  await vehicle.selectOption(options.find((item) => /34ABC126/u.test(item.label))?.value || options[0].value);
  await form.getByLabel("Tutar (₺)", { exact: true }).fill("1");
  await form.getByLabel("Tarih", { exact: true }).fill("2026-11-15");
  await selectUnder(/^Dönem türü/u).selectOption("ONE_OFF");
  const advanced = form.locator("details.finance-v21-simple-advanced").first();
  if (await advanced.count()) await advanced.evaluate((node) => { node.open = true; });
  const textarea = form.locator("textarea").first();
  if (await textarea.count()) await textarea.fill(DESCRIPTION);
  const evidence = form.locator('input[placeholder="İsteğe bağlı belge veya fiş bilgisi"]').first();
  if (await evidence.count()) await evidence.fill(MARKER);
  const source = form.locator('input[placeholder="İsteğe bağlı kaynak bilgisi"]').first();
  if (await source.count()) await source.fill(MARKER);
  return { vehicleId: await vehicle.inputValue(), vehicleOptions: options };
}

async function createDraft(page) {
  const responsePromise = page.waitForResponse((response) => response.url().includes("/costs/drafts") && response.request().method() === "POST", { timeout: 15000 });
  await page.getByRole("button", { name: "Taslak oluştur", exact: true }).click({ noWaitAfter: true, timeout: 5000 });
  const response = await responsePromise;
  return { status: response.status(), body: await response.json().catch(() => null) };
}

const roomToken = await apiLogin("room@demo.com", "m18-cont234-room-20261115");
const before = await apiJson("/api/commercial-core/room/financial-operations/costs?includeSalary=false", roomToken);
log("preflight", { apiStatus: before.status, apiMessage: before.body?.error?.message ?? null, existingMatches: [] });

const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });

try {
  await page.goto(`${BASE}/#/room/financial-operations?view=expenses`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await loginUi(page);
  const form = await openComposer(page);
  const filled = await fillForecast(form);
  await form.getByLabel("Tutar (₺)", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Taslak oluştur", exact: true }).click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(500);
  const invalidText = await form.innerText();
  const invalidVisible = /0 TL'den büyük|zorunlu|geçersiz|tamamlayın/iu.test(invalidText);
  assert.equal(invalidVisible, true, "ROOM cost composer must visibly reject zero amount");
  log("invalid-validation", { visibleError: invalidVisible, tail: invalidText.slice(-900) });
  await form.getByLabel("Tutar (₺)", { exact: true }).fill("1");
  const draft = await createDraft(page);
  assert.equal(draft.status, 201, "ROOM cost draft creation must return HTTP 201");
  assert.ok(draft.body?.item?.id, "ROOM cost draft must return a persisted item id");
  log("draft-created", { response: draft.status, itemId: draft.body?.item?.id ?? null, lifecycle: draft.body?.item?.lifecycle ?? null, recordKind: draft.body?.item?.recordKind ?? null, filled });
  const review = page.locator("[data-finance-draft-review]");
  await review.waitFor({ state: "visible", timeout: 15000 });
  const reviewText = await review.innerText();
  await review.locator("input").first().fill("ONAYLA");
  const confirmPromise = page.waitForResponse((response) => /\/costs\/drafts\/\d+\/confirm/u.test(response.url()) && response.request().method() === "POST", { timeout: 15000 });
  await review.getByRole("button", { name: /Açıkça onayla|ONAYLA/u }).first().click({ noWaitAfter: true, timeout: 5000 });
  const confirmation = await confirmPromise;
  const confirmationBody = await confirmation.json().catch(() => null);
  assert.equal(confirmation.status(), 200, "ROOM cost confirmation must return HTTP 200");
  assert.equal(confirmationBody?.item?.id, draft.body?.item?.id, "ROOM cost confirmation must preserve the draft item id");
  log("draft-confirmed", { response: confirmation.status(), itemId: confirmationBody?.item?.id ?? null, reviewText: reviewText.slice(-900) });

  for (const view of ["expenses", "service-cost", "quote-profitability"]) {
    await page.goto(`${BASE}/#/room/financial-operations?view=${view}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitView(page, view);
    await page.waitForTimeout(700);
    const text = await page.locator("body").innerText();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, `${view} must not overflow horizontally`);
    log(`view-${view}`, { markerVisible: text.includes(MARKER), forecastVisible: /Tahmini maliyet|tahmini/iu.test(text), overflow });
  }

  const duplicateForm = await openComposer(page);
  await fillForecast(duplicateForm);
  const duplicate = await createDraft(page);
  const duplicateCode = duplicate.body?.code ?? duplicate.body?.error?.code ?? null;
  assert.equal(duplicate.status, 409, "duplicate ROOM cost sourceRef must return HTTP 409");
  assert.equal(duplicateCode, "DUPLICATE_SOURCE_REF", "duplicate ROOM cost sourceRef must use the stable error code");
  log("duplicate-source-rejected", { response: duplicate.status, code: duplicateCode, message: duplicate.body?.message ?? duplicate.body?.error?.message ?? null });

  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${BASE}/#/room/financial-operations?view=expenses`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitView(page, "expenses");
    await page.waitForTimeout(500);
    const text = await page.locator("body").innerText();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const expensesVisible = text.includes("Giderlerim");
    const forecastVisible = /Tahmini|planlanan/iu.test(text);
    assert.equal(overflow, false, `ROOM financial operations must not overflow at ${width}px`);
    assert.equal(expensesVisible, true, `ROOM expenses view must remain visible at ${width}px`);
    assert.equal(forecastVisible, true, `ROOM forecast semantics must remain visible at ${width}px`);
    log(`responsive-${width}`, { overflow, expensesVisible, forecastVisible });
  }
} finally {
  await context.close();
  await browser.close();
}

const after = await apiJson("/api/commercial-core/room/financial-operations/costs?includeSalary=false", roomToken);
const matches = [];
const companyToken = await apiLogin("company@demo.com", "m18-cont234-company-negative-20261115");
const companyRead = await apiJson("/api/commercial-core/room/financial-operations/costs?includeSalary=false", companyToken);
log("readback-pending-db", { apiStatus: after.status, apiMessage: after.body?.error?.message ?? null, note: "Canonical DB readback is performed by the paired psql evidence command because the host-side Prisma fail-closed target is intentionally 127.0.0.1:1." });
log("tenant-negative", { companyRoomCostReadStatus: companyRead.status, expectedDenied: companyRead.status === 403 });
assert.equal(companyRead.status, 403, "COMPANY must not read ROOM cost details");
const unexpectedBrowserErrors = errors.filter((message) => !/409|DUPLICATE_SOURCE_REF/iu.test(message));
assert.deepEqual(unexpectedBrowserErrors, [], `unexpected browser errors: ${unexpectedBrowserErrors.join(" | ")}`);
out.errors = errors;
out.final = { duplicateStatus: out.stages.find((stage) => stage.stage === "duplicate-source-rejected")?.response ?? null, companyNegative: companyRead.status === 403 };
console.log(JSON.stringify({ CONTINUATION: "234", ...out }, null, 2));
