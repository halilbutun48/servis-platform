# EPIC D Plan — KVKK Onay + 2 Yıl Saklama Politikası

## Hedef
- KVKK onay kaydı (metin versiyonu ile)
- Audit trail
- 2 yıl saklama politikası (teknik retention zaten var; KVKK tarafı “kanıt/iz”)

## Kapsam (In)
- Consent modeli (kim, ne zaman, hangi metne onay)
- Consent olmadan işlem kuralı (policy kararı: strict/soft)
- Audit trail (kritik aksiyonlar)
- Retention parametrelerinin dokümantasyonu (ENV) + doğrulama

## Kapsam Dışı (Out)
- E-imza / resmi imza altyapısı
- Hukuki metin üretimi (metin dışarıdan verilir)

---

## Policy Kararı (MVP)
İki moddan biri seçilir:
- **Strict:** Consent yoksa personel konumu işlenmez/assign edilemez
- **Soft:** Consent yoksa “NEEDS_CONSENT” state; bazı özellikler kısıtlı

> MVP öneri: Soft (operasyon bloklanmasın), ama harita/konum gibi kritik yerlerde kısıt.

---

## DB Önerisi
### ConsentDocument
- `id`, `version` (örn `v1.0`), `title`
- `contentHash` (metin hash)
- `publishedAt`

### UserConsent
- `id`, `userId`, `documentId`
- `acceptedAt`, `ip` (opsiyon), `userAgent` (opsiyon)
- unique: `(userId, documentId)`

---

## API Taslağı
### D-API-01 Consent doc getir
`GET /api/consent/current`

### D-API-02 Onay ver
`POST /api/consent/accept`
- body: `{ "documentId": 12 }`

### D-API-03 Onay durumu
`GET /api/me` içine `consent: { ok, documentId, acceptedAt }` eklenebilir

---

## Retention (Teknik)
- V1’de retentionCleanup mevcut:
  - `API_REQUEST_RETENTION_DAYS=730`
  - `AUDIT_LOG_RETENTION_DAYS=730`
  - (Opsiyon) `NOTIFICATION_RETENTION_DAYS`
- KVKK tarafında: consent kayıtları için retention kararı ayrıca belirlenir (genelde daha uzun tutulabilir)

---

## DoD
- Consent doc yayınlanabilir (admin)
- Kullanıcı consent kabul edebilir
- Consent durumu API’de görünür
- Kritik aksiyonlar audit log’a düşer
- STARTPACK’te ENV parametreleri net

## Test Plan
- Consent yok → policy’ye göre kısıt doğrulanır
- Consent accept → kısıt kalkar
- document version değişince yeniden onay gereksinimi (opsiyon)
