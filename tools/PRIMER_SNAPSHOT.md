SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-03-09 (Europe/Istanbul)

0) Durum / Referans

Repo: D:\servis-platform

Ana referans:
- ✅ M41 PACK PASS
- Kanonik komut: `.\tools\pack.ps1 -To 41`

Optional:
- ✅ M42 OPTIONAL PACK PASS
- Kanonik komut: `.\tools\pack_m42_optional.ps1`

Stabil ekler (ayrı doğrulanır):
- Step 0.6 çalışıyor ama ana M41 pack’e gömülü değil
- Kanonik komut: `.\tools\pack_step06_stabil.ps1`

Step 0.6 kapsamı:
- capacity gate
- room pool summary
- auto-split by real available vehicle combination
- split parent cleanup
- school parent invite restore
- shift preview external navigation
- company list click details

1) Kural
- M41 = ana regresyon referansı
- M42 = optional release
- Step 0.6 = ayrı mini-check set
- yeni overlay notları repo root’a değil `docs/overlays/` altına gider
- değişiklikler mümkün olduğunca tek overlay zip paket olarak hazırlanır
- yanıtlarda en fazla 3 PowerShell komutu

2) Yeni sohbette önerilen sıra
- önce Step 0.6’yı resmi mini-check ile sabit tut
- sonra V1.5 Minimum Security başlat:
  - WAF
  - TOTP
  - refresh reuse detection
  - RBAC deny-by-default

3) Kullanılacak dosyalar
- `tools/CHECKLIST_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `docs/overlays/STEP06/README.md`