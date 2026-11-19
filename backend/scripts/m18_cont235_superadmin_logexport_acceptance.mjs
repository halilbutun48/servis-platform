import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const LOCAL = String(process.env.M18_WEB_BASE_URL || "http://localhost:5273").replace(/\/$/u, "");
const PUBLIC = String(process.env.M18_PUBLIC_WEB_BASE_URL || "https://plenty-rss-scenario-connected.trycloudflare.com").replace(/\/$/u, "");
const CHROME = process.env.M18_CHROMIUM_EXECUTABLE || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const output = { continuation: "235", local: {}, public: {}, negative: {} };

async function login(page, identifier) {
  const identifierInput = page.locator('input[type="email"], input[placeholder*="demo.com"], input').first();
  if (await identifierInput.count()) {
    await identifierInput.fill(identifier);
    await page.locator('input[type="password"]').fill("demo123");
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click({ noWaitAfter: true, timeout: 5000 });
    await page.waitForTimeout(3000);
  }
}

async function acceptLogExport(browserInstance, base, { download = false } = {}) {
  const context = await browserInstance.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul", acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
  try {
    await page.goto(`${base}/#/superadmin/logexport`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await login(page, "superadmin@demo.com");
    await page.getByRole("heading", { name: "İşlem kayıtlarını dışa aktar" }).waitFor({ state: "visible", timeout: 20000 });
    const previewButton = page.getByRole("button", { name: "Önizlemeyi göster", exact: true });
    const previewResponse = page.waitForResponse((response) => response.url().includes("/api/admin/logs/preview") && response.request().method() === "GET", { timeout: 15000 });
    await previewButton.click({ noWaitAfter: true, timeout: 5000 });
    const preview = await previewResponse;
    assert.equal(preview.status(), 200, `${base} log preview must return HTTP 200`);
    await page.getByRole("button", { name: "Dışa aktar", exact: true }).waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await page.locator('[data-status="COUNT"]').count(), 1, `${base} log count must be visible`);
    const widths = {};
    for (const width of [1440, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      widths[width] = {
        overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
        exportVisible: await page.getByRole("button", { name: "Dışa aktar", exact: true }).isVisible(),
        titleVisible: await page.getByRole("heading", { name: "İşlem kayıtlarını dışa aktar" }).isVisible(),
      };
      widths[width].exportCount = await page.getByRole("button", { name: "Dışa aktar", exact: true }).count();
      console.log(JSON.stringify({ stage: "responsive-check", base, width, result: widths[width] }));
      assert.equal(widths[width].overflow, false, `${base} log export must not overflow at ${width}px`);
      assert.equal(widths[width].exportVisible, true, `${base} export action must remain visible at ${width}px`);
      assert.equal(widths[width].titleVisible, true, `${base} export title must remain visible at ${width}px`);
    }
    let file = null;
    if (download) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const downloadEvent = page.waitForEvent("download", { timeout: 15000 });
      const exportResponse = page.waitForResponse((response) => response.url().includes("/api/admin/logs/export") && response.request().method() === "GET", { timeout: 15000 });
      await page.getByRole("button", { name: "Dışa aktar", exact: true }).click({ noWaitAfter: true, timeout: 5000 });
      const [downloaded, exported] = await Promise.all([downloadEvent, exportResponse]);
      assert.equal(exported.status(), 200, `${base} log export must return HTTP 200`);
      const filePath = path.join(os.tmpdir(), `seferpakt-cont235-${Date.now()}.txt`);
      await downloaded.saveAs(filePath);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 0, `${base} exported log file must not be empty`);
      file = { filename: downloaded.suggestedFilename(), bytes: stat.size };
      fs.rmSync(filePath, { force: true });
    }
    const unexpected = errors.filter((entry) => !/favicon|source map/iu.test(entry));
    assert.deepEqual(unexpected, [], `${base} unexpected browser errors: ${unexpected.join(" | ")}`);
    return { previewStatus: preview.status(), widths, file, route: page.url() };
  } finally {
    await context.close();
  }
}

async function assertCompanyDenied(browserInstance, base) {
  const context = await browserInstance.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/#/superadmin/logexport`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await login(page, "company@demo.com");
    await page.waitForTimeout(1000);
    const body = await page.locator("body").innerText();
    const denied = !body.includes("İşlem kayıtlarını dışa aktar") || !(await page.getByRole("button", { name: "Dışa aktar", exact: true }).count());
    assert.equal(denied, true, `${base} COMPANY must not receive SUPER_ADMIN log export controls`);
    return { denied, route: page.url() };
  } finally {
    await context.close();
  }
}

const launch = () => chromium.launch({ headless: true, executablePath: CHROME });
const localBrowser = await launch();
try {
  output.local = await acceptLogExport(localBrowser, LOCAL, { download: true });
  output.negative.local = await assertCompanyDenied(localBrowser, LOCAL);
} finally {
  await localBrowser.close();
}
const publicBrowser = await launch();
try {
  output.public = await acceptLogExport(publicBrowser, PUBLIC, { download: false });
  output.negative.public = await assertCompanyDenied(publicBrowser, PUBLIC);
} finally {
  await publicBrowser.close();
}
console.log(JSON.stringify(output, null, 2));
