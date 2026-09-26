import prisma from "../prisma.js";
import { buildActionableEventsForUser, readActionableCurrentScreenSnapshot } from "./actionableEvents.js";
import { isCurrentSituationDiagnosticQuestion } from "../ai/chat/intentRouter.js";
import { getRoleDomainCapabilities, resolveSemanticIntent } from "../ai/chat/semanticIntentPlanner.js";
import { authorizeSemanticRequest, authorizationBoundaryReply } from "../ai/chat/authorizationGate.js";
import { fieldPrivacyBoundaryReply, resolveFieldPrivacyPolicy } from "../ai/chat/fieldPrivacyPolicy.js";
import { etaMinutes, haversineKm } from "../geo.js";
import { executeSemanticQueryPlan } from "./queryPlanExecutor.js";
import { buildAgreementOpsBridgeById } from "./agreementOpsBridge.js";
import { buildRoleHelpSummary } from "../ai/jobGuide/screenCatalog.js";

// Read-only, role-scoped product awareness. This is intentionally separate
// from actionable-events-v1: the latter summarizes work, while this service
// answers a user's explicit question about an authorized product domain.

const OPEN_OFFER_STATUSES = ["OPEN", "COUNTERED"];
const REVIEW_AGREEMENT_STATUSES = ["REQUESTED", "COUNTERED"];
const ACTIVE_SHIFT_STATUSES = ["DRAFT", "REQUESTED", "APPROVED", "ACTIVE"];
const CURRENT_DRIVER_SHIFT_STATUSES = ["APPROVED", "ACTIVE"];
const ORGANIZATION_PLAN_STATUSES = ["DRAFT", "SHIFT_PUBLISHED", "AGREEMENT_REQUESTED"];

function integer(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
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

function safeVisibleValue(value) {
  if (value === null || value === undefined) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value).trim();
  if (Array.isArray(value)) return "";
  if (typeof value === "object") {
    return [value.label, value.value, value.summary, value.status, value.note, value.text]
      .find((candidate) => ["string", "number", "boolean"].includes(typeof candidate) && String(candidate).trim())
      ? String([value.label, value.value, value.summary, value.status, value.note, value.text]
        .find((candidate) => ["string", "number", "boolean"].includes(typeof candidate) && String(candidate).trim())).trim()
      : "";
  }
  return "";
}

function visibleFragment(value) {
  const text = safeVisibleValue(value).replace(/[{}[\]]/g, "").replace(/\s+/g, " ").trim();
  if (!text || /(?:structuredFacts|liveFacts|copilotSignals|readinessScore|diagnosticPriority|actionSimulation|liveFactConfidence)\s*[:=]/i.test(text)) return "";
  if (/"[^"\n]+"\s*:/u.test(text)) return "";
  return text;
}

function uniqueVisibleFragments(values) {
  const seen = new Set();
  return values.map(visibleFragment).filter((value) => {
    const key = normalize(value).replace(/[^a-z0-9\u00c0-\u024f]+/gi, " ").trim();
    if (!value || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildVisibleFactText(screenContext) {
  if (!screenContext || typeof screenContext !== "object") return "";
  const facts = screenContext.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : screenContext.liveFacts && typeof screenContext.liveFacts === "object"
      ? screenContext.liveFacts
      : {};
  const lead = [
    facts.summary,
    facts.selectedSummary,
    facts.selectedRecordSummary,
    screenContext.selectedSummary,
    screenContext.selectedRecordSummary,
    facts.selectedRecordStatus,
    screenContext.selectedRecordStatus,
    facts.helpContextSummary,
    facts.contextSummary,
    screenContext.helpContextSummary,
    screenContext.contextSummary,
    screenContext.visibleText,
  ].map(visibleFragment).find(Boolean) || "";
  const fallbackFacts = [
    facts.vehiclePlate ? `Araç ${facts.vehiclePlate}` : "",
    facts.plate ? `Plaka ${facts.plate}` : "",
    facts.gpsStatus ? `Konum sinyali: ${safeVisibleValue(facts.gpsStatus)}` : "",
    facts.gpsFreshness ? `Konum güncelliği: ${safeVisibleValue(facts.gpsFreshness)}` : "",
    facts.eta ? `ETA: ${safeVisibleValue(facts.eta)}` : "",
    facts.estimatedArrival ? `Tahmini varış: ${safeVisibleValue(facts.estimatedArrival)}` : "",
    facts.nextStopName ? `Sıradaki durak: ${facts.nextStopName}` : "",
    facts.nextStop ? `Sıradaki durak: ${safeVisibleValue(facts.nextStop)}` : "",
    facts.shiftId ? `Vardiya #${facts.shiftId}` : "",
    facts.status ? `Durum: ${facts.status}` : "",
    facts.readiness ? `Hazırlık: ${facts.readiness}` : "",
    ...(Array.isArray(screenContext.selectedFields) ? screenContext.selectedFields.slice(0, 6).map((row) => `${safeVisibleValue(row?.label)}: ${safeVisibleValue(row?.value)}`) : []),
    ...(Array.isArray(screenContext.selectedBadges) ? screenContext.selectedBadges.slice(0, 6).map((row) => `${safeVisibleValue(row?.label)}: ${safeVisibleValue(row?.value)}`) : []),
    ...(Array.isArray(facts.copilotSignals) ? facts.copilotSignals.slice(0, 6).map((row) => `${safeVisibleValue(row?.label)}: ${safeVisibleValue(row?.value || row?.note)}`) : []),
  ];
  const values = lead ? [lead] : fallbackFacts;
  return uniqueVisibleFragments(values).join(" • ");
}

function normalizeScreenPath(path) {
  return String(path || "").split("?")[0].trim().replace(/^#/, "").replace(/\/+$/, "") || "/";
}

function isRoleHomeScreen(path) {
  return /^\/(?:room|company|school|organization|superadmin|driver|personel|parent)$/iu.test(normalizeScreenPath(path));
}

// The role-home command center is backed by actionable-events-v1. Resolve the
// same read model server-side for CURRENT_SCREEN questions; counters or prose
// supplied by a browser are never authoritative product facts.
export function summarizeAuthorizedCurrentScreenSnapshot({ snapshot, path = "" } = {}) {
  const events = Array.isArray(snapshot?.events) ? snapshot.events : [];
  const byGroup = snapshot?.summary?.byGroup && typeof snapshot.summary.byGroup === "object"
    ? snapshot.summary.byGroup
    : {};
  const counts = {
    critical: Number(byGroup["KRİTİK"] || 0),
    today: Number(byGroup["BUGÜN ÇÖZÜLMELİ"] || 0),
    monitor: Number(byGroup["TAKİP EDİLMELİ"] || 0),
    opportunity: Number(byGroup.FIRSAT || 0),
  };
  const zeroState = events.length === 0 && Object.values(counts).every((value) => value === 0);
  return {
    available: true,
    path,
    source: snapshot?.source || "actionable-events-v1",
    zeroState,
    counts,
    visibleText: `Kritik: ${counts.critical} Bugün çözülmeli: ${counts.today} Takip edilmeli: ${counts.monitor} Fırsat: ${counts.opportunity}${zeroState ? " Şu an açık bir sorun veya fırsat görünmüyor." : ""}`,
  };
}

async function resolveAuthorizedCurrentScreenTruth({ user, screenContext } = {}) {
  const path = normalizeScreenPath(screenContext?.path);
  if (!isRoleHomeScreen(path)) return null;
  // The visible role home consumes actionable-events with the authenticated
  // session's persisted role shape.  Sefer Abi enriches COMPANY users with a
  // company kind for authorization, which is correct for record access but
  // must not turn a current-screen zero state into a different role-global
  // command-center summary.  Use the same server-owned UI read identity here;
  // this changes semantic relevance only, never authorization.
  const uiReadUser = String(user?.role || "").toUpperCase() === "COMPANY"
    && ["SCHOOL", "ORGANIZATION"].includes(String(user?.companyKind || "").toUpperCase())
    ? { ...user, companyKind: null }
    : user;
  try {
    const summary = summarizeAuthorizedCurrentScreenSnapshot({
      snapshot: await readActionableCurrentScreenSnapshot({ user: uiReadUser, path }),
      path,
    });
    return { ...summary, source: `${summary.source}:ui-current-screen-scope` };
  } catch {
    return { available: false, path, source: "actionable-events-unavailable" };
  }
}

function roleKey(user) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "COMPANY") {
    const kind = String(user?.companyKind || "COMPANY").toUpperCase();
    if (["SCHOOL", "ORGANIZATION"].includes(kind)) return kind;
  }
  return role;
}

function dayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function temporalWhere(mode) {
  const { start, end } = dayWindow();
  const now = new Date();
  switch (String(mode || "UNKNOWN").toUpperCase()) {
    case "ACTIVE_NOW":
      return { startAt: { lte: now }, endAt: { gte: now }, status: { in: ACTIVE_SHIFT_STATUSES } };
    case "ACTIVE_TODAY":
      return { startAt: { lt: end }, endAt: { gte: start }, status: { in: ACTIVE_SHIFT_STATUSES } };
    case "UPCOMING":
      return { startAt: { gt: now }, status: { in: ACTIVE_SHIFT_STATUSES } };
    case "PENDING":
      return { status: { in: ["REQUESTED", "DRAFT"] } };
    case "COMPLETED":
      return { status: "DONE" };
    case "HISTORICAL":
      return { endAt: { lt: now } };
    case "ARCHIVED":
      return { status: "ARCHIVED" };
    default:
      return { startAt: { lt: end }, endAt: { gte: start }, status: { in: ACTIVE_SHIFT_STATUSES } };
  }
}

function temporalState(startAt, endAt, status) {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const now = new Date();
  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return "UNKNOWN";
  if (end.getTime() < now.getTime()) return String(status || "").toUpperCase() === "DONE" ? "COMPLETED" : "HISTORICAL";
  if (start.getTime() > now.getTime()) return "UPCOMING";
  if (["APPROVED", "ACTIVE", "REQUESTED", "DRAFT"].includes(String(status || "").toUpperCase())) return "ACTIVE_TODAY";
  if (String(status || "").toUpperCase() === "DONE") return "COMPLETED";
  return "UNKNOWN";
}

function temporalLabel(value) {
  return {
    ACTIVE_TODAY: "Bugün aktif",
    UPCOMING: "Yaklaşan",
    COMPLETED: "Tamamlandı",
    HISTORICAL: "Geçmiş kayıt",
    UNKNOWN: "Zaman durumu doğrulanamadı",
  }[String(value || "").toUpperCase()] || "Zaman durumu doğrulanamadı";
}

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function domainForQuestion(message, role = "") {
  const text = normalize(message);
  if (!text) return "";
  if (/(bildirim|notification|son gelism|son gelisim)/.test(text)) return "NOTIFICATIONS";
  if (["PERSONEL", "PARENT"].includes(role) && /(?:bekleyen|acik|açık).*(?:servis\s+talebi|talep)|servis\s+talebim|talebim\s+ne\s+durumda/.test(text)) return "SERVICE_REQUESTS";
  if (/(mutabakat|fatura|hakedis|hak edis|finans|odeme|tahsilat)/.test(text)) return "FINANCE";
  if (/(maliyet|butce|sapma|karli|karlilik|profit|gelir)/.test(text)) return "BUDGET";
  if (/(teklif|rfq|talep|cevap bekleyen)/.test(text)) return "OFFERS";
  if (/(bekleyen sozlesme|sozlesme|anlasma|agreement|contract)/.test(text)) return "AGREEMENTS";
  if (role === "ORGANIZATION" && /(organizasyon\s+plan|planlar|planim|planlarim|plan\s+durumu|mevcut\s+plan|gezi\s+plani|gezi\s+planı)/.test(text)) return "ORGANIZATION_PLANS";
  if (/(atanmamis vardiya|bugunku vardiya|bugun.*vardiya|vardiyalari ozetle|vardiya|shift)/.test(text)) return "SHIFTS";
  if (["SCHOOL", "ORGANIZATION"].includes(role) && /(veli|parent|servis plani|planlar|planim|konum.*sorun|surucu.*sorun|sorun.*surucu|gps)/.test(text)) return "OPERATIONS";
  if (["PERSONEL", "PARENT", "DRIVER"].includes(role) && /(servis|hangi arac|hangi surucu|eta|tahmini sure|kac durak|neden sure|bir sorun|sorun var|konum|surucu)/.test(text)) return "OPERATIONS";
  if (/(araclarda sorun|arac.*sorun|araclar|arac say|vehicle)/.test(text)) return "VEHICLES";
  if (/(surucu|driver)/.test(text)) return "DRIVERS";
  if (["SCHOOL", "ORGANIZATION"].includes(role) && /(servis durumu|bugunku operasyon|operasyonum|konum durum|canli takip)/.test(text)) return "OPERATIONS";
  if (/(personel|ogrenci|cocuk|servisim|kendi servis)/.test(text)) return "PERSONNEL";
  if (/(rota|durak|gps|konum|canli takip|operasyon|dispatch|gecik|risk)/.test(text)) return "OPERATIONS";
  return "";
}

function domainLabel(domain) {
  return {
    OFFERS: "teklif",
    AGREEMENTS: "sözleşme",
    SHIFTS: "vardiya",
    VEHICLES: "araç",
    DRIVERS: "sürücü",
    PERSONNEL: "personel/öğrenci",
    BUDGET: "bütçe ve maliyet",
    FINANCE: "mutabakat ve mali önizleme",
    NOTIFICATIONS: "bildirim",
    OPERATIONS: "operasyon",
    SERVICE_REQUESTS: "servis talebi",
    ORGANIZATION_PLANS: "organizasyon planı",
    TENANT_ACCESS: "tenant erişim",
    MULTI_DOMAIN: "ürün durumu",
  }[domain] || "kayıt";
}

const NAVIGATION_SCREEN_LABEL_BY_DOMAIN = Object.freeze({
  AGREEMENTS: "Sözleşmeler",
  SHIFTS: "Vardiyalar",
  OFFERS: "Teklifler",
  BUDGET: "Bütçe ve Servis Maliyeti",
  FINANCE: "Bütçe ve Servis Maliyeti",
  NOTIFICATIONS: "Bildirimler",
  OPERATIONS: "Operasyon Merkezi",
  ORGANIZATION_PLANS: "Yer Planları",
});

function workflowGuidancePlan(semanticPlan) {
  if (semanticPlan?.family === "UI_GUIDANCE") return semanticPlan;
  if (semanticPlan?.family === "CONTINUE_CURRENT_REASONING" && semanticPlan?.continuationBasePlan?.family === "UI_GUIDANCE") {
    return semanticPlan.continuationBasePlan;
  }
  return null;
}

function authorizedNavigationTarget(user, semanticPlan, screenContext = null) {
  const workflowPlan = workflowGuidancePlan(semanticPlan);
  if (!workflowPlan) return null;
  const role = String(user?.role || "").toUpperCase();
  const companyKind = String(user?.companyKind || "").toUpperCase();
  const roleKey = role === "COMPANY" && ["SCHOOL", "ORGANIZATION"].includes(companyKind) ? companyKind : role;
  const roleScreens = buildRoleHelpSummary(user).screens;
  const currentPath = normalizeScreenPath(screenContext?.path);
  const currentScreen = roleScreens.find((screen) => normalizeScreenPath(screen.path) === currentPath) || null;
  const isContinuation = semanticPlan?.family === "CONTINUE_CURRENT_REASONING";
  // Once the user has safely moved into a related authorized surface, a
  // continuation must consume that live screen as the current target. Do not
  // replay the original CREATE_SHIFT home route as if the user were still
  // there. The screen catalog remains the authorization source.
  if (isContinuation
    && currentScreen
    && workflowPlan.requestedDomains?.includes("SHIFTS")
    && currentScreen.label === "Vardiyalar") {
    return currentScreen;
  }
  if (workflowPlan.workflowIntent === "OPEN_SHIFT_SURFACE") {
    return roleScreens.find((screen) => screen.label === "Vardiyalar") || null;
  }
  if (workflowPlan.workflowIntent === "OPEN_OFFER_SURFACE") {
    return roleScreens.find((screen) => screen.label === "Teklifler")
      || roleScreens.find((screen) => screen.label === "Ticari Akışım")
      || null;
  }
  if (workflowPlan.workflowIntent === "CREATE_SHIFT") {
    const preferredPaths = roleKey === "ROOM"
      ? ["/room/shifts"]
      : roleKey === "SUPER_ADMIN"
        ? ["/superadmin/operations", "/superadmin"]
        : roleKey === "SCHOOL"
          ? ["/school"]
          : roleKey === "ORGANIZATION"
            ? ["/organization"]
            : ["/company"];
    return preferredPaths.map((path) => roleScreens.find((screen) => screen.path === path)).find(Boolean) || null;
  }
  const domains = Array.isArray(workflowPlan?.requestedDomains) ? workflowPlan.requestedDomains : [];
  const label = NAVIGATION_SCREEN_LABEL_BY_DOMAIN[domains[0]];
  if (!label) return null;
  return roleScreens.find((screen) => screen.label === label) || null;
}

function isReasoningQuestion(message) {
  const text = normalize(message);
  return isCurrentSituationDiagnosticQuestion(text)
    || /bugun.*(?:neye dikkat|neye bak|neye bakcam|en kritik mesele|en onemli mesele|neler oluyor|ozeti|ozetle|toparla)|en onemli sorun|en onemli platform riski|platform riski|sistem riski|en acil|en onemli|isler nasil gidiyor|genel durum|nerede risk|su an ne yapmam|simdi ne yapmam|onceligim ne|oncelik siras|hepsini toparla|kisa(?:ca)? toparla|noluyo burada|ne oluyor burada|baska bi sorun|baska bir sorun|hangisi daha mantikli|bu teklif mantikli mi|hangisini secmeliyim|neden maliyet artt|maliyet artti mi|operasyonda neden sorun|sorun ne|sorunlar neler|sorun var mi|ne sorun var|risk var mi|ne ters gidiyor|once hangisini cozelim|once hangisini cozeyim|once hangisini cozmeliyim|once neyi cozmeli|once neyi cozmaliyim|once neye el atayim|en acil olan hangisi|ilk neye bakayim|ilk neye bakmam|ilk neye bakcam|hangisi daha onemli|once ne yapmam lazim|sonra ne yapayim|peki sonra ne yapayim|peki once ne yapayim|abi once neyi halledeyim|neden\??|bunun sebebi ne|neden boyle oldu|firsat var mi|firsatlari sirala|siradaki dogru islem|siradaki islem|bekleyen isler|ilgilenmem gereken/.test(text);
}

function isComparisonQuestion(message) {
  const text = normalize(message);
  return /hangisi daha|hangisini sec|a mi b mi|bu teklif.*mantikli|bu maliyet.*normal|maliyet artti mi|maliyet.*artti|karsilastir|daha iyi/.test(text);
}

function isBudgetComparisonQuestion(message) {
  return /(maliyet|butce|sapma|gider).*(art|yuksel|fazla|karsilastir)|art.*maliyet|maliyet artti/.test(normalize(message));
}

function isPlatformRiskQuestion(message, role) {
  return role === "SUPER_ADMIN" && /(platform riski|sistem riski|tenant riski|en onemli platform|platformda en onemli)/.test(normalize(message));
}

function isUnauthorizedCommercialQuestion(message, role) {
  if (!["SCHOOL", "ORGANIZATION"].includes(role)) return false;
  return /(teklif|rfq|ticari|fiyat|maliyet|sözleşme|sozlesme|anlaşma|anlasma|contract|agreement)/.test(normalize(message));
}

function roleIssueSummary(role, snapshot, vehicleIssues, shiftSnapshot) {
  const events = Array.isArray(snapshot?.events) ? snapshot.events : [];
  const priorities = [];
  const critical = events.filter((row) => row.group === "KRİTİK");
  const approvals = events.filter((row) => row.group === "BUGÜN ÇÖZÜLMELİ");
  const opportunities = events.filter((row) => row.group === "FIRSAT");
  if (vehicleIssues?.count > 0) priorities.push(`1. Aktif operasyon önceliği: ${vehicleIssues.count} yetkili araçta konum bilgisi güncel değil. Güncel konum alınamadığı için canlı takip ve tahmini süre güvenilir biçimde doğrulanamıyor; önce cihaz/GPS bağlantısını kontrol et.`);
  if (critical.length) priorities.push(`${priorities.length + 1}. Operasyon önceliği: ${critical[0].title}. Bu kayıt sahaya devam etmeden önce tamamlanması gereken bir eksik gösteriyor.`);
  if (approvals.length) priorities.push(`${priorities.length + 1}. Karar önceliği: ${approvals[0].title}. Operasyon veya mali akış bu karara bağlı olabilir.`);
  if (opportunities.length) priorities.push(`${priorities.length + 1}. Ticari fırsat: ${opportunities[0].title}. Karar vermeden önce ilgili kayıtları karşılaştır.`);
  if (shiftSnapshot?.count > 0 && !critical.length) priorities.push(`${priorities.length + 1}. Günlük durum: ${shiftSnapshot.count} yetkili vardiya kaydı var; araç, sürücü ve durak bağlarını birlikte kontrol et.`);
  if (!priorities.length) priorities.push("1. Yetkili güncel kayıtlarda öncelik gerektiren açık bir sorun görünmüyor; yeni gelişmeleri izlemeye devam et.");
  return priorities.slice(0, 5);
}

function requiresVehicleSignalForPlan(plan, screenContext) {
  const path = String(screenContext?.path || plan?.screenContext?.path || "").toLowerCase();
  const fields = Array.isArray(plan?.requestedFields) ? plan.requestedFields.map((field) => String(field?.key || field)) : [];
  const entities = Array.isArray(plan?.entities) ? plan.entities : plan?.entity ? [plan.entity] : [];
  if (entities.some((entity) => ["vehicle", "driver"].includes(entity?.type))) return true;
  if (fields.some((field) => ["GPS", "ETA", "VEHICLE", "ROUTE", "DRIVER"].includes(field))) return true;
  if (["LOCATION_GPS", "ETA"].includes(String(plan?.family || ""))) return true;
  // Vehicle health is screen-scoped evidence, not a global default for a
  // role home, plan, commercial or people screen.
  return /\/(?:map|live|vehicles|operation-health|route|today)\b/.test(path);
}

function buildReasoningTaskModel({ actionable, vehicleIssues, shiftSnapshot, offers, agreements, finance, preferShift = false }) {
  const events = Array.isArray(actionable?.events) ? actionable.events : [];
  const problems = [];
  const opportunities = [];
  const information = [];
  if (preferShift && Array.isArray(shiftSnapshot?.facts) && shiftSnapshot.facts.length) {
    const candidate = shiftSnapshot.facts.find((fact) => fact?.shiftId || fact?.id);
    if (candidate) {
      const shiftLabel = `Vardiya #${candidate.shiftId || candidate.id}`;
      const reason = candidate.reason || [
        candidate.statusText || statusText(candidate.status),
        candidate.vehiclePlate ? `Araç ${candidate.vehiclePlate}` : "Araç ataması eksik",
        candidate.driverName ? `Sürücü ${candidate.driverName}` : "Sürücü ataması eksik",
      ].filter(Boolean).join(" • ");
      problems.push({
        kind: "PROBLEM",
        title: shiftLabel,
        reason: `İlk kontrol adayı bu yetkili vardiya; ${reason}.`,
        next: `${shiftLabel} kaydını açıp araç, sürücü ve başlangıç kanıtını birlikte doğrula.`,
      });
    }
  }
  if (Number(vehicleIssues?.count || 0) > 0) {
    problems.push({
      kind: "PROBLEM",
      title: `${vehicleIssues.count} araçta konum/GPS güncel değil`,
      reason: "Güncel konum alınamadığı için canlı takip ve ETA güvenilir değil.",
      next: "Araç cihazı ve GPS bağlantısını kontrol et; ardından konumu yenile.",
    });
  }
  for (const event of events) {
    const title = String(event?.title || event?.description || "Yetkili operasyon bulgusu").trim();
    const group = String(event?.group || "").toUpperCase();
    if (["KRİTİK", "BUGÜN ÇÖZÜLMELİ", "KRITIK"].includes(group)) {
      problems.push({ kind: "PROBLEM", title, reason: "Bu bulgu operasyonun devamı veya karar akışı için tamamlanması gereken bir eksik gösteriyor.", next: "Kaydı açıp eksik bağın kaynağını doğrula." });
    } else if (group === "FIRSAT") {
      opportunities.push({ kind: "OPPORTUNITY", title, reason: "Bu bir sorun değil; karar verilmeden önce değerlendirilecek fırsat sinyali.", next: "Bağlı kayıt ve kapasite koşullarını karşılaştır." });
    } else if (title) {
      information.push({ kind: "INFORMATION", title, reason: "Bu mevcut durum bilgisidir; tek başına sorun olarak sınıflandırılmadı." });
    }
  }
  if (Number(shiftSnapshot?.count || 0) > 0) information.push({ kind: "INFORMATION", title: `${shiftSnapshot.count} yetkili vardiya kaydı`, reason: "Bu operasyon kapsamını gösterir; tek başına sorun değildir." });
  if (Number(offers?.count || 0) > 0) information.push({ kind: "INFORMATION", title: `${offers.count} yetkili teklif kaydı`, reason: "Teklif varlığı bilgi sinyalidir; karşılaştırma yapılmadan sorun sayılmaz." });
  if (Number(agreements?.count || 0) > 0) information.push({ kind: "INFORMATION", title: `${agreements.count} yetkili sözleşme inceleme kaydı`, reason: "İnceleme kuyruğudur; aciliyet ayrıca doğrulanır." });
  if (Number(finance?.count || 0) > 0) information.push({ kind: "INFORMATION", title: `${finance.count} yetkili mali önizleme kaydı`, reason: "Mali kayıt varlığıdır; karşılaştırılabilir çift olmadan trend kanıtı değildir." });
  const risks = problems.map((item, index) => {
    const text = normalize(`${item.title} ${item.reason}`);
    const gpsRisk = /gps|konum|offline|cevrim disi|guncel degil/.test(text);
    const missingBinding = /eksik|atanmas|bag/.test(text);
    const missingBindingImpact = /sozlesme|inceleme/.test(text)
      ? "Sözleşme incelemesi tamamlanmazsa operasyonun ilerlemesi ve karar süreci gecikebilir."
      : "Eksik bağlantı tamamlanmazsa operasyonun ilerlemesi ve karar süreci gecikebilir.";
    return {
      ...item,
      severity: gpsRisk ? "KRİTİK" : missingBinding ? "YÜKSEK" : index === 0 ? "YÜKSEK" : "ORTA",
      impact: gpsRisk ? "Canlı takip ve tahmini varış zamanı güvenilirliği etkilenir." : missingBinding ? missingBindingImpact : "İlgili kayıt tamamlanmadan operasyon doğrulaması eksik kalır.",
      urgency: gpsRisk || missingBinding ? "HEMEN" : "KONTROLLÜ İNCELEME",
      evidence: item.reason,
      riskOrder: gpsRisk ? 0 : missingBinding ? 1 : 2,
    };
  }).sort((left, right) => left.riskOrder - right.riskOrder);
  const primary = problems[0] || opportunities[0] || null;
  const resolutionSteps = primary
    ? [
      `1. ${primary.title} kaydını aç ve yetkili kanıtını doğrula.`,
      `2. ${primary.next || "Eksik bağı veya kaynağı kontrol et."}`,
      "3. Düzeltme sonrası aynı kaydı yeniden okuyup operasyon etkisini doğrula; yazma işlemini açık onay olmadan başlatma.",
    ]
    : [
      "1. Yetkili canlı kayıtlar içinde yeni bir problem sinyali oluşup oluşmadığını kontrol et.",
      "2. Sorun doğrulanırsa ilgili kaydı ve eksik bağı aç.",
      "3. Kanıt oluşmadan veri değiştirme veya başka kaydı ikame etme.",
    ];
  return { problems, risks, opportunities, information, primary, resolutionSteps };
}

function factBridgeForReasoning({ offers, agreements, shiftSnapshot, vehicleIssues, finance }) {
  return [
    offers.count ? `${offers.count} teklif kaydı` : "",
    agreements.count ? `${agreements.count} sözleşme inceleme kaydı` : "",
    shiftSnapshot.count ? `${shiftSnapshot.count} bugünkü vardiya kaydı` : "",
    vehicleIssues.count ? `${vehicleIssues.count} araçta güncel olmayan konum` : "",
    finance.count ? `${finance.count} mali önizleme kaydı` : "",
  ].filter(Boolean).join(", ");
}

function roleActionContext(role) {
  return {
    SUPER_ADMIN: "Tenantlar arası salt-okunur kapsamda yalnızca yetkili kaydı doğrula.",
    ROOM: "Oda operasyonundaki yetkili kaydı ve bağlı saha kanıtını kontrol et.",
    COMPANY: "Şirket operasyonundaki yetkili kaydı ve bağlı araç/sürücü kanıtını kontrol et.",
    SCHOOL: "Okul servis akışındaki yetkili kayıt ve öğrenci-servis bağını kontrol et.",
    ORGANIZATION: "Organizasyon planı ile bağlı vardiya kanıtını kontrol et.",
    DRIVER: "Kendi görev, rota ve konum kaydındaki kanıtı kontrol et.",
    PERSONEL: "Kendi servis veya vardiya bağındaki yetkili kaydı kontrol et.",
    PARENT: "Çocuğunuzun yetkili servis kaydı ve konum bağını kontrol et.",
  }[role] || "Mevcut yetkili ürün kaydındaki kanıtı kontrol et.";
}

function reasoningTaskReply(family, model, selectedFacts, taskVariant = family, role = "") {
  const problemText = model.problems.length ? model.problems.map((item) => `• ${item.title} — ${item.reason}`).join(" ") : "Doğrulanmış açık sorun görünmüyor.";
  const opportunityText = model.opportunities.length ? model.opportunities.map((item) => `• ${item.title} — ${item.reason}`).join(" ") : "Doğrulanmış fırsat sinyali yok.";
  const informationText = model.information.length ? model.information.slice(0, 4).map((item) => `• ${item.title}`).join(" ") : "Ek bilgi sinyali yok.";
  if (family === "SCREEN_OR_SITUATION_SUMMARY") {
    const focus = model.problems[0]
      ? `Önce ${model.problems[0].title} konusuna bak. Neden: ${model.problems[0].reason} Hemen sonraki güvenli adım: ${model.problems[0].next}`
      : "Önce yetkili canlı kanıtı ve seçili kaydın durumunu doğrula; doğrulanmış sorun yoksa işlem başlatma.";
    const secondary = uniqueVisibleFragments([
      ...(model.problems.length ? model.problems.slice(1, 3).map((item) => `${item.title}: ${item.reason}`) : [selectedFacts]),
      ...model.information.slice(0, 2).map((item) => item.title),
    ]).slice(0, 3).join(" • ");
    return `${focus}${secondary ? ` Diğer önemli sinyaller: ${secondary}.` : ""}`;
  }
  if (family === "ISSUE_DIAGNOSTIC") {
    if (taskVariant === "ISSUE_PRESENCE") return `Sorun durumu: ${model.problems.length ? `${model.problems.length} doğrulanmış sorun var. ${problemText}` : "doğrulanmış açık sorun yok."} Fırsat ve bilgi sinyallerini sorun olarak saymıyorum. Fırsatlar: ${opportunityText}`;
    if (taskVariant === "ADDITIONAL_ISSUES") return `Ek bulgu taraması: İlk sorun listesinden ayrı olarak kontrol edilen kayıtlar şunlar: ${problemText} Fırsatlar: ${opportunityText} Bilgi: ${informationText}`;
    return `Sorun teşhisi — Sorunlar: ${problemText} Fırsatlar: ${opportunityText} Bilgi: ${informationText}`;
  }
  if (family === "RESOLUTION_PLAN") {
    if (taskVariant === "ACTION_DECISION") return `Uygulanacak karar: 1. önce ${model.primary?.next || "yetkili kaydı açıp eksik bağı doğrula"}. 2. sonucu yeniden okuyup bir sonraki adımı belirle. 3. kanıt oluşmadan veri değiştirme veya başka kaydı ikame etme; otomatik yazma işlemi başlatmıyorum.`;
    return `Çözüm planı: ${model.resolutionSteps.join(" ")} Sorun ile fırsatı aynı işlem olarak birleştirmiyorum.`;
  }
  if (family === "PRIORITY") {
    const primary = model.primary;
    const label = taskVariant === "STARTING_POINT" ? "Başlangıç noktası" : "Birinci öncelik";
    return primary
      ? `${label}: ${primary.title}. Neden: ${primary.reason} Sonraki güvenli adım: ${primary.next || "ilgili yetkili kaydı yeniden doğrula"}. Diğer kayıtlar bundan sonra değerlendirilir.`
      : "Birinci öncelik: yeni canlı kanıt veya açık kayıt oluşup oluşmadığını kontrol et. Neden: doğrulanmış sorun yok; önce yeni kanıtı ayırmak gerekiyor. Sonraki güvenli adım: ekranın güncel yetkili göstergelerini yeniden kontrol et.";
  }
  if (family === "NEXT_STEP") {
    const primary = model.primary;
    if (taskVariant === "CONTINUATION") {
      if (!primary) {
        return "Devam adımı: Yetkili kaydı yeniden okuyup yeni bir sorun kanıtı oluşup oluşmadığını kontrol et. Yeni kanıt yoksa işlem başlatma; değişen bir durum varsa ilgili kayda dönüp etkisini doğrula.";
      }
      const followUpCheck = primary.next || "İlgili yetkili kaydı açıp eksik bağı doğrula.";
      return `Devam adımı: ${followUpCheck} Ardından aynı kaydı yeniden okuyup etkisinin giderildiğini doğrula; kanıt güncellenmeden sonraki kayda geçme.`;
    }
    const lead = taskVariant === "CONTINUATION" ? "Devam adımı" : "Hemen sonraki güvenli adım";
    return primary
      ? `${lead}: ${primary.next || "İlgili yetkili kaydı açıp eksik bağı doğrula."} ${roleActionContext(role)} Bu adım tamamlanmadan sonraki kayda geçmiyorum.`
      : `${lead}: yetkili canlı durumu yeniden kontrol etmek; doğrulanmış sorun yoksa işlem başlatmamak. ${roleActionContext(role)}`;
  }
  if (family === "CAUSE_WHY") {
    const primary = model.primary;
    if (taskVariant === "IMPACT") {
      return primary
        ? `Etkisi: ${primary.impact || primary.reason}. Bu nedenle ${primary.next || "ilgili yetkili kaydı yeniden doğrulamak"} gerekir.`
        : "Etkisini doğrulayacak yetkili bir sorun kaydı yok; önce ilgili kaydı ve kanıtını netleştirmek gerekir.";
    }
    return primary ? `Seçilen önceliğin nedeni: ${primary.reason}` : "Bu seçim için doğrulanmış bir sorun nedeni yok; önce sorunu kanıtlayan kaydı ayırmak gerekir.";
  }
  if (family === "RISK_RANKING") {
    if (!model.risks.length) return "Risk sıralaması: doğrulanmış risk yok. Fırsat ve bilgi sinyallerini risk olarak saymadım; yeni kanıt oluşursa yeniden sıralayabilirim.";
    const asSentenceFragment = (value) => String(value || "").trim().replace(/[.!?;:]+$/gu, "");
    const ranking = model.risks.slice(0, 5).map((risk, index) => [
      `${index + 1}. ${asSentenceFragment(risk.title)}.`,
      `Şiddet: ${asSentenceFragment(risk.severity)}.`,
      `Etki: ${asSentenceFragment(risk.impact)}.`,
      `Aciliyet: ${asSentenceFragment(risk.urgency)}.`,
      `Kanıt: ${asSentenceFragment(risk.evidence)}.`,
    ].join(" ")).join(" ");
    return `Risk sıralaması: ${ranking} Fırsat ve bilgi sinyalleri bu sıralamaya dahil edilmedi.`;
  }
  return "";
}

function appendReasoningTaskSlots(reply, plan, model) {
  const slots = [...new Set([
    ...(Array.isArray(plan?.requestedTaskSlots) ? plan.requestedTaskSlots : []),
    ...(Array.isArray(plan?.requiredOutputSlots) ? plan.requiredOutputSlots : []),
    ...(Array.isArray(plan?.typedRequest?.requiredOutputSlots) ? plan.typedRequest.requiredOutputSlots : []),
  ])];
  if (!slots.length) return reply;
  const parts = [reply];
  const primaryRisk = model?.risks?.[0] || null;
  const primary = model?.primary || primaryRisk || null;
  const orderRequested = slots.some((slot) => ["PRIORITY", "WINNER_OR_ORDER", "ORDER_DECISION"].includes(slot));
  const reasonRequested = slots.includes("REASON");
  if (orderRequested && !/(?:birinci\s+oncelik|başlangıç\s+noktası|once\s+|önce\s+)/iu.test(String(reply || ""))) {
    parts.push(primary ? `Öncelik sırası: önce ${primary.title || "doğrulanmış en güçlü sinyal"}.` : "Öncelik sırası için doğrulanmış fark yok; keyfi bir kazanan belirlemiyorum.");
  }
  if (reasonRequested && !/(?:neden|gerekçe|gerekce)\s*:/iu.test(String(reply || ""))) {
    parts.push(`Gerekçe: ${primary?.reason || primary?.evidence || "öncelik ayrımı için doğrulanmış kanıt yetersiz."}`);
  }
  if (slots.includes("RISK")) {
    parts.push(`Risk: ${primaryRisk ? `${primaryRisk.title} — ${primaryRisk.impact}` : "Doğrulanmış risk görünmüyor."}`);
  }
  if (slots.includes("EVIDENCE")) {
    parts.push(`Kanıt: ${primaryRisk?.evidence || model?.primary?.reason || "Yetkili kanıt bulunamadı; varsayım yapmıyorum."}`);
  }
  if (slots.includes("IMPACT")) {
    parts.push(`Etki: ${primaryRisk?.impact || model?.primary?.impact || model?.primary?.reason || "Doğrulanmış etki kaydı bulunamadı."}`);
  }
  if ((slots.includes("NEXT_STEP") || slots.includes("SAFE_NEXT_STEP")) && !/sonraki güvenli adım|hemen sonraki güvenli adım|devam adımı|devam adimi/i.test(reply)) {
    parts.push(`Sonraki güvenli adım: ${model?.primary?.next || "Yetkili canlı durumu yeniden kontrol et."}`);
  }
  return parts.join(" ");
}

const AUTHORIZATION_SAFE_TASK_FAMILIES = new Set(["NEXT_STEP", "NEXT_BEST_ACTION", "PRIORITY", "PRIORITY_ACTION"]);

function isAuthorizationSafeTaskPlan(plan) {
  return AUTHORIZATION_SAFE_TASK_FAMILIES.has(String(plan?.family || "").toUpperCase()) && !plan?.crossTenantRequested;
}

function authorizationBoundarySemanticPlan(plan, authorizationDecision) {
  if (isAuthorizationSafeTaskPlan(plan)) {
    return {
      ...plan,
      planStatus: "UNAUTHORIZED",
      authorizationBoundary: true,
      authorizationDecision,
    };
  }
  return {
    ...plan,
    family: "AUTHORIZATION_BOUNDARY",
    intentFamily: "AUTHORIZATION_BOUNDARY",
    planStatus: "UNAUTHORIZED",
    authorizationDecision,
  };
}

function authorizationBoundaryTaskReply({ plan, decision, user }) {
  const boundary = authorizationBoundaryReply(decision);
  if (!isAuthorizationSafeTaskPlan(plan)) return boundary;
  const role = String(user?.role || "").toUpperCase();
  const roleLabel = {
    SUPER_ADMIN: "yönetim kapsamındaki",
    ROOM: "oda kapsamındaki",
    COMPANY: "şirket kapsamındaki",
    SCHOOL: "okul kapsamındaki",
    ORGANIZATION: "organizasyon kapsamındaki",
    DRIVER: "sürücü ekranındaki",
    PERSONEL: "personel ekranındaki",
    PARENT: "veli ekranındaki",
  }[role] || "yetkili";
  const action = String(plan.family || "").toUpperCase().startsWith("PRIORITY")
    ? `Öncelik: önce ${roleLabel} yetkili ekranında erişim kapsamını ve seçili kaydı doğrula; yetki doğrulanmadan kayıt verisi üzerinden karar verme. Neden: güvenli öncelik, doğrulanmamış veya korunmuş kayda dayanarak işlem başlatmamaktır.`
    : `Sonraki güvenli adım: ${roleLabel} yetkili ekranında erişim kapsamını doğrula; yetki doğrulanmadan korunmuş kayıt okumaya veya işlem başlatmaya çalışma.`;
  return `${boundary} ${action}`;
}

export async function buildAuthorizedReasoningAnswer({ user, message, screenContext = null, conversationState = null, semanticPlan: suppliedSemanticPlan = null }) {
  const role = roleKey(user);
  const domainMap = resolveAuthorizedProductDomains(user);
  const semanticPlan = suppliedSemanticPlan || resolveSemanticIntent({
    message,
    user,
    conversationState,
    screenContext,
    selectedEntity: conversationState ? {
      entityId: conversationState.selectedEntityId,
      entityType: conversationState.selectedEntityType,
      relatedEntityId: conversationState.selectedRelatedEntityId,
      relatedEntityType: conversationState.selectedRelatedEntityType,
    } : null,
  });
  const authorizationDecision = await authorizeSemanticRequest({ user, plan: semanticPlan });
  if (authorizationDecision.status === "DENY") {
    return reasoningResult({
      role,
      domainMap,
      topic: "AUTHORIZATION_BOUNDARY",
      reply: authorizationBoundaryTaskReply({ plan: semanticPlan, decision: authorizationDecision, user }),
      nextAction: isAuthorizationSafeTaskPlan(semanticPlan) ? "Yetkili ekran ve kayıt kapsamını doğrula; korunmuş veriyi okumadan ilerle." : "Yetkili servis, plan veya operasyon alanında devam et.",
      records: [],
      dataSources: ["mevcut kullanıcı ve kayıt erişim kuralları"],
      retrievedFacts: ["Korunan kayıt okunmadı"],
      reasoning: "Kullanıcı ve kayıt sahipliği doğrulanamadığı için korunan bilgiye erişilmedi.",
      priority: "Yetki sınırı",
      semanticPlan: authorizationBoundarySemanticPlan(semanticPlan, authorizationDecision),
    });
  }
  if (semanticPlan.clarificationNeed && resolveFieldPrivacyPolicy({ user, message, plan: semanticPlan }).status !== "DENY") {
    return reasoningResult({
      role,
      domainMap,
      topic: "CLARIFICATION",
      reply: "Birden fazla kayıt veya olası referans var; hangi kayıt ya da alanı kastettiğini netleştirir misin? Belirli kayıt kimliği olmadan varsayılan veya ilk satırı kullanmıyorum.",
      nextAction: "Kayıt türü ve kimliğini açıkça belirt.",
      records: [],
      dataSources: ["mevcut konuşma bağlamı"],
      retrievedFacts: ["Belirsiz ifade için kayıt okunmadı"],
      reasoning: "İfade tek bir kaydı güvenle göstermediği için önce netleştirme istendi.",
      priority: "Netleştirme gerekli",
      semanticPlan,
    });
  }
  const fieldPrivacyDecision = resolveFieldPrivacyPolicy({ user, message, plan: semanticPlan });
  if (fieldPrivacyDecision.status === "DENY") {
    const privacyPlan = { ...semanticPlan, family: "FIELD_PRIVACY_BOUNDARY", intentFamily: "FIELD_PRIVACY_BOUNDARY", fieldPrivacyDecision };
    return reasoningResult({
      role,
      domainMap,
      topic: "FIELD_PRIVACY_BOUNDARY",
      reply: fieldPrivacyBoundaryReply(fieldPrivacyDecision),
      nextAction: "Güvenli durum özeti veya yetkili toplu gösterge iste.",
      records: [],
      dataSources: ["alan gizliliği kuralları"],
      retrievedFacts: ["Korunan alan paylaşılmadı"],
      reasoning: "Ham kişisel bilgi, koordinat veya gizli alan paylaşılmadı; korunan kayda erişilmedi.",
      priority: "Alan gizliliği sınırı",
      semanticPlan: privacyPlan,
    });
  }
  const typedTask = semanticPlan.typedRequest?.taskType;
  if (typedTask === "SCREEN_CONTEXT" && screenContext?.path && !(semanticPlan.requestedDomains || []).length) {
    const currentLabel = String(screenContext.label || screenContext.path).trim();
    return reasoningResult({
      role,
      domainMap,
      topic: "SCREEN_CONTEXT",
      reply: `Şu anda ${currentLabel} ekranındasın.`,
      nextAction: "Bu ekrandaki yetkili kaydı veya incelemek istediğin alanı belirt.",
      records: [],
      dataSources: ["current live screen route"],
      retrievedFacts: [`screen.path=${screenContext.path}`, `screen.label=${currentLabel}`],
      reasoning: "Ekran konumu, bu turdaki canonical canlı route bağlamından alındı; ekran domaini kullanıcı hedefinin yerine geçirilmedi.",
      priority: "Güncel ekran bağlamı",
      semanticPlan,
    });
  }
  if (typedTask === "SELECTED_RECORD_CONTEXT") {
    const selectedId = Number(screenContext?.selectedEntityId || conversationState?.selectedEntityId || 0);
    const selectedType = String(screenContext?.selectedEntityType || conversationState?.selectedEntityType || "").toLowerCase();
    const combinedContextIntent = Boolean(semanticPlan.typedRequest?.combinedContextIntent);
    if (!selectedId || !selectedType) {
      return reasoningResult({
        role,
        domainMap,
        topic: "CLARIFICATION",
        reply: combinedContextIntent
          ? `Şu anda ${String(screenContext?.label || screenContext?.path || "ilgili").trim()} ekranındasın. Bu ekranda seçili bir kayıt görünmüyor; hangi kayıtla ilgilendiğini belirtir misin?`
          : "Bu ekranda seçili bir kayıt görünmüyor; hangi kayıtla ilgilendiğini belirtir misin?",
        nextAction: "Bir kayıt seçip tekrar sor.",
        records: [],
        dataSources: ["current live screen selection"],
        retrievedFacts: ["selected record is absent"],
        reasoning: "Canonical UI selection boş olduğu için varsayılan veya ilk satır seçilmedi.",
        priority: "Netleştirme gerekli",
        semanticPlan,
      });
    }
    const typeLabel = selectedType === "offer" ? "Teklif" : selectedType === "shift" ? "Vardiya" : selectedType === "vehicle" ? "Araç" : selectedType === "driver" ? "Sürücü" : selectedType === "agreement" ? "Sözleşme" : "Kayıt";
    const selectedLabel = String(screenContext?.selectedLabel || screenContext?.selectedRecordLabel || `${typeLabel} #${selectedId}`).trim();
    const currentScreenLabel = String(screenContext?.label || screenContext?.path || "ilgili").trim();
    return reasoningResult({
      role,
      domainMap,
      topic: "SELECTED_RECORD_CONTEXT",
      reply: combinedContextIntent
        ? `Şu anda ${currentScreenLabel} ekranındasın. Seçili kayıt ${selectedLabel}.`
        : `Şu anda ${selectedLabel} kaydına bakıyorsun.`,
      nextAction: "Bu kayıttaki alanı veya bağlı kaydı belirt.",
      records: [selectedLabel],
      dataSources: ["current live screen selection"],
      retrievedFacts: [`selected.entityType=${selectedType}`, `selected.entityId=${selectedId}`],
      reasoning: "Seçili kayıt, canonical UI selection ve kayıt kapsamı authorization gate tarafından doğrulanarak kullanıldı; toplu sayım yapılmadı.",
      priority: "Seçili kayıt bağlamı",
      semanticPlan,
    });
  }
  const screenScopedDecision = semanticPlan.scopeTarget === "CURRENT_SCREEN"
    && ["SCREEN_OR_SITUATION_SUMMARY", "NEXT_STEP", "PRIORITY", "RISK_RANKING", "ISSUE_DIAGNOSTIC"].includes(semanticPlan.family);
  const serverScreenTruth = screenScopedDecision
    ? await resolveAuthorizedCurrentScreenTruth({ user, screenContext })
    : null;
  const visibleScreenFacts = serverScreenTruth?.available
    ? serverScreenTruth.visibleText
    : buildVisibleFactText(screenContext);
  if (screenScopedDecision && serverScreenTruth?.available) {
    const reply = serverScreenTruth.zeroState
      ? screenScopedZeroStateReply(semanticPlan.family, role)
      : screenScopedVisibleStateReply(semanticPlan.family, visibleScreenFacts, role);
    return reasoningResult({
      role,
      domainMap,
      topic: semanticPlan.family,
      reply,
      nextAction: "Bu ekranda yeni bir uyarı veya kayıt oluşup oluşmadığını izlemek; doğrulanmış sorun yokken işlem başlatmamak.",
      records: [],
      dataSources: [serverScreenTruth.source, "authorized current-screen resolver", "canonical scope target"],
      retrievedFacts: [
        `screen.currentIssueBuckets=${serverScreenTruth.zeroState ? 0 : "nonzero"}`,
        `screen.openIssueOrOpportunity=${serverScreenTruth.zeroState ? "none" : "present"}`,
      ],
      reasoning: "Bu tur CURRENT_SCREEN kapsamına kilitlendi. Sunucu tarafında çözülen ekran gerçeği genel GPS, başka ekran veya rol sinyaliyle ikame edilmedi.",
      priority: serverScreenTruth.zeroState ? "Bu ekranda açık öncelik yok" : "Bu ekrandaki güncel öncelik",
      semanticPlan,
    });
  }
  if (screenScopedDecision && serverScreenTruth && !serverScreenTruth.available) {
    return reasoningResult({
      role,
      domainMap,
      topic: semanticPlan.family,
      reply: "Bu ekranın güncel sorun özetini yetkili kaynaktan doğrulayamadım; başka ekranın veya genel operasyonun sinyalini bu ekrana aktarmıyorum.",
      nextAction: "Ekran özeti yeniden yüklendiğinde tekrar kontrol et.",
      records: [],
      dataSources: [serverScreenTruth.source, "canonical scope target"],
      retrievedFacts: ["current-screen truth unavailable"],
      reasoning: "CURRENT_SCREEN doğrulanamadığı için rol-geneli kayıt veya GPS sinyaliyle ikame yapılmadı.",
      priority: "Ekran doğrulaması bekleniyor",
      semanticPlan,
    });
  }
  if (screenScopedDecision && visibleScreenFacts) {
    const reply = screenStatesNoOpenIssue(screenContext)
      ? screenScopedZeroStateReply(semanticPlan.family, role)
      : screenScopedVisibleStateReply(semanticPlan.family, visibleScreenFacts, role);
    return reasoningResult({
      role,
      domainMap,
      topic: semanticPlan.family,
      reply,
      nextAction: "Bu ekranda yeni bir uyarı veya kayıt oluşup oluşmadığını izlemek; doğrulanmış sorun yokken işlem başlatmamak.",
      records: [],
      dataSources: ["non-authoritative screen presentation fallback", "canonical scope target"],
      retrievedFacts: ["screen presentation summary"],
      reasoning: "Bu yol yalnız role-home resolver kapsamı dışındaki ekranların sunum bilgisini kullanır; global sinyal ikamesi yapmaz.",
      priority: "Mevcut ekran bağlamı",
      semanticPlan,
    });
  }
  const semanticFamilies = new Set([
    "CURRENT_SITUATION", "SCREEN_OR_SITUATION_SUMMARY", "ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "STATUS", "RECORD_DETAILS", "CONTINUE_CURRENT_REASONING",
    "TEMPORAL_STATUS", "COUNT", "ENTITY_LOOKUP", "COMPARISON", "COST_TREND", "COMMERCIAL_SUMMARY",
    "SERVICE_SUMMARY", "LOCATION_GPS", "ETA", "PLAN_STATUS", "REQUEST_STATUS", "APPROVAL_STATUS",
    "MULTI_DOMAIN_SUMMARY", "RISK_RANKING", "RELATION_LOOKUP", "FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY", "RETURN_TO_PRODUCT", "AUTHORIZATION_BOUNDARY",
  ]);
  // A validated typed assessment is a first-class reasoning operation. It
  // must not be rejected by older keyword/confidence admission rules and then
  // be reinterpreted by a legacy help composer.
  const typedAssessmentTask = ["FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY"].includes(semanticPlan.typedRequest?.taskType)
    && semanticPlan.typedRequestValidation?.valid === true
    && semanticPlan.planStatus === "READY";
  const semanticReasoningTask = [
    "SCREEN_OR_SITUATION_SUMMARY", "ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "RISK_RANKING",
    "FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY",
  ].includes(semanticPlan.family) || typedAssessmentTask;
  if ((!isReasoningQuestion(message) && !isComparisonQuestion(message) && !semanticReasoningTask) && (semanticPlan.confidence < 0.64 || !semanticFamilies.has(semanticPlan.family))) return null;
  if (semanticPlan.crossTenantRequested && role === "SUPER_ADMIN" && !semanticPlan.entities?.length) {
    return reasoningResult({
      role,
      domainMap,
      topic: "SUPER_ADMIN_CROSS_TENANT_POLICY",
      reply: "Bu tür kayıtları salt okunur olarak inceleyebilirim; ancak hangi kurum ve kaydı kastettiğin henüz belli değil. Kurumu, kayıt türünü ve görünen kayıt numarasını belirtir misin?",
      nextAction: "Kurum ile kayıt türünü belirt; konum isteniyorsa ilgili aracı da açıkça seç.",
      records: [],
      dataSources: ["mevcut salt okunur erişim kapsamı"],
      retrievedFacts: ["Belirli kurum ve kayıt doğrulanmadı; herhangi bir kayıt açılmadı"],
      reasoning: "Salt okunur erişim korunuyor; ilgisiz bir kaydı varsaymamak için önce kurum ve kayıt netleştiriliyor.",
      priority: "Kayıt kapsamını netleştirme",
      semanticPlan,
    });
  }
  const text = normalize(message);
  if (semanticPlan.family === "AUTHORIZATION_BOUNDARY" || isUnauthorizedCommercialQuestion(message, role)) {
    const deniedLabel = semanticPlan.deniedDomains.length
      ? semanticPlan.deniedDomains.map(domainLabel).join(", ")
      : "ticari Hizmet Alan Firma";
    return reasoningResult({
      role,
      domainMap,
      topic: "AUTHORIZATION_BOUNDARY",
      reply: `Bu oturumda ${deniedLabel} alanına erişimim yok; bu kayıtları okuyamam. Yetkili servis, plan ve operasyon kayıtlarını özetleyebilirim.`,
      nextAction: "Yetkili servis, plan veya operasyon kaydı sor.",
      records: [],
      dataSources: ["mevcut rol ve company-kind yetki kapsamı"],
      retrievedFacts: [`Yetkisiz alan: ${deniedLabel}`, "Korunan kayıt okunmadı"],
      reasoning: "Yetki sınırı, domain sorgusundan önce uygulandı; yetkisiz kayıt okunmadı.",
      priority: "Yetki sınırı",
      semanticPlan,
    });
  }
  // A selected-record risk question is not a request for the role-wide risk
  // queue.  Until a selected-record risk read model exists for the resolved
  // entity, say so explicitly rather than substituting an unrelated
  // agreement/GPS/actionable signal from the role-global model.
  const selectedRecordAssessmentScope = semanticPlan.scopeTarget === "SELECTED_RECORD"
    && Array.isArray(semanticPlan.entities)
    && semanticPlan.entities.length === 1
    && !semanticPlan.comparisonSpec
    && (
      semanticPlan.family === "RISK_RANKING"
      || ["NEXT_STEP", "PRIORITY", "ISSUE_DIAGNOSTIC", "CAUSE_WHY", "RESOLUTION_PLAN"].includes(semanticPlan.family)
      || ["RISK", "ISSUE", "NEXT_STEP", "SAFE_NEXT_STEP", "PRIORITY"].some((slot) => semanticPlan.requestedTaskSlots?.includes(slot))
    );
  if (selectedRecordAssessmentScope) {
    const selected = semanticPlan.entities[0];
    const entityLabel = selected?.type === "shift" ? `Vardiya #${selected.id}`
      : selected?.type === "offer" ? `Teklif #${selected.id}`
        : selected?.type === "agreement" ? `Sözleşme #${selected.id}` : "Seçili kayıt";
    const safeNextStep = selected?.type === "shift"
      ? `${entityLabel} için bağlı araç, sürücü ve güncel durum bilgisini aynı kayıtta doğrula.`
      : `${entityLabel} için yeni kanıt, durum veya ilişki bilgisi görünürse yalnızca o kaydı yeniden doğrula.`;
    return reasoningResult({
      role,
      domainMap,
      topic: semanticPlan.family,
      reply: `${entityLabel} için doğrulanmış kayda özgü bir risk sinyali görünmüyor. Sonraki güvenli adım: ${safeNextStep} Rol geneli riskleri bu seçili kaydın riski yerine koymuyorum.`,
      nextAction: safeNextStep,
      records: [entityLabel],
      dataSources: ["canonical selected-record scope", "authorized selected-record risk boundary"],
      retrievedFacts: [`selected.entityType=${selected?.type || ""}`, `selected.entityId=${selected?.id || ""}`, "selected-record risk signal unavailable"],
      reasoning: "SELECTED_RECORD kapsamı, dar kapsamlı NO_DATA terminal sonucu olarak ROLE_GLOBAL actionable-events geri dönüşünden önce bağlandı; doğrulanmamış global risk ikamesi yapılmadı.",
      priority: "Seçili kayıt için doğrulanmış risk yok",
      semanticPlan,
    });
  }
  // Query-plan execution owns explicit entity, field, comparison, temporal and
  // multi-domain reads. Keep this reasoning path for diagnosis/prioritization,
  // where the event snapshot is the source of the recommendation.
  const planDrivenFamily = [
    "ENTITY_LOOKUP", "RECORD_DETAILS", "CONTINUE_CURRENT_REASONING", "RETURN_TO_PRODUCT", "ETA", "LOCATION_GPS", "STATUS", "TEMPORAL_STATUS", "COUNT",
    "COMPARISON", "COST_TREND", "COMMERCIAL_SUMMARY", "SERVICE_SUMMARY", "RELATION_LOOKUP", "PLAN_STATUS",
    "REQUEST_STATUS", "APPROVAL_STATUS", "MULTI_DOMAIN_SUMMARY",
  ].includes(semanticPlan.family);
  const reasoningTaskFamily = [
    "SCREEN_OR_SITUATION_SUMMARY", "ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "RISK_RANKING",
    "FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY",
  ].includes(semanticPlan.family) || typedAssessmentTask;
  if ((semanticPlan.entities?.length || semanticPlan.requestedFields?.length || planDrivenFamily) && !reasoningTaskFamily) return null;
  if (reasoningTaskFamily && semanticPlan.entities?.length && (
    semanticPlan.family !== "RISK_RANKING"
    || semanticPlan.requestedFields?.length
    || semanticPlan.comparisonSpec
  )) return null;
  const priorMessages = Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages : [];
  const priorText = priorMessages.map((row) => row?.text || "").join(" ");
  const followUpCause = /^(neden|niye|bunun sebebi ne|neden boyle oldu)\??$/.test(text) && /gps|konum|tahmini sure|eta|sorun/.test(normalize(priorText));
  const followUpNext = /^(sonra ne yapayim|peki sonra ne yapayim|simdi ne yapayim|peki once ne yapayim|once hangisini cozelim|once hangisini cozmeliyim)\??$/.test(text) && priorMessages.length > 0;

  const needsOperations = semanticPlan.requestedDomains.includes("OPERATIONS")
    || ["CURRENT_SITUATION", "SCREEN_OR_SITUATION_SUMMARY", "ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "RISK_RANKING", "SERVICE_SUMMARY", "LOCATION_GPS", "ETA", "ENTITY_LOOKUP", "TEMPORAL_STATUS"].includes(semanticPlan.family)
    || semanticPlan.entity?.type === "shift";
  const includeVehicleSignals = requiresVehicleSignalForPlan(semanticPlan, screenContext);
  const [actionable, vehicleIssues, shiftSnapshot, offers, agreements, finance, operations, drivers] = await Promise.all([
    buildActionableEventsForUser(user),
    includeVehicleSignals && domainMap.domains.includes("VEHICLES") ? readVehicles(user, role, semanticPlan) : Promise.resolve({ domain: "VEHICLES", count: 0, records: [] }),
    domainMap.domains.includes("SHIFTS") ? readShifts(user, role, /atanmamis/.test(text), semanticPlan) : Promise.resolve({ domain: "SHIFTS", count: 0, records: [] }),
    domainMap.domains.includes("OFFERS") ? readOffers(user, role, semanticPlan) : Promise.resolve({ domain: "OFFERS", count: 0, records: [] }),
    domainMap.domains.includes("AGREEMENTS") ? readAgreements(user, role, semanticPlan) : Promise.resolve({ domain: "AGREEMENTS", count: 0, records: [] }),
    domainMap.domains.includes("FINANCE") || domainMap.domains.includes("BUDGET") ? readFinance(user, role, semanticPlan.family === "COST_TREND") : Promise.resolve({ domain: "FINANCE", count: 0, records: [] }),
    needsOperations && domainMap.domains.includes("OPERATIONS") ? readOperations(user, role, semanticPlan) : Promise.resolve({ domain: "OPERATIONS", count: 0, records: [] }),
    semanticPlan.requestedDomains.includes("DRIVERS") && domainMap.domains.includes("DRIVERS") ? readDrivers(user, role, semanticPlan) : Promise.resolve({ domain: "DRIVERS", count: 0, records: [] }),
  ]);
  const selectedFacts = screenContext ? visibleContextForReasoning(screenContext) : "";
  const causalGps = /çevrim dışı|cevrim disi|offline|konum sinyali yok|konum bilgisi güncel değil|konum bilgisi guncel degil|gps.*yok/i.test(`${selectedFacts} ${vehicleIssues.records.join(" ")}`);
  const causalContext = `${selectedFacts} ${priorText}`;
  const causalEta = /tahmini süre[^•]{0,80}(hesaplanamıyor|hesaplanmiyor|yok)|eta[^•]{0,80}(yok|güvenilir değil|guvenilir degil)/i.test(causalContext)
    || (vehicleIssues.count > 0 && /sorun|neden|süre|sure|konum|gps/i.test(causalContext));
  const resolvedEntity = semanticPlan.entity || null;
  const entityFacts = (operations.records?.length
    ? operations.records
    : [...(shiftSnapshot.records || []), ...(vehicleIssues.records || []), ...(drivers.records || [])]
  ).filter(Boolean);
  const taskModel = buildReasoningTaskModel({
    actionable,
    vehicleIssues,
    shiftSnapshot,
    offers,
    agreements,
    finance,
    preferShift: semanticPlan.family === "PRIORITY" && semanticPlan.requestedDomains.includes("SHIFTS"),
  });
  const followUpContext = priorMessages.length
    ? `Önceki görev: ${priorMessages[priorMessages.length - 1]?.text || "önceki yetkili görev"}; yeni görev: ${semanticPlan.family}`
    : `Yeni görev: ${semanticPlan.family}`;
  if (["FRESHNESS_CHECK", "UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY"].includes(semanticPlan.family)) {
    const sourceResults = [offers, agreements, shiftSnapshot, vehicleIssues, finance, operations, drivers].filter(Boolean);
    const sourceFacts = sourceResults.flatMap((result) => Array.isArray(result?.facts) ? result.facts : []);
    const actionableEvents = Array.isArray(actionable?.events) ? actionable.events : [];
    const timestampCandidates = sourceFacts
      .map((fact) => fact?.freshnessAt || fact?.updatedAt || fact?.observedAt || fact?.date || fact?.startAt || null)
      .map((value) => value ? new Date(value) : null)
      .filter((value) => value && Number.isFinite(value.getTime()))
      .sort((left, right) => right.getTime() - left.getTime());
    const latestTimestamp = timestampCandidates[0] || null;
    const evidenceCount = sourceFacts.length + actionableEvents.length;
    const freshnessReply = latestTimestamp
      ? `Yetkili kayıtlar bu turda yeniden okundu; görünen en son kayıt zamanı ${dateText(latestTimestamp)}. Bu zaman kaydın son görünen değişikliğini gösterir, tek başına tüm kaynakların hâlâ güncel olduğunu kanıtlamaz.`
      : "Yetkili kayıtlar bu turda yeniden okundu, ancak kaynaklarda açık bir son güncelleme zamanı görünmüyor; bu nedenle önceki sonucun hâlâ güncel olduğunu kesin olarak doğrulayamıyorum.";
    const evidenceReply = evidenceCount > 0
      ? `Mevcut sonuç ${evidenceCount} yetkili kayıt veya bulguyla destekleniyor. Bu kapsamda karar için dayanak var; ancak yeni, eksik ya da çelişkili veri gelirse sonuç yeniden değerlendirilmelidir.`
      : "Mevcut sonucu destekleyen yeterli yetkili kanıt bulunamadı; bu nedenle kesin bir karar vermek güvenli değil.";
    const isFreshness = semanticPlan.family === "FRESHNESS_CHECK";
    return reasoningResult({
      role,
      domainMap,
      topic: semanticPlan.family,
      reply: isFreshness ? freshnessReply : evidenceReply,
      nextAction: isFreshness ? "Karar vermeden önce ilgili kaydın güncelleme zamanını ve canlı durumunu birlikte doğrula." : "Eksik veya çelişkili kanıt varsa ilgili kaydı yeniden doğrula; yoksa mevcut yetkili bulgularla devam et.",
      records: sourceResults.flatMap((result) => Array.isArray(result?.records) ? result.records : []).slice(0, 12),
      dataSources: ["bu turda yeniden okunan yetkili kayıtlar", "mevcut operasyon bulguları"],
      retrievedFacts: [
        `${evidenceCount} yetkili kayıt veya bulgu değerlendirildi`,
        latestTimestamp ? `Görünen en son kayıt zamanı ${dateText(latestTimestamp)}` : "Açık son güncelleme zamanı bulunamadı",
      ],
      reasoning: isFreshness
        ? "Güncellik, bu turda yeniden okunan kayıtların görünen zaman bilgisiyle değerlendirildi; zaman bilgisi olmayan kaynak için kesin güncellik iddiası kurulmadı."
        : "Kanıt yeterliliği, bu turda yeniden okunan yetkili kayıt ve bulguların varlığına göre değerlendirildi; eksik veya çelişkili veri olasılığı saklı tutuldu.",
      priority: isFreshness ? "Güncellik doğrulaması" : "Kanıt yeterliliği",
      followUpContext,
      semanticPlan,
    });
  }
  if (["SCREEN_OR_SITUATION_SUMMARY", "ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "RISK_RANKING"].includes(semanticPlan.family)) {
    const taskReply = reasoningTaskReply(semanticPlan.family, taskModel, selectedFacts || factBridgeForReasoning({ offers, agreements, shiftSnapshot, vehicleIssues, finance }), semanticPlan.taskVariant, role);
    const composedTaskReply = appendReasoningTaskSlots(taskReply, semanticPlan, taskModel);
    const primary = taskModel.primary;
    return reasoningResult({
      role,
      domainMap,
      topic: semanticPlan.family,
      reply: composedTaskReply,
      nextAction: primary?.next || taskModel.resolutionSteps[0] || "Yetkili güncel kayıtları yeniden kontrol et.",
      records: [...offers.records, ...agreements.records, ...shiftSnapshot.records, ...vehicleIssues.records, ...finance.records].slice(0, 12),
      dataSources: ["actionable-events-v1", "yetkili operasyon/vardiya kayıtları", "araç konum kayıtları", "rol/company-kind/tenant kapsamı"],
      retrievedFacts: [
        ...taskModel.problems.map((item) => `PROBLEM: ${item.title}`),
        ...taskModel.opportunities.map((item) => `OPPORTUNITY: ${item.title}`),
        ...taskModel.information.slice(0, 6).map((item) => `INFORMATION: ${item.title}`),
      ],
      reasoning: `Yeni ${semanticPlan.family} görevi, önceki yanıtı yeniden kullanmadan aynı yetkili fact kümesi üzerinde yürütüldü.`,
      priority: primary?.title || "Doğrulanmış öncelik yok",
      followUpContext,
      semanticPlan,
    });
  }
  if (resolvedEntity && ["ENTITY_LOOKUP", "ETA", "LOCATION_GPS", "STATUS", "TEMPORAL_STATUS", "SERVICE_SUMMARY", "CURRENT_SITUATION", "CAUSE_WHY", "PRIORITY", "NEXT_STEP", "COMPARISON"].includes(semanticPlan.family)) {
    const matched = entityFacts.length > 0;
    const entityLabel = resolvedEntity.type === "shift" ? `Vardiya #${resolvedEntity.id}` : resolvedEntity.type === "vehicle" ? `Araç ${resolvedEntity.plate}` : `${resolvedEntity.type} kaydı`;
    const reply = matched
      ? `${entityLabel} için yetkili kayıt bulundu: ${entityFacts.slice(0, 3).join(" ")}`
      : `${entityLabel} için mevcut yetki kapsamımda eşleşen kayıt bulunamadı; başka bir kaydı bunun yerine kullanmıyorum.`;
    return reasoningResult({
      role,
      domainMap,
      topic: semanticPlan.family,
      reply,
      nextAction: matched ? (semanticPlan.family === "ETA" ? "Tahmini süreyi canlı konum ve sıradaki durakla birlikte yeniden doğrula." : "İstersen bu kaydın bağlı araç, sürücü veya durak ayrıntısını açabilirim.") : "Kimlik veya zaman bilgisini netleştirerek tekrar sor.",
      records: entityFacts.slice(0, 8),
      dataSources: ["explicit entity resolution", "yetkili operasyon/vardiya kayıtları", "rol/company-kind/tenant kapsamı"],
      retrievedFacts: matched ? entityFacts.slice(0, 8) : [`Eşleşmeyen explicit entity: ${entityLabel}`],
      reasoning: matched ? `Entity ${resolvedEntity.source} önceliğiyle çözüldü; genel ilk satır yerine istenen kayıt kullanıldı.` : "Entity çözüldü ancak yetkili gerçek kayıtta eşleşme bulunmadı; yanlış kayıt ikame edilmedi.",
      priority: matched ? "İstenen kayıt" : "Kayıt eşleşmesi bekleniyor",
      semanticPlan,
    });
  }
  if ((followUpCause || isCurrentSituationDiagnosticQuestion(message)) && causalGps && causalEta) {
    return reasoningResult({
      role,
      domainMap,
      topic: "CURRENT_SITUATION_DIAGNOSTIC",
      reply: "Güncel durumda konum/GPS sinyali çevrim dışı olduğu için araçtan güncel konum alınamıyor; bu nedenle tahmini süre hesaplanamıyor. Güvenli sonraki adım, araç cihazı ve bağlantıyı kontrol edip güncel konum geldikten sonra süreyi yeniden doğrulamaktır.",
      nextAction: "Araç cihazı ve konum bağlantısını kontrol et; sonra tahmini süreyi yeniden doğrula.",
      records: vehicleIssues.records,
      dataSources: ["seçili canlı araç bağlamı", "yetkili araç konum kaydı", "tahmini süre durumu"],
      retrievedFacts: ["Konum/GPS sinyali çevrim dışı", "Güncel araç konumu alınamıyor", "Tahmini süre hesaplanamıyor"],
      reasoning: "Güncel konum alınamadığı için tahmini süre üretilemez; bu bir canlı konum bağımlılığıdır.",
      priority: "Operasyonel takip önceliği",
      semanticPlan,
    });
  }
  if (isPlatformRiskQuestion(message, role)) {
    const platformEvents = (Array.isArray(actionable?.events) ? actionable.events : []).filter((event) => /platform|sistem|tenant|guvenlik|erişim|erisim|yedek|backup|veri bütünlüğü|veri butunlugu|hata|saglik/i.test(`${event?.title || ""} ${event?.description || ""}`));
    if (!platformEvents.length) {
      return reasoningResult({
        role,
        domainMap,
        topic: "PLATFORM_RISK_ASSESSMENT",
        reply: "Yetkili güncel kayıtlarda şu anda platform, tenant veya sistem bütünlüğü seviyesinde doğrulanmış kritik bir risk görünmüyor. Vardiya ve saha hareketleri operasyonel aktivitedir; bunları platform riski olarak sınıflandırmıyorum.",
        nextAction: "Platform bildirimleri, tenant erişim durumu ve sistem sağlığı göstergelerini izlemeye devam et.",
        records: [],
        dataSources: ["actionable-events-v1", "platform/tenant kapsamındaki yetkili kayıtlar"],
        retrievedFacts: ["Doğrulanmış platform düzeyi risk kaydı yok", "Operasyonel vardiyalar platform riski olarak sayılmadı"],
        reasoning: "Platform riski sorusu operasyonel vardiya verisinden ayrıştırıldı; yalnızca platform/tenant/sistem sinyalleri risk kabul edildi.",
        priority: "Platform düzeyinde doğrulanmış risk yok",
        semanticPlan,
      });
    }
    return reasoningResult({
      role,
      domainMap,
      topic: "PLATFORM_RISK_ASSESSMENT",
      reply: `${platformEvents.slice(0, 3).map((event) => event.title || event.description || "Platform riski").join(" ")} Önce platform/tenant yetki ve sistem sağlığı kanıtını incele; otomatik bir işlem başlatmıyorum.`,
      nextAction: "İlgili platform veya tenant kaydını açıp yetkili incelemeyi tamamla.",
      records: platformEvents.slice(0, 5),
      dataSources: ["actionable-events-v1", "platform/tenant kapsamındaki yetkili kayıtlar"],
      retrievedFacts: platformEvents.slice(0, 5).map((event) => event.title || event.description || "Platform riski"),
      reasoning: "Platform düzeyi sinyaller, normal vardiya aktivitesinden ayrı değerlendirildi.",
      priority: "Platform/tenant incelemesi",
      semanticPlan,
    });
  }
  const priorities = roleIssueSummary(role, actionable, vehicleIssues, shiftSnapshot);
  const broadSemantic = ["CURRENT_SITUATION", "ISSUE_DIAGNOSTIC", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "STATUS", "TEMPORAL_STATUS", "MULTI_DOMAIN_SUMMARY"].includes(semanticPlan.family);
  const broad = (isReasoningQuestion(message) || broadSemantic) && !isComparisonQuestion(message);
  if (semanticPlan.family === "COST_TREND" || isBudgetComparisonQuestion(message)) {
    const comparison = finance.comparison || null;
    const comparisonText = comparison
      ? `Karşılaştırılabilir kayıtlara göre maliyet ${comparison.direction} görünüyor: önceki ${comparison.previousAmountText}, güncel ${comparison.currentAmountText}; fark ${comparison.deltaText}.`
      : "Mevcut yetkili mali kayıtlarda maliyetin önceki dönem veya karşılaştırılabilir bir referansa göre arttığını kanıtlayan yeterli veri yok.";
    return reasoningResult({
      role,
      domainMap,
      topic: "BUDGET_COMPARISON",
      reply: `${comparisonText} ${comparison ? "Değişimin dayanağı aynı maliyet kaleminin iki yetkili bütçe kaydıdır; tek arşiv satırından trend çıkarılmadı." : "Bu nedenle maliyet arttı diyemem; görünen tek tutar tek başına trend kanıtı değildir."}`,
      nextAction: comparison ? "Dönem, bütçe kaynağı ve uyarı eşiğini birlikte doğrula; ödeme veya muhasebe işlemi başlatmıyorum." : "Karşılaştırma yapabilmek için aynı maliyet kaleminin iki döneme ait tutarlarını veya yetkili bütçe referansını birlikte incele.",
      records: finance.records,
      dataSources: ["yetkili mali önizleme kayıtları", "bütçe kayıtları", "rol/company-kind/tenant kapsamı"],
      retrievedFacts: finance.records.length ? [...finance.records, ...(comparison ? [comparison.previousAmountText, comparison.currentAmountText, comparison.deltaText] : ["Önceki dönem veya karşılaştırılabilir maliyet referansı yok"])] : ["Karşılaştırılabilir maliyet kaydı yok"],
      reasoning: comparison ? "Aynı maliyet kaleminin güncel ve önceki yetkili bütçe kayıtları karşılaştırıldı." : "Maliyet artışı iddiası için aynı kalemin karşılaştırılabilir dönem/referans değerleri gerekir; mevcut okuma bu kanıtı sağlamıyor.",
      priority: comparison ? "Kanıtlı maliyet karşılaştırması" : "Karşılaştırma kanıtı eksik",
      semanticPlan,
    });
  }
  if (isComparisonQuestion(message) && offers.count > 0) {
    const comparisonLead = offers.records.length > 1
      ? `${offers.count} yetkili teklif arasında karşılaştırma yapılabilir; mevcut kanıta göre tek başına fiyatla karar vermek yerine teklifin bağlı olduğu vardiya, araç/sürücü uygunluğu ve zaman bilgisini birlikte kontrol et.`
      : `Yetkili kayıtlarda ${offers.count} teklif var; tek kayıt olduğu için alternatif karşılaştırması yapmadan iyi/kötü kararı vermek doğru olmaz.`;
    return reasoningResult({
      role,
      domainMap,
      topic: "DECISION_SUPPORT",
      reply: `${comparisonLead} ${offers.records.slice(0, 3).join(" ")} Önerim: önce bağlı vardiya ve kapasite koşullarını doğrula; kabul/red işlemini senin açık onayın olmadan başlatmam.`,
      nextAction: "Teklifin bağlı vardiya, araç/sürücü ve zaman koşullarını birlikte kontrol et.",
      records: offers.records,
      dataSources: ["yetkili teklif kayıtları", "bağlı vardiya kayıtları", "araç/sürücü uygunluğu"],
      retrievedFacts: [`${offers.count} yetkili teklif`, "Teklifler karşılaştırılabilir", "Bağlı vardiya ve kapasite koşulları karar için gerekli"],
      reasoning: "Tek başına fiyat, bağlı vardiya ve operasyon uygunluğu doğrulanmadan yeterli karar kanıtı değildir.",
      priority: "Ticari karar öncesi doğrulama",
      semanticPlan,
    });
  }
  if (role === "PARENT" && /(?:eta|tahmini\s+s(?:ü|u)re|s(?:ü|u)re\s+hesaplanm[ıi]yor)/i.test(text) && !shiftSnapshot.count && !vehicleIssues.count) {
    return reasoningResult({
      role,
      domainMap,
      topic: "CURRENT_SITUATION_DIAGNOSTIC",
      reply: "Bugün için yetkili aktif servis kaydı bulunmuyor; bu nedenle güncel araç, sürücü veya tahmini süre bilgisi gösteremiyorum. Yeni bir servis kaydı aktif olduğunda tahmini süreyi yeniden kontrol edebilirsin.",
      nextAction: "Önce çocuğunuz için bugün aktif bir servis kaydı oluşup oluşmadığını kontrol et; kayıt oluştuğunda tahmini süreyi yeniden doğrula.",
      records: [],
      dataSources: ["yetkili günlük vardiya kayıtları", "veli-çocuk yetki bağı", "yetkili araç konum kapsamı"],
      retrievedFacts: ["Bugün için yetkili aktif servis kaydı yok", "Bu nedenle güncel tahmini süre üretilemedi"],
      reasoning: "Güncel aktif servis kaydı olmadan araç konumu ve tahmini süre için güvenilir bir değer üretilemez; eski kayıtlar güncel durum olarak kullanılmadı.",
      priority: "Güncel kayıt bekleniyor",
      semanticPlan,
    });
  }
  if (!broad && !followUpNext) return null;
  const factBridge = [
    offers.count ? `${offers.count} teklif kaydı` : "",
    agreements.count ? `${agreements.count} sözleşme inceleme kaydı` : "",
    shiftSnapshot.count ? `${shiftSnapshot.count} bugünkü vardiya kaydı` : "",
    vehicleIssues.count ? `${vehicleIssues.count} araçta güncel olmayan konum` : "",
    finance.count ? `${finance.count} mali önizleme kaydı` : "",
  ].filter(Boolean).join(", ");
  const reply = `${priorities.join(" ")} ${factBridge ? `Bunu şu yetkili kayıtları birlikte okuyarak söylüyorum: ${factBridge}.` : ""} ${followUpNext ? "Sıradaki güvenli adım, birinci öncelikteki kaydı açıp eksik bağı doğrulamak." : ""}`.trim();
  return reasoningResult({
    role,
    domainMap,
    topic: "MULTI_DOMAIN_SYNTHESIS",
    reply,
    nextAction: priorities[0] || "Önce en yüksek öncelikli kaydı kontrol et.",
    records: [...offers.records, ...agreements.records, ...shiftSnapshot.records, ...vehicleIssues.records, ...finance.records].slice(0, 12),
    dataSources: ["actionable-events-v1", "teklif kayıtları", "sözleşme kayıtları", "bugünkü vardiyalar", "araç konum kayıtları", "mali önizleme kayıtları"],
    retrievedFacts: [
      offers.count ? `${offers.count} teklif kaydı` : "Teklif kaydı yok",
      agreements.count ? `${agreements.count} sözleşme inceleme kaydı` : "İnceleme bekleyen sözleşme yok",
      shiftSnapshot.count ? `${shiftSnapshot.count} bugünkü vardiya kaydı` : "Bugün yetkili vardiya kaydı yok",
      vehicleIssues.count ? `${vehicleIssues.count} araçta güncel olmayan konum` : "Açık konum sorunu yok",
      finance.count ? `${finance.count} mali önizleme kaydı` : "Mali önizleme kaydı yok",
    ],
    reasoning: priorities[0] || "Açık yetkili kayıtlar öncelik sırasına göre değerlendirildi.",
    priority: priorities[0] || "İzleme",
    semanticPlan,
  });
}

function visibleContextForReasoning(screenContext) {
  return buildVisibleFactText(screenContext);
}

function screenStatesNoOpenIssue(screenContext) {
  const text = normalize(buildVisibleFactText(screenContext));
  const zeroBuckets = /kritik\s*[:=-]?\s*0/.test(text)
    && /bugun\s+cozulmeli\s*[:=-]?\s*0/.test(text)
    && /takip\s+edilmeli\s*[:=-]?\s*0/.test(text)
    && /firsat\s*[:=-]?\s*0/.test(text);
  return zeroBuckets && /acik\s+bir\s+sorun\s+veya\s+firsat\s+gorunmuyor/.test(text);
}

function screenScopedZeroStateReply(family, role) {
  const roleContext = roleActionContext(role);
  if (family === "RISK_RANKING") return `Bu ekranda doğrulanmış risk yok. Görünen kritik, bugün çözülmeli, takip ve fırsat sayaçları sıfır; başka bir ekrandaki sinyali bu ekranın riski olarak kullanmıyorum. Sonraki güvenli adım: ${roleContext}`;
  if (family === "SCREEN_OR_SITUATION_SUMMARY") return `Bu ekranda takip gerektiren açık sorun veya fırsat görünmüyor; görünür kritik, bugün çözülmeli, takip ve fırsat sayaçları sıfır. Güvenli izleme: ${roleContext}`;
  if (family === "ISSUE_DIAGNOSTIC") return "Bu ekranda doğrulanmış açık sorun veya fırsat görünmüyor. Görünen sayaçlar sıfır olduğu için başka bir ekranın genel sinyalini burada sorun olarak göstermiyorum.";
  if (family === "PRIORITY") return `Bu ekranda birinci öncelik gerektiren doğrulanmış kayıt yok. Gerekçe: görünür kritik, bugün çözülmeli, takip ve fırsat sayaçları sıfır. Sonraki güvenli adım: ${roleContext}`;
  return `Hemen sonraki güvenli adım: bu ekranda yeni bir uyarı veya kayıt oluşup oluşmadığını izlemek; doğrulanmış sorun yokken işlem başlatmamak. ${roleContext}`;
}

function screenScopedVisibleStateReply(family, visibleFacts, role) {
  const roleContext = roleActionContext(role);
  if (family === "SCREEN_OR_SITUATION_SUMMARY") return `Bu ekranda görünen durum: ${visibleFacts}. En önemli takip noktası, bu görünür göstergelerde değişiklik olup olmadığını aynı ekran kapsamındaki yetkili kayıtlarla doğrulamaktır.`;
  if (family === "ISSUE_DIAGNOSTIC" || family === "RISK_RANKING") return `Bu ekranda görünen sinyal: ${visibleFacts}. Bu ekran özeti tek başına belirli bir kayıt veya yeni bir risk nedeni göstermediği için başka ekrandan kayıt ikame etmiyorum. Sonraki güvenli adım: ${roleContext}`;
  if (family === "PRIORITY") return `Bu ekranda önceliklendirme için görünen sinyal: ${visibleFacts}. Gerekçe: yalnızca bu ekranın görünür ve yetkili durumunu kullanıyorum. Sonraki güvenli adım: ${roleContext}`;
  return `Bu ekranda görünen durum: ${visibleFacts}. Hemen sonraki güvenli adım: ${roleContext}`;
}

function reasoningResult({ role, domainMap, topic, reply, nextAction, records, dataSources = [], retrievedFacts = [], reasoning = "", priority = "", followUpContext = "", semanticPlan = null }) {
  return {
    source: "authorized-reasoning-v1",
    role,
    topic,
    authorizedDomainMap: domainMap.domains,
    records: Array.isArray(records) ? records : [],
    reply,
    nextAction,
    intent: topic,
    dataSources,
    retrievedFacts,
    reasoning,
    priority,
    safeNextStep: nextAction,
    followUpContext,
    semanticPlan,
    styleApplied: semanticPlan?.family === "STYLE"
      ? semanticPlan.requestedStyle || semanticPlan.styleModifier || null
      : null,
    readOnly: true,
  };
}

function dateText(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

function dateOnlyText(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", { dateStyle: "short" });
}

function minuteText(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return "";
  const hour = Math.floor(minutes / 60) % 24;
  const minute = Math.floor(minutes % 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function firstSentence(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^.*?[.!?](?:\s|$)/u);
  return (match?.[0] || text).trim();
}

// STYLE is presentation-only: transform the settled, already-authorized
// answer without resolving a new entity or re-reading a broader domain.
function applyRequestedStyle({ reply, style, reasoning = "", nextAction = "", sentenceCount = null }) {
  const source = String(reply || "").trim();
  const compact = firstSentence(source) || source;
  const sentences = source.split(/(?<=[.!?])\s+/u).map((part) => part.trim()).filter(Boolean);
  // A sentence-count instruction is an output contract, not STYLE metadata.
  // Preserve the first settled semantic units and never replace them with a
  // new product lookup while shortening.
  const sentenceLimited = Number.isInteger(Number(sentenceCount)) && Number(sentenceCount) > 0
    ? sentences.slice(0, Number(sentenceCount)).join(" ") || compact
    : compact;
  const boundedPresentationUnits = (() => {
    const candidates = [
      ...sentences,
      reasoning ? `Gerekçe: ${firstSentence(reasoning)}` : "",
      nextAction ? `Sonraki güvenli adım: ${firstSentence(nextAction)}` : "",
    ].map((part) => String(part || "").trim()).filter(Boolean);
    const seen = new Set();
    return candidates.filter((part) => {
      const key = normalize(part);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  switch (String(style || "").toUpperCase()) {
    case "RESULT_ONLY":
    case "SHORT_SUMMARY":
    case "SINGLE_SENTENCE":
    case "SHORTEN":
      return sentenceLimited;
    case "BULLET_STEPS":
    case "BULLETIZE": {
      const requestedItems = Number.isInteger(Number(sentenceCount)) && Number(sentenceCount) > 0
        ? Number(sentenceCount)
        : null;
      const items = boundedPresentationUnits.length ? [...boundedPresentationUnits] : [compact];
      // A requested item count is a final-output contract.  Prefer settled
      // answer, reasoning and next-action material; if the source contains
      // less than the requested number of semantic units, add only an explicit
      // non-factual presentation note rather than retrieving or inventing data.
      while (requestedItems && items.length < requestedItems) {
        items.push("Aynı yetkili sonuç korunuyor; ek kayıt veya yeni veri okunmadı.");
      }
      return (requestedItems ? items.slice(0, requestedItems) : items).map((part) => `• ${part}`).join("\n") || `• ${compact}`;
    }
    case "CHILD_FRIENDLY":
      return `Kısaca: ${compact}`;
    case "REPHRASED":
      return `Başka türlü söyleyeyim: ${compact}`;
    case "EXPANDED":
      return [source, reasoning ? `Ayrıntı: ${reasoning}` : "", nextAction ? `Sonraki güvenli adım: ${nextAction}` : ""].filter(Boolean).join(" ");
    default:
      return source;
  }
}

function statusText(value) {
  const map = {
    OPEN: "Açık",
    COUNTERED: "Karşı teklif bekliyor",
    REQUESTED: "İnceleme bekliyor",
    APPROVED: "Onaylandı",
    ACTIVE: "Aktif",
    DRAFT: "Taslak",
    READY: "Hazır",
    ISSUED: "Düzenlendi",
    ARCHIVED: "Arşivde",
    PENDING: "Bekliyor",
    REJECTED: "Reddedildi",
    CANCELLED: "İptal edildi",
    SHIFT_PUBLISHED: "Vardiya yayınlandı",
    AGREEMENT_REQUESTED: "Sözleşme istendi",
    LIVE: "Canlı",
    STALE: "Güncel değil",
    OFFLINE: "Çevrim dışı",
  };
  return map[String(value || "").toUpperCase()] || String(value || "");
}

function amountText(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("tr-TR").format(number) : "-";
}

function offerQualityAndRisk(row) {
  const missing = [];
  if (row?.amountCompany == null) missing.push("hizmet alanı bedeli");
  if (row?.amountRoom == null) missing.push("taşımacı bedeli");
  if (!row?.shift?.startAt) missing.push("başlangıç zamanı");
  if (!row?.shift?.endAt) missing.push("bitiş zamanı");
  const qualityState = missing.length ? "INCOMPLETE" : "COMPLETE";
  const riskReasons = [];
  if (row?.amountRoom == null) riskReasons.push("taşımacı bedeli yok");
  if (!row?.shift?.vehicleId) riskReasons.push("araç bağı yok");
  if (!row?.shift?.driverId) riskReasons.push("sürücü bağı yok");
  const riskState = riskReasons.length >= 2 ? "HIGH" : riskReasons.length ? "MEDIUM" : "LOW";
  return {
    qualityState,
    qualityStateText: qualityState === "COMPLETE" ? "Tam" : "Eksik veri",
    qualityMissingFields: missing,
    riskState,
    riskStateText: riskState === "HIGH" ? "Yüksek" : riskState === "MEDIUM" ? "Orta" : "Düşük",
    riskReasons,
  };
}

function staleGps(row) {
  const state = normalize(row?.gpsState?.lastUiStatus || row?.gpsLast?.status || "");
  if (["offline", "stale", "low_signal"].includes(state)) return true;
  const at = row?.gpsLast?.at ? new Date(row.gpsLast.at).getTime() : NaN;
  return !Number.isFinite(at) || Date.now() - at > 5 * 60 * 1000;
}

function gpsFreshness(row) {
  const at = row?.gpsLast?.at ? new Date(row.gpsLast.at).getTime() : NaN;
  if (!Number.isFinite(at)) return "UNKNOWN";
  return staleGps(row) ? "STALE" : "FRESH";
}

function companyFilter(user) {
  return { companyId: integer(user?.companyId) || -1 };
}

function planEntities(plan, type) {
  const entities = Array.isArray(plan?.entities) ? plan.entities : plan?.entity ? [plan.entity] : [];
  if (type === "personnel") return entities.filter((entity) => ["personnel", "student"].includes(entity?.type));
  return entities.filter((entity) => entity?.type === type);
}

function factText(fact) {
  return fact?.text || fact?.summary || "";
}

function agreementReason(row) {
  const reasons = [];
  const status = normalizeStatus(row?.status);
  if (status === "REQUESTED") reasons.push("inceleme bekliyor");
  else if (status === "APPROVED") reasons.push("onaylandı");
  else if (status) reasons.push(`durum ${statusText(status)}`);
  if (!row?.vehicleId) reasons.push("araç bağı yok");
  if (!row?.driverId) reasons.push("sürücü bağı yok");
  if (!Array.isArray(row?.shifts) || row.shifts.length === 0) reasons.push("bağlı vardiya üretimi görünmüyor");
  if (row?.extendStatus && row.extendStatus !== "NONE") reasons.push(`süre uzatma durumu ${row.extendStatus}`);
  return reasons.join("; ") || "sözleşme durumu ve bağlı kayıtlar birlikte doğrulanmalı";
}

async function readOffers(user, role, plan = null) {
  const offerEntities = planEntities(plan, "offer");
  const statusScope = offerEntities.length ? {} : { status: { in: OPEN_OFFER_STATUSES } };
  const base = role === "ROOM"
    ? { roomId: integer(user?.roomId) || -1, ...statusScope }
    : role === "SUPER_ADMIN"
      ? { ...statusScope }
      : { shift: { is: { companyId: integer(user?.companyId) || -1 } }, ...statusScope };
  const shiftEntities = planEntities(plan, "shift");
  const where = offerEntities.length
    ? { ...base, id: { in: offerEntities.map((entity) => entity.id) } }
    : shiftEntities.length
      ? { ...base, shiftId: { in: shiftEntities.map((entity) => entity.id) } }
      : base;
  const rows = await prisma.shiftOffer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      shiftId: true,
      updatedAt: true,
      amountCompany: true,
      amountRoom: true,
      shift: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          agreementId: true,
          vehicleId: true,
          driverId: true,
          vehicle: { select: { plate: true } },
        },
      },
    },
  });
  const facts = rows.map((row) => ({
    ...offerQualityAndRisk(row),
    // SUPER_ADMIN has system-wide read-only visibility, not a raw personal
    // data projection. Preserve the relationship while masking the name.
    driverLabel: role === "SUPER_ADMIN"
      ? (row.driverId ? `Sürücü #${row.driverId}` : null)
      : (row.driver?.fullName || null),
    id: row.id,
    offerId: row.id,
    shiftId: row.shiftId,
    vehicleId: row.shift?.vehicleId || null,
    driverId: row.shift?.driverId || null,
    vehiclePlate: row.shift?.vehicle?.plate || null,
    status: row.status,
    statusText: statusText(row.status),
    updatedAt: row.updatedAt,
    updatedAtText: dateText(row.updatedAt),
    startAt: row.shift?.startAt || null,
    endAt: row.shift?.endAt || null,
    startAtText: dateText(row.shift?.startAt),
    endAtText: dateText(row.shift?.endAt),
    shiftStatus: row.shift?.status || null,
    date: row.shift?.startAt || row.updatedAt,
    dateText: dateText(row.shift?.startAt || row.updatedAt),
    amountCompany: row.amountCompany,
    amountRoom: row.amountRoom,
    serviceBuyerAmount: row.amountCompany,
    carrierAmount: row.amountRoom,
    amountCompanyText: amountText(row.amountCompany),
    amountRoomText: amountText(row.amountRoom),
    agreementId: row.shift?.agreementId || null,
    offerStatus: statusText(row.status),
    text: `Teklif #${row.id} • Vardiya #${row.shiftId} • ${statusText(row.status)}${dateText(row.shift?.startAt) ? ` • Vardiya ${dateText(row.shift.startAt)}${dateText(row.shift?.endAt) ? `–${dateText(row.shift.endAt).split(" ").slice(-1)[0]}` : ""}` : ""}${dateText(row.updatedAt) ? ` • Güncellendi ${dateText(row.updatedAt)}` : ""}`,
    evidence: [`offer.id=${row.id}`, `offer.shiftId=${row.shiftId}`],
  }));
  return {
    domain: "OFFERS",
    count: rows.length,
    records: facts.slice(0, 5).map(factText),
    facts,
    nextAction: rows.length ? "Önce teklifleri karşılaştır; kabul veya red kararını kullanıcı onayıyla ver." : "Yeni teklif geldiğinde tekrar kontrol et.",
  };
}

export function projectAgreementCanonicalRelation(row, bridge = null) {
  const generatedShiftIds = Array.isArray(row?.shifts) ? row.shifts.map((shift) => Number(shift?.id)).filter(Boolean) : [];
  const latestGeneratedShiftId = generatedShiftIds[0] || null;
  const sourceShiftId = Number(bridge?.sourceShiftId || 0) || null;
  return {
    sourceShiftId,
    generatedShiftIds,
    latestGeneratedShiftId,
    // The public relationship answer resolves to the commercial source
    // shift when it exists. Generated shifts remain separately observable.
    shiftId: sourceShiftId || latestGeneratedShiftId,
  };
}

async function readAgreements(user, role, plan = null) {
  const agreementEntities = planEntities(plan, "agreement");
  const agreementStatusScope = agreementEntities.length ? {} : { status: { in: REVIEW_AGREEMENT_STATUSES } };
  const base = role === "ROOM"
    ? { roomId: integer(user?.roomId) || -1, ...agreementStatusScope }
    : role === "SUPER_ADMIN"
      ? { ...agreementStatusScope }
      : { ...companyFilter(user), ...agreementStatusScope };
  const shiftEntities = planEntities(plan, "shift");
  const where = agreementEntities.length
    ? { ...base, id: { in: agreementEntities.map((entity) => entity.id) } }
    : shiftEntities.length
      ? { ...base, shifts: { some: { id: { in: shiftEntities.map((entity) => entity.id) } } } }
      : base;
  const rows = await prisma.agreement.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      startDate: true,
      endDate: true,
      startMin: true,
      endMin: true,
      roomId: true,
      companyId: true,
      vehicleId: true,
      driverId: true,
      extendStatus: true,
      extendRequestedEndDate: true,
      extendOfferNote: true,
      extendCounterNote: true,
      companyOfferNote: true,
      roomOfferNote: true,
      companyOfferAmount: true,
      roomOfferAmount: true,
      vehicle: { select: { plate: true } },
      driver: { select: { fullName: true } },
      shifts: {
        orderBy: { startAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          startAt: true,
          endAt: true,
          _count: { select: { stops: true, people: true } },
        },
      },
    },
  });
  const agreementBridgeById = await buildAgreementOpsBridgeById({
    agreementIds: rows.map((row) => row.id),
    companyId: role === "ROOM" || role === "SUPER_ADMIN" ? null : integer(user?.companyId),
    roomId: role === "ROOM" ? integer(user?.roomId) : null,
  });
  const facts = rows.map((row) => {
    const bridge = agreementBridgeById[Number(row.id)] || null;
    const linkedShift = row.shifts[0] || null;
    const relation = projectAgreementCanonicalRelation(row, bridge);
    const startTime = minuteText(row.startMin);
    const endTime = minuteText(row.endMin);
    const startDate = dateOnlyText(row.startDate);
    const endDate = dateOnlyText(row.endDate);
    return {
      id: row.id,
      agreementId: row.id,
      status: row.status,
      statusText: statusText(row.status),
      updatedAt: row.updatedAt,
      date: row.updatedAt,
      dateText: dateText(row.updatedAt),
      startDate: row.startDate,
      endDate: row.endDate,
      startDateText: startDate,
      endDateText: endDate,
      startTime,
      endTime,
      startAtText: [startDate, startTime].filter(Boolean).join(" "),
      endAtText: [endDate, endTime].filter(Boolean).join(" "),
      startMin: row.startMin,
      endMin: row.endMin,
      agreementStatus: statusText(row.status),
      roomId: row.roomId,
      companyId: row.companyId,
      vehicleId: row.vehicleId,
      driverId: row.driverId,
      vehiclePlate: row.vehicle?.plate || null,
      driverName: row.driver?.fullName || null,
      shiftIds: relation.generatedShiftIds,
      ...relation,
      stopCount: Number(linkedShift?._count?.stops || 0),
      personnelCount: Number(linkedShift?._count?.people || 0),
      personelCount: Number(linkedShift?._count?.people || 0),
      extendStatus: row.extendStatus,
      companyOfferAmount: row.companyOfferAmount,
      companyOfferAmountText: amountText(row.companyOfferAmount),
      roomOfferAmount: row.roomOfferAmount,
      roomOfferAmountText: amountText(row.roomOfferAmount),
      reason: agreementReason(row),
      reasonText: agreementReason(row),
      text: `Sözleşme #${row.id} • ${statusText(row.status)}${startDate || endDate ? ` • ${[startDate, endDate].filter(Boolean).join(" – ")}` : ""}${agreementReason(row) ? ` • ${agreementReason(row)}` : ""}`,
      evidence: [
        `agreement.id=${row.id}`,
        `agreement.sourceShiftId=${relation.sourceShiftId || "none"}`,
        `agreement.generatedShifts=${relation.generatedShiftIds.join(",") || "none"}`,
      ],
    };
  });
  return {
    domain: "AGREEMENTS",
    count: rows.length,
    records: facts.slice(0, 5).map(factText),
    facts,
    nextAction: rows.length ? "Önce sözleşme koşullarını ve bağlı vardiya bilgisini incele; onay gerekiyorsa son kararı sen ver." : "Bekleyen sözleşme görünmüyor.",
  };
}

async function readShifts(user, role, onlyMissingAssignment = false, plan = null) {
  let base = role === "ROOM" ? { roomId: integer(user?.roomId) || -1 } : role === "SUPER_ADMIN" ? {} : companyFilter(user);
  if (role === "DRIVER") {
    const driver = await prisma.driver.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true } });
    base = { driverId: driver?.id || -1 };
  } else if (role === "PERSONEL") {
    const personel = await prisma.personel.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true } });
    const personelId = personel?.id || -1;
    base = { OR: [{ people: { some: { personelId } } }, { pickupRequests: { some: { personelId } } }, { assignments: { some: { personelId } } }] };
  } else if (role === "PARENT") {
    const links = await prisma.parentChild.findMany({ where: { parentUserId: integer(user?.id) || -1 }, select: { personelId: true } });
    const personelIds = links.map((row) => row.personelId).filter((value) => Number.isInteger(value) && value > 0);
    const scopedPersonelIds = personelIds.length ? personelIds : [-1];
    base = { OR: [{ people: { some: { personelId: { in: scopedPersonelIds } } } }, { pickupRequests: { some: { personelId: { in: scopedPersonelIds } } } }, { assignments: { some: { personelId: { in: scopedPersonelIds } } } }] };
  }
  const shiftEntities = planEntities(plan, "shift");
  const offerEntities = planEntities(plan, "offer");
  const vehicleEntities = planEntities(plan, "vehicle");
  const relationShiftEntities = shiftEntities.filter((entity) => entity.source === "OFFER_RELATION");
  const directShiftEntities = shiftEntities.filter((entity) => entity.source !== "OFFER_RELATION");
  const explicitShift = directShiftEntities.length > 0;
  let relatedOfferShiftIds = [];
  if (offerEntities.length) {
    const offerScope = role === "ROOM"
      ? { roomId: integer(user?.roomId) || -1 }
      : role === "SUPER_ADMIN"
        ? {}
        : { shift: { is: { companyId: integer(user?.companyId) || -1 } } };
    const linkedOffers = await prisma.shiftOffer.findMany({
      where: { ...offerScope, id: { in: offerEntities.map((entity) => entity.id) } },
      select: { shiftId: true },
    });
    relatedOfferShiftIds = linkedOffers.map((row) => Number(row.shiftId)).filter(Boolean);
  }
  const relationIds = relationShiftEntities.map((entity) => Number(entity.id)).filter((id) => relatedOfferShiftIds.includes(id));
  const relationOnly = relationIds.length > 0 && !explicitShift;
  const temporal = explicitShift || relationIds.length || vehicleEntities.length ? {} : temporalWhere(plan?.temporalMode);
  const scopedBase = relationOnly && role === "ROOM" ? {} : base;
  const where = {
    ...scopedBase,
    ...(explicitShift ? { id: { in: directShiftEntities.map((entity) => entity.id) } } : relationIds.length ? { id: { in: relationIds } } : temporal),
    ...(vehicleEntities.length ? {
      vehicle: {
        is: vehicleEntities.some((entity) => entity.id)
          ? { id: { in: vehicleEntities.map((entity) => entity.id).filter(Boolean) } }
          : { plate: { in: vehicleEntities.map((entity) => entity.plate).filter(Boolean) } },
      },
    } : {}),
    ...(onlyMissingAssignment ? { AND: [{ OR: [{ vehicleId: null }, { driverId: null }] }] } : {}),
  };
  let rows = await prisma.shift.findMany({
    where,
    orderBy: { startAt: "asc" },
    take: 20,
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      vehicleId: true,
      driverId: true,
      vehicle: { select: { plate: true } },
      driver: { select: { fullName: true } },
      _count: { select: { stops: true, people: true } },
    },
  });
  const facts = rows.map((row) => ({
    id: row.id,
    shiftId: row.id,
    status: row.status,
    statusText: statusText(row.status),
    startAt: row.startAt,
    endAt: row.endAt,
    startAtText: dateText(row.startAt),
    endAtText: dateText(row.endAt),
    startTime: row.startAt ? new Date(row.startAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "",
    endTime: row.endAt ? new Date(row.endAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "",
    date: row.startAt,
    dateText: dateText(row.startAt),
    vehicle: row.vehicle?.plate || null,
    vehiclePlate: row.vehicle?.plate || null,
    driver: role === "SUPER_ADMIN" ? (row.driverId ? `Sürücü #${row.driverId}` : null) : (row.driver?.fullName || null),
    driverName: role === "SUPER_ADMIN" ? (row.driverId ? `Sürücü #${row.driverId}` : null) : (row.driver?.fullName || null),
    reason: [
      row.vehicle?.plate ? `Araç ${row.vehicle.plate}` : "Araç ataması eksik",
      row.driver?.fullName ? `Sürücü ${role === "SUPER_ADMIN" ? `#${row.driverId}` : row.driver.fullName}` : "Sürücü ataması eksik",
    ].join("; "),
    vehicleId: row.vehicleId,
    driverId: row.driverId,
    stopCount: Number(row._count?.stops || 0),
    personnelCount: Number(row._count?.people || 0),
    personelCount: Number(row._count?.people || 0),
    text: `Vardiya #${row.id} • ${temporalLabel(temporalState(row.startAt, row.endAt, row.status))} • ${statusText(row.status)} • ${row.vehicle?.plate ? `Araç ${row.vehicle.plate}` : "Araç eksik"} • ${row.driver?.fullName ? `Sürücü ${role === "SUPER_ADMIN" ? `#${row.driverId}` : row.driver.fullName}` : "Sürücü eksik"} • ${dateText(row.startAt)}`,
    evidence: [`shift.id=${row.id}`, `shift.vehicleId=${row.vehicleId || "none"}`, `shift.driverId=${row.driverId || "none"}`],
  }));
  return {
    domain: "SHIFTS",
    count: rows.length,
    records: facts.slice(0, 5).map(factText),
    facts,
    nextAction: rows.length ? "Önce vardiya, araç ve sürücü bağını birlikte kontrol et." : "Bugün için yetkili vardiya kaydı görünmüyor.",
  };
}

function formatMoneyMinor(amountMinor, currencyCode = "TRY") {
  const amount = Number(amountMinor);
  if (!Number.isFinite(amount)) return "tutar yok";
  return `${(amount / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode || "TRY"}`;
}

function buildBudgetComparison(rows) {
  const comparable = (Array.isArray(rows) ? rows : [])
    .filter((row) => Number.isFinite(Number(row?.budgetAmountMinor)))
    .sort((a, b) => {
      const aDate = new Date(a?.periodStart || a?.updatedAt || 0).getTime();
      const bDate = new Date(b?.periodStart || b?.updatedAt || 0).getTime();
      return bDate - aDate || Number(b?.id || 0) - Number(a?.id || 0);
    });
  const current = comparable.find((row) => normalizeStatus(row.status) !== "ARCHIVED") || null;
  const previous = comparable.find((row) => Number(row?.id) !== Number(current?.id)) || null;
  if (!current || !previous) return null;
  const currentAmount = Number(current.budgetAmountMinor);
  const previousAmount = Number(previous.budgetAmountMinor);
  const delta = currentAmount - previousAmount;
  return {
    currentId: current.id,
    previousId: previous.id,
    direction: delta > 0 ? "artış" : delta < 0 ? "azalış" : "benzer seviyede",
    previousAmountText: formatMoneyMinor(previousAmount, current.currencyCode),
    currentAmountText: formatMoneyMinor(currentAmount, current.currencyCode),
    deltaText: formatMoneyMinor(Math.abs(delta), current.currencyCode),
  };
}

async function readVehicles(user, role, plan = null) {
  const vehicleEntities = planEntities(plan, "vehicle");
  const shiftEntities = planEntities(plan, "shift");
  let where = role === "ROOM"
    ? { roomId: integer(user?.roomId) || -1, archivedAt: null }
    : role === "SUPER_ADMIN"
      ? { archivedAt: null }
    : role === "COMPANY" || role === "SCHOOL" || role === "ORGANIZATION"
      ? { archivedAt: null, shifts: { some: { companyId: integer(user?.companyId) || -1 } } }
      : { archivedAt: null, driver: { is: { userId: integer(user?.id) || -1 } } };
  if (role === "DRIVER" && !vehicleEntities.length && !shiftEntities.length && !["HISTORICAL", "COMPLETED", "ARCHIVED"].includes(String(plan?.temporalMode || "UNKNOWN").toUpperCase())) {
    const now = new Date();
    where = {
      archivedAt: null,
      driver: { is: { userId: integer(user?.id) || -1 } },
      shifts: {
        some: {
          startAt: { lte: now },
          endAt: { gte: now },
          status: { in: CURRENT_DRIVER_SHIFT_STATUSES },
          driver: { is: { userId: integer(user?.id) || -1 } },
        },
      },
    };
  }
  if (role === "PERSONEL" || role === "PARENT") {
    const { start, end } = dayWindow();
    const currentWindow = {
      status: { in: ACTIVE_SHIFT_STATUSES },
      startAt: { lt: end },
      endAt: { gte: start },
    };
    const relationScope = role === "PERSONEL"
      ? {
        OR: [
          { people: { some: { personel: { userId: integer(user?.id) || -1 } } } },
          { pickupRequests: { some: { personel: { userId: integer(user?.id) || -1 } } } },
          { assignments: { some: { personel: { userId: integer(user?.id) || -1 } } } },
        ],
      }
      : {
        OR: [
          { people: { some: { personel: { parentLinks: { some: { parentUserId: integer(user?.id) || -1 } } } } } },
          { pickupRequests: { some: { personel: { parentLinks: { some: { parentUserId: integer(user?.id) || -1 } } } } } },
          { assignments: { some: { personel: { parentLinks: { some: { parentUserId: integer(user?.id) || -1 } } } } } },
        ],
      };
    const shiftWhere = vehicleEntities.length ? relationScope : { ...currentWindow, ...relationScope };
    const shifts = await prisma.shift.findMany({ where: shiftWhere, take: 100, select: { vehicleId: true } });
    const vehicleIds = shifts.map((row) => Number(row.vehicleId)).filter(Boolean);
    where = { archivedAt: null, id: { in: vehicleIds.length ? vehicleIds : [-1] } };
  }
  if (shiftEntities.length) {
    where = {
      ...where,
      shifts: {
        some: {
          id: { in: shiftEntities.map((entity) => entity.id) },
          ...(role === "ROOM" ? {} : role === "SUPER_ADMIN" ? {} : { companyId: integer(user?.companyId) || -1 }),
        },
      },
    };
  }
  if (vehicleEntities.length) {
    const idFilter = vehicleEntities.map((entity) => entity.id).filter(Boolean);
    const plateFilter = vehicleEntities.map((entity) => entity.plate).filter(Boolean);
    const entityFilter = idFilter.length ? { id: { in: idFilter } } : { plate: { in: plateFilter } };
    where = { AND: [where, entityFilter] };
  }
  const rows = await prisma.vehicle.findMany({
    where,
    take: 100,
    orderBy: { plate: "asc" },
    select: { id: true, plate: true, gpsLast: { select: { at: true, status: true } }, gpsState: { select: { lastUiStatus: true } } },
  });
  const issues = rows.filter(staleGps);
  const explicitVehicle = vehicleEntities.length > 0;
  const visibleRows = explicitVehicle ? rows : issues;
  const facts = rows.map((row) => ({
    id: row.id,
    vehicleId: row.id,
    plate: row.plate,
    vehiclePlate: row.plate,
    gpsStatus: row.gpsState?.lastUiStatus || row.gpsLast?.status || "UNKNOWN",
    gpsAt: row.gpsLast?.at || null,
    freshness: gpsFreshness(row),
    freshnessAt: row.gpsLast?.at || null,
    text: `Araç ${row.plate} • ${staleGps(row) ? "Konum bilgisi güncel değil" : "Konum bağlantısı güncel"}`,
    evidence: [`vehicle.id=${row.id}`, `vehicle.plate=${row.plate}`],
  }));
  return {
    domain: "VEHICLES",
    count: explicitVehicle ? rows.length : issues.length,
    totalCount: rows.length,
    records: visibleRows.slice(0, 5).map((row) => `Araç ${row.plate} • ${staleGps(row) ? "Konum bilgisi güncel değil" : "Konum bağlantısı güncel"}`),
    facts: facts.filter((fact) => visibleRows.some((row) => row.id === fact.vehicleId)),
    nextAction: issues.length ? "Önce ilgili aracın konum bağlantısını ve son sinyal zamanını kontrol et." : "Yetkili araçlarda açık konum sorunu görünmüyor.",
  };
}

function etaSummary(row, role, personelTargets = []) {
  const state = temporalState(row?.startAt, row?.endAt, row?.status);
  if (state === "UPCOMING") return "Tahmini süre: Servis henüz başlamadı";
  if (state !== "ACTIVE_TODAY") return "Tahmini süre: Güncel servis aktif değil";
  const gps = row?.vehicle?.gpsLast;
  if (!gps || staleGps(row.vehicle)) return "Tahmini süre hesaplanamıyor: güncel konum yok";
  const assignmentTarget = row?.assignments?.[0]?.stop;
  const pickupTarget = row?.pickupRequests?.[0];
  const targetPersonelId = row?.assignments?.[0]?.personelId ?? pickupTarget?.personelId;
  const personelTarget = personelTargets.find((item) => item.id === targetPersonelId);
  const targetLat = Number(assignmentTarget?.lat ?? pickupTarget?.lat ?? personelTarget?.homeLat);
  const targetLng = Number(assignmentTarget?.lng ?? pickupTarget?.lng ?? personelTarget?.homeLng);
  const originLat = Number(gps.lat);
  const originLng = Number(gps.lng);
  if (![targetLat, targetLng, originLat, originLng].every(Number.isFinite)) {
    return role === "PARENT" || role === "PERSONEL"
      ? "Tahmini süre hesaplanamıyor: yetkili hedef durak/konum yok"
      : "Tahmini süre hesaplanamıyor: hedef durak yok";
  }
  const distanceKm = haversineKm(originLat, originLng, targetLat, targetLng);
  const speedKmh = Number(gps.speed) > 5 ? Number(gps.speed) : 30;
  const eta = Math.max(1, Math.round(etaMinutes(distanceKm, speedKmh)));
  return `Tahmini süre ${eta} dk`;
}

async function readOperations(user, role, plan = null) {
  let base = role === "ROOM" ? { roomId: integer(user?.roomId) || -1 } : role === "SUPER_ADMIN" ? {} : { companyId: integer(user?.companyId) || -1 };
  let scopedPersonelIds = [];
  if (role === "DRIVER") {
    const driver = await prisma.driver.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true } });
    base = { driverId: driver?.id || -1 };
  } else if (role === "PERSONEL") {
    const personel = await prisma.personel.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true } });
    const personelId = personel?.id || -1;
    scopedPersonelIds = personel?.id ? [personel.id] : [];
    base = { OR: [{ people: { some: { personelId } } }, { pickupRequests: { some: { personelId } } }, { assignments: { some: { personelId } } }] };
  } else if (role === "PARENT") {
    const links = await prisma.parentChild.findMany({ where: { parentUserId: integer(user?.id) || -1 }, select: { personelId: true } });
    const personelIds = links.map((row) => row.personelId).filter((value) => Number.isInteger(value) && value > 0);
    scopedPersonelIds = personelIds;
    const allowedPersonelIds = personelIds.length ? personelIds : [-1];
    base = { OR: [{ people: { some: { personelId: { in: allowedPersonelIds } } } }, { pickupRequests: { some: { personelId: { in: allowedPersonelIds } } } }, { assignments: { some: { personelId: { in: allowedPersonelIds } } } }] };
  }
  const personnelEntities = planEntities(plan, "personnel");
  const requestedPersonelIds = personnelEntities.map((entity) => Number(entity.id)).filter((id) => Number.isInteger(id) && id > 0);
  const shiftSelect = {
    id: true,
    vehicleId: true,
    driverId: true,
    startAt: true,
    endAt: true,
    status: true,
    vehicle: { select: { plate: true, gpsLast: { select: { at: true, status: true, lat: true, lng: true, speed: true } }, gpsState: { select: { lastUiStatus: true } } } },
    driver: { select: { fullName: true } },
    stops: { orderBy: { order: "asc" }, take: 10, select: { id: true, name: true, order: true, state: true } },
    ...(scopedPersonelIds.length ? {
      assignments: {
        where: { personelId: { in: scopedPersonelIds } },
        take: 5,
        select: { personelId: true, stop: { select: { name: true, lat: true, lng: true, order: true, state: true } } },
      },
      pickupRequests: {
        where: { personelId: { in: scopedPersonelIds }, status: "OPEN" },
        take: 5,
        select: { personelId: true, lat: true, lng: true, status: true },
      },
    } : {}),
  };
  const shiftEntities = planEntities(plan, "shift");
  const vehicleEntities = planEntities(plan, "vehicle");
  const driverEntities = planEntities(plan, "driver");
  const temporal = shiftEntities.length ? {} : temporalWhere(plan?.temporalMode);
  const entityWhere = shiftEntities.length
    ? { id: { in: shiftEntities.map((entity) => entity.id) } }
    : vehicleEntities.length
      ? { vehicle: { is: vehicleEntities.some((entity) => entity.id)
        ? { id: { in: vehicleEntities.map((entity) => entity.id).filter(Boolean) } }
        : { plate: { in: vehicleEntities.map((entity) => entity.plate).filter(Boolean) } } } }
      : driverEntities.length
        ? { driver: { is: { id: { in: driverEntities.map((entity) => entity.id) } } } }
        : {};
  const selectedPersonnelScope = requestedPersonelIds.length
    ? { OR: [{ people: { some: { personelId: { in: requestedPersonelIds } } } }, { pickupRequests: { some: { personelId: { in: requestedPersonelIds } } } }, { assignments: { some: { personelId: { in: requestedPersonelIds } } } }] }
    : null;
  let rows = await prisma.shift.findMany({
    where: { AND: [base, temporal, entityWhere, selectedPersonnelScope].filter(Boolean) },
    orderBy: { startAt: "asc" },
    take: 10,
    select: shiftSelect,
  });
  const personelTargets = scopedPersonelIds.length
    ? await prisma.personel.findMany({ where: { id: { in: scopedPersonelIds } }, select: { id: true, homeLat: true, homeLng: true } })
    : [];
  const facts = rows.map((row) => {
    const plate = row.vehicle?.plate || "Araç atanmadı";
    const driverLabel = role === "SUPER_ADMIN"
      ? (row.driverId ? `Sürücü #${row.driverId}` : null)
      : (row.driver?.fullName || null);
    const gps = row.vehicle?.gpsState?.lastUiStatus || row.vehicle?.gpsLast?.status || "Konum sinyali yok";
    const stopCount = Array.isArray(row.stops) ? row.stops.length : 0;
    const nextStop = row.stops?.find((stop) => !["DONE", "REACHED", "SKIPPED"].includes(String(stop.state || "").toUpperCase()))?.name || row.stops?.[0]?.name || "Sıradaki durak yok";
    const state = temporalState(row.startAt, row.endAt, row.status);
    const eta = etaSummary(row, role, personelTargets);
    return {
      id: row.id,
      shiftId: row.id,
      personelId: requestedPersonelIds.length === 1 ? requestedPersonelIds[0] : null,
      status: row.status,
      vehicle: plate === "Araç atanmadı" ? null : plate,
      vehiclePlate: plate === "Araç atanmadı" ? null : plate,
      driver: driverLabel,
      driverName: driverLabel,
      gpsStatus: statusText(gps),
      locationStatus: statusText(gps),
      freshness: gpsFreshness(row.vehicle),
      freshnessAt: row.vehicle?.gpsLast?.at || null,
      eta,
      etaText: eta,
      nextStop,
      stopCount,
      text: `Vardiya #${row.id} • ${temporalLabel(state)} • Araç ${plate} • ${driverLabel ? `Sürücü ${driverLabel}` : "Sürücü atanmamış"} • Konum ${statusText(gps)} • ${eta} • ${stopCount} durak • Sıradaki ${nextStop}`,
      evidence: [`shift.id=${row.id}`, `shift.vehicle=${plate}`, `shift.driver=${role === "SUPER_ADMIN" ? (row.driverId ? `#${row.driverId}` : "none") : (row.driver?.fullName || "none")}`],
    };
  });
  // The parent live screen explicitly exposes a selected child with no active
  // service/vehicle. That is an authorized negative fact, not missing context.
  // Emit it only for the selected, already-authorized child and never infer a
  // historical vehicle or a different child's assignment.
  if (role === "PARENT" && requestedPersonelIds.length === 1 && facts.length === 0) {
    const personelId = requestedPersonelIds[0];
    facts.push({
      personelId,
      entityType: "personnel",
      vehicle: null,
      vehiclePlate: null,
      vehicleState: "Aktif servis/araç görünmüyor (Araç: 0)",
      noActiveVehicleText: "Aktif servis/araç görünmüyor (Araç: 0)",
      stopCount: 0,
      personnelCount: 1,
      statusText: "Aktif servis görünmüyor",
      text: `Öğrenci/personel #${personelId} • Aktif servis görünmüyor • Araç: 0`,
      evidence: [`personel.id=${personelId}`, "parent.liveVehicle=none"],
    });
  }
  const records = facts.slice(0, 5).map(factText);
  const stale = rows.filter((row) => row.vehicle && staleGps(row.vehicle)).length;
  const parentAccessCount = role === "SCHOOL"
    ? await prisma.parentChild.count({ where: { child: { companyId: integer(user?.companyId) || -1 } } })
    : null;
  if (role === "SCHOOL") records.push(`Veli erişimi • ${parentAccessCount || 0} yetkili çocuk bağlantısı`);
  return {
    domain: "OPERATIONS",
    count: facts.length,
    issueCount: stale,
    records,
    facts,
    temporalStates: rows.map((row) => temporalState(row.startAt, row.endAt, row.status)),
    etaAvailableCount: rows.filter((row) => etaSummary(row, role, personelTargets).startsWith("Tahmini süre ") && !etaSummary(row, role, personelTargets).includes("hesaplanamıyor")).length,
    nextAction: stale > 0 ? "Önce araç cihazı ve konum bağlantısını kontrol et; ardından sıradaki durağın durumunu ve tahmini süreyi yeniden doğrula." : (rows.length ? "Önce bugünkü vardiyanı, araç/sürücü bağını ve sıradaki durağı kontrol et." : "Bugün için yetkili operasyon kaydı görünmüyor."),
  };
}

async function readDrivers(user, role, plan = null) {
  const base = role === "ROOM"
    ? { roomId: integer(user?.roomId) || -1 }
    : role === "SUPER_ADMIN"
      ? {}
    : role === "COMPANY" || role === "SCHOOL" || role === "ORGANIZATION"
      ? { shifts: { some: { companyId: integer(user?.companyId) || -1 } } }
      : { userId: integer(user?.id) || -1 };
  const driverEntities = planEntities(plan, "driver");
  const shiftEntities = planEntities(plan, "shift");
  const where = driverEntities.length
    ? { ...base, id: { in: driverEntities.map((entity) => entity.id) } }
    : shiftEntities.length
      ? { ...base, shifts: { some: { id: { in: shiftEntities.map((entity) => entity.id) } } } }
      : base;
  const rows = await prisma.driver.findMany({ where, take: 100, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, userId: true } });
  const facts = rows.map((row) => ({
    id: row.id,
    driverId: row.id,
    driver: role === "SUPER_ADMIN" ? `Sürücü #${row.id}` : row.fullName,
    driverName: role === "SUPER_ADMIN" ? `Sürücü #${row.id}` : row.fullName,
    userId: row.userId,
    text: `Sürücü ${role === "SUPER_ADMIN" ? `#${row.id}` : row.fullName}${row.userId ? " • giriş bağlı" : " • giriş bağlı değil"}`,
    evidence: [`driver.id=${row.id}`, role === "SUPER_ADMIN" ? "driver.fullName=protected" : `driver.fullName=${row.fullName}`],
  }));
  return {
    domain: "DRIVERS",
    count: rows.length,
    records: facts.slice(0, 5).map(factText),
    facts,
    nextAction: rows.length ? "Sürücü listesini vardiya atamalarıyla birlikte kontrol et." : "Yetkili sürücü kaydı görünmüyor.",
  };
}

async function readPersonnel(user, role, plan = null) {
  let where = role === "PERSONEL" ? { userId: integer(user?.id) || -1 } : role === "SUPER_ADMIN" ? {} : companyFilter(user);
  if (role === "PARENT") {
    const links = await prisma.parentChild.findMany({ where: { parentUserId: integer(user?.id) || -1 }, select: { personelId: true } });
    where = { id: { in: links.map((row) => row.personelId).length ? links.map((row) => row.personelId) : [-1] } };
  }
  const personnelEntities = planEntities(plan, "personnel");
  if (personnelEntities.length) {
    const ids = personnelEntities.map((entity) => Number(entity.id)).filter((id) => Number.isInteger(id) && id > 0);
    where = { AND: [where, { id: { in: ids.length ? ids : [-1] } }] };
  }
  if (plan?.semanticEntityType === "STUDENT") where = { ...where, kind: "STUDENT" };
  if (plan?.semanticEntityType === "PERSONNEL") where = { ...where, kind: "PERSONEL" };
  const rows = await prisma.personel.findMany({ where, take: 100, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, kind: true } });
  const facts = rows.map((row) => ({
    personLabel: role === "SUPER_ADMIN" ? `${row.kind === "STUDENT" ? "Öğrenci" : "Personel"} #${row.id}` : row.fullName,
    id: row.id,
    personelId: row.id,
    person: role === "SUPER_ADMIN" ? `${row.kind === "STUDENT" ? "Öğrenci" : "Personel"} #${row.id}` : row.fullName,
    kind: row.kind,
    text: `${row.kind === "STUDENT" ? "Öğrenci" : "Personel"}: ${role === "SUPER_ADMIN" ? `#${row.id}` : row.fullName}`,
    evidence: [`personel.id=${row.id}`, `personel.kind=${row.kind}`],
  }));
  return {
    domain: "PERSONNEL",
    count: rows.length,
    records: facts.slice(0, 5).map(factText),
    facts,
    nextAction: rows.length ? "Kişi kayıtlarını bağlı servis ve vardiya bilgisiyle birlikte kontrol et." : "Yetkili kişi kaydı görünmüyor.",
  };
}

async function readParentLinks(user, role) {
  const userId = integer(user?.id) || -1;
  let where = {};
  if (role === "PARENT") {
    where = { parentUserId: userId };
  } else if (role === "PERSONEL") {
    const personel = await prisma.personel.findFirst({ where: { userId }, select: { id: true } });
    where = { personelId: personel?.id || -1 };
  } else if (role !== "SUPER_ADMIN") {
    where = { child: companyFilter(user) };
  }
  const rows = await prisma.parentChild.findMany({ where, select: { parentUserId: true }, distinct: ["parentUserId"] });
  return {
    domain: "PERSONNEL",
    count: rows.length,
    records: [],
    facts: [],
    nextAction: rows.length ? "Yetkili veli bağlantılarının bağlı çocuk kayıtlarını ayrıca doğrula." : "Yetkili veli kaydı görünmüyor.",
  };
}

async function readServiceRequests(user, role) {
  let personelIds = [];
  if (role === "PERSONEL") {
    const personel = await prisma.personel.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true } });
    if (personel?.id) personelIds = [personel.id];
  } else if (role === "PARENT") {
    const links = await prisma.parentChild.findMany({ where: { parentUserId: integer(user?.id) || -1 }, select: { personelId: true } });
    personelIds = links.map((row) => Number(row.personelId)).filter((id) => Number.isInteger(id) && id > 0);
  }
  const rows = personelIds.length
    ? await prisma.pickupRequest.findMany({
      where: { personelId: { in: personelIds }, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, shiftId: true, createdAt: true },
    })
    : [];
  const facts = rows.map((row) => ({
    id: row.id,
    requestId: row.id,
    shiftId: row.shiftId,
    requestStatus: statusText(row.status),
    text: `Servis talebi #${row.id} • Vardiya #${row.shiftId} • ${statusText(row.status)} • ${dateText(row.createdAt)}`,
    evidence: [`pickupRequest.id=${row.id}`, `pickupRequest.shiftId=${row.shiftId}`],
  }));
  return {
    domain: "SERVICE_REQUESTS",
    count: rows.length,
    records: facts.slice(0, 5).map(factText),
    facts,
    nextAction: rows.length ? "Önce servis talebinin bağlı vardiya ve durak etkisini incele; değişiklik veya onay gerekiyorsa açık karar ver." : "Yetkili hesabın için bekleyen servis talebi görünmüyor.",
  };
}

async function readOrganizationPlans(user, plan = null) {
  const companyId = integer(user?.companyId) || -1;
  const entities = planEntities(plan, "organizationPlan");
  const rows = await prisma.organizationPlan.findMany({
    where: {
      companyId,
      status: { in: ORGANIZATION_PLAN_STATUSES },
      ...(entities.length ? { id: { in: entities.map((entity) => entity.id) } } : {}),
    },
    orderBy: [{ planDate: "desc" }, { updatedAt: "desc" }],
    take: 20,
    select: {
      id: true,
      title: true,
      planDate: true,
      startMin: true,
      endMin: true,
      status: true,
      publishedShiftId: true,
      linkedAgreementId: true,
      updatedAt: true,
      _count: { select: { stops: true, shifts: true } },
    },
  });
  const facts = rows.map((row) => ({
    id: row.id,
    planId: row.id,
    plan: row.title,
    planStatus: statusText(row.status),
    title: row.title,
    shiftId: row.publishedShiftId,
    agreementId: row.linkedAgreementId,
    text: `Plan #${row.id} • ${row.title} • ${statusText(row.status)} • ${dateText(row.planDate)} • ${row._count.stops} durak • ${row._count.shifts} vardiya`,
    evidence: [`organizationPlan.id=${row.id}`, `organizationPlan.publishedShiftId=${row.publishedShiftId || "none"}`],
  }));
  return {
    domain: "ORGANIZATION_PLANS",
    count: rows.length,
    records: facts.slice(0, 8).map(factText),
    facts,
    nextAction: rows.length ? "Önce planın tarih, durak ve vardiya bağını doğrula; plan yayınlama veya sözleşme adımını açık onay olmadan başlatmıyorum." : "Yetkili organizasyon planı görünmüyor.",
  };
}

async function readFinance(user, role, budgetOnly = false) {
  const where = role === "ROOM" ? { roomId: integer(user?.roomId) || -1 } : role === "SUPER_ADMIN" ? {} : companyFilter(user);
  const [hakedis, invoices, budgets] = await Promise.all([
    prisma.hakedisRecord.findMany({ where: { ...where, status: "READY" }, take: 10, orderBy: { updatedAt: "desc" }, select: { id: true, reference: true, amountMinor: true, currencyCode: true } }),
    prisma.invoiceRecord.findMany({ where, take: 10, orderBy: { updatedAt: "desc" }, select: { id: true, reference: true, status: true, amountMinor: true, currencyCode: true } }),
    role === "ROOM" ? Promise.resolve([]) : prisma.companyBudgetPlan.findMany({ where: role === "SUPER_ADMIN" ? {} : { companyId: integer(user?.companyId) || -1 }, take: 10, orderBy: { updatedAt: "desc" }, select: { id: true, status: true, budgetAmountMinor: true, currencyCode: true, periodStart: true, periodEnd: true, budgetSource: true, warningThresholdBps: true, updatedAt: true } }),
  ]);
  const facts = [
    ...hakedis.map((row) => `Hakediş önizlemesi #${row.id} • ${row.amountMinor} ${row.currencyCode}`),
    ...invoices.map((row) => `Fatura önizlemesi #${row.id} • ${statusText(row.status)} • ${row.amountMinor} ${row.currencyCode}`),
    ...budgets.map((row) => `Bütçe planı #${row.id} • ${statusText(row.status)}${row.budgetAmountMinor != null ? ` • ${formatMoneyMinor(row.budgetAmountMinor, row.currencyCode)}` : ""}${row.periodStart ? ` • dönem ${dateText(row.periodStart)}` : ""}${row.warningThresholdBps ? ` • uyarı eşiği ${row.warningThresholdBps} baz puan` : ""}`),
  ];
  const structuredFacts = [
    ...hakedis.map((row) => ({ id: row.id, cost: row.amountMinor, amount: row.amountMinor, amountText: formatMoneyMinor(row.amountMinor, row.currencyCode), kind: "HAKEDIS", text: `Hakediş önizlemesi #${row.id} • ${row.amountMinor} ${row.currencyCode}` })),
    ...invoices.map((row) => ({ id: row.id, cost: row.amountMinor, amount: row.amountMinor, amountText: formatMoneyMinor(row.amountMinor, row.currencyCode), kind: "INVOICE", status: row.status, text: `Fatura önizlemesi #${row.id} • ${statusText(row.status)} • ${row.amountMinor} ${row.currencyCode}` })),
    ...budgets.map((row) => ({ id: row.id, budgetId: row.id, cost: row.budgetAmountMinor, amount: row.budgetAmountMinor, amountText: row.budgetAmountMinor != null ? formatMoneyMinor(row.budgetAmountMinor, row.currencyCode) : null, status: row.status, statusText: statusText(row.status), periodStart: row.periodStart, periodEnd: row.periodEnd, date: row.periodStart, dateText: dateText(row.periodStart), text: `Bütçe planı #${row.id} • ${statusText(row.status)}${row.budgetAmountMinor != null ? ` • ${formatMoneyMinor(row.budgetAmountMinor, row.currencyCode)}` : ""}${row.periodStart ? ` • dönem ${dateText(row.periodStart)}` : ""}` })),
  ];
  const records = facts;
  const comparison = buildBudgetComparison(budgets);
  const eligibleBudgetCount = budgets.filter((row) => Number.isFinite(Number(row?.budgetAmountMinor))).length;
  return {
    domain: budgetOnly ? "BUDGET" : "FINANCE",
    count: records.length,
    records: records.slice(0, 8),
    facts: structuredFacts,
    comparison,
    costEvidenceClassification: comparison
      ? {
        status: "COMPARABLE_PAIR",
        classification: comparison.direction === "artış" ? "SUPPORTS_INCREASE" : comparison.direction === "azalış" ? "REFUTES_INCREASE" : "NO_DIRECTIONAL_CHANGE",
        currentId: comparison.currentId,
        previousId: comparison.previousId,
      }
      : {
        status: "INSUFFICIENT_COMPARABLE_RECORDS",
        classification: "CANNOT_SUPPORT_INCREASE_CLAIM",
        observedRecordCount: budgets.length,
        eligibleBudgetCount,
        missingEvidence: ["current_budget", "previous_comparable_budget"],
      },
    nextAction: records.length ? "Bu kayıtları yalnızca önizleme ve kontrol amacıyla incele; ödeme veya muhasebe işlemi başlatılmaz." : "Yetkili güncel maliyet, bütçe veya mutabakat kaydı görünmüyor.",
  };
}

async function readTenantAccess(user, role) {
  const capabilities = getRoleDomainCapabilities(role).capabilities;
  const allowedDomains = Object.entries(capabilities)
    .filter(([, mode]) => mode === "ALLOW_READ" || mode === "CONDITIONAL_RECORD_SCOPE")
    .map(([domain]) => domain);
  const fact = {
    id: Number(user?.id) || null,
    role,
    companyKind: user?.companyKind || null,
    companyId: Number(user?.companyId) || null,
    roomId: Number(user?.roomId) || null,
    allowedDomainCount: allowedDomains.length,
    text: `Tenant erişimi • rol ${role} • ${allowedDomains.length} yetkili domain • tenant scope doğrulandı`,
    evidence: [`tenant.role=${role}`, `tenant.allowedDomains=${allowedDomains.join(",") || "none"}`],
  };
  return {
    domain: "TENANT_ACCESS",
    count: 1,
    records: [factText(fact)],
    facts: [fact],
    nextAction: "Tenant kapsamı ve izinli domain listesini izlemeye devam et; yazma veya kapsam genişletme işlemi başlatılmadı.",
  };
}

async function readNotifications(user, role) {
  const ids = { companyId: integer(user?.companyId), roomId: integer(user?.roomId), userId: integer(user?.id) };
  const or = [{ userId: ids.userId }];
  if (role === "DRIVER") {
    const driver = await prisma.driver.findFirst({ where: { userId: ids.userId || -1 }, select: { id: true } });
    if (driver?.id) or.push({ driverId: driver.id });
  }
  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role) && ids.companyId) or.push({ companyId: ids.companyId });
  if (role === "ROOM" && ids.roomId) or.push({ roomId: ids.roomId });
  const rows = await prisma.notification.findMany({ where: role === "SUPER_ADMIN" ? {} : { OR: or }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, type: true, createdAt: true } });
  const notificationTypeText = {
    STOP_REACHED: "Durak tamamlandı",
    MAINT_7D: "Bakım tarihi yaklaşıyor",
    GPS_OFFLINE: "Konum sinyali çevrim dışı",
    GPS_STALE: "Konum bilgisi güncel değil",
    OFFER_RECEIVED: "Yeni teklif geldi",
    AGREEMENT_REVIEW: "Sözleşme inceleme bekliyor",
  };
  return {
    domain: "NOTIFICATIONS",
    count: rows.length,
    records: rows.slice(0, 6).map((row) => `Bildirim #${row.id} • ${notificationTypeText[String(row.type || "").toUpperCase()] || "Yeni bildirim"} • ${dateText(row.createdAt)}`),
    nextAction: rows.length ? "Önce en yeni bildirimi açıp bağlı kayıt ve gereken kullanıcı kararını kontrol et." : "Yetkili güncel bildirim görünmüyor.",
  };
}

export function resolveAuthorizedProductDomains(user) {
  const role = roleKey(user);
  const capabilities = getRoleDomainCapabilities(role).capabilities;
  return {
    role,
    capabilities,
    domains: Object.entries(capabilities)
      .filter(([, mode]) => mode === "ALLOW_READ" || mode === "CONDITIONAL_RECORD_SCOPE")
      .map(([domain]) => domain),
  };
}

function factForPlanEntity(plan, facts = []) {
  const entity = plan?.entity || plan?.entities?.[0] || null;
  if (!entity) return facts[0] || null;
  return facts.find((fact) => {
    if (entity.type === "shift") return Number(fact?.shiftId ?? fact?.id) === Number(entity.id);
    if (entity.type === "agreement") return Number(fact?.agreementId ?? fact?.id) === Number(entity.id);
    if (entity.type === "offer") return Number(fact?.offerId ?? fact?.id) === Number(entity.id);
    if (entity.type === "vehicle") return entity.id ? Number(fact?.vehicleId ?? fact?.id) === Number(entity.id) : String(fact?.plate || fact?.vehiclePlate || "") === String(entity.plate || "");
    if (entity.type === "student" || entity.type === "personnel") return Number(fact?.personelId ?? fact?.id) === Number(entity.id);
    if (entity.type === "parent") return Number(fact?.parentUserId ?? fact?.id) === Number(entity.id);
    return false;
  }) || null;
}

function taskReasonForFact(plan, fact) {
  if (fact?.reasonText || fact?.reason) return String(fact.reasonText || fact.reason);
  if (plan?.entity?.type === "shift") {
    return [
      fact?.statusText || statusText(fact?.status),
      fact?.vehiclePlate ? `Araç ${fact.vehiclePlate}` : "Araç ataması eksik",
      fact?.driverName ? `Sürücü ${fact.driverName}` : "Sürücü ataması eksik",
    ].filter(Boolean).join(" • ");
  }
  if (plan?.entity?.type === "agreement") return `Sözleşme durumu: ${fact?.statusText || statusText(fact?.status) || "yetkili kayıtta yok"}.`;
  return "İstenen alanın yetkili kaydı birlikte doğrulandı.";
}

function taskNextStepForFact(plan, fact) {
  const entity = plan?.entity || plan?.entities?.[0] || null;
  const label = entity?.type === "shift" ? `Vardiya #${entity.id}` : entity?.type === "agreement" ? `Sözleşme #${entity.id}` : entity?.type === "vehicle" ? `Araç ${entity.plate || `#${entity.id}`}` : "İlgili kayıt";
  if (entity?.type === "shift") {
    if (!fact?.vehiclePlate && !fact?.vehicle) return `${label} için araç atamasını doğrula.`;
    if (!fact?.driverName && !fact?.driver) return `${label} için sürücü atamasını doğrula.`;
    if (/güncel değil|guncel degil|yok|offline/i.test(String(fact?.gpsStatus || fact?.locationStatus || ""))) return `${label} için araç cihazı ve GPS bağlantısını kontrol et; sonra konumu yeniden doğrula.`;
    return `${label} için bağlı araç, sürücü ve sıradaki durağı birlikte kontrol et.`;
  }
  if (entity?.type === "agreement") return `${label} için durum gerekçesini ve bağlı vardiya üretimini doğrula; onay veya değişiklik başlatma.`;
  if (entity?.type === "vehicle") return `${label} için son GPS zamanını ve bağlı aktif vardiyayı doğrula.`;
  return "İlgili yetkili kaydı açıp eksik bağı doğrula.";
}

function composeMultiPartExecutionReply({ plan, execution, baseReply }) {
  const slots = Array.isArray(plan?.requestedTaskSlots) ? plan.requestedTaskSlots : [];
  if (!slots.length || execution?.status === "UNAUTHORIZED") return { reply: baseReply, nextAction: execution?.recommendation };
  const fact = factForPlanEntity(plan, execution?.structuredFacts || []);
  const parts = [baseReply];
  if (slots.includes("ISSUE") && !/sorun (?:teşhisi|durumu)|doğrulanmış açık sorun/iu.test(String(baseReply || ""))) {
    const issue = fact?.riskStateText || fact?.qualityStateText
      ? `${fact.riskStateText ? `risk ${fact.riskStateText}` : ""}${fact.riskStateText && fact.qualityStateText ? ", " : ""}${fact.qualityStateText ? `kalite ${fact.qualityStateText}` : ""}`
      : "doğrulanmış açık sorun kanıtı görünmüyor";
    parts.push(`Sorun: ${issue}.`);
  }
  if (slots.includes("REASON") && !/\bgerekçe\s*:/iu.test(String(baseReply || ""))) parts.push(`Gerekçe: ${taskReasonForFact(plan, fact)}`);
  if (slots.includes("RESOLUTION")) {
    parts.push(`Çözüm yaklaşımı: ${taskNextStepForFact(plan, fact)} Uygulama öncesinde aynı yetkili kaydı yeniden doğrula.`);
  }
  // A selected record scopes a priority operation; it is not itself the
  // priority result. The query-plan executor already produces the grounded
  // ranked/selected priority with its reason and safe next step.
  if (slots.includes("PRIORITY") && !["PRIORITY", "RISK_RANKING", "COMPARISON"].includes(plan?.family)) {
    const label = plan?.entity ? `${plan.entity.type} #${plan.entity.id || plan.entity.plate}` : "İstenen yetkili kayıt";
    parts.push(`Öncelik: önce ${label}. Gerekçe: ${taskReasonForFact(plan, fact)}.`);
  }
  const nextAction = slots.includes("NEXT_STEP") ? taskNextStepForFact(plan, fact) : execution?.recommendation;
  if (slots.includes("NEXT_STEP")) parts.push(`Sonraki güvenli adım: ${nextAction}`);
  return { reply: parts.join(" "), nextAction };
}

export async function buildAuthorizedProductAwarenessAnswer({ user, message, screenContext = null, conversationState = null, semanticPlan: suppliedSemanticPlan = null }) {
  const role = roleKey(user);
  const normalizedMessage = normalize(message);
  // Service turns arrive with a canonical plan.  That plan is the semantic
  // authority: this read/authorization layer may resolve its authorized
  // domains, but may not infer a narrower domain from the raw wording again.
  // The raw fallback remains only for legacy callers that provide no plan.
  const hasCanonicalSemanticPlan = Boolean(suppliedSemanticPlan);
  const semanticPlan = suppliedSemanticPlan || resolveSemanticIntent({ user, message, screenContext, conversationState });
  const preflightFieldPrivacyDecision = resolveFieldPrivacyPolicy({ user, message, plan: semanticPlan });
  if (preflightFieldPrivacyDecision.status === "DENY") {
    const privacyPlan = { ...semanticPlan, family: "FIELD_PRIVACY_BOUNDARY", intentFamily: "FIELD_PRIVACY_BOUNDARY", fieldPrivacyDecision: preflightFieldPrivacyDecision };
    return {
      role,
      domain: "FIELD_PRIVACY_BOUNDARY",
      authorizationBoundary: true,
      privacyBoundary: true,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: fieldPrivacyBoundaryReply(preflightFieldPrivacyDecision),
      nextAction: "Güvenli durum özeti veya yetkili toplu gösterge iste.",
      source: "canonical-field-privacy-policy-v1",
      dataSources: ["alan gizliliği kuralları"],
      retrievedFacts: ["Korunan alan paylaşılmadı"],
      reasoning: "Ham kişisel bilgi, koordinat veya gizli alan paylaşılmadı; kayıt içeriği okunmadı.",
      priority: "Alan gizliliği sınırı",
      semanticPlan: privacyPlan,
    };
  }
  if (semanticPlan.clarificationNeed) {
    return {
      role,
      domain: "CLARIFICATION",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: "Birden fazla kayıt veya olası referans var; hangi kayıt ya da alanı kastettiğini netleştirir misin? Belirli kayıt kimliği olmadan varsayılan veya ilk satırı kullanmıyorum.",
      nextAction: "Kayıt türü ve kimliğini açıkça belirt.",
      source: "canonical-conversation-entity-state-v1",
      dataSources: ["mevcut konuşma bağlamı"],
      retrievedFacts: ["Belirsiz ifade için kayıt okunmadı"],
      reasoning: "İfade tek bir kaydı güvenle göstermediği için önce netleştirme istendi.",
      priority: "Netleştirme gerekli",
      semanticPlan,
    };
  }
  const authorizationDecision = await authorizeSemanticRequest({ user, plan: semanticPlan });
  if (authorizationDecision.status === "DENY") {
    return {
      role,
      domain: "AUTHORIZATION_BOUNDARY",
      authorizationBoundary: true,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: authorizationBoundaryTaskReply({ plan: semanticPlan, decision: authorizationDecision, user }),
      nextAction: isAuthorizationSafeTaskPlan(semanticPlan) ? "Yetkili ekran ve kayıt kapsamını doğrula; korunmuş veriyi okumadan ilerle." : "Yetkili servis, plan veya operasyon alanında devam et.",
      source: "canonical-authorization-gate-v1",
      dataSources: ["mevcut kullanıcı ve kayıt erişim kuralları"],
      retrievedFacts: ["Korunan kayıt okunmadı"],
      reasoning: "Kullanıcı ve kayıt sahipliği doğrulanamadığı için korunan bilgiye erişilmedi.",
      priority: "Yetki sınırı",
      semanticPlan: authorizationBoundarySemanticPlan(semanticPlan, authorizationDecision),
    };
  }
  if (semanticPlan.family === "STYLE") {
    const settled = conversationState?.lastSettledResult || null;
    const sourceResult = settled?.presentationSource || settled;
    const sameAuthScope = sourceResult
      && Number(sourceResult.authScopeVersion || 0) === Number(conversationState?.authScopeVersion || 0);
    const targetPlan = sourceResult?.semanticPlan || semanticPlan.styleTargetPlan || null;
    const targetIsAuthorizedProductResult = sameAuthScope
      && targetPlan
      && targetPlan.dialogueTopic === "PRODUCT"
      && !["AUTHORIZATION_NEGATIVE", "AUTHORIZATION_BOUNDARY"].includes(targetPlan.conversationRoute)
      && !["AUTHORIZATION_BOUNDARY", "FIELD_PRIVACY_BOUNDARY"].includes(targetPlan.family)
      && targetPlan.planStatus !== "UNAUTHORIZED"
      && String(sourceResult.reply || "").trim();
    if (!targetIsAuthorizedProductResult) {
      return reasoningResult({
        role,
        domainMap: resolveAuthorizedProductDomains(user),
        topic: "CLARIFICATION",
        reply: "Özetlenecek güncel ve yetkili bir önceki sonuç bulunmuyor; önce bir ürün kaydı veya operasyon sonucu sor.",
        nextAction: "Önce yetkili bir kayıt ya da görev sonucu iste; ardından nasıl sunulacağını belirt.",
        records: [],
        dataSources: ["canonical conversation state"],
        retrievedFacts: ["style target unavailable in current auth scope"],
        reasoning: "Stil isteği yeni kayıt okumadı; aynı auth scope içinde son yetkili sonuç bulunamadığı için güvenli netleştirme yapıldı.",
        priority: "Stil hedefi bekleniyor",
        semanticPlan,
      });
    }
    return reasoningResult({
      role,
      domainMap: resolveAuthorizedProductDomains(user),
      topic: "STYLE",
      reply: applyRequestedStyle({
        reply: sourceResult.reply,
        style: semanticPlan.requestedStyle || semanticPlan.styleModifier,
        reasoning: sourceResult.reasoning,
        nextAction: sourceResult.nextAction,
        sentenceCount: semanticPlan.typedRequest?.presentationItemCount,
      }),
      nextAction: sourceResult.nextAction || "İstersen aynı yetkili sonucu başka bir sunum biçiminde düzenleyebilirim.",
      records: Array.isArray(sourceResult.authorizedRecords) ? sourceResult.authorizedRecords : [],
      dataSources: ["last settled authorized result", "canonical auth scope"],
      retrievedFacts: Array.isArray(sourceResult.retrievedFacts) ? sourceResult.retrievedFacts : [],
      reasoning: `Stil dönüşümü ${targetPlan.family || "önceki ürün görevi"} sonucuna uygulandı; yeni entity çözümleme veya retrieval yapılmadı.`,
      priority: "Önceki yetkili sonuç",
      semanticPlan,
    });
  }
  if (semanticPlan.family === "UI_GUIDANCE" && semanticPlan.workflowIntent === "UNRESOLVED_SHIFT_SURFACE") {
    return {
      role,
      domain: "UI_GUIDANCE",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: "Bu vardiya hedefini mevcut yetkili ekranda doğrulayamadım; gerçek bir ekran veya bölüm adıyla tekrar deneyebilirsin.",
      nextAction: "Mevcut Vardiyalar ekranındaki gerçek bir bölüm adıyla ilerle.",
      source: "authorized-screen-catalog-v1",
      navigationTarget: null,
      dataSources: ["canonical semantic guidance", "authorized screen catalog"],
      retrievedFacts: ["requested shift target was not resolved to an authorized UI surface"],
      reasoning: "Sahte veya hayali hedef, alan sorgusuna dönüştürülmeden gerçek yetkili ekran hedefi bulunamadığı için açıkça reddedildi.",
      priority: "Hedef doğrulaması gerekli",
      semanticPlan,
    };
  }
  if (semanticPlan.family === "UI_GUIDANCE" && semanticPlan.workflowIntent === "UNRESOLVED_UI_TARGET") {
    return {
      role,
      domain: "UI_GUIDANCE",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: "Bu hedefi mevcut yetkili arayüzde doğrulayamadım; gerçek bir ekran veya bölüm adıyla tekrar deneyebilirsin.",
      nextAction: "Mevcut ekrandaki gerçek bir bölüm adıyla ilerle.",
      source: "authorized-screen-catalog-v1",
      navigationTarget: null,
      dataSources: ["canonical semantic guidance", "authorized screen catalog"],
      retrievedFacts: ["requested UI target was not resolved to an authorized UI surface"],
      reasoning: "Sahte veya hayali hedef, yakındaki başka bir kontrole bağlanmadan gerçek yetkili ekran hedefi bulunamadığı için açıkça reddedildi.",
      priority: "Hedef doğrulaması gerekli",
      semanticPlan,
    };
  }
  const navigationTarget = authorizedNavigationTarget(user, semanticPlan, screenContext);
  if (navigationTarget) {
    const currentPath = String(screenContext?.path || "").replace(/\/+$/, "") || "/";
    const targetPath = String(navigationTarget.path || "").replace(/\/+$/, "") || "/";
    const alreadyOnTarget = currentPath === targetPath;
    const continuationAction = String(semanticPlan?.continuationAction || "");
    const continuationDepth = Number(semanticPlan?.continuationDepth || 0);
    const currentStep = continuationAction === "RECOVER"
      ? "Doğrulanabilir sonraki adımı yeniden buluyorum; vurgulanan güvenli kontrolden devam et."
      : continuationAction === "BACK"
        ? "Bir önceki güvenli adımı yeniden gösteriyorum; vurgulanan kontrolden devam et."
          : continuationAction === "EXPAND"
            ? continuationDepth <= 1
              ? "İlk güvenli adımı açıyorum; vurgulanan kontrolden başla."
              : continuationDepth === 2
                ? "İkinci adım için aynı sonucu tekrarlamıyorum; vurgulanan kontrolden ilerle."
                : continuationDepth === 3
                  ? "Üçüncü güvenli adımı vurguluyorum; önceki sonucu yeniden üretmiyorum."
                  : continuationDepth === 4
                    ? "Dördüncü güvenli adımı gösteriyorum; mevcut hedef üzerinde ilerliyoruz."
                    : continuationDepth === 5
                      ? "Beşinci güvenli adımı gösteriyorum; yeni kayıt veya iş yazımı oluşturmuyorum."
                      : "Bu akışın doğrulanabilir adımlarını tamamladık; aynı sonucu tekrarlamıyorum. İstersen başka bir alanı sorabilirsin."
          : continuationAction === "NEXT"
            ? "Sıradaki güvenli adım vurgulanacak; oradan devam et."
            : "Bu ekrandaki doğrulanabilir güvenli adımdan devam et.";
    return {
      role,
      domain: "UI_GUIDANCE",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: alreadyOnTarget
        ? `Şu anda ${navigationTarget.label} ekranındasın. ${currentStep}`
        : `${navigationTarget.label} ekranını aç. ${navigationTarget.purpose || "Bu ekranda yetkili iş akışını takip edebilirsin."}`,
      nextAction: alreadyOnTarget
        ? "Vurgulanan güvenli kontrolü inceleyip bir sonraki adımı sor."
        : `${navigationTarget.label} ekranını açıp ihtiyacın olan kaydı seç.`,
      source: "authorized-screen-catalog-v1",
      navigationTarget: alreadyOnTarget ? null : { path: navigationTarget.path, label: navigationTarget.label },
      dataSources: ["authorized screen catalog", "current role scope"],
      retrievedFacts: [`screen.path=${navigationTarget.path}`, `screen.label=${navigationTarget.label}`],
      reasoning: alreadyOnTarget
        ? "Kullanıcı zaten yetkili hedef ekranda. Aynı route için sahte navigasyon iddiası yerine yalnızca mevcut güvenli sonraki adım yönlendirmesi üretildi."
        : "Açık navigasyon isteği yalnızca kullanıcının yetkili ekran kataloğundan çözüldü; kayıt okunmadı ve navigasyon uygulanmadı.",
      priority: "Yetkili ekran yönlendirmesi",
      semanticPlan,
    };
  }
  const navigationWorkflow = workflowGuidancePlan(semanticPlan);
  if (["CREATE_SHIFT", "OPEN_SHIFT_SURFACE", "OPEN_OFFER_SURFACE"].includes(String(navigationWorkflow?.workflowIntent || ""))) {
    const requestedSurface = String(navigationWorkflow?.workflowIntent || "") === "OPEN_OFFER_SURFACE" ? "Teklifler" : "Vardiyalar";
    return {
      role,
      domain: "UI_GUIDANCE",
      authorizationBoundary: true,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: `Bu rolde ${requestedSurface} ekranı için yetkili bir erişim bulunmuyor.`,
      nextAction: "Bu role açık olan ekranlardan devam edebilirsin.",
      source: "authorized-screen-catalog-v1",
      dataSources: ["authorized screen catalog", "current role scope"],
      retrievedFacts: [],
      reasoning: "Kullanıcının rolünde doğrulanmış bir Vardiyalar ekranı bulunmadığı için hedef veya navigasyon uydurulmadı.",
      priority: "Rol ekranı yetki sınırı",
      semanticPlan,
    };
  }
  if (semanticPlan.family === "UI_GUIDANCE" && screenContext?.path && !(semanticPlan.requestedDomains || []).length) {
    const currentLabel = String(screenContext.label || screenContext.path).trim();
    return {
      role,
      domain: "UI_GUIDANCE",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: `Şu anda ${currentLabel} ekranındasın (${screenContext.path}). Bu ekranın güncel görünür durumunu ve seçili kaydı buradan inceleyebilirsin.`,
      nextAction: "Güncel ekranındaki yetkili kaydı açıp istediğin alanı belirt.",
      source: "live-screen-context-v1",
      dataSources: ["current live screen route"],
      retrievedFacts: [`screen.path=${screenContext.path}`, `screen.label=${currentLabel}`],
      reasoning: "Ekran adı ve yolu mevcut canlı UI route context üzerinden alındı; önceki route başlığı kullanılmadı.",
      priority: "Güncel ekran bağlamı",
      semanticPlan,
    };
  }
  if (semanticPlan.family === "CONTINUE_CURRENT_REASONING" && !semanticPlan.requestedDomains.length) {
    const currentLabel = String(screenContext?.label || screenContext?.path || "mevcut ekran").trim();
    const selectedLabel = String(screenContext?.selectedLabel || "").trim();
    const depth = Number(semanticPlan.continuationDepth || 1);
    const reply = depth === 1
      ? "Ekran bağlamını biraz açayım: şu anda " + currentLabel + " görünümündesin" + (selectedLabel ? " ve odak " + selectedLabel + " kaydı." : ".") + " Yeni bir kayıt veya ilişkiyi kanıt olmadan eklemiyorum."
      : depth === 2
        ? "Bu devam turunda aynı ekran kanıtını yeniden yorumlamak yerine sınırı netleştiriyorum: " + currentLabel + " dışına çıkmadan yalnızca yetkili ve seçili kaydı açıklayabilirim. İncelemek istediğin alanı belirtmen gerekir."
        : "Ekran bağlamı zaten doğrulandı; yeni bir kayıt veya ilişki kanıtı oluşmadı. İlerlemek için incelemek istediğin alanı belirtmen gerekir.";
    return {
      role,
      domain: "SCREEN_CONTEXT",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: selectedLabel ? [selectedLabel] : [],
      reply,
      nextAction: "İncelenecek alanı veya bağlı kaydı belirt.",
      source: "canonical-continuation-v1",
      dataSources: ["current live screen route", "canonical conversation state"],
      retrievedFacts: ["screen.path=" + String(screenContext?.path || ""), "screen.label=" + currentLabel].filter(Boolean),
      reasoning: "Devam işlemi önceki ekran görevini korudu; yeni domain veya ilişki açılmadı.",
      priority: "Mevcut ekran bağlamı",
      semanticPlan,
    };
  }
  const inferredDomains = semanticPlan.requestedDomains.length ? semanticPlan.requestedDomains : [];
  const requestedDomains = inferredDomains.length
    ? inferredDomains
    : (hasCanonicalSemanticPlan ? [] : [
      /(teklif|rfq|talep)/.test(normalizedMessage) ? "OFFERS" : "",
      /(sozlesme|anlasma|contract|agreement)/.test(normalizedMessage) ? "AGREEMENTS" : "",
    ].filter(Boolean));
  const allowed = resolveAuthorizedProductDomains(user).domains;
  const commercialRequest = semanticPlan.family === "AUTHORIZATION_BOUNDARY"
    || isUnauthorizedCommercialQuestion(message, role)
    || requestedDomains.some((domain) => ["OFFERS", "AGREEMENTS", "BUDGET", "FINANCE"].includes(domain));
  const deniedDomains = requestedDomains.filter((domain) => !allowed.includes(domain));
  if (deniedDomains.length || (["SCHOOL", "ORGANIZATION"].includes(role) && commercialRequest && requestedDomains.some((domain) => ["OFFERS", "AGREEMENTS", "BUDGET", "FINANCE"].includes(domain)))) {
    const roleLabel = role === "SCHOOL" ? "Okul" : "Organizasyon";
    const deniedLabel = deniedDomains.length ? deniedDomains.map(domainLabel).join(", ") : "ticari Hizmet Alan Firma";
    return {
      role,
      domain: "AUTHORIZATION_BOUNDARY",
      authorizationBoundary: true,
      roleBoundary: `Bu oturumda ${deniedLabel} alanına erişimim yok; bu kayıtları okuyamam.`,
      authorizedDomainMap: allowed,
      count: 0,
      records: [],
      reply: `Bu oturumda ${deniedLabel} alanına erişimim yok; bu kayıtları okuyamam. ${roleLabel} kapsamındaki servis, plan ve operasyon kayıtlarını özetleyebilirim.`,
      nextAction: `${roleLabel} kapsamındaki servis, plan ve operasyon kayıtlarını sorabilirsin.`,
      source: "authorized-product-boundary-v1",
      dataSources: ["mevcut rol ve company-kind yetki kapsamı"],
      retrievedFacts: [`Yetkisiz alan: ${deniedLabel}`, "Korunan ticari kayıt okunmadı"],
      reasoning: "Yetki sınırı veri sorgusundan önce uygulandı; yetkisiz kayıt okunmadı.",
      priority: "Yetki sınırı",
      semanticPlan,
    };
  }
  const readDomain = async (domain, { plan: scopedPlan = semanticPlan } = {}) => {
    if (domain === "OFFERS") return readOffers(user, role, scopedPlan);
    if (domain === "AGREEMENTS") return readAgreements(user, role, scopedPlan);
    if (domain === "SHIFTS") return readShifts(user, role, false, scopedPlan);
    if (domain === "VEHICLES") return readVehicles(user, role, scopedPlan);
    if (domain === "DRIVERS") return readDrivers(user, role, scopedPlan);
    if (domain === "PERSONNEL") return scopedPlan.semanticEntityType === "PARENT" ? readParentLinks(user, role) : readPersonnel(user, role, scopedPlan);
    if (domain === "SERVICE_REQUESTS") return readServiceRequests(user, role);
    if (domain === "BUDGET") return readFinance(user, role, true);
    if (domain === "FINANCE") return readFinance(user, role, false);
    if (domain === "NOTIFICATIONS") return readNotifications(user, role);
    if (domain === "OPERATIONS") return readOperations(user, role, scopedPlan);
    if (domain === "ORGANIZATION_PLANS") return readOrganizationPlans(user, scopedPlan);
    if (domain === "TENANT_ACCESS") return readTenantAccess(user, role);
    return { domain, count: 0, records: [], nextAction: "Yetkili kayıt bulunamadı." };
  };
  if (semanticPlan.requestedDomains.length && semanticPlan.planStatus === "READY") {
    const execution = await executeSemanticQueryPlan({
      plan: semanticPlan,
      readDomain,
      allowedDomains: allowed,
    });
    const executionRecords = Array.isArray(execution.facts) ? execution.facts.filter((fact) => typeof fact === "string") : [];
    const hasUnauthorized = execution.unauthorizedFacts.length > 0;
    const composedExecution = composeMultiPartExecutionReply({ plan: semanticPlan, execution, baseReply: execution.reply });
    return {
      role,
      domain: hasUnauthorized ? "AUTHORIZATION_BOUNDARY" : semanticPlan.requestedDomains.length > 1 ? "MULTI_DOMAIN" : semanticPlan.requestedDomains[0],
      authorizationBoundary: hasUnauthorized,
      authorizedDomainMap: allowed,
      count: execution.items.reduce((sum, item) => sum + Number(item.count || 0), 0),
      records: executionRecords.slice(0, 16),
      reply: composedExecution.reply,
      nextAction: composedExecution.nextAction,
      source: "authorized-query-plan-executor-v2",
      dataSources: semanticPlan.requestedDomains.map((domain) => `yetkili ${domainLabel(domain)} kayıtları`).concat("rol/company-kind/tenant kapsamı"),
      retrievedFacts: executionRecords.slice(0, 16),
      reasoning: `Plan ${semanticPlan.planVersion} içindeki ${semanticPlan.evidenceRequirements.length} kanıt gereksinimi terminal durumlarla değerlendirildi; ham satır yerine yapılandırılmış sentez üretildi.`,
      priority: hasUnauthorized ? "Yetki sınırı" : execution.status === "NO_DATA" ? "İzleme" : "Plan yürütme sonucu",
      semanticPlan,
      queryPlanExecution: execution,
      synthesis: {
        facts: execution.structuredFacts,
        missingFacts: execution.missingFacts,
        unauthorizedFacts: execution.unauthorizedFacts,
        inferences: execution.inferences,
        recommendation: execution.recommendation,
      },
    };
  }
  const fieldPrivacyDecision = resolveFieldPrivacyPolicy({ user, message, plan: semanticPlan });
  if (fieldPrivacyDecision.status === "DENY") {
    const privacyPlan = { ...semanticPlan, family: "FIELD_PRIVACY_BOUNDARY", intentFamily: "FIELD_PRIVACY_BOUNDARY", fieldPrivacyDecision };
    return {
      role,
      domain: "FIELD_PRIVACY_BOUNDARY",
      authorizationBoundary: true,
      privacyBoundary: true,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: fieldPrivacyBoundaryReply(fieldPrivacyDecision),
      nextAction: "Güvenli durum özeti veya yetkili toplu gösterge iste.",
      source: "canonical-field-privacy-policy-v1",
      dataSources: ["alan gizliliği kuralları"],
      retrievedFacts: ["Korunan alan paylaşılmadı"],
      reasoning: "Ham kişisel bilgi, koordinat veya gizli alan paylaşılmadı; kayıt içeriği okunmadı.",
      priority: "Alan gizliliği sınırı",
      semanticPlan: privacyPlan,
    };
  }
  if (requestedDomains.length > 1 && requestedDomains.every((item) => allowed.includes(item))) {
    const results = await Promise.all(requestedDomains.map(readDomain));
    const parts = results.map((result) => result.count ? `${result.count} yetkili ${domainLabel(result.domain)} kaydı var.` : `Yetkili ${domainLabel(result.domain)} kaydı görünmüyor.`);
    const records = results.flatMap((result) => result.records || []);
    return {
      role,
      domain: "MULTI_DOMAIN",
      authorizedDomainMap: allowed,
      count: results.reduce((sum, result) => sum + Number(result.count || 0), 0),
      records: records.slice(0, 12),
      reply: `${parts.join(" ")} ${results.map((result) => result.nextAction).filter(Boolean).join(" ")}`.trim(),
      nextAction: results.some((result) => result.count) ? "İstenen alanları birlikte doğrula; onay veya değişiklik işlemi açık kullanıcı onayı olmadan uygulanmaz." : "İstenen alanlar için yetkili kayıt oluştuğunda tekrar kontrol et.",
      source: "authorized-product-read-v1",
      dataSources: requestedDomains.map((domain) => `yetkili ${domainLabel(domain)} kayıtları`).concat("rol/company-kind/tenant kapsamı"),
      retrievedFacts: records.slice(0, 12),
      reasoning: `Kullanıcının açıkça istediği ${requestedDomains.join(", ")} alanları ayrı ayrı okunup tek yanıtta sentezlendi.`,
      priority: results.some((result) => result.count) ? "Çok alanlı inceleme" : "İzleme",
      semanticPlan,
    };
  }
  const domain = requestedDomains[0] || (hasCanonicalSemanticPlan ? "" : domainForQuestion(message, role));
  if (!domain) return null;
  if (!allowed.includes(domain)) {
    const roleLabel = role === "SCHOOL" ? "Okul" : role === "ORGANIZATION" ? "Organizasyon" : role;
    return {
      role,
      domain: "AUTHORIZATION_BOUNDARY",
      authorizationBoundary: true,
      roleBoundary: `Bu kayıt alanı mevcut ${roleLabel} yetki kapsamına dahil değil; bu oturumda okuyamam.`,
      authorizedDomainMap: allowed,
      count: 0,
      records: [],
      reply: `Bu kayıt alanı mevcut ${roleLabel} yetki kapsamına dahil değil; bu oturumda okuyamam. Yetkili servis ve operasyon kayıtlarını özetleyebilirim.`,
      nextAction: "Yetkili servis, plan veya operasyon kayıtlarından birini sor.",
      source: "authorized-product-boundary-v1",
      dataSources: ["rol/company-kind/tenant kapsamı"],
      retrievedFacts: ["İstenen alan yetkili değil", "Yetkisiz kayıt okunmadı"],
      reasoning: "İstenen ürün alanı yetkili domain haritasında olmadığı için sorgu durduruldu.",
      priority: "Yetki sınırı",
    };
  }
  let result;
  if (domain === "OFFERS") result = await readOffers(user, role, semanticPlan);
  else if (domain === "AGREEMENTS") result = await readAgreements(user, role, semanticPlan);
  else if (domain === "SHIFTS") result = await readShifts(user, role, /atanmamis/.test(normalize(message)), semanticPlan);
  else if (domain === "VEHICLES") result = await readVehicles(user, role, semanticPlan);
  else if (domain === "DRIVERS") result = await readDrivers(user, role, semanticPlan);
  else if (domain === "PERSONNEL") result = semanticPlan.semanticEntityType === "PARENT" ? await readParentLinks(user, role) : await readPersonnel(user, role, semanticPlan);
  else if (domain === "SERVICE_REQUESTS") result = await readServiceRequests(user, role);
  else if (domain === "BUDGET") result = await readFinance(user, role, true);
  else if (domain === "FINANCE") result = await readFinance(user, role, false);
  else if (domain === "NOTIFICATIONS") result = await readNotifications(user, role);
  else if (domain === "OPERATIONS") result = await readOperations(user, role, semanticPlan);
  else if (domain === "ORGANIZATION_PLANS") result = await readOrganizationPlans(user, semanticPlan);
  else if (domain === "TENANT_ACCESS") result = await readTenantAccess(user, role);
  else return null;

  const hasRecords = Number(result?.count || 0) > 0;
  const recordsText = Array.isArray(result?.records) && result.records.length ? ` ${result.records.join(" ")}` : "";
  const label = domainLabel(domain);
  return {
    role,
    domain,
    authorizedDomainMap: allowed,
    count: Number(result?.count || 0),
    records: Array.isArray(result?.records) ? result.records : [],
    reply: `${hasRecords ? `${result.count} yetkili ${label} kaydı bulundu.` : `Yetkili güncel kayıtlarda ${label} alanında açık kayıt görünmüyor.`}${recordsText} ${result?.nextAction || ""}`.trim(),
    nextAction: result?.nextAction || "İlgili kaydı kontrol et.",
    source: "authorized-product-read-v1",
    dataSources: [`Yetkili ${label} kayıtları`, "rol/company-kind/tenant kapsamı"],
    retrievedFacts: Array.isArray(result?.records) ? result.records : [],
    reasoning: hasRecords
      ? `${result.count} yetkili ${label} kaydı bulundu; kayıtların durumu ve kullanıcı kararını gerektiren sonraki adım birlikte değerlendirildi.`
      : `Yetkili kapsamda açık ${label} kaydı bulunmadı; bu sonuç yalnızca mevcut okuma kapsamındaki kayıtlar için geçerlidir.`,
    priority: hasRecords ? "İnceleme gerektiren yetkili kayıt" : "İzleme",
    semanticPlan,
  };
}
