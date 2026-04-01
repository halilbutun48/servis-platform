# M81.7 — Demo Accounts kartı + Prisma User.notifications hotfix

> Tarihsel not (2026-04-01): Bu dosyadaki M80/M81/M82 numarası Mart 2026 overlay serisine aittir. Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.


## Amaç
- SUPER_ADMIN Overview ekranında seed ile gelen demo hesapların tek bakışta görünmesi.
- M81.x Notification USER scope değişiklikleri sonrası Prisma hatası: `Notification.user` relation'ın karşılığı `User` modelinde eksik kalmıştı.

## Değişiklikler
### Web
- `web/src/panels/superadmin/SuperAdminPanel.jsx`
  - "Demo Accounts (seed)" kartı eklendi
  - demo123 şifre + mail kopyalama butonları

### Backend (Prisma)
- `tools/patch-m81_7-prisma-user-notifs.ps1`
  - `backend/prisma/schema.prisma` içinde `model User` bloğuna şu satırı ekler (yoksa):
    - `notifications Notification[]`

## Uygulama
1) overlay zip'i repo root'a extract
2) `tools/patch-m81_7-prisma-user-notifs.ps1` çalıştır
3) docker build / reset-pack tekrar
