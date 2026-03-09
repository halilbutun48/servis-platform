# OVERLAY M36 — UI Polish (Company+Room) + Missing M35 Gate Script

Tarih: 2026-02-26 (Europe/Istanbul)

Bu overlay iki şeyi tek seferde düzeltir:

1) **Company + Room UI görsel/UX iyileştirmesi** (işlev aynı, görünüm/okunabilirlik daha iyi)
- Global UI helper class’ları eklendi: `.row`, `.btn`, `.btn.primary`, `.btn.sm`, `.toolbar`, `.kpiGrid`, `.kpiCard`.
- Company **Planlama Merkezi** (WorkflowPanel) daha “dashboard” gibi: KPI kartları + **Açık Teklifler modal** artık gerçek modal overlay.
- Room **Offers**: butonlar/approve modal daha okunaklı (modal overlay + primary button).
- Room **Shifts**: bekleyen talepler filtresi + kritik aksiyon butonları (önizle, room teklifi, gönder/kaldır) daha kompakt.

2) **"m35check.js yok" sorunu**
- `backend/scripts/m35check.js` eklendi.
- `tools/gate.ps1` ve `tools/pack.ps1` artık `-To 35` destekler.
- M35CHECK şunları doğrular:
  - COMPANY: `/api/plan-builder/precheck` OK
  - COMPANY: market shift oluşturur + ROOM’a offer gönderir
  - ROOM: `/api/shifts?includeOffered=1` içinde shift görünür
  - ROOM: `/api/shifts/:id/route-preview` offer-scope ile açılır

## Değişen dosyalar
- `web/src/index.css`
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `tools/gate.ps1`
- `tools/pack.ps1`
- `backend/scripts/m35check.js`

## Notlar
- Bu overlay **backend işlevini değiştirmez**, sadece gate script + UI polish.
- UI tarafı tamamen CSS + markup düzenlemesi; mevcut API contract’lar korunur.
