# M78.1 — OPERASYON DOĞRULAMA YÜZEYİ

## Hedef
`M78` iskeletini ürün içine minimum bir ekran olarak taşımak.

## Çıktılar
1. `backend/src/ops/operationVerificationManifest.js`
2. `backend/src/routes/operationVerification.js`
3. `web/src/panels/superadmin/OperationVerificationPanel.jsx`
4. `GET /api/operation-verification/*` read-only yüzeyi
5. `tools/pack_m78_1_operasyon_dogrulama_yuzeyi.ps1`
6. `tools/check_m78_1_operasyon_dogrulama_yuzeyi_repo_contract.ps1`
7. runbook + manifest kaydı

## Bilinçli sınırlar
- DB migration yok
- kalıcı kayıt yazımı yok
- ana `STABLE_TO` değişmez, `78` kalır
- ana master pack rotası değişmez

## Kabul ölçütü
- panel super admin altında açılır
- rol seçimi çalışır
- durum özeti ve kanıt tipleri görünür
- pack/check geçer
