<!-- REPO_CONTRACT_MARKER milestone=M61 slug=ssot-milestone-alignment -->

# MILESTONE — M61 SSOT + MILESTONE HIZASI

## Hedef
Resmi ürün yönünü tek kayıtta toplamak ve saha öncesi yeni hattı drift olmadan yönetmek.

## Repo çıktıları
- `docs/MILESTONE_REGISTRY_V1.md`
- `docs/RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md`
- `tools/pack_m61_ssot_milestone_alignment.ps1`
- `tools/check_m61_ssot_milestone_alignment_repo_contract.ps1`
- `backend/scripts/m61_ssot_milestone_alignment_check.js`
- `backend/src/ops/ssotAlignmentManifest.js`
- `backend/src/routes/ssotAlignment.js`
- `web/src/panels/superadmin/SsotAlignmentPanel.jsx`

## UI
- Super Admin hizli erisim altinda `SSOT Hizasi`
- Super Admin paneli icinde M61 karti
- `/superadmin/ssot-alignment` route'u

## Kural
M61 green olmadan M62 acilmaz.
