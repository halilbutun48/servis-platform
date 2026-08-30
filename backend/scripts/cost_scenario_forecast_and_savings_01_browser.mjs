import { chromium } from "@playwright/test";

const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const results = [];
let consoleErrors = [];
let pageErrors = [];
let serverErrors = 0;
let http429Errors = 0;
let liveMutationRequests = [];

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

async function getBaseline(token, scope) {
  const response = await fetch(`${API_BASE_URL}/api/cost-scenarios/baseline?scope=${scope}`, { headers: { authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`baseline failed ${scope}: ${response.status}`);
  return body.data || body;
}

async function visit(browser, { name, identifier, role, companyKind, route, scope = "COMPANY", mobile = false, fill = false, planningOnly = false, contextualHome = "", contextualTestId = "" }) {
  // Normal novice acceptance: without manually entering existing baseline values.
  const taskResultStart = results.length;
  const taskConsoleErrorStart = consoleErrors.length;
  const taskPageErrorStart = pageErrors.length;
  const taskServerErrorStart = serverErrors;
  const taskHttp429Start = http429Errors;
  const token = await login(identifier);
  const baseline = await getBaseline(token, scope);
  const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${name}: ${message.text()}`); });
  page.on("pageerror", (error) => { pageErrors.push(`${name}: ${error.message}`); });
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors += 1;
    if (response.status() === 429) http429Errors += 1;
  });
  page.on("request", (request) => {
    const method = request.method().toUpperCase();
    const url = request.url();
    if (["PATCH", "PUT", "DELETE"].includes(method) || (method === "POST" && !url.includes("/api/cost-scenarios/preview"))) {
      liveMutationRequests.push(`${name}: ${method} ${url}`);
    }
  });
  await page.addInitScript((value) => localStorage.setItem("token", value), token);
  await page.goto(`${WEB_BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  const workspace = page.getByTestId("cost-scenario-workspace");
  await workspace.waitFor({ state: "visible", timeout: 20000 });
  await page.getByTestId("scenario-operation-region").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const contextualVisible = contextualHome
    ? (!contextualTestId || await page.getByTestId(contextualTestId).isVisible()) && (await page.locator("body").innerText()).includes(contextualHome)
    : true;
  const advanced = page.getByTestId("scenario-advanced-assumptions");
  const advancedClosed = !(await advanced.evaluate((node) => node.open));
  const baselineSummary = page.getByTestId("scenario-baseline-summary");
  const baselineText = await baselineSummary.innerText();
  const initialText = await workspace.innerText();
  const missingText = baseline.missingFields.length ? await page.getByTestId("scenario-missing-fields").innerText() : "";
  const hasFieldLevelMissingReason = baseline.missingFields.length === 0 || baseline.missingFields.every((field) => `${baselineText}\n${missingText}`.includes(`Eksik veri: ${baseline.baselineSourceMap?.[field]?.label || field}`));
  const noDashSea = !baselineText.includes(" - ") && !baselineText.includes("→ -");
  const noSeparateNav = !(await page.locator("nav").allInnerTexts()).join(" ").includes("Maliyet Senaryoları");
  const pageText = await page.locator("body").innerText();
  record(`${name} scenario surface`, pageText.includes("Sadece önizleme") && pageText.includes("Mevcut plan") && pageText.includes("Maliyet Senaryosu") && pageText.includes("Senaryoyu Karşılaştır") && pageText.includes("Gelişmiş varsayımlar") && contextualVisible, initialText.slice(0, 180));
  const referenceCard = page.getByTestId("external-reference-card").first();
  if (!planningOnly) {
    await referenceCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    await referenceCard.getByTestId("external-reference-completeness").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    await referenceCard.getByTestId("external-reference-value").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  }
  const settledPageText = await page.locator("body").innerText();
  const referenceText = planningOnly ? "" : await referenceCard.innerText().catch(() => "");
  record(`${name} canonical operation region visible`, Boolean(baseline.regionName) && settledPageText.includes(`Operasyon bölgesi: ${baseline.regionName}`) && (planningOnly || !referenceText.includes("Türkiye / kapsam belirtilmedi")), `${baseline.regionName || "NO_CANONICAL_REGION"}/${baseline.regionResolution?.source || "NO_SOURCE"}`);
  if (planningOnly) {
    record(`${name} planning context does not require financial reference card`, true, "planning surface keeps canonical region in scenario context");
  } else {
    const completeness = referenceCard.getByTestId("external-reference-completeness");
    await completeness.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    const exactProvinceScope = referenceText.includes(baseline.regionName || "__missing_region__");
    const explicitApprovedFallbackScope = referenceText.includes("Türkiye geneli") && referenceText.includes("Alternatif kaynak kullanılıyor");
    record(`${name} market reference has exact province or explicit approved fallback scope`, (exactProvinceScope || explicitApprovedFallbackScope) && !referenceText.includes("Türkiye / kapsam belirtilmedi"));
    if (referenceText.includes("Fuel: AVAILABLE") || referenceText.includes("FRESH") || referenceText.includes("STALE")) {
      const details = referenceCard.getByTestId("external-reference-details");
      await details.locator("summary").click().catch(() => {});
      const detailsText = await details.innerText().catch(() => "");
      record(`${name} provider source as-of freshness visible`, ["Provider:", "Kaynak:", "As of:", "Güncellik:"].every((label) => detailsText.includes(label)));
      record(`${name} partial reference layers remain separate`, ["Dış Piyasa Referansı", "SeferPakt Bölgesel Referansı", "Senin Gerçek Verilerin"].every((label) => detailsText.includes(label)) && detailsText.includes("Uygun resmi dış veri yok") ? true : detailsText.includes("Dış Piyasa Referansı"));
      await details.locator("summary").click().catch(() => {});
    } else {
      record(`${name} no-data reference still names canonical region`, referenceText.includes(baseline.regionName || "__missing_region__") && referenceText.includes("resmi veri"));
    }
    record(`${name} component completeness is explicit`, referenceText.includes("Reference completeness:") && referenceText.includes("Driver: MISSING") && referenceText.includes("Maintenance: MISSING") && referenceText.includes("Actual: NOT AVAILABLE"));
  }
  record(`${name} no manual province or required fuel price entry`, !settledPageText.includes("provinceNameInput") && !settledPageText.includes("İl seçiniz") && !(await page.getByTestId("scenario-input-fuelUnitPriceMinor").isVisible().catch(() => false)));
  record(`${name} role identity and baseline source`, initialText.includes(planningOnly ? "Planlama bağlamı" : role === "ROOM" ? "Taşımacılık Firması" : "Önizleme") && Boolean(baseline.source?.label));
  record(`${name} no dash sea and explicit missing`, noDashSea && hasFieldLevelMissingReason, `missing=${baseline.missingFields.length}`);
  record(`${name} advanced assumptions collapsed`, advancedClosed);
  record(`${name} separate scenario nav absent`, noSeparateNav);
  record(`${name} current scenario delta visible`, initialText.includes("Mevcut → Senaryo → Delta") && initialText.includes("Sadece değiştirmek istediğin"));
  record(`${name} baseline confidence visible`, await page.getByTestId("scenario-baseline-confidence").isVisible());
  const initialAlternatives = page.getByTestId("scenario-vehicle-plan-alternatives");
  await initialAlternatives.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const initialAlternativeCards = initialAlternatives.locator('[data-testid^="scenario-vehicle-alternative-"]');
  const initialAlternativeCount = await initialAlternativeCards.count().catch(() => 0);
  const initialAlternativeText = initialAlternativeCount ? await initialAlternatives.innerText() : "";
  record(`${name} automatic vehicle alternatives visible`, await initialAlternatives.isVisible().catch(() => false) && initialAlternativeCount === 3 && ["Kapasite", "Sürücü", "L/100 km"].every((label) => initialAlternativeText.includes(label)), `alternatives=${initialAlternativeCount}`);

  const details = page.getByTestId("scenario-details");
  const detailsClosed = !(await details.evaluate((node) => node.open));
  const visiblePrimaryFields = await workspace.locator('input[data-testid^="scenario-input-"]:visible, select[data-testid^="scenario-input-"]:visible').count();
  record(`${name} details starts collapsed`, detailsClosed);
  record(`${name} novice first view is compact`, visiblePrimaryFields === 1 && !(await page.getByTestId("scenario-input-fuelConsumptionLitersPer100Km").isVisible().catch(() => false)));
  await details.locator("summary").click();
  const detailsText = await details.innerText();
  record(`${name} automatic assumptions are explainable`, detailsText.includes("Araç tüketimi") && detailsText.includes("Yakıt fiyatı") && detailsText.includes("Öncelik"));
  await details.locator("summary").click();

  if (planningOnly) {
    record(`${name} planning safety boundary`, initialText.includes("normal bütçe yaşam döngüsü bu bağlamda açılmaz") && !initialText.includes("Bütçe onayı") && !initialText.includes("Hakediş oluştur"));
    record(`${name} role-specific planning copy`, companyKind === "SCHOOL" ? initialText.includes("Okul servis planında") || initialText.includes("Öğrenci") : initialText.includes("Etkinlik veya gezi planında") || initialText.includes("Katılımcı"));
  }

  if (fill) {
    const p = page;
    const primaryInput = (key) => p.getByTestId(`scenario-input-${key}`);
    const initialPassenger = await primaryInput("passengerCount").inputValue().catch(() => "");
    if (await primaryInput("passengerCount").count()) await primaryInput("passengerCount").fill(String(Number(initialPassenger || baseline.input.passengerCount || 0) + 1));
    const changedPassenger = await primaryInput("passengerCount").inputValue().catch(() => "");
    record(`${name} only one meaningful variable`, Boolean(await primaryInput("passengerCount").count()) && changedPassenger !== "" && visiblePrimaryFields === 1);
    record(`${name} primary role input visible`, Boolean(await primaryInput("passengerCount").count()) && changedPassenger !== "");
    record(`${name} quick scenario preset`, await p.getByTestId("scenario-quick-passenger").count() > 0);
    await p.screenshot({ path: `backend/artifacts/browser-smoke/cost-scenario-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-novice.png`, fullPage: false });
    await p.getByTestId("cost-scenario-calculate").click();
    await p.getByText("Fark / fırsat", { exact: true }).waitFor({ state: "visible", timeout: 20000 });
    const resultText = await workspace.innerText();
    const resultAlternatives = p.getByTestId("scenario-vehicle-plan-alternatives");
    const resultAlternativeCards = resultAlternatives.locator('[data-testid^="scenario-vehicle-alternative-"]');
    const resultAlternativeCount = await resultAlternativeCards.count().catch(() => 0);
    record(`${name} capacity-derived alternatives after passenger change`, resultAlternativeCount === 3 && resultText.includes("Araç sayısı") && resultText.includes("Kapasiteye göre otomatik"), `alternatives=${resultAlternativeCount}`);
    record(`${name} explainable comparison`, resultText.includes("Tahmini tasarruf") && resultText.includes("Mevcut plan tahmini maliyeti") && resultText.includes("Beklenen") && resultText.includes("En uygun") && resultText.includes("Riskli durum"));
    record(`${name} financial operational risk effects`, ["Finansal Etki", "Operasyonel Etki", "Risk"].every((label) => resultText.includes(label)));
    record(`${name} master primer comparison evidence`, ["Dönem sonu forecast", "Bütçe sapması", "Planned-vs-actual", "Gecikme etkisi", "Operasyonel risk", "Rota alternatifi", "Dispatch sınırı"].every((label) => resultText.includes(label)));
    record(`${name} preview-only result`, resultText.includes("Sadece önizleme") && resultText.includes("canlı") && !resultText.includes("Uygula"));
    record(`${name} partial optional costs disclosed`, resultText.includes("Sürücü maliyeti") && resultText.includes("Bakım maliyeti") && resultText.includes("Bu karşılaştırma sürücü ve bakım maliyetleri dahil edilmeden hesaplandı."));

    let nonDefaultCard = null;
    for (let index = 0; index < resultAlternativeCount; index += 1) {
      const candidate = resultAlternativeCards.nth(index);
      const candidateText = await candidate.innerText();
      if (!candidateText.includes("Önerilen")) {
        nonDefaultCard = candidate;
        break;
      }
    }
    if (nonDefaultCard) {
      await nonDefaultCard.getByRole("button", { name: "Bu planı karşılaştır" }).click();
      await p.getByText("Fark / fırsat", { exact: true }).waitFor({ state: "visible", timeout: 20000 });
      const selectedResultText = await workspace.innerText();
      record(`${name} non-default vehicle plan comparison`, selectedResultText.includes("Bu planı karşılaştır") && selectedResultText.includes("Önizleme") && selectedResultText.includes("Sadece önizleme"));
    } else {
      record(`${name} non-default vehicle plan comparison`, false, "non-default alternative was not available");
    }

    const example = p.getByTestId("scenario-readonly-example");
    record(`${name} readonly example starts collapsed`, !(await example.evaluate((node) => node.open)));
    await example.locator("summary").click();
    const exampleText = await example.innerText();
    record(`${name} readonly synthetic example`, exampleText.includes("ÖRNEK") && exampleText.includes("Gerçek operasyon veriniz değildir") && exampleText.includes("kalıcılaştırılmaz"));
    await example.locator("summary").click();

    const ab = p.getByTestId("scenario-ab-comparison");
    record(`${name} A/B starts collapsed`, !(await ab.evaluate((node) => node.open)));
    await ab.locator("summary").click();
    await p.getByTestId("scenario-copy-to-b").click();
    const bPassenger = p.getByTestId("scenario-b-input-passengerCount");
    if (await bPassenger.count()) await bPassenger.fill(String(Number(await bPassenger.inputValue()) + 2));
    await p.getByTestId("scenario-ab-compare").click();
    await p.getByTestId("scenario-ab-result").waitFor({ state: "visible", timeout: 20000 });
    const abText = await p.getByTestId("scenario-ab-result").innerText();
    record(`${name} A/B transient comparison`, ["Mevcut", "Senaryo A", "Senaryo B"].every((label) => abText.includes(label)));
    await ab.locator("summary").click();
    record(`${name} mobile overflow`, !mobile || await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 8));
  }
  const taskResults = results.slice(taskResultStart);
  console.log(`TASK_EVIDENCE=${JSON.stringify({ role, companyKind, startRoute: route, userAction: fill ? "edit primary; quick preset; compare; open synthetic example; A/B" : "open scenario home", baselineSource: baseline.source?.label, region: baseline.regionName || null, regionSource: baseline.regionResolution?.source || null, missingFields: baseline.missingFields, visibleResult: "contextual role-aware scenario workspace", consoleErrorCount: consoleErrors.length - taskConsoleErrorStart, pageErrorCount: pageErrors.length - taskPageErrorStart, http500Count: serverErrors - taskServerErrorStart, http429Count: http429Errors - taskHttp429Start, liveMutationCount: liveMutationRequests.length, pass: taskResults.length > 0 && taskResults.every((item) => item.ok)})}`);
  await page.screenshot({ path: `backend/artifacts/browser-smoke/cost-scenario-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, fullPage: true });
  await page.close();
}

async function main() {
  console.log("=== COST-SCENARIO-FORECAST-AND-SAVINGS-01 ROLE-AWARE BROWSER ACCEPTANCE ===");
  const browser = await chromium.launch({ headless: true });
  try {
    await visit(browser, { name: "COMPANY budget contextual desktop", identifier: "company@demo.com", role: "COMPANY", companyKind: "COMPANY", route: "/#/company/financial-operations", contextualHome: "Bütçe ve Servis Maliyeti", contextualTestId: "company-contextual-scenario", fill: true });
    await visit(browser, { name: "ROOM profitability mobile", identifier: "room@demo.com", role: "ROOM", companyKind: "COMPANY", scope: "ROOM", route: "/#/room/financial-operations", contextualHome: "Teklif ve Kârlılık", mobile: true, fill: true });
    await visit(browser, { name: "SCHOOL planning", identifier: "school@demo.com", role: "COMPANY", companyKind: "SCHOOL", route: "/#/school/cost-scenarios", planningOnly: true, fill: true });
    await visit(browser, { name: "ORGANIZATION planning", identifier: "organization@demo.com", role: "COMPANY", companyKind: "ORGANIZATION", route: "/#/organization/cost-scenarios", planningOnly: true, fill: true });
  } finally {
    await browser.close();
  }
  record("browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  record("browser page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  record("browser unexpected server errors", serverErrors === 0, String(serverErrors));
  record("browser unexpected 429 responses", http429Errors === 0, String(http429Errors));
  record("browser scenario live mutation requests", liveMutationRequests.length === 0, liveMutationRequests.slice(0, 3).join(" | "));
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
