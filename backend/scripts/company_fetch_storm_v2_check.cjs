const fs = require('fs');
const path = require('path');
const root = process.argv[2] || process.cwd();
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(cond, msg){ if(!cond){ console.error('FAIL', msg); process.exit(1);} console.log('OK', msg); }
console.log('=== COMPANY FETCH STORM V2 CHECK ===');
const api = read('web/src/api.js');
ok(api.includes('signal } = {}') || api.includes('signal} = {}'), 'api supports signal option');
const shifts = read('web/src/panels/company/ShiftsPanel.jsx');
ok(shifts.includes('setTimeout(() => {') && shifts.includes('}, 220);'), 'company shifts initial load deferred');
const map = read('web/src/panels/company/MapPanel.jsx');
ok(map.includes('useRef, useState') || map.includes('useRef,useState'), 'map panel imports useRef');
ok(map.includes('cachedGet(`/api/shifts/${selectedShift.id}/route-preview`'), 'map panel caches route preview');
ok(map.includes('reloadVehiclesTimer') && map.includes('reloadShiftsTimer'), 'map panel debounces auto reload');
const wf = read('web/src/panels/company/WorkflowPanel.jsx');
ok(wf.includes('cachedGet("/api/rooms?take=500"'), 'workflow uses canonical rooms cache');
ok(wf.includes('const timer = setTimeout(() => {') && wf.includes('loadStats();'), 'workflow initial load deferred');
const agr = read('web/src/panels/company/AgreementsPanel.jsx');
ok(agr.includes('cachedGet(`/api/agreements?${qs.toString()}`'), 'agreements list cached');
ok(agr.includes('loadRooms();') && agr.includes('}, 220);'), 'agreements initial load deferred');
const geo = read('web/src/panels/company/GeoReviewPanel.jsx');
ok(geo.includes('ttlMs: 8000'), 'geo review uses longer ttl');
const reports = read('web/src/panels/shared/ReportsPanel.jsx');
ok(reports.includes('[tab, from, to, token]'), 'reports reload depends on tab/date/token with debounce');
console.log('=== COMPANY FETCH STORM V2 CHECK PASS ===');
