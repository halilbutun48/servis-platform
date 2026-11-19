import { chromium } from "@playwright/test";

const base = process.env.M18_BASE_URL || "http://localhost:5273";
const driverId = 8;
const driverCode = "SRC-759421";
const driverEmail = "src-759421@driver.local";

async function settle(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(900);
}

async function uiLogin(page, identifier, password) {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const username = page.locator('input[autocomplete="username"]');
  if (!(await username.count())) return { status: null, url: page.url(), text: await page.locator("body").innerText() };
  await username.fill(identifier);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  const responsePromise = page.waitForResponse((r) => r.url().includes("/api/auth/login"), { timeout: 10000 }).catch(() => null);
  await page.locator('button[type="submit"]').click();
  const response = await responsePromise;
  await settle(page);
  return { status: response?.status() || null, url: page.url(), text: await page.locator("body").innerText() };
}

async function openRoomManagement(page) {
  await page.goto(`${base}/#/room/drivers`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const tab = page.locator("button:visible").filter({ hasText: "Yönetim" }).first();
  if (await tab.count()) {
    await tab.click();
    await page.waitForTimeout(450);
  }
  const details = page.locator("button:visible").filter({ hasText: "Yönetim detayları" }).first();
  if (await details.count()) {
    await details.click();
    await page.waitForTimeout(450);
  }
}

async function clickDriverAction(page, label) {
  const row = page.locator("tr").filter({ hasText: "M18 CONT162 AUDIT DRIVER" }).last();
  if (!(await row.count())) return { status: null, rowFound: false };
  const button = row.getByRole("button", { name: label, exact: true });
  if (!(await button.count())) return { status: null, rowFound: true, buttonFound: false };
  const responsePromise = page.waitForResponse((r) => r.url().includes(`/api/drivers/${driverId}/`), { timeout: 10000 }).catch(() => null);
  await button.click();
  const response = await responsePromise;
  const payload = response ? await response.json().catch(() => ({})) : {};
  await page.waitForTimeout(450);
  return { status: response?.status() || null, rowFound: true, buttonFound: true, payload };
}

function safeBody(text) {
  return {
    loginVisible: /SeferPakt hesabınla devam et|Giriş yap/i.test(text),
    pinChangeVisible: /Yeni PIN belirle/i.test(text),
    wrongPinMessage: /Kimlik bilgileri hatalı|PIN.*hatalı|geçersiz/i.test(text),
    deviceMismatchMessage: /başka bir cihaza bağlı|cihaz.*eşleş|cihaz bilgisi gerekli/i.test(text),
    resetFeedback: /erişim sıfırlandı|Cihaz bağı ve aktif erişimler sıfırlandı/i.test(text),
    accessDenied: /erişim yok|yetkili kapsamına dahil değil/i.test(text),
  };
}

const browser = await chromium.launch({ headless: true });
const roomContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const roomPage = await roomContext.newPage();
roomPage.on("dialog", async (dialog) => { await dialog.accept(); });

const roomLogin = await uiLogin(roomPage, "room@demo.com", "demo123");
await openRoomManagement(roomPage);
const pinResult = await clickDriverAction(roomPage, "PIN üret");
const temporaryPin = String(pinResult?.payload?.issuedCredentials?.temporaryPin || "");
const issuedDriverCode = String(pinResult?.payload?.issuedCredentials?.driverCode || "");

// Re-open the supported UI after the PIN action so the device-reset click uses a fresh mounted row.
await openRoomManagement(roomPage);
const deviceResult = await clickDriverAction(roomPage, "Cihaz sıfırla");
const roomTextAfterReset = await roomPage.locator("body").innerText();

const wrongContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const wrongPage = await wrongContext.newPage();
const wrongLogin = await uiLogin(wrongPage, driverCode, "00000000");

const driverContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const driverPage = await driverContext.newPage();
const correctLogin = await uiLogin(driverPage, issuedDriverCode || driverCode, temporaryPin);
const driverTextAfterLogin = await driverPage.locator("body").innerText();

const mismatchContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const mismatchPage = await mismatchContext.newPage();
const mismatchLogin = await uiLogin(mismatchPage, issuedDriverCode || driverCode, temporaryPin);

// Invalidate the first valid driver session through the normal ROOM action, then reload the old driver page.
await openRoomManagement(roomPage);
const secondDeviceReset = await clickDriverAction(roomPage, "Cihaz sıfırla");
const secondDeviceResetUi = safeBody(await roomPage.locator("body").innerText());
const oldSessionReadbackStatus = await driverPage.evaluate(async () => {
  const response = await fetch("/api/me");
  return response.status;
}).catch(() => null);
await driverPage.goto(`${base}/#/driver/today`, { waitUntil: "domcontentloaded" });
await settle(driverPage);
const oldSessionText = await driverPage.locator("body").innerText();

const companyContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const companyPage = await companyContext.newPage();
await uiLogin(companyPage, "company@demo.com", "demo123");
await companyPage.goto(`${base}/#/room/drivers`, { waitUntil: "domcontentloaded" });
await settle(companyPage);
const companyNegativeText = await companyPage.locator("body").innerText();

// Read only: audit evidence through the visible SUPER_ADMIN session's browser context.
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const adminPage = await adminContext.newPage();
await uiLogin(adminPage, "superadmin@demo.com", "demo123");
const auditReadback = await adminPage.evaluate(async () => {
  const response = await fetch("/api/admin/audit-logs?take=100&entity=Driver&entityId=8");
  const json = await response.json().catch(() => ({}));
  const items = Array.isArray(json?.items) ? json.items : Array.isArray(json?.data) ? json.data : Array.isArray(json?.rows) ? json.rows : [];
  const wanted = items.filter((x) => ["AUTH_DRIVER_PIN_RESET", "AUTH_DRIVER_DEVICE_RESET", "AUTH_LOGIN_DEVICE_MISMATCH", "AUTH_LOGIN_FAIL"].includes(x?.action));
  return { status: response.status, keys: Object.keys(json || {}), count: items.length, wanted: wanted.slice(0, 20).map((x) => ({ id: x.id, action: x.action, actorRole: x.actorRole, entity: x.entity, entityId: x.entityId, metaKeys: Object.keys(x.meta || {}) })) };
});

console.log(JSON.stringify({
  driver: { id: driverId, codeKnown: issuedDriverCode === driverCode, protectedPinOmitted: true },
  roomLogin: { status: roomLogin.status, url: roomLogin.url },
  pinReset: { status: pinResult.status, rowFound: pinResult.rowFound, buttonFound: pinResult.buttonFound, issued: Boolean(temporaryPin), driverCodeIssued: Boolean(issuedDriverCode) },
  deviceReset: { status: deviceResult.status, rowFound: deviceResult.rowFound, buttonFound: deviceResult.buttonFound, hadDeviceBinding: deviceResult.payload?.hadDeviceBinding ?? null, revokedSessions: deviceResult.payload?.revokedSessions ?? null, sessionVersionBumped: Number.isFinite(Number(deviceResult.payload?.sessionVersionBumpedTo)), ui: safeBody(roomTextAfterReset) },
  wrongPin: { status: wrongLogin.status, ui: safeBody(wrongLogin.text) },
  correctLogin: { status: correctLogin.status, pinChange: safeBody(driverTextAfterLogin).pinChangeVisible, route: correctLogin.url },
  wrongDevice: { status: mismatchLogin.status, ui: safeBody(mismatchLogin.text) },
  oldSessionAfterReset: safeBody(oldSessionText),
  companyTenantNegative: safeBody(companyNegativeText),
  secondDeviceReset: { status: secondDeviceReset.status, hadDeviceBinding: secondDeviceReset.payload?.hadDeviceBinding ?? null, revokedSessions: secondDeviceReset.payload?.revokedSessions ?? null, sessionVersionBumped: Number.isFinite(Number(secondDeviceReset.payload?.sessionVersionBumpedTo)) },
  secondDeviceResetUi,
  oldSessionReadbackStatus,
  auditReadback,
}, null, 2));

await browser.close();
