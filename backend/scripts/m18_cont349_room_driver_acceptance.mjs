import { chromium } from "@playwright/test";

const base = process.env.M18_BASE_URL || "http://localhost:5273";
const identifier = "src-759421@driver.local";
const driverId = 8;

async function waitForApp(page) {
  await page.waitForTimeout(900);
  await page.waitForLoadState("domcontentloaded").catch(() => {});
}

async function login(page, user, password) {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await waitForApp(page);
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(user);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await waitForApp(page);
  }
}

function visibleText(page) {
  return page.locator("body").innerText().catch(() => "");
}

const browser = await chromium.launch({ headless: true });
const room = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const roomPage = await room.newPage();
const apiEvents = [];
roomPage.on("response", (response) => {
  if (!response.url().includes("/api/")) return;
  apiEvents.push({ method: response.request().method(), status: response.status(), path: new URL(response.url()).pathname });
});
roomPage.on("dialog", async (dialog) => { await dialog.accept(); });

await login(roomPage, "room@demo.com", "demo123");
await roomPage.goto(`${base}/#/room/drivers`, { waitUntil: "domcontentloaded" });
await waitForApp(roomPage);

const managementButton = roomPage.locator("button:visible").filter({ hasText: "Yönetim" }).first();
const managementHtml = await managementButton.count() ? await managementButton.first().evaluate((node) => node.outerHTML).catch(() => "") : "";
if (await managementButton.count()) {
  await managementButton.click();
  await roomPage.waitForTimeout(500);
}
const managementDetails = roomPage.locator("button:visible").filter({ hasText: "Yönetim detayları" }).first();
if (await managementDetails.count()) {
  await managementDetails.click();
  await roomPage.waitForTimeout(500);
}

const bodyBefore = await visibleText(roomPage);
const driverRow = roomPage.locator("tr").filter({ hasText: "M18 CONT162 AUDIT DRIVER" }).last();
const rowCount = await driverRow.count();
const rowButtons = rowCount ? await driverRow.locator("button:visible").allInnerTexts() : [];
const allButtons = await roomPage.locator("button:visible").allInnerTexts();

let pinReset = null;
let deviceReset = null;
if (rowCount) {
  const pinButton = driverRow.getByRole("button", { name: "PIN üret", exact: true });
  if (await pinButton.count()) {
    const responsePromise = roomPage.waitForResponse((r) => r.url().includes(`/api/drivers/${driverId}/reset-pin`), { timeout: 8000 }).catch(() => null);
    await pinButton.click();
    const response = await responsePromise;
    const payload = response ? await response.json().catch(() => ({})) : {};
    pinReset = { status: response?.status() || null, hasIssuedCredentials: Boolean(payload?.issuedCredentials?.temporaryPin), driverCodeVisible: Boolean(payload?.issuedCredentials?.driverCode) };
  }
  const deviceButton = driverRow.getByRole("button", { name: "Cihaz sıfırla", exact: true });
  if (await deviceButton.count()) {
    const responsePromise = roomPage.waitForResponse((r) => r.url().includes(`/api/drivers/${driverId}/reset-device`), { timeout: 8000 }).catch(() => null);
    await deviceButton.click();
    const response = await responsePromise;
    const payload = response ? await response.json().catch(() => ({})) : {};
    deviceReset = { status: response?.status() || null, hadDeviceBinding: payload?.hadDeviceBinding ?? null, revokedSessions: payload?.revokedSessions ?? null, sessionVersionBumped: Number.isFinite(Number(payload?.sessionVersionBumpedTo)) };
  }
}

const bodyAfter = await visibleText(roomPage);
console.log(JSON.stringify({
  route: roomPage.url(),
  rowCount,
  rowButtons,
  buttonInventory: allButtons.filter((x) => /PIN|Cihaz|Yönetim|Sıfırla/i.test(x)),
  managementHtml,
  bodySnippet: bodyAfter.slice(0, 4500),
  visibleResetFeedback: bodyAfter.includes("erişim sıfırlandı") || bodyAfter.includes("Cihaz bağı ve aktif erişimler sıfırlandı"),
  bodyHadDriver: bodyBefore.includes("M18 CONT162 AUDIT DRIVER"),
  pinReset,
  deviceReset,
  apiEvents: apiEvents.slice(-12),
}, null, 2));

await browser.close();
