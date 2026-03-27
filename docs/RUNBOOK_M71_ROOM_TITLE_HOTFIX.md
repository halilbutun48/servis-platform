# M71 Room Title Hotfix

Amaç:
- `Room` modelinde olmayan `title` alanına yapılan Prisma select çağrılarını kaldırmak.
- `/api/company/overview/commercial-flow-summary` sırasında oluşan backend crash'i durdurmak.

Değişiklikler:
- `backend/src/routes/companyOverview.js`
- `backend/src/routes/agreements.js`

Kontrol:
- `tools/pack_m71_room_title_hotfix.ps1`
