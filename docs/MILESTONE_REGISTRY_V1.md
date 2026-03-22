# MILESTONE REGISTRY V1

Bu dosya saha öncesi hattın tek resmi milestone kaydıdır.

## Tarihsel teknik taban
- M58 FINAL PILOT READINESS PACK PASS OK
- POST-M41 EXTERNAL PACK RUNNER (M42 -> M58) PASS OK

## Güncel dürüst rota
- M59 - Gözlemleme + Saha Teşhis - green-base
- M60 - Saha Acceptance Merkezi - green-base
- M61 - SSOT + Milestone Hizası - green-base
- M62 - Ticari Omurga Güçlendirme - green-base
- M63 - Güven + Kalite + Hizmet Değerlendirme - green-base
- M64 - Doğal Copilot Katmanı - green-base
- M65 - Pilot Launch Gate - green-base
- M66 - Operasyonel Reassignment - functional-open

## Kanonik komutlar
- tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild
- tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform
- tools\pack_m66_operation_reassignment.ps1 -RepoRoot D:\servis-platform

## Kural
- Green-base, tam saha doğrulaması ile aynı şey değildir.
- M59 -> M66 için baştan aşağı yeniden kontrol ayrıca yapılacaktır.
- Checklist içinde [x] yalnızca resmi pack/check green sonrası işaretlenir.
