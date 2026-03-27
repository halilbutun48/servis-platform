# M67 — Kurumsal Ölçek Hazırlık Runbook

## Amaç

Bu adımın amacı doğrudan performans düzeltmesi yapmak değil, önce **şu anki fetch mimarisini görünür hale getirmek** ve kurumsal ölçek için sıcak noktaları tek pack ile ölçmektir.

Bu paket iki ayrı kontrol verir:

1. `scale_readiness_check`
   - repo üstünden statik tarama yapar
   - company ekranlarında tam liste okuma, büyük `take`, seçimsiz ağır veri, route-preview guard, provider-score erişim modeli gibi noktaları raporlar

2. `company_fetch_storm_check`
   - çalışan API üstünde company oturumu açar
   - hızlı menü geçişini taklit eden bir GET senaryosu koşturur
   - hangi endpoint kaç kez vurulduğunu ve 429/5xx durumunu raporlar

## Ne Arar?

### Frontend
- aktif panel dışında gereksiz fetch var mı
- ilk frame’de çok fazla yan veri geliyor mu
- menü turunda aynı aile tekrar tekrar çağrılıyor mu
- `AbortController` eksik paneller var mı
- `visible-only loading` ve `selection-first` zayıf mı
- route-preview seçili kayıt yokken çağrılıyor mu
- provider-score tarafı batch yerine N adet tekil çağrı mı yapıyor

### Backend
- `rooms / shifts / agreements / offers / personels / trust-quality / vehicles` hatlarında sayfalama ve arama yeterli mi
- tek kullanıcı hızlı menü turu varsayılan read limiter ile çakışıyor mu
- pahalı endpointler aynı dakika içinde tekrar tekrar yükleniyor mu

### Veri katmanı
- ana tablolar için temel index sinyali var mı
- `companyId / roomId / vehicleId / driverId / agreementId / vehicleId+at` gibi kritik indexler şemada var mı

## Beklenen Çıktı

Pack sonunda şunlar netleşmelidir:
- en sıcak endpointler hangileri
- hangi paneller aynı veri ailesini tekrar çağırıyor
- 429 var mı, yok mu
- hangi endpointlerde tam liste yükleme var
- bir sonraki overlay’de hangi sertleştirme sırası izlenecek

## Sonraki Sertleştirme Sırası

### 1. Frontend ilk dalga
- aktif panel dışında fetch kapat
- menü geçişine kısa debounce koy
- eski istekleri `AbortController` ile iptal et
- kısa TTL cache + in-flight dedupe uygula
- `visible-only loading` aç
- seçili kayıt yoksa route-preview çağrısını tamamen kapat

### 2. Frontend ikinci dalga
- `rooms`, `shifts`, `agreements`, `offers`, `personels` için tam liste yerine `search-first`
- büyük ekran listelerinde `pagination`
- ağır yan verileri ilk frame’den çıkar, detay paneline taşı

### 3. Backend
- provider-score için batch endpoint
- pahalı özetler için response cache
- websocket invalidate sonrası full refetch yerine hedefli refresh
- limiter’ı endpoint sınıfına göre ayır

### 4. Database
- `EXPLAIN ANALYZE` ile sıcak sorguları ölç
- N+1 temizliği yap
- connection pool sınırlarını doğrula
- gerekirse read-replica hazırlık planı çıkar

## Yük Testi Planı

### Profil A — Düz kullanıcı
- 100 kullanıcı
- 300 kullanıcı
- 1000 kullanıcı
- sadece ana ekran + liste gezisi

### Profil B — Hızlı menü geçişi yapan kullanıcı
- company oturumu
- aynı dakika içinde workflow → shifts → agreements → commercial-flow → service-evaluation → map → reports turu
- ikinci tur hemen tekrar

### Profil C — WS bağlı kullanıcı
- canlı websocket açık
- invalidate geldikçe hedefli refresh beklenir
- full refetch davranışı izlenir

## Karar Kuralı

Bu M67 paketi green olsa bile sistem otomatik olarak kurumsal hazır sayılmaz.

Bu adımın amacı şudur:
- sıcak noktaları gizlemek yerine görünür hale getirmek
- sonraki overlay’de düzeltme sırasını veriyle belirlemek
- “çalışıyor” yaklaşımından “yük altında öngörülebilir” yaklaşımına geçmek
