# UI_SPEC_V1 — Personel Servis V1

Bu doküman **web arayüzü** için minimum sözleşmeyi/standardı tanımlar.
Amaç: her feature eklenirken “map davranışı, liste sıralaması, filtre” gibi konuların
yeniden tartışılmaması.

## Roller ve ekranlar

### SUPER_ADMIN
V1 (M21):
- Overview: `/superadmin`
- Companies: `/superadmin/companies` (create + list)
- Rooms: `/superadmin/rooms` (create + list, hub opsiyonel)

Not: Update/Delete gibi “tam CRUD” genişletmeleri sonraki milestone’lara bırakılabilir.

### ROOM (Operasyon)
- Dashboard: canlı araçlar + uyarılar
- Vehicles: araç listesi, detay, bakım tarihleri, hız limiti, telematics device yönetimi
- Drivers: sürücü listesi, cihaz eşleştirme
- Requests: ...

### DRIVER
- Driver Map: aktif shift/rota, sıradaki duraklar
- Stop actions: REACHED / SKIPPED
- Notifications: overspeed / stale / offline

### COMPANY
- Vardiya şablonları + talep oluşturma (pickup request)
- Personel listesi (personels) + adres güncelleme


## Vehicles (ROOM) — Alanlar ve Filtre

### Yeni Araç formu (V1 minimal)
Zorunlu:
- `plate`
- `capacity` (yolcu koltuğu)

Önerilen (V1):
- `type`: `MINIBUS | MIDIBUS | OTOBUS`
- `brand`, `model`, `modelYear`

Opsiyonel (bakım/operasyon):
- `inspectionDueAt`
- `odometerKm`
- `lastServiceAt`, `lastServiceKm`, `serviceIntervalKm` (default 15000)
- (legacy) `nextMaintenanceAt`

### Liste görünümü
- Öncelik: plaka + kapasite + araç tipi + marka/model/yıl
- Bakım/ muayene bilgileri badge olarak gösterilebilir.

### Vehicles sekmeleri (ROOM)
- `Durum`: canlı GPS / online-stale-offline görünümü
- `Yönetim`: create/edit/archive akışı
- `Atamalar`: aktif/sıradaki shift görünümü
- `Müsaitlik`: araç + sürücü conflict kontrolü
- `Telematics`: araç bazlı GPS device create/list/update/rotate
- `Bağlantı`: araç ↔ sürücü bind/unbind/transfer

### Filtre (V1)
- Kapasite filtresi: `capacity >= seatDemand` (Company taleplerinde asıl karar)

## Map standardı (tek kaynak)

1) İlk açılışta **1 kez** fitBounds yapılır.
2) Kullanıcı manuel zoom/drag yaparsa otomatik fitBounds kapatılır.
3) “Tümünü Göster” butonu otomatik fitBounds’ı tekrar tetikler.
4) Araç seçilince pan + şartlı zoom (çok uzaksa). Yakınsa zoom değiştirme.

### Marker standardı
- Araç: plaka + durum badge (LIVE/STALE/OFFLINE) + opsiyonel pulse
- Durak: sıralama numarası + durum rengi (PENDING/REACHED/SKIPPED)

## Liste standardı
- Default sıralama: updatedAt DESC (son değişen üstte)
- Pagination: varsayılan 10 / 25 / 50 seçenek
- Search: plaka, sürücü adı, vardiya adı

## WebSocket event sözleşmesi (UI)
- `ws:ready` (join olunan room’lar)
- `gps:update`
- `attendance:update` (V1’de yoksa ileride)
- `notify:new`
- `eta:update`

## Hata UI standardı
- API error shape: `{ error: { code, message } }` (mümkünse)
- 401 → login’e yönlendir, token temizle
- 409 (DUPLICATE_OPEN) → “Açık talep zaten var” toast


## M102/M104 sync — Personel / Öğrenci erişim linki ekranı

### COMPANY / SCHOOL / ORGANIZATION
Gelişmiş menü altında erişim link ekranı bulunur:
- şirket için `Personel Link`
- school için `Öğrenci Link`
- route tabanı aynı paneldir, company kind'a göre etiket değişir

Panel davranışı:
- vardiya seçimi zorunlu
- kişi bazlı link üretimi yapılır
- aktif link sadece `revokedAt == null` ve `expiresAt > now` ise aktif sayılır
- ham URL sadece yeni üretimde gösterilir
- revoke sonrası eski ham URL cache'i temizlenir

### Public canlı ekran
Route: `/public/passenger-live?token=...`

Ekran sadece şu bilgileri göstermelidir:
- kişinin adı
- aracın plakası
- ETA
- durak / navigasyon bilgisi
- gerektiğinde mini canlı harita

Bu ekran login yerine geçen düşük sürtünmeli takip ekranıdır; yönetimsel CRUD içermez.

- parent access ve personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- personel public link, vardiya bitse bile link süresi dolana kadar ENDED/final ekranı açabilir


---

## M46.6 — Copilot / Rehber / Screen Help UI standardı

### Copilot görünüm modu
- **Rehber**
- **Gelişmiş**

Not:
- Copilot çekirdeği korunur
- varsayılan kullanıcı deneyimi sade Türkçe rehber ağırlıklıdır

### Rehber blok sırası
1. Bu iş ne?
2. Şimdi bunu yap
3. Sonra bunu yap
4. Bunu yapma
5. Başlamadan önce kontrol
6. Buradan aç
7. Adım adım ilerle
8. Bu neden kapalı?
9. Sık hata
10. Bittiğini nasıl anlarsın?
11. Takıldıysan buraya git
12. Bu ne demek?
13. Örnek doğru / yanlış
14. Hazır metin

### Screen help blokları
- **Bu ekran ne için var?**
- **Bu menü ne için var?**
- **Bu ekrandaki butonlar**
- **Bu rolde ne yapabilirim?**

### Ekran / buton yardımı
Kritik butonlarda sistem şunları açıklayabilir:
- bu buton ne yapar
- ne zaman kullanılır
- basınca ne olur
- neden kapalı olabilir

### Konum kaynağı dili
- **sürücünün telefon GPS'i**
- **cihaz GPS'i**
- **konum kaynağı**

### Yardım tonu
- kısa cümle
- sade Türkçe
- teknik terim minimum
- düşük bilgi seviyesine uygun anlatım

