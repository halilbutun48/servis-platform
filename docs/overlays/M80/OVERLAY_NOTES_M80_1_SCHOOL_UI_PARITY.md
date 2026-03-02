# OVERLAY — M80.1 — School UI parity (labels + georeview default STUDENT)

Tarih: 2026-03-02 (Europe/Istanbul)

## Amaç
Okul (Company.kind=SCHOOL) için Company UI’nın metinlerini **okul diline** yaklaştırmak ve georeview ekranını **varsayılan STUDENT** filtreyle çalıştırmak.

## Değişiklikler
- UI etiketleri:
  - "Personel" → **"Öğrenci"** (akış/step/başlık/hint)
  - bazı boş-state metinleri okul varyantına uyumlu hale getirildi.
- `GeoReviewPanel`:
  - SCHOOL ise `/api/company/personels?geoStatus=NEEDS_REVIEW&kind=STUDENT`
  - aksi halde eski davranış korunur.
- Company içindeki hard-coded `/company/...` linkleri:
  - school base’e göre normalize edildi (örn. georeview linki).

## Not
Bu overlay **DB değişikliği yapmaz** (M80.0’daki Company.kind/Personel.kind üstüne UI tarafı).
