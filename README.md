# personel-servis-v1 (Docker Compose + Prisma + Seed)

Bu paket: Room / Company / Driver / Personel akışlarını çalışır bir backend (REST + WebSocket) ile ayağa kaldırır.

## Servisler
- **api**: Node/Express + Socket.IO (REST + WS)
- **db**: PostgreSQL
- **redis**: Redis (rate limit/cache/ws adapter placeholder)

## Varsayılan URL'ler
- API: http://localhost:3000
- WS:  ws://localhost:3000  (Socket.IO)
- Health: http://localhost:3000/health
- Seed kullanıcıları: docs/SEED_USERS.md
- Tek kaynak dokümanlar: docs/PROJECT_SPEC_V1.md, docs/API_SPEC_V1.md, docs/DB_SCHEMA_V1.md

## Hızlı Başlangıç (PowerShell)
1) Zip'i aç
2) docker compose up --build

Not: API container ilk açılışta Prisma migrate + seed çalıştırır.


⚠️ Dev paket: schema değişikliklerinde `prisma db push` kullanır.
