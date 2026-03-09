# M32 — Template UI Refactor (Wizard‑style)

Amaç: Company tarafında **“Vardiya Şablonları”** ekranını, Agreement Wizard’daki gibi **plan paketi + günler + süre** mantığıyla hizalamak.

## Kullanıcı kazanımı
- Şablon oluşturma daha anlaşılır: paket seç → günleri seç → süre seç → kaydet.
- Şablonlar “Yeni Talep” ekranında saatleri otomatik doldurur.
- Bundle paketlerde (Sabah+Akşam) tek tek “Kullan (Sabah)” / “Kullan (Akşam)” butonları.

## Teknik not
- Şablonlar company bazlı **localStorage**’da tutulur.
- Eski (v1) şablonlar otomatik migrate edilir.

## DoD
- Company → Shifts → Vardiya Şablonları: paket/gün/süre UI görünür.
- Custom şablon ekle/sil/düzenle çalışır.
- Yeni Talep ekranında template dropdown çalışır ve Start/End doldurur.
- `tools/pack.ps1 -To 32` PASS.
