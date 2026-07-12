# SEFER ABI TURKISH USER FACING LANGUAGE AUDIT 01

Tarih: 2026-07-12
Repo: `servis-platform`

## docs/check milestone
- Bu dokÃ¼man docs/check milestone kaydÄ±dÄ±r; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact aÃ§maz.
- Canonical check: `check:seferabiturkishuserfacinglanguage01`
- Komut: `node backend\scripts\sefer_abi_turkish_user_facing_language_01_check.js`
- Static source of truth: `backend/src/ai/chat/helpComposer.js`
- Reasoning surface: `backend/src/ai/chat/seferAbiReasoningAssistant.js`

## AmaÃ§
- Sefer Abi'nin tÃ¼m rol ve yÃ¼zeylerinde kullanÄ±cÄ±ya gÃ¶rÃ¼nen metinlerin sade TÃ¼rkÃ§e kalmasÄ±nÄ± doÄŸrular.
- `Free-to-operate`, `root cause`, `diagnostic`, `risk scoring`, `workflow`, `screen purpose`, `next best action`, `current step`, `fallback`, `offline`, `stale`, `ETA`, `warning`, `error` ve `blocker` gibi gÃ¶rÃ¼nÃ¼r sÄ±zÄ±ntÄ±larÄ± engeller.
- `MARKETPLACE_FREE_TO_OPERATE_PREVIEW` gÃ¶rÃ¼nÃ¼r label'Ä±nÄ± `BaÅŸarÄ± payÄ± Ã¶nizlemesi` olarak kilitler.
- Help composer, reasoning assistant, quick action, chip ve aÃ§Ä±klama satÄ±rlarÄ±nda TÃ¼rkÃ§e kopya standardÄ±nÄ± korur.

## Kapsanan yÃ¼zeyler
- `SUPER_ADMIN`
- `COMPANY`
- `ROOM`
- `DRIVER`
- `PERSONEL`
- `PARENT`
- `SCHOOL`
- `ORGANIZATION`
- `superadmin/operations`
- `superadmin/commercial-core`
- `company/agreements`
- `company/operations`
- `room/shifts`
- `room/vehicles`
- `driver/today`
- `personel/live`
- `parent/live`
- `school/operations`
- `organization/operations`

## Guard boundary
- Runtime AI action aÃ§maz.
- Tool execution aÃ§maz.
- Write-action dispatcher aÃ§maz.
- DB write aÃ§maz.
- Route apply aÃ§maz.
- Fake success aÃ§maz.

## Not
- Bu audit, kullanÄ±cÄ±ya gÃ¶rÃ¼nen kopyanÄ±n TÃ¼rkÃ§e kalmasÄ±nÄ± denetler; Ã¼rÃ¼n davranÄ±ÅŸÄ±nÄ± deÄŸiÅŸtirmez.
