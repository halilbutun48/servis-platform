# M67 — Kurumsal Ölçek Hazırlık Paketi

## Kapsam

Bu milestone, company tarafındaki fetch mimarisini ölçmek ve kurumsal ölçek için ilk sertleştirme yol haritasını üretmek içindir.

Bu adımda düzeltmeden önce ölçüm vardır:
- `company_fetch_storm_check`
- `scale_readiness_check`
- kurumsal sertleştirme planı
- 100 / 300 / 1000 kullanıcı yük testi hazırlığı

## Hedeflenen Sorunlar

- hızlı menü geçişinde ikinci dalga refetch
- aynı veri ailesinin farklı paneller tarafından tekrar tekrar çağrılması
- büyük `take` değerleri ile tam liste çekme
- search-first yerine toplu liste yaklaşımı
- visible-only loading eksikliği
- `AbortController` eksikliği
- provider-score tarafında backend batch eksikliği
- websocket invalidate sonrası hedefli yenileme yerine kaba yüklenme riski

## Başarı Ölçütü

Bu milestone green olduğunda şunlar görünür hale gelir:
- en çok tekrar eden endpoint aileleri
- 429 üretip üretmediği
- tam liste okuyan company ekranları
- route-preview ve benzeri seçime bağlı akışların guard durumu
- sonraki overlay için net sertleştirme sırası

## Bu Adımda Özellikle Beklenenler

### Statik readiness sinyali
- company ekranlarının ilk frame yük profili raporlanmalı
- pagination ve search-first eksikleri raporlanmalı
- ağır yan veriler ilk frame’de mi, ölçülmeli

### Runtime fetch storm sinyali
- company login ile hızlı menü geçişi senaryosu çalışmalı
- hangi endpoint kaç kez çağrıldı görülmeli
- 429 ve 5xx varsa açıkça yazılmalı

## Sonraki Adım

M67 sonrası gelecek düzeltme overlay’inde öncelik sırası:
1. aktif panel dışı fetch kapatma
2. menü geçiş debounce + AbortController
3. visible-only loading
4. pagination / search-first / selection-first
5. provider-score batch endpoint
6. websocket hedefli refresh
