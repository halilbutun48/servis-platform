# OVERLAY M37 — UI/UX POLISH (Room expand + Company quick presets)

Tarih: 2026-02-26 (Europe/Istanbul)

## Amaç
- ROOM Shifts tablosunda kalabalığı azaltmak: satır altında “Detay aç/kapat”.
- COMPANY Shifts ekranında üstte sticky “Hızlı Filtre” barı:
  - Bugün / Yarın (gün filtresi)
  - Açık (Liste: APPROVED+ACTIVE) / Active
  - Temizle (gün + q + status + market/pending aramaları reset)

## Değişen Dosyalar
- web/src/panels/room/RoomShiftsPanel.jsx
  - “Tüm Shifts” tablosu sadeleştirildi.
  - Her satır için +/− butonu ile detay satırı açılır:
    - Teklif özetleri (C→R / R→C)
    - Özet bilgiler
    - Haritada Önizle (RoutePreviewModal)

- web/src/panels/company/ShiftsPanel.jsx
  - Global `dayYmd` (Istanbul local) filtresi eklendi (Market + Pending + Liste'ye uygulanır).
  - Sticky “Hızlı Filtre” kartı eklendi:
    - Bugün/Yarın presetleri
    - Açık (OPEN) + Active presetleri (Liste kısmına scroll)
    - Temizle: dayYmd, final/pending/market aramaları ve checkbox'lar sıfırlanır
  - Liste filtresine `OPEN` seçeneği eklendi: APPROVED+ACTIVE

- web/src/index.css
  - UI helper class’ları eklendi: .row, .toolbar, .btn(.sm/.primary), .secondary, hover iyileştirmesi

## Notlar
- Bu overlay sadece UI/UX'tir, backend işlevini değiştirmez.
- Sticky bar `top: 74` ile shellTop altında kalacak şekilde ayarlı.
