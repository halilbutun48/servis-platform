# M28 — One-Click Flow (Company premium UX)

Tarih: 2026-02-23 (Europe/Istanbul)

## Amaç
Sahada "az tık" hedefi:
- Company: bugün özetleri (Agreements / Shifts / Açık Teklifler)
- Wizard sonrası: 1 tık ile **market shift aç + teklif modalını otomatik aç**
- Room: offers inbox içinde **Shift’e git** (listeyi otomatik filtrele)

## Kapsam

### Backend
- `GET /api/offers/company` (COMPANY)
  - Tüm shift’ler üzerinden company’ye ait teklifleri listeler
  - `status=OPEN,COUNTERED,...` filtresi destekler
- `GET /api/offers/inbox` ve `GET /api/offers/shift/:shiftId`
  - `status=` filtresi eklendi

### Web
- Company `/company` (WorkflowPanel)
  - Bugünkü Agreements sayısı
  - Bugünkü Shifts sayısı
  - Açık Teklif sayısı (OPEN+COUNTERED)
  - Geo Review uyarısı + link
- Agreement Wizard
  - Başarılı oluşturma sonrası: **"Room’lara Teklif Topla (Market)"**
    - 1 adet market shift oluşturur
    - Company Shifts panelinde otomatik offer modal açılır
- Room Offers inbox
  - Status filtresi + arama
  - **Shift’e Git** butonu (Room Shifts panelinde filtreyi otomatik doldurur)

## DoD
- `tools/pack.ps1 -To 28` PASS
- `node scripts/m28check.js` PASS

## Dosyalar
- `backend/src/routes/offers.js`
- `backend/scripts/m28check.js`
- `tools/gate.ps1`
- `tools/pack.ps1`
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/company/AgreementWizard.jsx`
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
