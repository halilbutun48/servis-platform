#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNotAny(text, needles, label) {
  const haystack = normalize(text);
  if (needles.every((needle) => !haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const idx = haystack.indexOf(normalize(needle), last + 1);
    if (idx === -1) fail(`${label}: missing ${needle}`);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log('=== BUG-ROUTE-IMPACT-PREVIEW-BUTTON-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const docs = read('docs/BUG_ROUTE_IMPACT_PREVIEW_BUTTON_01.md');
  const boardingChangeUi = read('web/src/panels/shared/boardingChangeUi.js');
  const labelsUtil = read('web/src/utils/labels.js');
  const copilotFacts = read('web/src/utils/copilotFacts.js');
  const previewCard = read('web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx');
  const driverRoute = read('web/src/panels/driver/RoutePanel.jsx');
  const companyOps = read('web/src/panels/company/OperationsPanel.jsx');
  const schoolOps = read('web/src/panels/school/OperationsPanel.jsx');
  const operationHealthPanel = read('web/src/panels/room/OperationHealthPanel.jsx');
  const roomOps = read('web/src/panels/room/roomOperationsBoard.jsx');
  const requestsRoute = read('backend/src/routes/requests.js');

  must(pkg, '"check:bugrouteimpactpreviewbutton01": "node backend/scripts/bug_route_impact_preview_button_01_check.js"', 'package.json exposes check:bugrouteimpactpreviewbutton01');
  must(guide, 'BUG-ROUTE-IMPACT-PREVIEW-BUTTON-01', 'script guide mentions bug route impact preview button milestone');
  must(guide, 'check:bugrouteimpactpreviewbutton01', 'script guide exposes check:bugrouteimpactpreviewbutton01');
  ordered(runner, ['check:boardingops01a', 'check:bugrouteimpactpreviewbutton01', 'check:boardingops01b'], 'product extensions runner keeps bug check near boarding ops preview');
  ordered(verifyChain, ['check:boardingops01a', 'check:bugrouteimpactpreviewbutton01', 'check:boardingops01b'], 'verify chain keeps bug check near boarding ops preview');

  must(docs, 'Readonly önizleme', 'bug doc keeps readonly preview wording');
  must(docs, 'Rota uygulanmaz', 'bug doc keeps route boundary');
  must(docs, 'Sürücü rotası yenilenmez', 'bug doc keeps driver refresh boundary');
  must(docs, 'Bildirim gönderilmez', 'bug doc keeps notification boundary');
  must(docs, 'Sadece etki analizi gösterilir', 'bug doc keeps analysis boundary');
  must(boardingChangeUi, 'Aynı rota üzerindeki talep sürücü tarafında karar bekliyor.', 'boarding change ui exposes driver waiting note');
  must(boardingChangeUi, 'Rota değişikliği içerdiği için hizmet alan taraf karar veriyor.', 'boarding change ui exposes service-recipient waiting note');
  must(boardingChangeUi, 'Değişiklik günlük atamaya işlendi.', 'boarding change ui exposes applied decision note');
  mustNot(boardingChangeUi, 'Oda operasyonel görünüm sağlar.', 'boarding change ui no longer surfaces room decision owner note');
  mustNot(boardingChangeUi, 'if (ownerRole === "ROOM") return "Oda";', 'boarding change ui no longer labels room as decision owner');

  must(labelsUtil, 'resolvePersonDisplayLabel', 'labels helper exposes null-safe person label helper');
  must(copilotFacts, 'resolvePersonDisplayLabel', 'copilot facts uses null-safe person helper');
  mustNot(copilotFacts, 'routeImpact?.personLabel', 'copilot facts avoids raw preview person label');
  must(previewCard, 'loading = false', 'preview card exposes loading state');
  must(previewCard, 'emptyText', 'preview card exposes empty state text');
  must(previewCard, 'error = ""', 'preview card exposes error state');
  must(previewCard, 'selectionLabel', 'preview card exposes selection label');
  must(previewCard, 'selectionNote', 'preview card exposes selection note');
  must(previewCard, 'onClearSelection', 'preview card exposes clear action');
  must(previewCard, 'Seçimi temizle', 'preview card shows clear action');
  must(previewCard, 'Önizleme açılıyor…', 'preview card shows loading feedback');
  must(previewCard, 'Kişi bilgisi eksik', 'preview card keeps person fallback text');
  must(previewCard, 'Hizmet alan taraf', 'preview card surfaces generic waiting-side label');
  must(previewCard, 'Bekleyen taraf', 'preview card surfaces decision owner chip');
  must(previewCard, 'Readonly önizleme — rota uygulanmaz, sürücü rotası yenilenmez, bildirim gönderilmez; sadece etki analizi gösterilir.', 'preview card keeps safe readonly language');
  must(previewCard, 'Mini harita önizlemesi', 'preview card shows mini route map preview');
  must(previewCard, 'Harita önizlemesi için durak koordinatı eksik.', 'preview card keeps coordinate fallback');
  must(previewCard, 'Bu değişiklik için rota etkisi metinsel olarak önizleniyor.', 'preview card keeps textual route fallback');
  must(previewCard, 'Eski durak', 'preview card shows old stop context');
  must(previewCard, 'Yeni/alternatif durak', 'preview card shows new stop context');
  must(previewCard, 'Bir satır seçince rota/durak etkisi burada görünür.', 'preview card compact no-selection hint');
  mustNotAny(previewCard, ['selectedPreview.personLabel', 'selectedPreviewRequest.personLabel', 'request.personLabel', 'row.personLabel'], 'preview card avoids raw personLabel access');
  mustNot(previewCard, 'Bir satırdaki "Rota etkisini önizle" butonuna basınca burada readonly önizleme açılır.', 'preview card no longer repeats old placeholder sentence');
  mustNotAny(previewCard, ['route.apply', 'sendSms', 'sendNotification', 'payment execute', 'settlement execute', 'penalty', 'accept/reject', 'prisma migration'], 'preview card stays readonly');

  must(driverRoute, 'pendingBoardingChangeRequests', 'driver route loads boarding-change requests');
  must(driverRoute, 'driverBoardingRequests', 'driver route filters driver-owned requests');
  must(driverRoute, 'String(item?.decisionOwnerRole || "").trim().toUpperCase() === "DRIVER"', 'driver route keeps same-route decision owner filter');
  mustNot(driverRoute, 'personel: { select: { id: true, fullName: true, name: true, label: true } }', 'driver route uses schema-safe personel select');
  mustNot(driverRoute, 'status: { in: ["OPEN", "REQUESTED", "PENDING", "COUNTERED"] }', 'driver route uses OPEN-only pending request filter');
  must(driverRoute, 'Aynı rota üzerindeki talep sürücü tarafında karar bekliyor.', 'driver route shows driver waiting note');
  must(driverRoute, 'onClick={() => decideBoardingRequest(requestId, "ACCEPTED")}', 'driver route shows accept action');
  must(driverRoute, 'onClick={() => decideBoardingRequest(requestId, "CANCELLED")}', 'driver route shows reject action');
  must(driverRoute, 'Kabul et', 'driver route shows accept label');
  must(driverRoute, 'Reddet', 'driver route shows reject label');
  mustNotAny(driverRoute, ['selectedPreview.personLabel', 'selectedPreviewRequest.personLabel', 'row.personLabel', 'request.personLabel'], 'driver route avoids raw personLabel access');
  mustNotAny(driverRoute, ['route.apply', 'sendSms', 'sendNotification', 'payment execute', 'settlement execute', 'penalty', 'prisma migration'], 'driver route stays readonly outside decision flow');

  must(companyOps, 'previewCardRef', 'company preview anchors the preview card');
  must(companyOps, 'previewLoading', 'company preview keeps loading state');
  must(companyOps, 'previewSelectionNonce', 'company preview retriggers visible feedback');
  must(companyOps, 'scrollIntoView', 'company preview scrolls into view');
  must(companyOps, 'focus?.({ preventScroll: true })', 'company preview focuses preview area');
  must(companyOps, 'handlePreviewSelectionClear', 'company preview provides clear action');
  must(companyOps, 'Önizleniyor...', 'company preview shows loading feedback');
  must(companyOps, 'resolvePersonDisplayLabel', 'company preview uses null-safe person helper');
  must(companyOps, 'Kişi bilgisi eksik', 'company preview keeps person fallback text');
  must(companyOps, 'Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok.', 'company preview keeps empty state');
  must(companyOps, 'Seçili satırın readonly önizlemesi burada gösterilir.', 'company preview keeps distinct selection fallback wording');
  must(companyOps, 'Karar Sahibi', 'company preview shows decision owner in copilot fields');
  must(companyOps, 'decisionOwnerNote', 'company preview keeps decision owner note in request model');
  must(companyOps, 'String(row.decisionOwnerRole || "").toUpperCase() === "COMPANY" && String(row.status || "").toUpperCase() === "OPEN"', 'company preview shows company decision buttons');
  must(companyOps, 'String(row.decisionOwnerRole || "").toUpperCase() === "DRIVER" && String(row.status || "").toUpperCase() === "OPEN"', 'company preview shows driver-owned waiting note');
  must(companyOps, 'Kabul et', 'company preview shows accept action');
  must(companyOps, 'Reddet', 'company preview shows reject action');
  must(companyOps, 'Sürücü tarafında karar bekliyor.', 'company preview shows driver waiting note');
  must(companyOps, 'Açık ve kabul edilen isteklerden okunur', 'company preview KPI uses request-based different-stop count');
  must(companyOps, 'shiftRecord', 'company preview keeps shift record for map fallback');
  must(companyOps, 'nearestStop', 'company preview keeps nearestStop for map fallback');
  must(companyOps, 'request={selectedPreviewRequest}', 'company preview passes request into preview card');
  must(companyOps, 'if (!openRequestRows.length) return acceptedRequestRows[0] || null;', 'company preview only falls back when no open requests');
  mustNot(companyOps, 'return requestSelectionRows[0] || null;', 'company preview no longer defaults to first open row');
  mustNotAny(companyOps, ['selectedPreview.personLabel', 'selectedPreviewRequest.personLabel', 'row.personLabel', 'request.personLabel'], 'company preview avoids raw personLabel access');
  must(companyOps, 'companyKind === "ORGANIZATION"', 'organization keeps company panel path');
  must(companyOps, 'companyBaseFromKind', 'organization uses shared company panel helper');
  mustNotAny(companyOps, ['route.apply', 'sendSms', 'sendNotification', 'payment execute', 'settlement execute', 'penalty', 'accept/reject', 'prisma migration'], 'company preview stays readonly');

  must(schoolOps, 'previewCardRef', 'school preview anchors the preview card');
  must(schoolOps, 'previewLoading', 'school preview keeps loading state');
  must(schoolOps, 'previewSelectionNonce', 'school preview retriggers visible feedback');
  must(schoolOps, 'scrollIntoView', 'school preview scrolls into view');
  must(schoolOps, 'focus?.({ preventScroll: true })', 'school preview focuses preview area');
  must(schoolOps, 'handlePreviewSelectionClear', 'school preview provides clear action');
  must(schoolOps, 'Önizleniyor...', 'school preview shows loading feedback');
  must(schoolOps, 'resolvePersonDisplayLabel', 'school preview uses null-safe person helper');
  must(schoolOps, 'Kişi bilgisi eksik', 'school preview keeps person fallback text');
  must(schoolOps, 'Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok.', 'school preview keeps empty state');
  must(schoolOps, 'Seçili satırın readonly önizlemesi burada gösterilir.', 'school preview keeps distinct selection fallback wording');
  must(schoolOps, 'Karar Sahibi', 'school preview shows decision owner in copilot fields');
  must(schoolOps, 'decisionOwnerNote', 'school preview keeps decision owner note in request model');
  must(schoolOps, 'String(row.decisionOwnerRole || "").toUpperCase() === "COMPANY" && String(row.status || "").toUpperCase() === "OPEN"', 'school preview shows company decision buttons');
  must(schoolOps, 'String(row.decisionOwnerRole || "").toUpperCase() === "DRIVER" && String(row.status || "").toUpperCase() === "OPEN"', 'school preview shows driver-owned waiting note');
  must(schoolOps, 'Kabul et', 'school preview shows accept action');
  must(schoolOps, 'Reddet', 'school preview shows reject action');
  must(schoolOps, 'Sürücü tarafında karar bekliyor.', 'school preview shows driver waiting note');
  must(schoolOps, 'Açık ve kabul edilen isteklerden okunur', 'school preview KPI uses request-based different-stop count');
  must(schoolOps, 'shiftRecord', 'school preview keeps shift record for map fallback');
  must(schoolOps, 'nearestStop', 'school preview keeps nearestStop for map fallback');
  must(schoolOps, 'request={selectedPreviewRequest}', 'school preview passes request into preview card');
  must(schoolOps, 'if (!riskRequestRows.length) return acceptedRequestRows[0] || null;', 'school preview only falls back when no open requests');
  mustNot(schoolOps, 'return requestSelectionRows[0] || null;', 'school preview no longer defaults to first open row');
  mustNotAny(schoolOps, ['selectedPreview.personLabel', 'selectedPreviewRequest.personLabel', 'row.personLabel', 'request.personLabel'], 'school preview avoids raw personLabel access');
  mustNotAny(schoolOps, ['route.apply', 'sendSms', 'sendNotification', 'payment execute', 'settlement execute', 'penalty', 'accept/reject', 'prisma migration'], 'school preview stays readonly');

  must(operationHealthPanel, 'api("/api/requests"', 'room operation health loads room-scoped requests');
  mustNot(operationHealthPanel, 'onlyOpen=1&onlyActive=1', 'room operation health no longer uses partial request fetch');
  mustNot(operationHealthPanel, 'onlyActive=1', 'room operation health no longer uses partial request fetch');
  must(operationHealthPanel, 'handleApplyAcceptedRequest', 'room operation health keeps accepted-change apply flow');
  mustNot(operationHealthPanel, 'handleDecideRequest', 'room operation health does not expose accept/reject actions');
  mustNot(operationHealthPanel, 'decideBoardingRequest', 'room operation health does not expose accept/reject actions');
  mustNot(read('backend/src/services/boardingChangeRouteRefresh.js'), 'personel: { select: { id: true, fullName: true, name: true, label: true } }', 'boarding change route refresh uses schema-safe personel select');

  must(roomOps, 'previewCardRef', 'room preview anchors the preview card');
  must(roomOps, 'previewLoading', 'room preview keeps loading state');
  must(roomOps, 'previewSelectionNonce', 'room preview retriggers visible feedback');
  must(roomOps, 'scrollIntoView', 'room preview scrolls into view');
  must(roomOps, 'focus?.({ preventScroll: true })', 'room preview focuses preview area');
  must(roomOps, 'handlePreviewSelectionClear', 'room preview provides clear action');
  must(roomOps, 'Önizleniyor...', 'room preview shows loading feedback');
  must(roomOps, 'resolvePersonDisplayLabel', 'room preview uses null-safe person helper');
  must(roomOps, 'Kişi bilgisi eksik', 'room preview keeps person fallback text');
  must(roomOps, 'Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok.', 'room preview keeps empty state');
  must(roomOps, 'Seçili satırın readonly önizlemesi burada gösterilir.', 'room preview keeps distinct selection fallback wording');
  must(roomOps, 'shiftRecord', 'room preview keeps shift record for map fallback');
  must(roomOps, 'nearestStop', 'room preview keeps nearestStop for map fallback');
  must(roomOps, 'differentStopRequests', 'room preview counts different-stop requests from full room request set');
  must(roomOps, 'Farklı duraktan binecek', 'room preview keeps different-stop visibility row');
  must(roomOps, 'Açık ve kabul edilen isteklerden okunur.', 'room preview keeps request visibility note');
  must(roomOps, 'decisionOwnerNote', 'room preview keeps decision owner note in request model');
  mustNot(roomOps, 'handleDecideRequest', 'room preview does not expose accept/reject actions');
  mustNot(roomOps, 'decideBoardingRequest', 'room preview does not expose accept/reject actions');
  mustNot(roomOps, 'decidingRequestId', 'room preview does not carry decision loading state');
  must(roomOps, 'request={selectedPreviewRequest}', 'room preview passes request into preview card');
  must(roomOps, 'if (!openRequestItems.length) return acceptedRequestCards[0] || null;', 'room preview only falls back when no open requests');
  mustNot(roomOps, 'return requestSelectionCards[0] || null;', 'room preview no longer defaults to first open row');
  mustNotAny(roomOps, ['selectedPreview.personLabel', 'selectedPreviewRequest.personLabel', 'row.personLabel', 'request.personLabel'], 'room preview avoids raw personLabel access');
  mustNotAny(roomOps, ['route.apply', 'sendSms', 'sendNotification', 'payment execute', 'settlement execute', 'penalty', 'prisma migration'], 'room preview stays readonly outside room decision flow');
  mustNot(requestsRoute, 'select: { id: true, name: true, label: true, stopName: true, title: true, code: true, stationName: true, address: true', 'requests route uses schema-safe stop select');
  mustNot(requestsRoute, 'driver: { select: { id: true, fullName: true, name: true } }', 'requests route uses schema-safe driver select');

  console.log('=== BUG-ROUTE-IMPACT-PREVIEW-BUTTON-01 CHECK PASS ===');
}

main();
