<!-- REPO_CONTRACT_MARKER milestone=M63 slug=trust-quality-service-evaluation -->

# RUNBOOK — M63 GUVEN + KALITE + HIZMET DEGERLENDIRME

## Amaç
Urunun guven ve kalite katmanini resmi olarak acmak; hizmet alan kurum degerlendirmesi, saglayici kalite sinyali ve karar destek yuzeyini tek milestone altinda toplamak.

## Kapsam
- hizmet alan kurum degerlendirmesi iskeleti
- saglayici kalite ozet kartlari
- no-show / iptal / uyum / ETA kalite sinyalleri
- karar destek gorunurlugu ve kalite manifesti
- backend + web skeleton ile trust-quality katmaninin acilmasi

## Ciktilar
- `backend/src/ops/trustQualityManifest.js`
- `backend/src/routes/trustQuality.js`
- `web/src/panels/superadmin/TrustQualityPanel.jsx`
- `tools/pack_m63_trust_quality_service_evaluation.ps1`
- `tools/check_m63_trust_quality_service_evaluation_repo_contract.ps1`
- `backend/scripts/m63_trust_quality_service_evaluation_check.js`

## Green kriteri
M63 green sayilabilmesi icin:
1. README / PROJECT_SPEC / PRIMER / STARTPACK / CHECKLIST / NEXT_BACKLOG M62 green + M63 aktif durumu ile hizali olmali
2. milestone registry M63 aktif durumunu tek kayitta gostermeli
3. backend route `/api/trust-quality` altinda manifest ve kalite template endpointleri donmeli
4. super admin panelinde M63 guven + kalite karti gorunmeli
5. pack ve repo-contract birlikte PASS vermeli

M63 green olmadan M64'e gecilmez.
