# VARDIS / PERSONEL SERVİS V1

Bu repo, okul ve kurumsal taşıma alanlarını birlikte taşıyan; **pazar + sözleşme + operasyon** omurgasında çalışan canlı ürün ağacıdır.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Primer SSOT: `docs/PRIMER_SSOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Living baseline: `docs/LIVING_BASELINE_M75.md`
- Milestone registry: `docs/MILESTONE_REGISTRY_V1.md`
- Overlay notları: `docs/overlays/`

## Güncel dürüst durum (2026-03-27)
- Teknik yaşayan taban **M75 green baseline** olarak kabul edilir.
- `M0 -> M41`, `M42 -> M58`, `M59 -> M66` ve `M67 -> M75` hatları repo içinde görünür durumda tutulur.
- Ancak tüm zincirin güncel repoda tek tek yeniden koşulmuş olduğu varsayılmaz; bu yüzden living matrix + kontrollü yeniden koşum yaklaşımı kullanılır.
- Bu repo şu anda `M76A-1 minimum normalizasyon` ve `M76B living matrix + tools consolidation` aşamasına hazırlanmıştır.
- Tarihsel uyumluluk notu: repo bir dönem **post-M66 functional** olarak yürütüldü; `M66 operasyonel reassignment` fonksiyonel-open tarihçesi korunur.

## Kanonik komutlar
- Yaşayan master hat: `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- Yaşayan tek giriş: `tools\pack_living.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- Yaşayan static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Yaşayan runtime doğrulama: `tools\verify_living_runtime.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`

## Master pack ne yapar
- `M104 / M105 / M106` statik repo check'lerini çalıştırır.
- `M0 -> M41` gate hattını koşturur.
- `M42 -> M58` teknik baseline pack zincirini koşturur.
- `M59 -> M66` rollout / operasyon pack zincirini koşturur.
- `M67 -> M75` kurumsal ölçek ve hot-path pack zincirini koşturur.
- Sonunda repo audit raporu üretir: `artifacts/repo-audit/repo_audit_latest.json`.

## Kanonik tools düzeni
Tools tarafında dışarıda yalnızca giriş komutları görünür tutulur. Faz bazlı yaşayan girişler `tools\packs\living\` altında, yardımcı doğrulama girişleri `tools\checks\living\` altında toplanır. Eski root pack/check dosyaları uyumluluk için korunur; tek seferde taşınmaz.

## Çalışma kuralı
- Önce ölç, sonra düzelt, sonra tekrar ölç.
- Checklist'te `[x]` yalnızca resmi pack/check green sonrası işaretlenir.
- Green baseline ile tam saha doğrulaması aynı şey değildir.
- Yeni klasör düzenine geçerken eski root pack/check adları wrapper/uyumluluk mantığıyla korunur.
