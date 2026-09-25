import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "https://knife-trip-liable-spyware.trycloudflare.com").replace(/\/$/, "");
const password = process.env.DEMO_PASSWORD || "demo123";
const reportPath = path.join(root, "package1-blocker-harness-diagnostic-report.json");

const roles = {
  ROOM: { role: "ROOM", email: "room@demo.com", home: "/room/offers" },
  COMPANY: { role: "COMPANY", email: "company@demo.com", home: "/company/shifts" },
  PERSONEL: { role: "PERSONEL", email: "personel@demo.com", home: "/personel/my" },
};

const normalize = (value) => String(value || "")
  .toLocaleLowerCase("tr-TR")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ı/g, "i")
  .replace(/ğ/g, "g")
  .replace(/ü/g, "u")
  .replace(/ş/g, "s")
  .replace(/ö/g, "o")
  .replace(/ç/g, "c")
  .replace(/\s+/g, " ")
  .trim();

function planSummary(body) {
  const plan = body?.semanticPlan || {};
  return {
    family: plan.family || null,
    taskType: plan.typedRequest?.taskType || null,
    taskVariant: plan.taskVariant || null,
    route: plan.conversationRoute || body?.conversationRoute || null,
    clarificationNeed: plan.clarificationNeed || plan.typedRequest?.ambiguity || null,
    entities: plan.entities || [],
    activeReasoningEntitySet: (plan.entities || []).length > 1 && plan.comparisonSpec?.kind === "ENTITY_COMPARISON"
      ? plan.entities
      : [],
    requestedDomains: plan.requestedDomains || [],
    authorization: plan.authorizationDecision || null,
  };
}

async function openSession(browser, spec) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(spec.email);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  await page.goto(`${web}/#${spec.home}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return { ...spec, context, page };
}

function isCopilotResponse(candidate, message) {
  try {
    if (new URL(candidate.url()).pathname !== "/api/ai/copilot" || candidate.request().method() !== "POST") return false;
    return String(candidate.request().postDataJSON()?.message || "").trim() === message.trim();
  } catch {
    return false;
  }
}

async function drawer(session) {
  let result = session.page.locator('.copilotDrawer:visible').first();
  if (!(await result.count())) {
    await session.page.locator('.copilotFab:visible').first().click();
    result = session.page.locator('.copilotDrawer:visible').first();
  }
  await result.waitFor({ state: "visible" });
  return result;
}

async function askUi(session, query) {
  const panel = await drawer(session);
  const messages = panel.locator('.copilotMsg.assistant');
  const before = await messages.count();
  await panel.locator('textarea').first().fill(query);
  const [response] = await Promise.all([
    session.page.waitForResponse((candidate) => isCopilotResponse(candidate, query), { timeout: 45000 }),
    panel.locator('button[type="submit"]').click(),
  ]);
  const body = await response.json().catch(() => ({}));
  const expected = normalize(body?.reply || body?.summary || "").slice(0, 24);
  let rendered = "";
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const count = await messages.count();
    rendered = count ? await messages.last().innerText().catch(() => "") : "";
    if (count > before && (!expected || normalize(rendered).includes(expected))) break;
    await session.page.waitForTimeout(250);
  }
  return { query, status: response.status(), body, rendered, plan: planSummary(body) };
}

async function selectRoomOffer(session) {
  const cards = session.page.locator('.pre18-room-offer-card:visible').filter({ hasText: /Vardiya\s*#\s*\d+/iu });
  await cards.first().waitFor({ state: "visible", timeout: 30000 });
  const preferred = cards.filter({ hasText: /#\s*167\b/u });
  const card = (await preferred.count()) ? preferred.first() : cards.first();
  await card.click();
  await session.page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 15000 });
  return session.page.evaluate(() => window.__psv1CopilotSelection || null);
}

async function visibleCompanyShiftIds(session) {
  const texts = await session.page.locator("[data-testid='commercial-shift-card']:visible, tbody tr:visible").allInnerTexts();
  return [...new Set(texts.flatMap((text) => [...String(text).matchAll(/(?:Vardiya|Sefer)\s*#\s*(\d+)/giu)].map((match) => Number(match[1]))).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 2);
}

async function runComparisonThenReferent(session, comparisonQuery, referents) {
  const uiBefore = await session.page.evaluate(() => window.__psv1CopilotSelection || null);
  const comparison = await askUi(session, comparisonQuery);
  const steps = [];
  for (const query of referents) steps.push(await askUi(session, query));
  return {
    role: session.role,
    route: new URL(session.page.url()).hash.replace(/^#/, ""),
    uiSelectedEntity: uiBefore,
    comparison: {
      query: comparison.query,
      status: comparison.status,
      plan: comparison.plan,
      rendered: comparison.rendered,
    },
    referents: steps.map((step) => ({ query: step.query, status: step.status, plan: step.plan, rendered: step.rendered })),
  };
}

const report = { generatedAt: new Date().toISOString(), web, mode: "real-public-ui-harness-ambiguity-diagnostic", cases: [], errors: [] };
const browser = await chromium.launch({ headless: true });
try {
  const room = await openSession(browser, roles.ROOM);
  try {
    const selection = await selectRoomOffer(room);
    report.cases.push(await runComparisonThenReferent(room, "Teklif #35 ile Teklif #34 arasındaki durum farkını karşılaştır", ["onun durumu", "şunun durumu"]));
    report.cases.at(-1).realUiSelection = selection;
  } finally {
    await room.context.close();
  }

  const company = await openSession(browser, roles.COMPANY);
  try {
    const ids = await visibleCompanyShiftIds(company);
    if (ids.length === 2) report.cases.push(await runComparisonThenReferent(company, `Vardiya #${ids[0]} ile Vardiya #${ids[1]} arasındaki durum farkını karşılaştır`, ["onun durumu", "şunun durumu"]));
    else report.cases.push({ role: "COMPANY", classification: "NOT_APPLICABLE_NO_TWO_VISIBLE_SHIFT_RECORDS", visibleShiftIds: ids });
  } finally {
    await company.context.close();
  }

  const personel = await openSession(browser, roles.PERSONEL);
  try {
    report.cases.push(await runComparisonThenReferent(personel, "Vardiya #2 ve Vardiya #3 durumlarını karşılaştır", ["onun durumu", "şunun durumu"]));
  } finally {
    await personel.context.close();
  }
} catch (error) {
  report.errors.push(String(error?.stack || error));
} finally {
  await browser.close();
}

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath, errors: report.errors, cases: report.cases }, null, 2));
process.exitCode = report.errors.length ? 1 : 0;
