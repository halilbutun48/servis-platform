<!-- REPO_CONTRACT_MARKER milestone=M63 slug=trust-quality-service-evaluation -->

# MILESTONE — M63 GUVEN + KALITE + HIZMET DEGERLENDIRME

## Hedef
Hizmet alan kurum degerlendirmesini, saglayici kalite sinyallerini ve karar destek gorunurlugunu resmi urun omurgasina eklemek.

## Uretilecek iskelet
- backend manifest + route: `trustQualityManifest.js`, `trustQuality.js`
- super admin paneli: `TrustQualityPanel.jsx`
- runtime check: `backend/scripts/m63_trust_quality_service_evaluation_check.js`
- repo-contract: `tools/check_m63_trust_quality_service_evaluation_repo_contract.ps1`
- pack: `tools/pack_m63_trust_quality_service_evaluation.ps1`

## Is kurallari
- degerlendirme sadece tamamlanan hizmet sonrasi acilacak mantikla modellenir
- saglayici kalite sinyali kurum secimini destekleyen bir gorunurluk katmanidir
- no-show / iptal / uyum ve ETA kalite alanlari kalite ozetine beslenir
- M63 green olmadan M64 acilmaz
