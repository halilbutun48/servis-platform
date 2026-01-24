# PERSONEL-SERVIS V1 — PRIMER (Yapıştır & Devam Et)

## Amaç
Öğrenci/parent yok. GPS tabanlı “personel servisi” platformu:
- Canlı araç takibi (map), rota/durak planı, vardiya yönetimi
- Hız/bakım/stale gibi uyarılar (notification)
- Personel taleplerinden ortak durak önerisi + manuel durak yönetimi
- Driver’a rota/duraklar gider; driver yakın duraktan başlayarak güzergah oluşturur

## Roller (5)
1) SUPER_ADMIN
- Company ekler, Company/Room yetkilerini yönetir

2) ROOM (Operasyon/Servis odası)
- Araç ekler (plaka, kapasite, hız limiti, bakım tarihleri, cihaz bilgisi)
- Sürücü ekler (ad/soyad/tel, cihaz), opsiyonel yedek sürücü
- Company’den gelen vardiya talebini onaylar, araca+sürücüye bağlar
- Haritada: tüm araçları görür; tek araç seçince araç+driver+company+rota+durağı görür
- Bakım 7 gün kala map/dashboard uyarı; aktif/pasif/stale görür
- Ek servis ihtiyacı bildirir; geçici/kalıcı araç talebi açar
- Company’nin duraklarını görür/düzeltir; araca rota gönderir

3) COMPANY (Müşteri firma)
- Room’un kendine tanımladığı araç/driver bilgilerini görür
- Vardiya oluşturur (tarih/saat/personel listesi/kapasite)
- Personel taleplerine göre duraklar belirler veya ortak durak (clustering) önerir
- Vardiya+durak planını Room’a gönderir (onay/atama için)

4) DRIVER
- Kendine atanmış araç bilgisi direkt görünür (kapasite, bakım, limitler)
- Durak planı gelir; konuma en yakın duraktan başlatıp rota çıkarır
- GPS gönderir; “Reached” ile ilerleme günceller
- Hız/bakım/stale uyarıları driver’a da gelir

5) PERSONEL
- Sadece kendine atanmış aracı görür (yaklaşıyor/konum/ETA)
- Konum al-kaydet, yakın durak seç, “binmiyorum”
- Konum/durak talepleri Company’ye gider

## Çekirdek WS (socket.io) odalar & event’ler
Join rooms:
- vehicle:{vehicleId}, room:{roomId}, company:{companyId}, shift:{shiftId}

Emit events:
- gps:update {vehicleId,lat,lng,speed,at,status}
- vehicle:status {vehicleId,status:ACTIVE|STALE|PASSIVE}
- notif:new {scope,type,payload}
- route:plan {shiftId,stops[]}
- route:progress {shiftId,lastReachedOrder,nextStop,completed}

## Veri Şeması (çekirdek tablolar)
Company, Room
Vehicle (roomId, plate, capacity, speedLimitKmh, nextMaintenanceAt, status)
Driver (roomId, fullName, phone, deviceInfo, backupDriverId?)
Shift (companyId, roomId, vehicleId, driverId, startAt, endAt, status)
Stop (shiftId, name, lat,lng, order, type COMMON/MANUAL)
Personel (companyId, fullName, homeLat, homeLng)
PickupRequest (shiftId, personelId, lat,lng, status)
GpsLast (vehicleId, lat,lng,speed,at,status) + GpsPoint history
Notification (scope ROOM|COMPANY|DRIVER, type MAINT_7D|OVERSPEED|STALE|..., payloadJson)

## Proje Yapısı (panel klasörleri)
web/src/panels/
- room/, company/, driver/, personel/, superadmin/

## Geliştirme kuralı
- Sıfırdan temiz DB + Prisma + seed ile başlayacağız (monorepo: backend/web/infra/docs/tools)
- REST=CRUD/planlama, WS=canlı/bildirim
- “Tek kaynak doküman”: docs/PROJECT_SPEC_V1.md + API_SPEC_V1.md + DB_SCHEMA_V1.md

## Milestone (Kaldığımız Yer / Plan)
- Milestone-0 (Şimdi): Sıfırdan repo + DB + Prisma schema + seed + auth/roles iskeleti
- Milestone-1: Room panel (Vehicle/Driver CRUD + atama) + Company panel (Shift draft/request) + Room onay akışı
- Milestone-2: GPS (gps:last + gps:points) + Map (Room: tüm araçlar, Personel: atanmış araç)
- Milestone-3: Route/Stops (company oluştur/öner, room düzenle, driver’a gönder)
- Milestone-4: WS canlı akış (gps:update, route:progress, notif:new) + Notification kuralları (overspeed, maint_7d, stale)
- Milestone-5: “Ortak durak önerisi” (clustering) + operasyonel detaylar (geçici araç talebi, ek servis)

## Bugünkü not
- Eski repo’da backend/src/routes/driver.js yanlışlıkla React UI içeriğine dönmüş olabilir (import ... from "react").

## Son karar (ilişki)
- Company 1 — Room N (varsayılan). Room operasyonel havuz, company vardiya/talep üretir.
- Bu ürün kararı değil; dosya yolu/yerleşim karışıklığı. Biz bu projeyi sıfırdan temiz kuracağız.

## Son karar (ilişki)
- Company 1 — Room N (varsayılan). Room operasyonel havuz, company vardiya/talep üretir.