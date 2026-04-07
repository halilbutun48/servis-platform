<!-- REPO_CONTRACT_MARKER milestone=M88 slug=settlement-operations-console -->

# RUNBOOK — M88 SETTLEMENT OPERATIONS CONSOLE

Bu runbook, `M82.9 -> M87` ticari/odeme omurgasindan sonra acilan **M88 settlement operasyon masasi** kapsam sinirini tanimlar.

## Kapsam
- Super Admin, READY / PLANNED / EXECUTED settlement entry satirlarini tek yuzeyde gorebilir.
- Finans hazirlik bloklari (sirket/oda payment account readiness) satir bazinda gorunur.
- Manuel operasyon aksiyonlari acilir:
  - READY -> PLANNED
  - READY/PLANNED -> EXECUTED
  - READY/PLANNED -> CANCELLED
  - PLANNED/CANCELLED -> READY
- Bu faz gercek provider webhook/charge/payout mutabakatini tamamlamaz.

## Repo contract
- backend check: `cd backend && npm run m88check`
- pack: `tools\pack_m88_settlement_operations_console.ps1`
- yuzey: `/superadmin/commercial-core`

## Beklenen gorunurluk
- Super Admin ticari akis ekraninda M88 settlement operasyon masasi bolumu gorunur
- settlement ozet kartlari READY/PLANNED/EXECUTED ve bloklu satir sayilarini verir
- queue satirlarinda finans hazirlik, provider ref, vade ve manuel aksiyonlar gorunur
