# OVERLAY — M81.0.1 — Hotfix (Prisma + GuidedPlanModal)
Tarih: 2026-03-02

## Fixes
- **Prisma schema**: yanlışlıkla commitlenmiş `__KEEP__` placeholder satırı kaldırıldı (schema validation P1012 fix).
- **Web**: `GuidedPlanModal.jsx` içinde `me` değişkeni iki kez tanımlanıyordu (Session `me` + local `useState`).
  - Local `me` state + `/api/me` fetch kaldırıldı; SessionProvider zaten `/api/me` yüklediği için aynı bilgi mevcut.

## Etki
- `npx prisma generate/db push` ve docker build sırasında `prisma generate` artık patlamaz.
- Vite dev build `Identifier 'me' has already been declared` hatası kalkar.
