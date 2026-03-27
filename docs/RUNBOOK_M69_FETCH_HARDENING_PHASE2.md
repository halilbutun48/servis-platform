# M69 Fetch Hardening Phase-2 Runbook

## Amaç
M68 sonrası halen ağır kalan iki ana company girişini inceltmek:
- Vardiyalar
- Sözleşmeler

Bu adım doğrudan ilk girişteki gereksiz yan veri yükünü azaltır.

## Yapılan ana değişiklikler
1. **Vardiyalar lazy reference-data**
   - İlk girişte önce sadece vardiya listesi okunur.
   - Room + araç referans verisi yalnız gerçekten gerektiğinde yüklenir.
   - Gerekme koşulları: create akışı, teklif modalı, araç detayları, pazarlık alanı.

2. **Room score kaynağı değişti**
   - Room puanları artık tam room listesi yerine ekranda görünen vardiyalardaki roomId’lerden türetilir.
   - Böylece room directory okumadan da puan özeti basılabilir.

3. **Sözleşmeler lazy room yükleme**
   - Sözleşme listesi ilk açılışta room directory çekmez.
   - Hızlı sözleşme modalı kendi rooms verisini açılınca alır.
   - Gelişmiş oluştur ekranı açılınca room listesi yüklenir.

4. **Route preview cache reuse**
   - Önizleme modalı route-preview çağrısını kısa TTL cache ile kullanır.
   - Harita ekranı ile aynı sıcak endpoint ailesinde tekrar yük azalır.

5. **Backend read shaping**
   - `/api/vehicles` artık `take` ve `q` kabul eder.
   - `/api/trust-quality/company/items` artık `take`, `q`, `pendingOnly` kabul eder.

## Beklenen etki
- Hızlı menü geçişlerinde `rooms` ve `vehicles` hattı daha seyrek vurulur.
- Vardiyalar ilk frame daha çabuk gelir.
- Sözleşmeler ekranı listeyi daha hafif açar.
- Service evaluation ilk açılışta tam liste yerine son/pending kayıtları çeker.

## Sonraki kontrol
1. M69 pack çalıştır.
2. Sonra M67 paketi tekrar koş.
3. Özellikle şu farklara bak:
   - `/api/rooms` toplam vurulma sayısı düştü mü?
   - `/api/vehicles` hot listeden düştü mü veya azaldı mı?
   - `ShiftsPanel initialLoadCalls` ve `AgreementsPanel initialLoadCalls` düştü mü?
