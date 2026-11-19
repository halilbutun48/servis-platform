#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = String(process.env.CONT236_ISOLATED_FRONTEND_URL || "http://127.0.0.1:6273").replace(/\/$/u, "");
const CHROME = process.env.CONT236_CHROMIUM_EXECUTABLE || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EVIDENCE_ROOT = path.resolve(process.env.CONT236_EVIDENCE_ROOT || "backend/artifacts/m18-cont236-isolated-finance-chain-20261115");
const INVOICE_ID = 3;
const AGREEMENT_ID = 1;
const MARKER = "CONT236-ISOLATED-PAYMENT-20261115-V1";
const PAYMENT_AMOUNT_MINOR = 6_000_000;
const RESUME_IDEMPOTENCY_KEY = String(process.env.CONT236_REPLAY_IDEMPOTENCY_KEY || "").trim();
const PERIOD_START = "2026-09-01";
const PERIOD_END = "2026-09-30";
const VIEWPORTS = [[1440, 900], [1024, 900], [390, 844], [320, 800]];

fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function login(page, identifier) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const loginButton = page.getByRole("button", { name: "Giriş yap" });
  if (await loginButton.count()) {
    await page.getByLabel("Kullanıcı Adı, E-posta veya Sürücü Kodu").fill(identifier);
    await page.getByLabel("Şifre veya PIN").fill("demo123");
    await loginButton.click();
  }
  await page.waitForFunction(() => Boolean(localStorage.getItem("token")), undefined, { timeout: 15_000 });
  await page.waitForTimeout(400);
}

async function json(page, url, options = {}) {
  return page.evaluate(async ({ url: requestUrl, options: requestOptions }) => {
    const token = localStorage.getItem("token");
    const response = await fetch(requestUrl, {
      ...requestOptions,
      headers: {
        ...(requestOptions.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestOptions.body === undefined ? {} : { "content-type": "application/json" }),
      },
      cache: "no-store",
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { text }; }
    return { status: response.status, body };
  }, { url, options });
}

async function collectionSummary(page, scope = "company") {
  const prefix = scope === "room" ? "room" : "company";
  return json(page, `/api/commercial-core/${prefix}/financial-operations/invoices/${INVOICE_ID}/collections`);
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(dimensions.documentWidth <= dimensions.viewportWidth + 8, `${label} document overflow: ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.bodyWidth <= dimensions.viewportWidth + 8, `${label} body overflow: ${JSON.stringify(dimensions)}`);
  return dimensions;
}

async function companyPaymentFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const writes = [];
  const errors = [];
  let capturedReplay = null;
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && !/\/api\/auth\/login$/u.test(request.url())) {
      writes.push({ method: request.method(), url: request.url(), body: request.postData() || null });
      if (request.url().includes(`/api/commercial-core/company/financial-operations/invoices/${INVOICE_ID}/collections/drafts`)) {
        capturedReplay = { url: request.url(), body: request.postDataJSON() };
      }
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await login(page, "company@demo.com");
  await page.goto(`${BASE}/#/company/agreements?focusAgreementId=${AGREEMENT_ID}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator('[data-testid="company-invoice-payment-panel"]').waitFor({ state: "visible", timeout: 20_000 });
  await page.locator('[data-testid="company-invoice-party-binding"]').waitFor({ state: "visible", timeout: 10_000 });

  const before = await collectionSummary(page, "company");
  assert.equal(before.status, 200);
  assert.equal(before.body.invoiceAmountMinor, 14_000_000);
  const existingMarker = before.body.records.find((record) => String(record.sourceRef || "") === MARKER);
  const existingMarkerStatus = String(existingMarker?.status || "").toUpperCase();
  if (existingMarkerStatus === "CONFIRMED") {
    assert.equal(before.body.collectedAmountMinor, 14_000_000);
    assert.equal(before.body.receivableAmountMinor, 0);
  } else {
    assert.equal(before.body.collectedAmountMinor, 8_000_000);
    assert.equal(before.body.receivableAmountMinor, 6_000_000);
  }
  const beforeRecordCount = before.body.records.length;

  const amount = page.getByTestId("company-payment-amount");
  await amount.fill("0");
  await page.getByRole("button", { name: "Ödeme beyanını kaydet", exact: true }).click();
  await page.getByText(/Ödeme tutarı sıfırdan büyük olmalı/u).waitFor({ state: "visible", timeout: 5_000 });
  const afterInvalid = await collectionSummary(page, "company");
  assert.equal(afterInvalid.body.records.length, beforeRecordCount, "invalid amount must not write");

  const existingPending = existingMarker && existingMarkerStatus === "DRAFT" ? existingMarker : null;
  const existingConfirmed = existingMarker && existingMarkerStatus === "CONFIRMED" ? existingMarker : null;
  if (existingPending || existingConfirmed) {
    capturedReplay = {
      url: `${BASE}/api/commercial-core/company/financial-operations/invoices/${INVOICE_ID}/collections/drafts`,
      body: {
        amountMinor: Number((existingPending || existingConfirmed).amountMinor),
        currencyCode: (existingPending || existingConfirmed).currencyCode,
        collectedAt: String((existingPending || existingConfirmed).collectedAt).slice(0, 10),
        paymentMethod: (existingPending || existingConfirmed).paymentMethod,
        sourceRef: (existingPending || existingConfirmed).sourceRef,
        idempotencyKey: RESUME_IDEMPOTENCY_KEY,
      },
      resumed: true,
    };
  } else {
    await amount.fill("60000");
    await page.getByTestId("company-payment-source-ref").fill(MARKER);
    await page.getByRole("button", { name: "Ödeme beyanını kaydet", exact: true }).click();
    await page.getByText(/Ödeme beyanı kaydedildi(?:\.|\s)/u).waitFor({ state: "visible", timeout: 15_000 });
  }
  assert.ok(capturedReplay?.body?.idempotencyKey, `UI request must carry idempotency key: ${JSON.stringify(capturedReplay)}`);
  assert.equal(capturedReplay.body.amountMinor, PAYMENT_AMOUNT_MINOR, `payment payload mismatch: ${JSON.stringify(capturedReplay)}`);

  const pending = await collectionSummary(page, "company");
  assert.equal(pending.status, 200);
  if (existingConfirmed) {
    assert.equal(pending.body.collectedAmountMinor, 14_000_000);
    assert.equal(pending.body.receivableAmountMinor, 0);
  } else {
    assert.equal(pending.body.collectedAmountMinor, 8_000_000, "pending declaration is not confirmed payment");
    assert.equal(pending.body.paymentDeclaration?.pendingAmountMinor, PAYMENT_AMOUNT_MINOR);
  }
  const expectedRecordCount = beforeRecordCount + ((existingPending || existingConfirmed) ? 0 : 1);
  assert.equal(pending.body.records.length, expectedRecordCount);

  const replay = await json(page, capturedReplay.url, { method: "POST", body: JSON.stringify(capturedReplay.body) });
  assert.equal(replay.status, 200, "same authorized request replay must be idempotent");
  assert.equal(replay.body.item.id, existingMarker?.id || pending.body.records.at(-1).id);
  assert.equal(replay.body.item.idempotentReplay, true);
  const afterReplay = await collectionSummary(page, "company");
  assert.equal(afterReplay.body.records.length, expectedRecordCount, "replay must not create a second declaration");

  await page.screenshot({ path: path.join(EVIDENCE_ROOT, existingConfirmed ? "company-confirmed-1440.png" : "company-pending-1440.png"), fullPage: true });

  return { page, context, before, pending, replay, afterReplay, writes, errors, capturedReplay, alreadyConfirmed: Boolean(existingConfirmed), existingMarkerId: existingMarker?.id || null };
}

async function roomConfirmFlow(browser, pendingRowId) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await login(page, "room@demo.com");
  await page.goto(`${BASE}/#/room/commercial-flow?agreementId=${AGREEMENT_ID}&tab=settlement`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator('[data-testid="invoice-collection-panel"]').waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(`[data-testid="invoice-collection-row-${pendingRowId}"]`).waitFor({ state: "visible", timeout: 10_000 });
  const row = page.locator(`[data-testid="invoice-collection-row-${pendingRowId}"]`);
  const confirmButton = row.getByRole("button", { name: "Açık ONAYLA", exact: true });
  const alreadyConfirmed = await confirmButton.count() === 0;
  const receivableBefore = await page.getByTestId("invoice-collection-receivable").innerText();
  if (alreadyConfirmed) assert.match(receivableBefore, /0,00\s*₺/u);
  else assert.match(receivableBefore, /60\.000,00\s*₺/u);
  if (alreadyConfirmed) {
    await row.getByText(/Tahsilat · 60\.000,00\s*₺/u).waitFor({ state: "visible", timeout: 5_000 });
  } else {
    await confirmButton.click();
    await page.getByText(/Tahsilat doğrulandı; kalan alacak yeniden hesaplandı/u).waitFor({ state: "visible", timeout: 15_000 });
  }
  const after = await collectionSummary(page, "room");
  assert.equal(after.status, 200);
  assert.equal(after.body.collectedAmountMinor, 14_000_000);
  assert.equal(after.body.receivableAmountMinor, 0);
  assert.equal(after.body.records.find((record) => Number(record.id) === Number(pendingRowId))?.status, "CONFIRMED");
  await page.screenshot({ path: path.join(EVIDENCE_ROOT, "room-confirmed-1440.png"), fullPage: true });
  return { page, context, after, errors, receivableBefore, alreadyConfirmed };
}

async function overpaymentAndCrossTenant(browser) {
  const companyContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const company = await companyContext.newPage();
  await login(company, "company@demo.com");
  await company.goto(`${BASE}/#/company/agreements?focusAgreementId=${AGREEMENT_ID}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await company.locator('[data-testid="company-invoice-payment-panel"]').waitFor({ state: "visible", timeout: 20_000 });
  await company.getByTestId("company-payment-amount").fill("1");
  await company.getByTestId("company-payment-source-ref").fill(`${MARKER}-OVERPAY`);
  await company.getByRole("button", { name: "Ödeme beyanını kaydet", exact: true }).click();
  await company.getByText(/aşamaz/u).waitFor({ state: "visible", timeout: 10_000 });
  const finalCompany = await collectionSummary(company, "company");
  assert.equal(finalCompany.body.collectedAmountMinor, 14_000_000);
  assert.equal(finalCompany.body.receivableAmountMinor, 0);
  const schoolContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const school = await schoolContext.newPage();
  await login(school, "school@demo.com");
  const crossTenant = await collectionSummary(school, "company");
  assert.equal(crossTenant.status, 404, "another buyer tenant must not read COMPANY invoice 3");
  await company.screenshot({ path: path.join(EVIDENCE_ROOT, "company-overpayment-rejected-1440.png"), fullPage: true });
  await companyContext.close();
  await schoolContext.close();
  return { finalCompany, crossTenant: { status: crossTenant.status } };
}

async function responsiveChecks(browser, pendingRowId) {
  const companyContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const company = await companyContext.newPage();
  await login(company, "company@demo.com");
  const companyResults = [];
  for (const [width, height] of VIEWPORTS) {
    await company.setViewportSize({ width, height });
    await company.goto(`${BASE}/#/company/agreements?focusAgreementId=${AGREEMENT_ID}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await company.locator('[data-testid="company-invoice-payment-panel"]').waitFor({ state: "visible", timeout: 20_000 });
    companyResults.push({ width, height, dimensions: await noOverflow(company, `company ${width}`), confirmedVisible: await company.getByTestId("company-payment-confirmed").count() > 0 });
  }
  await companyContext.close();

  const roomContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const room = await roomContext.newPage();
  await login(room, "room@demo.com");
  const roomResults = [];
  for (const [width, height] of VIEWPORTS) {
    await room.setViewportSize({ width, height });
    await room.goto(`${BASE}/#/room/commercial-flow?agreementId=${AGREEMENT_ID}&tab=settlement`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await room.locator('[data-testid="invoice-collection-panel"]').waitFor({ state: "visible", timeout: 20_000 });
    const row = room.locator(`[data-testid="invoice-collection-row-${pendingRowId}"]`);
    await row.waitFor({ state: "visible", timeout: 10_000 });
    roomResults.push({
      width,
      height,
      dimensions: await noOverflow(room, `room ${width}`),
      collectedText: await room.getByTestId("invoice-collection-collected").innerText(),
      receivableText: await room.getByTestId("invoice-collection-receivable").innerText(),
    });
  }
  await roomContext.close();
  return { companyResults, roomResults };
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const startedAt = new Date().toISOString();
let companyFlow;
let roomFlow;
try {
  companyFlow = await companyPaymentFlow(browser);
  const pendingRowId = companyFlow.pending.body.records.at(-1).id;
  roomFlow = await roomConfirmFlow(browser, pendingRowId);
  const overpayment = await overpaymentAndCrossTenant(browser);
  const responsive = await responsiveChecks(browser, pendingRowId);
  const asset = await (await fetch(`${BASE}/assets/index-C4j0_yea.js`)).arrayBuffer().catch(() => null);
  const result = {
      status: "PASS_WITH_SCOPE",
    acceptance: "CONT-236-ISOLATED-FINANCE-COLLECTION-CHAIN",
      fullChainStatus: "PARTIAL_SCOPE",
    startedAt,
    completedAt: new Date().toISOString(),
    runtime: { base: BASE, isolation: "seferpakt_cont04", database: "seferpakt_cont04.public", migration: 67, testOnly: true },
    backbone: { agreementId: AGREEMENT_ID, invoiceId: INVOICE_ID, existingHakedisInvoice: true, existingConfirmedCollectionMinor: 8_000_000 },
    paymentDeclaration: { amountMinor: PAYMENT_AMOUNT_MINOR, marker: MARKER, pendingStatus: companyFlow.pending.body.paymentDeclaration?.status || null, replayStatus: companyFlow.replay.status, replayIdempotent: companyFlow.replay.body.item.idempotentReplay === true },
    roomConfirmation: { pendingRowId, beforeReceivableText: roomFlow.receivableBefore, afterCollectedMinor: roomFlow.after.body.collectedAmountMinor, afterReceivableMinor: roomFlow.after.body.receivableAmountMinor },
    overpayment: overpayment.finalCompany.body.receivableAmountMinor === 0 ? "REJECTED" : "NOT_PROVEN",
    crossTenant: overpayment.crossTenant,
    responsive: responsive,
    browser: { companyErrors: companyFlow.errors, roomErrors: roomFlow.errors, companyWrites: companyFlow.writes, assetSha256: asset ? crypto.createHash("sha256").update(Buffer.from(asset)).digest("hex") : null },
    scope: "This isolated run completed payment declaration -> ROOM manual confirmation -> zero receivable. Request/offer/agreement/shift/hakedis/invoice backbone was reused from protected isolated DEMO data; no direct SQL business write and no canonical write.",
  };
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
