# DB_SCHEMA_V1 (Taslak)

> PERSONEL-SERVIS V1 — çekirdek tablo ve ilişkiler (taslak)
> Not: UI/WS bazı alanları “derived” hesaplar (örn ageSec).

## Mermaid ER Diagram

```mermaid
erDiagram
  COMPANY ||--o{ ROOM : has
  COMPANY ||--o{ USER : employs
  ROOM    ||--o{ VEHICLE : owns
  ROOM    ||--o{ DRIVER  : manages

  COMPANY ||--o{ SHIFT : requests
  ROOM    ||--o{ SHIFT : operates
  VEHICLE ||--o{ SHIFT : assigned
  DRIVER  ||--o{ SHIFT : drives

  SHIFT   ||--o{ STOP : has
  VEHICLE ||--|| GPS_LAST : last_position

  USER ||--o{ NOTIFICATION : creates_optional
  VEHICLE ||--o{ NOTIFICATION : related_optional

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
    string email
    string role  "SUPER_ADMIN|ROOM|COMPANY|DRIVER|PERSONEL"
    int companyId FK
    int roomId FK  "nullable"
    datetime createdAt
  }

  DRIVER {
    int id PK
    int roomId FK
    int userId FK "nullable"
    string fullName
    string phone
    string deviceInfo "nullable"
    datetime createdAt
  }

  VEHICLE {
    int id PK
    int companyId FK
    int roomId FK
    string plate
    int capacity "nullable"
    int speedLimitKmh "nullable"
    datetime nextMaintenanceAt "nullable"
    string status "nullable"
    datetime createdAt
  }

  GPS_LAST {
    int vehicleId PK, FK
    float lat
    float lng
    float speed
    datetime at
    string status "LIVE|STALE|OFFLINE (derived or stored)"
  }

  SHIFT {
    int id PK
    int companyId FK
    int roomId FK
    int vehicleId FK
    int driverId FK
    datetime startAt
    datetime endAt
    string status "DRAFT|REQUESTED|APPROVED|ACTIVE|DONE|CANCELLED"
    int createdBy "nullable USER.id"
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
  }

  NOTIFICATION {
    int id PK
    string scope "ROOM|COMPANY|DRIVER"
    string type
    string payloadJson "TEXT(JSON)"
    int userId "nullable"
    int vehicleId "nullable"
    datetime createdAt
  }