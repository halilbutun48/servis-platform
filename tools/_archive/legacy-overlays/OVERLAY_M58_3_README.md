# OVERLAY M58.3 (2026-03-06)

Amaç: Room panelinde **Uzatma Talepleri (extend)** listesinin boş kalmasını düzeltmek.

## Ne yapar?
- `web/src/panels/room/AgreementsPanel.jsx` içinde `loadAll()` bölümünü yeniden yazar:
  - `extendItems` artık şu şekilde bulunur:
    - `extendRequestedEndDate` (veya eski isim varyantları) dolu
    - `extendStatus` in (REQUESTED, COUNTERED)  *(PENDING alias toleranslı)*
- Literal `\r\n` kalıntıları temizlenir (Vite/Babel hatası yaşamamak için).

## Uygulama
1) Zip'i repo köküne aç
2) `.	ools\overlay_M58_3_apply.ps1`
3) Web dev server açıksa restart edip sayfayı yenile

Sonra: Room → Sözleşmeler → “Uzatma Talepleri” dolu görünmeli.
