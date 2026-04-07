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

## Güncel dürüst durum (2026-04-07)
- Baz alınacak gerçek: kullanıcının verdiği en güncel repo snapshot’ı.
- Tarihsel son tam master referansı: `MASTER PACK PASS OK (M0->M79)`.
- Repo üstünde bunun üstüne gelen yaşayan hat mevcut:
  - `M80`, `M80.1`, `M80.2`, `M80.3`
  - `M81`
  - `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`
  - `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`
- Bu üst hat için pack/check/runbook dosyaları repo içinde vardır; living verify zinciri yeniden koşturulmaktadır.
- `tools/STABLE_TO.txt` değeri tarihsel uyumluluk marker’ı olarak içeride ayrı tutulabilir; bu, repo üstündeki yaşayan hattı inkâr etmez.
- Parent Access / Veli Erişimi akışı artık hesap daveti değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır.
- Legacy auth invite ürün yüzeyinden kaldırılmıştır.
- OSRM kodu repoda durur ama default compose modu bilinçli olarak sade/fallback çalışır.
- Ürün kodu geri alınmaz; pack/check/runbook/doc yeni gerçeğe uydurulur.
- Tarihsel kalite rotasında M59 gözlemleme hattı ve M65 launch gate kuralı korunur; saha testi M65 öncesi açılmaz ve M75 green baseline sonrası kullanıcı kararıyla ilerlenir.

## Kanonik komutlar
- Master pack: `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Living static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doğrulama: `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M82.8 verification: `tools\pack_m82_8_verification_2_0.ps1 -RepoRoot D:\servis-platform`
- M83 saha hazırlık paketi: `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`
- M84 saha geri bildirim döngüsü: `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`
- M85 opsiyonel ödeme pilotu: `tools\pack_m85_optional_payment_pilot.ps1 -RepoRoot D:\servis-platform`
- M86 zorunlu ödeme rollout: `tools\pack_m86_required_payment_rollout.ps1 -RepoRoot D:\servis-platform`
- M87 ödeme hesabı hazırlığı: `tools\pack_m87_payment_account_readiness.ps1 -RepoRoot D:\servis-platform`
- M88 settlement operasyon masası: `tools\pack_m88_settlement_operations_console.ps1 -RepoRoot D:\servis-platform`
- M89 settlement mutabakat masası: `tools\pack_m89_settlement_reconciliation_desk.ps1 -RepoRoot D:\servis-platform`

## Önemli hizalama notu
- Aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.
- `docs/overlays/M80`, `M81`, `M82` klasörleri güncel aktif milestone anlamı değil; Mart/Nisan 2026 tarihli tarihsel overlay serisidir.
- Tarihsel full master referansı `M79` olarak korunur; yaşayan repo hattı bunun üstünde `M80→M89` genişlemesini taşır.
- Teknik kabul katmanı ve ticari/finans omurgası artık aynı repo üzerinde birlikte yaşar.
- Saha testleri ve finans rollout’ları kullanıcı kararıyla kontrollü yapılacaktır.

## Repo contract state
- Makine-okur durum özeti: `tools\repo_contract_state.json`
- State-first docs-contract kuralı: önce `repo_contract_state.json`, sonra markdown anlatımı okunur.

## Root orchestration
- root lint: `npm run lint`
- hot-path smoke: `npm run verify:hot`
- docs/contract smoke: `npm run verify:docs`
- repo audit: `npm run audit:repo`
