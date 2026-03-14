# M47 — KVKK Notice / Consent Framework

## Amaç
Minimal KVKK gate yapısını ürün içinde daha anlaşılır ve sürümlemeli hale getirmek.

## Kapsam
- Rol bazlı KVKK belge kayıt listesi
- `LOCATION_NOTICE` ve `LOCATION_CONSENT` için current version registry
- `GET /api/kvkk/documents/current`
- `GET /api/kvkk/summary`
- `POST /api/kvkk/consents/accept-many`
- `/api/me` içinde KVKK özet alanı
- Web shell içinde gerçek KVKK modal gate render
- Kabul / geri alma audit kayıtları

## Beklenen davranış
- DRIVER ve PARENT kullanıcılarında gerekli KVKK belgeleri eksikse ekran bloklanır.
- Kullanıcı tek butonla gerekli belgeleri kabul edebilir.
- Rıza geri alınırsa KVKK blocking tekrar aktif olur.
- Canlı konum gate mantığı mevcut `LOCATION_CONSENT` kuralını bozmadan devam eder.

## Kabul kriteri
- `tools/pack_m47_kvkk_notice_consent_framework.ps1` PASS
- runtime check PASS
- repo contract PASS
- M46.9 zinciri korunur
