<!-- REPO_CONTRACT_MARKER milestone=M89 slug=settlement-reconciliation-desk -->

# RUNBOOK — M89 SETTLEMENT MUTABAKAT MASASI

Bu runbook, `M88` settlement operasyon masasindan sonra acilan **M89 settlement mutabakat masasi** kapsam sinirini tanimlar.

## Kapsam
- Super Admin, PLANNED / EXECUTED settlement satirlari icin mutabakat kuyrugunu gorebilir.
- Her satir icin bekliyor / eslesti / inceleme gerekli / uyusmazlik / kapandi durumu tutulur.
- Gerekirse eksik provider ref ve harici referans mutabakat kaydi icinden tamamlanabilir.
- Bu faz gercek webhook/otomatik provider mutabakatini tamamlamaz; manuel iz ve operasyon yuzeyi kurar.

## Repo contract
- backend check: `cd backend && npm run m89check`
- pack: `tools\pack_m89_settlement_reconciliation_desk.ps1`
- yuzey: `/superadmin/commercial-core`

## Beklenen gorunurluk
- Super Admin ticari akis ekraninda M89 settlement mutabakat masasi bolumu gorunur
- ozet kartlari bekliyor / eslesti / inceleme / uyusmazlik / kapandi dagilimini verir
- kuyruk satirlarinda provider ref, beklenen-gelen tutar ve mutabakat notu gorunur
