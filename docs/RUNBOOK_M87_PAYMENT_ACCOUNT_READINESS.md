<!-- REPO_CONTRACT_MARKER milestone=M87 slug=payment-account-readiness -->

# RUNBOOK — M87 PAYMENT ACCOUNT READINESS

Bu runbook, `M82.9 -> M86` ticari/odeme omurgasindan sonra acilan **M87 odeme hesabi hazirligi** kapsam sinirini tanimlar.

## Kapsam
- Super Admin tarafinda şirket ve oda payment account metadata hazirligi
- readiness ozeti
- aday listesi
- metadata kaydetme / guncelleme

## Kapsam disi
- gercek charge/payout provider entegrasyonu
- webhook mutabakati
- banka/KYC dogrulama akisi

## Kontroller
- `npm run m87check`
- `tools/pack_m87_payment_account_readiness.ps1`

## Kabul
- Super Admin ticari akış ekranında M87 ödeme hesabı hazırlığı bölümü görünür
- `/api/commercial-core/payment-backbone/accounts/status` döner
- `/api/commercial-core/payment-backbone/accounts/candidates` döner
- `/api/commercial-core/payment-backbone/accounts/upsert` metadata kaydeder
