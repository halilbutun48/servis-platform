import { chromium } from "@playwright/test";

const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const results = [];
let consoleErrors = [];
let pageErrors = [];
let serverErrors = 0;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login(identifier) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `#5-sefer-abi-browser-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`browser login failed ${identifier}: ${response.status}`);
  return body.token;
}

async function visit(browser, { name, identifier, route, contextualHome, scenarioTestId }) {
  const token = await login(identifier);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${name}: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(`${name}: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors += 1;
  });
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  await page.goto(`${WEB_BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 25000 });

  const body = page.locator("body");
  await body.getByText(contextualHome, { exact: true }).first().waitFor({ state: "visible", timeout: 20000 });
  const scenario = page.getByTestId(scenarioTestId);
  await scenario.waitFor({ state: "visible", timeout: 20000 });
  const pageText = await body.innerText();
  const navText = (await page.locator("nav").allInnerTexts()).join(" ");
  record(`${name} contextual scenario visible`, pageText.includes("Maliyet Senaryosu") && await scenario.isVisible());
  record(`${name} scenario action and safe copy`, pageText.includes("Senaryoyu Karşılaştır") && pageText.includes("Sadece önizleme") && !pageText.includes("Maliyet Senaryoları"));
  record(`${name} separate scenario nav absent`, !navText.includes("Maliyet Senaryoları"));

  const copilotFab = page.getByRole("button", { name: /Sefer Abi’ye Sor/i });
  await copilotFab.click();
  const composer = page.locator(".copilotComposer");
  await composer.waitFor({ state: "visible", timeout: 10000 });
  const input = composer.locator("textarea");
  await input.fill(name === "COMPANY" ? "Bütçem neden aşılıyor?" : "Teklif tabanım ve kârlılığım nedir?");
  await composer.locator('button[type="submit"]').click();
  const details = page.locator(".copilotReasoningDetails").last();
  await details.waitFor({ state: "visible", timeout: 25000 });
  await details.locator("summary").click();
  const reasoningText = await details.innerText();
  record(`${name} assistant reasoning visible`, ["SONUÇ", "NEDEN", "KANIT", "FİNANSAL ETKİ", "OPERASYON ETKİSİ", "RİSK", "ÖNERİ", "EKSİK VERİ", "GÜVEN SEVİYESİ"].every((label) => reasoningText.includes(label)));
  record(`${name} assistant preview-only`, reasoningText.includes("salt okunur") || reasoningText.includes("Sadece önizleme"));
  await page.close();
}

async function main() {
  console.log("=== #5 SEFER-ABI-COST-ANALYSIS-ASSISTANT-01 BROWSER ACCEPTANCE ===");
  const browser = await chromium.launch({ headless: true });
  try {
    await visit(browser, { name: "COMPANY", identifier: "company@demo.com", route: "/#/company/financial-operations", contextualHome: "Bütçe ve Servis Maliyeti", scenarioTestId: "company-contextual-scenario" });
    await visit(browser, { name: "ROOM", identifier: "room@demo.com", route: "/#/room/financial-operations", contextualHome: "Teklif ve Kârlılık", scenarioTestId: "cost-scenario-workspace" });
  } finally {
    await browser.close();
  }
  record("browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  record("browser page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  record("browser unexpected server errors", serverErrors === 0, String(serverErrors));
  const passCount = results.filter((item) => item.ok).length;
  console.log(`COMPANY_CONTEXTUAL_SCENARIO_VISIBLE_COUNT = ${results.some((item) => item.name === "COMPANY contextual scenario visible" && item.ok) ? 1 : 0}`);
  console.log(`ROOM_CONTEXTUAL_SCENARIO_VISIBLE_COUNT = ${results.some((item) => item.name === "ROOM contextual scenario visible" && item.ok) ? 1 : 0}`);
  console.log(`COMPANY_SEPARATE_SCENARIO_NAV_ITEM_COUNT = ${results.some((item) => item.name === "COMPANY separate scenario nav absent" && !item.ok) ? 1 : 0}`);
  console.log(`ROOM_SEPARATE_SCENARIO_NAV_ITEM_COUNT = ${results.some((item) => item.name === "ROOM separate scenario nav absent" && !item.ok) ? 1 : 0}`);
  console.log(`#5 browser acceptance: ${passCount}/${results.length} PASS`);
  if (passCount !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
