# STARTPACK_V1 — SERVIS-PLATFORM (PERSONEL SERVİS V1)
Tarih: 2026-03-07  
Timezone: Europe/Istanbul

Bu dosya repo için kısa runbook’tur.

## 1) Golden rules
1. Ana kanıt `tools/pack.ps1 -To 41`
2. M42 ayrı optional release’tir; kanıtı `tools/pack_m42_optional.ps1`
3. Ana zincire zorla `m42check.js` eklenmez
4. Değişiklik olursa docs aynı overlay içinde güncellenir

## 2) Doğrulama standardı
- **Mainline:** `tools/pack.ps1 -To 41`
- **Optional M42:** `tools/pack_m42_optional.ps1`
- `reset-and-pack.ps1` / auto milestone mantığı ana zincir içindir

## 3) M42 Optional Release özeti
- default OFF
- ON iken credential issue / revoke / scan / dedupe / events
- kapalıyken fail-closed ve yan etkisiz

## 4) Kritik not
`backend/scripts/m42check.js` adıyla dosya ekleme; aksi halde auto milestone akışı yanlışlıkla M42’ye kayar.


## Son paket notu
- M42 UI optional: QR canvas + driver camera tarama
- SCHOOL parent akışı: link üretimi, self-serve accept, parent id/şifre paylaşılmaz

- Manual smoke sonucu: Driver kamera UI açılıyor; destek olmayan desktop/tarayıcıda fallback mod kabul. Parent invite revoke/expired/used/not-found durumları artık formu kapatır. Public paylaşım linki için `VITE_PUBLIC_BASE_URL` kullanılır.
