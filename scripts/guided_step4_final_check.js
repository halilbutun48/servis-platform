const fs = require('fs');
const p = 'D:/servis-platform/web/src/panels/company/GuidedPlanModal.jsx'.replace(/\//g, require('path').sep);
const t = fs.readFileSync(p, 'utf8');
function ok(msg){ console.log('OK ' + msg); }
function fail(msg){ console.error('FAIL ' + msg); process.exitCode = 1; }
console.log('=== GUIDED STEP4 FINAL CHECK ===');
if (t.includes('const offerOsrmGate = useMemo(')) ok('offerOsrmGate memo present'); else fail('offerOsrmGate memo missing');
if (!t.includes('Sadece hub’lı')) ok('hub-only filter removed'); else fail('old hub-only filter still present');
if (t.includes('Company planı koordinat olarak hazır')) ok('company wording downgraded'); else fail('company wording not updated');
if (t.includes('Hub konumu eksik • teklif engeli değil')) ok('hub warning non-blocking'); else fail('hub non-blocking warning missing');
if (t.includes('Toplam taslak: <b>{offerOsrmGate.total}</b>')) ok('osrm prerequisite summary present'); else fail('osrm prerequisite summary missing');
if (t.includes('(!organization && offerOsrmGate.blocking)')) ok('send gate uses offerOsrmGate'); else fail('send gate still uses old companyGeoGate');
if (t.includes('OSRM rota doğrulaması alınamadı.')) ok('osrm wording strengthened'); else fail('osrm wording not updated');
if (!process.exitCode) console.log('=== GUIDED STEP4 FINAL CHECK PASS ===');
