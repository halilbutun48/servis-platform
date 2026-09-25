import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "https://knife-trip-liable-spyware.trycloudflare.com").replace(/\/$/, "");
const diagnosticRole = String(process.env.RENDER_DIAG_ROLE || "SUPER_ADMIN").toUpperCase();
const diagnosticSpec = {
  SUPER_ADMIN: { email: "superadmin@demo.com", route: "/superadmin/operations", queries: ["sıradaki doğru işlem ne", "şimdi ne yapmalıyım"] },
  COMPANY: { email: "company@demo.com", route: "/company/shifts", queries: ["sıradaki doğru işlem ne", "şimdi ne yapmalıyım"] },
  PERSONEL: { email: "personel@demo.com", route: "/personel/my", queries: ["sıradaki doğru işlem ne", "şimdi ne yapmalıyım"] },
}[diagnosticRole] || null;
if (!diagnosticSpec) throw new Error(`UNSUPPORTED_RENDER_DIAG_ROLE:${diagnosticRole}`);
const reportPath = path.join(root, process.env.RENDER_REPORT_NAME || "package1-render-assertion-diagnostic-report.json");
const normalize = (value) => String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, " ").trim();
const report = { generatedAt: new Date().toISOString(), web, role: diagnosticRole, route: diagnosticSpec.route, cases: [], errors: [], consoleErrors: [], pageErrors: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.on("console", (message) => { if (message.type() === "error") report.consoleErrors.push(message.text()); });
page.on("pageerror", (error) => report.pageErrors.push(String(error?.message || error)));

function isCopilot(response, query) {
  try { return new URL(response.url()).pathname === "/api/ai/copilot" && response.request().method() === "POST" && String(response.request().postDataJSON()?.message || "").trim() === query.trim(); } catch { return false; }
}

try {
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(diagnosticSpec.email);
    await page.locator('input[autocomplete="current-password"]').fill(process.env.DEMO_PASSWORD || "demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  await page.goto(`${web}/#${diagnosticSpec.route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const drawer = page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) { await page.locator(".copilotFab:visible").first().click(); await drawer.waitFor({ state: "visible" }); }
  const messages = drawer.locator(".copilotMsg.assistant");
  for (const query of diagnosticSpec.queries) {
    const beforeCount = await messages.count();
    const beforeTexts = await messages.allInnerTexts();
    await drawer.locator("textarea").first().fill(query);
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => isCopilot(candidate, query), { timeout: 45000 }),
      drawer.locator('button[type="submit"]').click(),
    ]);
    const body = await response.json().catch(() => ({}));
    const expected = normalize(body?.reply || body?.summary || "");
    await page.waitForTimeout(1000);
    const afterTexts = await messages.allInnerTexts();
    const last = afterTexts.at(-1) || "";
    const responsePrefix = expected.slice(0, 28);
    report.cases.push({ query, status: response.status(), beforeCount, afterCount: afterTexts.length, beforeLast: beforeTexts.at(-1) || "", responsePrefix, renderedLast: last.slice(0, 1200), renderedIncludesFullPrefix: normalize(last).includes(responsePrefix), assistantTexts: afterTexts.map((text) => text.slice(0, 500)) });
    await page.waitForTimeout(1200);
  }
} catch (error) {
  report.errors.push(String(error?.stack || error));
} finally {
  await context.close().catch(() => {});
  await browser.close();
}

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.errors.length || report.consoleErrors.length || report.pageErrors.length ? 1 : 0;
