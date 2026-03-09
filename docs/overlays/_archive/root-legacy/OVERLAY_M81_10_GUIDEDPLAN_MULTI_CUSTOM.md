# OVERLAY — M81.10 — GuidedPlanModal: Multi Custom (2+ vardiya)

Tarih: 2026-03-03

## Amaç
Guided Mode / `GuidedPlanModal.jsx` içinde **"Özel" plan paketini tek vardiya ile sınırlamadan**, sabah+akşam gibi **2 vardiyalı** (hatta 3'e kadar) custom plan tanımlayabilmek.

## Ne değişti?
- `Plan paketi` adımında **"Özele çevir (düzenle)"** butonu eklendi.
  - Seçili preset paketin slot(lar)ını **CUSTOM** editöre taşır.
  - Böylece `Hafta içi • Sabah + Akşam` gibi 2 vardiyalı paketlerde saat/direction/pattern düzenlenebilir.
- `CUSTOM` editörü artık **çoklu vardiya** destekler:
  - Vardiya kartları (label + start/end + direction + pattern)
  - `+ Vardiya ekle` (max 3)
  - `Kaldır` (2+ olduğunda)
- Backend tarafında zaten var olan draft üretim döngüsü (day x slot) aynen çalışır; sadece UI/plan-input genişledi.

## Dosyalar
- `web/src/panels/company/GuidedPlanModal.jsx`

## DoD
- Guided Mode → Plan paketi:
  - Preset seç → **Özele çevir** → 2 vardiya kartı görünür
  - Saat/direction/pattern değiştir → Taslak oluştur → 2 shift oluşur
- `CUSTOM` seç → `+ Vardiya ekle` → 2 vardiya ile taslak üretir

