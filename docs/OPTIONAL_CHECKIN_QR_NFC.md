# OPTIONAL — QR/NFC İndi/Bindi (Check-in) Modülü

Bu modül **hazır ama opsiyonel release** olarak tutulur.

## Release modeli
- **Default OFF:** `FEATURE_CHECKIN=0`
- **Optional ON:** `FEATURE_CHECKIN=1`
- Ana regresyon kanıtı değişmez: `tools/pack.ps1 -To 41`
- M42 kanıtı ayrı komutla alınır: `tools/pack_m42_optional.ps1`

## Neden ayrı?
- `pack.ps1` auto-max mantığı `m{N}check.js` zincirine bağlıdır.
- M42’yi ana zincire eklemek, opsiyonel bir modülü zorunlu regresyon haline getirir.
- Bu yüzden M42 kontrolü **ayrı script** ile koşar.

## Env
- `FEATURE_CHECKIN=1`
- `CHECKIN_DEDUPE_SEC=60`

## Backend kapsamı
### COMPANY
- `POST /api/checkin/company/personels/:id/credentials/issue`
- `POST /api/checkin/company/personels/:id/credentials/revoke`
- `GET /api/checkin/company/personels/:id/credentials`

### DRIVER
- `POST /api/checkin/scan`
  - KVKK consent gerekir
  - body: `{ shiftId, token, eventType, source, deviceId? }`

### ROOM / COMPANY / DRIVER / SUPER_ADMIN
- `GET /api/checkin/shifts/:id/events`

## Beklenen akış
1. COMPANY credential issue eder
2. DRIVER active shift içinde scan yapar
3. aynı event kısa sürede tekrar gelirse dedupe olur
4. ROOM/COMPANY events ekranından sayım ve kayıt görülür
5. revoke sonrası token geçersiz olur

## Audit
- `CREDENTIAL_ISSUE`
- `CREDENTIAL_REVOKE`
- `CHECKIN_SCAN`

## Prisma / veri modeli
- `PersonelCredential`
- `CheckinEvent`
- enumlar: `CredentialType`, `CredentialStatus`, `CheckinEventType`, `CheckinSource`

## Kanonik doğrulama
```powershell
.\tools\pack_m42_optional.ps1
```
