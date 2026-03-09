# API Quick Test (curl örnekleri)

> Token almak:
POST /api/auth/login
{
  "email": "room@demo.com",
  "password": "demo123"
}

## ETA (kalan km / dakika)
- WS event: **eta:update**
- REST: **GET /api/eta/vehicle/:vehicleId**  (auth gerekli)

ETA şu an MVP olarak **haversine (kuş uçuşu)** mesafeden hesaplanır:
- remainingKm: araç → durak arası km
- etaMin: remainingKm / (speedKmh veya default 30) * 60

## Örnek akış (Milestone-0)
1) COMPANY vardiya talebi oluşturur (POST /api/shifts)
2) ROOM vardiyayı onaylar ve araç+driver atar (POST /api/shifts/:id/approve)
3) ROOM durakları gönderir (POST /api/shifts/:id/stops)
4) DRIVER /api/gps ile konum basar
5) WS event'leri: gps:update, eta:update, shift:update, route:plan, route:progress, notif:new

> Not: geri uyum için bazı yerlerde `notify:new` da yayınlanabilir.
