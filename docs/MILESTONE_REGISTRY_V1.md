# MILESTONE REGISTRY V1

Bu dosya yaşayan milestone omurgasının tek resmi kaydıdır.

## Tarihsel teknik taban
- M58 FINAL PILOT READINESS PACK PASS OK
- POST-M41 EXTERNAL PACK RUNNER (M42 -> M58) PASS OK
- M59 -> M65 geçmiş green-base
- M66 functional-open

## Güncel dürüst rota
- M67 - Kurumsal Ölçek Hazırlık - green-base
- M68 - Fetch Hardening - green-base
- M69 - Fetch Hardening Phase 2 - green-base
- M70 - Checker Sync + Hot Path - green-base
- M71 - Summary Hot Path - green-base
- M72 - Hot Endpoint Reduction - green-base
- M73 - Hot Path Phase 2 - green-base
- M74 - Hot Path Phase 3 - green-base
- M75 - Hot Path Phase 4 - green-base
- M76A-1 - Minimum Normalization - active
- M76B - Living Matrix + Tools Consolidation - active

## Kanonik komutlar
- tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild
- tools\pack_living.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild
- tools\verify_living_static.ps1 -RepoRoot D:\servis-platform
- tools\verify_living_runtime.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild
- tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform

## Kural
- Green-base, tam saha doğrulaması ile aynı şey değildir.
- Önce living static, sonra living runtime, sonra cleanup uygulanır.
- Checklist içinde [x] yalnızca resmi pack/check green sonrası işaretlenir.

## Uyum markerları
- M65 - Pilot Launch Gate - green-base
- M66 - Operasyonel Reassignment - functional-open
- M75 - green-baseline
- M76A-1 - minimum-normalization - active

## M59-M66 uyum rotasi
- M59 - Gozlemleme + Saha Teshis - green-base
- M60 - Saha Acceptance Merkezi - green-base
- M61 - SSOT + Milestone Hizasi - green-base
- M62 - Ticari Omurga Guclendirme - aktif


## M59-M66 uyum rotasi
- M59 - Gozlemleme + Saha Teshis - green-base
- M60 - Saha Acceptance Merkezi - green-base
- M61 - SSOT + Milestone Hizasi - green-base
- M62 - Ticari Omurga Guclendirme - green-base
- M63 - Guven + Kalite + Hizmet Degerlendirme - aktif
- Komut: .\tools\pack_m63_trust_quality_service_evaluation.ps1 -RepoRoot .

- M64 - Dogal Copilot Katmani - aktif
