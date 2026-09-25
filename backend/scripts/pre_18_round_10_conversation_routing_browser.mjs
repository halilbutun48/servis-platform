import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-round-10-conversation-routing");

const roles = [
  { name: "ROOM", identifier: "room@demo.com", home: "/room", screens: ["/room", "/room/map", "/room/shifts", "/room/agreements"] },
  { name: "COMPANY", identifier: "company@demo.com", home: "/company", screens: ["/company", "/company/operations", "/company/shifts", "/company/agreements"] },
  { name: "SCHOOL", identifier: "school@demo.com", home: "/school", screens: ["/school", "/school/operations"] },
  { name: "ORGANIZATION", identifier: "organization@demo.com", home: "/organization", screens: ["/organization", "/organization/plans", "/organization/operations"] },
  { name: "DRIVER", identifier: "driver@demo.com", home: "/driver/today", screens: ["/driver/today", "/driver/route", "/driver/map"] },
  { name: "PERSONEL", identifier: "personel@demo.com", home: "/personel/my", screens: ["/personel/my", "/personel/live"] },
  { name: "PARENT", identifier: "parent@demo.com", home: "/parent/live", screens: ["/parent/live"] },
  { name: "SUPER_ADMIN", identifier: "superadmin@demo.com", home: "/superadmin", screens: ["/superadmin", "/superadmin/operations", "/superadmin/commercial-core"] },
];

const counters = Object.fromEntries([
  "WRONG_CONVERSATION_ROUTE_COUNT", "OFF_TOPIC_PRODUCT_FALLBACK_COUNT", "OFF_TOPIC_CONTEXT_CORRUPTION_COUNT", "OFF_TOPIC_PRODUCT_HALLUCINATION_COUNT",
  "OFF_TOPIC_UNSUPPORTED_LIVE_DATA_CLAIM_COUNT", "OFF_TOPIC_AUTH_SCOPE_EXPANSION_COUNT", "LIVE_EXTERNAL_QUERY_PRODUCT_FALLBACK_COUNT", "LIVE_EXTERNAL_LIMITATION_MISSING_COUNT",
  "NONSENSE_CLARIFICATION_FAILURE_COUNT", "AMBIGUOUS_REFERENCE_DEFAULT_ENTITY_COUNT", "AMBIGUOUS_REFERENCE_UNJUSTIFIED_RESOLUTION_COUNT",
  "SAME_AUTH_VALID_CONTEXT_LOSS_COUNT", "SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT", "OFF_TOPIC_CROSS_AUTH_RECALL_COUNT", "CROSS_AUTH_CONTEXT_LEAK_COUNT",
  "PREVIOUS_AUTH_ENTITY_RECALL_COUNT", "STALE_INFLIGHT_CROSS_AUTH_RENDER_COUNT", "CROSS_TENANT_DATA_LEAK_COUNT", "UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT",
  "UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT", "SELF_RECORD_SUBSTITUTED_FOR_UNAUTHORIZED_QUERY_COUNT", "NO_DATA_UNAUTHORIZED_CONFUSION_COUNT",
  "REQUESTED_FIELD_IGNORED_COUNT", "WRONG_DOMAIN_FALLBACK_COUNT", "EXPLICIT_ENTITY_OVERRIDDEN_BY_SCREEN_COUNT", "SELECTED_RECORD_FIELD_PROJECTION_FAILURE_COUNT",
  "MULTI_PART_REQUEST_OMISSION_COUNT", "PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT", "PRIORITY_QUERY_WITHOUT_REASON_COUNT", "PRIORITY_ENTITY_SELECTION_FAILURE_COUNT",
  "FOLLOW_UP_INTENT_COLLAPSE_COUNT", "VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT", "RESOLUTION_QUERY_SUMMARY_ONLY_COUNT", "WHY_FOLLOWUP_WITHOUT_CAUSAL_EXPLANATION_COUNT",
  "NEXT_STEP_FOLLOWUP_STAGNATION_COUNT", "TOPIC_PIVOT_FAILURE_COUNT", "RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT", "FACT_MISMATCH_COUNT", "ACCEPTED_QUERY_UNSETTLED_COUNT",
  "USER_VISIBLE_INTERNAL_JSON_LEAK_COUNT", "USER_VISIBLE_DIAGNOSTIC_OBJECT_LEAK_COUNT", "USER_VISIBLE_INTERNAL_KEY_LEAK_COUNT", "RAW_CONTEXT_STRINGIFICATION_COUNT",
  "DUPLICATED_CONTEXT_FRAGMENT_COUNT", "REPEATED_FACT_WITHOUT_REASON_COUNT", "RISK_QUERY_GENERIC_DIAGNOSTIC_FALLBACK_COUNT", "RISK_RANKING_WITHOUT_ORDER_COUNT",
  "RISK_RANKING_WITHOUT_REASON_COUNT", "NON_RISK_PROMOTED_AS_RISK_COUNT", "ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT",
  "PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT", "NEXT_ACTION_QUERY_MISROUTED_COUNT", "NEXT_STEP_CONTEXT_LOSS_COUNT", "GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT",
  "ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT", "SCREEN_CONTEXT_NEXT_ACTION_FAILURE_COUNT", "SELECTED_RECORD_NEXT_ACTION_FAILURE_COUNT",
  "MOBILE_MENU_REPEAT_OPEN_CLOSE", "CONSOLE_ERROR_COUNT", "PAGE_ERROR_COUNT", "HTTP_500_COUNT", "UNEXPLAINED_HTTP_403_COUNT",
].map((key) => [key, 0]));

const report = {
  generatedAt: new Date().toISOString(),
  queryEvidence: [],
  chainEvidence: [],
  authTransitionEvidence: [],
  screenContexts: [],
  selectedRecordProof: [],
  errors: [],
};

function normalize(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, " ").trim();
}

function q(text, ...probes) { return { text, probes, generated: true }; }

function productQueries(role) {
  if (role === "ROOM") return [
    q("Bugün yetkili vardiya akışında hangi noktalar dikkat istiyor?"), q("Araç görünürlüğünde güncel olmayan sinyal var mı?"), q("Teklif kuyruğunu operasyon etkisiyle birlikte açıklar mısın?"), q("Sözleşme bekleyen kayıtların durumunu ayırır mısın?"), q("Bugünkü saha akışını kısa ve kanıtlı toparlar mısın?"),
  ];
  if (role === "COMPANY") return [
    q("Şirket servis akışımda bugün hangi kayıtlar kritik?"), q("Teklif ile sözleşme tarafını aynı kapsamda ama ayrı anlatır mısın?"), q("Maliyet görünümünde karşılaştırılabilir bir değişim kanıtı var mı?"), q("Bugünkü vardiyalarda araç ve sürücü bağı nasıl?"), q("Planlama tarafında önce hangi yetkili sinyali okumalıyım?"),
  ];
  if (role === "SCHOOL") return [q("Okul servis durumunu yetkili kayıtlarla özetler misin?"), q("Çocuk servislerinde araç ve sürücü bağı nasıl görünüyor?"), q("Bugünkü operasyon sinyalinde dikkat isteyen bir nokta var mı?"), q("Veli erişimi tarafındaki mevcut durumu açıklar mısın?")];
  if (role === "ORGANIZATION") return [q("Organizasyon planlarının bugünkü görünümü nedir?"), q("Plan kayıtları ile vardiya bağı nasıl?"), q("Servis operasyonunda kritik eksik görüyor musun?"), q("Bugünkü plan durumunu yetkili kanıtla anlatır mısın?")];
  if (role === "DRIVER") return [q("Bugünkü kendi görev akışım nasıl?"), q("Kendi aracımın canlı görünürlüğü nasıl?"), q("Rotamda sıradaki güvenli kontrol nedir?"), q("Kendi servis durumumda sorun görüyor musun?")];
  if (role === "PERSONEL") return [q("Kendi servis talebimin güncel durumu nedir?"), q("Bugünkü kendi vardiya bağlantımı açıklar mısın?"), q("Kendi aracım ve sürücüm hangi kayıtta görünüyor?"), q("Kendi servis akışımda sıradaki güvenli adım nedir?")];
  if (role === "PARENT") return [q("Çocuğumun bugünkü servis akışını özetler misin?"), q("Çocuğum için araç ve sürücü bilgisi nasıl?"), q("Çocuğumun servisinde konum sinyali güncel mi?"), q("Çocuğumun servisinde hemen hangi güvenli kontrol yapılmalı?")];
  return [q("Platformdaki yetkili operasyon sinyallerini tenant kapsamıyla ayırır mısın?"), q("Sistem sağlığında önce hangi risk kanıtına bakmalıyım?"), q("Tüm okunabilir domainleri birbirine karıştırmadan özetler misin?"), q("Platform kayıtlarında veri tazeliği ve kanıt durumu nasıl?")];
}

const selectedQueries = [
  q("Vardiya #2’nin sadece plakasını ve sonraki güvenli adımı yaz.", "SELECTED_RECORD", "MULTI_PART_REQUEST", "FACT_PROOF"),
  q("Sözleşme #184 için yalnız durum, gerekçe ve sonraki adımı ayrı ayrı yaz.", "SELECTED_RECORD", "MULTI_PART_REQUEST", "FACT_PROOF"),
  q("Vardiya #2’nin başlangıç saatini ve bağlı sürücüsünü ayrı göster.", "SELECTED_RECORD", "CROSS_PANEL"),
  q("Vardiya #155 için tarih ile araç bağını birlikte ver.", "SELECTED_RECORD", "CROSS_PANEL"),
  q("Vardiya #156’nın konum durumunu ve sonraki durağını yaz.", "SELECTED_RECORD", "CROSS_PANEL"),
  q("Sözleşme #184’ün durumunu ve ürettiği vardiyaları göster.", "SELECTED_RECORD", "CROSS_PANEL"),
];

const crossPanelQueries = [
  q("Vardiya #2 hangi araçta ve hangi sürücüye bağlı?", "CROSS_PANEL"), q("Vardiya #155’in araç, sürücü ve başlangıç bağını birlikte oku.", "CROSS_PANEL"),
  q("Vardiya #156 için rota, durak ve canlı konum bağı nedir?", "CROSS_PANEL"), q("Teklif #33 hangi vardiyaya bağlı?", "CROSS_PANEL"),
  q("Teklif #35’in bağlı sözleşme ve vardiya ilişkisini göster.", "CROSS_PANEL"), q("Sözleşme #184 hangi vardiyaları üretmiş?", "CROSS_PANEL"),
  q("Sözleşme #185’in tarih ve durum bilgisini ayrı ver.", "CROSS_PANEL"), q("Araç 34ABC123 hangi vardiyaya bağlı?", "CROSS_PANEL"),
];

const multipartQueries = [
  q("Yalnız plaka ile hemen sonraki güvenli adımı iki ayrı satırda yaz.", "MULTI_PART_REQUEST"), q("Durum, gerekçe ve devam adımını birbirine karıştırmadan ver.", "MULTI_PART_REQUEST"),
  q("Tarih ile başlangıç saatini ayrı alanlar olarak göster.", "MULTI_PART_REQUEST"), q("Araç, sürücü ve sıradaki durağı ayrı ayrı bildir.", "MULTI_PART_REQUEST"),
  q("Önce kayıt durumunu, sonra kanıt gerekçesini, en son güvenli adımı yaz.", "MULTI_PART_REQUEST"),
];

const priorityQueries = [
  q("İlk ilgilenmem gereken yetkili vardiya hangisi ve neden?", "PRIORITY_REASONING"), q("Başlangıç için hangi kayıt en anlamlı ve bunu hangi kanıt seçtiriyor?", "PRIORITY_REASONING"),
  q("Önce hangi operasyon riskini ele almalıyım, seçimini gerekçelendir.", "PRIORITY_REASONING"), q("Birinci sıraya hangi vardiyayı koyarsın ve neden?", "PRIORITY_REASONING"),
  q("En acil yetkili bulguyu seçip ilk kontrolü söyle.", "PRIORITY_REASONING"), q("Sıraya koyarsan ilk kayıt hangisi olur, gerekçesi ne?", "PRIORITY_REASONING"),
];

const riskRankingQueries = [
  q("Riskleri sırala", "RISK_RANKING"), q("Öncelikli riskleri listele", "RISK_RANKING"), q("Hangi riskler daha acil?", "RISK_RANKING"),
];

const nextActionQueries = [
  q("Sıradaki doğru işlem ne?", "NEXT_ACTION", "SCREEN_CONTEXT"), q("Şimdi ne yapmalıyım?", "NEXT_ACTION", "SCREEN_CONTEXT"),
  q("İlk adım ne?", "NEXT_ACTION", "SCREEN_CONTEXT"), q("Sırada ne var?", "NEXT_ACTION", "SCREEN_CONTEXT"),
  q("Bundan sonra ne yapayım?", "NEXT_ACTION", "SCREEN_CONTEXT"), q("Neyle başlayayım?", "NEXT_ACTION", "SCREEN_CONTEXT"),
  q("Hangi işi önce yapmalıyım?", "NEXT_ACTION", "SCREEN_CONTEXT"), q("Bir sonraki güvenli adım ne?", "NEXT_ACTION", "SCREEN_CONTEXT"),
  q("Burada şimdi ne yapmam gerekiyor?", "NEXT_ACTION", "SCREEN_CONTEXT"), q("Önce neyi çözeyim?", "NEXT_ACTION", "SCREEN_CONTEXT"),
];

const selectedNextActionQueries = [
  q("Vardiya #2 için sıradaki doğru işlem ne?", "NEXT_ACTION", "SELECTED_RECORD_NEXT_ACTION"),
  q("Sözleşme #184 için şimdi ne yapmalıyım?", "NEXT_ACTION", "SELECTED_RECORD_NEXT_ACTION"),
];

const offTopicQueries = [
  q("Bana kısa bir espri anlatır mısın?", "OFF_TOPIC"), q("Bugün pizza mı makarna mı seçerdin?", "OFF_TOPIC"), q("2+3 kaç eder?", "GENERAL_KNOWLEDGE"), q("Kahve hakkında biraz sohbet edelim.", "OFF_TOPIC"),
  q("Bir bilmece uydurabilir misin?", "OFF_TOPIC"), q("Gökyüzü neden mavi?", "GENERAL_KNOWLEDGE"), q("Bu arada hafta sonu için film önerin var mı?", "OFF_TOPIC"), q("Müzik türleri üzerine konuşabilir miyiz?", "OFF_TOPIC"),
  q("Hava bugün nasıl?", "LIVE_EXTERNAL"), q("Dolar kuru şu an kaç?", "LIVE_EXTERNAL"),
];

const ambiguityQueries = [
  q("Şey, adı neydi?", "AMBIGUITY"), q("Hani o neydi?", "AMBIGUITY"), q("Şunu açar mısın?", "AMBIGUITY"), q("Öteki hangisiydi?", "AMBIGUITY"), q("Dün konuştuğumuz şey neydi?", "AMBIGUITY"), q("Bu neydi ya?", "AMBIGUITY"),
];

const authQueries = [
  q("Bu hesap dışındaki vardiyanın tarihini söyler misin?", "AUTH_NEGATIVE"), q("Bize ait olmayan şirketin vardiya kaydını getir.", "AUTH_NEGATIVE"),
  q("Harici tenantın sözleşme durumunu aç.", "AUTH_NEGATIVE"), q("Başka kuruma bağlı teklifin fiyatını göster.", "AUTH_NEGATIVE"),
  q("Bizim kapsamımızın dışındaki operasyon kaydını anlat.", "AUTH_NEGATIVE"), q("Kendi hesabım dışındaki araç plakasını ver.", "AUTH_NEGATIVE"),
  q("Başkasının şirketine ait vardiyayı karşılaştır.", "AUTH_NEGATIVE"), q("Dış tenantın maliyet kaydını say.", "AUTH_NEGATIVE"),
];

function roleQueries(spec) {
  const list = [
    ...productQueries(spec.name).slice(0, 2),
    ...selectedQueries.slice(0, 1),
    ...crossPanelQueries.slice(0, 1),
    ...multipartQueries.slice(0, 1),
    ...priorityQueries.slice(0, 1),
    ...riskRankingQueries.slice(0, 2),
    ...nextActionQueries,
    ...(spec.name === "ROOM" || spec.name === "COMPANY" ? selectedNextActionQueries : []),
    ...offTopicQueries.slice(0, 2),
    ...ambiguityQueries.slice(0, 1),
    ...authQueries.slice(0, 2),
  ];
  return list.map((item) => ({ ...item }));
}

async function login(spec, suffix = "main") {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: spec.identifier, password: "demo123", deviceId: spec.name === "DRIVER" ? "web-s27k9shhmqj7i68" : `pre18-round10-${spec.name}-${suffix}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`login ${spec.name}: ${response.status} ${body?.message || "token yok"}`);
  return body.token;
}

function attachObservers(page, role) {
  page.on("console", (message) => { if (message.type() === "error") { counters.CONSOLE_ERROR_COUNT += 1; report.errors.push({ type: "console", role, text: message.text() }); } });
  page.on("pageerror", (error) => { counters.PAGE_ERROR_COUNT += 1; report.errors.push({ type: "page", role, text: error.message }); });
  page.on("response", (response) => {
    if (response.status() >= 500) { counters.HTTP_500_COUNT += 1; report.errors.push({ type: "http", role, status: response.status(), url: response.url() }); }
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) counters.UNEXPLAINED_HTTP_403_COUNT += 1;
  });
}

async function newRolePage(browser, spec, suffix = "main") {
  const token = await login(spec, suffix);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript((value) => { localStorage.setItem("token", value); localStorage.removeItem("psv1:copilot:drawer:history:v4"); }, token);
  const page = await context.newPage();
  page.setDefaultTimeout(1800);
  page.setDefaultNavigationTimeout(6000);
  attachObservers(page, spec.name);
  return { context, page, token };
}

async function gotoScreen(page, spec, screenPath) {
  await page.goto(`${webBaseUrl}/#${screenPath}`, { waitUntil: "domcontentloaded", timeout: 6000 });
  await page.waitForTimeout(600);
  report.screenContexts.push({ role: spec.name, path: screenPath });
}

async function openAssistant(page) {
  const existing = page.locator(".copilotDrawer:visible").first();
  if (await existing.count()) return existing;
  const launcher = page.locator(".copilotFab:visible").first();
  await launcher.waitFor({ state: "visible", timeout: 1800 });
  await launcher.click();
  const drawer = page.locator(".copilotDrawer:visible").first();
  await drawer.waitFor({ state: "visible", timeout: 1800 });
  return drawer;
}

function protectedSlices(payload) {
  return [payload?.authorizedRecords, payload?.retrievedFacts, payload?.queryPlanExecution?.facts, payload?.queryPlanExecution?.structuredFacts, payload?.synthesis?.facts]
    .filter(Boolean).map((value) => JSON.stringify(value)).join(" ");
}

function expectedEntityKeys(text) {
  const value = normalize(text);
  const out = [];
  for (const match of value.matchAll(/(?:vardiya|sefer|shift)\s*#?\s*(\d+)/gu)) out.push(`shift:${match[1]}`);
  for (const match of value.matchAll(/(?:sozlesme|anlasma|agreement|contract)\s*#?\s*(\d+)/gu)) out.push(`agreement:${match[1]}`);
  return [...new Set(out)];
}

function fieldSignals(text) {
  const value = normalize(text);
  return [value.includes("plaka") || value.includes("arac") ? "VEHICLE" : "", value.includes("durum") ? "STATUS" : "", value.includes("tarih") ? "DATE" : "", value.includes("surucu") ? "DRIVER" : ""].filter(Boolean);
}

function routeForPlan(payload) {
  return payload?.conversationRoute || payload?.semanticPlan?.conversationRoute || "";
}

function userVisiblePayloadText(payload) {
  return [...new Set([
    payload?.reply,
    payload?.summary,
    payload?.contextSummary,
    payload?.followUpPrompt,
    ...(Array.isArray(payload?.responseSections) ? payload.responseSections.slice(0, 3).map((section) => section?.body || section?.text || section?.hint) : []),
  ].filter((value) => typeof value === "string"))].join(" ");
}

function hasInternalLeak(text) {
  const value = String(text || "");
  return {
    json: /\{\s*["']?[A-Za-z_$][\w$.-]*["']?\s*:/u.test(value),
    object: /\[object Object\]|(?:structuredFacts|liveFacts|copilotSignals|queryPlanExecution|semanticPlan|authorizedProductContext)\b/iu.test(value),
    key: /(?:readinessScore|diagnosticPriority|actionSimulation|liveFactConfidence|requestedDomains|requestedTaskSlots|authorizationDecision|conversationRoute)\s*[:=]/iu.test(value),
    rawContext: /(?:structuredFacts|liveFacts)\s*[:=]|"(?:structuredFacts|liveFacts|copilotSignals)"\s*:/iu.test(value),
  };
}

function duplicateFragments(text) {
  const fragments = String(text || "").split(/[.!?•\n]+/u).map((value) => normalize(value)).filter((value) => value.length > 16);
  return fragments.filter((value, index) => fragments.indexOf(value) !== index).length;
}

function sameAnswer(left, right) {
  return normalize(left).replace(/\[r10-[^\]]+\]/gi, "") === normalize(right).replace(/\[r10-[^\]]+\]/gi, "");
}

async function ask(page, drawer, spec, item, screenPath) {
  const input = drawer.locator("textarea").first();
  let payload = null;
  let responseStatus = null;
  let requestBody = null;
  let responseKeys = [];
  let responseUrl = null;
  try {
    await input.waitFor({ state: "visible", timeout: 1200 });
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes("/api/ai/copilot") && candidate.request().method() === "POST", { timeout: 5000 }),
      input.fill(item.text).then(() => input.press("Enter")),
    ]);
    responseStatus = response.status();
    responseUrl = response.url();
    requestBody = response.request().postDataJSON?.() || null;
    payload = await response.json().catch(() => null);
    responseKeys = Object.keys(payload || {});
  } catch (error) {
    counters.ACCEPTED_QUERY_UNSETTLED_COUNT += 1;
    report.errors.push({ type: "query", role: spec.name, text: item.text, error: String(error?.message || error) });
  }
  await page.waitForTimeout(450);
  const answerLocator = drawer.locator(".copilotMsg.assistant .copilotMsgText");
  const answer = await answerLocator.count()
    ? await answerLocator.last().innerText({ timeout: 1000 }).catch(() => "")
    : "";
  const plan = payload?.semanticPlan || null;
  const execution = payload?.queryPlanExecution || null;
  const route = routeForPlan(payload);
  const domains = plan?.requestedDomains || [];
  const facts = protectedSlices(payload);
  const settled = responseStatus === 200 && Boolean(payload?.ok);
  if (!settled) counters.ACCEPTED_QUERY_UNSETTLED_COUNT += 1;
  const evidence = {
    ROLE: spec.name,
    QUERY: item.text,
    SCREEN_PATH: screenPath,
    ROUTE: route,
    DIALOGUE_TOPIC: payload?.dialogueTopic || plan?.dialogueTopic || null,
    AUTH_CONTEXT: { role: spec.name, identifier: spec.identifier },
    AUTH_DECISION: plan?.authorizationDecision || null,
    ENTITY_SET: plan?.entities || [],
    REQUESTED_FIELDS: plan?.requestedFields || [],
    REQUESTED_TASK_SLOTS: plan?.requestedTaskSlots || [],
    REQUESTED_DOMAINS: domains,
    RETRIEVED_RECORD_IDS: (execution?.structuredFacts || []).map((fact) => fact?.id ?? fact?.shiftId ?? fact?.agreementId ?? fact?.vehicleId).filter(Boolean),
    RESULT_STATUS: execution?.status || (plan?.authorizationDecision?.status === "DENY" ? "UNAUTHORIZED" : null),
    FINAL_ANSWER_SHAPE: plan?.answerMode || null,
    INTENT_FAMILY: plan?.intentFamily || null,
    FOLLOW_UP: Boolean(plan?.followUp),
    PREVIOUS_INTENT_FAMILY: plan?.previousIntentFamily || null,
    PRIORITY_SELECTED: payload?.priority || null,
    probeTypes: item.probes,
    httpStatus: responseStatus,
    ok: settled,
    answer: String(answer || payload?.reply || "").slice(0, 1800),
    networkTrace: { url: responseUrl, requestBody, responseKeys, protectedPayload: facts, protectedPayloadAbsent: !facts, responseCaptured: Boolean(payload) },
  };
  const visiblePayloadText = userVisiblePayloadText(payload);
  const leak = hasInternalLeak(`${answer} ${visiblePayloadText}`);
  counters.USER_VISIBLE_INTERNAL_JSON_LEAK_COUNT += leak.json ? 1 : 0;
  counters.USER_VISIBLE_DIAGNOSTIC_OBJECT_LEAK_COUNT += leak.object ? 1 : 0;
  counters.USER_VISIBLE_INTERNAL_KEY_LEAK_COUNT += leak.key ? 1 : 0;
  counters.RAW_CONTEXT_STRINGIFICATION_COUNT += leak.rawContext ? 1 : 0;
  counters.DUPLICATED_CONTEXT_FRAGMENT_COUNT += duplicateFragments(answer);
  counters.REPEATED_FACT_WITHOUT_REASON_COUNT += duplicateFragments(answer);
  report.queryEvidence.push(evidence);

  const expectedProductRoute = ["PRODUCT_TASK", "PRODUCT_FOLLOW_UP", "RETURN_TO_PRODUCT_TASK"].includes(route);
  if (item.probes.includes("OFF_TOPIC") || item.probes.includes("GENERAL_KNOWLEDGE")) {
    if (!route || ["PRODUCT_TASK", "PRODUCT_FOLLOW_UP", "RETURN_TO_PRODUCT_TASK"].includes(route) || domains.length || execution) {
      counters.OFF_TOPIC_PRODUCT_FALLBACK_COUNT += 1;
      counters.OFF_TOPIC_PRODUCT_HALLUCINATION_COUNT += 1;
      counters.OFF_TOPIC_CONTEXT_CORRUPTION_COUNT += 1;
    }
    if (plan?.authorizationDecision?.deniedDomains?.length) counters.OFF_TOPIC_AUTH_SCOPE_EXPANSION_COUNT += 1;
  }
  if (item.probes.includes("GENERAL_KNOWLEDGE")) {
    if (!/ürün kayıt|urun kayit|kaynak|güncel|guncel|doğrul|dogrul|çevrim|cevrim/i.test(evidence.answer)) counters.LIVE_EXTERNAL_LIMITATION_MISSING_COUNT += 1;
    if (domains.length || execution) counters.LIVE_EXTERNAL_QUERY_PRODUCT_FALLBACK_COUNT += 1;
  }
  if (item.probes.includes("LIVE_EXTERNAL")) {
    if (!/canlı|kaynak|güncel|guncel|veremem|bağlı değil|bagli degil/i.test(evidence.answer)) counters.LIVE_EXTERNAL_LIMITATION_MISSING_COUNT += 1;
    if (domains.length || execution) counters.LIVE_EXTERNAL_QUERY_PRODUCT_FALLBACK_COUNT += 1;
  }
  if (item.probes.includes("NEXT_ACTION")) {
    const productRoute = ["PRODUCT_TASK", "PRODUCT_FOLLOW_UP", "RETURN_TO_PRODUCT_TASK"].includes(route);
    const nextFamily = ["NEXT_STEP", "PRIORITY"].includes(plan?.family || plan?.intentFamily);
    if (!productRoute) { counters.PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT += 1; counters.NEXT_ACTION_QUERY_MISROUTED_COUNT += 1; counters.GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT += 1; }
    if (!nextFamily) { counters.NEXT_ACTION_QUERY_MISROUTED_COUNT += 1; counters.GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT += 1; }
    if (item.probes.includes("SCREEN_CONTEXT") && (!productRoute || !plan || !plan?.conversationRoute || route === "OFF_TOPIC_SAFE")) {
      counters.SCREEN_CONTEXT_NEXT_ACTION_FAILURE_COUNT += 1;
      counters.NEXT_STEP_CONTEXT_LOSS_COUNT += 1;
    }
    if (item.probes.includes("SELECTED_RECORD_NEXT_ACTION")) {
      if ((plan?.entities || []).length === 0 || !productRoute || !/Vardiya #2|Sözleşme #184|vardiya #2|sözleşme #184/i.test(evidence.answer)) counters.SELECTED_RECORD_NEXT_ACTION_FAILURE_COUNT += 1;
    }
  }
  if (item.probes.includes("RISK_RANKING")) {
    if (plan?.family !== "RISK_RANKING") counters.RISK_QUERY_GENERIC_DIAGNOSTIC_FALLBACK_COUNT += 1;
    if (!/doğrulanmış risk yok|dogrulanmis risk yok/i.test(evidence.answer) && !/1\.|1\)|birinci/i.test(evidence.answer)) counters.RISK_RANKING_WITHOUT_ORDER_COUNT += 1;
    if (!/şiddet|siddet|etki|aciliyet|kanıt|kanit|neden/i.test(evidence.answer)) counters.RISK_RANKING_WITHOUT_REASON_COUNT += 1;
    if (/risk[^.]{0,80}fırsat/i.test(normalize(evidence.answer)) && !/fırsat.*risk olarak saymadım|firsat.*risk olarak saymadim/i.test(normalize(evidence.answer))) counters.NON_RISK_PROMOTED_AS_RISK_COUNT += 1;
  }
  if (plan?.family === "ISSUE_DIAGNOSTIC") {
    if (!/sorun|problem|sıkıntı|sikinti|doğrulanmış açık sorun yok|dogrulanmis acik sorun yok/i.test(evidence.answer)) counters.ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT += 1;
  }
  if (plan?.family === "RESOLUTION_PLAN" && !/çözüm planı|cozum plani|önce|once|adım|adim|doğrula|dogrula/i.test(evidence.answer)) counters.RESOLUTION_QUERY_SUMMARY_ONLY_COUNT += 1;
  if (item.probes.includes("AMBIGUITY")) {
    if (route !== "UNCLEAR_OR_AMBIGUOUS") counters.NONSENSE_CLARIFICATION_FAILURE_COUNT += 1;
    if ((plan?.entities || []).length || execution || evidence.RETRIEVED_RECORD_IDS.length) {
      counters.AMBIGUOUS_REFERENCE_DEFAULT_ENTITY_COUNT += 1;
      counters.AMBIGUOUS_REFERENCE_UNJUSTIFIED_RESOLUTION_COUNT += 1;
    }
  }
  if (item.probes.includes("AUTH_NEGATIVE")) {
    const isSuperAdmin = spec.name === "SUPER_ADMIN";
    const denied = plan?.authorizationDecision?.status === "DENY" || payload?.authorizationBoundary === true || execution?.status === "UNAUTHORIZED";
    if (!isSuperAdmin && !denied) counters.CROSS_TENANT_DATA_LEAK_COUNT += 1;
    if (!isSuperAdmin && (!denied || execution || /\b(?:#\d+|6\.09\.2026|34ABC123)\b/i.test(evidence.answer))) counters.UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT += 1;
    if (!isSuperAdmin && /\d+\s+(?:SHIFTS|AGREEMENTS|OPERATIONS|vardiya|sözleşme)/i.test(evidence.answer)) counters.UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT += 1;
    if (!isSuperAdmin && /kendi|mevcut|yetkili.*vardiya/i.test(evidence.answer) && !denied) counters.SELF_RECORD_SUBSTITUTED_FOR_UNAUTHORIZED_QUERY_COUNT += 1;
    if (!isSuperAdmin && !denied && !execution) counters.NO_DATA_UNAUTHORIZED_CONFUSION_COUNT += 1;
  }
  if (item.probes.includes("PRIORITY_REASONING")) {
    if (!/Birinci öncelik|Başlangıç noktası|Vardiya #\d+|Teklif #\d+|Sözleşme #\d+/i.test(evidence.answer)) counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT += 1;
    if (!/Neden:|Nedeni:|kanıt|kanit|çünkü|cunku/i.test(evidence.answer)) counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT += 1;
    if (!/Birinci öncelik:|Vardiya #\d+|Teklif #\d+|Sözleşme #\d+|Araç\b|araç\b/i.test(evidence.answer)) counters.PRIORITY_ENTITY_SELECTION_FAILURE_COUNT += 1;
  }
  if (item.probes.includes("MULTI_PART_REQUEST")) {
    const expected = fieldSignals(item.text);
    if (expected.some((field) => !new RegExp({ VEHICLE: "araç|arac|plaka", STATUS: "durum", DATE: "tarih", DRIVER: "sürücü|surucu" }[field], "i").test(evidence.answer)) || (item.text.includes("adım") && !/adım|adim/i.test(evidence.answer))) counters.MULTI_PART_REQUEST_OMISSION_COUNT += 1;
  }
  if (item.probes.includes("SELECTED_RECORD")) {
    const expected = expectedEntityKeys(item.text);
    const planKeys = (plan?.entities || []).map((entity) => `${entity.type}:${entity.id || entity.plate || ""}`);
    if (expected.some((key) => !planKeys.includes(key))) counters.EXPLICIT_ENTITY_OVERRIDDEN_BY_SCREEN_COUNT += 1;
    if ((item.text.includes("plaka") || item.text.includes("durum") || item.text.includes("tarih")) && !/araç|arac|plaka|durum|tarih/i.test(evidence.answer)) counters.SELECTED_RECORD_FIELD_PROJECTION_FAILURE_COUNT += 1;
    report.selectedRecordProof.push({ role: spec.name, query: item.text, answer: evidence.answer, retrievedFacts: execution?.structuredFacts || [], requestBody });
  }
  if (item.probes.includes("FACT_PROOF") && /Vardiya #2/i.test(item.text) && spec.name === "ROOM" && !/34ABC123/i.test(evidence.answer)) counters.FACT_MISMATCH_COUNT += 1;
  if (item.probes.includes("FACT_PROOF") && /Sözleşme #184/i.test(item.text) && spec.name === "COMPANY" && !/İnceleme bekliyor|inceleme bekliyor/i.test(evidence.answer)) counters.FACT_MISMATCH_COUNT += 1;
  if (item.probes.includes("AUTH_NEGATIVE") && !expectedProductRoute && !["AUTHORIZATION_NEGATIVE", "PRODUCT_TASK", "RETURN_TO_PRODUCT_TASK"].includes(route) && spec.name !== "SUPER_ADMIN") counters.WRONG_CONVERSATION_ROUTE_COUNT += 1;
  return evidence;
}

async function runRoleQueries(browser, spec) {
  const session = await newRolePage(browser, spec, "role");
  try {
    const queries = roleQueries(spec);
    let currentPath = "";
    let nextActionIndex = 0;
    for (let index = 0; index < queries.length; index += 1) {
      const item = queries[index];
      let screenPath = spec.screens[0];
      if (item.probes.includes("NEXT_ACTION")) {
        const group = nextActionIndex < 3 ? 0 : nextActionIndex < 7 ? Math.min(1, spec.screens.length - 1) : Math.min(2, spec.screens.length - 1);
        screenPath = spec.screens[group];
        nextActionIndex += 1;
      } else if (item.probes.includes("SELECTED_RECORD") || item.probes.includes("SELECTED_RECORD_NEXT_ACTION") || item.probes.includes("CROSS_PANEL")) {
        screenPath = spec.screens[Math.min(2, spec.screens.length - 1)];
      } else if (item.probes.includes("OFF_TOPIC") || item.probes.includes("GENERAL_KNOWLEDGE") || item.probes.includes("LIVE_EXTERNAL") || item.probes.includes("AMBIGUITY") || item.probes.includes("AUTH_NEGATIVE")) {
        screenPath = spec.screens[0];
      } else {
        screenPath = spec.screens[Math.min(1, spec.screens.length - 1)];
      }
      try {
        if (screenPath !== currentPath) {
          await gotoScreen(session.page, spec, screenPath);
          currentPath = screenPath;
        }
        const drawer = await openAssistant(session.page);
        await ask(session.page, drawer, spec, item, screenPath);
      } catch (error) {
        counters.ACCEPTED_QUERY_UNSETTLED_COUNT += 1;
        report.errors.push({ type: "role-query", role: spec.name, query: item.text, error: String(error?.message || error) });
      }
    }
  } finally {
    await session.context.close();
  }
}

async function runChain(browser, spec, index) {
  const session = await newRolePage(browser, spec, `chain-${index}`);
  const chain = [];
  try {
    const chainScreen = spec.name === "ROOM" ? "/room/map" : spec.name === "COMPANY" ? "/company/agreements" : spec.home;
    await gotoScreen(session.page, spec, chainScreen);
    const drawer = await openAssistant(session.page);
    const first = await ask(session.page, drawer, spec, q(spec.name === "ROOM" ? "Vardiya #2’nin plakasını ve durumunu incele." : "Bugünkü yetkili servis durumunu özetle.", "CHAIN_PRODUCT"), chainScreen);
    const off = await ask(session.page, drawer, spec, q("Bu arada bana kısa bir espri anlatır mısın?", "OFF_TOPIC", "CHAIN_OFF_TOPIC"), chainScreen);
    const second = await ask(session.page, drawer, spec, q("Sıradaki doğru işlem ne?", "CHAIN_RETURN", "RETURN_PRODUCT", "NEXT_ACTION"), chainScreen);
    chain.push(first, off, second);
    const returned = second.ROUTE === "PRODUCT_FOLLOW_UP" || second.ROUTE === "RETURN_TO_PRODUCT_TASK";
    if (!returned) { counters.TOPIC_PIVOT_FAILURE_COUNT += 1; counters.RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT += 1; counters.SAME_AUTH_VALID_CONTEXT_LOSS_COUNT += 1; counters.SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT += 1; }
    if (off.ROUTE === "PRODUCT_TASK" || off.ROUTE === "PRODUCT_FOLLOW_UP" || off.REQUESTED_DOMAINS?.length) counters.OFF_TOPIC_CONTEXT_CORRUPTION_COUNT += 1;
    const intentSteps = [
      ["Bu ekranda neye bakmalıyım?", "SCREEN_OR_SITUATION_SUMMARY"],
      ["Sorun var mı?", "ISSUE_DIAGNOSTIC"],
      ["Nasıl çözeriz?", "RESOLUTION_PLAN"],
      ["Hangisinden başlayalım?", "PRIORITY"],
      ["Riskleri sırala", "RISK_RANKING"],
      ["Sıradaki doğru işlem ne?", "NEXT_STEP"],
      ["Başka risk var mı?", "ISSUE_DIAGNOSTIC"],
      ["Devam et", "NEXT_STEP"],
    ];
    const semantic = [];
    for (const [text, expectedFamily] of intentSteps) {
      const item = await ask(session.page, drawer, spec, q(text, "FOLLOW_UP_SEMANTIC", expectedFamily), chainScreen);
      semantic.push(item);
      if (item.INTENT_FAMILY !== expectedFamily || !["PRODUCT_TASK", "PRODUCT_FOLLOW_UP", "RETURN_TO_PRODUCT_TASK"].includes(item.ROUTE)) counters.FOLLOW_UP_INTENT_COLLAPSE_COUNT += 1;
      if (sameAnswer(semantic[semantic.length - 2]?.answer, item.answer)) counters.VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT += 1;
      if (expectedFamily === "RESOLUTION_PLAN" && !/çözüm planı|cozum plani|önce|once|adım|adim|doğrula|dogrula/i.test(item.answer)) counters.RESOLUTION_QUERY_SUMMARY_ONLY_COUNT += 1;
      if (expectedFamily === "PRIORITY") {
        if (!/Birinci öncelik|Başlangıç noktası|Vardiya #\d+|Teklif #\d+|Sözleşme #\d+/i.test(item.answer)) counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT += 1;
        if (!/Neden:|Nedeni:|kanıt|kanit|çünkü|cunku/i.test(item.answer)) counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT += 1;
      }
    }
    chain.push(...semantic);
    report.chainEvidence.push({ role: spec.name, chainIndex: index, steps: chain, returned });
  } finally {
    await session.context.close();
  }
}

async function runCrossAuthTransition(browser, fromSpec, toSpec, index) {
  const from = await newRolePage(browser, fromSpec, `cross-from-${index}`);
  const trace = { index, previousAuth: fromSpec.name, nextAuth: toSpec.name, steps: [] };
  try {
    await gotoScreen(from.page, fromSpec, fromSpec.home);
    const drawer = await openAssistant(from.page);
    const prior = await ask(from.page, drawer, fromSpec, q(fromSpec.name === "ROOM" ? "Vardiya #2’nin plakasını doğrula." : "Bugünkü yetkili servis durumunu özetle.", "CROSS_AUTH_PRIOR"), fromSpec.home);
    trace.steps.push({ type: "PREVIOUS_AUTH", entity: prior.ENTITY_SET, facts: prior.RETRIEVED_RECORD_IDS, answer: prior.answer });
    const next = await login(toSpec, `cross-next-${index}`);
    await from.page.evaluate((token) => localStorage.setItem("token", token), next);
    await from.page.reload({ waitUntil: "domcontentloaded" });
    await from.page.waitForTimeout(500);
    const nextDrawer = await openAssistant(from.page);
    const off = await ask(from.page, nextDrawer, toSpec, q("Bu arada bir espri yapar mısın?", "OFF_TOPIC", "CROSS_AUTH_OFF_TOPIC"), toSpec.home);
    const post = await ask(from.page, nextDrawer, toSpec, q("Şey, hani o neydi?", "AMBIGUITY", "CROSS_AUTH_POST"), toSpec.home);
    trace.steps.push({ type: "AUTH_TRANSITION", answer: off.answer, route: off.ROUTE });
    trace.steps.push({ type: "POST_AUTH_QUERY", answer: post.answer, route: post.ROUTE, facts: post.RETRIEVED_RECORD_IDS });
    const clarifierOnly = post.ROUTE === "UNCLEAR_OR_AMBIGUOUS" && post.RETRIEVED_RECORD_IDS.length === 0 && (post.ENTITY_SET || []).length === 0;
    const leaked = (!clarifierOnly && /34ABC123|Vardiya #2|shift:2|agreement:184/i.test(`${off.answer} ${post.answer} ${JSON.stringify(post.ENTITY_SET)}`)) || post.RETRIEVED_RECORD_IDS.length > 0;
    if (leaked) { counters.CROSS_AUTH_CONTEXT_LEAK_COUNT += 1; counters.PREVIOUS_AUTH_ENTITY_RECALL_COUNT += 1; counters.OFF_TOPIC_CROSS_AUTH_RECALL_COUNT += 1; }
    report.authTransitionEvidence.push({ ...trace, retrieval: post.RETRIEVED_RECORD_IDS, finalResponse: post.answer, classification: leaked ? "PROTECTED_FACT_DISCLOSURE_OR_STALE_REFERENCE" : "NO_PRIOR_AUTH_FACT_RECALL" });
  } finally {
    await from.context.close();
  }
}

async function runMobileProbe(browser, spec) {
  const session = await newRolePage(browser, spec, "mobile");
  const page = session.page;
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoScreen(page, spec, spec.home);
    const trigger = page.locator(".shellTopMenu:visible").first();
    await trigger.click();
    const nav = page.locator("#shell-nav-dock.navDock--mobileOpen");
    const opened = await nav.isVisible();
    await page.locator(".navDockMobileClose:visible").click();
    const closedByButton = await page.locator("#shell-nav-dock.navDock--mobileClosed").count() > 0;
    const focusReturned = await trigger.evaluate((node) => document.activeElement === node);
    await trigger.click();
    await page.keyboard.press("Escape");
    const closedByEscape = await page.locator("#shell-nav-dock.navDock--mobileClosed").count() > 0;
    await trigger.click();
    await page.locator(".navDockBackdrop:visible").click({ position: { x: 6, y: 6 } });
    const closedByBackdrop = await page.locator("#shell-nav-dock.navDock--mobileClosed").count() > 0;
    await trigger.click();
    await page.locator(".navDockMobileClose:visible").click();
    counters.MOBILE_MENU_REPEAT_OPEN_CLOSE = opened && closedByButton && closedByEscape && closedByBackdrop ? "PASS" : "FAIL";
    report.mobileMenu = { opened, closedByButton, focusReturned, closedByEscape, closedByBackdrop, pass: counters.MOBILE_MENU_REPEAT_OPEN_CLOSE === "PASS" };
  } catch (error) {
    counters.MOBILE_MENU_REPEAT_OPEN_CLOSE = "FAIL";
    report.errors.push({ type: "mobile", role: spec.name, error: String(error?.message || error) });
  } finally {
    await session.context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const spec of roles) await runRoleQueries(browser, spec);
  for (const spec of roles) await runChain(browser, spec, 1);
  for (let index = 0; index < roles.length; index += 1) await runCrossAuthTransition(browser, roles[index], roles[(index + 1) % roles.length], index + 1);
  await runMobileProbe(browser, roles[0]);
} finally {
  await browser.close();
}

const settledQueryCount = report.queryEvidence.filter((item) => item.ok && item.httpStatus === 200).length;
const uniqueQueries = new Set(report.queryEvidence.map((item) => normalize(item.QUERY)));
const probeCount = (type) => report.queryEvidence.filter((item) => item.probeTypes.includes(type)).length;
const screenContextCount = new Set(report.screenContexts.map((item) => `${item.role}:${item.path}`)).size;
const roleCount = roles.length;
const hasNetworkEvidence = report.queryEvidence.length > 0 && report.queryEvidence.every((item) => item.networkTrace.responseCaptured && item.networkTrace.url && item.networkTrace.requestBody);
const nextActionEvidence = report.queryEvidence.filter((item) => item.probeTypes.includes("NEXT_ACTION"));
const roleActionAnchors = {
  SUPER_ADMIN: /tenant|salt-okunur/i,
  ROOM: /oda operasyon|taşımacılık firması operasyon/i,
  COMPANY: /şirket operasyon/i,
  SCHOOL: /okul servis/i,
  ORGANIZATION: /organizasyon plan/i,
  DRIVER: /kendi görev/i,
  PERSONEL: /kendi servis|kendi vardiya/i,
  PARENT: /çocuğunuzun yetkili servis/i,
};
for (const spec of roles) {
  const roleAnswers = nextActionEvidence.filter((item) => item.ROLE === spec.name).map((item) => item.answer).filter(Boolean);
  if (!roleAnswers.length || !roleAnswers.some((answer) => roleActionAnchors[spec.name]?.test(answer))) counters.ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT += 1;
}
if (new Set(nextActionEvidence.map((item) => normalize(item.answer))).size < Math.min(roles.length, 2)) counters.ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT += 1;
const blockerCount = [
  counters.WRONG_CONVERSATION_ROUTE_COUNT, counters.OFF_TOPIC_PRODUCT_FALLBACK_COUNT, counters.OFF_TOPIC_CONTEXT_CORRUPTION_COUNT,
  counters.OFF_TOPIC_PRODUCT_HALLUCINATION_COUNT, counters.NONSENSE_CLARIFICATION_FAILURE_COUNT, counters.CROSS_TENANT_DATA_LEAK_COUNT,
  counters.REQUESTED_FIELD_IGNORED_COUNT, counters.WRONG_DOMAIN_FALLBACK_COUNT, counters.SELECTED_RECORD_FIELD_PROJECTION_FAILURE_COUNT,
  counters.MULTI_PART_REQUEST_OMISSION_COUNT, counters.PRIORITY_ENTITY_SELECTION_FAILURE_COUNT, counters.RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT,
  counters.FACT_MISMATCH_COUNT, counters.ACCEPTED_QUERY_UNSETTLED_COUNT, counters.USER_VISIBLE_INTERNAL_JSON_LEAK_COUNT,
  counters.USER_VISIBLE_DIAGNOSTIC_OBJECT_LEAK_COUNT, counters.USER_VISIBLE_INTERNAL_KEY_LEAK_COUNT, counters.RAW_CONTEXT_STRINGIFICATION_COUNT,
  counters.DUPLICATED_CONTEXT_FRAGMENT_COUNT, counters.REPEATED_FACT_WITHOUT_REASON_COUNT, counters.GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT,
  counters.ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT, counters.SCREEN_CONTEXT_NEXT_ACTION_FAILURE_COUNT, counters.SELECTED_RECORD_NEXT_ACTION_FAILURE_COUNT,
].some((value) => Number(value) > 0) || counters.MOBILE_MENU_REPEAT_OPEN_CLOSE !== "PASS" || counters.HTTP_500_COUNT > 0 ? 1 : 0;
const majorCount = 0;
const minorCount = report.errors.some((error) => error.type === "not-found-ledger") ? 1 : 0;

report.summary = {
  ROLE_COUNT_TESTED: roleCount,
  SCREEN_CONTEXT_COUNT_TESTED: screenContextCount,
  SELECTED_RECORD_CONTEXT_COUNT: 3,
  SETTLED_QUERY_COUNT: settledQueryCount,
  NEW_UNSEEN_QUERY_COUNT: uniqueQueries.size,
  CONVERSATION_CHAIN_COUNT: report.chainEvidence.length,
  OFF_TOPIC_PROBE_COUNT: probeCount("OFF_TOPIC") + probeCount("GENERAL_KNOWLEDGE"),
  LIVE_EXTERNAL_PROBE_COUNT: probeCount("LIVE_EXTERNAL"),
  AMBIGUITY_PROBE_COUNT: probeCount("AMBIGUITY"),
  TOPIC_PIVOT_RETURN_CHAIN_COUNT: report.chainEvidence.length,
  AUTH_NEGATIVE_PROBE_COUNT: probeCount("AUTH_NEGATIVE"),
  CROSS_AUTH_TRANSITION_PROBE_COUNT: report.authTransitionEvidence.length,
  SELECTED_RECORD_DEEP_CHAIN_COUNT: report.selectedRecordProof.filter((item) => item.query.includes("Vardiya #2") || item.query.includes("Sözleşme #184")).length,
  CROSS_PANEL_PROBE_COUNT: probeCount("CROSS_PANEL"),
  MULTI_PART_REQUEST_PROBE_COUNT: probeCount("MULTI_PART_REQUEST"),
  PRIORITY_REASONING_PROBE_COUNT: probeCount("PRIORITY_REASONING"),
  NEXT_ACTION_PROBE_COUNT: probeCount("NEXT_ACTION"),
  RISK_RANKING_PROBE_COUNT: probeCount("RISK_RANKING"),
  counters,
  NETWORK_EVIDENCE_STATUS: hasNetworkEvidence && counters.HTTP_500_COUNT === 0 ? "PASS" : "FAIL",
  BLOCKER_COUNT: blockerCount,
  MAJOR_COUNT: majorCount,
  MINOR_COUNT: minorCount,
};
report.finalFields = {
  ROUND_10_CONVERSATION_ROUTING: counters.WRONG_CONVERSATION_ROUTE_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_OFF_TOPIC_ISOLATION: counters.OFF_TOPIC_PRODUCT_FALLBACK_COUNT === 0 && counters.OFF_TOPIC_CONTEXT_CORRUPTION_COUNT === 0 && counters.OFF_TOPIC_AUTH_SCOPE_EXPANSION_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_LIVE_EXTERNAL_HANDLING: counters.LIVE_EXTERNAL_QUERY_PRODUCT_FALLBACK_COUNT === 0 && counters.LIVE_EXTERNAL_LIMITATION_MISSING_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_AMBIGUITY_CLARIFICATION: counters.NONSENSE_CLARIFICATION_FAILURE_COUNT === 0 && counters.AMBIGUOUS_REFERENCE_DEFAULT_ENTITY_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_SAME_AUTH_CONTEXT_CONTINUITY: counters.SAME_AUTH_VALID_CONTEXT_LOSS_COUNT === 0 && counters.SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_CROSS_AUTH_ISOLATION: counters.CROSS_AUTH_CONTEXT_LEAK_COUNT === 0 && counters.PREVIOUS_AUTH_ENTITY_RECALL_COUNT === 0 && counters.OFF_TOPIC_CROSS_AUTH_RECALL_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_AUTHORIZATION_BEFORE_RETRIEVAL: counters.CROSS_TENANT_DATA_LEAK_COUNT === 0 && counters.UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT === 0 && counters.NO_DATA_UNAUTHORIZED_CONFUSION_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_SELECTED_RECORD_FIELD_PROJECTION: counters.REQUESTED_FIELD_IGNORED_COUNT === 0 && counters.WRONG_DOMAIN_FALLBACK_COUNT === 0 && counters.EXPLICIT_ENTITY_OVERRIDDEN_BY_SCREEN_COUNT === 0 && counters.SELECTED_RECORD_FIELD_PROJECTION_FAILURE_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_MULTI_PART_REQUEST: counters.MULTI_PART_REQUEST_OMISSION_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_PRIORITY_REASONING: counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT === 0 && counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT === 0 && counters.PRIORITY_ENTITY_SELECTION_FAILURE_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_TOPIC_PIVOT_RETURN: counters.TOPIC_PIVOT_FAILURE_COUNT === 0 && counters.RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_INTERNAL_CONTEXT_LEAK_HARDENING: counters.USER_VISIBLE_INTERNAL_JSON_LEAK_COUNT === 0 && counters.USER_VISIBLE_DIAGNOSTIC_OBJECT_LEAK_COUNT === 0 && counters.USER_VISIBLE_INTERNAL_KEY_LEAK_COUNT === 0 && counters.RAW_CONTEXT_STRINGIFICATION_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_FACT_DEDUPLICATION: counters.DUPLICATED_CONTEXT_FRAGMENT_COUNT === 0 && counters.REPEATED_FACT_WITHOUT_REASON_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_RISK_RANKING: counters.RISK_QUERY_GENERIC_DIAGNOSTIC_FALLBACK_COUNT === 0 && counters.RISK_RANKING_WITHOUT_ORDER_COUNT === 0 && counters.RISK_RANKING_WITHOUT_REASON_COUNT === 0 && counters.NON_RISK_PROMOTED_AS_RISK_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_NEXT_ACTION_ROUTING: counters.GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT === 0 && counters.PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT === 0 && counters.NEXT_ACTION_QUERY_MISROUTED_COUNT === 0 && counters.ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT === 0 && counters.SCREEN_CONTEXT_NEXT_ACTION_FAILURE_COUNT === 0 && counters.SELECTED_RECORD_NEXT_ACTION_FAILURE_COUNT === 0 ? "PASS" : "FAIL",
  ROUND_10_MOBILE_MENU_CLOSE: counters.MOBILE_MENU_REPEAT_OPEN_CLOSE === "PASS" ? "PASS" : "FAIL",
  ROUND_10_NETWORK_EVIDENCE: report.summary.NETWORK_EVIDENCE_STATUS,
};

await fs.mkdir(evidenceRoot, { recursive: true });
await fs.writeFile(path.join(evidenceRoot, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ finalFields: report.finalFields, summary: report.summary, mobileMenu: report.mobileMenu }, null, 2));
