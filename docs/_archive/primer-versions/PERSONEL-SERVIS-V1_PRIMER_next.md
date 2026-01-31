# PERSONEL-SERVIS V1 — PRIMER (NEXT / UPDATE BACKLOG)

## Amaç
V1 bitince (veya V1’e kontrollü şekilde “çekilirse”) gelecek özellikler.
Kural: V1 primer “SSOT” kalır; buradan bir madde V1’e alınırsa V1 tarafına taşınır.

---

## A) Company Excel → Personel/Adres → Otomatik Durak & Rota
### Temel kararlar
- Company vardiya bazında Excel yükler: (Ad Soyad, Tel opsiyonel, Adres)
- Adres → lat/lng otomatik bulunur (geocoding)
- Her personel için lat/lng **1 kez** hesaplanır + **cache**’lenir
- Adres değişirse yeniden geocode
- Nokta atışı şart değil: ~50m sapma kabul
- Durak kuralı: maxWalkM = 500 (veya güvenlik payı ile 400)

### Geocode cache yaklaşımı
- Person.addressText (raw)
- Person.addressNorm (normalize key)
- Person.lat / Person.lng (opsiyon: 50m grid snap)
- Person.geoSource (nominatim/google/manual)
- Person.geoUpdatedAt
- Person.geoStatus: OK | NEEDS_REVIEW | FAILED
- Manuel override: lat/lng elle girilirse otomatik üstüne yazmaz

### Otomatik durak üretimi (clustering)
- Aynı vardiyadaki personeller yakınlığa göre gruplanır (Haversine / DBSCAN benzeri)
- Her cluster için ortak durak noktası: centroid/medoid
- Kural: cluster’daki herkes duraktan <= maxWalkM olmalı
- Çıktı: duraklar + durak başına kişi sayısı (seatDemand)

### Otomatik rota sıralama
- V1’e çekilecek minimal: nearest-neighbor (opsiyon: 2-opt)
- Başlangıç: Company HQ veya driver current gps
- Çıkış: ordered stops + tahmini km/dk

### İş akışı
1) Company: Excel upload (vardiya seç + saat şablonu)
2) Backend: import → geocode/cache → cluster → duraklar → rota taslağı
3) ROOM’a “ShiftDraft/VehicleRequest” düşer (duraklar + kişi sayısı + rota)
4) ROOM: araç+driver atar (1 gün/hafta/ay/yıl vs)
5) Driver/Personel bilgilendirme

---

## B) Log/Rapor/Export (Excel/CSV)
- Araç günlük km, hız ihlali, durak geçiş zamanları (filtreli)
- Company/Room/Driver: tarih aralığına göre rapor
- Export: Excel/CSV (format standardı)

---

## C) No-show / görev reddi cezası
- Driver görevi kabul edip gitmezse 3 ay talep alamaz
- Kalan gün sayacı bildirimlerle düşer (driver + room)
- Log + audit kaydı

---

## D) KVKK Onay + 2 yıl saklama politikası
- Konum/log saklama 2 yıl
- Onay dokümanı + audit trail
- Retention parametreleri env’den yönetilir