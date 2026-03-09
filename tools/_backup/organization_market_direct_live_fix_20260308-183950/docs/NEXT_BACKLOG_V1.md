# PERSONEL-SERVIS V1 — NEXT / UPDATE BACKLOG (SSOT)

V1 bittiğinde (veya V1’e kontrollü şekilde “çekilecekse”) gelecek özellikler.
**Kural:** V1 PRIMER SSOT kalır (`STARTPACK_V1.md`). Buradan bir madde V1’e alınırsa V1 dokümana taşınır.

---

## A) Company Excel → Personel/Adres → Otomatik Durak & Rota

### A0) Hedef
Company vardiya bazında personel listesi yükler → sistem geocode/cache yapar → yakınlığa göre durak önerir → rota taslağı üretir → ROOM’a “ShiftDraft/VehicleRequest” düşer.

### A1) Temel kararlar
- Excel kolonları: `AdSoyad` (zorunlu), `Adres` (zorunlu), `Tel` (opsiyonel), `Not` (opsiyonel)
- Adres → `lat/lng` otomatik (geocoding)
- Her personel için `lat/lng` **1 kez** hesaplanır + **cache**’lenir
- Adres değişirse yeniden geocode
- ~50m sapma kabul (grid snap opsiyon)
- Durak yürüme kuralı: `maxWalkM = 500` (opsiyon 400 güvenlik payı)
- Manuel override: elle girilen lat/lng otomatik tarafından ezilmez

### A2) Geocode cache yaklaşımı (önerilen alanlar)
- `Person.addressText` (raw)
- `Person.addressNorm` (normalize key, hashlenebilir)
- `Person.lat`, `Person.lng` (nullable)
- `Person.geoSource` (nominatim/google/manual)
- `Person.geoUpdatedAt`
- `Person.geoStatus`: `OK | NEEDS_REVIEW | FAILED`
- Opsiyon: `Person.geoAccuracyM` (tahmini)
- Opsiyon: `Person.geoAttemptCount`, `Person.geoLastError`

**Normalize standardı:**
- TR karakter normalize + whitespace trim + “Mah.”/“Mahallesi” gibi kısaltmalar unify (dokümante edilir)
- `addressNorm` değişmezse tekrar geocode yapılmaz

### A3) Otomatik durak üretimi (clustering)
- Aynı vardiya içindeki personeller yakınlığa göre gruplanır (Haversine / DB tarafı mesafe fonksiyonu / DBSCAN benzeri)
- Cluster başına durak noktası: `medoid` tercih (centroid bazen “yolun ortası” olur)
- Kural: cluster’daki herkes duraktan `<= maxWalkM` olmalı
- Çıktı: durak listesi + durak başına kişi sayısı (`seatDemand`)
- Edge case: dışarıda kalan tekil personel → tek kişilik durak

### A4) Otomatik rota sıralama (MVP)
- Minimal: nearest-neighbor
- Opsiyon: 2-opt iyileştirme
- Başlangıç: `Company HQ` veya `driver current gps`
- Çıkış: ordered stops + tahmini km/dk (ETA hesap mantığıyla uyumlu)

### A5) İş akışı (Draft → Onay)
1) Company: Excel upload (vardiya seç + saat şablonu)
2) Backend: import → geocode/cache → cluster → duraklar → rota taslağı
3) ROOM’a “ShiftDraft/VehicleRequest” düşer (duraklar + kişi sayısı + rota)
4) ROOM: araç + driver atar (1 gün/hafta/ay/yıl gibi)
5) Driver/Personel bilgilendirme

### A6) MVP için DoD (Definition of Done)
- Excel upload idempotent (aynı dosya/aynı vardiya tekrar yüklenirse duplicate üretmez ya da “replace” moduyla çalışır)
- Geocode cache çalışır; adres değişince only-then geocode
- `geoStatus=NEEDS_REVIEW` listesi UI/endpoint ile görülebilir
- Cluster sonucu her durakta `maxWalkM` garantisi var
- ROOM taslağı görür, onaylar, araca+driver’a bağlar
- Driver uygulamasında rota/duraklar görünür

---

## B) Log / Rapor / Export (Excel/CSV)

### B1) Raporlar
- Araç: günlük km, hız ihlali sayısı, sürüş süreleri
- Durak: REACHED/SKIPPED zamanları, gecikme
- Filtre: tarih aralığı, araç, sürücü, company/room scope

### B2) Export
- CSV/Excel
- Format standardı: kolon isimleri, timezone, tarih formatı (ISO önerilir)

### B3) DoD
- Scope/RBAC korunur (Company kendi verisi; Room yetkili scope)
- Büyük veri için sayfalama / async export opsiyonu (MVP’de limit uygulanabilir)

---

## C) No-show / Görev reddi cezası

### C1) Kural
- Driver görevi kabul edip gitmezse **3 ay** yeni talep alamaz
- Sayaç bildirimlerle düşer (driver + room)
- Log + audit kaydı tutulur

### C2) DoD
- Ceza state’i net: başlangıç tarihi, bitiş tarihi, gerekçe, audit trail
- ROOM override (istisna) varsa audit şart

---

## D) KVKK Onay + 2 yıl saklama politikası

### D1) Saklama
- Konum/log saklama: **2 yıl**
- Onay dokümanı + audit trail
- Retention parametreleri ENV’den yönetilir

### D2) DoD
- KVKK onayı kaydı (kimin, ne zaman, hangi metne onay)
- İlgili aksiyonlar audit log’a düşer
- Retention job doğrulanır (zaten V1’de aktif)

---
## Plan Dokümanları (archive)
- `docs/_archive/plans/SPRINT_1_PLAN.md`
- `docs/_archive/plans/SPRINT_2_PLAN.md`
- `docs/_archive/plans/SPRINT_3_PLAN.md`
- `docs/_archive/plans/SPRINT_4_PLAN.md`

## Gate & Dependency Dokümanları
- `docs/MILESTONE_GATE_MATRIX.md` (legacy)
- `docs/DEPENDENCY_MAP.md`

