# RUNBOOK M68 — Fetch Sertleştirme

## Amaç
Company tarafında hızlı menü geçişlerinde oluşan tekrar fetch dalgasını azaltmak.

## Bu pakette yapılanlar
- Ortak company veri katmanı eklendi: `web/src/utils/companyDataHub.js`
- Company panellerinde ortak query kimlikleri ve daha küçük ilk-frame `take` değerleri kullanıldı.
- `company/personels` endpoint'ine `q` ve `take` desteği eklendi.
- Trust-quality hattına kısa TTL response cache ve batch provider score endpoint'i eklendi.
- Provider score istemcisi tek tek oda çağrısı yerine önce batch endpoint'i kullanır.
- Harita route-preview çağrısında abort desteği eklendi.

## Beklenen etki
- Aynı veri ailesi farklı panelde aynı URL ile yeniden kullanılacağı için cache/dedupe daha etkili çalışır.
- İlk frame yükü küçülür.
- Geo review ve trust-quality ilk açılış maliyeti düşer.
- Provider score hattındaki istek sayısı azalır.

## Çalıştırma
1. Overlay'i uygula.
2. `tools/pack_m68_fetch_hardening.ps1` çalıştır.
3. Company tarafında hızlı menü geçişi testi yap.
4. Gerekirse M67 storm check ile önce/sonra farkını ölç.

## Bilinen sonraki adımlar
- WebSocket invalidate sonras? baz? paneller h?l? full reload yap?yor.
- `offers/company` backend sorgusunda daha ileri index/shape iyileştirmesi gerekebilir.
- `CheckinPanel`, `GuidedPlanModal`, `PlanBuilderPanel` için ayrı hafifletme turu yapılabilir.
