# VARDIS / PERSONEL SERVİS V1

<!-- TOOLS_HYGIENE_CANONICAL_V1 -->

Bu repo, okul/öğrenci/veli ile şirket/personel taşıma alanlarını aynı omurgada birleştiren; **pazar + sözleşme + operasyon** yaklaşımıyla çalışan canlı ürün ağacıdır.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Primer SSOT: `docs/PRIMER_SSOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Milestone registry: `docs/MILESTONE_REGISTRY_V1.md`
- Tek rehber: `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- 10/10 kabul kapısı: `docs/KABUL_KRITERLERI_10_10_VARDIS.md`
- Parent access akışı: `docs/PARENT_ACCESS_FLOW.md`
- Overlay geçmişi: `docs/overlays/`

## Güncel dürüst durum (2026-04-08)
- Repo: `servis-platform`
- Branch: `main`
- Güncel doğrulanmış baz: `MASTER PACK PASS OK (M0->M89)`
- Tarihsel temiz anchor korunur: `MASTER PACK PASS OK (M0->M79)`
- Tarihsel anchor ile yaşayan üst hat aynı repo üzerinde birlikte taşınır.
- Güncel üst hat: `M80`, `M80.1`, `M80.2`, `M80.3`, `M81`, `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`, `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`
- Sonraki kontrollü iş: `M90 — Canonical Closure / 10-10 kapanış paketi`
- State-first kuralı geçerlidir: önce `tools/repo_contract_state.json`, sonra markdown anlatımı okunur.
- Parent Access / Veli Erişimi akışı artık legacy auth invite değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır.
- Ürün kodu geri alınmaz; pack/check/runbook/docs yeni canonical gerçeğe uydurulur.

## Kanonik komutlar
- Master pack: `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Living static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doğrulama: `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M82.1 backend correctness: `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- M82.8 verification 2.0: `tools\pack_m82_8_verification_2_0.ps1 -RepoRoot D:\servis-platform`
- M83 saha hazırlık paketi: `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`
- M84 saha geri bildirim döngüsü: `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`
- M85 opsiyonel ödeme pilotu: `tools\pack_m85_optional_payment_pilot.ps1 -RepoRoot D:\servis-platform`
- M86 zorunlu ödeme rollout: `tools\pack_m86_required_payment_rollout.ps1 -RepoRoot D:\servis-platform`
- M87 ödeme hesabı hazırlığı: `tools\pack_m87_payment_account_readiness.ps1 -RepoRoot D:\servis-platform`
- M88 settlement operasyon masası: `tools\pack_m88_settlement_operations_console.ps1 -RepoRoot D:\servis-platform`
- M89 settlement mutabakat masası: `tools\pack_m89_settlement_reconciliation_desk.ps1 -RepoRoot D:\servis-platform`

## Kanonik / tarihsel ayrımı
- `README.md`, `docs/README.md`, `docs/PRIMER_SSOT.md`, `docs/STARTPACK_V1.md`, `docs/CHECKLIST_SSOT.md`, `docs/MILESTONE_REGISTRY_V1.md`, `docs/NEXT_BACKLOG_V1.md`, `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`, `tools/README.md`, `tools/PRIMER_SNAPSHOT.md`, `tools/CHECKLIST_SSOT.md` güncel canonical yüzeydir.
- `docs/overlays/` ve `docs/_archive/` tarihsel kayıttır; güncel milestone anlamı bu klasörlerden okunmaz.
- Eski script guide sürümleri tarihsel yönlendirme dosyasına çevrilmiştir; aktif rehber tek dosyadır.

## Proof / kabul ilkesi
- Screenshot ana kanıt değildir.
- Ana kanıt sırası: state/marker -> check çıktısı -> log/export -> panel manifest izi -> screenshot.
- Screenshot yalnızca görsel destek ve düzen/regresyon kanıtı olarak kullanılır.

## Root orchestration
- root lint: `npm run lint`
- hot-path smoke: `npm run verify:hot`
- mobile acceptance: `npm run acceptance:mobile` (mobile klasörü içinde)

## REPO_CONTRACT_MARKERS_V1
- README_LIVING_ROUTE_M59_M89_V1
- README_ROUTE_M63_V1
- README_ROUTE_M64_V1
- README_ROUTE_M65_V1
- M75_GREEN_BASELINE_MARKER_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1
- NO_FIELD_TEST_BEFORE_CONTROLLED_SIGNOFF_V1
