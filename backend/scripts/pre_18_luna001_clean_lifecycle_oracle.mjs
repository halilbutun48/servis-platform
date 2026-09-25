import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const PUBLIC_URL = String(process.env.PUBLIC_TUNNEL_URL || "https://packed-planes-prizes-newsletters.trycloudflare.com").replace(/\/$/, "");
const RUN_ORACLE = process.env.RUN_LUNA001_CLEAN_LIFECYCLE_ORACLE === "1";
const PASSWORD = process.env.DEMO_PASSWORD || "demo123";
const IS_DIRECT_EXECUTION = path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url);

const safeHash = (value) => createHash("sha256").update(String(value || ""), "utf8").digest("hex").slice(0, 20);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function buildLuna001CleanLifecycleOracle() {
  return Object.freeze({
    version: "LUNA-001-CLEAN-LIFECYCLE-ORACLE-1",
    publicUrl: PUBLIC_URL,
    lifecycle: Object.freeze([
      "ROOM_LOGIN",
      "ROOM_SELECT_OFFER_35",
      "ROOM_ASSISTANT_QUERY",
      "UI_LOGOUT",
      "COMPANY_LOGIN",
      "ASSERT_NO_COMPANY_ASSISTANT_QUERY_OR_SELECTION",
      "COMPANY_RETURN_TO_PRODUCT_QUERY",
    ]),
    source: Object.freeze({ role: "ROOM", route: "/room/offers", entity: Object.freeze({ type: "offer", id: 35 }) }),
    target: Object.freeze({ role: "COMPANY", route: "/company/shifts", message: "az önceki teklife geri dönelim" }),
    capturedFields: Object.freeze([
      "authIdentityFingerprint",
      "authSessionFingerprint",
      "sessionVersion",
      "canonicalConversationStateKeyFingerprint",
      "selection",
      "requestScreenContext",
      "requestSelectedEntity",
      "responseSemanticPlanEntities",
    ]),
    secretPolicy: "TOKEN_OR_RAW_SESSION_VALUE_NEVER_LOGGED",
  });
}

function canonicalStateKeyFingerprint(identity = {}) {
  const authSessionId = [identity.userId, identity.iat, identity.sessionVersion, identity.pwdChangeOnly ? "pwd" : "full"].filter(Boolean).join(":");
  const canonicalKey = [
    identity.userId || "anonymous",
    String(identity.role || "").toUpperCase(),
    String(identity.companyKind || "").toUpperCase(),
    identity.companyId || "none",
    identity.roomId || "none",
    identity.sessionVersion || 1,
    authSessionId || "server-session",
  ].join("|");
  return safeHash(canonicalKey);
}

function safeSelection(raw = {}) {
  const type = String(raw?.type || raw?.entityType || raw?.selectedEntityType || "").toLowerCase();
  const id = Number(raw?.id || raw?.entityId || raw?.selectedEntityId || 0) || null;
  return { type: type || null, id };
}

function safeRequestObservation(payload = {}) {
  const screen = payload?.screenContext && typeof payload.screenContext === "object" ? payload.screenContext : {};
  return {
    screenContext: {
      path: String(screen.path || "") || null,
      selectedEntity: safeSelection(screen),
    },
    selectedEntity: safeSelection({ entityType: payload?.entityType, entityId: payload?.entityId }),
  };
}

function safeResponseObservation(payload = {}) {
  const plan = payload?.semanticPlan && typeof payload.semanticPlan === "object" ? payload.semanticPlan : {};
  const entities = Array.isArray(plan.entities) ? plan.entities : [];
  return {
    family: String(plan.family || plan.intentFamily || "") || null,
    conversationRoute: String(plan.conversationRoute || payload?.conversationRoute || "") || null,
    entities: entities.map(safeSelection).filter((entity) => entity.type || entity.id),
    entity: safeSelection(plan.entity),
  };
}

export function evaluateLuna001Contamination({ companyCopilotRequestCount = 0, companySelection = {} } = {}) {
  const reasons = [];
  if (Number(companyCopilotRequestCount || 0) !== 0) reasons.push("COMPANY_ASSISTANT_QUERY_BEFORE_TARGET");
  const selection = safeSelection(companySelection);
  if (selection.type === "offer" && selection.id === 35) reasons.push("COMPANY_ALREADY_SELECTED_SOURCE_OFFER");
  return Object.freeze({ status: reasons.length ? "CONTAMINATED" : "CLEAN", reasons: Object.freeze(reasons) });
}

async function safeAuthIdentity(page) {
  const raw = await page.evaluate(async () => {
    const token = String(localStorage.getItem("token") || "");
    let claims = {};
    try {
      const part = token.split(".")[1] || "";
      const padded = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(part.length + ((4 - (part.length % 4)) % 4), "=");
      claims = JSON.parse(atob(padded));
    } catch {
      claims = {};
    }
    let me = {};
    try {
      const response = await fetch("/api/me", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      me = response.ok ? await response.json() : {};
    } catch {
      me = {};
    }
    return {
      userId: Number(me?.id || claims?.userId || claims?.sub || 0) || null,
      role: String(me?.role || claims?.role || "").toUpperCase(),
      companyKind: String(me?.companyKind || "").toUpperCase(),
      companyId: Number(me?.companyId || 0) || null,
      roomId: Number(me?.roomId || 0) || null,
      sessionVersion: Number(claims?.sv || me?.sessionVersion || 1) || 1,
      iat: Number(claims?.iat || 0) || null,
      pwdChangeOnly: Boolean(claims?.pwdChangeOnly),
    };
  });
  return {
    role: raw.role || null,
    authIdentityFingerprint: safeHash(`${raw.userId || "anonymous"}|${raw.role || ""}|${raw.companyId || "none"}|${raw.roomId || "none"}`),
    authSessionFingerprint: safeHash(`${raw.userId || "anonymous"}|${raw.iat || "none"}|${raw.sessionVersion}`),
    sessionVersion: raw.sessionVersion,
    canonicalConversationStateKeyFingerprint: canonicalStateKeyFingerprint(raw),
  };
}

async function loginThroughUi(page, email, route) {
  await page.goto(`${PUBLIC_URL}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  await username.waitFor({ state: "visible", timeout: 30000 });
  await username.fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  await page.goto(`${PUBLIC_URL}/#${route}`, { waitUntil: "domcontentloaded" });
  await wait(500);
}

async function openDrawer(page) {
  const drawer = page.locator(".copilotDrawer:visible").first();
  if (await drawer.count()) return drawer;
  await page.locator(".copilotFab:visible").first().click();
  await drawer.waitFor({ state: "visible", timeout: 20000 });
  return drawer;
}

async function askVisible(page, message) {
  const drawer = await openDrawer(page);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/ai/copilot") && response.request().method() === "POST", { timeout: 30000 });
  const input = drawer.locator("textarea").first();
  await input.fill(message);
  await input.press("Enter");
  const response = await responsePromise;
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function logoutThroughUi(page) {
  const logout = page.getByRole("button", { name: /çıkış|cikis|logout/i }).first();
  await logout.waitFor({ state: "visible", timeout: 20000 });
  await logout.click();
  await page.waitForFunction(() => Boolean(document.querySelector('input[autocomplete="username"]')), null, { timeout: 30000 });
  const stillAuthenticated = await page.evaluate(() => Boolean(localStorage.getItem("token")));
  if (stillAuthenticated) throw new Error("UI_LOGOUT_DID_NOT_CLEAR_CLIENT_TOKEN");
}

async function runOracle() {
  const report = { oracle: buildLuna001CleanLifecycleOracle(), status: "NOT_RUN", observations: [], contamination: [] };
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
    const page = await context.newPage();
    let companyCopilotRequestCount = 0;
    page.on("request", (request) => {
      if (!request.url().includes("/api/ai/copilot") || request.method() !== "POST") return;
      if (report.phase === "COMPANY") companyCopilotRequestCount += 1;
    });

    report.phase = "ROOM";
    await loginThroughUi(page, "room@demo.com", "/room/offers");
    const roomAuth = await safeAuthIdentity(page);
    const offer = page.locator("[class~='pre18-room-offer-card']:visible").filter({ hasText: /Teklif\s*#\s*35/iu }).first();
    await offer.waitFor({ state: "visible", timeout: 30000 });
    await offer.click();
    await page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) === 35, null, { timeout: 15000 });
    const roomSelection = safeSelection(await page.evaluate(() => window.__psv1CopilotSelection || {}));
    const roomAnswer = await askVisible(page, "seçili teklifin durumu nedir");
    report.observations.push({ phase: "ROOM", auth: roomAuth, selection: roomSelection, response: safeResponseObservation(roomAnswer.body) });

    await logoutThroughUi(page);
    report.phase = "COMPANY";
    await loginThroughUi(page, "company@demo.com", "/company/shifts");
    const companyAuth = await safeAuthIdentity(page);
    const companySelection = safeSelection(await page.evaluate(() => window.__psv1CopilotSelection || {}));
    report.contamination.push(...evaluateLuna001Contamination({ companyCopilotRequestCount, companySelection }).reasons);

    const targetResponsePromise = page.waitForResponse((response) => response.url().includes("/api/ai/copilot") && response.request().method() === "POST", { timeout: 30000 });
    const drawer = await openDrawer(page);
    const input = drawer.locator("textarea").first();
    await input.fill("az önceki teklife geri dönelim");
    await input.press("Enter");
    const targetResponse = await targetResponsePromise;
    const requestObservation = safeRequestObservation(targetResponse.request().postDataJSON?.() || {});
    const targetBody = await targetResponse.json().catch(() => ({}));
    report.observations.push({ phase: "COMPANY_TARGET", auth: companyAuth, selection: companySelection, request: requestObservation, response: safeResponseObservation(targetBody) });
    report.status = report.contamination.length ? "CONTAMINATED" : "CLEAN_TARGET_RESPONSE_CAPTURED";
    await context.close();
  } finally {
    await browser.close();
  }
  delete report.phase;
  return report;
}

if (IS_DIRECT_EXECUTION) {
  if (!RUN_ORACLE) {
    console.log(JSON.stringify({ oracle: buildLuna001CleanLifecycleOracle(), status: "READY_NOT_EXECUTED" }, null, 2));
  } else {
    runOracle().then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => {
      console.error(JSON.stringify({ status: "ORACLE_EXECUTION_FAILED", error: String(error?.message || error) }));
      process.exitCode = 1;
    });
  }
}
