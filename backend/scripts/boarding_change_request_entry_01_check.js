#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function mustContain(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContain(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function blockBetween(text, startNeedle, endNeedle) {
  const start = String(text || "").indexOf(startNeedle);
  if (start < 0) return "";
  const end = endNeedle ? String(text || "").indexOf(endNeedle, start + startNeedle.length) : -1;
  return end < 0 ? String(text || "").slice(start) : String(text || "").slice(start, end);
}

function assertContainsAll(text, items, prefix) {
  for (const item of items) {
    mustContain(text, item, `${prefix}: ${item}`);
  }
}

function assertNotContainsAny(text, items, prefix) {
  for (const item of items) {
    mustNotContain(text, item, `${prefix}: ${item}`);
  }
}

function main() {
  console.log("=== BOARDING-CHANGE-REQUEST-ENTRY-01 CHECK ===");

  must(exists("docs/BOARDING_CHANGE_REQUEST_ENTRY_01.md"), "milestone doc exists");
  must(exists("backend/scripts/boarding_change_request_entry_01_check.js"), "check script exists");

  const pkg = read("package.json");
  mustContain(pkg, '"check:boardingchangerequestentry01": "node backend/scripts/boarding_change_request_entry_01_check.js"', "package.json exposes check:boardingchangerequestentry01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContain(runner, "check:boardingchangerequestentry01", "product extensions runner includes boarding change request entry");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContain(verify, "check:boardingchangerequestentry01", "verify chain includes boarding change request entry");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContain(guide, "BOARDING-CHANGE-REQUEST-ENTRY-01", "milestone guide mentions boarding change request entry");
  mustContain(guide, "check:boardingchangerequestentry01", "milestone guide exposes boarding change request entry check");

  const milestoneDoc = read("docs/BOARDING_CHANGE_REQUEST_ENTRY_01.md");
  assertContainsAll(milestoneDoc, [
    "Personel talep girişi",
    "Veli / Parent talep girişi",
    "Bugün binmeyeceğim",
    "Aynı rota üzerindeki başka duraktan bineceğim",
    "Farklı konumdan alınmak istiyorum",
    "Konumumu al",
    "Büyük haritada konum seç",
    "Adresten konum bul",
    "Same-route / aynı rota üzerindeki başka durak talebinde serbest pin kullanılmaz; yalnızca rota üzerindeki durak listesi kullanılır.",
    "Bu konum sadece bu biniş değişikliği talebi için kullanılır.",
    "Çocuğum bugün binmeyecek",
    "Çocuğum başka duraktan binecek",
    "Çocuğum şu konumdan alınsın",
    "Same-route => Driver",
    "Non-same-route => Company / School / Organization",
    "Room sadece görür",
    "Readonly önizleme",
    "Out-of-scope",
  ], "milestone doc content");

  const requestUi = read("web/src/panels/shared/BoardingChangeRequestEntryCard.jsx");
  assertContainsAll(requestUi, [
    "NO_SHOW",
    "DIFFERENT_STOP",
    "PICKUP_FROM_LOCATION",
    'requestKind === "DIFFERENT_STOP"',
    "Talep oluştur",
    "Talep seçilince readonly önizleme burada görünür.",
    "Durak seç",
    "Bu servis için koordinatlı durak bulunamadı; talep açıklama üzerinden iletilecek.",
    "request?.locationSummary",
    "Readonly önizleme - talep oluşturulur, rota uygulanmaz.",
    "Seçimi temizle",
    "Bu çocuk için şu an canlı araç görünmüyor. Talep oluşturma, planlı servis bilgisine göre yapılır.",
    "Seçili tarih için planlı servis bağlamı bulunamadı.",
    "Talep listesi şu an okunamıyor. Lütfen tekrar deneyin.",
    "Bu ekranda tam form gösterilmez. Talep oluşturmak için canlı ekrana geç.",
    "Canlı ekranda talep oluştur",
    "Konumumu al",
    "Büyük haritada konum seç",
    "Adresten konum bul",
    "Bu konum sadece bu biniş değişikliği talebi için kullanılır.",
    "Konum izni verilmedi. Büyük haritadan konum seçebilir veya adresten arayabilirsiniz.",
    "Adresten konum bulma henüz bağlı değil. Büyük haritadan konum seçebilir veya açıklama yazabilirsiniz.",
    "Konum seçimi için üç yol var.",
    "Haritadan konum seçin veya açıklama alanına net tarif yazın.",
    "Onaylamak için büyük haritadaki \"Bu konumu kullan\" düğmesini seç.",
    "Bu konumu kullan",
    'confirmButtonLabel="Bu konumu kullan"',
    'selectedLabelText="Seçilen konum"',
  ], "request entry card");
  mustNotContain(requestUi, "OPERATION_NOTE", "request entry card no longer exposes OPERATION_NOTE as a visible option");
  mustNotContain(requestUi, "OK Yap", "request entry card no longer exposes old OK Yap wording");

  const geoPicker = read("web/src/components/geo/GeoLocationPicker.jsx");
  assertContainsAll(geoPicker, [
    "selectedLabelText",
    "selectedLabel",
    "onOpenPicker",
    "confirmButtonLabel",
    "onSave || onSaveNext || onMarkOk",
    "handleGeocodeClick",
    "setPickerOpen(true)",
    "Konumumu Al",
    "Büyük Haritada İşaretle",
    "Adresten Bul",
    "Konum izni verilmedi. Büyük haritadan konum seçebilir veya adresten arayabilirsiniz.",
    "Adresten konum bulma henüz bağlı değil. Büyük haritadan konum seçebilir veya açıklama yazabilirsiniz.",
    "Küçük harita sadece önizleme içindir.",
  ], "geo location picker");

  const boardingUi = read("web/src/panels/shared/boardingChangeUi.js");
  assertContainsAll(boardingUi, [
    "TEMPORARY_BOARDING_NOTE",
    "Bugün binmeyeceğim",
    "Başka durak",
    "Farklı konumdan alınmak istiyorum",
    "Sürücüde bekliyor",
    "Firma/Okul/Kurum tarafında bekliyor",
    "Aynı rota üzerindeki talep sürücü tarafında karar bekliyor.",
    "Rota değişikliği içerdiği için hizmet alan taraf karar veriyor.",
  ], "boarding change ui");

  const previewCard = read("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx");
  assertContainsAll(previewCard, [
    "Readonly önizleme — rota uygulanmaz",
    "Mini harita önizlemesi",
    "Harita önizlemesi için durak koordinatı eksik.",
    "Bu değişiklik için rota etkisi metinsel olarak önizleniyor.",
    "Kişi bilgisi eksik",
    "Seçimi temizle",
  ], "route impact preview card");

  const labels = read("web/src/utils/labels.js");
  assertContainsAll(labels, [
    "resolvePersonDisplayLabel",
    "personel",
    "personnel",
    "student",
    "employee",
    "Kişi bilgisi yok",
  ], "person label helper");

  const api = read("web/src/api.js");
  assertContainsAll(api, [
    "createBoardingChangeRequest",
    "getBoardingChangeRequestContext",
    "listMyBoardingChangeRequests",
    "/api/requests",
    "/api/requests/context",
    "/api/requests/mine",
  ], "boarding change request api");

  const validators = read("backend/src/validators.js");
  assertContainsAll(validators, [
    "requestedLat",
    "requestedLng",
    "requestedAddressText",
    "requestedLocationMode",
  ], "request schema location fields");

  const requestOps = read("backend/src/routes/boardingChangeRequestOps.js");
  assertContainsAll(requestOps, [
    "no service today",
    "no service",
    "alternate_stop",
    "alternate stop today",
    "temporary boarding note",
    "gecici binis notu",
    "PARENT",
    "PERSONEL",
  ], "boarding change request ops normalization");

  const previewService = read("backend/src/services/boardingRouteImpactPreview.js");
  assertContainsAll(previewService, [
    "locationProvided",
    "locationHint",
    "Konum paylaşılmadı; talep açıklama üzerinden iletilecek.",
    "Harita önizlemesi için durak koordinatı eksik. Bu değişiklik için rota etkisi metinsel olarak önizleniyor.",
    "decisionOwnerRole",
    "decisionOwnerLabel",
    "decisionOwnerNote",
  ], "boarding route impact preview");

  const requestView = read("backend/src/services/boardingChangeRequestView.js");
  assertContainsAll(requestView, [
    "resolvePersonLabelFromItem",
    "personel?.fullName",
    "personnel?.fullName",
    "student?.fullName",
    "employee?.fullName",
    "requestedAddressText",
    "requestedLocationMode",
    "locationSummary",
    "decisionOwnerRole",
    "decisionOwnerLabel",
    "decisionOwnerNote",
  ], "boarding change request view");

  const geocodeRoute = read("backend/src/routes/geocode.js");
  assertContainsAll(geocodeRoute, [
    "nominatim.openstreetmap.org/search",
    "GEOCODE_USER_AGENT",
    'r.post("/", async (req, res) => {',
  ], "geocode proxy route");
  mustNotContain(geocodeRoute, "fake", "geocode proxy is not fake");
  mustNotContain(geocodeRoute, "hardcode", "geocode proxy has no hardcoded api key");
  mustNotContain(geocodeRoute, "AIza", "geocode proxy has no hardcoded google api key");
  mustNotContain(geocodeRoute, "apiKey", "geocode proxy has no hardcoded api key token");
  mustNotContain(geocodeRoute, "MAPBOX", "geocode proxy has no hardcoded mapbox token");
  const geocodeRouteMounts = read("backend/src/bootstrap/routeMounts.js");
  mustContain(geocodeRouteMounts, 'app.use("/api/geocode", geocodeRouter());', "geocode router is mounted");

  const requestsRoute = read("backend/src/routes/requests.js");
  assertContainsAll(requestsRoute, [
    'r.post("/", authRequired(), requireRole("PERSONEL", "PARENT")',
    'r.get("/context", authRequired(), requireRole("PERSONEL", "PARENT")',
    'previewBoardingChangeRouteImpact(',
    "requestPreview",
    "decisionOwnerRole",
    "decisionOwnerLabel",
    "decisionOwnerNote",
    'r.get("/mine", authRequired(), requireRole("PERSONEL", "PARENT")',
  ], "requests route request-entry wiring");
  const createBlock = blockBetween(
    requestsRoute,
    'r.post("/", authRequired(), requireRole("PERSONEL", "PARENT")',
    '  // COMPANY/ROOM/SUPER_ADMIN: list pickup requests'
  );
  must(createBlock.length > 0, "requests create block extracted");
  assertContainsAll(createBlock, [
    "previewBoardingChangeRouteImpact(",
    "requestDecisionOwnerRole",
    "requestDecisionOwnerLabel",
    "requestDecisionOwnerNote",
    "locationProvided",
    "requestedLatRaw",
    "requestedLngRaw",
    "requestedAddressText",
    "requestedLocationMode",
    "hasRequestedCoords",
    "targetStopId",
    "targetStopName",
  ], "requests create block preview metadata");
  assertNotContainsAny(createBlock, [
    "applyAcceptedBoardingChange(",
    "boardingChangeRouteRefresh",
    "driverRouteRefresh",
    "payment",
    "settlement execute",
    "sms",
    "push",
    "penalty",
  ], "requests create block action guard");

  const driverRoute = read("backend/src/routes/driver.js");
  assertContainsAll(driverRoute, [
    "decisionOwnerRole",
    "decisionOwnerLabel",
    "decisionOwnerNote",
    'decisionOwnerRole === "DRIVER"',
  ], "driver route decision owner wiring");

  const personelLive = read("web/src/panels/personel/LivePanel.jsx");
  const personelMyRide = read("web/src/panels/personel/MyRidePanel.jsx");
  const parentLive = read("web/src/panels/parent/LivePanel.jsx");
  assertContainsAll(personelLive, [
    "BoardingChangeRequestEntryCard",
    "onRequestCreated={loadAll}",
    'mode="PERSONEL"',
    'entryMode="full"',
  ], "personel live request entry wiring");
  assertContainsAll(personelMyRide, [
    "BoardingChangeRequestEntryCard",
    "onRequestCreated={loadAll}",
    'mode="PERSONEL"',
    'entryMode="summary"',
    'onOpenEntry={() => navigate("/personel/live")}',
    "Canlı ekranda talep oluştur",
    "Biniş değişikliği özeti",
  ], "personel my-ride request entry wiring");
  mustNotContain(personelMyRide, 'entryMode="full"', "personel my-ride no longer renders the full entry form");
  assertContainsAll(parentLive, [
    "BoardingChangeRequestEntryCard",
    "onRequestCreated={loadAll}",
    'mode="PARENT"',
    "childId={selected?.id || childId || null}",
    "Bu çocuk için şu an canlı araç görünmüyor. Talep oluşturma, planlı servis bilgisine göre yapılır.",
  ], "parent live request entry wiring");

  const routeMounts = read("backend/src/bootstrap/routeMounts.js");
  mustContain(routeMounts, 'app.use("/api/requests", requestsRouter(io));', "requests router is mounted");

  const companyOps = read("web/src/panels/company/OperationsPanel.jsx");
  const schoolOps = read("web/src/panels/school/OperationsPanel.jsx");
  const roomOps = read("web/src/panels/room/roomOperationsBoard.jsx");
  const roomHealth = read("web/src/panels/room/OperationHealthPanel.jsx");
  const driverPanel = read("web/src/panels/driver/RoutePanel.jsx");
  assertContainsAll(companyOps, [
    "decisionOwnerRole === \"COMPANY\"",
    "Kabul et",
    "Reddet",
    "Rota etkisini önizle",
  ], "company operations decision owner surface");
  assertContainsAll(schoolOps, [
    "decisionOwnerRole === \"COMPANY\"",
    "Kabul et",
    "Reddet",
    "Rota etkisini önizle",
  ], "school operations decision owner surface");
  assertContainsAll(driverPanel, [
    'decisionOwnerRole === "DRIVER"',
    "Kabul et",
    "Reddet",
  ], "driver route decision owner surface");
  assertContainsAll(roomOps, [
    "decisionOwnerNote",
    "Readonly önizleme",
  ], "room operations readonly surface");
  assertContainsAll(roomHealth, [
    "decisionOwnerNote",
    "Readonly önizleme",
  ], "room operation-health readonly surface");
  assertNotContainsAny(roomOps, ["Kabul et", "Reddet"], "room operations no accept/reject");
  assertNotContainsAny(roomHealth, ["Kabul et", "Reddet"], "room operation-health no accept/reject");

  const copilotFacts = read("web/src/utils/copilotFacts.js");
  assertContainsAll(copilotFacts, [
    "BOARDING_CHANGE_REQUEST_ENTRY",
    "Bugün binmeyeceğim talebi oluştur",
    "Konumumu al",
    "Büyük haritada konum seç",
    "Adresten konum bul",
    "Çocuğum bugün binmeyecek",
    "Çocuğum başka duraktan binecek",
    "Çocuğum şu konumdan alınsın",
  ], "copilot facts request entry chips");

  const intentRouter = read("backend/src/ai/chat/intentRouter.js");
  assertContainsAll(intentRouter, [
    "BOARDING_CHANGE_REQUEST_ENTRY",
    "hasBoardingChangeRequestEntrySignal",
    "Bugün binmeyeceğim talebi oluştur",
    "Konumumu al",
    "Büyük haritada konum seç",
    "Adresten konum bul",
    "/personel/live",
    "/personel/my",
    "/parent/live",
  ], "intent router request entry routing");

  const answerPolicy = read("backend/src/ai/chat/answerQualityPolicy.js");
  assertContainsAll(answerPolicy, [
    "BOARDING_CHANGE_REQUEST_ENTRY",
    "requestEntryChips",
    "Bugün binmeyeceğim talebi oluştur",
    "Konumumu al",
    "Büyük haritada konum seç",
    "Adresten konum bul",
    "Biniş talebi oluşturma rehberini aç",
  ], "answer quality policy request entry guardrails");

  const helpComposer = read("backend/src/ai/chat/helpComposer.js");
  assertContainsAll(helpComposer, [
    "BOARDING_CHANGE_REQUEST_ENTRY",
    "Biniş talebi girişi",
    "Bu sadece talep oluşturma akışıdır. Konum gerekiyorsa Konumumu al, Büyük haritada konum seç ya da Adresten konum bul seçeneklerinden birini kullan; rota otomatik uygulanmaz; aynı rota ise sürücü, rota dışı ise hizmet alan taraf karar verir; oda yalnızca görür.",
    "Önce talep tipini, tarihi, servis/vardiya bağlamını ve konum seçimini gir.",
    "Konum gerekiyorsa Konumumu al, Büyük haritada konum seç ya da Adresten konum bul; konum çözümleme bağlı değilse açıklama ekle.",
  ], "help composer request entry guidance");

  const goldenPack = read("backend/src/ai/chat/goldenQuestionPack.js");
  assertContainsAll(goldenPack, [
    "Bugün binmeyeceğim talebi nasıl oluşturulur?",
    "Konumumu al nasıl kullanılır?",
    "Çocuğum başka duraktan binecek.",
    "Çocuğum şu konumdan alınsın.",
    "Talebim kimde bekliyor?",
    "BOARDING_CHANGE_REQUEST_ENTRY",
  ], "golden question pack request entry coverage");

  const sharedPathUi = read("web/src/panels/shared/boardingChangeUi.js");
  assertContainsAll(sharedPathUi, [
    "TEMPORARY_BOARDING_NOTE",
    "Sürücüde bekliyor",
    "Firma/Okul/Kurum tarafında bekliyor",
    "Aynı rota üzerindeki talep sürücü tarafında karar bekliyor.",
  ], "shared boarding change ui states");

  const runtimeDataPaths = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
  ];
  for (const rel of runtimeDataPaths) {
    must(exists(rel), `runtime-data file present: ${rel}`);
  }

  assertNotContainsAny(requestUi, [
    "runtime-data",
    "boarding change application",
    "payment started",
    "fatura kesildi",
    "tahsil edildi",
    "ceza uygulandı",
    "route apply",
    "driver route refresh execute",
    "sms gönderildi",
    "push gönderildi",
  ], "request entry card remains readonly");
  assertNotContainsAny(previewCard, [
    "runtime-data",
    "boarding change application",
    "payment started",
    "fatura kesildi",
    "tahsil edildi",
    "ceza uygulandı",
    "route apply",
    "driver route refresh execute",
    "sms gönderildi",
    "push gönderildi",
  ], "preview card remains readonly");
  assertNotContainsAny(createBlock, [
    "runtime-data",
    "applyAcceptedBoardingChange(",
    "boardingChangeRouteRefresh",
    "driverRouteRefresh",
    "payment",
    "settlement execute",
    "sms",
    "push",
    "penalty",
  ], "requests create block remains readonly");
  assertNotContainsAny(personelLive, [
    "runtime-data",
    "applyAcceptedBoardingChange(",
    "driverRouteRefresh",
    "payment",
    "settlement execute",
    "sms",
    "push",
    "penalty",
  ], "personel live request entry remains readonly");
  assertNotContainsAny(personelMyRide, [
    "runtime-data",
    "applyAcceptedBoardingChange(",
    "driverRouteRefresh",
    "payment",
    "settlement execute",
    "sms",
    "push",
    "penalty",
  ], "personel my ride request entry remains readonly");
  assertNotContainsAny(parentLive, [
    "runtime-data",
    "applyAcceptedBoardingChange(",
    "driverRouteRefresh",
    "payment",
    "settlement execute",
    "sms",
    "push",
    "penalty",
  ], "parent live request entry remains readonly");

  console.log("=== BOARDING-CHANGE-REQUEST-ENTRY-01 CHECK PASS ===");
}

main();
