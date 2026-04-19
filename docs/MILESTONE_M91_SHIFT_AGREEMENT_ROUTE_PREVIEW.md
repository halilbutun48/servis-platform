# MILESTONE M91 SHIFT / AGREEMENT ROUTE PREVIEW

Status: green static acceptance band

## Amac

Vardiyadan sozlesmeye gecen akista rota onizleme, kaynak vardiya baglantisi ve operasyon koprusu ayni kontratta kalir.

## Kabul yuzeyi

- Company Sozlesmeler: `Rota Onizleme`, `Rota Guncelle` aksiyonunun solunda yer alir.
- Room Sozlesmeler: bekleyen ve diger sozlesme satirlari rota onizleme acabilir.
- Room Vardiyalar: sozlesmeli vardiya kartinin icine ekstra buton eklenmez; operasyon aksiyonundaki rota onizleme korunur.
- Vardiya -> Sozlesme: source shift, origin badge, generated shift ve linked-shift guard davranisi korunur.

## Kanonik komutlar

- `npm --prefix backend run m91check`
- `npm --prefix backend run m91:milestones`
- `node backend/scripts/run_m91_route_preview_checks.js`
- `tools\pack_m91_shift_agreement_route_preview.ps1 -RepoRoot D:\servis-platform`
- `npm run verify:milestones`
- `npm run verify:repo`

## Kanit

- Runbook: `docs/RUNBOOK_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md`
- Check bandi: `backend/scripts/_m91_route_preview_checks.js` + `backend/scripts/m91*_check.js` compatibility wrappers
- Tools contract: `tools/check_m91_shift_agreement_route_preview_repo_contract.ps1`
