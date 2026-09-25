import { chromium } from "@playwright/test";

const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const roles = [
  ["SUPER_ADMIN", "superadmin@demo.com", "/superadmin"], ["ROOM", "room@demo.com", "/room/offers"], ["COMPANY", "company@demo.com", "/company/shifts"],
  ["SCHOOL", "school@demo.com", "/school/operations"], ["ORGANIZATION", "organization@demo.com", "/organization/operations"], ["DRIVER", "driver@demo.com", "/driver/today"],
  ["PERSONEL", "personel@demo.com", "/personel/live"], ["PARENT", "parent@demo.com", "/parent/live"],
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  try {
    for (const [role, email, route] of roles) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
      const page = await context.newPage();
      const row = { role, consoleErrors: [], pageErrors: [], http500: [], unexpected403: [], postLogin401: [] };
      let authenticated = false;
      page.on("console", (message) => { if (authenticated && message.type() === "error") row.consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => { if (authenticated) row.pageErrors.push(String(error?.message || error)); });
      page.on("response", (response) => {
        if (!authenticated) return;
        const status = response.status();
        if (status >= 500) row.http500.push(`${status} ${response.url()}`);
        if (status === 403 && response.url().includes("/api/")) row.unexpected403.push(response.url());
        if (status === 401 && response.url().includes("/api/")) row.postLogin401.push(response.url());
      });
      await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
      const username = page.locator('input[autocomplete="username"]');
      if (await username.count()) {
        await username.fill(email);
        await page.locator('input[autocomplete="current-password"]').fill("demo123");
        await page.locator('button[type="submit"]').click();
        await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 20000 });
      }
      authenticated = true;
      await page.goto(`${web}/#${route}`, { waitUntil: "domcontentloaded" });
      await new Promise((resolve) => setTimeout(resolve, 650));
      rows.push(row);
      await context.close();
    }
    const report = {
      web,
      roles: rows.length,
      CONSOLE_ERROR_COUNT: rows.reduce((sum, row) => sum + row.consoleErrors.length, 0),
      PAGE_ERROR_COUNT: rows.reduce((sum, row) => sum + row.pageErrors.length, 0),
      HTTP_500_COUNT: rows.reduce((sum, row) => sum + row.http500.length, 0),
      UNEXPLAINED_HTTP_403_COUNT: rows.reduce((sum, row) => sum + row.unexpected403.length, 0),
      POST_LOGIN_401_COUNT: rows.reduce((sum, row) => sum + row.postLogin401.length, 0),
      rows,
    };
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error?.stack || error); process.exitCode = 1; });
