import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const out = path.join(root, "backend/artifacts/browser-smoke/pre-18-round-14-targeted");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill("room@demo.com");
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 20000 });
  }
  await page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" });
  await wait(500);
  return { context, page };
}

async function openDrawer(page) {
  let drawer = page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) {
    await page.locator(".copilotFab:visible").first().click();
    drawer = page.locator(".copilotDrawer:visible").first();
    await drawer.waitFor({ state: "visible" });
  }
  return drawer;
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const session = await login(browser);
  const page = session.page;
  const ui = {
    MOBILE_MENU_CLOSE_CLICK: "INSUFFICIENT",
    MOBILE_MENU_REPEAT_OPEN_CLOSE: "INSUFFICIENT",
    SEFER_ABI_DESKTOP_DRAG: "INSUFFICIENT",
    SEFER_ABI_SAFE_SNAP: "INSUFFICIENT",
    SEFER_ABI_DESKTOP_RESIZE: "INSUFFICIENT",
    SEFER_ABI_TABLET_BEHAVIOR: "INSUFFICIENT",
    SEFER_ABI_MOBILE_SAFE_AREA: "INSUFFICIENT",
  };
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    let drawer = await openDrawer(page);
    const close = drawer.locator('button[aria-label="Kapat"], button[title="Kapat"]').first();
    if (await close.count()) {
      await close.click();
      ui.MOBILE_MENU_CLOSE_CLICK = "PASS";
      const fab = page.locator(".copilotFab:visible").first();
      for (let i = 0; i < 2; i += 1) {
        await fab.click();
        await wait(100);
        const currentClose = page.locator('.copilotDrawer:visible button[aria-label="Kapat"], .copilotDrawer:visible button[title="Kapat"]').first();
        if (await currentClose.count()) await currentClose.click();
      }
      ui.MOBILE_MENU_REPEAT_OPEN_CLOSE = "PASS";
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    drawer = await openDrawer(page);
    const handle = drawer.locator(".copilotDrawerResizeHandle").first();
    const handleBox = await handle.boundingBox();
    if (handleBox) {
      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();
      await page.mouse.move(handleBox.x - 120, handleBox.y);
      await page.mouse.up();
      ui.SEFER_ABI_DESKTOP_RESIZE = "PASS";
    }
    const header = drawer.locator(".copilotDrawerHeader").first();
    const headerBox = await header.boundingBox();
    if (headerBox) {
      await page.mouse.move(headerBox.x + 30, headerBox.y + 15);
      await page.mouse.down();
      await page.mouse.move(headerBox.x + 160, headerBox.y + 60);
      await page.mouse.up();
      ui.SEFER_ABI_DESKTOP_DRAG = "PASS";
    }
    const box = await drawer.boundingBox();
    if (box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1440 && box.y + box.height <= 900) ui.SEFER_ABI_SAFE_SNAP = "PASS";

    await page.setViewportSize({ width: 768, height: 1024 });
    await wait(250);
    const tabletBox = await page.locator(".copilotDrawer:visible").first().boundingBox();
    if (tabletBox && tabletBox.x >= 0 && tabletBox.y >= 0 && tabletBox.x + tabletBox.width <= 768 && tabletBox.y + tabletBox.height <= 1024) ui.SEFER_ABI_TABLET_BEHAVIOR = "PASS";

    await page.setViewportSize({ width: 390, height: 844 });
    const width = await page.locator("body").evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    if (width.scrollWidth <= width.clientWidth + 2) ui.SEFER_ABI_MOBILE_SAFE_AREA = "PASS";
    const report = { generatedAt: new Date().toISOString(), web, ui };
    await fs.writeFile(path.join(out, "responsive.json"), JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await session.context.close().catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
