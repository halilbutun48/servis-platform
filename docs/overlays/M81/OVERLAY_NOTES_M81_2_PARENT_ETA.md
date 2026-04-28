# OVERLAY_NOTES_M81_2 — Parent ETA

> Tarihsel not (2026-04-01): Bu dosyadaki M80/M81/M82 numarası Mart 2026 overlay serisine aittir. Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.


Tarih: 2026-03-02

## Amaç
Parent (PARENT role) panelinde seçili çocuk için **ETA (yaklaşık)** göstermek.

## Backend
- `GET /api/parent/live/vehicles?childId=` artık her araç için şu alanları döner:
  - `etaToChildMin` (dakika)
  - `etaToChildKm` (km)
  - `etaTarget` (STOP/HOME)
- Hesap:
  1) Eğer `StopAssignment` varsa, çocuğun bağlı olduğu **Stop** noktasına göre ETA
  2) Yoksa `Personel.homeLat/homeLng` (ev) ile fallback

> Not: Hâlâ KVKK time-window gate geçerli (shift startAt<=now<=endAt).

## Web
- `Veli • Canlı Takip` ekranında haritanın üstünde ETA özet kartı eklendi.

## DoD
- Parent login → çocuk seç → araç listesinde `ETA: X dk` görünür.
- StopAssignment varsa hedef adı (durak) görünür.
