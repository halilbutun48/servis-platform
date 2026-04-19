# RUNBOOK M91 SHIFT / AGREEMENT ROUTE PREVIEW

Amaç: vardiya kaynakli sozlesme akisinda rota onizleme, kaynak vardiya baglantisi ve operasyon koprusunu korumak.

## Canonical komutlar

- Sadece M91: `npm --prefix backend run m91check`
- M91 family runner: `node backend/scripts/run_m91_route_preview_checks.js`
- M91 milestone wrapper: `npm --prefix backend run m91:milestones`
- M91 pack: `tools\pack_m91_shift_agreement_route_preview.ps1 -RepoRoot D:\servis-platform`
- Tum milestone static zinciri: `npm run verify:milestones`
- Tek repo zinciri: `npm run verify:repo`
- Final repo zinciri: `npm run verify:final`

## Kabul yuzeyleri

- Company Sozlesmeler: sozlesme listesi ve secili sozlesme aksiyonlarinda `Rota Onizleme`, `Rota Guncelle` aksiyonunun solunda yer alir.
- Room Sozlesmeler: bekleyen ve diger sozlesme satirlarinda kaynak/generated vardiyadan rota onizleme acilir.
- Room Vardiyalar: sozlesmeli vardiya kartinin icine ekstra buton eklenmez; operasyon aksiyonunda rota onizleme kalir.
- Vardiya -> Sozlesme: prefill, kaynak vardiya linki, origin badge ve yeniden donusturme guard'i korunur.
- Generated shift: rota snapshot / source-root bilgisi shared helper uzerinden tasinir.

## Check listesi

Tek cati modulu: `backend/scripts/_m91_route_preview_checks.js`

- `m91_company_agreement_from_shift_only_check.js`
- `m91_prefill_route_preview_propagation_check.js`
- `m91_generated_shift_preview_source_root_fix_check.js`
- `m91b_agreement_negotiation_parity_check.js`
- `m91c_shift_to_agreement_prefill_check.js`
- `m91c_shift_origin_link_check.js`
- `m91c_linked_shift_disable_convert_check.js`
- `m91d_agreement_operations_bridge_check.js`
- `m91ef_draft_slot_hardening_check.js`

## Bakim notu

M91 check'leri UI metninin eski birebir haline degil, bugunku akisin davranis marker'larina bakar. Buton metni degisirse check, kullanici aksiyonunun hala ayni yerde ve ayni kaynak shift ile calistigini dogrulayacak sekilde guncellenir.
