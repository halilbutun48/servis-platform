# NEXT BACKLOG V1

Tarih: 2026-03-18
Timezone: Europe/Istanbul

Current direction: **M57 green -> M58 Final Pilot Readiness**

## 1) Resmi durum
- `M55` green.
- `M56` green.
- `M57 green`.
- Post-M41 external runner full `M42 -> M57` green hattını koşar.

## 2) M57 closure
- `M57.1` foreground GPS publish green.
- `M57.2` offline/online toparlama green.
- `M57.3` session failure + KVKK blocking green.
- `M57.4` Android preview/internal build disiplini green.
- Android preview/internal build disiplini green ifadesi `app.json + eas.json + .env.example + Today release karti + mobile checker` hattı ile kanıtlandı.

## 3) Sonraki ana odak — M58
- final pilot checklist
- saha testi akışları
- mobil gerçek cihaz / preview build doğrulaması
- operasyon runbook son sadeleştirme
- release notu / rollout kararı
- pilot kabul formu / manuel signoff

## 4) Kanonik komutlar
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`

## 5) M58 kabul notu
- M58 paketi repo hazirligini kontrol eder.
- M58 resmi green sayimi icin ek olarak saha kabul ve manuel pilot signoff gerekir.
- Cikis karari tek satir olmalidir: `GO`, `LIMITED GO` veya `NO-GO`.

## 6) Sonraki ilk cümle
Repo su an `M57`'ye kadar resmi green; `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform` ile M58 pilot hazirlik kontrati kontrol edilebilir.
