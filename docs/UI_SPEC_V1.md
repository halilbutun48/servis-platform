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
- Vehicles: araç listesi, detay, bakım tarihleri, hız limiti
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

- parent invite ve personel/public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- personel public link, vardiya bitse bile link süresi dolana kadar ENDED/final ekranı açabilir
