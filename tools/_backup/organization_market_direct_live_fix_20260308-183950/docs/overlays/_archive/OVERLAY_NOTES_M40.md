# OVERLAY M40 — Company Shifts Premium UX + Map Nav (Main) + Sözleşmeler

Tarih: 2026-02-26

## 1) Nav düzeni (Company + Room)
- **Harita** artık **Gelişmiş altında değil**: Ana menüde, en üstte.
- **Hub** artık **Gelişmiş** altında.
- Company/Room Agreements menü adı: **Sözleşmeler**.

Dosya: `web/src/layout/NavDock.jsx`

## 2) Company Shifts (yorucu ekran) — Premium UX
- Market / Bekleyen / Liste bölümleri **accordion** (aç/kapat).
- Üstteki **sticky Hızlı Filtre** korunur.
- Bekleyen + Liste tabloları **özet satır + detay aç/kapat**:
  - Default görünüm sade.
  - Detay satırında teklif özetleri + (varsa) karşı teklif formu.
- Accordion açık/kapalı durumu localStorage’da tutulur: `company:shifts:accordion`.

Dosya: `web/src/panels/company/ShiftsPanel.jsx`

## 3) UI CSS
- Accordion header/body + detay grid stilleri eklendi.

Dosya: `web/src/index.css`

## 4) Başlıklar
- Company/Room Agreements panel başlıkları: **Sözleşmeler**.

Dosyalar:
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/room/AgreementsPanel.jsx`
