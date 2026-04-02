# VARDIS / PERSONEL SERVİS V1

<!-- TOOLS_HYGIENE_CANONICAL_V1 -->

Bu repo, okul ve kurumsal taşıma alanlarını birlikte taşıyan; **pazar + sözleşme + operasyon** omurgasında çalışan canlı ürün ağacıdır.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Primer SSOT: `docs/PRIMER_SSOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Milestone registry: `docs/MILESTONE_REGISTRY_V1.md`
- Parent access akışı: `docs/PARENT_ACCESS_FLOW.md`
- Overlay geçmişi: `docs/overlays/`

## Güncel dürüst durum (2026-04-01)
- Baz alınacak gerçek: kullanıcının verdiği en güncel repo snapshot’ı.
- Son doğrulanan temiz durum: `MASTER PACK PASS OK (M0->M79)` ve `REPO AUDIT MASTER PASS`.
- `M79` Copilot acceptance turu repo gerçeğinde kapalı kabul edilir.
- `tools/STABLE_TO.txt` değeri M78.x uyumluluk kontrolleri için bilinçli olarak `78` kalır; bu, son tam master doğrulamanın `M79` olduğu gerçeğini bozmaz.
- Parent Access / Veli Erişimi akışı artık hesap daveti değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır.
- Legacy auth invite ürün yüzeyinden kaldırılmıştır.
- OSRM kodu repoda durur ama default compose modu bilinçli olarak sade/fallback çalışır.
- Ürün kodu geri alınmaz; pack/check/runbook/doc yeni gerçeğe uydurulur.

## Kanonik komutlar
- Son tam master doğrulama referansı: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Living static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doğrulama: `tools\verify_living_runtime.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M79 acceptance: `tools\pack_m79_copilot_acceptance.ps1 -RepoRoot D:\servis-platform`

## Önemli hizalama notu
- Aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.
- `docs/overlays/M80`, `M81`, `M82` klasörleri güncel aktif milestone anlamı değil; Mart 2026 tarihli tarihsel overlay serisidir.
- Bir sonraki aktif ana iş: `M80`.

<!-- REPO_CONTRACT_COMPAT_README_V2
M61 green
M62 — Ticari Omurga Güçlendirme
pack_m62_commercial_core_strengthening.ps1
M59
pack_m59_observability_field_diagnostics.ps1
M63 — Güven + Kalite + Hizmet Değerlendirme
pack_m63_trust_quality_service_evaluation.ps1
M64 — Doğal Copilot Katmanı
pack_m64_natural_copilot_layer.ps1
M65 — Pilot Launch Gate
M66
M66 operasyonel reassignment
post-M66 functional
tools\pack.ps1 -To 66
tools\pack.ps1 -To 76
M75 green baseline
REPO_CONTRACT_COMPAT_README_V2 -->

<!-- REPO_CONTRACT_COMPAT_M78_README_V1
pack_m78_checklist_operasyon_dogrulama.ps1
pack_m78_1_operasyon_dogrulama_yuzeyi.ps1
pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1
pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1
m78 checklist + operasyon dogrulama
REPO_CONTRACT_COMPAT_M78_README_V1 -->

<!-- REPO_CONTRACT_COMPAT_M78_README_V2
tools\pack.ps1 -To 78
tools\pack_m78_checklist_operasyon_dogrulama.ps1
REPO_CONTRACT_COMPAT_M78_README_V2 -->


## Repo contract state
- Makine-okur durum özeti: `tools\repo_contract_state.json`
- State-first docs-contract kuralı: önce `repo_contract_state.json`, sonra markdown anlatımı okunur.


## Root orchestration
- root lint: `npm run lint`
- hot-path smoke: `npm run verify:hot`
- docs/contract smoke: `npm run verify:docs`
- repo audit: `npm run audit:repo`
