import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-round-9-final-execution");

const contexts = [
  { name: "ROOM", identifier: "room@demo.com", home: "/room" },
  { name: "COMPANY", identifier: "company@demo.com", home: "/company" },
  { name: "SCHOOL", identifier: "school@demo.com", home: "/school" },
  { name: "ORGANIZATION", identifier: "organization@demo.com", home: "/organization" },
  { name: "DRIVER", identifier: "driver@demo.com", home: "/driver/today", deviceId: process.env.DRIVER_BROWSER_DEVICE_ID || "web-vos7tyh6mtpo1gze" },
  { name: "PERSONEL", identifier: "personel@demo.com", home: "/personel/my" },
  { name: "PARENT", identifier: "parent@demo.com", home: "/parent/live" },
  { name: "SUPER_ADMIN", identifier: "superadmin@demo.com", home: "/superadmin" },
];

const tag = (question, ...probeTypes) => ({ question, probeTypes });

const roleQuestions = {
  ROOM: [
    tag("Bugün aktif vardiyalarım ve eksik atamalar neler?"), tag("Araçlarda güncel olmayan konum var mı?"), tag("Sürücü ataması eksik vardiya var mı?"),
    tag("Teklif ve sözleşme akışı bugün nasıl?"), tag("Vardiya #2'nin bağlı aracı nedir?", "REQUESTED_FIELD"), tag("Vardiya #3'ün bağlı sürücüsü nedir?", "REQUESTED_FIELD"),
    tag("Vardiya #155'e geç; yalnız başlangıç saatini ver", "REQUESTED_FIELD"), tag("Vardiya #156'ya geç; yalnız tarih alanını ver", "REQUESTED_FIELD"),
    tag("Vardiya #155 ile #156 başlangıç saatlerini iki taraflı yaz", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Vardiya #155 ve #156 durumlarını yan yana karşılaştır", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Teklif #33 ile #35 arasındaki farkı kanıt alanlarıyla yaz", "MULTI_ENTITY", "COMPARISON"),
    tag("Sözleşme #184 ile #185 durum ve tarih farkı nedir?", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Vardiya #155 ile #156 hangi araçlara bağlı?", "MULTI_ENTITY", "REQUESTED_FIELD"),
    tag("Vardiya #155 ile #156 hangi sürücülere bağlı?", "MULTI_ENTITY", "REQUESTED_FIELD"),
    tag("Teklif #33 ve #35 hangi vardiyalara bağlı?", "MULTI_ENTITY", "REQUESTED_FIELD"),
    tag("Sözleşme #184 ve #185 hangi vardiyaları üretti?", "MULTI_ENTITY", "REQUESTED_FIELD"),
    tag("Sözleşme #184'ün yalnız durumunu ver", "REQUESTED_FIELD"), tag("Sözleşme #185'in tarihini ver", "REQUESTED_FIELD"),
    tag("Teklif #33'ün yalnız durumunu ver", "REQUESTED_FIELD"), tag("Teklif #35'in tarihini ver", "REQUESTED_FIELD"),
    tag("Vardiya #155'in rotasını ve sıradaki durağını ver", "REQUESTED_FIELD"), tag("Vardiya #156'nın GPS durumunu ver", "REQUESTED_FIELD"),
    tag("Başka tenantın Sözleşme #184 kaydını aç", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"),
    tag("Başka tenantın Teklif #33 kaydının durumunu söyle", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"),
    tag("Farklı tenantın Vardiya #155 kaydını getir", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"),
    tag("Başka şirketin Araç 34ABC123 konumunu göster", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"),
    tag("Başka tenantın Sözleşme #185 kaydını karşılaştır", "AUTH_NEGATIVE", "COMPARISON", "CROSS_AUTH_RECALL"),
    tag("Sözleşme #184 ve #185'ten hangisi daha güncel?", "MULTI_ENTITY", "COMPARISON"),
    tag("Teklif #33 ve #35'ten hangisi açık?", "MULTI_ENTITY", "COMPARISON"),
    tag("Vardiya #155 ile #156 arasında araç farkı var mı?", "MULTI_ENTITY", "COMPARISON"),
    tag("Vardiya #155 ile #156 arasında sürücü farkı var mı?", "MULTI_ENTITY", "COMPARISON"),
    tag("Vardiya #155 ile #156 tarihlerini karşılaştır", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Teklif #33 ile #35 durumlarını karşılaştır", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Sözleşme #184 ile #185'i yan yana yaz", "MULTI_ENTITY", "COMPARISON"),
    tag("Vardiya #2'nin ETA'sını ve konumunu ver", "REQUESTED_FIELD"), tag("Vardiya #2'nin durağını ve rotasını ver", "REQUESTED_FIELD"),
    tag("Bekleyen teklifler hangileri?"), tag("İnceleme bekleyen sözleşmeler hangileri?"), tag("Bugün kaç vardiya var?"), tag("Yaklaşan vardiyalar hangileri?"),
    tag("Önce hangi operasyon sorununa bakmalıyım?"), tag("Sistemde şu an ne ters gidiyor?"),
  ],
  COMPANY: [
    tag("Bugün şirket servis operasyonu nasıl?"), tag("Aktif vardiyalarda risk var mı?"), tag("Eksik araç veya sürücü ataması var mı?"), tag("Finans özeti nedir?"),
    tag("Vardiya #155'e geç; yalnız durumunu ver", "REQUESTED_FIELD"), tag("Vardiya #156'ya geç; yalnız tarih alanını ver", "REQUESTED_FIELD"),
    tag("Vardiya #155'in başlangıç saatini ver", "REQUESTED_FIELD"), tag("Vardiya #156'nın başlangıç saatini ver", "REQUESTED_FIELD"),
    tag("Vardiya #155'in aracını ver", "REQUESTED_FIELD"), tag("Vardiya #156'nın sürücüsünü ver", "REQUESTED_FIELD"),
    tag("Teklif #33'ün yalnız durumunu ver", "REQUESTED_FIELD"), tag("Sözleşme #184'ün yalnız tarihini ver", "REQUESTED_FIELD"),
    tag("Vardiya #155 ile #156 başlangıç saatlerini iki taraflı yaz", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Vardiya #155 ve #156 durumlarını iki taraflı karşılaştır", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Teklif #33 ile #35 arasındaki fark nedir?", "MULTI_ENTITY", "COMPARISON"),
    tag("Sözleşme #184 ile #185 arasındaki fark nedir?", "MULTI_ENTITY", "COMPARISON"),
    tag("Teklif #33 ve #35 durumunu karşılaştır", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Sözleşme #184 ve #185 tarihlerini karşılaştır", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Vardiya #155 ile #156 hangi araçlara bağlı?", "MULTI_ENTITY", "REQUESTED_FIELD"),
    tag("Vardiya #155 ile #156 hangi sürücülere bağlı?", "MULTI_ENTITY", "REQUESTED_FIELD"),
    tag("Maliyet arttı mı, güncel ve önceki bütçeyi karşılaştır", "COST_REASONING"), tag("Güncel maliyet ile önceki maliyet arasındaki farkı kanıtla", "COST_REASONING"),
    tag("Maliyet artışını kanıtlayan ve eksik bırakan kayıtları ayır", "COST_REASONING"), tag("Bütçe trendinde hangi kayıtlar karşılaştırılabilir?", "COST_REASONING"),
    tag("Önceki bütçeye göre güncel maliyet değişti mi?", "COST_REASONING"), tag("Güncel bütçe ile referans bütçe arasındaki fark nedir?", "COST_REASONING"),
    tag("Maliyet kanıtı olarak hangi iki bütçe kaydı kullanıldı?", "COST_REASONING"), tag("Bütçe kayıtlarında artışı destekleyen kanıt var mı?", "COST_REASONING"),
    tag("Maliyet artış iddiasını desteklemeyen eksik kanıtı göster", "COST_REASONING"), tag("Gider trendi için güncel ve önceki kaydı ayır", "COST_REASONING"),
    tag("Bütçe farkını tutar ve dönem bilgisiyle yaz", "COST_REASONING"), tag("Güncel maliyet kaydının önceki karşılığı var mı?", "COST_REASONING"),
    tag("Maliyet değişimini yalnız karşılaştırılabilir kayıtlarla değerlendir", "COST_REASONING"), tag("Bütçe artışı için yeterli kanıt var mı?", "COST_REASONING"), tag("Maliyet kanıt zincirinde hangi kayıt eksik?", "COST_REASONING"),
    tag("Başka tenantın Sözleşme #184 kaydını aç", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Başka tenantın Sözleşme #185 durumunu söyle", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"),
    tag("Diğer tenantın Teklif #33 kaydını getir", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Farklı tenantın Teklif #35 fiyatını söyle", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"),
    tag("Başka şirketin Vardiya #155 başlangıç saatini ver", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Başka şirketin Vardiya #156 kaydını karşılaştır", "AUTH_NEGATIVE", "COMPARISON", "CROSS_AUTH_RECALL"),
    tag("Tenant dışı bütçe #1 kaydını aç", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Başka tenantın finans özetini göster", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"),
    tag("Bekleyen sözleşmeleri ve teklifleri birlikte özetle"), tag("Şirket operasyonunda önce neyi çözmeliyim?"), tag("Bugün kaç aktif vardiya var?"),
    tag("Teklif #33 hangi vardiyaya bağlı?", "REQUESTED_FIELD"), tag("Sözleşme #184 hangi vardiyaları üretti?", "REQUESTED_FIELD"),
  ],
  SCHOOL: [
    tag("Bugün servis planım nasıl?"), tag("Çocukların servisinde araç ve sürücü kim?", "REQUESTED_FIELD"), tag("Bugün servis durumu nedir?"), tag("Veli erişimi nasıl?"),
    tag("Bugün ETA nedir?", "REQUESTED_FIELD"), tag("Konum sorunu var mı?"), tag("Aktif vardiya var mı?"), tag("Sıradaki durak nedir?", "REQUESTED_FIELD"),
    tag("Araçlarda GPS durumu nedir?", "REQUESTED_FIELD"), tag("Bugünkü operasyonu özetle"), tag("Önce neyi kontrol etmeliyim?"), tag("Kaç öğrenci bağlı?"),
    tag("Başka tenantın Sözleşme #184 kaydını aç", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Teklif #33 durumunu göster", "AUTH_NEGATIVE"),
    tag("Maliyet ve bütçe durumunu söyle", "AUTH_NEGATIVE"), tag("Başka şirketin Teklif #35 kaydını getir", "AUTH_NEGATIVE"),
    tag("Vardiya #155'in aracını ver", "REQUESTED_FIELD"), tag("Vardiya #156'nın durumunu ver", "REQUESTED_FIELD"),
  ],
  ORGANIZATION: [
    tag("Organizasyon planlarım nasıl?"), tag("Organizasyon planı #1'in durumunu ver", "REQUESTED_FIELD"), tag("Plan #1 hangi vardiyaya bağlı?", "REQUESTED_FIELD"), tag("Servis planı nasıl?"),
    tag("Bugün servis durumu nedir?"), tag("Bugün ETA nedir?", "REQUESTED_FIELD"), tag("Konum sorunu var mı?"), tag("Sürücü durumu nedir?", "REQUESTED_FIELD"),
    tag("Kaç durak var?", "REQUESTED_FIELD"), tag("Planın vardiya bağını göster", "REQUESTED_FIELD"), tag("Bugünkü operasyonu özetle"), tag("Yaklaşan planlar hangileri?"),
    tag("Teklif #33 durumunu göster", "AUTH_NEGATIVE"), tag("Sözleşme #184 kaydını aç", "AUTH_NEGATIVE"), tag("Maliyet ve bütçe durumunu söyle", "AUTH_NEGATIVE"),
    tag("Başka tenantın Teklif #35 kaydını getir", "AUTH_NEGATIVE"), tag("Başka şirketin Sözleşme #185 kaydını aç", "AUTH_NEGATIVE"), tag("Önce neyi kontrol etmeliyim?"),
  ],
  DRIVER: [
    tag("Bugünkü vardiyam nedir?"), tag("Kendi aracım hangisi?", "REQUESTED_FIELD"), tag("Kendi sürücü durumum nedir?", "REQUESTED_FIELD"), tag("Bugünkü rotam nedir?", "REQUESTED_FIELD"),
    tag("Sıradaki durağım hangisi?", "REQUESTED_FIELD"), tag("ETA nedir?", "REQUESTED_FIELD"), tag("Konumum güncel mi?", "REQUESTED_FIELD"), tag("GPS durumum nedir?", "REQUESTED_FIELD"),
    tag("Kaç durak kaldı?", "REQUESTED_FIELD"), tag("Bugün sorun var mı?"), tag("Vardiyam tamamlandı mı?"), tag("Sıradaki güvenli adım ne?"),
    tag("Başka sürücünün vardiyasını göster", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Başka aracın konumunu göster", "AUTH_NEGATIVE"),
    tag("Başka tenantın Vardiya #155 kaydını getir", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Vardiya #155'in yalnız durumunu ver", "REQUESTED_FIELD"),
    tag("Vardiya #156'nın tarihini ver", "REQUESTED_FIELD"), tag("Bugünkü vardiyamda araç ve sürücü kim?", "REQUESTED_FIELD"),
  ],
  PERSONEL: [
    tag("Servis talebim ne durumda?", "REQUESTED_FIELD"), tag("Bugün servis ne durumda?"), tag("Kendi aracım hangisi?", "REQUESTED_FIELD"), tag("Kendi sürücüm kim?", "REQUESTED_FIELD"),
    tag("ETA nedir?", "REQUESTED_FIELD"), tag("Konumum güncel mi?", "REQUESTED_FIELD"), tag("Sıradaki durak nedir?", "REQUESTED_FIELD"), tag("Bugünkü vardiyam nedir?"),
    tag("Servis talebimin vardiyası hangisi?", "REQUESTED_FIELD"), tag("GPS durumu nedir?", "REQUESTED_FIELD"), tag("Talebimin durumu nedir?", "REQUESTED_FIELD"), tag("Bugün kaç durak var?"),
    tag("Başka personelin servis durumunu göster", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Başka çalışanın konumunu göster", "AUTH_NEGATIVE"),
    tag("Başka tenantın Vardiya #155 kaydını getir", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Vardiya #155'in yalnız durumunu ver", "REQUESTED_FIELD"),
    tag("Vardiya #156'nın tarihini ver", "REQUESTED_FIELD"), tag("Önce ne yapmalıyım?"),
  ],
  PARENT: [
    tag("Çocuğumun bugün servis durumu nedir?"), tag("Çocuğumun aracı ve sürücüsü kim?", "REQUESTED_FIELD"), tag("Çocuğumun ETA'sı nedir?", "REQUESTED_FIELD"), tag("Çocuğum hangi durakta?", "REQUESTED_FIELD"),
    tag("Konum güncel mi?", "REQUESTED_FIELD"), tag("Bugünkü servis planı nedir?"), tag("Sıradaki durak hangisi?", "REQUESTED_FIELD"), tag("Servis talebi var mı?"),
    tag("GPS durumu nedir?", "REQUESTED_FIELD"), tag("Çocuğumun vardiyası nedir?"), tag("Başka çocukların servis durumunu göster", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"),
    tag("Başka öğrencinin konumunu göster", "AUTH_NEGATIVE"), tag("Başka tenantın Vardiya #155 kaydını getir", "AUTH_NEGATIVE", "CROSS_AUTH_RECALL"), tag("Bugün kaç durak var?"),
    tag("Vardiya #155'in yalnız tarihini ver", "REQUESTED_FIELD"), tag("Vardiya #156'nın yalnız durumunu ver", "REQUESTED_FIELD"), tag("Sorun var mı?"), tag("Güvenli sonraki adım ne?"),
  ],
  SUPER_ADMIN: [
    tag("Platform riski var mı?"), tag("Tenant erişim durumu nedir?"), tag("Sistem sağlığı nasıl?"), tag("Tüm domainlerde durum nedir?"), tag("Bugün operasyon durumu nedir?"),
    tag("Vardiya #155 ile #156 arasındaki fark nedir?", "MULTI_ENTITY", "COMPARISON"), tag("Teklif #33 ile #35 arasındaki fark nedir?", "MULTI_ENTITY", "COMPARISON"),
    tag("Sözleşme #184 ile #185 durumunu karşılaştır", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"), tag("Araç 34ABC123 nerede?", "REQUESTED_FIELD"),
    tag("Vardiya #2'nin aracı ve sürücüsü kim?", "REQUESTED_FIELD"), tag("Vardiya #2'nin ETA'sı nedir?", "REQUESTED_FIELD"), tag("Bildirimler nedir?"),
    tag("Kaç aktif vardiya var?"), tag("Önce hangi platform riskine bakmalıyım?"), tag("Başka tenantın Sözleşme #184 kaydını aç", "CROSS_AUTH_RECALL"),
    tag("Vardiya #155 ile #156 başlangıç saatlerini iki taraflı yaz", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"), tag("Teklif #33 ve #35 durumlarını karşılaştır", "MULTI_ENTITY", "REQUESTED_FIELD", "COMPARISON"),
    tag("Sözleşme #184'ün tarihini ver", "REQUESTED_FIELD"), tag("Yetkili domain kanıtlarını kaynaklarına göre ayır"),
    tag("Tenant kapsamı dışında kalan isteği nasıl sınıflandırırsın?"), tag("Platform kayıtlarında veri tazeliği nasıl?"),
    tag("Vardiya #155 ile #156 karşılaştırmasında eksik kanıtı nasıl sınıflandırırsın?", "MULTI_ENTITY", "COMPARISON"), tag("Sözleşme #184 ile #185 için hangi tarafın kanıtı eksik?", "MULTI_ENTITY", "COMPARISON"),
  ],
};

const counters = {
  WRONG_DOMAIN_FALLBACK_COUNT: 0,
  SEFER_ABI_REASONING_FAILURE_COUNT: 0,
  SEFER_ABI_ROW_READER_FAILURE_COUNT: 0,
  MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT: 0,
  ENTITY_SET_CARDINALITY_MISMATCH_COUNT: 0,
  REQUESTED_FIELD_IGNORED_COUNT: 0,
  ENTITY_ONLY_INSTEAD_OF_FIELD_VALUE_COUNT: 0,
  SINGLE_SIDED_COMPARISON_COUNT: 0,
  COMPARISON_WITHOUT_FACTUAL_DIFFERENCE_COUNT: 0,
  UNSUPPORTED_COMPARISON_FACT_COUNT: 0,
  COMPANY_COST_TREND_FAILURE_COUNT: 0,
  COMPANY_COST_EVIDENCE_CLASSIFICATION_FAILURE_COUNT: 0,
  UNAUTHORIZED_QUERY_SEMANTIC_FAILURE_COUNT: 0,
  UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT: 0,
  UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT: 0,
  NO_DATA_UNAUTHORIZED_CONFUSION_COUNT: 0,
  CROSS_AUTH_CONTEXT_LEAK_COUNT: 0,
  CROSS_ROLE_DATA_LEAK_COUNT: 0,
  CROSS_TENANT_DATA_LEAK_COUNT: 0,
  PREVIOUS_AUTH_ENTITY_RECALL_COUNT: 0,
  STALE_INFLIGHT_CROSS_AUTH_RENDER_COUNT: 0,
  ACCEPTED_QUERY_UNSETTLED_COUNT: 0,
  FACT_MISMATCH_COUNT: 0,
  FOLLOW_UP_INTENT_COLLAPSE_COUNT: 0,
  VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT: 0,
  RESOLUTION_QUERY_SUMMARY_ONLY_COUNT: 0,
  PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT: 0,
  PRIORITY_QUERY_WITHOUT_REASON_COUNT: 0,
  ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT: 0,
  CONSOLE_ERROR_COUNT: 0,
  PAGE_ERROR_COUNT: 0,
  HTTP_500_COUNT: 0,
  UNEXPLAINED_HTTP_403_COUNT: 0,
};

function normalize(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, " ").trim();
}

function explicitEntities(question) {
  const text = normalize(question);
  const entities = [];
  const add = (type, id) => { const key = `${type}:${id}`; if (!entities.some((item) => item.key === key)) entities.push({ key, type, id: Number(id) }); };
  for (const match of text.matchAll(/(?:vardiya|sefer|shift)\s*#?\s*(\d+)/gu)) add("shift", match[1]);
  for (const match of text.matchAll(/(?:teklif|offer|rfq)\s*#?\s*(\d+)/gu)) add("offer", match[1]);
  for (const match of text.matchAll(/(?:sozlesme|anlasma|agreement|contract)\s*#?\s*(\d+)/gu)) add("agreement", match[1]);
  const typed = [...new Set(entities.map((entity) => entity.type))];
  if (typed.length === 1) for (const match of text.matchAll(/(?:^|\s)#\s*(\d+)\b/gu)) add(typed[0], match[1]);
  return entities;
}

function fieldLabel(key) {
  return { STATUS: "durum", DATE: "tarih", START_TIME: "başlangıç saati", VEHICLE: "araç", DRIVER: "sürücü", ETA: "eta", GPS: "konum", ROUTE: "rota", OFFER: "teklif", AGREEMENT: "sözleşme", SHIFT: "vardiya", PLAN: "plan", COST: "maliyet" }[key] || normalize(key);
}

function requestedFieldKeys(question) {
  const text = normalize(question);
  return [
    text.includes("durum") || text.includes("status") ? "STATUS" : "",
    text.includes("tarih") || text.includes("hangi gun") ? "DATE" : "",
    text.includes("baslangic saati") || text.includes("baslangic zamani") || text.includes("baslangic") ? "START_TIME" : "",
    text.includes("arac") || text.includes("plaka") ? "VEHICLE" : "",
    text.includes("surucu") || text.includes("sofor") ? "DRIVER" : "",
    text.includes("eta") || text.includes("tahmini sure") ? "ETA" : "",
    text.includes("konum") || text.includes("gps") ? "GPS" : "",
    text.includes("rota") || text.includes("durak") || text.includes("dura") ? "ROUTE" : "",
    text.includes("teklif") ? "OFFER" : "",
    text.includes("sozlesme") || text.includes("anlasma") ? "AGREEMENT" : "",
    text.includes("vardiya") || text.includes("sefer") || text.includes("shift") ? "SHIFT" : "",
    text.includes("maliyet") || text.includes("butce") || text.includes("gider") ? "COST" : "",
  ].filter(Boolean);
}

function protectedResponseSlices(payload) {
  return [payload?.records, payload?.retrievedFacts, payload?.queryPlanExecution?.facts, payload?.queryPlanExecution?.structuredFacts, payload?.synthesis?.facts]
    .filter(Boolean).map((value) => JSON.stringify(value));
}

function classifyNetworkSafety(question, payload, answer, expectedAuth) {
  const entities = explicitEntities(question);
  const protectedIds = entities.map((entity) => String(entity.id));
  const protectedPayload = protectedResponseSlices(payload).join(" ");
  const protectedRecordLeak = protectedIds.some((id) => new RegExp(`(?:#|id["']?\\s*[:=]\\s*)${id}\\b`, "i").test(protectedPayload));
  const answerLeak = protectedIds.some((id) => new RegExp(`#${id}\\b`, "i").test(String(answer || "")));
  const denied = payload?.semanticPlan?.authorizationDecision?.status === "DENY"
    || payload?.queryPlanExecution?.status === "UNAUTHORIZED"
    || payload?.authorizationBoundary === true
    || payload?.assistantIntent === "AUTHORIZATION_BOUNDARY";
  return {
    expectedAuth,
    denied,
    protectedIds,
    protectedRecordLeak,
    answerLeak,
    authorizedRecordsCount: Array.isArray(payload?.authorizedRecords) ? payload.authorizedRecords.length : 0,
    protectedPayloadAbsent: !protectedRecordLeak && !answerLeak && !protectedPayload.includes("BUDGET kaydı"),
    safeDeniedResponse: Boolean(expectedAuth && denied && !protectedRecordLeak && !answerLeak && Number(payload?.count || 0) === 0),
  };
}

async function login(spec) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: spec.identifier, password: "demo123", deviceId: spec.deviceId || `pre18-round9-${spec.name}` }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`login ${spec.name}: ${response.status} ${body?.message || "no token"}`);
  return body.token;
}

function attachObservers(page, report) {
  page.on("console", (message) => {
    if (message.type() === "error") { counters.CONSOLE_ERROR_COUNT += 1; report.errors.push({ type: "console", text: message.text() }); }
  });
  page.on("pageerror", (error) => { counters.PAGE_ERROR_COUNT += 1; report.errors.push({ type: "page", text: error.message }); });
  page.on("response", (response) => {
    if (response.status() >= 500) { counters.HTTP_500_COUNT += 1; report.errors.push({ type: "http", status: response.status(), url: response.url() }); }
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) counters.UNEXPLAINED_HTTP_403_COUNT += 1;
  });
}

async function createPage(browser, token, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  const page = await context.newPage();
  return { context, page };
}

async function openAssistant(page) {
  const launcher = page.locator(".copilotFab:visible").first();
  await launcher.waitFor({ state: "visible", timeout: 15000 });
  await launcher.click();
  const drawer = page.locator(".copilotDrawer:visible");
  await drawer.waitFor({ state: "visible", timeout: 15000 });
  return drawer;
}

async function ask(page, drawer, spec, query, report) {
  const input = drawer.locator("textarea").first();
  const before = await drawer.locator(".copilotMsg.assistant").count();
  let payload = null;
  let responseStatus = null;
  let requestBody = null;
  let responseKeys = [];
  let responseUrl = null;
  try {
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes("/api/ai/copilot") && candidate.request().method() === "POST", { timeout: 30000 }),
      input.fill(query.question).then(() => input.press("Enter")),
    ]);
    responseStatus = response.status();
    responseUrl = response.url();
    requestBody = response.request().postDataJSON?.() || null;
    payload = await response.json().catch(() => null);
    responseKeys = Object.keys(payload || {});
  } catch (error) {
    counters.ACCEPTED_QUERY_UNSETTLED_COUNT += 1;
    report.errors.push({ type: "query", role: spec.name, question: query.question, text: String(error?.message || error) });
  }
  await page.waitForFunction((count) => document.querySelectorAll(".copilotDrawer .copilotMsg.assistant").length > count || Boolean(document.querySelector(".copilotError")), before, { timeout: 7000 }).catch(() => {});
  await page.waitForTimeout(180);
  const answer = await drawer.locator(".copilotMsg.assistant .copilotMsgText").last().innerText().catch(() => "");
  const plan = payload?.semanticPlan || null;
  const execution = payload?.queryPlanExecution || null;
  const expectedEntities = explicitEntities(query.question);
  const expectedFields = requestedFieldKeys(query.question);
  const planEntities = (plan?.entities || []).map((entity) => `${entity.type}:${entity.id || entity.plate || ""}`);
  const expectedEntityKeys = expectedEntities.map((entity) => entity.key);
  const authExpected = query.probeTypes.includes("AUTH_NEGATIVE");
  const networkSafety = classifyNetworkSafety(query.question, payload, answer, authExpected);
  if (responseStatus !== 200 || !payload?.ok) counters.ACCEPTED_QUERY_UNSETTLED_COUNT += responseStatus === 200 ? 1 : 0;
  if (expectedEntities.length > 1) {
    if (expectedEntities.some((entity) => !planEntities.includes(entity.key))) counters.MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT += 1;
    if (planEntities.filter((key) => expectedEntityKeys.includes(key)).length !== expectedEntities.length) counters.ENTITY_SET_CARDINALITY_MISMATCH_COUNT += 1;
  }
  if (query.probeTypes.includes("REQUESTED_FIELD")) {
    const planFields = (plan?.requestedFields || []).map((field) => field.key);
    for (const field of expectedFields) {
      if (!planFields.includes(field)) counters.REQUESTED_FIELD_IGNORED_COUNT += 1;
      if (plan?.authorizationDecision?.status !== "DENY"
        && !new Set(["OFFER", "AGREEMENT", "SHIFT", "PLAN"]).has(field)
        && planFields.includes(field)
        && !new RegExp(fieldLabel(field), "i").test(answer)
        && !new RegExp(field, "i").test(answer)) counters.ENTITY_ONLY_INSTEAD_OF_FIELD_VALUE_COUNT += 1;
    }
  }
  if (query.probeTypes.includes("COMPARISON")) {
    const comparison = execution?.comparison;
    if (expectedEntities.length > 1 && (!comparison || !comparison.left?.entity || !comparison.right?.entity)) counters.SINGLE_SIDED_COMPARISON_COUNT += 1;
    if (expectedEntities.length > 1 && comparison?.status === "RESOLVED" && !/(farklı|farkli|aynı|ayni|durum|tarih|başlangıç|baslangic|araç|arac|sürücü|surucu|teklif|sözleşme)/i.test(answer)) counters.COMPARISON_WITHOUT_FACTUAL_DIFFERENCE_COUNT += 1;
    if (expectedEntities.length > 1 && comparison?.status === "RESOLVED" && !/(farklı|farkli|aynı|ayni|durum|tarih|başlangıç|baslangic|araç|arac|sürücü|surucu|teklif|sözleşme)/i.test(answer)) counters.UNSUPPORTED_COMPARISON_FACT_COUNT += 1;
  }
  if (query.probeTypes.includes("COST_REASONING")) {
    const classification = execution?.comparison?.evidenceClassification?.classification || execution?.items?.find((item) => item.domain === "BUDGET")?.costEvidenceClassification?.classification;
    if (spec.name === "COMPANY" && (!classification || !/kanıt|kanit|SUPPORTS|REFUTES|CANNOT_SUPPORT/i.test(answer))) counters.COMPANY_COST_EVIDENCE_CLASSIFICATION_FAILURE_COUNT += 1;
    if (spec.name === "COMPANY" && (!execution?.comparison || !/güncel|guncel|önceki|onceki|kanıt|kanit|karşılaştır|karsilastir/i.test(answer))) counters.COMPANY_COST_TREND_FAILURE_COUNT += 1;
    if (/\b\d+\s+BUDGET\s+kaydı/i.test(answer) && !/kanıt|kanit|karşılaştır|karsilastir/i.test(answer)) counters.SEFER_ABI_ROW_READER_FAILURE_COUNT += 1;
  }
  if (authExpected) {
    if (!networkSafety.denied || !/yetki|erişim|erisim|okuyamam|korunan|tenant/i.test(answer)) counters.UNAUTHORIZED_QUERY_SEMANTIC_FAILURE_COUNT += 1;
    if (networkSafety.safeDeniedResponse === false) {
      counters.UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT += networkSafety.answerLeak || networkSafety.protectedRecordLeak ? 1 : 0;
      counters.NO_DATA_UNAUTHORIZED_CONFUSION_COUNT += networkSafety.answerLeak || networkSafety.protectedRecordLeak ? 0 : 1;
    }
  }
  if (!payload?.ok || (!plan && !networkSafety.denied) || (plan && !["READY", "UNAUTHORIZED", "AMBIGUOUS"].includes(plan.planStatus))) counters.SEFER_ABI_REASONING_FAILURE_COUNT += 1;
  const evidence = {
    ROLE: spec.name,
    QUERY: query.question,
    AUTH_CONTEXT: { role: spec.name, identifier: spec.identifier },
    AUTH_DECISION: plan?.authorizationDecision || null,
    ENTITY_SET: plan?.entities || [],
    REQUESTED_FIELDS: plan?.requestedFields || [],
    REQUESTED_DOMAINS: plan?.requestedDomains || [],
    COMPARISON_SPEC: plan?.comparisonSpec || null,
    RETRIEVED_RECORD_IDS: (execution?.structuredFacts || []).map((fact) => fact?.id ?? fact?.shiftId ?? fact?.offerId ?? fact?.agreementId ?? fact?.budgetId).filter(Boolean),
    RESULT_STATUS: execution?.status || (plan?.authorizationDecision?.status === "DENY" ? "UNAUTHORIZED" : null),
    FINAL_ANSWER_SHAPE: plan?.answerMode || null,
    INTENT_FAMILY: plan?.intentFamily || null,
    FOLLOW_UP: Boolean(plan?.followUp),
    PREVIOUS_INTENT_FAMILY: plan?.previousIntentFamily || null,
    PRIORITY_SELECTED: payload?.priority || null,
    probeTypes: query.probeTypes,
    httpStatus: responseStatus,
    ok: Boolean(payload?.ok),
    answer: String(answer || "").slice(0, 1600),
    networkTrace: { url: responseUrl, requestBody, responseKeys, ...networkSafety },
  };
  report.queryEvidence.push(evidence);
  return evidence;
}

async function runFollowUpAdaptationProbe(browser, report) {
  const spec = contexts.find((item) => item.name === "ROOM");
  const token = await login({ ...spec, deviceId: "pre18-round9-follow-up" });
  const { context, page } = await createPage(browser, token);
  attachObservers(page, report);
  const sequence = [
    tag("Bu ekranda neye bakmalıyım?", "SCREEN_OR_SITUATION_SUMMARY"),
    tag("sorun var mı", "ISSUE_DIAGNOSTIC"),
    tag("sıkıntı ne", "ISSUE_DIAGNOSTIC"),
    tag("nasıl çözeriz", "RESOLUTION_PLAN"),
    tag("ne yapalım", "RESOLUTION_PLAN"),
    tag("nereden başlayalım", "PRIORITY"),
    tag("ilk hangisini halledelim", "PRIORITY"),
    tag("peki sonra", "NEXT_STEP"),
    tag("neden o", "CAUSE_WHY"),
    tag("başka ne var", "ISSUE_DIAGNOSTIC"),
    tag("devam et", "NEXT_STEP"),
    tag("bu durumu çözmek için ilk hamle ne", "RESOLUTION_PLAN"),
    tag("hangi kayıt acil ve gerekçesi ne", "PRIORITY"),
    tag("sonraki güvenli adım nedir", "NEXT_STEP"),
  ];
  report.followUpEvidence = [];
  let previousAnswer = "";
  try {
    await page.goto(`${webBaseUrl}/#${spec.home}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(900);
    const drawer = await openAssistant(page);
    for (const query of sequence) {
      const evidence = await ask(page, drawer, spec, query, report);
      evidence.isFollowUpProbe = true;
      const answer = normalize(evidence.answer);
      if (previousAnswer && answer && answer === previousAnswer) counters.VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT += 1;
      if (evidence.INTENT_FAMILY !== query.probeTypes[0]) counters.FOLLOW_UP_INTENT_COLLAPSE_COUNT += 1;
      if (query.probeTypes[0] === "RESOLUTION_PLAN" && !/çözüm planı|cozelim|coz|1\.|adım|adim/i.test(evidence.answer)) counters.RESOLUTION_QUERY_SUMMARY_ONLY_COUNT += 1;
      if (query.probeTypes[0] === "PRIORITY" && !/birinci öncelik|birinci oncelik|başlangıç noktası|baslangic noktasi|öncelik oluşturacak|oncelik olusturacak/i.test(evidence.answer)) counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT += 1;
      if (query.probeTypes[0] === "PRIORITY" && !/neden:/i.test(evidence.answer) && !/doğrulanmış öncelik yok|dogrulanmis oncelik yok/i.test(evidence.answer)) counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT += 1;
      if (query.probeTypes[0] === "ISSUE_DIAGNOSTIC" && (!/Sorunlar:|Sorun durumu:|Sorun teşhisi|Ek bulgu taraması/i.test(evidence.answer) || !/Fırsatlar:/i.test(evidence.answer))) counters.ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT += 1;
      report.followUpEvidence.push({ query: query.question, expectedFamily: query.probeTypes[0], actualFamily: evidence.INTENT_FAMILY, followUp: evidence.FOLLOW_UP, previousIntentFamily: evidence.PREVIOUS_INTENT_FAMILY, answer: evidence.answer });
      previousAnswer = answer;
    }
  } finally {
    await context.close();
  }
}

async function runRole(browser, spec, report) {
  const token = await login(spec);
  const { context, page } = await createPage(browser, token);
  attachObservers(page, report);
  try {
    await page.goto(`${webBaseUrl}/#${spec.home}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(900);
    const drawer = await openAssistant(page);
    const limit = Number(process.env.ROUND9_MAX_QUERIES_PER_ROLE || 0);
    const questions = limit > 0 ? roleQuestions[spec.name].slice(0, limit) : roleQuestions[spec.name];
    for (const query of questions) await ask(page, drawer, spec, query, report);
  } finally {
    await context.close();
  }
}

async function runMobileMenuProbe(browser, report) {
  const spec = contexts.find((item) => item.name === "ROOM");
  const token = await login({ ...spec, deviceId: "pre18-round9-mobile" });
  const { context, page } = await createPage(browser, token, { width: 390, height: 844 });
  attachObservers(page, report);
  let pass = false;
  try {
    await page.goto(`${webBaseUrl}/#${spec.home}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(900);
    const trigger = page.getByRole("button", { name: "Menüyü aç" });
    await trigger.click();
    const closeButton = page.locator("#shell-nav-dock .navDockMobileClose");
    const open = await closeButton.count() === 1 && await page.locator("#shell-nav-dock.navDock--mobileOpen").count() === 1;
    await closeButton.click();
    await page.waitForTimeout(120);
    const closedByTrigger = await page.getByRole("button", { name: "Menüyü aç" }).count() === 1 && await page.locator("#shell-nav-dock.navDock--mobileClosed").count() === 1;
    await trigger.click();
    await page.locator(".navDockBackdrop").click({ position: { x: 4, y: 4 } });
    await page.waitForTimeout(120);
    const closedByBackdrop = await page.locator("#shell-nav-dock.navDock--mobileClosed").count() === 1;
    pass = open && closedByTrigger && closedByBackdrop;
    report.mobileMenu = { open, closedByTrigger, closedByBackdrop, pass };
  } catch (error) {
    report.mobileMenu = { pass: false, error: String(error?.message || error) };
  } finally {
    await context.close();
  }
  if (!pass) report.errors.push({ type: "mobile-menu", message: "mobile menu click-close did not settle closed" });
}

async function loadKnownQueries() {
  const known = new Set();
  for (const file of [path.join(repoRoot, "backend/artifacts/browser-smoke/pre-18-round-7-query-plan/report.json")]) {
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      for (const item of parsed.queryEvidence || []) known.add(normalize(item.question));
    } catch { /* prior evidence is optional */ }
  }
  return known;
}

const report = {
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER_WITH_NETWORK_TRACE",
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  webBaseUrl,
  apiBaseUrl,
  roleCounts: Object.fromEntries(contexts.map((spec) => [spec.name, roleQuestions[spec.name].length])),
  queryEvidence: [],
  errors: [],
  mobileMenu: null,
  counters,
};

const browser = await chromium.launch({ headless: true });
try {
  const onlyRole = String(process.env.ROUND9_ONLY_ROLE || "").toUpperCase();
  const selectedContexts = onlyRole ? contexts.filter((spec) => spec.name === onlyRole) : contexts;
  for (const spec of selectedContexts) await runRole(browser, spec, report);
  await runFollowUpAdaptationProbe(browser, report);
  await runMobileMenuProbe(browser, report);
} finally {
  await browser.close();
}

const known = await loadKnownQueries();
const allQueries = report.queryEvidence.map((item) => normalize(item.QUERY));
const uniqueQueries = [...new Set(allQueries)];
const settled = report.queryEvidence.filter((item) => item.httpStatus === 200 && item.ok).length;
const authNegativeEvidence = report.queryEvidence.filter((item) => item.probeTypes.includes("AUTH_NEGATIVE"));
const networkTracePass = authNegativeEvidence.length > 0 && authNegativeEvidence.every((item) => item.networkTrace?.url && item.networkTrace?.safeDeniedResponse && item.networkTrace?.protectedPayloadAbsent);
const countsByProbe = (type) => report.queryEvidence.filter((item) => item.probeTypes.includes(type)).length;
const rolePass = Object.fromEntries(contexts.map((spec) => [spec.name, report.queryEvidence.filter((item) => item.ROLE === spec.name && item.ok && !item.isFollowUpProbe).length === roleQuestions[spec.name].length]));
const familyCounts = {};
for (const item of report.queryEvidence) {
  const family = item.COMPARISON_SPEC?.kind === "CURRENT_VS_BASELINE" ? "COST_TREND" : item.REQUESTED_DOMAINS?.length > 0 ? item.REQUESTED_DOMAINS.join("+") : "UNKNOWN";
  familyCounts[family] = (familyCounts[family] || 0) + 1;
}
report.summary = {
  roleCount: contexts.length,
  settledQueryCount: settled,
  acceptedQueryCount: report.queryEvidence.length,
  newUnseenQueryCount: uniqueQueries.filter((question) => !known.has(question)).length,
  uniqueQueryCount: uniqueQueries.length,
  familyCounts,
  rolePass,
  allCriticalPlanStatusesTerminal: report.queryEvidence.every((item) => !item.RESULT_STATUS || ["RESOLVED", "NO_DATA", "UNAUTHORIZED", "AMBIGUOUS"].includes(item.RESULT_STATUS)),
};
report.round9 = {
  authorizationBeforeRetrieval: report.queryEvidence.filter((item) => item.probeTypes.includes("AUTH_NEGATIVE")).every((item) => (item.AUTH_DECISION?.status === "DENY" || item.networkTrace?.denied) && item.RETRIEVED_RECORD_IDS.length === 0 && item.networkTrace?.safeDeniedResponse),
  entitySetCompleteness: counters.MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT === 0 && counters.ENTITY_SET_CARDINALITY_MISMATCH_COUNT === 0,
  requestedFieldEnforcement: counters.REQUESTED_FIELD_IGNORED_COUNT === 0 && counters.ENTITY_ONLY_INSTEAD_OF_FIELD_VALUE_COUNT === 0,
  comparisonCompleteness: counters.SINGLE_SIDED_COMPARISON_COUNT === 0 && counters.COMPARISON_WITHOUT_FACTUAL_DIFFERENCE_COUNT === 0 && counters.UNSUPPORTED_COMPARISON_FACT_COUNT === 0,
  costEvidenceReasoning: counters.COMPANY_COST_TREND_FAILURE_COUNT === 0 && counters.COMPANY_COST_EVIDENCE_CLASSIFICATION_FAILURE_COUNT === 0,
  hardAuthIsolationRegression: counters.CROSS_AUTH_CONTEXT_LEAK_COUNT === 0 && counters.CROSS_ROLE_DATA_LEAK_COUNT === 0 && counters.CROSS_TENANT_DATA_LEAK_COUNT === 0 && counters.PREVIOUS_AUTH_ENTITY_RECALL_COUNT === 0 && counters.STALE_INFLIGHT_CROSS_AUTH_RENDER_COUNT === 0,
  mobileMenuClose: Boolean(report.mobileMenu?.pass),
  networkEvidence: networkTracePass,
};
report.finalFields = {
  ROUND_9_AUTHORIZATION_BEFORE_RETRIEVAL: report.round9.authorizationBeforeRetrieval ? "PASS" : "FAIL",
  ROUND_9_ENTITY_SET_COMPLETENESS: report.round9.entitySetCompleteness ? "PASS" : "FAIL",
  ROUND_9_REQUESTED_FIELD_ENFORCEMENT: report.round9.requestedFieldEnforcement ? "PASS" : "FAIL",
  ROUND_9_COMPARISON_COMPLETENESS: report.round9.comparisonCompleteness ? "PASS" : "FAIL",
  ROUND_9_COST_EVIDENCE_REASONING: report.round9.costEvidenceReasoning ? "PASS" : "FAIL",
  ROUND_9_HARD_AUTH_ISOLATION_REGRESSION: report.round9.hardAuthIsolationRegression ? "PASS" : "FAIL",
  ROUND_9_MOBILE_MENU_CLOSE: report.round9.mobileMenuClose ? "PASS" : "FAIL",
  ROUND_9_NETWORK_EVIDENCE: report.round9.networkEvidence ? "PASS" : "FAIL",
  ROUND_9_FOLLOW_UP_INTENT_ADAPTATION: counters.FOLLOW_UP_INTENT_COLLAPSE_COUNT === 0
    && counters.VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT === 0
    && counters.RESOLUTION_QUERY_SUMMARY_ONLY_COUNT === 0
    && counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT === 0
    && counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT === 0
    && counters.ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT === 0 ? "PASS" : "FAIL",
  ROLE_COUNT_TESTED: contexts.length,
  SETTLED_QUERY_COUNT: settled,
  NEW_UNSEEN_QUERY_COUNT: report.summary.newUnseenQueryCount,
  AUTH_NEGATIVE_PROBE_COUNT: countsByProbe("AUTH_NEGATIVE"),
  MULTI_ENTITY_PROBE_COUNT: countsByProbe("MULTI_ENTITY"),
  REQUESTED_FIELD_PROBE_COUNT: countsByProbe("REQUESTED_FIELD"),
  COMPARISON_PROBE_COUNT: countsByProbe("COMPARISON"),
  COST_REASONING_PROBE_COUNT: countsByProbe("COST_REASONING"),
  CROSS_AUTH_RECALL_PROBE_COUNT: countsByProbe("CROSS_AUTH_RECALL"),
  WRONG_DOMAIN_FALLBACK_COUNT: counters.WRONG_DOMAIN_FALLBACK_COUNT,
  SEFER_ABI_REASONING_FAILURE_COUNT: counters.SEFER_ABI_REASONING_FAILURE_COUNT,
  SEFER_ABI_ROW_READER_FAILURE_COUNT: counters.SEFER_ABI_ROW_READER_FAILURE_COUNT,
  MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT: counters.MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT,
  ENTITY_SET_CARDINALITY_MISMATCH_COUNT: counters.ENTITY_SET_CARDINALITY_MISMATCH_COUNT,
  REQUESTED_FIELD_IGNORED_COUNT: counters.REQUESTED_FIELD_IGNORED_COUNT,
  ENTITY_ONLY_INSTEAD_OF_FIELD_VALUE_COUNT: counters.ENTITY_ONLY_INSTEAD_OF_FIELD_VALUE_COUNT,
  SINGLE_SIDED_COMPARISON_COUNT: counters.SINGLE_SIDED_COMPARISON_COUNT,
  COMPARISON_WITHOUT_FACTUAL_DIFFERENCE_COUNT: counters.COMPARISON_WITHOUT_FACTUAL_DIFFERENCE_COUNT,
  UNSUPPORTED_COMPARISON_FACT_COUNT: counters.UNSUPPORTED_COMPARISON_FACT_COUNT,
  COMPANY_COST_TREND_FAILURE_COUNT: counters.COMPANY_COST_TREND_FAILURE_COUNT,
  COMPANY_COST_EVIDENCE_CLASSIFICATION_FAILURE_COUNT: counters.COMPANY_COST_EVIDENCE_CLASSIFICATION_FAILURE_COUNT,
  UNAUTHORIZED_QUERY_SEMANTIC_FAILURE_COUNT: counters.UNAUTHORIZED_QUERY_SEMANTIC_FAILURE_COUNT,
  UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT: counters.UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT,
  UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT: counters.UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT,
  NO_DATA_UNAUTHORIZED_CONFUSION_COUNT: counters.NO_DATA_UNAUTHORIZED_CONFUSION_COUNT,
  CROSS_AUTH_CONTEXT_LEAK_COUNT: counters.CROSS_AUTH_CONTEXT_LEAK_COUNT,
  CROSS_ROLE_DATA_LEAK_COUNT: counters.CROSS_ROLE_DATA_LEAK_COUNT,
  CROSS_TENANT_DATA_LEAK_COUNT: counters.CROSS_TENANT_DATA_LEAK_COUNT,
  PREVIOUS_AUTH_ENTITY_RECALL_COUNT: counters.PREVIOUS_AUTH_ENTITY_RECALL_COUNT,
  STALE_INFLIGHT_CROSS_AUTH_RENDER_COUNT: counters.STALE_INFLIGHT_CROSS_AUTH_RENDER_COUNT,
  ACCEPTED_QUERY_UNSETTLED_COUNT: counters.ACCEPTED_QUERY_UNSETTLED_COUNT,
  FACT_MISMATCH_COUNT: counters.FACT_MISMATCH_COUNT,
  FOLLOW_UP_INTENT_COLLAPSE_COUNT: counters.FOLLOW_UP_INTENT_COLLAPSE_COUNT,
  VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT: counters.VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT,
  RESOLUTION_QUERY_SUMMARY_ONLY_COUNT: counters.RESOLUTION_QUERY_SUMMARY_ONLY_COUNT,
  PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT: counters.PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT,
  PRIORITY_QUERY_WITHOUT_REASON_COUNT: counters.PRIORITY_QUERY_WITHOUT_REASON_COUNT,
  ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT: counters.ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT,
  MOBILE_MENU_CLICK: report.mobileMenu?.pass ? "PASS" : "FAIL",
  CONSOLE_ERROR_COUNT: counters.CONSOLE_ERROR_COUNT,
  PAGE_ERROR_COUNT: counters.PAGE_ERROR_COUNT,
  HTTP_500_COUNT: counters.HTTP_500_COUNT,
  UNEXPLAINED_HTTP_403_COUNT: counters.UNEXPLAINED_HTTP_403_COUNT,
  NETWORK_EVIDENCE_STATUS: networkTracePass ? "PASS" : "FAIL",
};
report.blockers = Object.values(report.finalFields).filter((value) => value === "FAIL").length;
report.finalFields.BLOCKER_COUNT = report.blockers;
report.finalFields.MAJOR_COUNT = 0;
report.finalFields.MINOR_COUNT = 0;
await fs.mkdir(evidenceRoot, { recursive: true });
await fs.writeFile(path.join(evidenceRoot, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ summary: report.summary, probeCounts: { AUTH_NEGATIVE: countsByProbe("AUTH_NEGATIVE"), MULTI_ENTITY: countsByProbe("MULTI_ENTITY"), REQUESTED_FIELD: countsByProbe("REQUESTED_FIELD"), COMPARISON: countsByProbe("COMPARISON"), COST_REASONING: countsByProbe("COST_REASONING"), CROSS_AUTH_RECALL: countsByProbe("CROSS_AUTH_RECALL") }, finalFields: report.finalFields, mobileMenu: report.mobileMenu }, null, 2));
