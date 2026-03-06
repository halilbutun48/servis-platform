# OVERLAY M59 — Agreement UI clarity (2026-03-06)

Bu overlay, Agreements ekranındaki kafa karışıklığını bitirmek için:

- **Bitiş tarihi** yanında: **(kalan X gün)**
- **Vardiya özeti**:
  - Bugün: `DONE/Toplam`
  - Ufuk (7 gün): `APPROVED/ACTIVE` sayısı
- Not: **Agreement status time-based** (endDate+endMin)

## Backend
- `POST /api/agreements/shift-stats` eklendi

## Web
- Company & Room Agreements panellerinde yeni kolon + tarih etiketi eklendi

## Apply
1) Zip'i repo köküne aç
2) `./tools/overlay_M59_apply.ps1`
3) `./tools/pack.ps1 -To 41`
