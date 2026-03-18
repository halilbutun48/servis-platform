# RUNBOOK — M62 TICARI OMURGA GUCLENDIRME

## Amaç
Urunun pazaryeri kimligini resmi olarak guclendirmek ve ticari akis omurgasini operasyon katmanina baglamak.

## Kapsam
- talep / ihtiyac karti gorunurlugu
- teklif yasam dongusu iskeleti
- karsi teklif ve pazarlik gecmisi ozetleri
- uzlasma ozeti ve sozlesmeye gecis kapisi
- backend + web skeleton ile ticari omurga manifesti

## Ciktilar
- `backend/src/ops/commercialCoreManifest.js`
- `backend/src/routes/commercialCore.js`
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `tools/pack_m62_commercial_core_strengthening.ps1`
- `tools/check_m62_commercial_core_strengthening_repo_contract.ps1`
- `backend/scripts/m62_commercial_core_strengthening_check.js`

## Green kriteri
M62 green sayilabilmesi icin:
1. README / PROJECT_SPEC / PRIMER / STARTPACK / CHECKLIST / NEXT_BACKLOG M61 green + M62 aktif durumu ile hizali olmali
2. milestone registry M62 aktif durumunu tek kayitta gostermeli
3. backend route `/api/commercial-core` altinda manifest ve lifecycle-template dondurmeli
4. super admin panelinde M62 ticari omurga karti gorunmeli
5. pack ve repo-contract birlikte PASS vermeli

M62 green olmadan M63'e gecilmez.
