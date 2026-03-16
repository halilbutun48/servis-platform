# RUNBOOK — M52 IMPORT CONTRACT

Timezone: Europe/Istanbul  
Last updated: **2026-03-16**

## Amaç
Bu runbook, mevcut repo davranışını yazılı hale getirir ve M52 içinde kapatılacak boşlukları tanımlar. Amaç kodu ezbere yorumlamak yerine **import + geo pipeline** için tek kaynak oluşturmaktır.

## 1) Mevcut giriş kanalları
### 1.1 Shift people doğrudan yazma
Endpoint:
- `PUT /api/shifts/:id/people?mode=REPLACE|MERGE`

Body:
- `items[]` veya `rows[]`

Her item için mevcut alanlar:
- `personelId?`
- `fullName` (zorunlu)
- `phone?`
- `address?`
- `lat?`
- `lng?`
- `geoManualOverride?`
- `kind?`

### 1.2 Dosya tabanlı import trail
Endpoint:
- `POST /api/shifts/:id/people/import?mode=REPLACE|MERGE`

Body:
- `fileName?`
- `rows[]` veya `items[]`

Bu endpoint ek olarak:
- `ShiftImport` oluşturur
- her satır için `ShiftImportRow` oluşturur
- sonrasında `Personel` upsert eder
- uygun `ShiftPersonel` linklerini kurar

## 2) Mevcut upsert davranışı
Öncelik sırası:
1. `personelId` verilirse aynı company içindeki o kayıt update edilir
2. `phone` varsa `companyId + phone` ile upsert yapılır
3. `phone` yoksa yeni `Personel` kaydı açılır

### Sonuç
Bu repo davranışı yüzünden aynı kişi için stabil anahtar bugün çoğunlukla:
- önce `personelId`
- yoksa `phone`

Bu yazılı olarak korunmalıdır.

## 3) Import mode standardı
### REPLACE
- hedef shift içindeki eski `ShiftPersonel` linkleri silinir
- import edilen kişi listesi yeniden bağlanır
- `Personel` master kayıtları tamamen silinmez; sadece shift-link seviyesi temizlenir

### MERGE
- mevcut shift-link'ler korunur
- yeni gelen ve eksik olan linkler eklenir
- tekrar gelen link duplicate üretmez

### M52 kararı
Bu iki mod kanonik davranış olarak korunur. UI ve runbook aynı dili kullanmalıdır.

## 4) Zorunlu alanlar ve validasyon
### Şu an zorunlu olanlar
- `fullName`

### Şu an opsiyonel olanlar
- `phone`
- `address`
- `lat`
- `lng`
- `geoManualOverride`
- `kind`

### M52'de karar verilecekler
- Import UI tarafında `address` fiilen zorunlu mu kabul edilecek?
- `phone` olmayan satırlar için duplicate riski nasıl kullanıcıya anlatılacak?
- `fullName` aynı ama `phone` boş birden çok satır geldiğinde kullanıcı uyarısı verilecek mi?

## 5) Import response standardı
Şu an response temel olarak:
- `shiftId`
- `mode`
- `inputCount`
- `linkedCount`
- import endpoint'inde ayrıca `importId`

### M52 hedefi
Canonical response özetinde aşağıdaki alanlar görünür olmalı:
- `inputCount`
- `linkedCount`
- `createdPersonelCount`
- `updatedPersonelCount`
- `needsReviewCount`
- `failedCount`
- `duplicateHintCount` (opsiyonel ama faydalı)
- `warnings[]`

Not: Bu alanların tümü ilk kod adımında zorunlu olmak zorunda değildir; önce runbook standardı yazılır, sonra endpoint buna yaklaştırılır.

## 6) Geo state kuralları
### Mevcut repo kuralı
- `geoManualOverride=true` ise `OK`
- `lat/lng` varsa `OK`
- aksi halde `NEEDS_REVIEW`

### M52'de netleştirilecek kural
#### OK
- koordinat güvenilir ve kullanılabilir
- veya manuel düzeltme ile onaylanmış

#### NEEDS_REVIEW
- koordinat yok
- koordinat şüpheli
- normalize/geocode sonucu insan kontrolü istiyor

#### FAILED
- geocode denemesi yapıldı ama başarısız oldu
- tekrar deneme öncesi neden kaydı tutulmalı

## 7) Manual override kuralı
Bu repo için değişmez ilke:
- `geoManualOverride=true` olan kayıt otomatik geocode akışı tarafından ezilmez
- manuel düzeltme yapıldıysa tekrar auto-geocode zorlaması ancak açık yönetici aksiyonu ile yapılır

## 8) Batch geocode akışı — hedef davranış
M52 içinde karar bağlanacak hedef sıra:
1. adres normalize edilir
2. cache lookup yapılır
3. cache hit varsa sonuç uygulanır
4. cache miss ise geocode denenir
5. başarısızlıkta retry/backoff uygulanır
6. sonuç güvenilir değilse `NEEDS_REVIEW`
7. deneme tüketildi ve sonuç yoksa `FAILED`

## 9) Geo review ekranı — operasyon kuralı
Mevcut ekran:
- `GET /api/company/personels?geoStatus=NEEDS_REVIEW`
- manuel `lat/lng` gir
- `OK Yap`

### M52'de yazılı hale gelecek beklenti
- kullanıcı review sebebini anlayabilmeli
- kayıt neden bu listeye düştü görünmeli
- manuel düzeltme sonrası listeden çıkması beklenmeli
- toplu çalışma için filtre/sade akış korunmalı

## 10) M53'e giriş kontratı
M53 stop generation için eligible kayıt tanımı:
- `geoStatus=OK` veya `geoManualOverride=true`
- `lat` ve `lng` sayısal/geçerli

Skipped kayıt tanımı:
- `NEEDS_REVIEW`
- `FAILED`
- koordinatı eksik/geçersiz kayıt

## 11) M52 çıktısı
Bu milestone sonunda şu cümle doğru olmalı:

> Import edilen kişi listesi için hangi kayıtların doğrudan kullanılacağı, hangilerinin review isteyeceği ve hangilerinin başarısız sayılacağı yazılı olarak nettir.
