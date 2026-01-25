erDiagram
  USER ||--o| DRIVER : "userId"
  USER ||--o{ SHIFT : "createdBy(optional)"
  VEHICLE ||--|| GPS_LAST : "vehicleId"
  VEHICLE ||--o{ SHIFT : "vehicleId"
  SHIFT ||--o{ SHIFT_STOP : "shiftId"
  USER ||--o{ NOTIFICATION : "userId(optional)"
  VEHICLE ||--o{ NOTIFICATION : "vehicleId(optional)"

  USER {
    int id PK
    string email
    string role
    int companyId
    int roomId
  }

  DRIVER {
    int id PK
    int userId FK
  }

  VEHICLE {
    int id PK
    string plate
    int roomId
    int companyId
  }

  GPS_LAST {
    int vehicleId PK,FK
    float lat
    float lng
    float speed
    datetime at
    string status
  }

  SHIFT {
    int id PK
    int vehicleId FK
    int driverId FK
    string status
  }

  SHIFT_STOP {
    int id PK
    int shiftId FK
    int order
    string name
    float lat
    float lng
  }

  NOTIFICATION {
    int id PK
    string type
    string scope
    datetime createdAt
    string payloadJson
    int vehicleId
  }