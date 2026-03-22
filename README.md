# SERVIS-PLATFORM — PERSONEL SERVİS V1

Bu repo, **servis aracı sağlayıcıları ile servis ihtiyacı olan firma / okul / organizasyonları buluşturan teklif–pazarlık–uzlaşma pazaryeri + operasyon yönetim platformunun** canlı çalışma ağacıdır.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Primer SSOT: `docs/PRIMER_SSOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Project spec: `docs/PROJECT_SPEC_V1.md`
- API spec: `docs/API_SPEC_V1.md`
- DB spec: `docs/DB_SCHEMA_V1.md`
- UI spec: `docs/UI_SPEC_V1.md`
- Overlay notları: `docs/overlays/`

## Güncel dürüst durum (2026-03-20)
- Repo **post-M66 functional** durumdadır.
- `M59 -> M65` saha öncesi sertleştirme hattı green taban olarak vardır.
- `M66` operasyonel reassignment fonksiyonel olarak eklidir.
- Ancak `M59 -> M66` için baştan aşağı yeniden kontrol, canlı smoke ve saha testi **henüz tamamlanmış sayılmaz**.
- Büyük repo cleanup / duplicate / dead code / performans sadeleştirmesi sonraki ana fazdır.

## Yeni tek komut
- Tam master hat: `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`
- Reset + full hat: `tools\reset-and-pack.ps1 -To 66 -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`

## Master pack ne yapar
- `M104 / M105 / M106` statik repo check'lerini çalıştırır.
- `M0 -> M41` gate hattını koşturur.
- `M42 -> M66` pack zincirini sırayla koşturur.
- Sonunda repo audit raporu üretir: `artifacts/repo-audit/repo_audit_latest.json`.

## M66 kısa özet
- ROOM, `APPROVED/ACTIVE` vardiyada araç/sürücü reassignment yapabilir.
- Değişiklik audit + notification + operation event olarak yazılır.
- COMPANY bunu ticari değil operasyonel olay olarak görür.
- Yeni sürücüye görev/rota paketi gider.
- Eski sürücü aktif görevden düşer.

## Çalışma kuralı
- Önce SSOT güncellenir.
- Sonra milestone gerçek duruma göre açılır ya da kapatılır.
- Checklist'te `[x]` yalnızca resmi pack/check green sonrası işaretlenir.
- Green taban ile tam saha doğrulaması aynı şey değildir; saha öncesi yeniden kontrol ayrıca yapılır.

## Kanonik tools düzeni
Tools tarafinda kanonik giris tools\pack.ps1 dosyasidir. Tools hijyen kontrolu için tools\check_tools_hygiene_m105.ps1 kullanilir.

## M57 / M58 durum notu
- M57 — Mobile Hardening resmi green tabanındadır.
- M58 — Final Pilot Readiness komutu: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- M58 manuel pilot kabul / saha kabul olmadan resmi green sayılmaz.

## M59 -> M65 repo-contract markerları
- `M59 — Gözlemleme + Saha Teşhis` pack: `tools\pack_m59_observability_field_diagnostics.ps1`
- `M59 — Gözlemleme + Saha Teşhis` resmi green oldu; aktif hat `M60`.
- `M60 — Saha Acceptance Merkezi` pack: `tools\pack_m60_field_acceptance_center.ps1`
- M60 green olmadan M61 acilmaz.
- `M61 — SSOT + Milestone Hizası` pack: `tools\pack_m61_ssot_milestone_alignment.ps1`
- Docs/SSOT pack: `tools\pack_docs_ssot.ps1`
- M61 SSOT + Milestone Hizası PACK PASS OK.
- `M62 — Ticari Omurga Güçlendirme` pack: `tools\pack_m62_commercial_core_strengthening.ps1`
- M62 green olmadan M63 acilmaz.
- `M63 — Güven + Kalite + Hizmet Değerlendirme` pack: `tools\pack_m63_trust_quality_service_evaluation.ps1`
- `M64 — Doğal Copilot Katmanı` pack: `tools\pack_m64_natural_copilot_layer.ps1`
- `M65 — Pilot Launch Gate` pack: `tools\pack_m65_pilot_launch_gate.ps1`
