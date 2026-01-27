# STARTPACK_V1 — Personel Servis V1

Bu dosya, projeyi yeni bir makinede **tek bakışta ayağa kaldırmak** ve
her milestone sonrası “ne çalışıyor / ne eksik” durumunu hızlı doğrulamak için
tek kaynak (single source of truth) olarak tutulur.

> Not: Repo içinde tools/ ve backend/scripts/ altında otomasyonlar vardır.

## Dizin yapısı
- `backend/` REST API + WS (Socket.IO) + Prisma
- `web/` Vite tabanlı UI
- `infra/` docker-compose (postgres)
- `docs/` spesifikasyonlar
- `tools/` gate/pack/primer/runbook

## Hızlı başlangıç

### 1) Infra (Postgres)
- `infra/docker-compose.yml` ile postgres ayağa kalkar
- Varsayılan DB: `servisdb` (host port: `5433`)

### 2) Backend
- `.env.example` → `.env` (gerekirse)
- Prisma migrate + seed
- API: `http://localhost:3000`
- Health: `GET /health`

### 3) Web
- `web/` içinde `npm i` + `npm run dev`

## Milestone kontrolü

Backend tarafında kontrol scriptleri:
- `npm run smoke`
- `npm run fullcheck`
- `npm run m0check ... m12check`

## M11 — Security hardening (özet)
- `helmet` (security headers)
- `express-rate-limit` (abuse gate)
- `apiRequestLog` (ApiRequest insert)
- `/health` → `dbOk/dbLatencyMs/version`

## M12 — Pack (GreenPack)
- `tools/pack.ps1` tek komutla: infra + backend + web gate koşar
- Çıktı: konsolda PASS/FAIL

## Ortak kurallar
- REST = CRUD/rapor; WS = canlı güncelleme/bildirim
- DB live/history ayrımı: `GpsLast` + `GpsPoint`
- GPS policy: canlı 10sn; history gate 30sn/50m (uygulanır)
- Scope/rooms: `company:{id}`, `room:{id}`, `vehicle:{id}`, `shift:{id}`
