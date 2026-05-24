# SEFERPAKT / PERSONEL SERVİS V1

<!-- TOOLS_HYGIENE_CANONICAL_V1 -->

SeferPakt, servis tedarikini buluşturan, sözleşmeden vardiyaya otomatik operasyon kuran, canlı GPS ve kanıtla servisi denetleyen, kaliteye göre hakedişi güvenli önizleyen ve yapay zekâ ile maliyet/saha risklerini önceden yakalayan kurumsal servis operasyon platformudur.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Primer SSOT: `docs/PRIMER_SSOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Docs/brand cleanup audit: `docs/DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md`
- Milestone registry: `docs/MILESTONE_REGISTRY_V1.md`
- Tek rehber: `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- 10/10 kabul kapısı: [KABUL_KRITERLERI_10_10.md](docs/KABUL_KRITERLERI_10_10_VARDIS.md) (historical evidence)
- Parent access akışı: `docs/PARENT_ACCESS_FLOW.md`
- Overlay geçmişi: `docs/overlays/`

## Mevcut teknik fotoğraf
- Kapasite/load baz cizgisi tekil infra envelope üzerinde okunur: `1x api + 1x db + 1x redis + 1x osrm + 1x solver`.
- 500 araç cliff'i queue/worker split ile kapandı; 1000 araç 120s staggered kısa ve soak temiz.
- 2 yıllık retention politikasında `GpsPoint` ile `AuditLog` aynı sınıfta değildir; archive / hot ayrımı yapılır.
- Region/sharding yönü logical region, super-admin yüzeyleri ve field rollout runbook ile resmi hale geldi.
- `autoReachedQueue` minimal safe queue'dur; Redis down / worker crash / handoff sınırları ayrıca runbook ile belgelenir.
- Clean-clone doğrulama yolu: `tools\verify_clean_clone.ps1`

## Güncel dürüst durum (2026-04-19 gece)
- Repo: `servis-platform`
- Branch: `m90d1_web_lint_inventory`
- Güncel çalışma notu: `verify:repo`, `verify:ci`, `verify:final` ve `pack_living` yeşildir.
- Repo check chain: `PASS 20 / FAIL 0`; selected static milestone set: `PASS 88 / FAIL 0 / SKIP 74`.
- CI fresh runner hazırlığı workflow içinde explicit: `npm --prefix backend ci` ve `npm --prefix web ci`.
- M91 route preview / source shift / ops bridge hattı ve M92 repo verification spine doğrulanmıştır.
- Tools/docs reorganizasyonu Tur 1 / Tur 2 / Tur 3 kapanmıştır; wrapper + compat alias görünürlüğü tamamlanmıştır.
- Closure compatibility görünürlüğü için `M90B.1`, `M90C.6`, `M90C.7`, `M90C.8`, `M90C.9` referansları korunur; bu görünürlük yeni büyük reorganizasyon çağrısı değildir.
- Güncel doğrulanmış baz: `MASTER PACK PASS OK (M0->M89)`
- Tarihsel temiz anchor korunur: `MASTER PACK PASS OK (M0->M79)`
- Tarihsel anchor ile yaşayan üst hat aynı repo üzerinde birlikte taşınır.
- Güncel üst hat: `M80`, `M80.1`, `M80.2`, `M80.3`, `M81`, `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`, `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`
- Sonraki kontrollü iş: `M90 — Canonical Closure / 10-10 kapanış paketi`
- State-first kuralı geçerlidir: önce `tools/repo_contract_state.json`, sonra markdown anlatımı okunur.
- Parent Access / Veli Erişimi akışı artık legacy auth invite değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır.
- Ürün kodu geri alınmaz; pack/check/runbook/docs yeni canonical gerçeğe uydurulur.

## Kanonik komutlar
- Tek repo kontrol zinciri: `npm run verify:repo`
- Fazli repo kontrolu: `tools\check-repo.ps1 -Phase all`
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
- M91 shift/agreement rota onizleme: `tools\pack_m91_shift_agreement_route_preview.ps1 -RepoRoot D:\servis-platform`
- M92 repo verification spine: `tools\pack_m92_repo_verification_spine.ps1 -RepoRoot D:\servis-platform`

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
- single roof check: `npm run verify:repo`
- milestone static chain: `npm run verify:milestones`
- mobile acceptance: `npm run acceptance:mobile` (mobile klasörü içinde)

## REPO_CONTRACT_MARKERS_V1
- README_LIVING_ROUTE_M59_M89_V1
- README_ROUTE_M63_V1
- README_ROUTE_M64_V1
- README_ROUTE_M65_V1
- M75_GREEN_BASELINE_MARKER_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1
- NO_FIELD_TEST_BEFORE_CONTROLLED_SIGNOFF_V1

## README_WARN_CLEANUP_M90D_V1
- README_ROUTE_M57_MOBILE_HARDENING_V1
- README_ROUTE_M60_FIELD_ACCEPTANCE_V1
- README_ROUTE_M62_COMMERCIAL_CORE_V1
