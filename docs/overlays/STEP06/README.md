# STEP 0.6 — Stabil Ekler Overlay Serisi

Bu klasör, ana `M41` pack dışında çalışan ama manuel doğrulanmış stabil eklerin overlay geçmişini toplar.
Amaç: Step 0.6 işlerini repo root’taki dağınık notlardan çıkarıp **tek yerde** tutmak.

## Kapsam

### Capacity / Pool / Split
- `OVERLAY_NOTES_M83_POOL_CAPACITY_2026-03-08.md`
- `OVERLAY_NOTES_M84_POOL_CAPACITY_FIX_2026-03-08.md`
- `OVERLAY_NOTES_M85_M86_AUTO_SPLIT_COMBO_2026-03-08.md`
- `OVERLAY_NOTES_M87_M88_DRIVERFIX_POOLCLARITY_2026-03-09.md`
- `OVERLAY_NOTES_M87_M88_V3_VITEFIX_2026-03-09.md`
- `OVERLAY_NOTES_M89_SPLIT_PARENT_CLEANUP_2026-03-09.md`

### School / Parent Invite
- `OVERLAY_NOTES_M90_SCHOOL_PARENT_LINK_RESTORE_2026-03-09.md`
- `OVERLAY_NOTES_M91_PARENT_INVITE_SCHEMA_FIX_2026-03-09.md`

### Shift Preview / External Navigation
- `OVERLAY_NOTES_M92_SHIFT_PREVIEW_EXTERNAL_NAV_2026-03-09.md`
- `OVERLAY_NOTES_M93_SHIFT_PREVIEW_EXTERNAL_NAV_ZERO_FIX_2026-03-09.md`
- `OVERLAY_NOTES_M94_SHIFT_PREVIEW_NAV_INCLUDE_HUB_2026-03-09.md`
- `OVERLAY_NOTES_M95_SHIFT_PREVIEW_NAV_ORIGIN_NOTE_2026-03-09.md`

### Company List Click Details / Related UI
- `OVERLAY_NOTES_M96_COMPANY_LIST_CLICK_DETAILS_2026-03-09.md`
- `OVERLAY_NOTES_M97_CHECKIN_NAV_RESTORE_2026-03-09.md`
- `OVERLAY_NOTES_M98_STEP06_SSOT_MINICHECK_2026-03-09.md`

## Resmi doğrulama
Step 0.6 artık yalnızca “manuel not” değildir; aşağıdaki ayrı mini-check ile doğrulanır:
- `tools/pack_step06_stabil.ps1`
- `backend/scripts/step06_stabil_check.js`
- `tools/check_step06_repo_contract.ps1`

## Not
Bu klasör overlay geçmişi / notlar içindir. Resmi SSOT davranışı için:
- `tools/CHECKLIST_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/PRIMER_SNAPSHOT.md`

ayrı hizalanmalıdır.