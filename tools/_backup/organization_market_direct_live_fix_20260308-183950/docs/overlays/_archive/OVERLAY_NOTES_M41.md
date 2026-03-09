# OVERLAY M41 — Company Shifts: Accordion sayaç + hızlı aç/kapat

## Amaç
- Company Shifts ekranında **Market / Bekleyen / Liste** bloklarını accordion hale getir.
- Accordion header’da **sayaç** (filtre sonrası görünen adet) göster.
- Sticky Hızlı Filtre barına **Hepsini Aç / Hepsini Kapat** ekle.

## Değişen dosyalar
- `web/src/panels/company/ShiftsPanel.jsx`
  - M41: `accOpen` state + `openAllAcc/closeAllAcc/toggleAcc/ensureAcc`
  - Focus event (company:shifts:focus) market/pending section’ı otomatik açar.
  - UI: Market/Pending/List header’larda sayaç + Aç/Kapat + toggle.
  - Sticky bar: Hepsini Aç / Hepsini Kapat.
- `web/src/index.css`
  - `pill[data-status="COUNT"]` stili.

## Not
- Sayaçlar, mevcut filtrelerin uygulanmış halindeki liste uzunluğunu gösterir.
