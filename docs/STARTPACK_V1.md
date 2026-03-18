# STARTPACK V1

## Temel kurallar
1. Monorepo modüler yapıda ilerler: backend / web / mobile / infra / docs / tools.
2. Ürün kimliği **B2B servis pazaryeri + operasyon platformu**dur.
3. Post-M41 tam hat için kanonik komut `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild` seklindedir.
4. `M58 hazirlik komutu` olarak `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform` korunur; `manuel pilot kabul` notu tarihsel olarak saklanır.
5. Yeni resmi rota `M59 → M65` olarak ilerler.
6. Saha testi en son adımdır; `M65` green olmadan sahaya çıkılmaz.
7. Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
8. Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
9. Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
10. Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
11. Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
12. Checklist'te `[x]` yalnızca resmi green sonrası işaretlenir.

## Kanonik komutlar
- `tools\pack.ps1 -To 41`
- `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`

## Resmi durum
- `M58` teknik readiness gate'i pack-green olarak geçti.
- `M58` paketi repo hazirligini kontrol eder; `manuel pilot kabul` notu tarihsel olarak korunur.
- Sonraki ana ürün hattı `M59 — Gözlemleme + Saha Teşhis` olarak açılır.
- `M59` bitmeden `M60`a geçilmez.
- Saha öncesi hat: `M59 → M60 → M61 → M62 → M63 → M64 → M65`.

## M59 başlangıç notu
- Komut: `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`
- Kapsam: mobil sağlık olayları, cihaz sağlık özeti, GPS güven skoru, sorun bildir, room/super admin gözlem paneli, vardiya olay akışı iskeleti.
- Bu milestone saha testinden önce sistemi görünür hale getirmek için açılır.
