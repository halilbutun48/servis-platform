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
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `#4-browser-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`browser login failed ${identifier}: ${response.status}`);
  return body.token;
}

async function visit(browser, { name, identifier, route, mobile = false, fill = false, planningOnly = false }) {
  const token = await login(identifier);
  const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${name}: ${message.text()}`); });
  page.on("pageerror", (error) => { pageErrors.push(`${name}: ${error.message}`); });
  page.on("response", (response) => { if (response.status() >= 500) serverErrors += 1; });
  await page.addInitScript((value) => localStorage.setItem("token", value), token);
  await page.goto(`${WEB_BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.getByTestId("cost-scenario-workspace").waitFor({ state: "visible", timeout: 20000 });
  const initialText = await page.getByTestId("cost-scenario-workspace").innerText();
  record(`${name} scenario surface`, initialText.includes("Sadece önizleme") && initialText.includes("Mevcut planı alternatif"), initialText.slice(0, 180));
  record(`${name} planning boundary`, planningOnly ? initialText.includes("Planlama bağlamı") && initialText.includes("normal bütçe yaşam döngüsü") : !initialText.includes("Erişim kapalı"));

  if (fill) {
    const p = page;
    await p.getByText("Mevcut plan varsayımlarını düzenle", { exact: true }).click();
    const fillField = async (prefix, key, value) => p.getByTestId(`${prefix}-input-${key}`).fill(String(value));
    for (const [key, value] of Object.entries({ vehicleCount: 1, vehicleCapacity: 16, passengerCount: 10, serviceDistanceKm: 100, totalDistanceKm: 100, routeDurationMinutes: 60, serviceDayCount: 10, shiftCount: 10, tripCount: 10, fuelConsumptionLitersPer100Km: 10, fuelUnitPriceMinor: 4000, driverBasePerShiftMinor: 10000, maintenancePerKmMinor: 100 })) await fillField("baseline", key, value);
    for (const [key, value] of Object.entries({ vehicleCount: 1, vehicleCapacity: 16, passengerCount: 10, serviceDistanceKm: 50, totalDistanceKm: 50, routeDurationMinutes: 30, serviceDayCount: 10, shiftCount: 10, tripCount: 10, fuelConsumptionLitersPer100Km: 10, fuelUnitPriceMinor: 4000, driverBasePerShiftMinor: 10000, maintenancePerKmMinor: 100 })) await fillField("scenario", key, value);
    await p.getByTestId("cost-scenario-calculate").click();
    const result = p.getByText("Fark / fırsat", { exact: true });
    await result.waitFor({ state: "visible", timeout: 20000 });
    const resultText = await p.getByTestId("cost-scenario-workspace").innerText();
    record(`${name} explainable comparison`, resultText.includes("Tahmini tasarruf") && resultText.includes("Mevcut plan tahmini maliyeti"), resultText.match(/Karşılaştırma hazır|Eksik veri|Güvenli hesap durdu/)?.[0] || "status missing");
    record(`${name} user-facing contract hygiene`, !/amountMinor|paymentExecute|accountingPosting|INTERNAL_ACTUAL|DEMO_FIXTURE|USER_SCENARIO_OVERRIDE/.test(resultText));
    record(`${name} mobile overflow`, !mobile || await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 8));
  }
  await page.close();
}

async function main() {
  console.log("=== COST-SCENARIO-FORECAST-AND-SAVINGS-01 BROWSER SMOKE ===");
  const browser = await chromium.launch({ headless: true });
  try {
    await visit(browser, { name: "COMPANY desktop", identifier: "company@demo.com", route: "/#/company/cost-scenarios", fill: true });
    await visit(browser, { name: "ROOM mobile", identifier: "room@demo.com", route: "/#/room/cost-scenarios", mobile: true, fill: true });
    await visit(browser, { name: "SCHOOL planning", identifier: "school@demo.com", route: "/#/school/cost-scenarios", planningOnly: true });
    await visit(browser, { name: "ORGANIZATION planning", identifier: "organization@demo.com", route: "/#/organization/cost-scenarios", planningOnly: true });
  } finally {
    await browser.close();
  }
  record("browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  record("browser page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  record("browser unexpected server errors", serverErrors === 0, String(serverErrors));
  if (results.some((item) => !item.ok)) {
    console.error(`#4 browser smoke failed: ${results.filter((item) => item.ok).length}/${results.length}`);
    process.exit(1);
  }
  console.log(`#4 browser smoke passed: ${results.length}/${results.length}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
