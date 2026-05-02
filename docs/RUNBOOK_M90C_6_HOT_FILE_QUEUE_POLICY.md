# RUNBOOK — M90C.6 HOT-FILE QUEUE POLICY

Amaç: large/hot file listesini resmi queue politikasına bağlamak ve her dosya için ne yapılacağını tek anlamlı hale getirmek.

## Komut sırası
1. `node backend/scripts/repo_audit.js`
2. `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`

## Beklenen sonuç
- `largeFiles` ve `warningHotFiles` sayısı güncel repo-audit snapshot'ı ile policy içinde birebir eşleşir.
- Güncel snapshot'ta `backend/scripts/bench_gps_publish_only.js` de justified exception kuyruğunda yer alır.
- Güncel snapshot'ta `web/src/panels/room/ShiftsPanel.jsx` safe candidate review kuyruğunda yer alır.
- Güncel snapshot'ta `web/src/panels/room/VehiclesPanel.jsx` safe candidate review kuyruğunda yer alır.
- Güncel snapshot'ta `mobile/src/screens/driverPremiumUi.js` safe candidate review kuyruğundadır.
- Policy sınıfları `tools/repo_contract_state.json` içinde bulunur.
- Policy seti ile `repo_audit` seti birebir eşleşir.
- Justified exception dosyaları acceptance-safe lokal düzeltme dışında zorlanmaz.
- Safe candidate review kuyruğu ileride kontrollü cleanup için resmi aday listesidir.

## Not
Bu adım yeni ürün davranışı açmaz; yalnızca bakım / temizlik kuyruğunu acceptance önceliğine göre resmileştirir.
