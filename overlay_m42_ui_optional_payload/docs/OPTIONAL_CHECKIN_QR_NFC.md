# OPTIONAL — QR/NFC İndi/Bindi (Check-in) Modülü

Bu modül **opsiyoneldir** ve default **kapalıdır**.

## Enable

Env ile açılır:
- `FEATURE_CHECKIN=1`

Opsiyonel tuning:
- `CHECKIN_DEDUPE_SEC=60` (aynı personel + aynı eventType için tekrar okutmada dedupe penceresi)

## Endpoints

### COMPANY
- `POST /api/checkin/company/personels/:id/credentials/issue`
  - body: `{ "type": "QR" | "NFC" }`
  - returns: `{ ok, credential, token: "psv1:<token>" }`  (token yalnızca 1 kere döner)

- `POST /api/checkin/company/personels/:id/credentials/revoke`
  - returns: `{ ok, revokedCount }`

- `GET /api/checkin/company/personels/:id/credentials`
  - returns: `{ ok, items }` (son 10 kayıt)

### DRIVER
- `POST /api/checkin/scan`
  - KVKK consent required (LOCATION_CONSENT)
  - body: `{ shiftId, token, eventType: "BOARD"|"ALIGHT", source: "QR"|"NFC"|"MANUAL", deviceId?, at? }`
  - returns: `{ ok, shiftId, deduped, counts, lastEvent }`

### ROOM / COMPANY
- `GET /api/checkin/shifts/:id/events`
  - returns: `{ ok, shiftId, counts, items }`

## WS
- `shift:checkin:update`
  - payload: `{ shiftId, deduped, counts, lastEvent }`

## Audit
- `CREDENTIAL_ISSUE`, `CREDENTIAL_REVOKE`, `CHECKIN_SCAN`

## Notlar
- Token DB’de **hash** olarak tutulur (`sha256`), plain token saklanmaz.
- Student desteği şu an `Personel.kind=STUDENT` üzerinden aynı altyapıyla yapılır.


## Web UI (Optional Panel)

Flag açıkken UI menüleri role bazlı görünür:
- COMPANY / SCHOOL: `#/company/checkin` veya `#/school/checkin`
- ROOM: `#/room/checkin`
- DRIVER: `#/driver/checkin`

Davranış:
- Flag kapalıysa menü gizlenir.
- Deep link ile açılırsa panel açıklayıcı `FEATURE_CHECKIN` kapalı durumu gösterir.
- WS `shift:checkin:update` olayları UI tarafında `checkin` invalidation konusuna düşer ve panel yeniden yüklenir.
