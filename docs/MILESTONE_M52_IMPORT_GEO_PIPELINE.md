# M52 — IMPORT & GEO PIPELINE

Timezone: Europe/Istanbul  
Last updated: **2026-03-16**  
Depends on: **M51 — Pre-Pilot Gap Closure**

## Amaç
M52'nin amacı sıfırdan Excel/import özelliği yapmak değildir. Amaç, repoda halihazırda bulunan import, geocode state, review ve stop-generation tabanını **tek, kurallı, anlaşılır ürün akışına** çevirmektir.

Hedef zincir:

**Excel/CSV yükle → import et → geocode/cache işle → review et → stop generation için temiz veri üret**

## Repo'da zaten bulunan temel
Bu milestone aşağıdaki mevcut capability'lerin üstüne kurulur:
- `POST /api/shifts/:id/people/import?mode=REPLACE|MERGE`
- `PUT /api/shifts/:id/people?mode=REPLACE|MERGE`
- `ShiftImport` + `ShiftImportRow` import trail modeli
- `Personel.geoStatus` (`OK | NEEDS_REVIEW | FAILED`)
- `geoManualOverride`, `geoUpdatedAt`, `geoNote`
- `GET /api/company/personels?geoStatus=NEEDS_REVIEW`
- `PUT /api/company/personels/:id/location`
- `POST /api/shifts/:id/stops/generate?maxWalkM=...`
- Company tarafında CSV/XLSX parse + import tabanı

## Kapsam
### M52.1 — Import Contract
- Import giriş formatı yazılı hale getirilir
- `REPLACE` ve `MERGE` davranışı netleştirilir
- Duplicate davranışı tanımlanır
- Zorunlu kolonlar ve hata davranışı yazılır
- Import response özeti standardize edilir

### M52.2 — Geo State Rules
- `OK`, `NEEDS_REVIEW`, `FAILED` geçiş kuralları yazılır
- `geoManualOverride=true` iken otomatik akışın veriyi ezmemesi garantiye bağlanır
- `lat/lng` yoksa veya güvenilmezse review davranışı netleştirilir

### M52.3 — Batch Geocode Flow
- Normalize adres kuralı tanımlanır
- Cache lookup ve refresh mantığı tanımlanır
- Retry / backoff stratejisi belirlenir
- Geocode başarısızlığında `FAILED` / `NEEDS_REVIEW` ayrımı netleştirilir

### M52.4 — Geo Review UX / API Cleanup
- Review listesinin amacı ve kullanım sırası netleştirilir
- Kullanıcıya neden review'a düştüğü açıklanır
- Manuel düzeltme sonrası `OK` davranışı yazılı hale getirilir
- M53 stop generation için temiz çıkış kontratı tanımlanır

## Kapsam dışı
Bu milestone içinde şunlar yapılmaz:
- OSRM kalite / rota productization
- ROOM dispatch zinciri
- Business report / export V2
- No-show / görev reddi cezası
- Full KVKK matrix
- Saha testi / pilot
- iOS release lane

## Mevcut repo gözlemleri
### Import tarafı
- Import endpoint'i `rows` veya `items` kabul ediyor
- `fileName` trail olarak tutuluyor
- `ShiftImport` ve `ShiftImportRow` kayıtları yazılıyor
- `phone` varsa `companyId + phone` ile upsert yapılıyor
- `phone` yoksa yeni `Personel` kaydı açılıyor
- `REPLACE` modunda eski `ShiftPersonel` linkleri siliniyor
- `MERGE` modunda eksik linkler ekleniyor

### Geo tarafı
- `lat/lng` varsa veya `geoManualOverride=true` ise `geoStatus=OK`
- Aksi durumda `geoStatus=NEEDS_REVIEW`
- Company panelinde `GeoReviewPanel` ile manuel düzeltme var
- Plan Builder precheck içinde `needsReview` / `failed` sayımı var

### Stop generation tarafı
- `geoStatus=OK` veya `geoManualOverride=true` + `lat/lng` olan kayıtlar eligible sayılıyor
- `maxWalkM` query param ile cluster stop üretimi var
- Shift hub boşsa Company hub kopyalanabiliyor

## Hedef çıktı
M52 sonunda şu netlik oluşmuş olmalı:
- Import davranışı tahmine değil kurala dayanmalı
- Geocode state geçişi tutarlı olmalı
- Manual override korunmalı
- Review ekranı gerçek operasyon için anlaşılır olmalı
- M53 stop/route productization için temiz giriş verisi oluşmalı

## Done kriteri
- `RUNBOOK_M52_IMPORT_CONTRACT.md` canonical referans olarak eklenmiş olmalı
- Import için zorunlu alanlar, mode davranışı, duplicate davranışı yazılı olmalı
- `geoStatus` geçiş kuralları yazılı olmalı
- Batch geocode akışı ve retry yaklaşımı karar bağlanmış olmalı
- Review ekranı ve manuel düzeltme sonrası beklenen sonuç net olmalı
- M53'e giriş kontratı (eligible / skipped / review) yazılı hale gelmiş olmalı

## Sonraki milestone'a temiz geçiş
M52 tamamlandıktan sonra bir sonraki resmi iş:

**M53 — Stop & Route Productization**
