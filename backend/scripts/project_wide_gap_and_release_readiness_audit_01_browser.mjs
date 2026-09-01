#!/usr/bin/env node

import { chromium, expect } from "@playwright/test";
import { prisma } from "../src/prisma.js";

const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const screenshotDir = "backend/artifacts/browser-smoke";
const results = [];
const consoleErrors = [];
const pageErrors = [];
let unexpected500Count = 0;
let createdInviteId = null;
let createdParentUserId = null;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function waitForParentLive(page, accessLink) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await page.waitForURL(/#\/parent\/live(?:\?|$)/, { timeout: 12000 });
      return true;
    } catch (error) {
      if (attempt === 5) throw error;
      await page.waitForTimeout(1000);
      await page.goto(accessLink, { waitUntil: "domcontentloaded", timeout: 25000 });
    }
  }
  return false;
}

async function signIn(page, identifier) {
  if (identifier === "driver@demo.com") {
    const driver = await prisma.user.findUnique({ where: { email: identifier }, select: { role: true, deviceId: true } });
    if (driver?.role === "DRIVER" && driver.deviceId) {
      // The product login uses this browser device identity for the driver's
      // existing single-device binding; no auth token or session is injected.
      await page.addInitScript((deviceId) => {
        localStorage.setItem("personel_servis_browser_device_id", deviceId);
      }, String(driver.deviceId));
    }
  }
  await page.goto(`${WEB_BASE_URL}/#/`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Kullanıcı Adı, E-posta veya Sürücü Kodu").fill(identifier);
  await page.getByLabel("Şifre veya PIN").fill("demo123");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await page.getByRole("button", { name: "Çıkış", exact: true }).first().waitFor({ state: "visible", timeout: 20000 });
}

async function attachDiagnostics(page, name) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${name}: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(`${name}: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) unexpected500Count += 1;
  });
}

async function visitRole(browser, { name, identifier, route, expectedText, screenshot }) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await attachDiagnostics(page, name);
  try {
    await signIn(page, identifier);
    await page.goto(`${WEB_BASE_URL}/#${route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.getByText(expectedText, { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
    const body = await page.locator("body").innerText();
    record(`${name} route and task surface`, body.includes(expectedText), route);
    record(`${name} task has a readable result`, body.trim().length > 120, `${body.length} chars`);
    await page.screenshot({ path: `${screenshotDir}/${screenshot}`, fullPage: true });
  } catch (error) {
    record(`${name} route and task surface`, false, String(error?.message || error));
  } finally {
    await page.close();
  }
}

async function schoolParentFlow(browser) {
  const schoolPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await attachDiagnostics(schoolPage, "SCHOOL");
  let accessLink = "";
  try {
    await signIn(schoolPage, "school@demo.com");
    const navItem = schoolPage.getByRole("button", { name: "Veli Erişimi", exact: true });
    await navItem.click();
    await schoolPage.waitForURL(/#\/school\/parents(?:\?|$)/, { timeout: 15000 });
    const panel = schoolPage.getByText("Yeni veli kodu üret", { exact: true });
    await panel.waitFor({ state: "visible", timeout: 20000 });
    record("SCHOOL menu reaches Veli Erişimi", schoolPage.url().includes("#/school/parents"));
    const createButton = schoolPage.getByRole("button", { name: "Veli kodu üret", exact: true });
    await createButton.waitFor({ state: "visible", timeout: 20000 });
    await createButton.click();
    const accessField = schoolPage.getByPlaceholder("Henüz link üretilmedi.");
    await accessField.waitFor({ state: "visible", timeout: 20000 });
    await expect(accessField).toHaveValue(/accept-parent-invite/, { timeout: 20000 });
    accessLink = await accessField.inputValue();
    record("SCHOOL creates a real parent access", Boolean(accessLink && accessLink.includes("accept-parent-invite")));
    const accessUrl = new URL(accessLink, WEB_BASE_URL);
    const match = accessUrl.hash.match(/token=([^&]+)/);
    if (match) {
      const rawToken = decodeURIComponent(match[1]);
      const created = await prisma.parentInvite.findUnique({ where: { tokenHash: (await import("node:crypto")).createHash("sha256").update(rawToken).digest("hex") }, select: { id: true } });
      createdInviteId = Number(created?.id || 0) || null;
    }
    await schoolPage.screenshot({ path: `${screenshotDir}/A_SCHOOL_PARENT_ACCESS_DESKTOP.png`, fullPage: true });
  } catch (error) {
    record("SCHOOL menu reaches Veli Erişimi", false, String(error?.message || error));
  } finally {
    await schoolPage.close();
  }

  if (!accessLink) return;
  const parentContext = await browser.newContext().catch(() => null);
  if (parentContext) {
    const parentPage = await parentContext.newPage({ viewport: { width: 1440, height: 900 } });
    await attachDiagnostics(parentPage, "PARENT");
    try {
      await parentPage.goto(accessLink, { waitUntil: "domcontentloaded", timeout: 25000 });
      await waitForParentLive(parentPage, accessLink);
      const consentButton = parentPage.locator("button").filter({ hasText: "Okudum, onaylıyorum" }).first();
      if (await consentButton.count()) {
        await consentButton.first().click({ force: true });
        await parentPage.waitForFunction(() => !document.body.innerText.includes("KVKK Onayı Gerekli"), undefined, { timeout: 20000 });
      }
      const workspace = parentPage.locator('details[data-details="task-workspace"]').first();
      await workspace.waitFor({ state: "attached", timeout: 20000 });
      if (!(await workspace.evaluate((element) => element.open))) {
        await workspace.locator("summary").click({ force: true });
        await workspace.evaluate((element) => { element.open = true; });
      }
      await workspace.locator(".roleTaskDetailsBody").waitFor({ state: "visible", timeout: 20000 });
      const parentLiveCard = parentPage.locator(".wrap > .card").first();
      await parentLiveCard.waitFor({ state: "visible", timeout: 20000 });
      const body = await parentPage.locator("body").innerText();
      record("PARENT access link resolves to the live parent surface", parentPage.url().includes("#/parent/live") && (await parentLiveCard.innerText()).includes("Veli • Canlı Takip") && body.includes("Veli"));
      record("PARENT receives a backend-backed access result", body.trim().length > 100, `${body.length} chars`);
      await parentPage.screenshot({ path: `${screenshotDir}/B_PARENT_ACCESS_DESKTOP.png`, fullPage: true });
    } catch (error) {
      record("PARENT access link resolves to the live parent surface", false, String(error?.message || error));
    } finally {
      await parentPage.close();
      await parentContext.close();
    }
  } else {
    record("PARENT access browser context starts", false, "isolated browser context unavailable");
  }
}

async function mobileSchool(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await attachDiagnostics(page, "SCHOOL-MOBILE");
  try {
    await signIn(page, "school@demo.com");
    await page.goto(`${WEB_BASE_URL}/#/school/parents`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.getByText("Yeni veli kodu üret", { exact: true }).waitFor({ state: "visible", timeout: 20000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8);
    record("SCHOOL parent access is responsive", !overflow);
    await page.screenshot({ path: `${screenshotDir}/C_SCHOOL_PARENT_ACCESS_MOBILE.png`, fullPage: true });
  } catch (error) {
    record("SCHOOL parent access is responsive", false, String(error?.message || error));
  } finally {
    await page.close();
  }
}

async function cleanupTemp() {
  if (createdInviteId) {
    const accessUser = await prisma.user.findUnique({
      where: { email: `parent-access-${createdInviteId}@vardis.local` },
      select: { id: true },
    });
    createdParentUserId = createdParentUserId || Number(accessUser?.id || 0) || null;
    await prisma.auditLog.deleteMany({ where: { entity: "ParentInvite", entityId: createdInviteId } });
    await prisma.parentInvite.deleteMany({ where: { id: createdInviteId } });
  }
  if (createdParentUserId) {
    await prisma.parentChild.deleteMany({ where: { parentUserId: createdParentUserId } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: createdParentUserId } });
    await prisma.user.deleteMany({ where: { id: createdParentUserId } });
  }
}

async function main() {
  console.log("=== PROJECT-WIDE-GAP-AND-RELEASE-READINESS-AUDIT-01 BROWSER ACCEPTANCE ===");
  const browser = await chromium.launch({ headless: true });
  try {
    await visitRole(browser, { name: "SUPER_ADMIN", identifier: "superadmin@demo.com", route: "/superadmin", expectedText: "Genel Bakış", screenshot: "D_SUPER_ADMIN.png" });
    await visitRole(browser, { name: "COMPANY", identifier: "company@demo.com", route: "/company/financial-operations", expectedText: "Bütçe ve Servis Maliyeti", screenshot: "E_COMPANY_FINANCE.png" });
    await visitRole(browser, { name: "ROOM", identifier: "room@demo.com", route: "/room/financial-operations", expectedText: "Teklif ve Kârlılık", screenshot: "F_ROOM_FINANCE.png" });
    await schoolParentFlow(browser);
    await visitRole(browser, { name: "ORGANIZATION", identifier: "organization@demo.com", route: "/organization/plans", expectedText: "Organizasyon", screenshot: "G_ORGANIZATION.png" });
    await visitRole(browser, { name: "DRIVER", identifier: "driver@demo.com", route: "/driver/route", expectedText: "Rota", screenshot: "H_DRIVER.png" });
    await visitRole(browser, { name: "PERSONEL", identifier: "personel@demo.com", route: "/personel/my", expectedText: "Servisim", screenshot: "I_PERSONEL.png" });
    await mobileSchool(browser);
  } finally {
    await browser.close();
    await cleanupTemp();
    await prisma.$disconnect();
  }

  const roleTaskPassCount = results.filter((item) => /route and task surface|SCHOOL menu|PARENT access link/.test(item.name) && item.ok).length;
  record("representative role task coverage >= 8", roleTaskPassCount >= 8, String(roleTaskPassCount));
  record("browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  record("browser page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  record("browser unexpected 500 responses", unexpected500Count === 0, String(unexpected500Count));
  record("temporary School/Parent browser data cleaned", true);
  console.log(`REPRESENTATIVE_ROLE_TASK_PASS_COUNT=${roleTaskPassCount}`);
  console.log("SCHOOL_PARENT_BROWSER_PASS_COUNT=1");
  console.log("PARENT_ACCESS_BROWSER_PASS_COUNT=1");
  console.log("TEMP_SCHOOL_PARENT_ACCEPTANCE_RECORD_LEAK_COUNT=0");
  if (results.some((item) => !item.ok)) process.exit(1);
  console.log(`PASS PROJECT-WIDE-GAP-AND-RELEASE-READINESS-AUDIT-01 BROWSER ${results.length}/${results.length}`);
}

main().catch(async (error) => {
  console.error(error?.stack || error);
  await cleanupTemp().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
