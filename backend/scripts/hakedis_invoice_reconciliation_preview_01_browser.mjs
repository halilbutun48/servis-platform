import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01");
const screenshotRoot = path.join(artifactRoot, "screenshots");

const previewFixture = {
  previewOnly: true,
  calculationVersion: "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01",
  status: "MATCHED",
  statusLabel: "Uyumlu",
  period: { start: "2030-01-01", end: "2030-01-31" },
  expectedAmount: { amountMinor: 100000, currencyCode: "TRY", source: "HAKEDIS_RECORD", reference: "HAK-UI-01" },
  hakedisPreview: { exists: true, reference: "HAK-UI-01", amountMinor: 100000, currencyCode: "TRY", status: "READY", source: "INTERNAL_ACTUAL" },
  invoice: { exists: true, reference: "FAT-UI-01", amountMinor: 100000, currencyCode: "TRY", status: "ISSUED", source: "INTERNAL_ACTUAL" },
  difference: { amountMinor: 0, absoluteAmountMinor: 0, direction: "NONE" },
  reasons: [{ code: "MATCHED", label: "Hakediş ve fatura aynı tutarı gösteriyor." }],
  evidence: {
    agreement: { id: 1, reference: "Sözleşme #1" },
    operations: { shiftIds: ["9001"], eligibleCount: 1, completedCount: 1, partialCount: 0 },
    hakedis: { reference: "HAK-UI-01" },
    invoice: { reference: "FAT-UI-01" },
  },
  missingData: [],
  confidence: "HIGH",
  nextAction: "İnceleme gerekmiyor",
  externalReferenceUsedForTruth: false,
  demoFixtureUsedForTruth: false,
  safety: { paymentExecution: false, invoiceApproval: false, hakedisFinalization: false, accountingPosting: false },
};

const fixtureAgreement = {
  id: 999001,
  companyId: 1,
  roomId: 1,
  startDate: "2030-01-01",
  endDate: "2030-01-31",
  weekMask: 127,
  startMin: 480,
  endMin: 1080,
  status: "ACTIVE",
  companyOfferAmount: 120000,
  roomOfferAmount: 100000,
  direction: "INBOUND",
  pattern: "ONE_WAY",
  room: { id: 1, name: "DemoRoom" },
  commercialBackbone: null,
};

const qualityPaymentBridgeFixture = {
  previewOnly: true,
  qualityStatus: "INSUFFICIENT_DATA",
  settlementReadiness: "INSUFFICIENT_DATA",
  proofCompleteness: 0,
  paymentPreviewImpact: {
    status: "NO_IMPACT",
    reason: "Bu ek bilgi yalnızca önizlemedir; mutabakat tutarını değiştirmez.",
  },
  missingProofs: [],
  riskReasons: [],
  nextBestAction: "Mutabakat kanıtlarını incele.",
  previewOnlyNote: "Sadece önizleme — ödeme başlatılmaz.",
};

const results = [];
let consoleErrorCount = 0;
let pageErrorCount = 0;
let unexpected500 = 0;
let unexpected429 = 0;
const consoleErrors = [];
const pageErrors = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login(identifier) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `#3-browser-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`browser login failed ${identifier} ${response.status}`);
  return body.token;
}

async function visitRole(browser, role, token, route, screenshotName, mobile = false, fixture = previewFixture) {
  const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrorCount += 1;
      consoleErrors.push({ role, mobile, text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    pageErrorCount += 1;
    pageErrors.push({ role, mobile, text: error.message });
  });
  page.on("response", (response) => { if (response.status() === 500) unexpected500 += 1; if (response.status() === 429) unexpected429 += 1; });
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("personel_servis_cached_session");
  }, token);
  await page.route("**/api/agreements**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/agreements") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [fixtureAgreement] }) });
    return route.continue();
  });
  await page.route("**/api/agreements/*/quality-payment-bridge", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qualityPaymentBridgeFixture) }));
  await page.route("**/api/reconciliation/preview**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: fixture }) }));
  await page.goto(`${webBaseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  const card = page.getByTestId("reconciliation-preview-card");
  await card.waitFor({ state: "visible", timeout: 20000 });
  await card.getByText(String(fixture.statusLabel), { exact: true }).waitFor({ state: "visible", timeout: 20000 });
  const defaultText = await card.innerText();
  const summaryVisible = defaultText.includes("Hakediş ve fatura mutabakat önizlemesi") && defaultText.includes(String(fixture.statusLabel)) && defaultText.includes("Beklenen hakediş") && defaultText.includes("Fatura tutarı") && defaultText.includes("Fark");
  record(`${role} ${mobile ? "mobile" : "desktop"} summary`, summaryVisible, summaryVisible ? "Turkish summary visible" : defaultText.slice(0, 240));
  await card.getByText("Kanıtlar ve ayrıntılar").click();
  const expandedText = await card.innerText();
  const invoiceEvidenceVisible = fixture.invoice?.exists === false || expandedText.includes("FAT-UI-01");
  const expectedOperationProgress = `${fixture.evidence.operations.completedCount} / ${fixture.evidence.operations.eligibleCount} tamamlandı`;
  const evidenceVisible = expandedText.includes("Sözleşme #1") && expandedText.includes("HAK-UI-01") && invoiceEvidenceVisible && expandedText.includes(expectedOperationProgress);
  record(`${role} ${mobile ? "mobile" : "desktop"} evidence`, evidenceVisible, evidenceVisible ? "evidence expanded" : expandedText.slice(0, 300));
  const hasRawToken = /MATCHED|UNDER_INVOICED|OVER_INVOICED|NO_[A-Z_]+|amountMinor|agreementId|periodStart|periodEnd|source|INTERNAL_ACTUAL|DEMO_FIXTURE/.test(expandedText);
  record(`${role} ${mobile ? "mobile" : "desktop"} user-facing status hygiene`, !hasRawToken, hasRawToken ? expandedText : "no raw contract tokens");
  await page.screenshot({ path: path.join(screenshotRoot, screenshotName), fullPage: true });
  await page.close();
}

await fs.mkdir(screenshotRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const companyToken = await login("company@demo.com");
  const roomToken = await login("room@demo.com");
  await visitRole(browser, "COMPANY", companyToken, "/#/company/agreements", "company-desktop.png", false, previewFixture);
  await visitRole(browser, "ROOM", roomToken, "/#/room/agreements", "room-desktop.png", false, { ...previewFixture, status: "UNDER_INVOICED", statusLabel: "Eksik faturalandırma", invoice: { ...previewFixture.invoice, amountMinor: 90000 }, difference: { amountMinor: -10000, absoluteAmountMinor: 10000, direction: "INVOICE_UNDER" }, nextAction: "Farkı incele", reasons: [{ code: "UNDER_INVOICED", label: "Fatura tutarı hakediş tutarının altında." }] });
  await visitRole(browser, "COMPANY", companyToken, "/#/company/agreements", "company-mobile.png", true, { ...previewFixture, status: "NO_INVOICE", statusLabel: "Fatura verisi yok", invoice: { ...previewFixture.invoice, amountMinor: null, exists: false, reference: null }, difference: { amountMinor: null, absoluteAmountMinor: null, direction: "NONE" }, missingData: [{ code: "NO_INVOICE", label: "Fatura verisi yok" }], nextAction: "Eksik veriyi tamamla", reasons: [{ code: "NO_INVOICE", label: "Bu dönem için karşılaştırılabilir fatura kaydı bulunamadı." }] });
  await visitRole(browser, "ROOM", roomToken, "/#/room/agreements", "room-mobile.png", true, { ...previewFixture, status: "PARTIAL_OPERATION_EVIDENCE", statusLabel: "Operasyon kanıtı eksik", confidence: "MEDIUM", missingData: [{ code: "PARTIAL_OPERATION_EVIDENCE", label: "Operasyon kanıtı eksik" }], nextAction: "Eksik veriyi tamamla", reasons: [{ code: "PARTIAL_OPERATION_EVIDENCE", label: "Operasyon kayıtlarının tamamlanma kanıtı eksik." }], evidence: { ...previewFixture.evidence, operations: { shiftIds: ["9001"], eligibleCount: 1, completedCount: 0, partialCount: 1 } } });
} finally {
  await browser.close();
}

const report = {
  milestone: "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01",
  generatedAt: new Date().toISOString(),
  fixtureMode: "PLAYWRIGHT_RESPONSE_FIXTURE_ONLY",
  screenshots: ["company-desktop.png", "room-desktop.png", "company-mobile.png", "room-mobile.png"],
  consoleErrorCount,
  pageErrorCount,
  unexpected500,
  unexpected429,
  consoleErrors,
  pageErrors,
  results,
  pass: results.every((item) => item.ok) && consoleErrorCount === 0 && pageErrorCount === 0 && unexpected500 === 0 && unexpected429 === 0,
};
await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(artifactRoot, "report.md"), `# #3 Browser Acceptance\n\n- Fixture: PLAYWRIGHT_RESPONSE_FIXTURE_ONLY\n- consoleErrorCount: ${consoleErrorCount}\n- pageErrorCount: ${pageErrorCount}\n- unexpected500: ${unexpected500}\n- unexpected429: ${unexpected429}\n- Result: ${report.pass ? "PASS" : "FAIL"}\n`, "utf8");
if (!report.pass) process.exit(1);
console.log(`HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01_BROWSER PASS ${results.length}/${results.length}`);
