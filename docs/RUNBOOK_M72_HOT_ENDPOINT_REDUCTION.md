# RUNBOOK_M72_HOT_ENDPOINT_REDUCTION

Amaç:
- sıcak company endpoint yükünü bir tur daha aşağı çekmek
- route-preview ve rapor summary hattını kısa response cache ile sakinleştirmek
- ilk açılışta tam liste yerine daha küçük başlangıç penceresi kullanmak

Kapsam:
- companyDataHub default take küçültme
- Workflow / Agreements / Shifts / Map / ServiceEvaluation ilk yük küçültme
- reports summary endpoint cache
- shift route-preview backend cache
- company overview özet listelerini 12 kayda indirme
- M67 storm profilini yeni ilk-yük boyutlarına göre güncelleme

Beklenen etki:
- rooms / vehicles / offers / trust-quality ilk açılış yükü düşer
- route-preview tekrar çağrıları aynı vardiya için daha az baskı üretir
- reports/shifts/summary tekrar isteklerinde backend tekrar iş yapmaz
- M67 sert profilde 429 baskısı biraz daha aşağı iner

Doğrulama:
1. tools\pack_m72_hot_endpoint_reduction.ps1
2. tools\pack_m67_kurumsal_olcek_hazirlik.ps1
