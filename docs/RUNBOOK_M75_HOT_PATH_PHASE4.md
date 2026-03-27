# RUNBOOK_M75_HOT_PATH_PHASE4

Amaç: M74 sonrası kalan sıcak hatları bir kademe daha sakinleştirmek.

Bu paket ne yapar:
- Company veri katmanındaki ilk yük take değerlerini düşürür.
- Provider score hattını ShiftsPanel ilk açılış sıcak yolundan çıkarır.
- Route preview çağrılarını ortak helper altında toplar.
- Offer / personel / canlı shifts için ayrı read limiter kovaları ekler.
- Storm profile'ı M75 davranışına göre günceller.

Beklenen etki:
- rooms / vehicles / offers / personels / live shifts ilk yükü küçülür.
- provider-scores artık Company Vardiyalar ilk açılış sıcak yolunun parçası olmaz.
- route-preview çağrıları Map ve modal arasında daha tutarlı cache ile yürür.
- limiter tarafında offer / people / live-shift uçları birbirini daha az etkiler.

Uygulama sonrası kontrol:
1. tools/pack_m75_hot_path_phase4.ps1
2. tools/pack_m67_kurumsal_olcek_hazirlik.ps1
3. Özellikle 429 toplamı, sıcak endpoint listesi ve duplicate route-preview sinyalini karşılaştır.
