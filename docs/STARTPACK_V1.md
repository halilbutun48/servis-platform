# STARTPACK V1

## Temel kurallar
1. Monorepo modüler yapıda ilerler: backend / web / mobile / infra / docs / tools.
2. Post-M41 pack script'leri self-only calisir; tam `M42 -> M57` green hatti ve kanonik komut `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild` seklindedir.
3. Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
4. Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
5. Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
6. Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
7. Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
8. Checklist'te `[x]` yalnızca resmi green sonrası işaretlenir.

## Kanonik komutlar
- `tools\pack.ps1 -To 41`
- `tools\pack_m55_reports_no_show.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m56_kvkk_eta_quality.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild`

## Resmi durum
- `M51–M53`, `M54.3`, `M54.4`, `M55`, `M56`, `M57` ve dış post-M41 runner pack-green olarak geçti.
- `M57` full pack green; scaffold komutu bilgi/kontrat doğrulama için korunur.
- Sonraki ana urun hatti `M58 — Final Pilot Readiness` olarak devam eder.

## M57 full pack
- Komut: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`
- Kapsam: `M57.1` foreground GPS publish, `M57.2` offline/online toparlama, `M57.3` session + KVKK blocking, `M57.4` Android preview/internal build disiplini.

## M57 scaffold notu
- Komut: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- Bu komut resmi green yerine dosya/runbook/check hazirligini hizli doğrular.
