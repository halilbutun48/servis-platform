<!-- REPO_CONTRACT_MARKER milestone=M61 slug=ssot-milestone-alignment -->

# RUNBOOK — M61 SSOT + MILESTONE HIZASI

## Amaç
M59 ve M60 sonrasında resmi ürün gerçeğini tek yerde toplamak ve SSOT drift riskini azaltmak.

## Kapsam
- README / PROJECT_SPEC / PRIMER / STARTPACK / CHECKLIST hizası
- tools tarafındaki primer / checklist / readme hizası
- yeni resmi `M59 -> M65` rota kaydı
- milestone registry dosyası
- backend + web skeleton ile görünür hizalama özeti

## Çıktılar
- `docs/MILESTONE_REGISTRY_V1.md`
- `backend/src/ops/ssotAlignmentManifest.js`
- `backend/src/routes/ssotAlignment.js`
- `web/src/panels/superadmin/SsotAlignmentPanel.jsx`
- `tools/pack_m61_ssot_milestone_alignment.ps1`
- `tools/check_m61_ssot_milestone_alignment_repo_contract.ps1`
- `backend/scripts/m61_ssot_milestone_alignment_check.js`

## Green kriteri
M61 green sayılabilmesi için:
1. README / PRIMER / STARTPACK / CHECKLIST / NEXT_BACKLOG M60 green + M61 aktif durumu ile hizalı olmalı
2. milestone registry yeni resmi hattı tek yerde göstermeli
3. backend route `/api/ssot-alignment` altında manifest ve summary-template döndürmeli
4. super admin panelinde M61 hizalama kartı görünmeli
5. pack ve repo-contract birlikte PASS vermeli

M61 green olmadan M62'ye geçilmez.
