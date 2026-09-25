import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const out = path.join(root, "backend/artifacts/browser-smoke/pre-18-round-14-auth-session");
const driverDevice = process.env.DRIVER_BROWSER_DEVICE_ID || "web-vos7tyh6mtpo1gze";
const password = "demo123";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safePath = (url) => { try { return new URL(url).pathname; } catch { return String(url).slice(0, 160); } };

function jwtMeta(token) {
  const raw = String(token || "");
  if (!raw) return { present: false };
  try {
    const payload = JSON.parse(Buffer.from(raw.split(".")[1] || "", "base64url").toString("utf8"));
    const meta = { present: true };
    for (const key of ["sub", "role", "sv", "iat", "exp"]) if (payload[key] !== undefined) meta[key] = payload[key];
    if (payload.iat) meta.iatIso = new Date(Number(payload.iat) * 1000).toISOString();
    if (payload.exp) meta.expIso = new Date(Number(payload.exp) * 1000).toISOString();
    return meta;
  } catch { return { present: true, parseable: false }; }
}

async function browserState(page, label) {
  return page.evaluate((name) => {
    const token = localStorage.getItem("token") || "";
    const decode = (value) => {
      try { return JSON.parse(atob(String(value).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return null; }
    };
    const p = decode(token);
    return {
      label: name,
      at: new Date().toISOString(),
      hash: window.location.hash,
      token: { present: Boolean(token), sv: p?.sv ?? null, iat: p?.iat ?? null, exp: p?.exp ?? null },
      refreshTokenPresent: Boolean(localStorage.getItem("refreshToken")),
      browserDeviceId: localStorage.getItem("personel_servis_browser_device_id") || null,
      usernameVisible: Boolean(document.querySelector('input[autocomplete="username"]')),
      authPageVisible: Boolean(document.querySelector(".authPage, [data-auth-page]")),
      copilotVisible: (() => { const node = document.querySelector(".copilotDrawer"); return Boolean(node && getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden"); })(),
    };
  }, label);
}

async function login(page) {
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const user = page.locator('input[autocomplete="username"]');
  if (await user.count()) {
    await user.fill("driver@demo.com");
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  await page.goto(`${web}/#/driver/today`, { waitUntil: "domcontentloaded" });
  await sleep(700);
}

async function openDrawer(page) {
  let drawer = page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) {
    await page.locator(".copilotFab:visible").first().click();
    drawer = page.locator(".copilotDrawer:visible").first();
    await drawer.waitFor({ state: "visible", timeout: 15000 });
  }
  return drawer;
}

async function uiAsk(page, query) {
  const drawer = await openDrawer(page);
  const input = drawer.locator("textarea").first();
  const before = await browserState(page, `before-ui:${query}`);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/ai/copilot"), { timeout: 30000 }).catch(() => null);
  await input.fill(query);
  const send = drawer.locator("button").filter({ hasText: /Gönder/ }).last();
  let enabled = false;
  for (let i = 0; i < 60; i += 1) {
    if (!(await send.isDisabled().catch(() => true))) { enabled = true; break; }
    await sleep(250);
  }
  if (!enabled) return { query, at: new Date().toISOString(), status: null, apiError: "UI_SEND_REMAINED_DISABLED", before, after: await browserState(page, `after-ui-blocked:${query}`) };
  await send.click();
  const response = await responsePromise;
  let responseBody = null;
  if (response) {
    const text = await response.text().catch(() => "");
    try { responseBody = JSON.parse(text); } catch { responseBody = { rawLength: text.length }; }
  }
  await sleep(500);
  const after = await browserState(page, `after-ui:${query}`);
  return { query, at: new Date().toISOString(), status: response?.status() ?? null, apiError: responseBody?.error || responseBody?.code || responseBody?.message || null, before, after };
}

async function directAsk(page, query) {
  const result = await page.evaluate(async (message) => {
    const token = localStorage.getItem("token") || "";
    const path = String(window.location.hash || "#/driver/today").replace(/^#/, "") || "/";
    const body = { intent: "CHAT_HELP", entityType: "screen", entityId: 0, message, conversationState: { recentMessages: [], lastScreenPath: path, lastScreenLabel: path }, screenContext: { id: 0, path, label: path, role: "DRIVER" }, format: "json" };
    const response = await fetch("/api/ai/copilot", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    const text = await response.text();
    let parsed = null; try { parsed = JSON.parse(text); } catch { parsed = { rawLength: text.length }; }
    return { status: response.status, error: parsed?.error || parsed?.code || parsed?.message || null, tokenPresentAtRequest: Boolean(token) };
  }, query);
  return { query, at: new Date().toISOString(), ...result, state: await browserState(page, `after-direct:${query}`) };
}

async function meCheck(page, label) {
  return page.evaluate(async (name) => {
    const token = localStorage.getItem("token") || "";
    const response = await fetch("/api/me", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const text = await response.text();
    let body = null; try { body = JSON.parse(text); } catch { body = { rawLength: text.length }; }
    return { label: name, at: new Date().toISOString(), status: response.status, error: body?.error || body?.code || body?.message || null, tokenPresentAtRequest: Boolean(token), state: { token: { present: Boolean(localStorage.getItem("token")) }, hash: window.location.hash } };
  }, label);
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDevice);
  const page = await context.newPage();
  const events = [];
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push({ at: new Date().toISOString(), text: message.text() }); });
  page.on("pageerror", (error) => consoleErrors.push({ at: new Date().toISOString(), pageerror: String(error?.message || error) }));
  page.on("response", async (response) => {
    const status = response.status();
    if (![401, 403].includes(status) || !response.url().includes("/api/")) return;
    const text = await response.text().catch(() => "");
    let parsed = null; try { parsed = JSON.parse(text); } catch { parsed = null; }
    events.push({ at: new Date().toISOString(), status, path: safePath(response.url()), apiError: parsed?.error || parsed?.code || parsed?.message || null, bodyKeys: parsed && typeof parsed === "object" ? Object.keys(parsed).slice(0, 20) : [] });
  });

  const result = { generatedAt: new Date().toISOString(), policyObservation: { driverDeviceIdUsed: driverDevice, tokenValuesOmitted: true }, firstAuthFailure: null, responseEvents: events, consoleErrors, initial: null, ui: [], direct: [], final: null, verdict: "PENDING" };
  try {
    await login(page);
    result.initial = await browserState(page, "after-login");
    for (const route of ["/driver/today", "/driver/route", "/driver/today"]) {
      await page.goto(`${web}/#${route}`, { waitUntil: "domcontentloaded" });
      await sleep(700);
      result.ui.push({ route, at: new Date().toISOString(), state: await browserState(page, `route:${route}`), me: await meCheck(page, `route:${route}`) });
      await openDrawer(page).catch(() => null);
    }
    const directQueries = ["durum özeti", "sıradaki doğru işlem ne", "şimdi ne yapmalıyım", "aktif görevim ne"];
    for (const query of directQueries) result.direct.push(await directAsk(page, query));
    result.final = await browserState(page, "final");
  } finally {
    result.responseEvents = events;
    result.consoleErrors = consoleErrors;
    result.firstAuthFailure = events.find((event) => event.status === 401) || null;
    const allResults = [...result.ui, ...result.direct];
    const all401 = allResults.find((item) => item.status === 401 || item?.after?.token?.present === false || item?.state?.token?.present === false);
    if (!result.firstAuthFailure && all401) result.firstAuthFailure = { at: all401.at, source: all401.query, status: all401.status, apiError: all401.apiError || null };
    const uiStable = result.ui.every((item) => item.me?.status === 200 && item.state?.token?.present);
    result.verdict = uiStable && result.direct.every((item) => item.status === 200) && result.initial?.token?.present && result.final?.token?.present ? "BOUNDED_SESSION_STABLE" : "AUTH_OR_HARNESS_FAILURE_OBSERVED";
    await fs.writeFile(path.join(out, "auth-session-diagnostic.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
    await context.close().catch(() => {});
    await browser.close();
  }
  console.log(JSON.stringify({ file: path.join(out, "auth-session-diagnostic.json"), verdict: result.verdict, initial: result.initial, firstAuthFailure: result.firstAuthFailure, uiStatuses: result.ui.map((x) => ({ q: x.query, status: x.status, tokenBefore: x.before?.token?.present, tokenAfter: x.after?.token?.present })), directStatuses: result.direct.map((x) => ({ q: x.query, status: x.status, tokenAtRequest: x.tokenPresentAtRequest, tokenAfter: x.state?.token?.present })), responseEvents: result.responseEvents, consoleErrorCount: result.consoleErrors.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
