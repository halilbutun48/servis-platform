import prisma from "../prisma.js";
import { buildActionableEventsForUser, readActionableCurrentScreenSnapshot } from "./actionableEvents.js";
import { isCurrentSituationDiagnosticQuestion } from "../ai/chat/intentRouter.js";
import { getRoleDomainCapabilities, resolveSemanticIntent } from "../ai/chat/semanticIntentPlanner.js";
import { authorizeSemanticRequest, authorizationBoundaryReply } from "../ai/chat/authorizationGate.js";
import { fieldPrivacyBoundaryReply, resolveFieldPrivacyPolicy } from "../ai/chat/fieldPrivacyPolicy.js";
import { etaMinutes, haversineKm } from "../geo.js";
import { executeSemanticQueryPlan } from "./queryPlanExecutor.js";
import { buildAgreementOpsBridgeById } from "./agreementOpsBridge.js";
import { buildRoleHelpSummary, getScreenDefinitionForUser } from "../ai/jobGuide/screenCatalog.js";
import { sanitizeUserFacingOfferNote } from "./userFacingOfferNote.js";
import { buildOperationHealthState } from "../ai/chat/conversationOperationHealthEngine.js";
import { getShiftSummary, getVehicleSummary, getDriverSummary } from "../lib/reports.js";
import { buildRoomObservabilityIssues, buildRoomObservabilitySnapshot, buildRoomObservabilitySummary } from "../ops/observabilityManifest.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { buildAgreementReconciliationPreview } from "../finance/hakedisInvoiceReconciliation.js";
import { computeSeferScorePreview } from "./seferScoreService.js";
import { buildBoardingChangeRequestView, loadBoardingChangeRequestAuditMap } from "./boardingChangeRequestView.js";
import { hasSchoolOperationsStatusCue } from "../ai/chat/canonicalSemanticRequest.js";
import { getCurrentFieldAcceptanceSession } from "../ops/fieldAcceptanceState.js";

// Read-only, role-scoped product awareness. This is intentionally separate
// from actionable-events-v1: the latter summarizes work, while this service
// answers a user's explicit question about an authorized product domain.

const OPEN_OFFER_STATUSES = ["OPEN", "COUNTERED"];
const REVIEW_AGREEMENT_STATUSES = ["REQUESTED", "COUNTERED"];
const ACTIVE_SHIFT_STATUSES = ["DRAFT", "REQUESTED", "APPROVED", "ACTIVE"];
const CURRENT_DRIVER_SHIFT_STATUSES = ["APPROVED", "ACTIVE"];
const ORGANIZATION_PLAN_STATUSES = ["DRAFT", "SHIFT_PUBLISHED", "AGREEMENT_REQUESTED"];

function agreementStatusScopeForPlan(plan, agreementEntities = [], shiftEntities = []) {
  if (agreementEntities.length || shiftEntities.length) return {};
  if (plan?.operationHealthMetricIntent === true) {
    return { status: { in: REVIEW_AGREEMENT_STATUSES } };
  }
  const temporalMode = String(
    plan?.temporalMode
      || plan?.temporalScope?.mode
      || plan?.typedRequest?.temporalScope?.mode
      || "UNKNOWN",
  ).toUpperCase();
  if (temporalMode === "PENDING") return { status: { in: REVIEW_AGREEMENT_STATUSES } };
  if (temporalMode === "ACTIVE_NOW") return { status: { in: ["ACTIVE"] } };
  return {};
}

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

function vehiclePlateCandidates(entities = []) {
  return [...new Set(entities
    .flatMap((entity) => [entity?.plate, String(entity?.plate || "").replace(/\s+/g, "")])
    .map((plate) => String(plate || "").trim())
    .filter(Boolean))];
}

export function buildSchoolOperationsStatusReply({ request = false, operationsFacts = [] } = {}) {
  if (!request) return null;
  const facts = Array.isArray(operationsFacts) ? operationsFacts.filter(Boolean) : [];
  if (!facts.length) {
    return "Güncel yetkili okul operasyon kaydı görünmüyor; geçmiş bir vardiyayı bugünkü aktif servis olarak kullanmıyorum.";
  }
  const approved = facts.filter((fact) => String(fact?.status || "").toUpperCase() === "APPROVED").length;
  const active = facts.filter((fact) => String(fact?.status || "").toUpperCase() === "ACTIVE").length;
  const assigned = facts.filter((fact) => String(fact?.vehiclePlate || fact?.vehicle || "").trim()).length;
  return `Güncel yetkili okul operasyonunda ${facts.length} servis/vardiya kaydı görünüyor: ${active} aktif, ${approved} onaylı; ${assigned} kayıtta araç bağlantısı var. Ayrıntıyı aynı Operasyon Paneli ve Vardiyalar kapsamından inceleyebilirsin.`;
}

export function isUnselectedShiftRecordLookup({ user, message, screenContext } = {}) {
  if (roleKey(user) !== "ROOM") return false;
  if (normalizeScreenPath(screenContext?.path) !== "/room/shifts") return false;
  if (integer(screenContext?.selectedEntityId || screenContext?.selectedRecordId)) return false;
  const text = normalize(message);
  if (!text || /sozlesmeden|bekleyen|listele|hepsi|tum vardiya/iu.test(text)) return false;
  return /^(?:bu\s+)?vardiya(?:yi|yi|yı|yi|ya|nin|nin)?\s+(?:goster|ac|incele|detay(?:larini|larını)?\s+goster)\??$/iu.test(text);
}

function finiteMetric(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function readOperationHealthMetricContract({ user, screenContext, vehicleIssues, agreements, offers } = {}) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : screenContext?.liveFacts && typeof screenContext.liveFacts === "object"
      ? screenContext.liveFacts
      : {};
  const counters = facts?.counters && typeof facts.counters === "object" ? facts.counters : {};
  const projections = facts?.projectionMetrics && typeof facts.projectionMetrics === "object" ? facts.projectionMetrics : {};
  const fallback = {
    openIssues: finiteMetric(counters.openIssues),
    staleOrOfflineDrivers: finiteMetric(counters.staleOrOffline),
    riskyDevices: finiteMetric(counters.riskyDevices),
    activeDrivers: finiteMetric(counters.activeDrivers),
    dailyShiftTotal: finiteMetric(projections.dailyShiftTotal),
    dailyVehicleTotal: finiteMetric(projections.dailyVehicleTotal),
    dailyDriverTotal: finiteMetric(projections.dailyDriverTotal),
    dailyRequestTotal: finiteMetric(projections.dailyRequestTotal),
    dailyWindowFrom: String(projections.shiftWindowFrom || "").trim(),
    dailyWindowTo: String(projections.shiftWindowTo || "").trim(),
  };
  const fallbackIssueRecords = Array.isArray(facts.issueRecords)
    ? facts.issueRecords.filter((item) => item && typeof item === "object" && String(item.title || "").trim()).slice(0, 12)
    : null;
  const roomId = Number(user?.roomId || 0) || 0;
  let authoritative = null;
  let authoritativeIssueRecords = null;
  if (String(user?.role || "").toUpperCase() === "ROOM" && roomId > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const reportQuery = { from: today, to: today };
    try {
      authoritativeIssueRecords = await buildRoomObservabilityIssues(user);
    } catch {
      authoritativeIssueRecords = null;
    }
    try {
      const [summary, shiftSummary, vehicleSummary, driverSummary, dailyRequestTotal] = await Promise.all([
        buildRoomObservabilitySummary(user),
        getShiftSummary(reportQuery, user),
        getVehicleSummary(reportQuery, user),
        getDriverSummary(reportQuery, user),
        prisma.pickupRequest.count({ where: { shift: { is: { roomId } } } }),
      ]);
      authoritative = {
        openIssues: finiteMetric(summary?.cards?.openIssues),
        staleOrOfflineDrivers: finiteMetric(summary?.cards?.staleOrOffline),
        riskyDevices: finiteMetric(summary?.cards?.riskyDevices),
        activeDrivers: finiteMetric(summary?.cards?.activeDrivers),
        dailyShiftTotal: finiteMetric(shiftSummary?.total),
        dailyVehicleTotal: finiteMetric(vehicleSummary?.total),
        dailyDriverTotal: finiteMetric(driverSummary?.total),
        dailyRequestTotal: finiteMetric(dailyRequestTotal),
        dailyWindowFrom: shiftSummary?.from instanceof Date ? shiftSummary.from.toISOString() : String(shiftSummary?.from || "").trim(),
        dailyWindowTo: shiftSummary?.to instanceof Date ? shiftSummary.to.toISOString() : String(shiftSummary?.to || "").trim(),
        source: "SERVER_AUTHORIZED_ROOM_OPERATION_HEALTH_AND_REPORTS",
      };
    } catch {
      authoritative = null;
    }
  }
  const trusted = authoritative || fallback;
  return {
    ...trusted,
    issueRecords: authoritativeIssueRecords || fallbackIssueRecords,
    vehicleStaleGpsEvidence: finiteMetric(vehicleIssues?.count),
    agreementReviewEvidence: finiteMetric(agreements?.count),
    offerResponseEvidence: finiteMetric(offers?.count),
  };
}

function buildOperationHealthMetricReply(mode, metric) {
  const windowText = metric.dailyWindowFrom && metric.dailyWindowTo
    ? `Günlük rapor penceresi ${metric.dailyWindowFrom}–${metric.dailyWindowTo}.`
    : "Günlük rapor penceresi mevcut ekran kanıtında belirtilmedi.";
  const openIssueText = metric.openIssues == null
    ? "Açık sorun sayısı bu turda güvenilir biçimde okunamadı."
    : `Özet sayacındaki açık sorun ${metric.openIssues}; bu değer operasyon-sağlığı issue kategorilerinin sayısıdır, günlük araç veya vardiya toplamı değildir.`;
  const dailyText = [
    metric.dailyShiftTotal == null ? "Günlük vardiya toplamı gözlenemedi." : `Günlük vardiya raporu ${metric.dailyShiftTotal}.`,
    metric.dailyVehicleTotal == null ? "Günlük araç toplamı gözlenemedi." : `Günlük araç raporu ${metric.dailyVehicleTotal}.`,
    metric.dailyDriverTotal == null ? "Günlük sürücü raporu gözlenemedi." : `Günlük sürücü raporu ${metric.dailyDriverTotal}.`,
  ].join(" ");
  const gpsText = [
    metric.staleOrOfflineDrivers == null
      ? "Özetin sürücü canlılık sayısı bu turda okunamadı."
      : `Özet, ${metric.staleOrOfflineDrivers} sürücü satırını güncel değil / çevrim dışı canlılık sinyali olarak sayıyor.`,
    metric.vehicleStaleGpsEvidence == null
      ? "Ayrı araç GPS kanıtı gözlenemedi."
      : `Ayrı yetkili araç/GPS okuması ${metric.vehicleStaleGpsEvidence} araçta güncel olmayan konum kanıtı bildiriyor; bu değer sürücü satırı sayısıyla otomatik olarak eşitlenmez.`,
  ].join(" ");
  const severityLabels = { HIGH: "Yüksek", MEDIUM: "Orta", LOW: "Düşük" };
  const issueRecords = Array.isArray(metric.issueRecords)
    ? metric.issueRecords.filter((item) => item && String(item.title || "").trim()).slice(0, 12)
    : [];
  const issueText = issueRecords.length
    ? ` Yetkili açık sorunlar: ${issueRecords.map((item) => {
      const title = String(item.title).trim();
      const severity = severityLabels[String(item.severity || "").toUpperCase()] || String(item.severity || "").trim();
      const detail = String(item.detail || item.status || "").trim();
      return `${title}${severity ? ` (${severity})` : ""}${detail ? ` — ${detail}` : ""}`;
    }).join("; ")}.`
    : metric.issueRecords
      ? " Yetkili açık sorun kaydı bu turda görünmüyor."
      : "";
  const followUpText = [
    metric.agreementReviewEvidence == null
      ? "İnceleme bekleyen sözleşme sayısı bu turda doğrulanamadı."
      : `İnceleme bekleyen ${metric.agreementReviewEvidence} sözleşme ticari/karar takibi bulgusudur; tek başına operasyon arızası sayılmaz.`,
    metric.offerResponseEvidence == null
      ? "Yanıt bekleyen teklif sayısı bu turda doğrulanamadı."
      : `Yanıt bekleyen ${metric.offerResponseEvidence} teklif fırsat/karar takibi bulgusudur; açık operasyon issue kategorisine eklenmez.`,
  ].join(" ");
  if (mode === "GPS_ISSUE_SUBSET" || mode === "ISSUE_METRIC_SCOPE") return `${gpsText} ${openIssueText}${issueText}`;
  if (mode === "OPERATIONAL_CLASSIFICATION") return `${followUpText} ${openIssueText}${issueText}`;
  if (mode === "METRIC_DEFINITION") return `${openIssueText}${issueText} Riskli cihaz ${metric.riskyDevices ?? "okunamadı"}, güncel değil / çevrim dışı sürücü ${metric.staleOrOfflineDrivers ?? "okunamadı"}; bunlar farklı operasyon-sağlığı göstergeleridir. ${dailyText}`;
  return `${openIssueText}${issueText} ${dailyText} Bu nedenle özet uyarısı ile günlük araç/vardiya raporu aynı projeksiyonu ölçmüyor. ${windowText} ${gpsText} ${followUpText}`;
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

export function resolveRoleScopedNavigationPath(role, currentPath, suffix) {
  const normalizedPath = normalizeScreenPath(currentPath);
  const roleKey = String(role || "").toUpperCase();
  const roleRoot = normalizedPath.startsWith("/school/")
    ? "/school"
    : normalizedPath.startsWith("/organization/")
      ? "/organization"
      : normalizedPath.startsWith("/company/") || roleKey === "COMPANY"
        ? "/company"
        : roleKey === "SCHOOL"
          ? "/school"
          : roleKey === "ORGANIZATION"
            ? "/organization"
            : roleKey === "ROOM"
              ? "/room"
              : "/room";
  const normalizedSuffix = String(suffix || "").startsWith("/") ? String(suffix) : `/${suffix}`;
  return `${roleRoot}${normalizedSuffix}`;
}

export function buildRoleScopedShiftNavigationTarget(role, currentPath, shiftId) {
  const id = integer(shiftId);
  if (!id) return null;
  return {
    path: resolveRoleScopedNavigationPath(role, currentPath, "/shifts"),
    label: "Vardiyalar",
    routeParams: { focusShiftId: id },
    recordType: "SHIFT",
    recordId: id,
  };
}

// DRIVER users do not own the buyer/ROOM "Vardiyalar" collection. When a
// selected-shift follow-up asks which screen to open, the authorized product
// surface is the driver's Rota screen. Keep the selected shift in the route
// so the answer remains bound to the record the user is already viewing.
export function buildDriverShiftNavigationTarget({ user, screenContext = null, shiftId = null } = {}) {
  if (String(user?.role || "").toUpperCase() !== "DRIVER") return null;
  const target = buildRoleHelpSummary(user).screens.find((screen) => screen.path === "/driver/route") || null;
  if (!target) return null;
  const selectedId = integer(shiftId)
    || integer(screenContext?.selectedEntityId)
    || integer(screenContext?.selectedRecordId)
    || integer(screenContext?.selectedEntity?.id);
  return {
    ...target,
    ...(selectedId
      ? {
        recordType: "SHIFT",
        recordId: selectedId,
        routeParams: { shift: selectedId },
      }
      : {}),
  };
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

// The parent live screen exposes an authorized selected service/vehicle. A
// generic question such as "Çocuğumun bugün servisi var mı?" must stay bound
// to that selected record; it must not fall through to a cross-domain count
// query. Keep the cue narrow and require the live-screen selection so this
// path cannot be used as a general parent-data lookup.
export function isSelectedParentLiveStatusQuestion({ role, message, screenContext } = {}) {
  if (String(role || "").toUpperCase() !== "PARENT") return false;
  if (normalizeScreenPath(screenContext?.path) !== "/parent/live") return false;
  if (!integer(screenContext?.selectedRecordId ?? screenContext?.selectedEntityId)) return false;
  if (!String(screenContext?.selectedLabel || screenContext?.selectedRecordLabel || "").trim()) return false;
  const text = normalize(message);
  return /(?:cocugumun|cocugum|ogrencimin|ogrencim).*(?:bugun|simdi|aktif).*(?:servis|servisi).*(?:var mi|durumu|nerede)/iu.test(text)
    || /(?:servis|servisi).*(?:durumu|aktif mi|var mi)/iu.test(text);
}

function selectedParentLiveStatusPlan(semanticPlan, screenContext) {
  const vehicleId = integer(screenContext?.selectedRecordId ?? screenContext?.selectedEntityId);
  const vehicleEntity = { type: "vehicle", id: vehicleId };
  return {
    ...semanticPlan,
    family: "STATUS",
    intentFamily: "STATUS",
    planStatus: "READY",
    temporalMode: "ACTIVE_NOW",
    requestedDomains: ["OPERATIONS"],
    requestedFields: [{ key: "STATUS", domain: "OPERATIONS" }],
    entity: vehicleEntity,
    entities: [vehicleEntity],
    relationshipIntent: null,
    typedRequest: {
      ...(semanticPlan?.typedRequest || {}),
      taskType: "STATUS",
      targetEntityType: "STUDENT",
      scopeTarget: "SELECTED_RECORD",
      explicitTaskIntent: true,
      explicitUserTarget: true,
    },
  };
}

async function buildSelectedParentLiveStatusAnswer({ user, role, message, screenContext, semanticPlan }) {
  if (!isSelectedParentLiveStatusQuestion({ role, message, screenContext })) return null;
  const scopedPlan = selectedParentLiveStatusPlan(semanticPlan, screenContext);
  const operationResult = await readOperations(user, role, scopedPlan);
  const fact = Array.isArray(operationResult?.facts) ? operationResult.facts[0] : null;
  const selectedLabel = String(screenContext?.selectedLabel || screenContext?.selectedRecordLabel || "Seçili çocuk").trim();
  const childLabel = selectedLabel.replace(/^#\d+\s*/u, "").trim() || "Seçili çocuk";
  const authorizedDomainMap = resolveAuthorizedProductDomains(user).domains;
  const records = Array.isArray(operationResult?.records) ? operationResult.records : [];
  const reply = fact
    ? `${childLabel} için bugün aktif servis var: Vardiya #${fact.shiftId || fact.id}, araç ${fact.vehicle || "atanmış araç yok"}${fact.driver ? `, sürücü ${fact.driver}` : ""}. ${fact.gpsStatus && !/konum sinyali yok/iu.test(fact.gpsStatus) ? `Konum durumu: ${fact.gpsStatus}.` : "Canlı konum ve ETA bilgisi yok; bu alanları uydurmuyorum."}`
    : `${childLabel} için bugün yetkili aktif servis görünmüyor. Başka bir çocuğun kaydını veya geçmiş bir aracı bu yanıta eklemiyorum.`;
  return {
    role,
    domain: "OPERATIONS",
    authorizationBoundary: false,
    authorizedDomainMap,
    count: fact ? 1 : 0,
    records,
    reply,
    nextAction: fact
      ? "İstersen seçili servis için güvenli durum özetini veya yalnızca mevcut ekrandaki bir sonraki adımı sorabilirsin."
      : "Seçili çocuk için yetkili canlı servis kaydı oluştuğunda aynı ekrandan yenileyebilirsin.",
    source: "authorized-parent-live-selected-status-v1",
    navigationTarget: null,
    dataSources: ["PARENT canlı ekran seçimi", "yetkili PARENT operasyon ilişkisi", "güncel vardiya/araç okuması"],
    retrievedFacts: [
      `selected.vehicle.id=${Number(screenContext?.selectedRecordId ?? screenContext?.selectedEntityId)}`,
      ...(Array.isArray(fact?.evidence) ? fact.evidence : []),
      ...(fact?.gpsStatus ? [`gps.status=${fact.gpsStatus}`] : ["gps.status=unavailable"]),
    ],
    reasoning: "Seçili PARENT canlı kaydı, yalnızca bağlı ve güncel vardiya/araç ilişkisi üzerinden okundu; başka çocuk, geçmiş araç, GPS veya ETA varsayılmadı.",
    priority: fact ? "Seçili aktif servis" : "Seçili çocuk için aktif servis yok",
    semanticPlan: scopedPlan,
    discourseEntities: authorizedDiscourseEntities({ domain: "OPERATIONS", facts: fact ? [fact] : [] }),
  };
}

function dayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function istanbulDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function istanbulDayWindow(value = new Date()) {
  const dateKey = istanbulDateKey(value);
  const start = new Date(`${dateKey}T00:00:00+03:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
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

const GUIDANCE_SCREEN_LABELS_BY_DOMAIN = Object.freeze({
  OPERATIONS: ["Check-in", "Operasyon Paneli", "Operasyon Sağlığı", "Canlı", "Operasyon Doğrulama", "Bugün", "Rota", "Canlı İzleme"],
  OFFERS: ["Teklifler", "Ticari Akışım", "Ticari Akış"],
  AGREEMENTS: ["Sözleşmeler", "Ticari Akışım", "Ticari Akış"],
  BUDGET: ["Bütçe ve Servis Maliyeti", "Finansal Operasyonlar"],
  FINANCE: ["Bütçe ve Servis Maliyeti", "Finansal Operasyonlar"],
});

function workflowGuidancePlan(semanticPlan) {
  if (semanticPlan?.family === "UI_GUIDANCE") return semanticPlan;
  if (semanticPlan?.family === "CONTINUE_CURRENT_REASONING" && semanticPlan?.continuationBasePlan?.family === "UI_GUIDANCE") {
    return semanticPlan.continuationBasePlan;
  }
  return null;
}

function explicitRoomOperationHealthNavigationTarget(user, semanticPlan) {
  if (roleKey(user) !== "ROOM") return null;
  const message = normalize(semanticPlan?.normalizedText || semanticPlan?.canonicalRequest?.currentRequest?.normalizedMeaning || "");
  if (!/operasyon\s+sagligi\p{L}*/iu.test(message)) return null;
  return buildRoleHelpSummary(user).screens.find((screen) => screen.label === "Operasyon Sağlığı") || null;
}

function authorizedNavigationTarget(user, semanticPlan, screenContext = null) {
  const explicitOperationHealthTarget = explicitRoomOperationHealthNavigationTarget(user, semanticPlan);
  if (explicitOperationHealthTarget) return explicitOperationHealthTarget;
  const workflowPlan = workflowGuidancePlan(semanticPlan);
  if (!workflowPlan) return null;
  const role = String(user?.role || "").toUpperCase();
  const companyKind = String(user?.companyKind || "").toUpperCase();
  const roleKey = role === "COMPANY" && ["SCHOOL", "ORGANIZATION"].includes(companyKind) ? companyKind : role;
  const roleScreens = buildRoleHelpSummary(user).screens;
  const currentPath = normalizeScreenPath(screenContext?.path);
  const currentScreen = roleScreens.find((screen) => normalizeScreenPath(screen.path) === currentPath) || null;
  const isContinuation = semanticPlan?.family === "CONTINUE_CURRENT_REASONING";
  // COMPANY's combined service-request + incoming-offer wording is owned by
  // the commercial offer flow.  The live commercial-flow screen already has
  // the offer summary; sending it back to the generic planning home would
  // hide the user's requested result and lose the active record context.
  if (roleKey === "COMPANY"
    && workflowPlan.workflowIntent === "OPEN_OFFER_SURFACE"
    && currentPath === "/company/commercial-flow") {
    return roleScreens.find((screen) => screen.label === "Vardiyalar")
      || roleScreens.find((screen) => screen.label === "Ticari Akışım")
      || null;
  }
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
  if (workflowPlan.workflowIntent === "OPEN_MAP_SURFACE") {
    return roleScreens.find((screen) => screen.path === "/room/map") || null;
  }
  if (workflowPlan.workflowIntent === "OPEN_REPORTS_SURFACE") {
    const reportsPath = roleKey === "ROOM" ? "/room/reports" : `/${String(roleKey || "company").toLowerCase()}/reports`;
    return roleScreens.find((screen) => screen.path === reportsPath) || null;
  }
  if (workflowPlan.workflowIntent === "OPEN_NOTIFICATIONS_SURFACE") {
    return roleScreens.find((screen) => screen.path === "/shared/notifications") || null;
  }
  if (workflowPlan.workflowIntent === "OPEN_OPERATION_HEALTH_SURFACE") {
    return roleScreens.find((screen) => screen.label === "Operasyon Sağlığı") || null;
  }
  if (workflowPlan.workflowIntent === "OPEN_OPERATIONS_PANEL_SURFACE") {
    return roleScreens.find((screen) => screen.label === "Operasyon Paneli")
      || roleScreens.find((screen) => normalizeScreenPath(screen.path).endsWith("/operations"))
      || null;
  }
  if (workflowPlan.workflowIntent === "OPEN_PERSONNEL_ACCESS_SURFACE") {
    return roleScreens.find((screen) => normalizeScreenPath(screen.path).endsWith("/personel-access")) || null;
  }
  if (workflowPlan.workflowIntent === "OPEN_PERSONNEL_LINKS_SURFACE") {
    return roleScreens.find((screen) => normalizeScreenPath(screen.path).endsWith("/access-links")) || null;
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

function authorizedGuidanceSurface(user, domain) {
  const labels = GUIDANCE_SCREEN_LABELS_BY_DOMAIN[String(domain || "").toUpperCase()] || [];
  const screens = buildRoleHelpSummary(user).screens;
  return labels.map((label) => screens.find((screen) => screen.label === label)).find(Boolean) || null;
}

export function isCompanyOfferCollectionReadPlan({ role, semanticPlan } = {}) {
  const typedTaskType = String(semanticPlan?.typedRequest?.taskType || semanticPlan?.taskType || "").toUpperCase();
  return String(role || "").toUpperCase() === "COMPANY"
    && semanticPlan?.requestedDomains?.includes("OFFERS")
    && ["OPEN_OFFER_SURFACE", "VIEW_OFFER_SURFACE"].includes(String(semanticPlan?.workflowIntent || ""))
    && ["SCREEN_CONTEXT", "OPEN_SURFACE", "VIEW", "COUNT"].includes(typedTaskType)
    && !semanticPlan?.entity
    && !(Array.isArray(semanticPlan?.entities) && semanticPlan.entities.length);
}

export function isSuperAdminFieldAcceptanceReadPlan({ role, message, screenContext } = {}) {
  if (String(role || "").toUpperCase() !== "SUPER_ADMIN") return false;
  if (normalizeScreenPath(screenContext?.path) !== "/superadmin/acceptance") return false;
  const text = normalize(message);
  if (!text) return false;
  return /kabul|checklist|kontrol listesi|karar|oturum|saha|bekleyen|tamamlanan|durum/iu.test(text)
    && !/yeni\s+oturum|oturumu\s+kaydet|karar[ıi]\s*(?:değiştir|degistir|ver)|madde(?:yi|yi)?\s*(?:güncelle|guncelle|kaydet)/iu.test(text);
}

export function buildFieldAcceptanceReadReply({ session } = {}) {
  const current = session && typeof session === "object" ? session : {};
  const checklist = Array.isArray(current.checklist) ? current.checklist : [];
  const total = checklist.length;
  const passed = checklist.filter((item) => String(item?.status || "").toUpperCase() === "PASS").length;
  const pending = checklist.filter((item) => String(item?.status || "").toUpperCase() !== "PASS");
  const decisionLabels = { GO: "Uygun", LIMITED_GO: "Sınırlı uygun", NO_GO: "Uygun değil" };
  const decision = decisionLabels[String(current.decision || "").toUpperCase()] || "Belirsiz";
  const firstPending = pending[0]?.label ? String(pending[0].label).trim() : "Açık kontrol maddesi yok";
  const pendingText = pending.length
    ? ` ${pending.length} madde bekliyor; ilk açık madde “${firstPending}”.`
    : " Tüm kontrol maddeleri tamamlandı.";
  return `Kabul Merkezi'nde ${passed}/${total} kontrol maddesi tamamlandı. Karar: ${decision}.${pendingText} Bu özet mevcut yetkili kabul oturumundan salt okunur olarak okundu; burada yeni oturum, karar veya checklist değişikliği başlatmadım.`;
}

function authorizedCrossMenuNavigationTarget(user, semanticPlan, screenContext = null) {
  if (!semanticPlan || semanticPlan.authorizationDecision?.status === "DENY") return null;
  const domains = Array.isArray(semanticPlan.requestedDomains)
    ? semanticPlan.requestedDomains.map((domain) => String(domain || "").toUpperCase())
    : [];
  if (!domains.length) return null;
  const roleScreens = buildRoleHelpSummary(user).screens;
  const currentPath = normalizeScreenPath(screenContext?.path);
  const role = String(user?.role || "").toUpperCase();
  const preferredLabels = [
    ["VEHICLES", "Araçlar"],
    ["OFFERS", "Teklifler"],
    ["AGREEMENTS", "Sözleşmeler"],
    ["SHIFTS", "Vardiyalar"],
    ["FINANCE", role === "ROOM" ? "Finansal Operasyonlar" : "Bütçe ve Servis Maliyeti"],
    ["BUDGET", role === "ROOM" ? "Finansal Operasyonlar" : "Bütçe ve Servis Maliyeti"],
    ["DRIVERS", "Sürücüler"],
    ["OPERATIONS", "Operasyon Merkezi"],
    ["NOTIFICATIONS", "Bildirimler"],
  ];
  for (const [domain, label] of preferredLabels) {
    if (!domains.includes(domain)) continue;
    const target = roleScreens.find((screen) => screen.label === label) || null;
    if (target && normalizeScreenPath(target.path) !== currentPath) return target;
  }
  return null;
}

function explicitOfferRecordNavigationTarget(user, semanticPlan, authorizationDecision, { allowRecordDetails = false } = {}) {
  const request = semanticPlan?.canonicalRequest || null;
  const action = request?.semanticAction || null;
  const offerId = (Array.isArray(request?.candidateEntityRefs) ? request.candidateEntityRefs : [])
    .find((candidate) => String(candidate?.type || "").toUpperCase() === "OFFER" && Number(candidate?.id) > 0)?.id || null;
  const authorized = String(authorizationDecision?.status || semanticPlan?.authorizationDecision?.status || "").toUpperCase() === "ALLOW";
  const exactRecordView = request?.operation === "VIEW_AUTHORIZED_SURFACE"
    && request?.capability === "VIEW_OFFER_SURFACE"
    && String(action?.actionClass || "").toUpperCase() === "VIEW"
    && String(action?.objectClass || "").toUpperCase() === "OFFER";
  // A selected-offer field/details read may carry the same canonical VIEW
  // envelope as a surface-navigation request.  Once a typed field lookup or
  // record-details task exists, data retrieval owns the turn; navigation must
  // not intercept it and fall back to generic screen guidance.
  const selectedOfferFieldLookup = ["FIELD_LOOKUP", "RECORD_DETAILS"].includes(
    String(semanticPlan?.typedRequest?.taskType || semanticPlan?.taskType || "").toUpperCase(),
  ) || (Array.isArray(semanticPlan?.requestedFields) && semanticPlan.requestedFields.length > 0);
  if (!authorized || !exactRecordView || !offerId) return null;
  if (selectedOfferFieldLookup && !allowRecordDetails) return null;
  const surface = authorizedGuidanceSurface(user, "OFFERS");
  return surface ? { ...surface, recordType: "OFFER", recordId: Math.trunc(Number(offerId)) } : null;
}

function explicitShiftRecordNavigationTarget(user, semanticPlan, authorizationDecision) {
  const request = semanticPlan?.canonicalRequest || null;
  const action = request?.semanticAction || null;
  const shiftId = (Array.isArray(request?.candidateEntityRefs) ? request.candidateEntityRefs : [])
    .find((candidate) => String(candidate?.type || "").toUpperCase() === "SHIFT" && Number(candidate?.id) > 0)?.id || null;
  const authorized = String(authorizationDecision?.status || semanticPlan?.authorizationDecision?.status || "").toUpperCase() === "ALLOW";
  const exactRecordView = ["VIEW_AUTHORIZED_SURFACE", "NAVIGATE_AUTHORIZED_SURFACE"].includes(
    String(request?.operation || "").toUpperCase(),
  )
    && ["VIEW_SHIFTS", "OPEN_SHIFT_SURFACE"].includes(String(request?.capability || "").toUpperCase())
    && ["VIEW", "NAVIGATE"].includes(String(action?.actionClass || "").toUpperCase())
    && String(action?.objectClass || "").toUpperCase() === "SHIFT";
  if (!authorized || !exactRecordView || !shiftId) return null;
  const surface = buildRoleHelpSummary(user).screens.find((screen) => screen.label === "Vardiyalar") || null;
  return surface
    ? {
      ...surface,
      recordType: "SHIFT",
      recordId: Math.trunc(Number(shiftId)),
      routeParams: { focusShiftId: Math.trunc(Number(shiftId)) },
    }
    : null;
}

export function resolveAuthorizedReasoningNavigationTarget({ user, screenContext = null, message = "" } = {}) {
  const role = roleKey(user);
  const currentPath = normalizeScreenPath(screenContext?.path);
  if (role !== "ROOM" || !/operasyon\s+sagligi|operasyon\s+sağlığı/iu.test(normalize(message))) return null;
  const target = buildRoleHelpSummary(user).screens.find((screen) => screen.label === "Operasyon Sağlığı") || null;
  return target && normalizeScreenPath(target.path) !== currentPath ? target : null;
}

function buildScreenContinuationAnswer({ user, semanticPlan, screenContext, role, domainMap } = {}) {
  const basePlan = semanticPlan?.continuationBasePlan;
  if (basePlan?.family !== "SCREEN_CONTEXT") return null;
  const definition = getScreenDefinitionForUser(user, screenContext || {}, Number(screenContext?.id || 0) || null);
  const currentLabel = String(screenContext?.label || definition?.label || screenContext?.path || "mevcut ekran").trim();
  const depth = Math.max(1, Number(semanticPlan?.continuationDepth || 1));
  const orderedSteps = Array.isArray(definition?.stepByStep) ? definition.stepByStep.filter(Boolean) : [];
  const nextStep = String(definition?.nextStep || "Bu ekrandaki doğrulanabilir güvenli adımdan devam et.").trim();
  const firstStep = String(definition?.firstStep || orderedSteps[0] || nextStep).trim();
  const firstStepCopy = firstStep
    .replace(/^(?:İlk|ilk)\s+kontrol:\s*/u, "")
    .replace(/[.!?]+$/u, "")
    .trim();
  const orderedStepCopy = orderedSteps.slice(0, 3).map((step) => String(step).replace(/[.!?]+$/u, "").trim()).filter(Boolean);
  const purpose = String(definition?.menuPurpose || definition?.purpose || "Yetkili işi bu yüzeyde anlamak ve ilerletmek için kullanılır.").trim();
  const body = depth === 1
    ? `${currentLabel} ekranının amacı: ${purpose} İlk güvenli kontrol: ${firstStepCopy}.`
    : depth === 2 && orderedSteps.length
      ? `${currentLabel} ekranında doğrulanabilir sıra: ${orderedStepCopy.join(" → ")}. Bu yalnızca açıklama sırasıdır; kullanıcı adına kayıt veya onay yazmıyorum.`
      : `${currentLabel} ekranında bu açıklama turunun sonraki parçası: ${nextStep} Görünür durum değişmeden tamamlandı varsaymıyorum.`;
  return {
    role,
    domainMap,
    topic: "SCREEN_CONTEXT",
    reply: body,
    nextAction: nextStep,
    records: [],
    dataSources: ["canonical screen catalog", "current live screen route", "canonical conversation state"],
    retrievedFacts: [`screen.path=${screenContext?.path || ""}`, `screen.label=${currentLabel}`, `continuation.depth=${depth}`].filter(Boolean),
    reasoning: "Devam isteği, son ekran açıklamasının kanonik ekran bilgisinden bir sonraki anlamlı açıklama birimine ilerletildi; yeni kayıt veya domain uydurulmadı.",
    priority: "Mevcut ekran bağlamı",
    semanticPlan,
  };
}

function buildCurrentScreenPurposeAnswer({ user, semanticPlan, screenContext, role, domainMap } = {}) {
  const typedRequest = semanticPlan?.typedRequest || {};
  if (typedRequest.screenContextIntent !== true || typedRequest.screenKnowledgeKind !== "SCREEN_PURPOSE") return null;
  if (!["CURRENT_SCREEN", "SELECTED_RECORD"].includes(String(semanticPlan?.scopeTarget || ""))) return null;

  const definition = getScreenDefinitionForUser(user, screenContext || {}, Number(screenContext?.id || 0) || null);
  if (!definition) return null;

  const cleanSentence = (value, fallback) => String(value || fallback || "").replace(/[.!?]+$/u, "").trim();
  const currentLabel = String(screenContext?.label || definition.label || screenContext?.path || "mevcut ekran").trim();
  const purpose = cleanSentence(definition.menuPurpose || definition.screenExplanation, "Yetkili iş akışını bu yüzeyde incelemek için kullanılır");
  const controls = (Array.isArray(definition.firstControls) ? definition.firstControls : [])
    .map((item) => cleanSentence(item, ""))
    .filter(Boolean)
    .slice(0, 3);
  const firstStep = cleanSentence(definition.firstStep || definition.stepByStep?.[0], "Bu ekrandaki ilk doğrulanabilir adımı kontrol et");
  const nextStep = cleanSentence(definition.nextStep, "Sonraki doğrulanabilir adımı mevcut ekran kanıtıyla kontrol et");
  const controlsLine = controls.length ? ` Bu ekranda: ${controls.join("; ")}.` : "";
  const reply = `${currentLabel} ekranının amacı: ${purpose}.${controlsLine} İlk güvenli kontrol: ${firstStep}. Sonraki güvenli adım: ${nextStep}.`.trim();

  return {
    role,
    domain: "SCREEN_CONTEXT",
    authorizationBoundary: false,
    authorizedDomainMap: domainMap,
    count: 0,
    records: [],
    reply,
    nextAction: nextStep,
    source: "authorized-screen-catalog-v1",
    navigationTarget: null,
    dataSources: ["authorized screen catalog", "current live screen route"],
    retrievedFacts: [`screen.path=${definition.path}`, `screen.label=${currentLabel}`],
    reasoning: "Ekran-amacı isteği, seçili kayıt bağlamı tarafından alan veya navigasyon sorgusuna dönüştürülmeden mevcut yetkili ekran kataloğundan oluşturuldu.",
    priority: "Mevcut ekran amacı",
    semanticPlan,
  };
}

export function buildCurrentScreenNextActionAnswer({ user, semanticPlan, screenContext, role, domainMap } = {}) {
  const typedRequest = semanticPlan?.typedRequest || {};
  if (semanticPlan?.family !== "UI_GUIDANCE") return null;
  if (String(typedRequest.taskType || semanticPlan?.taskType || "").toUpperCase() !== "NEXT_ACTION") return null;
  if (!screenContext?.path) return null;
  if (String(user?.role || "").toUpperCase() === "COMPANY"
    && semanticPlan?.workflowIntent === "OPEN_OFFER_SURFACE"
    && normalizeScreenPath(screenContext.path) === "/company/commercial-flow") {
    return null;
  }

  const definition = getScreenDefinitionForUser(user, screenContext || {}, Number(screenContext?.id || 0) || null);
  if (!definition) return null;

  // A selected offer is a narrower authorized context than the surrounding
  // offers surface.  Keep the screen catalog as the source of safe action
  // wording, but do not erase the live selected-record identity by returning
  // only generic surface help.
  const selectedOffer = (Array.isArray(semanticPlan?.entities) ? semanticPlan.entities : [])
    .find((entity) => String(entity?.type || '').toLowerCase() === 'offer' && Number(entity?.id) > 0)
    || (String(screenContext?.selectedEntityType || '').toLowerCase() === 'offer' && Number(screenContext?.selectedEntityId) > 0
      ? { type: 'offer', id: Number(screenContext.selectedEntityId) }
      : null);
  if (selectedOffer) {
    const selectedLabel = String(
      screenContext?.selectedRecordSummary
      || screenContext?.selectedLabel
      || `Teklif #${Number(selectedOffer.id)}`,
    ).trim();
    const recordLabel = /\bTeklif\s+#\d+/iu.test(selectedLabel)
      ? selectedLabel.match(/\bTeklif\s+#\d+[^•]*/iu)?.[0]?.trim() || `Teklif #${Number(selectedOffer.id)}`
      : `Teklif #${Number(selectedOffer.id)}`;
    const nextAction = `${recordLabel} kartında bağlı vardiya, araç/sürücü ve saat bilgisini birlikte doğrula; kullanıcı onayı olmadan kabul, karşı teklif veya ödeme işlemi başlatmıyorum.`;
    return {
      role,
      domain: 'OFFERS',
      authorizationBoundary: false,
      authorizedDomainMap: domainMap,
      count: 1,
      records: [recordLabel],
      reply: `Şu anda ${recordLabel} seçili. Sıradaki güvenli adım: ${nextAction}`,
      nextAction,
      source: 'authorized-selected-offer-screen-context-v1',
      navigationTarget: null,
      dataSources: ['current live screen selection', 'authorized offers screen catalog', 'canonical semantic next-action'],
      retrievedFacts: [`selected.entityType=offer`, `selected.entityId=${Number(selectedOffer.id)}`],
      reasoning: 'Seçili teklif kimliği, yetkili canlı ekran bağlamından korundu; ekran-geneli rehber seçili kaydın yerine geçirilmedi ve yazma işlemi başlatılmadı.',
      priority: 'Seçili teklif için güvenli sonraki adım',
      semanticPlan,
    };
  }

  const cleanSentence = (value, fallback) => String(value || fallback || "")
    .replace(/[.!?]+$/u, "")
    .trim();
  const currentLabel = String(screenContext?.label || definition.label || screenContext.path).trim();
  const purpose = cleanSentence(
    definition.menuPurpose || definition.screenExplanation,
    "Yetkili iş akışını bu yüzeyde incelemek için kullanılır",
  );
  const firstStep = cleanSentence(
    definition.firstStep || definition.stepByStep?.[0],
    "Önce ekrandaki yetkili durum özetini kontrol et",
  );
  const nextStep = cleanSentence(
    definition.nextStep,
    "Sonraki doğrulanabilir adımı mevcut ekran kanıtıyla kontrol et",
  );

  return {
    role,
    domain: "SCREEN_CONTEXT",
    authorizationBoundary: false,
    authorizedDomainMap: domainMap,
    count: 0,
    records: [],
    reply: `${currentLabel} ekranındasın. ${purpose}. İlk güvenli adım: ${firstStep}. Sonraki güvenli adım: ${nextStep}.`,
    nextAction: nextStep,
    source: "authorized-screen-catalog-v1",
    navigationTarget: null,
    dataSources: ["authorized screen catalog", "current live screen route", "canonical semantic next-action"],
    retrievedFacts: [`screen.path=${definition.path}`, `screen.label=${currentLabel}`],
    reasoning: "Seçili ekrandaki NEXT_ACTION isteği, başka bir domainin kayıt özetiyle genişletilmeden mevcut yetkili ekran kataloğundan yanıtlandı.",
    priority: "Mevcut ekranın güvenli sonraki adımı",
    semanticPlan,
  };
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

export function isSelectedAgreementReadContext({ role, screenContext, semanticPlan } = {}) {
  const selectedAgreementId = Number(
    screenContext?.selectedEntityId
      || screenContext?.selectedRecordId
      || 0,
  ) || 0;
  return ["SCHOOL", "ORGANIZATION"].includes(String(role || "").toUpperCase())
    && String(screenContext?.selectedEntityType || screenContext?.selectedRecordType || "").trim().toLowerCase() === "agreement"
    && selectedAgreementId > 0
    && Array.isArray(semanticPlan?.requestedDomains)
    && semanticPlan.requestedDomains.includes("AGREEMENTS")
    && semanticPlan.requestedDomains.every((domain) => ["AGREEMENTS", "SHIFTS", "OPERATIONS"].includes(domain));
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

function buildReasoningTaskModel({ actionable, vehicleIssues, shiftSnapshot, offers, agreements, finance, operationHealthIssues = [], preferShift = false }) {
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
  if (Array.isArray(operationHealthIssues) && operationHealthIssues.length) {
    for (const issue of operationHealthIssues.slice(0, 12)) {
      const title = String(issue?.title || '').trim();
      if (!title) continue;
      problems.push({
        kind: "PROBLEM",
        title,
        reason: String(issue?.detail || "Yetkili Operasyon Sağlığı issue kaydı açık durumda.").trim(),
        next: "Operasyon Sağlığı ekranındaki Sürücü & Sorunlar sekmesinde bu kaydı açıp bağlı sürücü kanıtını doğrula.",
      });
    }
  }
  if (!operationHealthIssues.length && Number(vehicleIssues?.count || 0) > 0) {
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
    const category = String(event?.category || "").toUpperCase();
    if (category === "AGREEMENT") {
      information.push({
        kind: "INFORMATION",
        title,
        reason: "Bu ticari/karar takibi bulgusudur; tek başına operasyon arızası olarak sınıflandırılmadı.",
      });
    } else if (["KRİTİK", "BUGÜN ÇÖZÜLMELİ", "KRITIK"].includes(group)) {
      problems.push({ kind: "PROBLEM", title, reason: "Bu bulgu operasyonun devamı veya karar akışı için tamamlanması gereken bir eksik gösteriyor.", next: "Kaydı açıp eksik bağın kaynağını doğrula." });
    } else if (group === "FIRSAT") {
      opportunities.push({ kind: "OPPORTUNITY", title, reason: "Bu bir sorun değil; karar verilmeden önce değerlendirilecek fırsat sinyali.", next: "Bağlı kayıt ve kapasite koşullarını karşılaştır." });
    } else if (title) {
      information.push({ kind: "INFORMATION", title, reason: "Bu mevcut durum bilgisidir; tek başına sorun olarak sınıflandırılmadı." });
    }
  }
  if (Number(shiftSnapshot?.count || 0) > 0) information.push({ kind: "INFORMATION", title: `${shiftSnapshot.count} yetkili vardiya kaydı`, reason: "Bu operasyon kapsamını gösterir; tek başına sorun değildir." });
  if (Number(offers?.count || 0) > 0) information.push({ kind: "INFORMATION", title: `${offers.count} yetkili teklif kaydı`, reason: "Teklif varlığı bilgi sinyalidir; karşılaştırma yapılmadan sorun sayılmaz." });
  if (Number(agreements?.count || 0) > 0 && !events.some((event) => String(event?.category || "").toUpperCase() === "AGREEMENT")) {
    information.push({ kind: "INFORMATION", title: `${agreements.count} yetkili sözleşme inceleme kaydı`, reason: "İnceleme kuyruğudur; aciliyet ayrıca doğrulanır." });
  }
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
  const informationText = model.information.length
    ? model.information.slice(0, 4).map((item) => `• ${item.title}${item.reason ? ` — ${item.reason}` : ""}`).join(" ")
    : "Ek bilgi sinyali yok.";
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
  const selectedNotificationContext = Number(screenContext?.selectedEntityId || conversationState?.selectedEntityId || 0) > 0
    && String(screenContext?.selectedEntityType || conversationState?.selectedEntityType || "").toLowerCase() === "notification"
    && /(?:seçili|secili|bu)\s+(?:bildirim|uyarı|uyari|notification)|(?:bildirim|uyarı|uyari|notification).*\b(?:seçili|secili|bu)\b/iu.test(String(message || ""));
  if (semanticPlan.clarificationNeed
    && !selectedNotificationContext
    && resolveFieldPrivacyPolicy({ user, message, plan: semanticPlan }).status !== "DENY") {
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
  if (isUnselectedShiftRecordLookup({ user, message, screenContext })) {
    return reasoningResult({
      role,
      domainMap,
      topic: "CLARIFICATION",
      reply: "Birden fazla yetkili vardiya kaydı var; önce Vardiyalar listesinden incelemek istediğin vardiyayı seç. Seçim yapmadan ilk veya varsayılan vardiyayı göstermiyorum.",
      nextAction: "Vardiyalar listesinden bir kayıt seçip tekrar sor.",
      records: [],
      dataSources: ["güncel yetkili vardiya listesi", "ROOM tenant kapsamı"],
      retrievedFacts: ["selected shift is absent", "multiple shift records are visible"],
      reasoning: "Birden fazla vardiya varken seçili kayıt yok; ilk satır veya eski konuşma bağlamı hedef olarak kullanılmadı.",
      priority: "Netleştirme gerekli",
      semanticPlan: { ...semanticPlan, family: "CLARIFICATION", intentFamily: "CLARIFICATION" },
    });
  }
  const typedTask = semanticPlan.typedRequest?.taskType;
  const operationHealthIssueQuestion = /açık sorun|acik sorun|sorunları|sorunlari|riskli cihaz|konum sinyali|çevrim dışı|cevrim disi|canlılık|canlilik/i.test(String(message || ''));
  const operationHealthIssueDomain = Array.isArray(semanticPlan.requestedDomains)
    && semanticPlan.requestedDomains.length === 1
    && semanticPlan.requestedDomains[0] === "OPERATIONS";
  const operationHealthIssueScreenContext = screenContext?.path === "/room/operation-health"
    && operationHealthIssueQuestion
    && operationHealthIssueDomain;
  if (typedTask === "SCREEN_CONTEXT" && screenContext?.path && (!(semanticPlan.requestedDomains || []).length || operationHealthIssueScreenContext)) {
    if (screenContext.path === "/room/operation-health" && operationHealthIssueQuestion) {
      let authoritativeIssueRecords = [];
      let authoritativeCounters = null;
      try {
        const snapshot = await buildRoomObservabilitySnapshot(user);
        authoritativeIssueRecords = Array.isArray(snapshot?.issues) ? snapshot.issues : [];
        authoritativeCounters = snapshot?.cards && typeof snapshot.cards === "object" ? snapshot.cards : null;
      } catch {
        authoritativeIssueRecords = [];
        authoritativeCounters = null;
      }
      const healthState = buildOperationHealthState({
        message,
        rawMessage: message,
        questionType: "STATUS_HELP",
        interactionIntentFamily: "ISSUE_DIAGNOSTIC",
        roleMode: "OPERATIONS",
        userRole: role,
        user,
        screenPath: screenContext.path,
        screenDefinition: getScreenDefinitionForUser(user, screenContext, Number(screenContext?.id || 0) || null),
        screenContext,
        sourceScreenContext: screenContext,
        entityType: "screen",
        issueRecords: authoritativeIssueRecords,
        authoritativeCounters,
      });
      if (healthState.shouldRespond && healthState.reply) {
        return reasoningResult({
          role,
          domainMap,
          topic: "ISSUE_DIAGNOSTIC",
          reply: healthState.reply,
          nextAction: healthState.nextBestAction,
          records: healthState.healthSignals,
          dataSources: ["current authorized operation-health screen facts"],
          retrievedFacts: healthState.evidence,
          reasoning: "Güncel Operasyon Sağlığı ekranının açık sorun ve canlılık göstergeleri kullanıldı; önceki seçili kayıt metni bu özeti gölgeleyemez.",
          priority: healthState.counters?.openIssues > 0 ? "Açık sorunlar" : "Operasyon sağlığı",
          semanticPlan: { ...semanticPlan, family: "ISSUE_DIAGNOSTIC", intentFamily: "ISSUE_DIAGNOSTIC" },
        });
      }
    }
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
    if (selectedType === "notification") {
      const notificationRead = await readNotifications(user, role, semanticPlan);
      const selectedNotification = buildSelectedNotificationContextReply({ selectedId, notificationRead });
      return reasoningResult({
        role,
        domainMap,
        topic: "SELECTED_RECORD_CONTEXT",
        reply: selectedNotification.reply,
        nextAction: selectedNotification.nextAction,
        records: selectedNotification.records,
        dataSources: ["current live notification selection", "authorized notification record read"],
        retrievedFacts: selectedNotification.retrievedFacts,
        reasoning: "Seçili bildirim, canlı ekran kimliğiyle yetki kapsamına göre yeniden okundu; ham payload ve başka bildirim özeti kullanılmadı.",
        priority: "Seçili bildirim bağlamı",
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
  const operationHealthMetricIntent = semanticPlan.operationHealthMetricIntent === true
    && String(semanticPlan.operationHealthMetricMode || "").trim() !== "";
  const screenScopedDecision = !operationHealthMetricIntent
    && semanticPlan.scopeTarget === "CURRENT_SCREEN"
    && ["SCREEN_OR_SITUATION_SUMMARY", "NEXT_STEP", "PRIORITY", "RISK_RANKING", "ISSUE_DIAGNOSTIC"].includes(semanticPlan.family);
  const serverScreenTruth = screenScopedDecision
    ? await resolveAuthorizedCurrentScreenTruth({ user, screenContext })
    : null;
  const visibleScreenFacts = serverScreenTruth?.available
    ? serverScreenTruth.visibleText
    : buildVisibleFactText(screenContext);
  const shouldReadScreenIssueRecords = role === "ROOM"
    && /\/room\/operation-health\b/i.test(String(screenContext?.path || ""))
    && semanticPlan.family === "ISSUE_DIAGNOSTIC";
  const screenIssueRecords = shouldReadScreenIssueRecords
    ? await buildRoomObservabilityIssues(user).catch(() => [])
    : [];
  if (screenScopedDecision && serverScreenTruth?.available) {
    const reply = serverScreenTruth.zeroState
      ? screenScopedZeroStateReply(semanticPlan.family, role, screenIssueRecords)
      : screenScopedVisibleStateReply(semanticPlan.family, visibleScreenFacts, role, screenIssueRecords);
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
      ? screenScopedZeroStateReply(semanticPlan.family, role, screenIssueRecords)
      : screenScopedVisibleStateReply(semanticPlan.family, visibleScreenFacts, role, screenIssueRecords);
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
  if ((semanticPlan.family === "AUTHORIZATION_BOUNDARY" || isUnauthorizedCommercialQuestion(message, role))
    && !isSelectedAgreementReadContext({ role, screenContext, semanticPlan })) {
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
    && !(semanticPlan.entities[0]?.type === "agreement"
      && Array.isArray(semanticPlan.requestedFields)
      && semanticPlan.requestedFields.some((field) => ["PAYMENT_MODE", "SOURCE_STATUS", "SEFER_SCORE", "SEFER_SCORE_MISSING"].includes(String(field?.key || "").toUpperCase())))
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
  // A visible risk suggestion on the ROOM offers surface must not silently
  // fall through to the role-global route/cost snapshot when no offer is
  // selected.  That would answer a different question (for example with a
  // Vardiya route ranking) instead of preserving the current offers context.
  const roomOffersRiskWithoutSelection = semanticPlan.scopeTarget === "CURRENT_SCREEN"
    && semanticPlan.family === "RISK_RANKING"
    && /\/room\/offers\b/i.test(String(screenContext?.path || ""))
    && !(Array.isArray(semanticPlan.entities) && semanticPlan.entities.some((entity) => String(entity?.type || "").toLowerCase() === "offer" && Number(entity?.id) > 0))
    && !Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0);
  if (roomOffersRiskWithoutSelection) {
    return reasoningResult({
      role,
      domainMap,
      topic: "RISK_RANKING",
      reply: "Riskleri teklif bazında karşılaştırmam için önce listeden bir teklif seçmelisin. Seçili teklif olmadan başka bir vardiyanın riskini bu ekrana taşımıyorum.",
      nextAction: "Teklifler listesinden incelenecek teklifi seç; ardından riskleri yeniden sor.",
      records: [],
      dataSources: ["current live offers screen", "authorized selected-record boundary"],
      retrievedFacts: ["selected offer unavailable", "role-global route risk substitution blocked"],
      reasoning: "ROOM Teklifler ekranındaki RISK_RANKING isteği seçili teklif olmadan rol-geneli rota/maliyet kuyruğuna düşürülmedi; kullanıcıdan önce yetkili teklif seçmesi istendi.",
      priority: "Seçili teklif gerekli",
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
  const canonicalOperationHealthDiagnostic = semanticPlan.family === "ISSUE_DIAGNOSTIC"
    || semanticPlan.canonicalRequest?.operation === "DIAGNOSE_CURRENT_ISSUE";
  const shouldReadOperationHealthIssues = role === "ROOM"
    && /\/room\/operation-health\b/i.test(String(screenContext?.path || ""))
    && canonicalOperationHealthDiagnostic;
  const [actionable, vehicleIssues, shiftSnapshot, offers, agreements, finance, operations, drivers, operationHealthIssues] = await Promise.all([
    buildActionableEventsForUser(user),
    includeVehicleSignals && domainMap.domains.includes("VEHICLES") ? readVehicles(user, role, semanticPlan) : Promise.resolve({ domain: "VEHICLES", count: 0, records: [] }),
    domainMap.domains.includes("SHIFTS") ? readShifts(user, role, /atanmamis/.test(text), semanticPlan) : Promise.resolve({ domain: "SHIFTS", count: 0, records: [] }),
    domainMap.domains.includes("OFFERS") ? readOffers(user, role, semanticPlan) : Promise.resolve({ domain: "OFFERS", count: 0, records: [] }),
    domainMap.domains.includes("AGREEMENTS") ? readAgreements(user, role, semanticPlan) : Promise.resolve({ domain: "AGREEMENTS", count: 0, records: [] }),
    domainMap.domains.includes("FINANCE") || domainMap.domains.includes("BUDGET") ? readFinance(user, role, semanticPlan.family === "COST_TREND") : Promise.resolve({ domain: "FINANCE", count: 0, records: [] }),
    needsOperations && domainMap.domains.includes("OPERATIONS") ? readOperations(user, role, semanticPlan) : Promise.resolve({ domain: "OPERATIONS", count: 0, records: [] }),
    semanticPlan.requestedDomains.includes("DRIVERS") && domainMap.domains.includes("DRIVERS") ? readDrivers(user, role, semanticPlan) : Promise.resolve({ domain: "DRIVERS", count: 0, records: [] }),
    shouldReadOperationHealthIssues ? buildRoomObservabilityIssues(user) : Promise.resolve([]),
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
    operationHealthIssues,
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
  const operationHealthDiagnosticTurn = canonicalOperationHealthDiagnostic
    && role === "ROOM"
    && /\/room\/operation-health\b/i.test(String(screenContext?.path || ""));
  if (["SCREEN_OR_SITUATION_SUMMARY", "ISSUE_DIAGNOSTIC", "RESOLUTION_PLAN", "PRIORITY", "NEXT_STEP", "CAUSE_WHY", "RISK_RANKING"].includes(semanticPlan.family)
    || operationHealthDiagnosticTurn) {
    if (operationHealthMetricIntent && semanticPlan.family === "ISSUE_DIAGNOSTIC") {
      const metric = await readOperationHealthMetricContract({ user, screenContext, vehicleIssues, agreements, offers });
      return reasoningResult({
        role,
        domainMap,
        topic: "ISSUE_DIAGNOSTIC",
        reply: buildOperationHealthMetricReply(semanticPlan.operationHealthMetricMode, metric),
        nextAction: "Özet issue kategorisini, ilgili GPS/sürücü satırını ve gerekiyorsa Kanıt sekmesini aynı ekran kapsamıyla kontrol et; ticari takip bulgularını operasyon arızası olarak işleme.",
        records: [
          ...(Array.isArray(metric.issueRecords) ? metric.issueRecords.map((item) => `${item.title}${item.detail ? ` — ${item.detail}` : ""}`) : []),
          ...vehicleIssues.records,
          ...agreements.records,
          ...offers.records,
        ].slice(0, 12),
        dataSources: ["current authorized ROOM operation-health facts", "authorized ROOM issue records", "authorized vehicle/location records", "authorized agreement and offer records", "ROOM daily report projection facts"],
        retrievedFacts: [
          metric.openIssues == null ? "openIssues unavailable" : `openIssues=${metric.openIssues}`,
          ...(Array.isArray(metric.issueRecords) ? metric.issueRecords.map((item) => `issue=${item.title}${item.severity ? ` (${item.severity})` : ""}`) : []),
          metric.staleOrOfflineDrivers == null ? "staleOrOffline unavailable" : `staleOrOffline=${metric.staleOrOfflineDrivers}`,
          metric.dailyVehicleTotal == null ? "dailyVehicleTotal unavailable" : `dailyVehicleTotal=${metric.dailyVehicleTotal}`,
          metric.dailyShiftTotal == null ? "dailyShiftTotal unavailable" : `dailyShiftTotal=${metric.dailyShiftTotal}`,
          metric.vehicleStaleGpsEvidence == null ? "vehicleStaleGps unavailable" : `vehicleStaleGps=${metric.vehicleStaleGpsEvidence}`,
          metric.agreementReviewEvidence == null ? "agreementReview unavailable" : `agreementReview=${metric.agreementReviewEvidence}`,
          metric.offerResponseEvidence == null ? "offerResponse unavailable" : `offerResponse=${metric.offerResponseEvidence}`,
        ],
        reasoning: "Operation-health metric soruları yalnızca typed metric intent ile bu read-only metric contract yoluna alındı; yetkili issue kayıtları başlık, önem ve detaylarıyla sayaçlardan ayrı korunurken günlük rapor projeksiyonları ve ticari takip bulguları eşitlenmeden ayrı kaynaklar olarak açıklanıyor.",
        priority: "Metric tanımı ve projeksiyon ayrımı",
        semanticPlan,
      });
    }
    if (canonicalOperationHealthDiagnostic
      && role === "ROOM"
      && /\/room\/operation-health\b/i.test(String(screenContext?.path || ""))
      && Array.isArray(operationHealthIssues)
      && operationHealthIssues.length) {
      const issueReply = `Bu ekranda doğrulanmış açık sorunlar: ${formatScreenIssueRecords(operationHealthIssues)}.`;
      return reasoningResult({
        role,
        domainMap,
        topic: "ISSUE_DIAGNOSTIC",
        reply: issueReply,
        nextAction: "Sürücü & Sorunlar sekmesinde ilgili satırın kanıtını kontrol et; güncel veri gelmeden iş verisini değiştirmiyorum.",
        records: operationHealthIssues.map((item) => `${item.title}${item.detail ? ` — ${item.detail}` : ""}`).slice(0, 12),
        dataSources: ["current authorized operation-health issue records", "ROOM operation-health read-only scope"],
        retrievedFacts: operationHealthIssues.map((item) => `issue=${item.title}${item.severity ? ` (${item.severity})` : ""}`).slice(0, 12),
        reasoning: "Operasyon Sağlığı issue planı, görünür sayaç özeti yerine aynı yetkili ekranın doğrulanmış issue kayıtlarını korudu; başka ekrandan kayıt ikamesi yapılmadı.",
        priority: "Operasyon Sağlığı açık sorunları",
        semanticPlan,
      });
    }
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

function formatScreenIssueRecords(issueRecords = []) {
  const severityLabels = { HIGH: "Yüksek", MEDIUM: "Orta", LOW: "Düşük" };
  return (Array.isArray(issueRecords) ? issueRecords : [])
    .filter((item) => item && String(item.title || "").trim())
    .slice(0, 12)
    .map((item) => {
      const severity = severityLabels[String(item.severity || "").toUpperCase()] || String(item.severity || "").trim();
      const detail = String(item.detail || "")
        .replace(/\bstale\s*\/\s*offline\b/giu, "güncel değil / çevrim dışı")
        .trim();
      return `${String(item.title).trim()}${severity ? ` (önem: ${severity}, durum: açık)` : " (durum: açık)"}${detail ? ` — ${detail}` : ""}`;
    })
    .join("; ");
}

function screenScopedZeroStateReply(family, role, issueRecords = []) {
  const roleContext = roleActionContext(role);
  if (family === "RISK_RANKING") return `Bu ekranda doğrulanmış risk yok. Görünen kritik, bugün çözülmeli, takip ve fırsat sayaçları sıfır; başka bir ekrandaki sinyali bu ekranın riski olarak kullanmıyorum. Sonraki güvenli adım: ${roleContext}`;
  if (family === "SCREEN_OR_SITUATION_SUMMARY") return `Bu ekranda takip gerektiren açık sorun veya fırsat görünmüyor; görünür kritik, bugün çözülmeli, takip ve fırsat sayaçları sıfır. Güvenli izleme: ${roleContext}`;
  if (family === "ISSUE_DIAGNOSTIC") {
    if (Array.isArray(issueRecords) && issueRecords.length) {
      return `Bu ekranda doğrulanmış açık sorunlar: ${formatScreenIssueRecords(issueRecords)}.`;
    }
    return "Bu ekranda doğrulanmış açık sorun veya fırsat görünmüyor. Görünen sayaçlar sıfır olduğu için başka bir ekranın genel sinyalini burada sorun olarak göstermiyorum.";
  }
  if (family === "PRIORITY") return `Bu ekranda birinci öncelik gerektiren doğrulanmış kayıt yok. Gerekçe: görünür kritik, bugün çözülmeli, takip ve fırsat sayaçları sıfır. Sonraki güvenli adım: ${roleContext}`;
  return `Hemen sonraki güvenli adım: bu ekranda yeni bir uyarı veya kayıt oluşup oluşmadığını izlemek; doğrulanmış sorun yokken işlem başlatmamak. ${roleContext}`;
}

function screenScopedVisibleStateReply(family, visibleFacts, role, issueRecords = []) {
  const roleContext = roleActionContext(role);
  if (family === "SCREEN_OR_SITUATION_SUMMARY") return `Bu ekranda görünen durum: ${visibleFacts}. En önemli takip noktası, bu görünür göstergelerde değişiklik olup olmadığını aynı ekran kapsamındaki yetkili kayıtlarla doğrulamaktır.`;
  if (family === "ISSUE_DIAGNOSTIC") {
    const issueText = Array.isArray(issueRecords) && issueRecords.length
      ? ` Yetkili açık sorunlar: ${formatScreenIssueRecords(issueRecords)}.`
      : "";
    return `Bu ekranda görünen sinyal: ${visibleFacts}.${issueText} Bu ekran özeti tek başına belirli bir kayıt veya yeni bir risk nedeni göstermediği için başka ekrandan kayıt ikame etmiyorum. Sonraki güvenli adım: ${roleContext}`;
  }
  if (family === "RISK_RANKING") return `Bu ekranda görünen sinyal: ${visibleFacts}. Bu ekran özeti tek başına belirli bir kayıt veya yeni bir risk nedeni göstermediği için başka ekrandan kayıt ikame etmiyorum. Sonraki güvenli adım: ${roleContext}`;
  if (family === "PRIORITY") return `Bu ekranda önceliklendirme için görünen sinyal: ${visibleFacts}. Gerekçe: yalnızca bu ekranın görünür ve yetkili durumunu kullanıyorum. Sonraki güvenli adım: ${roleContext}`;
  return `Bu ekranda görünen durum: ${visibleFacts}. Hemen sonraki güvenli adım: ${roleContext}`;
}

function authorizedDiscourseEntities({ domain, facts = [] } = {}) {
  const normalizedDomain = String(domain || "").toUpperCase();
  const rows = Array.isArray(facts) ? facts : [];
  if (!rows.length || !["AGREEMENTS", "OFFERS", "SHIFTS"].includes(normalizedDomain)) return [];
  const type = normalizedDomain === "AGREEMENTS" ? "agreement" : normalizedDomain === "OFFERS" ? "offer" : "shift";
  const ids = [...new Set(rows.map((row) => Number(row?.[`${type}Id`] ?? row?.id)).filter((id) => Number.isInteger(id) && id > 0))];
  return ids.length === 1 ? [{ type, id: ids[0], source: "AUTHORIZED_RESULT" }] : [];
}

function reasoningResult({ role, domainMap, topic, reply, nextAction, records, dataSources = [], retrievedFacts = [], reasoning = "", priority = "", followUpContext = "", semanticPlan = null, discourseEntities = [] }) {
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
    discourseEntities: Array.isArray(discourseEntities) ? discourseEntities : [],
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
    ACCEPTED: "Kabul edildi",
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
  return formatMoneyMinor(value, "TL");
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
  return canonicalGpsStatus(row) !== "LIVE";
}

function gpsFreshness(row) {
  const status = canonicalGpsStatus(row);
  if (!row?.gpsLast?.at) return "UNKNOWN";
  return status === "LIVE" ? "FRESH" : status;
}

function canonicalGpsStatus(row) {
  return gpsStatusFromAt(row?.gpsLast?.at).status;
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
          driver: { select: { fullName: true } },
          company: { select: { id: true, name: true } },
        },
      },
      noteCompany: true,
      noteRoom: true,
    },
  });
  const facts = rows.map((row) => ({
    ...offerQualityAndRisk(row),
    // SUPER_ADMIN has system-wide read-only visibility, not a raw personal
    // data projection. Preserve the relationship while masking the name.
    driverLabel: role === "SUPER_ADMIN"
      ? (row.driverId ? `Sürücü #${row.driverId}` : null)
      : (row.shift?.driver?.fullName || null),
    id: row.id,
    offerId: row.id,
    shiftId: row.shiftId,
    vehicleId: row.shift?.vehicleId || null,
    driverId: row.shift?.driverId || null,
    companyId: row.shift?.company?.id || null,
    companyName: row.shift?.company?.name || null,
    noteCompany: sanitizeUserFacingOfferNote(row.noteCompany),
    noteRoom: sanitizeUserFacingOfferNote(row.noteRoom),
    note: sanitizeUserFacingOfferNote(row.noteRoom) || sanitizeUserFacingOfferNote(row.noteCompany),
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
    evidence: [
      `offer.id=${row.id}`,
      `offer.shiftId=${row.shiftId}`,
      row.shift?.company?.id ? `offer.companyId=${row.shift.company.id}` : null,
    ].filter(Boolean),
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
  const shiftEntities = planEntities(plan, "shift");
  const agreementCollectionCount = String(plan?.typedRequest?.taskType || plan?.taskType || "").toUpperCase() === "COUNT"
    && String(plan?.typedRequest?.targetEntityType || "").toUpperCase() === "AGREEMENT";
  const scopedAgreementEntities = agreementCollectionCount ? [] : agreementEntities;
  const agreementStatusScope = agreementStatusScopeForPlan(plan, scopedAgreementEntities, shiftEntities);
  const base = role === "ROOM"
    ? { roomId: integer(user?.roomId) || -1, ...agreementStatusScope }
    : role === "SUPER_ADMIN"
      ? { ...agreementStatusScope }
      : { ...companyFilter(user), ...agreementStatusScope };
  const where = scopedAgreementEntities.length
    ? { ...base, id: { in: scopedAgreementEntities.map((entity) => entity.id) } }
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
  // Resolve quality suggestions from the same server-authorized preview that
  // backs the selected agreement card. Collection reads stay lightweight.
  const selectedAgreementIds = scopedAgreementEntities.length
    ? rows.map((row) => Number(row.id)).filter((id) => id > 0)
    : [];
  const seferScoreByAgreementId = {};
  if (selectedAgreementIds.length) {
    const previews = await Promise.all(rows.map(async (row) => {
      try {
        return [Number(row.id), await computeSeferScorePreview({ agreement: row, agreementId: row.id })];
      } catch {
        return [Number(row.id), null];
      }
    }));
    for (const [id, preview] of previews) {
      if (id > 0 && preview) seferScoreByAgreementId[id] = preview;
    }
  }
  const commercialSourceByAgreementId = {};
  if (selectedAgreementIds.length) {
    const sources = await prisma.commercialSource.findMany({
      where: { agreementId: { in: selectedAgreementIds } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true, agreementId: true, sourceType: true, shiftRootId: true, paymentModeSnapshot: true, settlementStatus: true },
    });
    for (const source of sources) {
      const id = Number(source.agreementId || 0);
      if (id > 0 && !commercialSourceByAgreementId[id]) commercialSourceByAgreementId[id] = source;
    }
  }
  const facts = rows.map((row) => {
    const bridge = agreementBridgeById[Number(row.id)] || null;
    const seferScore = seferScoreByAgreementId[Number(row.id)] || null;
    const commercialSource = commercialSourceByAgreementId[Number(row.id)] || null;
    const paymentMode = String(commercialSource?.paymentModeSnapshot || "").toUpperCase();
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
      seferScore: seferScore?.score ?? null,
      seferScoreText: seferScore ? `${Number(seferScore.score).toFixed(2)} / ${Number(seferScore.scoreMax || 5).toFixed(0)}` : null,
      seferScoreStatus: seferScore?.status || null,
      seferScoreStatusText: seferScore?.status === "RISKY"
        ? "Riskli"
        : seferScore?.status === "NEEDS_MORE_PROOF"
          ? "Daha fazla kanıt gerekli"
          : seferScore?.status === "READY"
            ? "Hazır"
            : seferScore?.status === "INSUFFICIENT_DATA"
              ? "Yetersiz veri"
              : null,
      seferScoreLevel: seferScore?.levelLabel || seferScore?.level || null,
      seferScoreRiskReasons: Array.isArray(seferScore?.riskReasons) ? seferScore.riskReasons : [],
      seferScoreMissingSignals: Array.isArray(seferScore?.missingSignals) ? seferScore.missingSignals : [],
      seferScoreSummaryText: seferScore?.summaryText || null,
      paymentModeSnapshot: paymentMode || null,
      paymentModeText: paymentMode === "REQUIRED"
        ? "Zorunlu"
        : paymentMode === "OPTIONAL"
          ? "İsteğe bağlı"
          : paymentMode === "OFF"
            ? "Kapalı"
            : null,
      paymentStatusText: commercialSource?.settlementStatus ? String(commercialSource.settlementStatus) : null,
      sourceType: commercialSource?.sourceType || null,
      sourceStatusText: commercialSource
        ? `Kaynak kaydı mevcut${commercialSource.shiftRootId ? ` • kaynak vardiya #${commercialSource.shiftRootId}` : ""}`
        : "Kaynak kaydı yok",
      agreementSource: commercialSource ? "CANONICAL_AGREEMENT_SOURCE" : "NO_CANONICAL_SOURCE",
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
  const contractGeneratedShiftCollection = [plan?.relationshipIntent, plan?.relationSpec]
    .filter(Boolean)
    .some((relation) => relation?.kind === "AGREEMENT_TO_SHIFT_COLLECTION");
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
  const temporal = explicitShift || relationIds.length || vehicleEntities.length || contractGeneratedShiftCollection
    ? {}
    : temporalWhere(plan?.temporalMode);
  const selectedRoomShiftScope = role === "ROOM" && explicitShift
    ? buildRoomSelectedShiftScope(user?.roomId)
    : null;
  // The ROOM shifts screen also exposes agreement-backed shifts that do not
  // carry roomId but are offered to this room through an active offer. Keep
  // the same authorization boundary as /api/shifts?includeOffered=1 for the
  // assistant's generated-shift collection lookup.
  const scopedBase = selectedRoomShiftScope
    || (relationOnly && role === "ROOM"
    ? {}
    : contractGeneratedShiftCollection && role === "ROOM"
      ? {
        OR: [
          { roomId: integer(user?.roomId) || -1 },
          { offers: { some: { roomId: integer(user?.roomId) || -1, status: { in: ["OPEN", "COUNTERED"] } } } },
        ],
      }
      : base);
  const where = {
    ...scopedBase,
    ...(explicitShift ? { id: { in: directShiftEntities.map((entity) => entity.id) } } : relationIds.length ? { id: { in: relationIds } } : temporal),
    ...(vehicleEntities.length ? {
      vehicle: {
        is: vehicleEntities.some((entity) => entity.id)
          ? { id: { in: vehicleEntities.map((entity) => entity.id).filter(Boolean) } }
          : { plate: { in: vehiclePlateCandidates(vehicleEntities) } },
      },
    } : {}),
    ...(contractGeneratedShiftCollection ? { agreementId: { not: null } } : {}),
    ...(onlyMissingAssignment ? { AND: [{ OR: [{ vehicleId: null }, { driverId: null }] }] } : {}),
  };
  let rows = await prisma.shift.findMany({
    where,
    orderBy: { startAt: "asc" },
    take: 20,
    select: {
      id: true,
      status: true,
      agreementId: true,
      startAt: true,
      endAt: true,
      vehicleId: true,
      driverId: true,
      routeSnapshotDistanceM: true,
      routeSnapshotDurationSec: true,
      routeSnapshotValidatedAt: true,
      room: { select: { id: true, name: true } },
      vehicle: { select: { plate: true } },
      driver: { select: { fullName: true } },
      people: {
        select: {
          personel: {
            select: {
              credentials: {
                where: { status: "ACTIVE" },
                select: { type: true },
              },
            },
          },
        },
      },
      stops: {
        orderBy: { order: "asc" },
        take: 10,
        select: { name: true, order: true },
      },
      checkinEvents: { select: { eventType: true } },
      _count: { select: { stops: true, people: true } },
    },
  });
  const facts = rows.map((row) => {
    const routeStops = Array.isArray(row.stops)
      ? row.stops.map((stop) => String(stop?.name || "").trim()).filter(Boolean)
      : [];
    const routeDistanceM = Number(row.routeSnapshotDistanceM);
    const routeDistanceKm = Number.isFinite(routeDistanceM) && routeDistanceM > 0
      ? (routeDistanceM / 1000).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;
    const routeText = routeStops.length || routeDistanceKm
      ? [
        routeStops.length ? `${routeStops.length} planlanan durak${routeStops.length <= 3 ? `: ${routeStops.join(", ")}` : ""}` : null,
        routeDistanceKm ? `${routeDistanceKm} km planlanan yol ağı mesafesi` : null,
        "gerçek GPS/sürüş kanıtı değil",
      ].filter(Boolean).join(" • ")
      : null;
    const checkinEvents = Array.isArray(row.checkinEvents) ? row.checkinEvents : [];
    const activeCredentials = (Array.isArray(row.people) ? row.people : [])
      .flatMap((link) => Array.isArray(link?.personel?.credentials) ? link.personel.credentials : [])
      .map((credential) => String(credential?.type || "").trim().toUpperCase())
      .filter(Boolean);
    const accessCredentialTypes = [...new Set(activeCredentials)];
    return {
      ...(() => {
      return {
        boardingCount: checkinEvents.filter((event) => String(event?.eventType || "").toUpperCase() === "BOARD").length,
        alightingCount: checkinEvents.filter((event) => String(event?.eventType || "").toUpperCase() === "ALIGHT").length,
      };
    })(),
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
    agreementId: row.agreementId || null,
    operationStatus: Number(row.agreementId || 0) <= 0
      ? "Bekliyor"
      : Number(row.vehicleId || 0) > 0 && Number(row.driverId || 0) > 0
        ? "Hazır"
        : "Eksik",
    reason: [
      row.vehicle?.plate ? `Araç ${row.vehicle.plate}` : "Araç ataması eksik",
      row.driver?.fullName ? `Sürücü ${role === "SUPER_ADMIN" ? `#${row.driverId}` : row.driver.fullName}` : "Sürücü ataması eksik",
    ].join("; "),
    vehicleId: row.vehicleId,
    driverId: row.driverId,
    roomId: row.room?.id || null,
    roomName: row.room?.name || null,
    stopCount: Number(row._count?.stops || 0),
    routeText,
    plannedRouteText: routeText,
    plannedRouteDistanceM: Number.isFinite(routeDistanceM) && routeDistanceM > 0 ? routeDistanceM : null,
    plannedRouteDurationSec: Number(row.routeSnapshotDurationSec) > 0 ? Number(row.routeSnapshotDurationSec) : null,
    plannedRouteValidatedAt: row.routeSnapshotValidatedAt || null,
    passengerCount: Number(row._count?.people || 0),
    personnelCount: Number(row._count?.people || 0),
    personelCount: Number(row._count?.people || 0),
    accessCredentialActiveCount: activeCredentials.length,
    accessCredentialTypes,
    accessCredentialPersonelCount: (Array.isArray(row.people) ? row.people : [])
      .filter((link) => Array.isArray(link?.personel?.credentials) && link.personel.credentials.length > 0)
      .length,
    text: `Vardiya #${row.id} • ${temporalLabel(temporalState(row.startAt, row.endAt, row.status))} • ${statusText(row.status)} • ${row.vehicle?.plate ? `Araç ${row.vehicle.plate}` : "Araç eksik"} • ${row.driver?.fullName ? `Sürücü ${role === "SUPER_ADMIN" ? `#${row.driverId}` : row.driver.fullName}` : "Sürücü eksik"} • ${dateText(row.startAt)}`,
    evidence: [`shift.id=${row.id}`, `shift.vehicleId=${row.vehicleId || "none"}`, `shift.driverId=${row.driverId || "none"}`],
    };
  });
  return {
    domain: "SHIFTS",
    count: rows.length,
    records: facts.slice(0, 5).map(factText),
    facts,
    nextAction: rows.length ? "Önce vardiya, araç ve sürücü bağını birlikte kontrol et." : "Bugün için yetkili vardiya kaydı görünmüyor.",
  };
}

/**
 * A ROOM may ask Sefer Abi about a market shift that is not assigned yet,
 * but only when the same ROOM has an active offer on that shift. This mirrors
 * the canonical shift read boundary and must never become a global shift read.
 */
export function buildRoomSelectedShiftScope(roomId) {
  const scopedRoomId = integer(roomId) || -1;
  return {
    OR: [
      { roomId: scopedRoomId },
      { offers: { some: { roomId: scopedRoomId, status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] } } } },
    ],
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
    const plateFilter = vehiclePlateCandidates(vehicleEntities);
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
  const facts = rows.map((row) => {
    const statusBand = canonicalGpsStatus(row);
    const statusText = statusBand === "OFFLINE"
      ? "Konum bilgisi çevrim dışı veya sinyal yok"
      : statusBand === "STALE"
        ? "Konum bilgisi güncel değil"
        : "Konum bağlantısı güncel";
    return {
      id: row.id,
      vehicleId: row.id,
      plate: row.plate,
      vehiclePlate: row.plate,
      gpsStatus: statusBand,
      gpsAt: row.gpsLast?.at || null,
      freshness: gpsFreshness(row),
      statusBand,
      freshnessAt: row.gpsLast?.at || null,
      text: `Araç ${row.plate} • ${statusText}`,
      evidence: [`vehicle.id=${row.id}`, `vehicle.plate=${row.plate}`],
    };
  });
  return {
    domain: "VEHICLES",
    count: explicitVehicle ? rows.length : issues.length,
    totalCount: rows.length,
    records: visibleRows.slice(0, 5).map((row) => {
      const statusBand = canonicalGpsStatus(row);
      const statusText = statusBand === "OFFLINE"
        ? "Konum bilgisi çevrim dışı veya sinyal yok"
        : statusBand === "STALE"
          ? "Konum bilgisi güncel değil"
          : "Konum bağlantısı güncel";
      return `Araç ${row.plate} • ${statusText}`;
    }),
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
  const exposeSelectedShiftPeople = ["SCHOOL", "COMPANY", "ROOM"].includes(role);
  const shiftSelect = {
    id: true,
    vehicleId: true,
    driverId: true,
    startAt: true,
    endAt: true,
    status: true,
    vehicle: { select: { id: true, plate: true, gpsLast: { select: { at: true, status: true, lat: true, lng: true, speed: true } }, gpsState: { select: { lastUiStatus: true } } } },
    driver: { select: { fullName: true } },
    stops: { orderBy: { order: "asc" }, take: 10, select: { id: true, name: true, order: true, state: true } },
    _count: { select: { stops: true, people: true } },
    ...(exposeSelectedShiftPeople ? {
      people: {
        orderBy: { personelId: "asc" },
        take: 50,
        select: { personelId: true, personel: { select: { id: true, fullName: true, kind: true } } },
      },
    } : {}),
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
  const vehicleToShiftRelation = plan?.relationshipIntent?.kind === "VEHICLE_TO_SHIFT";
  // A selected vehicle relation is an authorized relationship lookup, not a
  // current-day collection query. Keep the ROOM tenant boundary and active
  // shift statuses, but include the next valid operation so a future
  // agreement-backed shift is not incorrectly reported as missing.
  const temporal = shiftEntities.length
    ? {}
    : vehicleToShiftRelation
      ? { endAt: { gte: new Date() }, status: { in: ACTIVE_SHIFT_STATUSES } }
      : temporalWhere(plan?.temporalMode);
  const entityWhere = shiftEntities.length
    ? { id: { in: shiftEntities.map((entity) => entity.id) } }
    : vehicleEntities.length
      ? { vehicle: { is: vehicleEntities.some((entity) => entity.id)
        ? { id: { in: vehicleEntities.map((entity) => entity.id).filter(Boolean) } }
        : { plate: { in: vehiclePlateCandidates(vehicleEntities) } } } }
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
    const stopCount = Number(row._count?.stops || 0);
    const nextStop = row.stops?.find((stop) => !["DONE", "REACHED", "SKIPPED"].includes(String(stop.state || "").toUpperCase()))?.name || row.stops?.[0]?.name || "Sıradaki durak yok";
    const state = temporalState(row.startAt, row.endAt, row.status);
    const eta = etaSummary(row, role, personelTargets);
    return {
      id: row.id,
      shiftId: row.id,
      vehicleId: row.vehicleId || row.vehicle?.id || null,
      personelId: requestedPersonelIds.length === 1 ? requestedPersonelIds[0] : null,
      status: row.status,
      statusText: statusText(row.status),
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
      passengerCount: Number(row._count?.people || 0),
      personnelCount: Number(row._count?.people || 0),
      personelCount: Number(row._count?.people || 0),
      passengers: exposeSelectedShiftPeople
        ? (Array.isArray(row.people) ? row.people.map((person) => ({
          personelId: person.personelId,
          fullName: person.personel?.fullName || null,
          kind: person.personel?.kind || null,
        })) : [])
        : [],
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

// A parent asking for the selected child's current status needs the
// authorized person record and the authorized live-operation read model in
// the same result. Previously PERSONNEL returned only the identity row; the
// executor then correctly found the child but had no STATUS field and
// incorrectly answered "yetkili kayıtta yok". Keep this merge scoped to an
// already-authorized selected child and never synthesize an operation fact for
// a child that was not found in the parent relationship.
export function mergeParentSelectedPersonnelFacts(personnelResult, operationsResult) {
  const personnelFacts = Array.isArray(personnelResult?.facts) ? personnelResult.facts : [];
  if (!personnelFacts.length) return personnelResult;
  const operationFacts = Array.isArray(operationsResult?.facts) ? operationsResult.facts : [];
  const facts = personnelFacts.map((personFact) => {
    const personelId = Number((personFact?.personelId ?? personFact?.id) || 0);
    const operationFact = operationFacts.find((fact) => Number(fact?.personelId || 0) === personelId);
    if (!operationFact) return personFact;
    return {
      ...personFact,
      status: operationFact.status ?? personFact.status ?? null,
      statusText: operationFact.statusText || personFact.statusText || null,
      vehicle: operationFact.vehicle ?? personFact.vehicle ?? null,
      vehiclePlate: operationFact.vehiclePlate ?? personFact.vehiclePlate ?? null,
      vehicleState: operationFact.vehicleState ?? personFact.vehicleState ?? null,
      noActiveVehicleText: operationFact.noActiveVehicleText ?? personFact.noActiveVehicleText ?? null,
      noLiveVehicle: operationFact.noLiveVehicle ?? personFact.noLiveVehicle ?? false,
      shiftId: operationFact.shiftId ?? personFact.shiftId ?? null,
      text: [personFact.text, operationFact.statusText || operationFact.text].filter(Boolean).join(" • "),
      evidence: [...new Set([
        ...(Array.isArray(personFact.evidence) ? personFact.evidence : []),
        ...(Array.isArray(operationFact.evidence) ? operationFact.evidence : []),
      ])],
    };
  });
  return {
    ...personnelResult,
    facts,
    records: facts.slice(0, 5).map(factText),
    nextAction: operationsResult?.nextAction || personnelResult?.nextAction,
  };
}

export function buildPersonnelKindScope(role, semanticEntityType) {
  // ParentChild is the authority boundary for PARENT. A linked child may be
  // stored as STUDENT or PERSONEL; the parent relation must not be narrowed by
  // the copilot's generic PERSONNEL semantic label.
  if (role === "PARENT") return {};
  if (semanticEntityType === "STUDENT") return { kind: "STUDENT" };
  if (semanticEntityType === "PERSONNEL") return { kind: "PERSONEL" };
  return {};
}

async function readDrivers(user, role, plan = null) {
  const base = role === "ROOM"
    ? { roomId: integer(user?.roomId) || -1 }
    : role === "SUPER_ADMIN"
      ? {}
    : role === "COMPANY" || role === "SCHOOL" || role === "ORGANIZATION"
      ? { shifts: { some: { companyId: integer(user?.companyId) || -1 } } }
      : { userId: integer(user?.id) || -1 };
  const activeShiftWhere = { status: { in: ACTIVE_SHIFT_STATUSES } };
  if (role === "ROOM") activeShiftWhere.roomId = integer(user?.roomId) || -1;
  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role)) activeShiftWhere.companyId = integer(user?.companyId) || -1;
  const driverEntities = planEntities(plan, "driver");
  const shiftEntities = planEntities(plan, "shift");
  const where = driverEntities.length
    ? { ...base, id: { in: driverEntities.map((entity) => entity.id) } }
    : shiftEntities.length
      ? { ...base, shifts: { some: { id: { in: shiftEntities.map((entity) => entity.id) } } } }
      : base;
  const rows = await prisma.driver.findMany({
    where,
    take: 100,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      userId: true,
      vehicles: { select: { id: true, plate: true, status: true } },
      shifts: {
        where: activeShiftWhere,
        orderBy: [{ startAt: "desc" }],
        take: 5,
        select: { id: true, status: true, vehicle: { select: { id: true, plate: true } } },
      },
    },
  });
  const facts = rows.map((row) => ({
    id: row.id,
    driverId: row.id,
    driver: role === "SUPER_ADMIN" ? `Sürücü #${row.id}` : row.fullName,
    driverName: role === "SUPER_ADMIN" ? `Sürücü #${row.id}` : row.fullName,
    userId: row.userId,
    vehicleId: row.vehicles?.[0]?.id || null,
    vehiclePlate: row.vehicles?.[0]?.plate || null,
    shiftIds: (row.shifts || []).map((shift) => shift.id),
    activeShiftIds: (row.shifts || []).filter((shift) => ["APPROVED", "ACTIVE"].includes(String(shift.status || ""))).map((shift) => shift.id),
    statusText: row.shifts?.length ? "Aktif veya yakın tarihli vardiya bağı görünüyor" : "Aktif vardiya bağı görünmüyor",
    text: `Sürücü ${role === "SUPER_ADMIN" ? `#${row.id}` : row.fullName}${row.userId ? " • giriş bağlı" : " • giriş bağlı değil"}${row.vehicles?.[0]?.plate ? ` • Araç ${row.vehicles[0].plate}` : " • Araç bağı görünmüyor"}`,
    evidence: [
      `driver.id=${row.id}`,
      role === "SUPER_ADMIN" ? "driver.fullName=protected" : `driver.fullName=${row.fullName}`,
      row.vehicles?.[0]?.plate ? `vehicle.plate=${row.vehicles[0].plate}` : "vehicle.binding=missing",
      row.shifts?.length ? `shift.ids=${row.shifts.map((shift) => shift.id).join(",")}` : "shift.binding=missing",
    ],
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
  where = { ...where, ...buildPersonnelKindScope(role, plan?.semanticEntityType) };
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

async function readServiceRequests(user, role, plan = null) {
  const requestEntities = planEntities(plan, "serviceRequest");
  const requestIds = requestEntities.map((entity) => Number(entity.id)).filter((id) => Number.isInteger(id) && id > 0);
  let personelIds = [];
  if (role === "PERSONEL") {
    const personel = await prisma.personel.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true } });
    if (personel?.id) personelIds = [personel.id];
  } else if (role === "PARENT") {
    const links = await prisma.parentChild.findMany({ where: { parentUserId: integer(user?.id) || -1 }, select: { personelId: true } });
    personelIds = links.map((row) => Number(row.personelId)).filter((id) => Number.isInteger(id) && id > 0);
  }
  const roomId = integer(user?.roomId);
  const companyId = integer(user?.companyId);
  const driverUserId = integer(user?.id);
  const temporalMode = String(plan?.temporalMode || "UNKNOWN").toUpperCase();
  const roomWhere = role === "ROOM" && roomId
    ? {
      shift: { is: { roomId } },
      ...(temporalMode === "ACTIVE_TODAY" ? { createdAt: { gte: istanbulDayWindow().start, lt: istanbulDayWindow().end } } : {}),
    }
    : null;
  const companyWhere = ["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role) && companyId
    ? {
      shift: { is: { companyId } },
      ...(temporalMode === "ACTIVE_TODAY" ? { createdAt: { gte: istanbulDayWindow().start, lt: istanbulDayWindow().end } } : {}),
    }
    : null;
  const driverWhere = role === "DRIVER" && driverUserId
    ? { shift: { is: { driver: { is: { userId: driverUserId } } } } }
    : null;
  const entityWhere = requestIds.length ? { id: { in: requestIds } } : {};
  const scopedWhere = roomWhere ? { ...roomWhere, ...entityWhere } : companyWhere ? { ...companyWhere, ...entityWhere } : driverWhere ? { ...driverWhere, ...entityWhere } : personelIds.length
    ? { personelId: { in: personelIds }, ...entityWhere }
    : role === "SUPER_ADMIN" ? entityWhere : { id: { in: [] } };
  const rows = roomWhere
    ? await prisma.pickupRequest.findMany({
      where: scopedWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, shiftId: true, personelId: true, createdAt: true, personel: { select: { fullName: true } } },
    })
    : companyWhere || driverWhere || personelIds.length || role === "SUPER_ADMIN"
      ? await prisma.pickupRequest.findMany({
        where: scopedWhere,
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, shiftId: true, personelId: true, createdAt: true, personel: { select: { fullName: true } } },
      })
      : [];
  const auditMap = await loadBoardingChangeRequestAuditMap(prisma, rows.map((row) => row.id));
  const facts = rows.map((row) => {
    const view = buildBoardingChangeRequestView(
      { ...row, personel: row.personel || null },
      auditMap.get(row.id) || {},
    );
    const applicationStatus = view.boardingChangeApplicationStatus === "APPLIED"
      ? "Uygulandı"
      : view.boardingChangeApplicationStatus === "READY"
        ? "Uygulamaya hazır"
        : view.boardingChangeApplicationStatus === "BLOCKED"
          ? "Uygulanamaz"
          : "Karar bekliyor";
    const changeTypeLabel = view.routeImpactPreview?.changeTypeLabel
      || view.routeImpactPreview?.summaryLine
      || (String(view.requestKind || "").toUpperCase() === "NO_SHOW" ? "Bugün binmeyecek" : null);
    return {
      id: row.id,
      requestId: row.id,
      shiftId: row.shiftId,
      personelId: row.personelId,
      personLabel: row.personel?.fullName || `Personel #${row.personelId}`,
      requestKind: view.requestKind,
      requestDate: view.requestDate || null,
      requestStatus: statusText(row.status),
      applicationStatus,
      changeTypeLabel,
      effectLabel: changeTypeLabel,
      routeRefreshNote: view.boardingChangeRouteRefreshNote || null,
      routeRefreshLabel: view.boardingChangeRouteRefreshLabel || null,
      permanentRouteNote: "Kalıcı rota ve durak ataması değişmez.",
      decisionAuditAction: auditMap.get(row.id)?.decisionAudit?.action || null,
      applyAuditAction: auditMap.get(row.id)?.applyAudit?.action || null,
      text: `Servis talebi #${row.id} • Vardiya #${row.shiftId} • ${statusText(row.status)} • ${changeTypeLabel || "Biniş değişikliği"} • ${applicationStatus} • ${dateText(row.createdAt)}`,
      evidence: [
        `pickupRequest.id=${row.id}`,
        `pickupRequest.shiftId=${row.shiftId}`,
        `pickupRequest.requestKind=${view.requestKind}`,
        `pickupRequest.applicationStatus=${applicationStatus}`,
        `pickupRequest.routeRefresh=${view.boardingChangeRouteRefreshState || "NONE"}`,
      ],
    };
  });
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

async function readRoomReconciliationSummary(user) {
  const roomId = integer(user?.roomId) || -1;
  const agreements = await prisma.agreement.findMany({
    where: { roomId, status: "ACTIVE" },
    orderBy: { id: "asc" },
    take: 50,
    select: { id: true },
  });
  const previews = await Promise.all(agreements.map(async (agreement) => {
    const preview = await buildAgreementReconciliationPreview({ agreementId: agreement.id });
    const data = preview?.data || {};
    const status = String(data.status || "REVIEW_REQUIRED").toUpperCase();
    const reasonText = Array.isArray(data.reasons)
      ? data.reasons.map((item) => String(item?.label || "").trim()).filter(Boolean).join(" ")
      : "";
    const detail = status === "MATCHED"
      ? "Sorun görünmüyor."
      : reasonText || String(data.statusLabel || "İncelenmeli");
    return {
      agreementId: agreement.id,
      status,
      statusLabel: String(data.statusLabel || status),
      detail,
      text: `Sözleşme #${agreement.id} • ${String(data.statusLabel || status)} • ${detail}`,
    };
  }));
  const records = previews.map((item) => item.text);
  return {
    domain: "FINANCE",
    count: records.length,
    records,
    facts: records,
    nextAction: records.length
      ? "Sözleşme bazındaki mutabakat satırını açıp kanıtları yalnızca önizleme olarak incele; ödeme veya muhasebe işlemi başlatılmaz."
      : "Yetkili aktif sözleşmeler için güncel mutabakat kaydı görünmüyor.",
  };
}

async function readFinance(user, role, budgetOnly = false, semanticPlan = null) {
  if (role === "ROOM"
    && !budgetOnly
    && semanticPlan?.canonicalRequest?.operation === "ASSESS_CURRENT_RISK"
    && String(semanticPlan?.canonicalRequest?.domain || "").toUpperCase() === "FINANCE"
    && Array.isArray(semanticPlan?.canonicalRequest?.candidateEntityRefs)
    && semanticPlan.canonicalRequest.candidateEntityRefs.length === 0) {
    return readRoomReconciliationSummary(user);
  }
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

function notificationScopeWhere(user, role) {
  const ids = { companyId: integer(user?.companyId), roomId: integer(user?.roomId), userId: integer(user?.id) };
  if (role === "SUPER_ADMIN") return {};
  if (role === "ROOM") return { scope: "ROOM", roomId: ids.roomId || -1 };
  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role)) return { companyId: ids.companyId || -1 };
  if (role === "PERSONEL") return { OR: [{ userId: ids.userId || -1 }, ...(ids.companyId ? [{ companyId: ids.companyId }] : [])] };
  if (role === "PARENT") return { userId: ids.userId || -1 };
  return { id: -1 };
}

function notificationTypeLabel(type) {
  return {
    STOP_REACHED: "Durak tamamlandı",
    MAINT_7D: "Bakım tarihi yaklaşıyor",
    GPS_OFFLINE: "Konum sinyali çevrim dışı",
    GPS_STALE: "Konum bilgisi güncel değil",
    OFFER_RECEIVED: "Yeni teklif geldi",
    AGREEMENT_REVIEW: "Sözleşme inceleme bekliyor",
    AGREEMENT_CANCELLED: "Sözleşme iptal edildi",
  }[String(type || "").toUpperCase()] || "Yeni bildirim";
}

function safeNotificationFact(row) {
  const payload = row?.payloadJson && typeof row.payloadJson === "object" && !Array.isArray(row.payloadJson)
    ? row.payloadJson
    : {};
  const title = String(payload.title || "").trim();
  const message = String(payload.message || payload.summary || "").trim();
  const kind = String(payload.kind || row?.type || "").trim();
  return {
    notificationId: Number(row.id),
    type: kind,
    label: title || notificationTypeLabel(row.type),
    summary: message,
    createdAt: row.createdAt,
  };
}

export function buildSelectedNotificationContextReply({ selectedId, notificationRead } = {}) {
  const id = integer(selectedId);
  const facts = Array.isArray(notificationRead?.facts) ? notificationRead.facts : [];
  const fact = facts[0] || null;
  const selectedLabel = fact?.notificationId
    ? `Bildirim #${fact.notificationId}${fact.label ? ` • ${fact.label}` : ""}`
    : `Bildirim #${id || ""}`;
  const reply = fact?.summary
    ? `Seçili ${selectedLabel} bildirimi şu olayla ilgili: ${fact.summary}`
    : fact
      ? `Seçili ${selectedLabel} bildiriminin yetkili başlık ve tür bilgisi okundu; mesaj özeti bulunmuyor.`
      : `Seçili Bildirim #${id || ""} bu oturumun yetkili kayıtlarında görünmüyor; başka tenant veya rol verisini açmıyorum.`;
  return {
    reply,
    nextAction: fact ? notificationRead.nextAction : "Yetkili bildirim listesinden başka bir kayıt seç.",
    records: fact ? notificationRead.records : [],
    retrievedFacts: [
      "selected.entityType=notification",
      `selected.entityId=${id || ""}`,
      ...(fact ? [`notification.type=${fact.type}`, `notification.summary=${fact.summary || ""}`] : ["selected notification unavailable in current authorization scope"]),
    ],
    hasAuthorizedRecord: Boolean(fact),
  };
}

async function readNotifications(user, role, plan = null) {
  const entity = plan?.entity || (Array.isArray(plan?.entities) ? plan.entities.find((item) => item?.type === "notification") : null);
  const selectedId = entity?.type === "notification" ? integer(entity.id) : null;
  const scope = notificationScopeWhere(user, role);
  const rows = await prisma.notification.findMany({
    where: { ...scope, ...(selectedId ? { id: selectedId } : {}) },
    orderBy: { createdAt: "desc" },
    take: selectedId ? 1 : 10,
    select: { id: true, type: true, payloadJson: true, createdAt: true },
  });
  const notificationTypeText = {
    STOP_REACHED: "Durak tamamlandı",
    MAINT_7D: "Bakım tarihi yaklaşıyor",
    GPS_OFFLINE: "Konum sinyali çevrim dışı",
    GPS_STALE: "Konum bilgisi güncel değil",
    OFFER_RECEIVED: "Yeni teklif geldi",
    AGREEMENT_REVIEW: "Sözleşme inceleme bekliyor",
  };
  const facts = rows.map(safeNotificationFact);
  const records = facts.map((fact) => [
    `Bildirim #${fact.notificationId}`,
    fact.label,
    fact.summary,
    fact.createdAt ? dateText(fact.createdAt) : "",
  ].filter(Boolean).join(" • "));
  return {
    domain: "NOTIFICATIONS",
    count: rows.length,
    records: (records.length ? records : rows.slice(0, 6).map((row) => `Bildirim #${row.id} • ${notificationTypeText[String(row.type || "").toUpperCase()] || "Yeni bildirim"} • ${dateText(row.createdAt)}`)),
    facts,
    nextAction: selectedId
      ? (facts[0]?.summary
        ? `Seçili bildirim #${selectedId} bu olayı anlatıyor: ${facts[0].summary}`
        : `Seçili bildirim #${selectedId} için güvenli başlık ve tür bilgisi okundu.`)
      : rows.length ? "Önce en yeni bildirimi açıp bağlı kayıt ve gereken kullanıcı kararını kontrol et." : "Yetkili güncel bildirim görünmüyor.",
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
  const requestedFields = Array.isArray(plan?.requestedFields) ? plan.requestedFields : [];
  const asksSeferScore = plan?.entity?.type === "agreement"
    && requestedFields.some((field) => ["SEFER_SCORE", "SEFER_SCORE_MISSING"].includes(String(field?.key || field || "").toUpperCase()));
  if (asksSeferScore) {
    const scoreStatus = fact?.seferScoreStatusText || fact?.seferScoreLevel || "durum doğrulanamadı";
    const risks = Array.isArray(fact?.seferScoreRiskReasons) ? fact.seferScoreRiskReasons.filter(Boolean) : [];
    const missing = Array.isArray(fact?.seferScoreMissingSignals) ? fact.seferScoreMissingSignals.filter(Boolean) : [];
    const details = [
      risks.length ? `risk nedenleri: ${risks.join("; ")}` : "",
      missing.length ? `eksik sinyaller: ${missing.join(", ")}` : "",
    ].filter(Boolean);
    return `SeferPuanı durumu: ${scoreStatus}${details.length ? ` • ${details.join(" • ")}` : " • risk ve eksik sinyal ayrıntısı için doğrulanmış kanıt yok; kesin neden söylemiyorum"}.`;
  }
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

export function composeMultiPartExecutionReply({ plan, execution, baseReply, role = null }) {
  const slots = Array.isArray(plan?.requestedTaskSlots) ? plan.requestedTaskSlots : [];
  const requestedDomains = Array.isArray(plan?.requestedDomains) ? plan.requestedDomains : [];
  const serviceRequestEntity = plan?.entity?.type === "serviceRequest"
    ? plan.entity
    : plan?.entities?.find((entity) => entity?.type === "serviceRequest") || null;
  const serviceRequestFields = Array.isArray(plan?.requestedFields)
    ? plan.requestedFields.map((field) => String(field?.key || field || "").toUpperCase())
    : [];
  const serviceRequestItem = serviceRequestEntity
    && requestedDomains.includes("SERVICE_REQUESTS")
    ? execution?.items?.find((item) => item?.domain === "SERVICE_REQUESTS"
      && item?.status === "RESOLVED"
      && Number(item?.entity?.id || 0) === Number(serviceRequestEntity.id || 0))
    : null;
  const serviceRequestFact = serviceRequestItem?.facts?.find((fact) => Number(fact?.requestId ?? fact?.id ?? 0) === Number(serviceRequestEntity?.id || 0))
    || serviceRequestItem?.facts?.[0]
    || null;
  const serviceRequestStatusFields = serviceRequestFields.some((field) => ["REQUEST_STATUS", "APPLICATION_STATUS"].includes(field));
  const serviceRequestRouteFields = serviceRequestFields.some((field) => ["ROUTE", "STOP", "STOPS", "PERMANENT_ROUTE"].includes(field));
  const serviceRequestDateFields = serviceRequestFields.some((field) => ["DATE_RANGE", "REQUEST_DATE", "EFFECTIVE_DATE"].includes(field));
  if (serviceRequestEntity
    && serviceRequestItem
    && serviceRequestFact
    && (serviceRequestStatusFields || serviceRequestRouteFields || serviceRequestDateFields)) {
    const requestStatus = serviceRequestFact.requestStatus
      ? statusText(serviceRequestFact.requestStatus)
      : "yetkili kayıtta yok";
    const applicationStatus = String(serviceRequestFact.applicationStatus || "yetkili kayıtta yok");
    const shiftId = Number(serviceRequestFact.shiftId || 0);
    const applied = String(serviceRequestFact.applicationStatus || "").toLocaleLowerCase("tr-TR") === "uygulandı";
    const decision = String(serviceRequestFact.requestStatus || "").toLocaleLowerCase("tr-TR");
    const accepted = decision.includes("accepted") || decision.includes("kabul");
    const boundary = applied
      ? "Kabul edilen değişiklik günlük atamaya uygulanmış."
      : accepted
        ? "Kabul edilen değişiklik henüz günlük atamaya uygulanmadı; bu adım ayrı yetkili uygulama işlemi gerektiriyor. Sürücü rotası henüz yenilenmedi."
        : "Bu sonuç yalnızca talep kararını gösterir; günlük atama uygulaması ayrıca doğrulanmalıdır.";
    const dailyEffect = serviceRequestFact.changeTypeLabel || serviceRequestFact.effectLabel || "günlük biniş etkisi doğrulanamadı";
    const permanentRouteNote = serviceRequestFact.permanentRouteNote || serviceRequestFact.routeRefreshNote || "Kalıcı rota/durak değişikliği doğrulanmadı.";
    return {
      reply: `Servis talebi #${serviceRequestEntity.id} için istek durumu: ${requestStatus} • uygulama durumu: ${applicationStatus}${shiftId > 0 ? ` • bağlı vardiya #${shiftId}` : ""} • günlük etki: ${dailyEffect}. ${boundary} ${permanentRouteNote}`,
      nextAction: applied
        ? "Bağlı vardiya ve sürücü rotasında uygulama sonucunu kontrol et."
        : accepted
          ? "Ayrı yetkili uygulama adımını başlatmadan önce bağlı vardiya ve değişiklik önizlemesini doğrula."
          : "Talep kararını ve bağlı vardiyayı yetkili ekrandan kontrol et.",
    };
  }
  const selectedShiftPassengerListLookup = ["SCHOOL", "COMPANY", "ROOM"].includes(String(role || "").toUpperCase())
    && String(plan?.entity?.type || "").toLowerCase() === "shift"
    && Number(plan?.entity?.id || 0) > 0
    && Array.isArray(plan?.requestedFields)
    && plan.requestedFields.some((field) => String(field?.key || field || "").toUpperCase() === "PASSENGER_LIST");
  if (selectedShiftPassengerListLookup) {
    const shiftId = Number(plan.entity.id);
    const operationItem = execution?.items?.find((item) => item?.domain === "OPERATIONS" && item?.status === "RESOLVED");
    const fact = operationItem?.facts?.find((item) => Number(item?.shiftId || item?.id || 0) === shiftId) || operationItem?.facts?.[0] || null;
    const passengers = Array.isArray(fact?.passengers) ? fact.passengers.filter((person) => person?.fullName) : [];
    const passengerCount = Number(fact?.passengerCount ?? fact?.personnelCount ?? passengers.length) || 0;
    const listText = passengers.length
      ? passengers.map((person) => person.fullName).join(", ")
      : passengerCount > 0
        ? `${passengerCount} yetkili öğrenci/personel bağı var; isim listesi bu okumada gelmedi.`
        : "yetkili öğrenci/personel bağı görünmüyor";
    return {
      reply: `Vardiya #${shiftId} için yetkili öğrenci/personel listesi: ${listText}. Bu bilgi seçili vardiyanın kendi tenant kaydından okundu.`,
      nextAction: passengers.length || passengerCount > 0
        ? "İstersen aynı vardiyanın araç, sürücü ve durak bilgisini de kontrol edebilirsin."
        : "Vardiyanın kişi bağlantısını ve rota ayrıntısını yetkili ekrandan kontrol et.",
    };
  }
  const selectedShiftPersonnelLookup = String(plan?.entity?.type || '').toLowerCase() === 'shift'
    && Number(plan?.entity?.id || 0) > 0
    && String(plan?.typedRequest?.targetEntityType || '').toUpperCase() === 'PERSONNEL'
    && Array.isArray(plan?.requestedFields)
    && plan.requestedFields.some((field) => String(field?.key || field || '').toUpperCase() === 'STATUS');
  if (selectedShiftPersonnelLookup) {
    const shiftId = Number(plan.entity.id);
    return {
      reply: `Vardiya #${shiftId} kartında personel listesi doğrudan görünmüyor; bu nedenle personel sayısı veya atama durumu hakkında kanıtsız bir sonuç vermiyorum. Kişi/personel bağlantısını aynı Vardiyalar ekranındaki “Eksik rota ve yolcu bilgisi” bölümünden açıp doğrulayabilirsin.`,
      nextAction: 'Personel ve rota ayrıntısını aç; bu vardiyanın kullanım bölümünde kişi bağlantısını ve koordinat doğrulamasını kontrol et.',
    };
  }
  // GPS freshness is a typed freshness/field read.  An explicit vehicle
  // relationship lookup must remain owned by its relation result, even when
  // the source vehicle also has an offline/stale telemetry fact.
  const requestedFieldKeys = Array.isArray(plan?.requestedFields)
    ? plan.requestedFields.map((field) => String(field?.key || field || "").toUpperCase())
    : [];
  const isVehicleFreshnessLookup = ["FRESHNESS_CHECK", "FIELD_LOOKUP"].includes(
    String(plan?.typedRequest?.taskType || plan?.taskType || "").toUpperCase(),
  )
    && requestedDomains.includes("VEHICLES")
    && !plan?.relationshipIntent;
  const vehicleItem = Array.isArray(execution?.items)
    ? execution.items.find((item) => item?.domain === "VEHICLES" && item?.status === "RESOLVED")
    : null;
  if (isVehicleFreshnessLookup && Array.isArray(vehicleItem?.facts) && vehicleItem.facts.length) {
    const etaRequested = requestedFieldKeys.includes("ETA");
    if (etaRequested) {
      const etaLines = vehicleItem.facts.map((vehicle) => {
        const label = vehicle.text || `Araç ${vehicle.plate || vehicle.vehiclePlate || vehicle.id}`;
        const etaValue = safeVisibleValue(vehicle.eta ?? vehicle.etaText ?? vehicle.estimatedArrival);
        const statusBand = String(vehicle.statusBand || vehicle.freshness || "UNKNOWN").toUpperCase();
        if (etaValue) return `${label} • ETA: ${etaValue}`;
        const freshnessText = statusBand === "OFFLINE"
          ? "konum sinyali çevrim dışı"
          : statusBand === "STALE"
            ? "konum sinyali güncel değil"
            : "güncel konum verisi yok";
        return `${label} • ETA: tahmini süre hesaplanamıyor; ${freshnessText}`;
      });
      return {
        reply: `${vehicleItem.count || etaLines.length} yetkili araç için ETA sonucu: ${etaLines.join(" ")} Güncel GPS/konum verisi olmadan tahmini süre üretmiyorum.`.trim(),
        nextAction: "Araç cihazı ve konum bağlantısını kontrol et; güncel konum geldikten sonra tahmini süreyi yeniden doğrula.",
      };
    }
    const vehicleLines = vehicleItem.facts.map((vehicle) => {
      const statusBand = String(vehicle.statusBand || (vehicle.freshness === "LIVE" ? "LIVE" : "STALE")).toUpperCase();
      const freshnessLabel = statusBand === "LIVE"
        ? "güncel"
        : statusBand === "STALE"
          ? "güncel değil"
          : "çevrim dışı veya sinyal yok";
      return `${vehicle.text || `Araç ${vehicle.plate || vehicle.vehiclePlate || vehicle.id}`} • durum: ${statusBand} (${freshnessLabel})`;
    });
    return {
      reply: `${vehicleItem.count} yetkili araçta GPS/konum bağlantısı güncel değil: ${vehicleLines.join(" ")} ${vehicleItem.nextAction || "Önce ilgili aracın konum bağlantısını ve son sinyal zamanını kontrol et."}`.trim(),
      nextAction: vehicleItem.nextAction || "Önce ilgili aracın konum bağlantısını ve son sinyal zamanını kontrol et.",
    };
  }
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

function selectedRoomEntity(screenContext = {}, semanticPlan = {}) {
  const explicitEntity = semanticPlan?.entity?.source === "EXPLICIT_QUERY"
    ? semanticPlan.entity
    : null;
  if (explicitEntity?.type && (integer(explicitEntity.id) || String(explicitEntity.plate || "").trim())) {
    return {
      type: String(explicitEntity.type).toLowerCase(),
      ...(integer(explicitEntity.id) ? { id: integer(explicitEntity.id) } : {}),
      ...(String(explicitEntity.plate || "").trim() ? { plate: String(explicitEntity.plate).trim() } : {}),
    };
  }
  const entityType = String(
    screenContext?.selectedEntityType
      || screenContext?.selectedRecordType
      || semanticPlan?.entity?.type
      || "",
  ).toLowerCase();
  const entityId = integer(
    screenContext?.selectedEntityId
      || screenContext?.selectedRecordId
      || semanticPlan?.entity?.id,
  );
  return entityType && entityId ? { type: entityType, id: entityId } : null;
}

function explicitRoomAgreementContextNavigationTarget({ user, message, screenContext, semanticPlan } = {}) {
  if (roleKey(user) !== "ROOM") return null;
  const selected = selectedRoomEntity(screenContext, semanticPlan);
  if (!selected || selected.type !== "agreement") return null;
  const currentPath = normalizeScreenPath(screenContext?.path);
  const text = normalize(message);
  const showVerb = /(?:goster|ac|incele|goru|gör|bak)/iu.test(text);
  if (!showVerb) return null;
  if (currentPath === "/room/agreements" && /ticari\s+(?:akis|akisi|calisma|çalisma)|commercial\s+flow/iu.test(text)) {
    return {
      path: "/room/commercial-flow",
      label: "Ticari Çalışma Alanı",
      purpose: "Seçili sözleşmenin yetkili ticari akış ve mutabakat önizlemesini aç.",
      routeParams: { agreementId: selected.id, tab: "settlement" },
      recordType: "AGREEMENT",
      recordId: selected.id,
    };
  }
  if (currentPath === "/room/commercial-flow" && /(?:sozlesme|anlasma|agreement|contract)/iu.test(text)) {
    return {
      path: "/room/agreements",
      label: "Sözleşmeler",
      purpose: "Seçili sözleşme kaydını yetkili ayrıntısıyla aç.",
      routeParams: { focusAgreementId: selected.id },
      recordType: "AGREEMENT",
      recordId: selected.id,
    };
  }
  return null;
}

function roomRelationPlan(semanticPlan, relationshipIntent, sourceEntity, requestedDomains) {
  return {
    ...semanticPlan,
    family: "RELATION_LOOKUP",
    intentFamily: "RELATION_LOOKUP",
    clarificationNeed: null,
    planStatus: "READY",
    entity: sourceEntity,
    entities: [sourceEntity],
    requestedDomains,
    relationshipIntent,
  };
}

export function buildVehicleToShiftNavigationTarget(shiftId) {
  const id = integer(shiftId);
  if (!id) return null;
  return {
    path: "/room/shifts",
    label: "Vardiyalar",
    purpose: "Seçili araca bağlı yetkili operasyon kaydını aç.",
    routeParams: { focusShiftId: id },
    recordType: "SHIFT",
    recordId: id,
  };
}

async function buildRoomCrossSurfaceRelationResult({ user, role, message, screenContext, semanticPlan, domainMap } = {}) {
  if (role !== "ROOM") return null;
  const selected = selectedRoomEntity(screenContext, semanticPlan);
  if (!selected) return null;
  const currentPath = normalizeScreenPath(screenContext?.path);
  const text = normalize(message);

  if (currentPath === "/room/vehicles"
    && selected.type === "vehicle"
    && /(?:harita|konum|takip)/iu.test(text)
    && /(?:goster|ac|incele|goru|bak)/iu.test(text)) {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        roomId: integer(user?.roomId) || -1,
        ...(integer(selected.id)
          ? { id: integer(selected.id) }
          : { plate: String(selected.plate || "").trim() }),
      },
      select: { id: true, plate: true },
    });
    if (!vehicle) {
      return {
        role,
        domain: "RELATION_LOOKUP",
        authorizationBoundary: false,
        authorizedDomainMap: domainMap,
        count: 0,
        records: [],
        reply: `Araç #${selected.id} için ROOM kapsamındaki gerçek kaydı doğrulayamadım; başka bir aracı veya eski ekran bağlamını göstermiyorum.`,
        nextAction: "Yetkili araç kaydını seçip harita isteğini yeniden gönder.",
        source: "authorized-room-vehicle-map-navigation-v1",
        navigationTarget: null,
        dataSources: ["ROOM tenant araç kaydı", "yetkili canlı ekran seçimi"],
        retrievedFacts: [`vehicle.id=${selected.id}`, "vehicle.scope=unresolved"],
        reasoning: "Seçili araç ROOM tenant kaynağında doğrulanamadığı için sahte harita hedefi üretilmedi.",
        priority: "Yetkili kayıt doğrulaması gerekli",
        semanticPlan,
      };
    }
    const vehicleLabel = String(vehicle.plate || `Araç #${vehicle.id}`).trim();
    return {
      role,
      domain: "UI_GUIDANCE",
      authorizationBoundary: false,
      authorizedDomainMap: domainMap,
      count: 1,
      records: [vehicleLabel],
      reply: `Seçili araç ${vehicleLabel} için Canlı Takip haritasını açıyorum. Haritada bu aracın yetkili konum ve tazelik bilgisini kontrol edebilirsin.`,
      nextAction: "Haritadaki seçili araç kartını ve son konum zamanını kontrol et.",
      source: "authorized-room-vehicle-map-navigation-v1",
      navigationTarget: {
        path: "/room/map",
        label: "Canlı Takip",
        purpose: "Seçili yetkili aracı haritada göster.",
        routeParams: { focusVehicleId: vehicle.id },
        recordType: "VEHICLE",
        recordId: vehicle.id,
      },
      dataSources: ["ROOM tenant araç kaydı", "yetkili canlı ekran seçimi"],
      retrievedFacts: [`vehicle.id=${vehicle.id}`, `vehicle.plate=${vehicleLabel}`, "businessWrite=0"],
      reasoning: "Açık araç→harita isteği, ROOM tenant kapsamındaki gerçek seçili araç kaydı doğrulanarak haritaya yönlendirildi.",
      priority: "Yetkili araç haritası",
      semanticPlan,
    };
  }

  if (currentPath === "/room/vehicles"
    && selected.type === "vehicle"
    && /(?:vardiya|operasyon|ilgili|bagli|bağlı|kayit|kayıt)/iu.test(text)
    && /(?:goster|ac|incele|goru|gör|bak)/iu.test(text)) {
    const relationshipIntent = {
      kind: "VEHICLE_TO_SHIFT",
      fromEntity: { type: "vehicle", id: selected.id, source: "SCREEN_RECORD" },
      toEntity: { type: "shift", id: null, source: "RELATION_FIELD_TARGET" },
      requestedRelation: "shift",
      source: "SCREEN_RECORD",
    };
    const plan = roomRelationPlan(semanticPlan, relationshipIntent, {
      type: "vehicle",
      ...(integer(selected.id) ? { id: integer(selected.id) } : {}),
      ...(String(selected.plate || "").trim() ? { plate: String(selected.plate).trim() } : {}),
      source: selected.plate ? "EXPLICIT_QUERY" : "SCREEN_RECORD",
    }, ["VEHICLES"]);
    const operationResult = await readOperations(user, role, plan);
    const fact = (operationResult?.facts || []).find((item) => Number(item?.shiftId || item?.id || 0) > 0);
    if (!fact) {
      const plate = String(selected.plate || screenContext?.selectedLabel || `Araç #${selected.id || "?"}`).trim();
      return {
        role,
        domain: "RELATION_LOOKUP",
        authorizationBoundary: false,
        authorizedDomainMap: domainMap,
        count: 0,
        records: [],
        reply: `${plate} için yetkili ilişkili operasyon veya vardiya kaydı görünmüyor. Başka bir vardiyayı bu araca aitmiş gibi göstermiyorum.`,
        nextAction: "Bu araç için yetkili operasyon bağı oluştuğunda ilgili kaydı yeniden iste.",
        source: "authorized-room-relation-v1",
        navigationTarget: null,
        dataSources: ["yetkili araç ve operasyon ilişkisi", "ROOM tenant kapsamı"],
        retrievedFacts: [
          integer(selected.id) ? `vehicle.id=${integer(selected.id)}` : `vehicle.plate=${String(selected.plate || "").trim()}`,
          "operation.relation=none",
        ],
        reasoning: "Seçili araç için yetkili ilişki bulunmadı; genel Operasyon Merkezi hedefiyle ikame yapılmadı.",
        priority: "İlişki yok",
        semanticPlan: plan,
      };
    }
    const shiftId = Number(fact.shiftId || fact.id || 0);
    return {
      role,
      domain: "RELATION_LOOKUP",
      authorizationBoundary: false,
      authorizedDomainMap: domainMap,
      count: 1,
      records: [`Vardiya #${shiftId}`],
      reply: `${String(selected.plate || screenContext?.selectedLabel || `Araç #${selected.id || "?"}`).trim()} için bağlı yetkili operasyon kaydı Vardiya #${shiftId}. Bu kaydı açıyorum.`,
      nextAction: "Vardiya detayında araç, sürücü ve rota bağını kontrol et.",
      source: "authorized-room-relation-v1",
      navigationTarget: buildVehicleToShiftNavigationTarget(shiftId),
      dataSources: ["yetkili araç ve operasyon ilişkisi", "ROOM tenant kapsamı"],
      retrievedFacts: [
        integer(selected.id) ? `vehicle.id=${integer(selected.id)}` : `vehicle.plate=${String(selected.plate || "").trim()}`,
        `shift.id=${shiftId}`,
      ],
      reasoning: "Açık araç→operasyon isteği, seçili aracın yetkili operasyon ilişkisi üzerinden çözüldü; yazma yapılmadı.",
      priority: "Yetkili ilişki navigasyonu",
      semanticPlan: plan,
    };
  }

  if (currentPath === "/room/shifts"
    && selected.type === "shift"
    && /(?:arac|vehicle|plaka)/iu.test(text)
    && /(?:harita|konum|takip)/iu.test(text)) {
    const relationshipIntent = {
      kind: "SHIFT_TO_VEHICLE",
      fromEntity: { type: "shift", id: selected.id, source: "SCREEN_RECORD" },
      toEntity: { type: "vehicle", id: null, source: "RELATION_FIELD_TARGET" },
      requestedRelation: "vehicle",
      source: "SCREEN_RECORD",
    };
    const plan = roomRelationPlan(semanticPlan, relationshipIntent, { type: "shift", id: selected.id, source: "SCREEN_RECORD" }, ["SHIFTS"]);
    const operationResult = await readOperations(user, role, plan);
    const fact = (operationResult?.facts || []).find((item) => Number(item?.shiftId || item?.id || 0) === selected.id);
    if (!fact?.vehicleId) {
      return {
        role,
        domain: "RELATION_LOOKUP",
        authorizationBoundary: false,
        authorizedDomainMap: domainMap,
        count: 0,
        records: [],
        reply: `Vardiya #${selected.id} için yetkili bağlı araç kaydını doğrulayamadım; başka bir araç veya eski ekran bağlamı göstermiyorum.`,
        nextAction: "Vardiya kaydındaki yetkili araç bağı oluştuğunda harita hedefini yeniden iste.",
        source: "authorized-room-relation-v1",
        navigationTarget: null,
        dataSources: ["yetkili vardiya ve araç ilişkisi", "ROOM tenant kapsamı"],
        retrievedFacts: [`shift.id=${selected.id}`, "vehicle.relation=unresolved"],
        reasoning: "Seçili vardiyadan yetkili araç kimliği çıkmadığı için hayali harita veya araç hedefi üretilmedi.",
        priority: "İlişki doğrulaması gerekli",
        semanticPlan: plan,
      };
    }
    const vehicleLabel = String(fact.vehiclePlate || fact.vehicle || `Araç #${fact.vehicleId}`).trim();
    return {
      role,
      domain: "RELATION_LOOKUP",
      authorizationBoundary: false,
      authorizedDomainMap: domainMap,
      count: 1,
      records: [`Vardiya #${selected.id}`, vehicleLabel],
      reply: `Vardiya #${selected.id} için bağlı yetkili araç ${vehicleLabel}. Haritadaki bu aracı seçili olarak açıyorum; konum sinyali ${String(fact.gpsStatus || fact.locationStatus || "doğrulanamadı").toLocaleLowerCase("tr-TR")}.`,
      nextAction: "Haritadaki seçili araç kartında konum ve tazelik bilgisini kontrol et.",
      source: "authorized-room-relation-v1",
      navigationTarget: {
        path: "/room/map",
        label: "Canlı Takip",
        purpose: "Vardiyaya bağlı yetkili aracı haritada seçili göster.",
        routeParams: { focusVehicleId: fact.vehicleId },
        recordType: "VEHICLE",
        recordId: fact.vehicleId,
      },
      dataSources: ["yetkili vardiya ve araç ilişkisi", "ROOM tenant kapsamı"],
      retrievedFacts: [`shift.id=${selected.id}`, `vehicle.id=${fact.vehicleId}`, `vehicle.plate=${vehicleLabel}`],
      reasoning: "Yeni açık vardiya→araç→harita isteği, seçili vardiya kaydının yetkili ilişkisi üzerinden çözüldü; yazma yapılmadı.",
      priority: "Yetkili ilişki navigasyonu",
      semanticPlan: plan,
    };
  }

  if (currentPath === "/room/map"
    && selected.type === "vehicle"
    && /(?:ilgili|bagli|bağlı|operasyon|vardiya|kayit|kayıt)/iu.test(text)
    && /(?:operasyon|vardiya|kayit|kayıt)/iu.test(text)) {
    const relationshipIntent = {
      kind: "VEHICLE_TO_SHIFT",
      fromEntity: { type: "vehicle", id: selected.id, source: "SCREEN_RECORD" },
      toEntity: { type: "shift", id: null, source: "RELATION_FIELD_TARGET" },
      requestedRelation: "shift",
      source: "SCREEN_RECORD",
    };
    const plan = roomRelationPlan(semanticPlan, relationshipIntent, {
      type: "vehicle",
      ...(integer(selected.id) ? { id: integer(selected.id) } : {}),
      ...(String(selected.plate || "").trim() ? { plate: String(selected.plate).trim() } : {}),
      source: selected.plate ? "EXPLICIT_QUERY" : "SCREEN_RECORD",
    }, ["VEHICLES"]);
    const operationResult = await readOperations(user, role, plan);
    const fact = (operationResult?.facts || []).find((item) => Number(item?.shiftId || item?.id || 0) > 0);
    if (!fact) {
      const plate = String(selected.plate || screenContext?.selectedLabel || `Araç #${selected.id || "?"}`).trim();
      return {
        role,
        domain: "RELATION_LOOKUP",
        authorizationBoundary: false,
        authorizedDomainMap: domainMap,
        count: 0,
        records: [],
        reply: `${plate} için yetkili ilişkili operasyon veya vardiya kaydı görünmüyor. Başka bir vardiyayı bu araca aitmiş gibi göstermiyorum.`,
        nextAction: "Bu araç için yetkili operasyon bağı oluştuğunda ilgili kaydı yeniden iste.",
        source: "authorized-room-relation-v1",
        navigationTarget: null,
        dataSources: ["yetkili araç ve operasyon ilişkisi", "ROOM tenant kapsamı"],
        retrievedFacts: [`vehicle.id=${selected.id}`, "operation.relation=none"],
        reasoning: "Seçili araç için yetkili ilişki bulunmadı; genel Operasyon Merkezi hedefiyle ikame yapılmadı.",
        priority: "İlişki yok",
        semanticPlan: plan,
      };
    }
    const shiftId = Number(fact.shiftId || fact.id || 0);
    return {
      role,
      domain: "RELATION_LOOKUP",
      authorizationBoundary: false,
      authorizedDomainMap: domainMap,
      count: 1,
      records: [`Vardiya #${shiftId}`],
      reply: `${String(selected.plate || screenContext?.selectedLabel || `Araç #${selected.id || "?"}`).trim()} için bağlı yetkili operasyon kaydı Vardiya #${shiftId}. Bu kaydı açıyorum.`,
      nextAction: "Vardiya detayında araç, sürücü ve rota bağını kontrol et.",
      source: "authorized-room-relation-v1",
      navigationTarget: {
        ...buildVehicleToShiftNavigationTarget(shiftId),
      },
      dataSources: ["yetkili araç ve operasyon ilişkisi", "ROOM tenant kapsamı"],
      retrievedFacts: [`vehicle.id=${selected.id}`, `shift.id=${shiftId}`],
      reasoning: "Yeni açık araç→operasyon isteği, seçili aracın yetkili operasyon ilişkisi üzerinden çözüldü; yazma yapılmadı.",
      priority: "Yetkili ilişki navigasyonu",
      semanticPlan: plan,
    };
  }

  return null;
}

function isPassengerLiveLinkStatusQuestion({ message, screenContext, semanticPlan, conversationState } = {}) {
  const path = normalizeScreenPath(screenContext?.path || "");
  if (!/\/access-links(?:\/|$)/iu.test(path)) return false;
  const requestedFields = Array.isArray(semanticPlan?.requestedFields)
    ? semanticPlan.requestedFields.map((field) => String(field?.key || field || "").toUpperCase())
    : [];
  if (requestedFields.includes("PASSENGER_LIVE_LINK_STATUS")) return true;
  const text = normalize(message);
  const directStatusCue = /\b(?:canli|canlı|erisim|erişim|baglanti|bağlantı|link|token)\p{L}*\b/iu.test(text)
    && /\b(?:durum|aktif|gecerli|geçerli|iptal|suresi|süresi|sona)\p{L}*\b/iu.test(text);
  if (directStatusCue || semanticPlan?.accessLinkStatusIntent === true) return true;

  const priorPlans = [
    conversationState?.lastSettledResult?.semanticPlan,
    conversationState?.authorizedProductContext?.semanticPlan,
    conversationState?.productContext?.semanticPlan,
    conversationState?.lastSemanticPlan,
  ].filter((plan) => plan && typeof plan === "object");
  const priorLinkStatus = priorPlans.some((plan) => plan.accessLinkStatusIntent === true
    || (Array.isArray(plan.requestedFields)
      && plan.requestedFields.some((field) => String(field?.key || field || "").toUpperCase() === "PASSENGER_LIVE_LINK_STATUS")));
  if (!priorLinkStatus) return false;

  return /\b(?:bu|o|bunun|peki|halen|hala|h[aâ]l[a]|gecerli|geçerli|aktif|iptal|suresi|süresi|sona|baglanti|bağlantı|link|token)\p{L}*\b/iu.test(text)
    && /\b(?:durum|gecerli|geçerli|aktif|iptal|suresi|süresi|sona|halen|hala|h[aâ]l[a])\p{L}*\b/iu.test(text);
}

async function buildSelectedPassengerLiveLinkStatusAnswer({ user, role, message, screenContext, semanticPlan, conversationState } = {}) {
  if (!isPassengerLiveLinkStatusQuestion({ message, screenContext, semanticPlan, conversationState })) return null;
  if (!['COMPANY', 'SCHOOL'].includes(String(role || '').toUpperCase())) return null;

  const selectedShiftId = integer(
    semanticPlan?.entity?.type === 'shift' ? semanticPlan.entity.id : null,
  ) || integer(screenContext?.selectedEntityId || screenContext?.selectedRecordId);
  const domainMap = resolveAuthorizedProductDomains(user);
  if (!selectedShiftId) {
    return {
      role,
      domain: 'CLARIFICATION',
      authorizationBoundary: false,
      authorizedDomainMap: domainMap.domains,
      count: 0,
      records: [],
      reply: 'Canlı bağlantı durumunu söyleyebilmem için önce bu ekranda bir vardiya seçmelisin. Seçili vardiya veya kişi yokken ilk kaydı varsayılan almıyor ve bağlantı üretme ya da iptal etme işlemi başlatmıyorum.',
      nextAction: 'Erişim bağlantıları ekranında vardiyayı seçip tekrar sor.',
      source: 'authorized-passenger-live-link-status-v1',
      dataSources: ['mevcut seçili vardiya', 'şirket/okul tenant kapsamındaki PassengerLiveLink kaydı'],
      retrievedFacts: ['selected shift is absent', 'no link read or write was performed'],
      reasoning: 'Seçili vardiya olmadığı için eski konuşma bağlamı veya ilk satır kullanılmadı; bağlantı durumu uydurulmadı.',
      priority: 'Netleştirme gerekli',
      semanticPlan,
    };
  }

  const links = await prisma.passengerLiveLink.findMany({
    where: {
      shiftId: selectedShiftId,
      shift: { companyId: integer(user?.companyId) || -1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, expiresAt: true, revokedAt: true, createdAt: true, lastViewedAt: true },
  });
  const now = Date.now();
  const active = links.filter((link) => !link.revokedAt && new Date(link.expiresAt).getTime() > now);
  const latest = links[0] || null;
  let stateText;
  if (active.length) {
    const latestExpiry = active
      .map((link) => new Date(link.expiresAt).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0];
    stateText = `${active.length} geçerli canlı takip bağlantısı var${latestExpiry ? `; en geç ${new Date(latestExpiry).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} tarihine kadar geçerli` : ''}.`;
  } else if (!links.length) {
    stateText = 'Bu vardiya için canlı takip bağlantısı kaydı bulunmuyor.';
  } else {
    const latestState = latest?.revokedAt
      ? 'son bağlantı iptal edilmiş'
      : latest?.expiresAt && new Date(latest.expiresAt).getTime() <= now
        ? 'son bağlantının süresi dolmuş'
        : 'geçerli bağlantı bulunmuyor';
    stateText = `Şu anda geçerli canlı takip bağlantısı yok; ${latestState}. İptal edilmiş veya süresi dolmuş tokenı geçerli saymıyorum.`;
  }
  return {
    role,
    domain: 'SHIFTS',
    authorizationBoundary: false,
    authorizedDomainMap: domainMap.domains,
    count: active.length,
    records: [`Vardiya #${selectedShiftId}: ${stateText}`],
    reply: `Seçili Vardiya #${selectedShiftId} için bağlantı durumu: ${stateText} Token, gizli URL veya başka tenant kaydı paylaşmıyorum; bu soru yalnızca yetkili durum okuması yaptı ve bağlantı üretme/iptal etme işlemi başlatmadı.`,
    nextAction: active.length ? 'Bağlantının son kullanma tarihini yetkili ekrandan kontrol et.' : 'Gerekirse Erişim bağlantıları ekranında yetkili formu kullanarak yeni bağlantı oluştur; bu konuşma işlem başlatmadı.',
    source: 'authorized-passenger-live-link-status-v1',
    dataSources: ['selected shift', 'tenant-scoped PassengerLiveLink read'],
    retrievedFacts: [`shift.id=${selectedShiftId}`, `passengerLiveLink.rows=${links.length}`, `passengerLiveLink.active=${active.length}`],
    reasoning: 'Access Links ekranındaki seçili vardiya, yalnız aynı tenant kapsamındaki PassengerLiveLink kayıtlarıyla okundu; token değeri açıklanmadı ve yazma işlemi yapılmadı.',
    priority: 'Seçili bağlantı durumu',
    semanticPlan,
  };
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
  if (["UNSUPPORTED_COMPANY_ADMIN_SURFACE", "UNSPECIFIED_DISABLED_FIELD"].includes(String(semanticPlan.workflowIntent || ""))
    && String(role || "").toUpperCase() === "COMPANY") {
    const unspecifiedDisabledField = semanticPlan.workflowIntent === "UNSPECIFIED_DISABLED_FIELD";
    return {
      role,
      domain: "AUTHORIZATION",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: unspecifiedDisabledField
        ? "Hangi alanın kapalı olduğunu belirtirsen mevcut ekrandaki yetki veya eksik bilgi nedenini kontrol edebilirim. Şu an belirli bir alan seçili olmadığı için başka bir hedef açmıyor ve varsayım yapmıyorum."
        : "Bu COMPANY hesabında firma ayarları veya kullanıcı yetkileri için ayrı bir yönetim ekranı bulunmuyor. Başka bir role ait ekranı açmıyor ve ayar değişikliği yapmıyorum.",
      nextAction: unspecifiedDisabledField
        ? "Kapalı görünen alanın adını veya bulunduğu ekranı belirt; doğrulanabilir bir hedef varsa yalnız onu göstereyim."
        : "Yetkili bir ayar veya kullanıcı yetkisi yönetimi gerekiyorsa ürün yöneticisinin tanımladığı COMPANY yönetim yüzeyini bekle.",
      source: "authorized-screen-catalog-v1",
      navigationTarget: null,
      dataSources: ["authorized screen catalog", "current role scope"],
      retrievedFacts: unspecifiedDisabledField
        ? ["Belirli bir kapalı alan seçilmedi", "yetkili hedef veya yazma işlemi üretilmedi"]
        : ["COMPANY ayar/yetki yüzeyi mevcut değil", "yetkili hedef veya yazma işlemi üretilmedi"],
      reasoning: unspecifiedDisabledField
        ? "Belirli bir kapalı alan veya hedef kontrol görünmediği için güvenli açıklama istendi; başka bir ekran veya yetki varsayılmadı."
        : "COMPANY screen catalog içinde ayar veya kullanıcı yetkisi yönetim yüzeyi bulunmadı; Planlama Merkezi gibi yakın bir yüzey yanlış ikame edilmedi.",
      priority: "Ürün kapsamı sınırı",
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
  if (isSuperAdminFieldAcceptanceReadPlan({ role, message, screenContext })) {
    const session = await getCurrentFieldAcceptanceSession();
    const checklist = Array.isArray(session?.checklist) ? session.checklist : [];
    return {
      role,
      domain: "FIELD_ACCEPTANCE",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: checklist.length,
      records: checklist.map((item) => `${item?.label || "Kontrol maddesi"}: ${item?.status || "PENDING"}`),
      reply: buildFieldAcceptanceReadReply({ session }),
      nextAction: checklist.some((item) => String(item?.status || "").toUpperCase() !== "PASS")
        ? "Önce ilk açık kontrol maddesini incele; karar veya checklist değişikliği için ayrı yetkili işlem iste."
        : "Karar ve oturum özetini son kez doğrula; yeni yazma işlemi başlatma.",
      source: "authorized-field-acceptance-read-v1",
      navigationTarget: null,
      dataSources: ["canonical field-acceptance session", "SUPER_ADMIN yetki kapsamı"],
      retrievedFacts: checklist.map((item) => `${item?.label || "Kontrol maddesi"}: ${item?.status || "PENDING"}`),
      reasoning: "SUPER_ADMIN Kabul Merkezi sorusu, genel rol menüsü yerine canonical kabul oturumunun salt okunur checklist ve karar özetine bağlandı; değişiklik başlatılmadı.",
      priority: "Kabul oturumu özeti",
      semanticPlan,
    };
  }
  const selectedPassengerLiveLinkStatusAnswer = await buildSelectedPassengerLiveLinkStatusAnswer({
    user,
    role,
    message,
    screenContext,
    semanticPlan,
    conversationState,
  });
  if (selectedPassengerLiveLinkStatusAnswer) return selectedPassengerLiveLinkStatusAnswer;
  const selectedParentLiveStatusAnswer = await buildSelectedParentLiveStatusAnswer({
    user,
    role,
    message,
    screenContext,
    semanticPlan,
  });
  if (selectedParentLiveStatusAnswer) return selectedParentLiveStatusAnswer;
  const explicitAgreementContextTarget = explicitRoomAgreementContextNavigationTarget({ user, message, screenContext, semanticPlan });
  if (explicitAgreementContextTarget) {
    const targetPath = normalizeScreenPath(explicitAgreementContextTarget.path);
    const currentPath = normalizeScreenPath(screenContext?.path);
    const targetLabel = explicitAgreementContextTarget.label;
    return {
      role,
      domain: "UI_GUIDANCE",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 1,
      records: [`Sözleşme #${explicitAgreementContextTarget.recordId}`],
      reply: currentPath === targetPath
        ? `Sözleşme #${explicitAgreementContextTarget.recordId} için ${targetLabel} görünümündesin; seçili yetkili kaydı açıyorum.`
        : `Seçili Sözleşme #${explicitAgreementContextTarget.recordId} için ${targetLabel} ekranını açıyorum.`,
      nextAction: `${targetLabel} ekranında seçili Sözleşme #${explicitAgreementContextTarget.recordId} ayrıntısını kontrol et.`,
      source: "authorized-room-agreement-context-navigation-v1",
      navigationTarget: explicitAgreementContextTarget,
      dataSources: ["canlı seçili Sözleşme bağlamı", "ROOM tenant kapsamı"],
      retrievedFacts: [`agreement.id=${explicitAgreementContextTarget.recordId}`, `target.path=${explicitAgreementContextTarget.path}`],
      reasoning: "Açık sözleşme bağlamı isteği, yetkili canlı seçimi koruyarak ilişkili ROOM yüzeyine yönlendirildi; iş yazımı başlatılmadı.",
      priority: "Seçili sözleşme navigasyonu",
      semanticPlan,
    };
  }
  const crossSurfaceRelationResult = await buildRoomCrossSurfaceRelationResult({
    user,
    role,
    message,
    screenContext,
    semanticPlan,
    domainMap: resolveAuthorizedProductDomains(user).domains,
  });
  if (crossSurfaceRelationResult) return crossSurfaceRelationResult;
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
  const explicitOperationHealthTarget = explicitRoomOperationHealthNavigationTarget(user, semanticPlan);
  if (explicitOperationHealthTarget) {
    const currentPath = normalizeScreenPath(screenContext?.path);
    const alreadyOnTarget = currentPath === normalizeScreenPath(explicitOperationHealthTarget.path);
    return {
      role,
      domain: "OPERATIONS",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: alreadyOnTarget
        ? "Şu anda Operasyon Sağlığı ekranındasın. GPS, riskli cihaz ve açık sorun satırlarını buradan kontrol edebilirsin."
        : "Operasyon Sağlığı ekranını aç. GPS, riskli cihaz ve açık sorun satırlarını bu yetkili ekranda kontrol edebilirsin.",
      nextAction: "Operasyon Sağlığı ekranındaki GPS ve açık sorun satırlarını aç.",
      source: "authorized-operation-health-surface-v1",
      navigationTarget: explicitOperationHealthTarget,
      dataSources: ["authorized screen catalog", "canonical explicit surface request"],
      retrievedFacts: [`screen.path=${explicitOperationHealthTarget.path}`, `screen.label=${explicitOperationHealthTarget.label}`],
      reasoning: "Açık Operasyon Sağlığı yüzey isteği, mevcut seçili kayıttan önce yetkili ekran kataloğuna bağlandı; kayıt okuma veya yazma başlatılmadı.",
      priority: "Açık yüzey isteği",
      semanticPlan,
    };
  }
  const domainHowToGuidance = semanticPlan.family === "UI_GUIDANCE"
    && semanticPlan.typedRequest?.screenKnowledgeKind === "HOW_TO_USE"
    && semanticPlan.requestedDomains?.length > 0;
  if (domainHowToGuidance) {
    const domain = semanticPlan.requestedDomains[0];
    const target = authorizedGuidanceSurface(user, domain);
    const currentPath = normalizeScreenPath(screenContext?.path);
    const targetPath = normalizeScreenPath(target?.path);
    const alreadyOnTarget = Boolean(targetPath && currentPath === targetPath);
    const targetLabel = String(target?.label || domainLabel(domain)).trim();
    const purpose = String(target?.purpose || `Yetkili ${domainLabel(domain)} kayıtlarını ve sonraki güvenli adımları incelemek için kullanılır.`).trim();
    const reply = alreadyOnTarget
      ? `Şu anda ${targetLabel} ekranındasın. ${purpose} Önce ekrandaki yetkili kayıt veya durum özetini oku.`
      : `${targetLabel} ekranı ${purpose} Bu isteği kayıt alanı netleştirmesine çevirmeden, ilgili yetkili ekranda nasıl ilerleyeceğini anlatıyorum.`;
    return {
      role,
      domain,
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply,
      nextAction: alreadyOnTarget
        ? "Ekrandaki yetkili kayıt veya durum özetini açıp sonraki adımı sor."
        : `${targetLabel} ekranını açıp ilk güvenli kontrolü sor.`,
      source: "authorized-screen-catalog-v1",
      navigationTarget: alreadyOnTarget ? null : target ? { path: target.path, label: target.label } : null,
      dataSources: ["authorized screen catalog", "current role scope"],
      retrievedFacts: target ? [`screen.path=${target.path}`, `screen.label=${target.label}`] : [`authorized.domain=${domain}`],
      reasoning: "Alan kılavuzu isteği kayıt/alan sorgusuna dönüştürülmeden, mevcut rolün yetkili ekran kataloğundan yönlendirildi.",
      priority: "Yetkili alan rehberi",
      semanticPlan,
    };
  }
  // A COMPANY follow-up that asks which offers are waiting is a read of the
  // authorized offer collection, not a request to open the planning home.
  // The semantic planner can legitimately mark this as OPEN_OFFER_SURFACE
  // because the user may want the related screen next, but answering with the
  // screen catalog first loses the live offer facts and the current dialogue
  // context. Keep this branch read-only and tenant-scoped; no offer decision
  // or other business write is started here.
  if (isCompanyOfferCollectionReadPlan({ role, semanticPlan })) {
    const offerResult = await readOffers(user, role, semanticPlan);
    const hasOffers = Number(offerResult?.count || 0) > 0;
    const recordsText = Array.isArray(offerResult?.records) && offerResult.records.length
      ? ` ${offerResult.records.join(" ")}`
      : "";
    const offerSurface = authorizedGuidanceSurface(user, "OFFERS");
    return {
      role,
      domain: "OFFERS",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: Number(offerResult?.count || 0),
      records: Array.isArray(offerResult?.records) ? offerResult.records : [],
      reply: `${hasOffers
        ? `${offerResult.count} yetkili bekleyen teklif kaydı bulundu.`
        : "Yetkili güncel kayıtlarda bekleyen teklif görünmüyor."}${recordsText} ${offerResult?.nextAction || "Teklifler ekranındaki yetkili kayıtları kontrol et."}`.trim(),
      nextAction: offerResult?.nextAction || "Teklifler ekranındaki yetkili kayıtları kontrol et.",
      source: "authorized-product-read-v1",
      navigationTarget: offerSurface || null,
      dataSources: ["Yetkili teklif kayıtları", "rol/company-kind/tenant kapsamı"],
      retrievedFacts: Array.isArray(offerResult?.records) ? offerResult.records : [],
      reasoning: hasOffers
        ? `${offerResult.count} yetkili teklif kaydı, konuşmadaki bekleyen teklif sorusu için salt okunur olarak okundu.`
        : "Mevcut COMPANY tenant kapsamında bekleyen teklif kaydı bulunmadı.",
      priority: hasOffers ? "Bekleyen teklif koleksiyonu" : "İzleme",
      semanticPlan,
      discourseEntities: authorizedDiscourseEntities({ domain: "OFFERS", facts: offerResult?.facts }),
    };
  }
  const explicitRecordNavigationTarget = explicitOfferRecordNavigationTarget(user, semanticPlan, authorizationDecision)
    || explicitShiftRecordNavigationTarget(user, semanticPlan, authorizationDecision);
  const currentScreenNextActionAnswer = buildCurrentScreenNextActionAnswer({
    user,
    semanticPlan,
    screenContext,
    role,
    domainMap: resolveAuthorizedProductDomains(user),
  });
  if (currentScreenNextActionAnswer && !explicitRecordNavigationTarget) return currentScreenNextActionAnswer;
  const currentScreenPurposeAnswer = buildCurrentScreenPurposeAnswer({
    user,
    semanticPlan,
    screenContext,
    role,
    domainMap: resolveAuthorizedProductDomains(user),
  });
  if (currentScreenPurposeAnswer && !explicitRecordNavigationTarget) return currentScreenPurposeAnswer;
  const relationRecordRequest = semanticPlan?.family === "RELATION_LOOKUP"
    && Boolean(semanticPlan?.relationshipIntent);
  const navigationTarget = relationRecordRequest
    ? null
    : explicitRecordNavigationTarget
      || authorizedNavigationTarget(user, semanticPlan, screenContext);
  if (navigationTarget) {
    const currentPath = String(screenContext?.path || "").replace(/\/+$/, "") || "/";
    const targetPath = String(navigationTarget.path || "").replace(/\/+$/, "") || "/";
    const alreadyOnTarget = currentPath === targetPath;
    const typedTaskType = String(semanticPlan?.typedRequest?.taskType || semanticPlan?.taskType || "").toUpperCase();
    const canonicalRequest = semanticPlan?.canonicalRequest || {};
    const isRoomOfferCollectionView = role === "ROOM"
      && alreadyOnTarget
      && targetPath === "/room/offers"
      && ["VIEW_AUTHORIZED_SURFACE", "NAVIGATE_AUTHORIZED_SURFACE"].includes(canonicalRequest.operation)
      && ["VIEW_OFFER_SURFACE", "OPEN_OFFER_SURFACE"].includes(canonicalRequest.capability)
      && semanticPlan?.requestedDomains?.includes("OFFERS")
      && ["SCREEN_CONTEXT", "OPEN_SURFACE", "VIEW"].includes(typedTaskType)
      && !semanticPlan?.entity
      && !(Array.isArray(semanticPlan?.entities) && semanticPlan.entities.length);
    if (isRoomOfferCollectionView) {
      const offerResult = await readOffers(user, role, semanticPlan);
      const hasOffers = Number(offerResult?.count || 0) > 0;
      const recordsText = Array.isArray(offerResult?.records) && offerResult.records.length
        ? ` ${offerResult.records.join(" ")}`
        : "";
      const reply = `${hasOffers
        ? `${offerResult.count} yetkili teklif kaydı bulundu.`
        : "Yetkili güncel kayıtlarda teklif alanında açık kayıt görünmüyor."}${recordsText} ${offerResult?.nextAction || "Teklifler ekranındaki yetkili kayıtları kontrol et."}`.trim();
      return {
        role,
        domain: "OFFERS",
        authorizationBoundary: false,
        authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
        count: Number(offerResult?.count || 0),
        records: Array.isArray(offerResult?.records) ? offerResult.records : [],
        reply,
        nextAction: offerResult?.nextAction || "Teklifler ekranındaki yetkili kayıtları kontrol et.",
        source: "authorized-product-read-v1",
        navigationTarget: null,
        dataSources: ["Yetkili teklif kayıtları", "rol/company-kind/tenant kapsamı"],
        retrievedFacts: Array.isArray(offerResult?.records) ? offerResult.records : [],
        reasoning: hasOffers
          ? `${offerResult.count} yetkili teklif kaydı, mevcut Teklifler ekranındaki koleksiyon isteği için okundu.`
          : "Mevcut ROOM tenant kapsamında yetkili açık teklif kaydı bulunmadı.",
        priority: hasOffers ? "Yetkili teklif koleksiyonu" : "İzleme",
        semanticPlan,
        discourseEntities: authorizedDiscourseEntities({ domain: "OFFERS", facts: offerResult?.facts }),
      };
    }
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
    const roomCreateBoundary = semanticPlan?.roleCapabilityBoundary === "ROOM_CREATE_UNSUPPORTED"
      ? "ROOM hesabında yeni vardiya veya talep kaydı oluşturulmaz; mevcut vardiyaların operasyonunu Vardiyalar ekranından yönetebilirsin."
      : "";
    const navigationReply = alreadyOnTarget
      ? `Şu anda ${navigationTarget.label} ekranındasın. ${currentStep}`
      : `${navigationTarget.label} ekranını aç. ${navigationTarget.purpose || "Bu ekranda yetkili iş akışını takip edebilirsin."}`;
    const recordTargetRequiresRouteState = Boolean(navigationTarget.recordType && Number(navigationTarget.recordId) > 0);
    return {
      role,
      domain: "UI_GUIDANCE",
      authorizationBoundary: false,
      authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
      count: 0,
      records: [],
      reply: [roomCreateBoundary, navigationReply].filter(Boolean).join(" "),
      nextAction: alreadyOnTarget
        ? "Vurgulanan güvenli kontrolü inceleyip bir sonraki adımı sor."
        : `${navigationTarget.label} ekranını açıp ihtiyacın olan kaydı seç.`,
      source: "authorized-screen-catalog-v1",
      navigationTarget: alreadyOnTarget && !recordTargetRequiresRouteState ? null : {
        path: navigationTarget.path,
        label: navigationTarget.label,
        ...(navigationTarget.routeParams ? { routeParams: navigationTarget.routeParams } : {}),
        ...(navigationTarget.recordType ? { recordType: navigationTarget.recordType } : {}),
        ...(navigationTarget.recordId ? { recordId: navigationTarget.recordId } : {}),
      },
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
  if (role === "DRIVER" && String(navigationWorkflow?.workflowIntent || "") === "OPEN_SHIFT_SURFACE") {
    const driverTarget = buildDriverShiftNavigationTarget({ user, screenContext });
    if (driverTarget) {
      const selectedId = integer(driverTarget.recordId);
      return {
        role,
        domain: "UI_GUIDANCE",
        authorizationBoundary: false,
        authorizedDomainMap: resolveAuthorizedProductDomains(user).domains,
        count: 0,
        records: [],
        reply: selectedId
          ? `Bu vardiyanın durak sırasını ve görev ayrıntılarını görmek için Rota ekranını aç. Seçili Vardiya #${selectedId} bağlamını koruyorum.`
          : "Bu vardiyanın durak sırasını ve görev ayrıntılarını görmek için Rota ekranını aç.",
        nextAction: "Rota ekranını açıp seçili vardiyanın duraklarını kontrol et.",
        source: "authorized-driver-route-guidance-v1",
        navigationTarget: {
          path: driverTarget.path,
          label: driverTarget.label,
          ...(driverTarget.routeParams ? { routeParams: driverTarget.routeParams } : {}),
          ...(driverTarget.recordType ? { recordType: driverTarget.recordType } : {}),
          ...(driverTarget.recordId ? { recordId: driverTarget.recordId } : {}),
        },
        dataSources: ["authorized DRIVER screen catalog", "selected shift context"],
        retrievedFacts: ["screen.path=/driver/route", ...(selectedId ? [`shift.id=${selectedId}`] : [])],
        reasoning: "DRIVER rolü Vardiyalar koleksiyonuna sahip değildir; seçili vardiya için yetkili operasyon yüzeyi Rota ekranıdır.",
        priority: "Sürücü rota yönlendirmesi",
        semanticPlan,
      };
    }
  }
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
    const screenContinuation = buildScreenContinuationAnswer({
      user,
      semanticPlan,
      screenContext,
      role,
      domainMap: resolveAuthorizedProductDomains(user),
    });
    if (screenContinuation) return screenContinuation;
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
  const selectedAgreementRead = isSelectedAgreementReadContext({ role, screenContext, semanticPlan });
  if (deniedDomains.length || (["SCHOOL", "ORGANIZATION"].includes(role) && commercialRequest && requestedDomains.some((domain) => ["OFFERS", "AGREEMENTS", "BUDGET", "FINANCE"].includes(domain)) && !selectedAgreementRead)) {
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
  const operationHealthIssueSurfaceView = role === "ROOM"
    && (
      (
        screenContext?.path === "/room/operation-health"
        && semanticPlan?.canonicalRequest?.operation === "VIEW_AUTHORIZED_SURFACE"
        && semanticPlan?.canonicalRequest?.typedEvidence?.specificity?.issueSurfaceViewEvidence === true
      )
      || semanticPlan?.canonicalRequest?.operation === "DIAGNOSE_CURRENT_ISSUE"
    )
    && requestedDomains.includes("OPERATIONS");
  if (operationHealthIssueSurfaceView) {
    const [vehicleIssues, agreements, offers] = await Promise.all([
      readVehicles(user, role, semanticPlan),
      readAgreements(user, role, semanticPlan),
      readOffers(user, role, semanticPlan),
    ]);
    const metric = await readOperationHealthMetricContract({
      user,
      screenContext,
      vehicleIssues,
      agreements,
      offers,
    });
    if (metric.openIssues != null || metric.staleOrOfflineDrivers != null || metric.riskyDevices != null) {
      const operationHealthTarget = buildRoleHelpSummary(user).screens.find((screen) => screen.label === "Operasyon Sağlığı") || null;
      const currentPath = normalizeScreenPath(screenContext?.path);
      const targetPath = normalizeScreenPath(operationHealthTarget?.path);
      return {
        role,
        domain: "OPERATIONS",
        authorizationBoundary: false,
        authorizedDomainMap: allowed,
        count: Number(metric.openIssues || 0),
        records: [`Açık sorun: ${metric.openIssues ?? "okunamadı"}`, `Stale/offline sürücü: ${metric.staleOrOfflineDrivers ?? "okunamadı"}`],
        reply: buildOperationHealthMetricReply("", metric),
        nextAction: "Sorunlar sekmesindeki açık issue satırını ve gerekiyorsa Kanıt sekmesini incele; ticari takip bulgularını operasyon arızası olarak işleme.",
        source: "authorized-current-room-operation-health-metric-contract-v1",
        navigationTarget: targetPath && targetPath !== currentPath ? operationHealthTarget : null,
        dataSources: ["SERVER_AUTHORIZED_ROOM_OPERATION_HEALTH_AND_REPORTS", "authorized vehicle/location records", "authorized agreement and offer records"],
        retrievedFacts: [
          `openIssues=${metric.openIssues ?? "unavailable"}`,
          `staleOrOffline=${metric.staleOrOfflineDrivers ?? "unavailable"}`,
          `riskyDevices=${metric.riskyDevices ?? "unavailable"}`,
          `vehicleStaleGps=${metric.vehicleStaleGpsEvidence ?? "unavailable"}`,
          `agreementReview=${metric.agreementReviewEvidence ?? "unavailable"}`,
          `offerResponse=${metric.offerResponseEvidence ?? "unavailable"}`,
        ],
        reasoning: "Açık sorun gösterme isteği, genel operasyon sorgusu yerine mevcut yetkili Operasyon Sağlığı metrik sözleşmesine bağlandı; ticari veya başka ekran sinyali operasyon issue yerine ikame edilmedi.",
        priority: metric.openIssues > 0 ? "Açık sorunlar" : "Operasyon sağlığı",
        semanticPlan,
      };
    }
  }
  const readDomain = async (domain, { plan: scopedPlan = semanticPlan } = {}) => {
    if (domain === "OFFERS") return readOffers(user, role, scopedPlan);
    if (domain === "AGREEMENTS") return readAgreements(user, role, scopedPlan);
    if (domain === "SHIFTS") return readShifts(user, role, false, scopedPlan);
    if (domain === "VEHICLES") return readVehicles(user, role, scopedPlan);
    if (domain === "DRIVERS") return readDrivers(user, role, scopedPlan);
    if (domain === "PERSONNEL") {
      if (role === "PARENT"
        && scopedPlan?.entity?.type === "personnel"
        && Array.isArray(scopedPlan?.requestedFields)
        && scopedPlan.requestedFields.some((field) => String(field?.key || field || "").toUpperCase() === "STATUS")) {
        const personnelResult = await readPersonnel(user, role, scopedPlan);
        if (!Number(personnelResult?.count || 0)) return personnelResult;
        const operationResult = await readOperations(user, role, scopedPlan);
        return mergeParentSelectedPersonnelFacts(personnelResult, operationResult);
      }
      return scopedPlan.semanticEntityType === "PARENT" ? readParentLinks(user, role) : readPersonnel(user, role, scopedPlan);
    }
    if (domain === "SERVICE_REQUESTS") return readServiceRequests(user, role, scopedPlan);
    if (domain === "BUDGET") return readFinance(user, role, true, scopedPlan);
    if (domain === "FINANCE") return readFinance(user, role, false, scopedPlan);
    if (domain === "NOTIFICATIONS") return readNotifications(user, role, scopedPlan);
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
    const executionAgreementFacts = execution.items
      .filter((item) => item?.domain === "AGREEMENTS")
      .flatMap((item) => Array.isArray(item?.facts) ? item.facts : []);
    const hasUnauthorized = execution.unauthorizedFacts.length > 0;
    const composedExecution = composeMultiPartExecutionReply({ plan: semanticPlan, execution, baseReply: execution.reply, role });
    const requestedOfferEntity = semanticPlan.entity?.type === "offer"
      ? semanticPlan.entity
      : semanticPlan.entities?.find((entity) => entity?.type === "offer") || null;
    const resolvedRequestedOffer = requestedOfferEntity
      && Array.isArray(execution.items)
      && execution.items.some((item) => item?.status === "RESOLVED"
        && item?.entity?.type === "offer"
        && Number(item.entity.id) === Number(requestedOfferEntity.id));
    const recordNavigationTarget = resolvedRequestedOffer
      ? explicitOfferRecordNavigationTarget(user, semanticPlan, authorizationDecision, { allowRecordDetails: true })
      : null;
    const crossMenuNavigationTarget = authorizedCrossMenuNavigationTarget(user, semanticPlan, screenContext);
    const vehicleToDriverRelation = semanticPlan?.relationshipIntent?.kind === "VEHICLE_TO_DRIVER"
      ? execution.items
        .filter((item) => item?.domain === "DRIVERS")
        .flatMap((item) => Array.isArray(item?.facts) ? item.facts : [])
        .map((fact) => ({
          id: Number(fact?.driverId || fact?.id || 0),
          vehicleId: Number(fact?.vehicleId || 0),
          vehiclePlate: String(fact?.vehiclePlate || "").replace(/\s+/g, "").toLocaleUpperCase("tr-TR"),
        }))
        .find((fact) => {
          const fromEntity = semanticPlan.relationshipIntent?.fromEntity || {};
          const sourceVehicleId = Number(fromEntity.id || 0);
          const sourceVehiclePlate = String(fromEntity.plate || "").replace(/\s+/g, "").toLocaleUpperCase("tr-TR");
          return fact.id > 0
            && ((sourceVehicleId > 0 && fact.vehicleId === sourceVehicleId)
              || (sourceVehiclePlate && fact.vehiclePlate === sourceVehiclePlate));
        })
      : null;
    const vehicleToDriverNavigationTarget = vehicleToDriverRelation
      ? {
        path: "/room/drivers",
        label: "Sürücüler",
        routeParams: { focusDriverId: vehicleToDriverRelation.id },
        recordType: "DRIVER",
        recordId: vehicleToDriverRelation.id,
      }
      : null;
    const resolvedExplicitShift = semanticPlan?.family === "RECORD_DETAILS"
      && semanticPlan?.entity?.type === "shift"
      ? execution.items.find((item) => item?.status === "RESOLVED"
        && item?.entity?.type === "shift"
        && Number(item?.entity?.id || 0) === Number(semanticPlan.entity.id || 0))
      : null;
    const explicitShiftNavigationTarget = resolvedExplicitShift
      ? buildRoleScopedShiftNavigationTarget(role, screenContext?.path, resolvedExplicitShift.entity.id)
      : null;
    const relationCollectionNavigationTarget = semanticPlan?.relationshipIntent?.kind === "AGREEMENT_TO_SHIFT_COLLECTION"
      ? execution.items
        .filter((item) => item?.domain === "SHIFTS")
        .flatMap((item) => Array.isArray(item?.facts) ? item.facts : [])
        .map((fact) => ({ id: Number(fact?.id || fact?.shiftId || 0), agreementId: Number(fact?.agreementId || 0) }))
        .find((fact) => fact.id > 0 && fact.agreementId > 0)
      : null;
    const relationOfferNavigationTarget = semanticPlan?.relationshipIntent?.kind === "SHIFT_TO_OFFER"
      ? execution.items
        .filter((item) => item?.domain === "OFFERS")
        .flatMap((item) => Array.isArray(item?.facts) ? item.facts : [])
        .map((fact) => ({ id: Number(fact?.offerId || fact?.id || 0), shiftId: Number(fact?.shiftId || 0) }))
        .find((fact) => fact.id > 0 && fact.shiftId === Number(semanticPlan.relationshipIntent?.fromEntity?.id || 0))
      : null;
    const relationOfferShiftNavigationTarget = semanticPlan?.relationshipIntent?.kind === "OFFER_TO_SHIFT"
      ? execution.items
        .filter((item) => item?.domain === "OFFERS")
        .flatMap((item) => Array.isArray(item?.facts) ? item.facts : [])
        .map((fact) => ({
          offerId: Number(fact?.offerId || fact?.id || 0),
          shiftId: Number(fact?.shiftId || 0),
        }))
        .find((fact) => fact.offerId === Number(semanticPlan.relationshipIntent?.fromEntity?.id || 0) && fact.shiftId > 0)
      : null;
    const relationShiftAgreementNavigationTarget = semanticPlan?.relationshipIntent?.kind === "SHIFT_TO_AGREEMENT"
      && Number(semanticPlan.relationshipIntent?.toEntity?.id || 0) > 0
      ? {
        path: "/company/agreements",
        label: "Sözleşmeler",
        routeParams: { focusAgreementId: Number(semanticPlan.relationshipIntent.toEntity.id) },
        recordType: "AGREEMENT",
        recordId: Number(semanticPlan.relationshipIntent.toEntity.id),
      }
      : null;
    const selectedShiftPersonnelLookup = role === "COMPANY"
      && normalizeScreenPath(screenContext?.path) === "/company/shifts"
      && String(semanticPlan?.entity?.type || "").toLowerCase() === "shift"
      && Number(semanticPlan?.entity?.id || 0) > 0
      && String(semanticPlan?.typedRequest?.targetEntityType || "").toUpperCase() === "PERSONNEL"
      && Array.isArray(semanticPlan?.requestedFields)
      && semanticPlan.requestedFields.some((field) => String(field?.key || field || "").toUpperCase() === "STATUS");
    const selectedShiftPersonnelNavigationTarget = selectedShiftPersonnelLookup
      ? {
        path: "/company/shifts",
        label: "Personel ve rota ayrıntısı",
        purpose: "Seçili vardiyanın salt-okunur kullanım/personel bağlantısı yüzeyini aç.",
        routeParams: { focusShiftId: Number(semanticPlan.entity.id), focusTask: "usage" },
        recordType: "SHIFT",
        recordId: Number(semanticPlan.entity.id),
      }
      : null;
    const navigationTarget = selectedShiftPersonnelNavigationTarget
      ? selectedShiftPersonnelNavigationTarget
      : vehicleToDriverNavigationTarget
      ? vehicleToDriverNavigationTarget
      : explicitShiftNavigationTarget
      ? explicitShiftNavigationTarget
      : relationOfferShiftNavigationTarget
      ? {
        path: resolveRoleScopedNavigationPath(role, screenContext?.path, "/shifts"),
        label: "Vardiyalar",
        routeParams: { focusShiftId: relationOfferShiftNavigationTarget.shiftId },
        recordType: "SHIFT",
        recordId: relationOfferShiftNavigationTarget.shiftId,
      }
      : relationCollectionNavigationTarget
      ? {
        path: resolveRoleScopedNavigationPath(role, screenContext?.path, "/shifts"),
        label: "Sözleşmeden Üretilen vardiyalar",
        routeParams: { focusShiftId: relationCollectionNavigationTarget.id },
      }
      : relationOfferNavigationTarget
        ? {
          path: "/room/offers",
          label: "Teklifler",
          routeParams: { offerId: relationOfferNavigationTarget.id },
          recordType: "OFFER",
          recordId: relationOfferNavigationTarget.id,
        }
      : relationShiftAgreementNavigationTarget
        ? relationShiftAgreementNavigationTarget
      : recordNavigationTarget || crossMenuNavigationTarget;
    const operationalDiagnosticRequest = semanticPlan?.canonicalRequest?.operation === "DIAGNOSE_CURRENT_ISSUE"
      && String(semanticPlan?.canonicalRequest?.domain || "").toUpperCase() === "OPERATIONS";
    const operationalSituationRequest = semanticPlan?.canonicalRequest?.operation === "ASSESS_CURRENT_SITUATION"
      && String(semanticPlan?.canonicalRequest?.domain || "").toUpperCase() === "OPERATIONS";
    const operationalMissingInformationRequest = operationalDiagnosticRequest
      && semanticPlan?.family === "SELECTED_RECORD_CONTEXT"
      && Array.isArray(semanticPlan?.requestedTasks)
      && semanticPlan.requestedTasks.includes("MISSING_DATA");
    const liveOperationalSelection = Number(
      screenContext?.selectedEntityId
        || screenContext?.selectedRecordId
        || semanticPlan?.entity?.id
        || 0,
    ) > 0;
    const delayedEvidence = executionRecords.some((record) => /gecik|gecikmi[sş]|aksama|late/iu.test(String(record || "")));
    const operationalNavigationTarget = (operationalDiagnosticRequest || operationalSituationRequest)
      && role === "COMPANY"
      && normalizeScreenPath(screenContext?.path) !== "/company/operations"
      ? {
        path: "/company/operations",
        label: "Operasyon Paneli",
        purpose: "Seçili servis veya vardiyanın operasyon durumunu ve varsa gecikme kanıtını incele.",
      }
      : null;
    const operationalFacts = execution.items
      .filter((item) => item?.domain === "OPERATIONS")
      .flatMap((item) => Array.isArray(item?.facts) ? item.facts : []);
    const approvedOperationalCount = operationalFacts.filter((fact) => String(fact?.status || "").toUpperCase() === "APPROVED").length;
    const draftOperationalCount = operationalFacts.filter((fact) => String(fact?.status || "").toUpperCase() === "DRAFT").length;
    const assignedVehicleCount = operationalFacts.filter((fact) => String(fact?.vehiclePlate || fact?.vehicle || "").trim()).length;
    const offlineOperationalCount = operationalFacts.filter((fact) => ["OFFLINE", "STALE"].includes(String(fact?.freshness || "").toUpperCase())).length;
    const operationalSituationReply = operationalSituationRequest
      && role === "COMPANY"
      && operationalFacts.length
      ? `Yetkili kapsamda ${operationalFacts.length} servis/vardiya görünümü var: ${approvedOperationalCount} onaylı, ${draftOperationalCount} taslak. ${assignedVehicleCount} kayıtta araç/sürücü bağlantısı görünüyor; ${offlineOperationalCount} kayıtta konum sinyali güncel değil. Ayrıntıyı Operasyon Paneli ve Vardiyalar ekranında kayıt seçerek inceleyebilirsin.`
      : null;
    const operationalMissingInformationReply = operationalMissingInformationRequest
      && role === "COMPANY"
      && !liveOperationalSelection
      ? "Bu ekranda seçili bir servis veya vardiya yok. Eksik bilgiyi doğru kayda bağlamak için önce Operasyon Paneli veya Vardiyalar listesinden incelemek istediğin kaydı seçmem gerekiyor; ilk kaydı varsayılan almıyorum. Seçimden sonra araç/sürücü, rota/durak, GPS ve durum bilgilerini tek tek gösterebilirim."
      : null;
    const operationalDiagnosticReply = operationalMissingInformationReply
      || (operationalDiagnosticRequest
      && role === "COMPANY"
      && !liveOperationalSelection
      && !delayedEvidence
      ? "Bu ekranda seçili bir servis veya vardiya yok. Yetkili operasyon kayıtlarında doğrulanmış bir gecikme görünmüyor; görünen kayıtlar yaklaşan ya da henüz başlamamış durumda. İlgili kaydı Operasyon Paneli'nde seçerek gecikme kanıtını inceleyebilirsin."
      : composedExecution.reply);
    const effectiveOperationalReply = operationalSituationReply || operationalDiagnosticReply;
    const schoolOperationsStatusReply = buildSchoolOperationsStatusReply({
      request: hasSchoolOperationsStatusCue(message, screenContext),
      operationsFacts: operationalFacts,
    });
    return {
      role,
      domain: hasUnauthorized ? "AUTHORIZATION_BOUNDARY" : semanticPlan.requestedDomains.length > 1 ? "MULTI_DOMAIN" : semanticPlan.requestedDomains[0],
      authorizationBoundary: hasUnauthorized,
      authorizedDomainMap: allowed,
      count: execution.items.reduce((sum, item) => sum + Number(item.count || 0), 0),
      records: executionRecords.slice(0, 16),
      reply: schoolOperationsStatusReply || effectiveOperationalReply,
      nextAction: operationalMissingInformationRequest && !liveOperationalSelection
        ? "Operasyon Paneli veya Vardiyalar listesinden ilgili servisi/vardiyayı seç; seçmeden ilk kaydı varsayılan almıyorum."
        : operationalNavigationTarget
        ? "Operasyon Paneli'ni açıp ilgili servis veya vardiyayı seç; gecikme kanıtı yoksa bunu gerçekleşmiş gecikme olarak yorumlama."
        : composedExecution.nextAction,
      source: "authorized-query-plan-executor-v2",
      dataSources: semanticPlan.requestedDomains.map((domain) => `yetkili ${domainLabel(domain)} kayıtları`).concat("rol/company-kind/tenant kapsamı"),
      retrievedFacts: executionRecords.slice(0, 16),
      reasoning: `Plan ${semanticPlan.planVersion} içindeki ${semanticPlan.evidenceRequirements.length} kanıt gereksinimi terminal durumlarla değerlendirildi; ham satır yerine yapılandırılmış sentez üretildi.`,
      priority: hasUnauthorized ? "Yetki sınırı" : execution.status === "NO_DATA" ? "İzleme" : "Plan yürütme sonucu",
      semanticPlan,
      queryPlanExecution: execution,
      navigationTarget: operationalNavigationTarget || navigationTarget,
      synthesis: {
        facts: execution.structuredFacts,
        missingFacts: execution.missingFacts,
        unauthorizedFacts: execution.unauthorizedFacts,
        inferences: execution.inferences,
        recommendation: execution.recommendation,
      },
      discourseEntities: authorizedDiscourseEntities({ domain: semanticPlan.requestedDomains.length === 1 ? semanticPlan.requestedDomains[0] : "", facts: executionAgreementFacts }),
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
    const navigationTarget = authorizedCrossMenuNavigationTarget(user, semanticPlan, screenContext);
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
      navigationTarget,
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
  else if (domain === "SERVICE_REQUESTS") result = await readServiceRequests(user, role, semanticPlan);
  else if (domain === "BUDGET") result = await readFinance(user, role, true, semanticPlan);
  else if (domain === "FINANCE") result = await readFinance(user, role, false, semanticPlan);
  else if (domain === "NOTIFICATIONS") result = await readNotifications(user, role, semanticPlan);
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
    navigationTarget: authorizedCrossMenuNavigationTarget(user, semanticPlan, screenContext),
    discourseEntities: authorizedDiscourseEntities({ domain, facts: result?.facts }),
  };
}
