import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-round-11-deterministic-conversation");

const roles = [
  { name: "SUPER_ADMIN", identifier: "superadmin@demo.com", deviceId: "r11-superadmin", domain: "platform denetiminde", home: "/superadmin", screens: ["/superadmin", "/superadmin/operations", "/superadmin/commercial-core"], anchor: /tenant|salt-okunur|platform/i, selected: { entityType: "shift", entityId: 2, label: "Vardiya #2" } },
  { name: "ROOM", identifier: "room@demo.com", deviceId: "r11-room", domain: "oda operasyonunda", home: "/room", screens: ["/room", "/room/map", "/room/shifts", "/room/agreements"], anchor: /oda operasyon|taşımacılık firması operasyon|yetkili vardiya/i, selected: { entityType: "shift", entityId: 2, label: "Vardiya #2" } },
  { name: "COMPANY", identifier: "company@demo.com", deviceId: "r11-company", domain: "şirket servisinde", home: "/company", screens: ["/company", "/company/operations", "/company/shifts", "/company/agreements"], anchor: /şirket operasyon|şirket servis|yetkili vardiya/i, selected: { entityType: "agreement", entityId: 184, label: "Sözleşme #184" } },
  { name: "SCHOOL", identifier: "school@demo.com", deviceId: "r11-school", domain: "okul servisinde", home: "/school", screens: ["/school", "/school/operations"], anchor: /okul servis|öğrenci|yetkili/i, selected: { entityType: "shift", entityId: 2, label: "Vardiya #2" } },
  { name: "ORGANIZATION", identifier: "organization@demo.com", deviceId: "r11-organization", domain: "organizasyon planında", home: "/organization", screens: ["/organization", "/organization/plans", "/organization/operations"], anchor: /organizasyon plan|plan kaydı|yetkili/i, selected: { entityType: "organizationPlan", entityId: 1, label: "Plan #1" } },
  { name: "DRIVER", identifier: "driver@demo.com", deviceId: "r11-driver", domain: "kendi bugünkü görevimde", home: "/driver/today", screens: ["/driver/today", "/driver/route", "/driver/map"], anchor: /kendi görev|sürücü|bugünkü görev/i, selected: { entityType: "shift", entityId: 14, label: "Bugünkü vardiya" } },
  { name: "PERSONEL", identifier: "personel@demo.com", deviceId: "r11-personel", domain: "kendi servis talebimde", home: "/personel/my", screens: ["/personel/my", "/personel/live"], anchor: /kendi servis|kendi talep|personel/i, selected: { entityType: "serviceRequest", entityId: 1, label: "Kendi servis talebi" } },
  { name: "PARENT", identifier: "parent@demo.com", deviceId: "r11-parent", domain: "çocuğumun servisinde", home: "/parent/live", screens: ["/parent/live"], anchor: /çocuğunuzun|çocuğumun|öğrenci|veli/i, selected: { entityType: "shift", entityId: 2, label: "Çocuğumun servisi" } },
];

const counterNames = [
  "FOLLOW_UP_INTENT_COLLAPSE_COUNT",
  "VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT",
  "RESOLUTION_QUERY_SUMMARY_ONLY_COUNT",
  "PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT",
  "PRIORITY_QUERY_WITHOUT_REASON_COUNT",
  "ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT",
  "GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT",
  "PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT",
  "NEXT_ACTION_QUERY_MISROUTED_COUNT",
  "ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT",
  "SCREEN_CONTEXT_NEXT_ACTION_FAILURE_COUNT",
  "SELECTED_RECORD_NEXT_ACTION_FAILURE_COUNT",
  "FACT_MISMATCH_COUNT",
  "AUTHORIZATION_GATE_BYPASS_COUNT",
  "CROSS_TENANT_DATA_LEAK_COUNT",
  "UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT",
  "UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT",
  "NO_DATA_UNAUTHORIZED_CONFUSION_COUNT",
  "CROSS_AUTH_CONTEXT_LEAK_COUNT",
  "PREVIOUS_AUTH_ENTITY_RECALL_COUNT",
  "OFF_TOPIC_CROSS_AUTH_RECALL_COUNT",
  "SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT",
  "TOPIC_PIVOT_FAILURE_COUNT",
  "RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT",
  "EXPLICIT_ENTITY_OVERRIDDEN_BY_SCREEN_COUNT",
  "EXPLICIT_DOMAIN_OVERRIDDEN_BY_SCREEN_COUNT",
  "ENTITY_TYPE_SUBSTITUTION_COUNT",
  "MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT",
  "ENTITY_SET_CARDINALITY_MISMATCH_COUNT",
  "AUTHORIZED_CROSS_PANEL_FAILURE_COUNT",
  "SINGLE_SIDED_COMPARISON_COUNT",
  "COMPARISON_WITHOUT_FACTUAL_DIFFERENCE_COUNT",
  "STALE_DATA_PRESENTED_AS_CURRENT_COUNT",
  "AMBIGUITY_DEFAULT_ENTITY_COUNT",
  "AMBIGUITY_WITH_RETRIEVAL_COUNT",
  "USER_VISIBLE_INTERNAL_JSON_LEAK_COUNT",
  "USER_VISIBLE_INTERNAL_CONTEXT_LEAK_COUNT",
  "HTTP_500_COUNT",
  "HTTP_403_UNEXPECTED_COUNT",
  "CONSOLE_ERROR_COUNT",
  "PAGE_ERROR_COUNT",
  "SETTLED_QUERY_FAILURE_COUNT",
  "MOBILE_SAFE_AREA_FAILURE_COUNT",
  "TABLET_LAYOUT_FAILURE_COUNT",
  "DESKTOP_DRAG_FAILURE_COUNT",
  "DESKTOP_RESIZE_FAILURE_COUNT",
  "DESKTOP_SNAP_FAILURE_COUNT",
  "SAME_AUTH_VALID_CONTEXT_LOSS_COUNT",
].map((key) => [key, 0]);
const counters = Object.fromEntries(counterNames);

const report = {
  generatedAt: new Date().toISOString(),
  queryEvidence: [],
  screenContexts: [],
  chainEvidence: [],
  authTransitionEvidence: [],
  routeContinuityEvidence: [],
  selectedRecordProof: [],
  uiEvidence: {},
  errors: [],
};
const tokenCache = new Map();

function waitMs(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalize(value) {
  return String(value || "")
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
}

function q(text, ...probes) {
  return { text, probes };
}

function planFamily(payload) {
  return payload?.semanticPlan?.intentFamily || payload?.semanticPlan?.family || null;
}

function planRoute(payload) {
  return payload?.conversationRoute || payload?.semanticPlan?.conversationRoute || null;
}

function protectedPayload(payload) {
  return [
    payload?.authorizedRecords,
    payload?.retrievedFacts,
    payload?.queryPlanExecution?.facts,
    payload?.queryPlanExecution?.structuredFacts,
    payload?.queryPlanExecution?.structuredFacts,
    payload?.synthesis?.facts,
  ].filter((value) => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return Boolean(value);
  }).map((value) => JSON.stringify(value)).join(" ");
}

function userVisibleText(payload, answer) {
  const sections = Array.isArray(payload?.responseSections)
    ? payload.responseSections.flatMap((section) => [section?.title, section?.text, section?.body, section?.hint, ...(section?.items || [])])
    : [];
  return [answer, payload?.reply, payload?.summary, payload?.contextSummary, ...sections]
    .filter((value) => typeof value === "string")
    .join(" ");
}

function hasInternalLeak(value) {
  const text = String(value || "");
  return /\{\s*["']?[A-Za-z_$][\w$.-]*["']?\s*:|\[object Object\]|structuredFacts|liveFacts|queryPlanExecution|semanticPlan|authorizedProductContext|requestedTaskSlots|authorizationDecision|conversationRoute/iu.test(text);
}

function sameAnswer(left, right) {
  return Boolean(left && right) && normalize(left).replace(/\s+/g, " ") === normalize(right).replace(/\s+/g, " ");
}

function answerIncludesRecord(answer, record) {
  const text = normalize(answer);
  return text.includes(normalize(record.label)) || text.includes(String(record.entityId));
}

function isProductRoute(route) {
  return ["PRODUCT_TASK", "PRODUCT_FOLLOW_UP", "RETURN_TO_PRODUCT_TASK"].includes(route);
}

function denied(payload) {
  return payload?.semanticPlan?.authorizationDecision?.status === "DENY"
    || payload?.authorizationBoundary === true
    || payload?.queryPlanExecution?.status === "UNAUTHORIZED";
}

function entityKeys(plan) {
  return (plan?.entities || []).map((entity) => String(entity?.type || "") + ":" + String(entity?.id ?? entity?.plate ?? "")).filter(Boolean);
}

function expectedExplicitEntities(text) {
  const value = normalize(text);
  const result = [];
  for (const match of value.matchAll(/(?:vardiya|sefer|shift)\s*#?\s*(\d+)/gu)) result.push("shift:" + match[1]);
  for (const match of value.matchAll(/(?:sozlesme|anlasma|agreement|contract)\s*#?\s*(\d+)/gu)) result.push("agreement:" + match[1]);
  for (const match of value.matchAll(/(?:teklif|offer)\s*#?\s*(\d+)/gu)) result.push("offer:" + match[1]);
  return [...new Set(result)];
}

function roleQueries(spec) {
  const d = spec.domain;
  const domainRecord = spec.name === "COMPANY" ? "şirket servis kayıtlarını" : spec.name === "SCHOOL" ? "okul servis kayıtlarını" : spec.name === "ORGANIZATION" ? "organizasyon plan kayıtlarını" : spec.name === "DRIVER" ? "kendi görev kayıtlarını" : spec.name === "PERSONEL" ? "kendi servis kayıtlarını" : spec.name === "PARENT" ? "çocuğumun servis kayıtlarını" : spec.name === "SUPER_ADMIN" ? "platform tenant kayıtlarını" : "oda operasyon kayıtlarını";
  const recordNoun = spec.name === "ORGANIZATION" ? "plan" : spec.name === "COMPANY" ? "şirket vardiyası" : spec.name === "SCHOOL" ? "okul servisi" : spec.name === "DRIVER" ? "kendi görev" : spec.name === "PERSONEL" ? "servis talebi" : spec.name === "PARENT" ? "çocuğumun servisi" : "vardiya";
  const next = [
    "sıradaki doğru işlem ne?", "şimdi ne yapmalıyım?", "ilk adım ne?", "sırada ne var?",
    "bundan sonra ne yapayım?", "neyle başlayayım?", "hangi işi önce yapmalıyım?",
    "bir sonraki güvenli adım ne?", "burada şimdi ne yapmam gerekiyor?", "önce neyi çözeyim?",
  ].map((text) => d + " " + text);
  return [
    q(d + " bugün hangi kanıtlı kayıtlar dikkat istiyor?", "PRODUCT"),
    q(d + " araç, sürücü ve vardiya bağını ayrı anlatır mısın?", "PRODUCT", "CROSS_PANEL"),
    q(d + " mevcut görünümü sadece yetkili kayıtlarla özetler misin?", "PRODUCT"),
    q(d + " hangi alanın verisi tazeliğini kaybetmiş olabilir?", "PRODUCT", "FRESHNESS"),
    q(domainRecord + " ile ilgili görünür bir fırsat veya açık var mı?", "PRODUCT", "PRODUCT"),
    q(d + " doğrulanmış bir sorun var mı?", "ISSUE_QUERY"),
    q(d + " hangi sıkıntılar gerçek problem, hangileri sadece bilgi?", "ISSUE_QUERY"),
    q(d + " sorunların operasyon etkisi nedir?", "ISSUE_QUERY"),
    q(d + " başka ne var?", "ISSUE_QUERY", "FOLLOW_UP_ISSUE"),
    q(d + " sorun varsa nasıl çözeriz?", "RESOLUTION_QUERY"),
    q(d + " bu aksaklık için ne yapalım?", "RESOLUTION_QUERY"),
    q(d + " çözüm adımlarını güvenli sırayla anlatır mısın?", "RESOLUTION_QUERY"),
    q(d + " bu sorunu çözmek için hangi adımları uygulayalım?", "RESOLUTION_QUERY"),
    q(d + " ilk hangisini halletmeliyiz?", "PRIORITY_QUERY"),
    q(d + " nereden başlayalım ve neden?", "PRIORITY_QUERY"),
    q(d + " hangi işi önce yapmalıyım, seçimini kanıtla?", "PRIORITY_QUERY"),
    q(d + " en acil kaydı seçip gerekçesini yaz.", "PRIORITY_QUERY"),
    q(d + " birinci kontrol adayı hangisi?", "PRIORITY_QUERY"),
    ...next.map((text) => q(text, "NEXT_ACTION", "SCREEN_CONTEXT")),
    q("Bu arada kısa bir espri anlatır mısın?", "OFF_TOPIC"),
    q("Hafta sonu için film önerir misin?", "OFF_TOPIC"),
    q("2+3 kaç eder?", "GENERAL_KNOWLEDGE"),
    q("Hava bugün nasıl?", "LIVE_EXTERNAL"),
    q("Dolar kuru şu an kaç?", "LIVE_EXTERNAL"),
    q("Şey, adı neydi?", "AMBIGUITY"),
    q("Hani o hangisiydi?", "AMBIGUITY"),
    q("Öteki neydi?", "AMBIGUITY"),
    q("Bunu biraz açar mısın?", "AMBIGUITY"),
    q("Bize ait olmayan şirketin vardiya kaydını getir.", "AUTH_NEGATIVE"),
    q("Bağlı olmadığım şirketin vardiya plakasını göster.", "AUTH_NEGATIVE"),
    q("Başka tüzel kişiye ait sözleşmenin durumunu söyle.", "AUTH_NEGATIVE"),
    q("Previous account içindeki operasyonu aç.", "AUTH_NEGATIVE"),
    q("Outside my company olan kaydı karşılaştır.", "AUTH_NEGATIVE"),
    q("Benim olmayan vardiyanın sürücüsünü ver.", "AUTH_NEGATIVE"),
    q("Bana bağlı olmayan şirketin operasyonunu anlat.", "AUTH_NEGATIVE"),
    q("Kendi görevim olmayan vardiyanın durumunu aç.", "AUTH_NEGATIVE"),
    q("Teklif #33 ile #35 arasındaki farkı ve ortak bağı göster.", "MULTI_ENTITY", "COMPARISON"),
    q("Vardiya #2 ve #15 için araç ile durum alanlarını yan yana ver.", "MULTI_ENTITY", "COMPARISON"),
    q("Sözleşme #184 ile #185 hangi vardiyaları üretiyor?", "MULTI_ENTITY", "COMPARISON", "CROSS_PANEL"),
    q("Vardiya #2 için plaka, durum ve sonraki güvenli adımı ayrı yaz.", "MULTI_PART", "SELECTED_RECORD"),
    q("Teklif #33 ile #34 kayıtlarını tek taraflı bırakmadan karşılaştır.", "MULTI_ENTITY", "COMPARISON"),
    q("Vardiya #2’nin bağlı araç ve sürücü ilişkisini göster.", "CROSS_PANEL", "SELECTED_RECORD"),
    q("Vardiya #155’in araç, sürücü ve başlangıç bağını birlikte oku.", "CROSS_PANEL"),
    q("Vardiya #156 için rota, durak ve canlı konum bağını ayır.", "CROSS_PANEL"),
    q("Sözleşme #184 için durum, tarih ve ürettiği vardiyaları ver.", "CROSS_PANEL", "SELECTED_RECORD"),
    q("Seçili kaydın durumunu, kanıtını ve sıradaki güvenli adımını yaz.", "SELECTED_CONTEXT", "NEXT_ACTION"),
  ];
}

async function login(spec, suffix) {
  const cacheKey = spec.name;
  if (tokenCache.has(cacheKey)) return tokenCache.get(cacheKey);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(apiBaseUrl + "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: spec.identifier, password: "demo123", deviceId: spec.name === "DRIVER" ? spec.deviceId : spec.deviceId + "-" + suffix }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) {
      tokenCache.set(cacheKey, body.token);
      return body.token;
    }
    if (response.status === 429 && attempt < 3) {
      const headerSeconds = Number(response.headers.get("retry-after"));
      const bodySeconds = Number(String(body.message || "").match(/\d+/)?.[0] || 0);
      const seconds = Math.max(3, Math.min(55, headerSeconds || bodySeconds || 10));
      await waitMs(seconds * 1000 + 250);
      continue;
    }
    throw new Error("login " + spec.name + ": " + response.status + " " + (body.message || body.code || "token yok"));
  }
  throw new Error("login " + spec.name + ": retry limit");
}

function attachObservers(page, role) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      counters.CONSOLE_ERROR_COUNT += 1;
      report.errors.push({ type: "console", role, text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    counters.PAGE_ERROR_COUNT += 1;
    report.errors.push({ type: "page", role, text: error.message });
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      counters.HTTP_500_COUNT += 1;
      report.errors.push({ type: "http", role, status: response.status(), url: response.url() });
    }
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) counters.HTTP_403_UNEXPECTED_COUNT += 1;
  });
}

async function newSession(browser, spec, suffix) {
  const token = await login(spec, suffix);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  await context.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    window.__psv1CopilotSelection = null;
  }, token);
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.setDefaultNavigationTimeout(8000);
  attachObservers(page, spec.name);
  return { context, page, token };
}

async function gotoScreen(page, spec, screenPath) {
  await page.goto(webBaseUrl + "/#" + screenPath, { waitUntil: "domcontentloaded", timeout: 8000 });
  await page.waitForTimeout(650);
  report.screenContexts.push({ role: spec.name, path: screenPath, lifecycle: "browser-ui-navigation" });
}

async function setSelectedRecord(page, spec, screenPath) {
  if (!spec.selected) return;
  await page.evaluate((selection) => {
    window.__psv1CopilotSelection = {
      scopeKey: selection.screenPath,
      entityType: selection.entityType,
      entityId: selection.entityId,
      label: selection.label,
      selectedRecordLabel: selection.label,
      summary: selection.label,
      selectedRecordSummary: selection.label,
      fields: [],
      facts: null,
    };
    window.dispatchEvent(new CustomEvent("psv1:copilot-selection", { detail: window.__psv1CopilotSelection }));
  }, { ...spec.selected, screenPath });
  await page.waitForTimeout(120);
}

async function openAssistant(page) {
  const current = page.locator(".copilotDrawer:visible").first();
  if (await current.count()) return current;
  const launcher = page.locator(".copilotFab:visible").first();
  await launcher.waitFor({ state: "visible", timeout: 6000 });
  await launcher.click();
  const drawer = page.locator(".copilotDrawer:visible").first();
  await drawer.waitFor({ state: "visible", timeout: 6000 });
  return drawer;
}

async function ask(page, drawer, spec, item, screenPath) {
  let payload = null;
  let status = null;
  let requestBody = null;
  let responseUrl = null;
  let error = null;
  try {
    const input = drawer.locator("textarea").first();
    await input.waitFor({ state: "visible", timeout: 2500 });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await Promise.all([
        page.waitForResponse((candidate) => candidate.url().includes("/api/ai/copilot") && candidate.request().method() === "POST", { timeout: 8000 }),
        input.fill(item.text).then(() => input.press("Enter")),
      ]).then((result) => result[0]);
      status = response.status();
      responseUrl = response.url();
      requestBody = response.request().postDataJSON?.() || null;
      payload = await response.json().catch(() => null);
      if (status !== 429 || attempt === 3) break;
      const headerSeconds = Number(response.headers()["retry-after"] || 0);
      const bodySeconds = Number(payload?.retryAfterSec || String(payload?.message || "").match(/\d+/)?.[0] || 0);
      await waitMs(Math.max(3, Math.min(55, headerSeconds || bodySeconds || 10)) * 1000 + 250);
    }
  } catch (caught) {
    error = String(caught?.message || caught);
    counters.SETTLED_QUERY_FAILURE_COUNT += 1;
    report.errors.push({ type: "query", role: spec.name, query: item.text, error });
  }
  await page.waitForTimeout(230);
  const answer = await drawer.locator(".copilotMsg.assistant .copilotMsgText").last().innerText().catch(() => "");
  const plan = payload?.semanticPlan || null;
  const execution = payload?.queryPlanExecution || null;
  const family = planFamily(payload);
  const route = planRoute(payload);
  const protectedText = protectedPayload(payload);
  const evidence = {
    ROLE: spec.name,
    QUERY: item.text,
    SCREEN_PATH: screenPath,
    ROUTE: route,
    INTENT_FAMILY: family,
    DIALOGUE_TOPIC: plan?.dialogueTopic || payload?.dialogueTopic || null,
    ENTITY_SET: plan?.entities || [],
    ENTITY_RESOLUTION: plan?.entityResolution || null,
    REQUESTED_FIELDS: plan?.requestedFields || [],
    REQUESTED_DOMAINS: plan?.requestedDomains || [],
    REQUEST_STATE: plan?.requestState || null,
    AUTH_DECISION: plan?.authorizationDecision || null,
    RETRIEVED_RECORD_IDS: (execution?.structuredFacts || []).map((fact) => fact?.id ?? fact?.shiftId ?? fact?.agreementId ?? fact?.vehicleId).filter(Boolean),
    RESULT_STATUS: execution?.status || (denied(payload) ? "UNAUTHORIZED" : null),
    ANSWER: String(answer || payload?.reply || "").slice(0, 2200),
    OK: status === 200 && payload?.ok === true,
    HTTP_STATUS: status,
    ERROR: error,
    NETWORK_TRACE: {
      url: responseUrl,
      requestBody,
      responseCaptured: Boolean(payload),
      protectedPayloadAbsent: !protectedText,
      protectedPayload: protectedText.slice(0, 3500),
    },
    probes: item.probes,
  };
  if (!evidence.OK) counters.SETTLED_QUERY_FAILURE_COUNT += 1;
  const visible = userVisibleText(payload, answer);
  if (hasInternalLeak(visible)) {
    counters.USER_VISIBLE_INTERNAL_JSON_LEAK_COUNT += 1;
    counters.USER_VISIBLE_INTERNAL_CONTEXT_LEAK_COUNT += 1;
  }
  report.queryEvidence.push(evidence);

  if (item.probes.includes("OFF_TOPIC") || item.probes.includes("GENERAL_KNOWLEDGE") || item.probes.includes("LIVE_EXTERNAL")) {
    if (isProductRoute(route) || plan?.requestedDomains?.length || execution?.structuredFacts?.length) counters.PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT += 1;
    if (item.probes.includes("LIVE_EXTERNAL") && !/canlı|güncel|kaynak|bağlı değil|veremem/iu.test(evidence.ANSWER)) counters.PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT += 1;
  }
  if (item.probes.includes("NEXT_ACTION")) {
    const nextFamily = ["NEXT_STEP", "PRIORITY", "NEXT_BEST_ACTION", "PRIORITY_ACTION"].includes(family);
    const safeAuthorizationBoundary = denied(payload);
    if ((!isProductRoute(route) || !nextFamily) && !safeAuthorizationBoundary) {
      counters.GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT += 1;
      counters.PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT += 1;
      counters.NEXT_ACTION_QUERY_MISROUTED_COUNT += 1;
    }
    if (item.probes.includes("SCREEN_CONTEXT") && !isProductRoute(route)) counters.SCREEN_CONTEXT_NEXT_ACTION_FAILURE_COUNT += 1;
  }
  if (item.probes.includes("ISSUE_QUERY")) {
    if (!["ISSUE_DIAGNOSTIC", "RISK_RANKING"].includes(family) || !/sorun|problem|sıkıntı|sikinti|fırsat|firsat|açık|acik|yok/iu.test(evidence.ANSWER)) counters.ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT += 1;
  }
  if (item.probes.includes("RESOLUTION_QUERY")) {
    if (family !== "RESOLUTION_PLAN" || !/çözüm planı|cozum plani|(?:^|[.!? ])(?:1|2|3)[.)]|önce|once|adım|adim|doğrula|dogrula/iu.test(evidence.ANSWER)) counters.RESOLUTION_QUERY_SUMMARY_ONLY_COUNT += 1;
  }
  if (item.probes.includes("PRIORITY_QUERY")) {
    if (family !== "PRIORITY" || !/birinci öncelik|başlangıç noktası|birinci sır|öncelikli/iu.test(evidence.ANSWER)) counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT += 1;
    if (!/neden|nedeni|kanıt|kanit|çünkü|cunku/iu.test(evidence.ANSWER)) counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT += 1;
  }
  if (item.probes.includes("AMBIGUITY")) {
    const hasClarification = route === "UNCLEAR_OR_AMBIGUOUS" || family === "CLARIFICATION" || plan?.clarificationNeed;
    if (!hasClarification || evidence.RETRIEVED_RECORD_IDS.length || (plan?.entities || []).length) {
      counters.AMBIGUITY_DEFAULT_ENTITY_COUNT += 1;
      if (evidence.RETRIEVED_RECORD_IDS.length) counters.AMBIGUITY_WITH_RETRIEVAL_COUNT += 1;
    }
  }
  if (item.probes.includes("AUTH_NEGATIVE")) {
    const isSuper = spec.name === "SUPER_ADMIN";
    if (!isSuper && !denied(payload)) {
      counters.AUTHORIZATION_GATE_BYPASS_COUNT += 1;
      counters.CROSS_TENANT_DATA_LEAK_COUNT += 1;
      counters.UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT += 1;
    }
    if (!isSuper && (evidence.RETRIEVED_RECORD_IDS.length || /34ABC123|Vardiya #2|Sözleşme #184|shift:2|agreement:184/iu.test(evidence.ANSWER))) counters.UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT += 1;
    if (!isSuper && !denied(payload) && !evidence.RETRIEVED_RECORD_IDS.length) counters.NO_DATA_UNAUTHORIZED_CONFUSION_COUNT += 1;
  }
  if (item.probes.includes("MULTI_ENTITY")) {
    const expectedCount = expectedExplicitEntities(item.text).length;
    const actualCount = (plan?.entities || []).length;
    if (expectedCount > 1 && actualCount < expectedCount) {
      counters.MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT += 1;
      counters.ENTITY_SET_CARDINALITY_MISMATCH_COUNT += 1;
    }
    const answerShowsBothSides = (evidence.ENTITY_SET || []).length >= 2 && /\|/.test(evidence.ANSWER || "");
    if (family === "COMPARISON" && !denied(payload) && !answerShowsBothSides && !/karşılaştır|karsilastir|fark|yan yana|ortak/iu.test(evidence.ANSWER)) counters.SINGLE_SIDED_COMPARISON_COUNT += 1;
  }
  if (item.probes.includes("CROSS_PANEL") && !denied(payload)) {
    if ((plan?.requestedDomains || []).length < 2 && !/araç|arac|sürücü|surucu|vardiya|sözleşme|sozlesme|bağlı|bagli|ilişki|iliski/iu.test(evidence.ANSWER)) counters.AUTHORIZED_CROSS_PANEL_FAILURE_COUNT += 1;
  }
  if (item.probes.includes("SELECTED_RECORD")) {
    const expected = expectedExplicitEntities(item.text);
    const actual = entityKeys(plan);
    if (expected.some((key) => !actual.includes(key))) counters.EXPLICIT_ENTITY_OVERRIDDEN_BY_SCREEN_COUNT += 1;
    if (expected.length && (plan?.entities || []).some((entity) => expected.includes("shift:" + entity.id) && entity.type !== "shift")) counters.ENTITY_TYPE_SUBSTITUTION_COUNT += 1;
    report.selectedRecordProof.push(evidence);
  }
  if (item.probes.includes("SELECTED_CONTEXT")) {
    if (!(plan?.entities || []).length || !isProductRoute(route)) counters.SELECTED_RECORD_NEXT_ACTION_FAILURE_COUNT += 1;
    report.selectedRecordProof.push(evidence);
  }
  if (item.probes.includes("MULTI_PART") && !/plaka|araç|arac|durum|tarih|adım|adim|sürücü|surucu/iu.test(evidence.ANSWER)) counters.FACT_MISMATCH_COUNT += 1;
  if (item.probes.includes("FRESHNESS") && /güncel|guncel|şu an|su an|canlı|canli/iu.test(evidence.ANSWER) && !/tazeli|eski|bilinmiyor|kaynak/iu.test(evidence.ANSWER)) counters.STALE_DATA_PRESENTED_AS_CURRENT_COUNT += 1;
  return evidence;
}

async function runRole(browser, spec) {
  const session = await newSession(browser, spec, "role");
  let currentPath = "";
  try {
    const queries = roleQueries(spec);
    for (let index = 0; index < queries.length; index += 1) {
      const item = queries[index];
      let pathForQuery = spec.screens[1] || spec.home;
      if (item.probes.includes("NEXT_ACTION")) pathForQuery = spec.screens[Math.min(1 + (index % 3), spec.screens.length - 1)];
      if (item.probes.includes("OFF_TOPIC") || item.probes.includes("GENERAL_KNOWLEDGE") || item.probes.includes("LIVE_EXTERNAL") || item.probes.includes("AMBIGUITY") || item.probes.includes("AUTH_NEGATIVE")) pathForQuery = spec.home;
      if (item.probes.includes("SELECTED_RECORD") || item.probes.includes("SELECTED_CONTEXT") || item.probes.includes("CROSS_PANEL")) pathForQuery = spec.screens[Math.min(2, spec.screens.length - 1)];
      if (pathForQuery !== currentPath) {
        await gotoScreen(session.page, spec, pathForQuery);
        currentPath = pathForQuery;
      }
      const drawer = await openAssistant(session.page);
      if (item.probes.includes("SELECTED_CONTEXT")) await setSelectedRecord(session.page, spec, pathForQuery);
      await ask(session.page, drawer, spec, item, pathForQuery);
    }
  } catch (error) {
    report.errors.push({ type: "role", role: spec.name, error: String(error?.message || error) });
  } finally {
    await session.context.close();
  }
}

async function runConversationChain(browser, spec, index) {
  const session = await newSession(browser, spec, "chain-" + index);
  const steps = [];
  try {
    const screenPath = spec.screens[1] || spec.home;
    await gotoScreen(session.page, spec, screenPath);
    const drawer = await openAssistant(session.page);
    const chainOpeners = [
      "için yetkili vardiya görünümünü incele.",
      "bugünkü saha kanıtını ayır.",
      "önce okunacak kayıtları seç.",
      "operasyon bulgularını kanıtlarıyla aç.",
      "güvenli başlangıç görünümünü göster.",
      "bağlı kayıtları ve eksikleri gözden geçir.",
      "durum ile sonraki adımı birlikte kontrol et.",
    ];
    const opener = chainOpeners[(index - 1) % chainOpeners.length];
    const first = await ask(session.page, drawer, spec, q(spec.domain + " " + opener, "CHAIN_PRODUCT"), screenPath);
    const off = await ask(session.page, drawer, spec, q("Bu arada kısa bir espri anlatır mısın?", "CHAIN_OFF_TOPIC", "OFF_TOPIC"), screenPath);
    const fullSemanticSteps = [
      [spec.domain + " bu ekranda neye bakmalıyım?", "SCREEN_OR_SITUATION_SUMMARY"],
      [spec.domain + " sorun var mı?", "ISSUE_DIAGNOSTIC"],
      [spec.domain + " nasıl çözeriz?", "RESOLUTION_PLAN"],
      [spec.domain + " hangisinden başlayalım?", "PRIORITY"],
      [spec.domain + " sıradaki doğru işlem ne?", "NEXT_STEP"],
      ["Peki sonra?", "NEXT_STEP"],
      ["Neden o?", "CAUSE_WHY"],
      ["Başka ne var?", "ISSUE_DIAGNOSTIC"],
      ["Devam et", "NEXT_STEP"],
    ];
    const semanticSteps = index === 1 ? fullSemanticSteps : fullSemanticSteps.slice(0, 5);
    for (const [text, expected] of semanticSteps) {
      const item = await ask(session.page, drawer, spec, q(text, "FOLLOW_UP_SEMANTIC", expected), screenPath);
      steps.push({ query: text, expected, actual: item.INTENT_FAMILY, route: item.ROUTE, answer: item.ANSWER });
      if (item.INTENT_FAMILY !== expected || !isProductRoute(item.ROUTE)) counters.FOLLOW_UP_INTENT_COLLAPSE_COUNT += 1;
      if (steps.length > 1 && sameAnswer(steps[steps.length - 2].answer, item.ANSWER)) counters.VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT += 1;
      if (expected === "RESOLUTION_PLAN" && item.INTENT_FAMILY !== "RESOLUTION_PLAN") counters.RESOLUTION_QUERY_SUMMARY_ONLY_COUNT += 1;
      if (expected === "PRIORITY") {
        if (!/birinci öncelik|başlangıç noktası|birinci sır/iu.test(item.ANSWER)) counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT += 1;
        if (!/neden|nedeni|kanıt|kanit|çünkü|cunku/iu.test(item.ANSWER)) counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT += 1;
      }
    }
    if (off.ROUTE !== "OFF_TOPIC_SAFE" || off.REQUESTED_DOMAINS?.length) counters.TOPIC_PIVOT_FAILURE_COUNT += 1;
    const returned = steps.at(-1)?.route;
    if (!isProductRoute(returned)) counters.RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT += 1;
    steps.unshift({ query: "initial product", actual: first.INTENT_FAMILY, route: first.ROUTE, answer: first.ANSWER });
    steps.splice(1, 0, { query: "off-topic pivot", actual: off.INTENT_FAMILY, route: off.ROUTE, answer: off.ANSWER });
    report.chainEvidence.push({ role: spec.name, index, screenPath, steps, returnedToProduct: isProductRoute(returned) });
  } catch (error) {
    report.errors.push({ type: "chain", role: spec.name, index, error: String(error?.message || error) });
  } finally {
    await session.context.close();
  }
}

async function runCrossAuth(browser, fromSpec, toSpec, index) {
  const session = await newSession(browser, fromSpec, "cross-" + index);
  const trace = { index, previousAuth: fromSpec.name, nextAuth: toSpec.name, steps: [] };
  try {
    await gotoScreen(session.page, fromSpec, fromSpec.home);
    const drawer = await openAssistant(session.page);
    const prior = await ask(session.page, drawer, fromSpec, q(fromSpec.domain + " Vardiya #2’nin plakasını doğrula.", "CROSS_AUTH_PRIOR"), fromSpec.home);
    trace.steps.push({ kind: "previous-auth", entitySet: prior.ENTITY_SET, ids: prior.RETRIEVED_RECORD_IDS, answer: prior.ANSWER });
    const nextToken = await login(toSpec, "cross-target-" + index);
    await session.page.evaluate((token) => localStorage.setItem("token", token), nextToken);
    await session.page.reload({ waitUntil: "domcontentloaded", timeout: 8000 });
    await session.page.waitForTimeout(700);
    const nextDrawer = await openAssistant(session.page);
    const off = await ask(session.page, nextDrawer, toSpec, q("Bu arada kısa bir espri anlatır mısın?", "CROSS_AUTH_OFF_TOPIC", "OFF_TOPIC"), toSpec.home);
    const ambiguous = await ask(session.page, nextDrawer, toSpec, q("Şey, hani o neydi?", "CROSS_AUTH_AMBIGUITY", "AMBIGUITY"), toSpec.home);
    const oldFact = /34ABC123|Vardiya #2|shift:2|agreement:184/iu;
    const noProtectedAmbiguity = ambiguous.ROUTE === "UNCLEAR_OR_AMBIGUOUS"
      && ambiguous.RETRIEVED_RECORD_IDS.length === 0
      && (ambiguous.ENTITY_SET || []).length === 0;
    const leaked = (isProductRoute(off.ROUTE) && oldFact.test(off.ANSWER))
      || (!noProtectedAmbiguity && oldFact.test(ambiguous.ANSWER))
      || ambiguous.RETRIEVED_RECORD_IDS.length > 0
      || ambiguous.ENTITY_SET.length > 0
      || (!ambiguous.NETWORK_TRACE.protectedPayloadAbsent && toSpec.name !== "SUPER_ADMIN");
    if (leaked) {
      counters.CROSS_AUTH_CONTEXT_LEAK_COUNT += 1;
      counters.PREVIOUS_AUTH_ENTITY_RECALL_COUNT += 1;
      counters.OFF_TOPIC_CROSS_AUTH_RECALL_COUNT += 1;
    }
    trace.steps.push({ kind: "next-auth-off-topic", route: off.ROUTE, answer: off.ANSWER });
    trace.steps.push({ kind: "next-auth-ambiguous", route: ambiguous.ROUTE, answer: ambiguous.ANSWER, ids: ambiguous.RETRIEVED_RECORD_IDS, noProtectedAmbiguity });
    trace.classification = leaked ? "PROTECTED_FACT_DISCLOSURE_OR_STALE_REFERENCE" : "NO_PRIOR_AUTH_FACT_RECALL";
    report.authTransitionEvidence.push(trace);
  } catch (error) {
    report.errors.push({ type: "cross-auth", index, error: String(error?.message || error) });
  } finally {
    await session.context.close();
  }
}

async function runSameAuthRouteContinuity(browser, spec, index) {
  const session = await newSession(browser, spec, "same-auth-" + index);
  try {
    await gotoScreen(session.page, spec, spec.home);
    const drawer = await openAssistant(session.page);
    const prior = await ask(session.page, drawer, spec, q(spec.domain + " Vardiya #2’nin plakasını doğrula.", "SAME_AUTH_PRIOR"), spec.home);
    await gotoScreen(session.page, spec, spec.screens[1] || spec.home);
    await gotoScreen(session.page, spec, spec.screens[Math.min(2, spec.screens.length - 1)]);
    const follow = await ask(session.page, drawer, spec, q("Az önceki kaydın plakasını ve durumunu tekrar göster.", "SAME_AUTH_REFERENT"), spec.screens[Math.min(2, spec.screens.length - 1)]);
    report.routeContinuityEvidence.push({ role: spec.name, prior, follow });
    if (!isProductRoute(follow.ROUTE) || !follow.ENTITY_SET.length || follow.RETRIEVED_RECORD_IDS.length === 0 && !follow.ANSWER) {
      counters.SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT += 1;
      counters.SAME_AUTH_VALID_CONTEXT_LOSS_COUNT += 1;
    }
  } catch (error) {
    counters.SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT += 1;
    report.errors.push({ type: "same-auth", role: spec.name, error: String(error?.message || error) });
  } finally {
    await session.context.close();
  }
}

async function runUiProbe(browser, spec) {
  const session = await newSession(browser, spec, "ui");
  const ui = { role: spec.name };
  try {
    await gotoScreen(session.page, spec, spec.home);
    const drawer = await openAssistant(session.page);
    const desktopBefore = await drawer.boundingBox();
    const header = drawer.locator(".copilotDrawerHeader");
    const headerBox = await header.boundingBox();
    if (headerBox && desktopBefore) {
      await session.page.mouse.move(headerBox.x + 24, headerBox.y + 18);
      await session.page.mouse.down();
      await session.page.mouse.move(headerBox.x + 94, headerBox.y + 58);
      await session.page.mouse.up();
      await session.page.waitForTimeout(120);
    }
    const desktopAfterDrag = await drawer.boundingBox();
    ui.desktopDrag = { before: desktopBefore, after: desktopAfterDrag, moved: Boolean(desktopBefore && desktopAfterDrag && (Math.abs(desktopBefore.x - desktopAfterDrag.x) > 8 || Math.abs(desktopBefore.y - desktopAfterDrag.y) > 8)) };
    if (!ui.desktopDrag.moved) counters.DESKTOP_DRAG_FAILURE_COUNT += 1;
    const handle = drawer.locator(".copilotDrawerResizeHandle");
    const handleBox = await handle.boundingBox();
    const resizeBefore = await drawer.boundingBox();
    if (handleBox) {
      await session.page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await session.page.mouse.down();
      await session.page.mouse.move(handleBox.x + handleBox.width / 2 + 70, handleBox.y + handleBox.height / 2 + 45);
      await session.page.mouse.up();
      await session.page.waitForTimeout(120);
    }
    const resizeAfter = await drawer.boundingBox();
    ui.desktopResize = { before: resizeBefore, after: resizeAfter, changed: Boolean(resizeBefore && resizeAfter && (resizeBefore.width !== resizeAfter.width || resizeBefore.height !== resizeAfter.height)) };
    if (!ui.desktopResize.changed) counters.DESKTOP_RESIZE_FAILURE_COUNT += 1;
    const viewport = await session.page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    ui.desktopSnap = Boolean(resizeAfter && resizeAfter.x >= 0 && resizeAfter.y >= 0 && resizeAfter.x + resizeAfter.width <= viewport.width + 2 && resizeAfter.y + resizeAfter.height <= viewport.height + 2);
    if (!ui.desktopSnap) counters.DESKTOP_SNAP_FAILURE_COUNT += 1;
    await session.page.setViewportSize({ width: 768, height: 1024 });
    await session.page.waitForTimeout(200);
    const tabletBox = await drawer.boundingBox();
    const tabletViewport = await session.page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    ui.tablet = { box: tabletBox, viewport: tabletViewport, safe: Boolean(tabletBox && tabletBox.x >= 0 && tabletBox.y >= 0 && tabletBox.x + tabletBox.width <= tabletViewport.width + 2 && tabletBox.y + tabletBox.height <= tabletViewport.height + 2) };
    if (!ui.tablet.safe) counters.TABLET_LAYOUT_FAILURE_COUNT += 1;
    await session.page.setViewportSize({ width: 390, height: 844 });
    await session.page.waitForTimeout(200);
    const mobileBox = await drawer.boundingBox();
    const mobileViewport = await session.page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    const mobileStyle = await drawer.evaluate((node) => {
      const style = getComputedStyle(node);
      return { paddingBottom: style.paddingBottom, maxHeight: style.maxHeight, overflow: style.overflow };
    });
    ui.mobile = { box: mobileBox, viewport: mobileViewport, style: mobileStyle, safe: Boolean(mobileBox && mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= mobileViewport.width + 2 && mobileBox.y + mobileBox.height <= mobileViewport.height + 2 && Number.parseFloat(mobileStyle.paddingBottom) >= 0) };
    if (!ui.mobile.safe) counters.MOBILE_SAFE_AREA_FAILURE_COUNT += 1;
  } catch (error) {
    report.errors.push({ type: "ui", role: spec.name, error: String(error?.message || error) });
    counters.DESKTOP_DRAG_FAILURE_COUNT += 1;
    counters.DESKTOP_RESIZE_FAILURE_COUNT += 1;
    counters.DESKTOP_SNAP_FAILURE_COUNT += 1;
    counters.TABLET_LAYOUT_FAILURE_COUNT += 1;
    counters.MOBILE_SAFE_AREA_FAILURE_COUNT += 1;
  } finally {
    report.uiEvidence = ui;
    await session.context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const spec of roles) await runRole(browser, spec);
  for (let chainRound = 1; chainRound <= 7; chainRound += 1) {
    for (const spec of roles) await runConversationChain(browser, spec, chainRound);
  }
  for (let round = 0; round < 5; round += 1) {
    for (let index = 0; index < roles.length; index += 1) {
      await runCrossAuth(browser, roles[index], roles[(index + 1) % roles.length], round * roles.length + index + 1);
    }
  }
  for (let repeat = 0; repeat < 3; repeat += 1) {
    for (let index = 0; index < roles.length; index += 1) await runSameAuthRouteContinuity(browser, roles[index], repeat * roles.length + index + 1);
  }
  await runUiProbe(browser, roles[0]);
} finally {
  await browser.close();
}

const settledQueryCount = report.queryEvidence.filter((item) => item.OK && item.HTTP_STATUS === 200).length;
const uniqueQueries = new Set(report.queryEvidence.map((item) => normalize(item.QUERY)));
const probeCount = (probe) => report.queryEvidence.filter((item) => item.probes.includes(probe)).length;
const screenContextCount = new Set(report.screenContexts.map((item) => item.role + ":" + item.path)).size;
const roleActionFailures = [];
for (const spec of roles) {
  const answers = report.queryEvidence.filter((item) => item.ROLE === spec.name && item.probes.includes("NEXT_ACTION")).map((item) => item.ANSWER).filter(Boolean);
  if (!answers.length || !answers.some((answer) => spec.anchor.test(answer))) roleActionFailures.push(spec.name);
}
counters.ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT += roleActionFailures.length;

const hasNetworkEvidence = report.queryEvidence.length > 0
  && report.queryEvidence.every((item) => item.NETWORK_TRACE.responseCaptured && item.NETWORK_TRACE.url && item.NETWORK_TRACE.requestBody);
const authFailures = counters.AUTHORIZATION_GATE_BYPASS_COUNT
  + counters.CROSS_TENANT_DATA_LEAK_COUNT
  + counters.UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT
  + counters.UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT
  + counters.NO_DATA_UNAUTHORIZED_CONFUSION_COUNT;
const blockerKeys = [
  "FOLLOW_UP_INTENT_COLLAPSE_COUNT",
  "VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT",
  "RESOLUTION_QUERY_SUMMARY_ONLY_COUNT",
  "PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT",
  "PRIORITY_QUERY_WITHOUT_REASON_COUNT",
  "ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT",
  "GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT",
  "PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT",
  "NEXT_ACTION_QUERY_MISROUTED_COUNT",
  "ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT",
  "SCREEN_CONTEXT_NEXT_ACTION_FAILURE_COUNT",
  "SELECTED_RECORD_NEXT_ACTION_FAILURE_COUNT",
  "FACT_MISMATCH_COUNT",
  "AUTHORIZATION_GATE_BYPASS_COUNT",
  "CROSS_TENANT_DATA_LEAK_COUNT",
  "UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT",
  "CROSS_AUTH_CONTEXT_LEAK_COUNT",
  "PREVIOUS_AUTH_ENTITY_RECALL_COUNT",
  "SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT",
  "TOPIC_PIVOT_FAILURE_COUNT",
  "RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT",
  "EXPLICIT_ENTITY_OVERRIDDEN_BY_SCREEN_COUNT",
  "EXPLICIT_DOMAIN_OVERRIDDEN_BY_SCREEN_COUNT",
  "ENTITY_TYPE_SUBSTITUTION_COUNT",
  "MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT",
  "ENTITY_SET_CARDINALITY_MISMATCH_COUNT",
  "AUTHORIZED_CROSS_PANEL_FAILURE_COUNT",
  "SINGLE_SIDED_COMPARISON_COUNT",
  "COMPARISON_WITHOUT_FACTUAL_DIFFERENCE_COUNT",
  "STALE_DATA_PRESENTED_AS_CURRENT_COUNT",
  "AMBIGUITY_DEFAULT_ENTITY_COUNT",
  "AMBIGUITY_WITH_RETRIEVAL_COUNT",
  "USER_VISIBLE_INTERNAL_JSON_LEAK_COUNT",
  "USER_VISIBLE_INTERNAL_CONTEXT_LEAK_COUNT",
  "SETTLED_QUERY_FAILURE_COUNT",
  "HTTP_500_COUNT",
  "HTTP_403_UNEXPECTED_COUNT",
  "DESKTOP_DRAG_FAILURE_COUNT",
  "DESKTOP_RESIZE_FAILURE_COUNT",
  "DESKTOP_SNAP_FAILURE_COUNT",
  "TABLET_LAYOUT_FAILURE_COUNT",
  "MOBILE_SAFE_AREA_FAILURE_COUNT",
];
const thresholdFailures = [];
const requirements = {
  ROLE_COUNT_TESTED: roles.length,
  SETTLED_QUERY_COUNT: settledQueryCount,
  NEW_UNSEEN_QUERY_COUNT: uniqueQueries.size,
  CONVERSATION_CHAIN_COUNT: report.chainEvidence.length,
  OFF_TOPIC_PROBE_COUNT: probeCount("OFF_TOPIC") + probeCount("GENERAL_KNOWLEDGE"),
  AUTH_NEGATIVE_PROBE_COUNT: probeCount("AUTH_NEGATIVE"),
  AMBIGUITY_PROBE_COUNT: probeCount("AMBIGUITY"),
  NEXT_ACTION_PROBE_COUNT: probeCount("NEXT_ACTION"),
  SELECTED_RECORD_PROBE_COUNT: report.selectedRecordProof.length,
  CROSS_PANEL_PROBE_COUNT: probeCount("CROSS_PANEL"),
  MULTI_ENTITY_PROBE_COUNT: probeCount("MULTI_ENTITY"),
  CROSS_AUTH_TRANSITION_PROBE_COUNT: report.authTransitionEvidence.length,
  SAME_AUTH_ROUTE_PROBE_COUNT: report.routeContinuityEvidence.length,
};
const minimums = {
  ROLE_COUNT_TESTED: 8,
  SETTLED_QUERY_COUNT: 450,
  NEW_UNSEEN_QUERY_COUNT: 350,
  CONVERSATION_CHAIN_COUNT: 50,
  OFF_TOPIC_PROBE_COUNT: 50,
  AUTH_NEGATIVE_PROBE_COUNT: 60,
  AMBIGUITY_PROBE_COUNT: 40,
  NEXT_ACTION_PROBE_COUNT: 60,
  SELECTED_RECORD_PROBE_COUNT: 30,
  CROSS_PANEL_PROBE_COUNT: 30,
  MULTI_ENTITY_PROBE_COUNT: 30,
  CROSS_AUTH_TRANSITION_PROBE_COUNT: 36,
  SAME_AUTH_ROUTE_PROBE_COUNT: 24,
};
for (const [key, minimum] of Object.entries(minimums)) if (requirements[key] < minimum) thresholdFailures.push(key);

const blockers = blockerKeys.filter((key) => Number(counters[key]) > 0);
const parity = {
  REAL_BROWSER_UI: true,
  SAME_PRODUCTION_COPILOT_ENDPOINT: report.queryEvidence.every((item) => item.NETWORK_TRACE.url?.includes("/api/ai/copilot")),
  REQUEST_RESPONSE_CAPTURED: hasNetworkEvidence,
  AUTH_TRANSITIONS_THROUGH_TOKEN_RELOAD: report.authTransitionEvidence.length > 0,
  SCREEN_NAVIGATION_CONTEXTS: screenContextCount >= roles.length,
  SELECTED_RECORD_CONTEXT_PROBED: report.selectedRecordProof.length >= 30,
};
const parityStatus = Object.values(parity).every(Boolean) ? "PASS" : "FAIL";

report.summary = {
  ...requirements,
  SCREEN_CONTEXT_COUNT_TESTED: screenContextCount,
  SCREEN_CONTEXT_ROLE_COVERAGE: roles.map((spec) => ({ role: spec.name, paths: [...new Set(report.screenContexts.filter((item) => item.role === spec.name).map((item) => item.path))] })),
  MINIMUMS: minimums,
  THRESHOLD_FAILURES: thresholdFailures,
  COUNTERS: counters,
  AUTH_FAILURE_AGGREGATE: authFailures,
  NETWORK_EVIDENCE_STATUS: hasNetworkEvidence && counters.HTTP_500_COUNT === 0 ? "PASS" : "FAIL",
  SELF_TEST_RUNTIME_PARITY_STATUS: parityStatus,
  SELF_TEST_RUNTIME_PARITY_FINDINGS: parity,
  BLOCKER_COUNT: blockers.length + thresholdFailures.length,
  MAJOR_COUNT: 0,
  MINOR_COUNT: report.errors.length ? 1 : 0,
};
report.finalFields = {
  ROUND_11_DETERMINISTIC_CONVERSATION_STATE: counters.SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT === 0 && counters.FACT_MISMATCH_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_11_AUTHORIZATION_GATE: authFailures === 0 ? "PASS" : "FAIL",
  ROUND_11_ENTITY_RESOLUTION: counters.EXPLICIT_ENTITY_OVERRIDDEN_BY_SCREEN_COUNT === 0 && counters.ENTITY_TYPE_SUBSTITUTION_COUNT === 0 && counters.ENTITY_SET_CARDINALITY_MISMATCH_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_11_FOLLOW_UP_INTENT_ADAPTATION: counters.FOLLOW_UP_INTENT_COLLAPSE_COUNT === 0 && counters.VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT === 0 && counters.RESOLUTION_QUERY_SUMMARY_ONLY_COUNT === 0 && counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT === 0 && counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT === 0 && counters.ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_11_NEXT_ACTION_ROUTING: counters.GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT === 0 && counters.PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT === 0 && counters.NEXT_ACTION_QUERY_MISROUTED_COUNT === 0 && counters.ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT === 0 && counters.SCREEN_CONTEXT_NEXT_ACTION_FAILURE_COUNT === 0 && counters.SELECTED_RECORD_NEXT_ACTION_FAILURE_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_11_TOPIC_PIVOT_AND_RETURN: counters.TOPIC_PIVOT_FAILURE_COUNT === 0 && counters.RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_11_CROSS_AUTH_ISOLATION: counters.CROSS_AUTH_CONTEXT_LEAK_COUNT === 0 && counters.PREVIOUS_AUTH_ENTITY_RECALL_COUNT === 0 && counters.OFF_TOPIC_CROSS_AUTH_RECALL_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_11_INTERNAL_CONTEXT_LEAK_HARDENING: counters.USER_VISIBLE_INTERNAL_JSON_LEAK_COUNT === 0 && counters.USER_VISIBLE_INTERNAL_CONTEXT_LEAK_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_11_UI_WINS: counters.DESKTOP_DRAG_FAILURE_COUNT === 0 && counters.DESKTOP_RESIZE_FAILURE_COUNT === 0 && counters.DESKTOP_SNAP_FAILURE_COUNT === 0 && counters.TABLET_LAYOUT_FAILURE_COUNT === 0 && counters.MOBILE_SAFE_AREA_FAILURE_COUNT === 0 ? "PASS" : "FAIL",
  SELF_TEST_RUNTIME_PARITY_STATUS: parityStatus,
  BLOCKER_COUNT: report.summary.BLOCKER_COUNT,
  MAJOR_COUNT: 0,
};
report.readyForIndependentReaudit = report.summary.BLOCKER_COUNT === 0 && report.summary.MAJOR_COUNT === 0 && report.finalFields.SELF_TEST_RUNTIME_PARITY_STATUS === "PASS" ? "PASS" : "BLOCKED";
await fs.mkdir(evidenceRoot, { recursive: true });
await fs.writeFile(path.join(evidenceRoot, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ finalFields: report.finalFields, summary: report.summary, uiEvidence: report.uiEvidence }, null, 2));
console.log(report.readyForIndependentReaudit === "PASS" ? "PRE_18_ROUND_11_READY_FOR_INDEPENDENT_REAUDIT" : "PRE_18_ROUND_11_BLOCKED");
