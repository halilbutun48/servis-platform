# OVERLAY NOTES — M33 + M18CHECK fix + M34 Step-0 UI precheck

Bu overlay şunları yapar:

## Fix
- **M18CHECK**: agreement->daily shift generator check'i 6.5s yerine **25s polling** ile daha deterministik hale getirir (flaky fail'leri bitirir). Ek teşhis çıktısı ekler.

## Milestone
- **M33CHECK** ekler/sağlar: `/api/plan-builder/*` contract + `/precheck` + solver/osrm opsiyonel davranış.
- `tools/gate.ps1` + `tools/pack.ps1` **-To 33** desteği.

## UI
- **M34 Step-0**: Plan Builder panelinin üstüne **Ön Kontrol** kartı eklenir (blocker vs warn ayrımı):
  - Blocker: hub eksik/0,0; personel konum eksik/0,0
  - Warn: NEEDS_REVIEW/FAILED; OSRM yok; solver yok

## Docs
- `docs/RUNBOOK_M34_STEP0.md` eklidir.
- `docs/API_SPEC_V1.md` plan-builder bölümünü içerir.
