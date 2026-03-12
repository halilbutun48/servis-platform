
---

## `docs/DB_SCHEMA_V1.md` — FULL REPLACE

```md
# DB_SCHEMA_V1 (SSOT)

> PERSONEL-SERVIS V1 — çekirdek tablo ve ilişkiler (M0→M18, GREEN)  
> Not: UI/WS bazı alanları “derived” hesaplar (örn `ageSec`).

---

## Mermaid ER Diagram (High-level)

```mermaid
erDiagram
  COMPANY ||--o{ ROOM : has
  COMPANY ||--o{ USER : employs
  COMPANY ||--o{ SHIFT : requests
  COMPANY ||--o{ PERSONEL : employs
  COMPANY ||--o{ AGREEMENT : requests

  ROOM ||--o{ VEHICLE : owns
  ROOM ||--o{ DRIVER  : manages
  ROOM ||--o{ SHIFT   : operates
  ROOM ||--o{ AGREEMENT : approves

  VEHICLE ||--|| GPS_LAST : last_position
  VEHICLE ||--|| VEHICLE_GPS_STATE : ui_state_gate

  SHIFT ||--o{ STOP : has
  SHIFT ||--o{ PICKUP_REQUEST : receives

  SHIFT ||--o{ SHIFT_PERSONEL : links
  PERSONEL ||--o{ SHIFT_PERSONEL : linked

  STOP ||--o{ STOP_ASSIGNMENT : assigned
  PERSONEL ||--o{ STOP_ASSIGNMENT : assigned

  SHIFT ||--o{ SHIFT_IMPORT : imports
  SHIFT_IMPORT ||--o{ SHIFT_IMPORT_ROW : rows

  AGREEMENT ||--o{ SHIFT : generates

  COMPANY {
    int id PK
    string name
    datetime createdAt
  }

  ROOM {
    int id PK
    int companyId FK
    string name
    datetime createdAt
  }

  USER {
    int id PK
    string email UNIQUE
    string passwordHash
    string role "SUPER_ADMIN|ROOM|COMPANY|DRIVER|PERSONEL"
    int companyId FK "nullable"
    int roomId FK "nullable"
    datetime createdAt
  }

  DRIVER {
    int id PK
    int roomId FK
    int userId FK "nullable"
    string fullName
    string phone
    string deviceInfo
    datetime createdAt
  }

  VEHICLE {
    int id PK
    int roomId FK
    string plate UNIQUE
    int capacity
    int speedLimitKmh
    int driverId FK "nullable (bind-driver)"
    string status "ACTIVE|PASSIVE|STALE"
    datetime createdAt
  }

  GPS_LAST {
    int vehicleId PK, FK
    float lat
    float lng
    float speed
    datetime at
    string status "OK|STALE"
  }

  VEHICLE_GPS_STATE {
    int vehicleId PK, FK
    string lastUiStatus "LIVE|STALE|OFFLINE"
    datetime lastChangedAt
    datetime seenLiveAt "nullable"
  }

  SHIFT {
    int id PK
    int companyId FK
    int roomId FK
    int vehicleId FK "nullable"
    int driverId FK "nullable"
    datetime startAt
    datetime endAt
    string status "DRAFT|REQUESTED|APPROVED|ACTIVE|REJECTED|DONE"
    int agreementId FK "nullable (M18)"
    datetime createdAt
  }

  STOP {
    int id PK
    int shiftId FK
    int order
    string name
    float lat
    float lng
    string type "COMMON|MANUAL"
    string state "PENDING|REACHED|SKIPPED"
    datetime updatedAt
  }

  PICKUP_REQUEST {
    int id PK
    int shiftId FK
    int personelId FK
    float lat
    float lng
    string status "OPEN|CANCELLED|ACCEPTED"
    datetime createdAt
  }

  PERSONEL {
    int id PK
    int companyId FK
    int userId FK "nullable"
    string fullName
    string phone "nullable"
    string homeAddress "nullable"
    float homeLat "nullable"
    float homeLng "nullable"
    string geoStatus "OK|NEEDS_REVIEW|FAILED"
    bool geoManualOverride
    datetime geoUpdatedAt "nullable"
    datetime createdAt
  }

  SHIFT_PERSONEL {
    int id PK
    int shiftId FK
    int personelId FK
    string note "nullable"
    datetime createdAt
  }

  STOP_ASSIGNMENT {
    int id PK
    int shiftId FK
    int stopId FK
    int personelId FK
    int walkM
    datetime createdAt
  }

  SHIFT_IMPORT {
    int id PK
    int shiftId FK
    int createdByUserId FK "nullable"
    string fileName "nullable"
    datetime createdAt
  }

  SHIFT_IMPORT_ROW {
    int id PK
    int importId FK
    int rowNo
    json rawJson "nullable"
    string fullName "nullable"
    string phone "nullable"
    string address "nullable"
    float lat "nullable"
    float lng "nullable"
    string geoStatus "OK|NEEDS_REVIEW|FAILED"
    int personelId FK "nullable"
    datetime createdAt
  }

  AGREEMENT {
    int id PK
    int companyId FK
    int roomId FK
    int vehicleId FK "nullable"
    int driverId FK "nullable"
    date startDate
    date endDate
    int weekMask
    int startMin
    int endMin
    string status "REQUESTED|APPROVED|ACTIVE|DONE|CANCELLED|REJECTED"
    int companyOfferAmount "nullable"
    string companyOfferNote "nullable"
    int roomOfferAmount "nullable"
    string roomOfferNote "nullable"
    datetime createdAt
    datetime updatedAt
  }

---

## M102/M104 sync — Public canlı link veri modeli

### Personel kullanıcı hesabı opsiyoneldir
`PERSONEL` için login desteklenir; ancak login zorunlu değildir.
Canlı takip için süreli token bazlı erişim modeli de desteklenir.

### `PassengerLiveLink`
Tek kişiye özel, süreli public canlı erişim linkini tutar.

Özet alanlar:
- `id`
- `shiftId`
- `personelId`
- `tokenHash`
- `expiresAt`
- `revokedAt`
- `lastOpenedAt`
- `createdByUserId`
- `createdAt`

İlişkiler:
- `Shift 1 -> N PassengerLiveLink`
- `Personel 1 -> N PassengerLiveLink`
- `User 1 -> N PassengerLiveLink (createdBy)`

Davranış:
- ham token DB'de düz metin tutulmaz, `tokenHash` saklanır
- revoke edilen veya süresi geçen kayıt aktif sayılmaz
- ham URL yalnız üretim anında gösterilir


## PassengerLiveLink TTL policy
- UI presetleri: 7 / 30 / 180 / 365 gün
- `expiresAt`, vardiya `endAt` ile zorunlu clamp edilmez; link TTL bağımsızdır


## M44 — GpsDevice

Telematics için araça bağlı cihaz kaydı eklenmiştir. Minimum alanlar:
- `id`
- `vehicleId`
- `vendor`
- `serial`
- `authTokenHash`
- `status` (`ACTIVE|DISABLED`)
- `lastSeenAt`
- `lastIngestAt`

Amaç: sürücünün telefon GPS'i hattını bozmadan, cihaz/vendor kaynaklı konumu aynı `GpsLast` / `GpsPoint` hattına normalize ederek yazmak.


---

## M46.6 notu — DB değişikliği yok

M46.6-A / M46.6-B / M46.6-T / M46.6-C hatları yardım / rehber / screen-help katmanıdır.

Bu hatlarda:
- yeni Prisma model zorunlu değildir
- yeni tablo zorunlu değildir
- yardım içeriği mevcut entity / route / scope verileri üstünden üretilir

Özet:
- yardım katmanı uygulama mantığı ve mevcut veri modeli üstünde çalışır
- kalıcı veritabanı şeması değişikliği gerektirmez
