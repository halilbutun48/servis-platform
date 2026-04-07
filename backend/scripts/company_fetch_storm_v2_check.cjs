const fs = require('fs');
const path = require('path');
const root = process.argv[2] || process.cwd();


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(cond, msg){ if(!cond){ console.error('FAIL', msg); process.exit(1);} console.log('OK', msg); }
console.log('=== COMPANY FETCH STORM V2 CHECK ===');
const api = read('web/src/api.js');
ok(includesText(api, 'signal } = {}') || includesText(api, 'signal} = {}'), 'api supports signal option');
const shifts = read('web/src/panels/company/ShiftsPanel.jsx');
ok(includesText(shifts, 'setTimeout(() => {') && includesText(shifts, '}, 220);'), 'company shifts initial load deferred');
const map = read('web/src/panels/company/MapPanel.jsx');
ok(includesText(map, 'useRef, useState') || includesText(map, 'useRef,useState'), 'map panel imports useRef');
ok(includesText(map, 'cachedGet(`/api/shifts/${selectedShift.id}/route-preview`'), 'map panel caches route preview');
ok(includesText(map, 'reloadVehiclesTimer') && includesText(map, 'reloadShiftsTimer'), 'map panel debounces auto reload');
const wf = read('web/src/panels/company/WorkflowPanel.jsx');
ok(includesText(wf, 'cachedGet("/api/rooms?take=500"'), 'workflow uses canonical rooms cache');
ok(includesText(wf, 'const timer = setTimeout(() => {') && includesText(wf, 'loadStats();'), 'workflow initial load deferred');
const agr = read('web/src/panels/company/AgreementsPanel.jsx');
ok(includesText(agr, 'cachedGet(`/api/agreements?${qs.toString()}`'), 'agreements list cached');
ok(includesText(agr, 'loadRooms();') && includesText(agr, '}, 220);'), 'agreements initial load deferred');
const geo = read('web/src/panels/company/GeoReviewPanel.jsx');
ok(includesText(geo, 'ttlMs: 8000'), 'geo review uses longer ttl');
const reports = read('web/src/panels/shared/ReportsPanel.jsx');
ok(includesText(reports, '[tab, from, to, token]'), 'reports reload depends on tab/date/token with debounce');
console.log('=== COMPANY FETCH STORM V2 CHECK PASS ===');
