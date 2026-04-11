# M90C.6 â€” HOT-FILE QUEUE POLICY

AmaÃ§: `repo_audit` iÃ§indeki hot/large file listesini yalnÄ±z sayÄ±sal uyarÄ± olmaktan Ã§Ä±karÄ±p resmi sÄ±nÄ±flÄ± queue'ya Ã§evirmek.

## Kapanan kararlar
- `backend/src/ai/chat/helpComposer.js` -> `justified exception`
- `backend/prisma/schema.prisma` -> `justified exception / decision closed`

## SÄ±nÄ±flar
### 1) justified exception
- line-count dÃ¼ÅŸÃ¼rme hedefi yok
- agresif refactor yok
- yalnÄ±z acceptance-safe lokal dÃ¼zeltme

### 2) safe candidate review
- davranÄ±ÅŸ deÄŸiÅŸtirmeden kontrollÃ¼ parÃ§alara ayÄ±rma / section extraction yapÄ±labilir
- refactor Ã¶ncesi acceptance zinciri korunur

### 3) acceptance-sensitive / later
- sÄ±rf satÄ±r sayÄ±sÄ± iÃ§in aÃ§Ä±lmaz
- yalnÄ±z explicit acceptance gerekÃ§esi ve dar kapsamla ele alÄ±nÄ±r

## Bu repo iÃ§in resmi daÄŸÄ±lÄ±m
### justified exception
- `backend/src/ai/chat/helpComposer.js`
- `backend/prisma/schema.prisma`

### safe candidate review
- `backend/src/ai/jobGuide/screenCatalog.js`
- `web/src/panels/room/ShiftsPanel.jsx`

### acceptance-sensitive / later
- `backend/src/routes/shifts/room.js`
- `backend/src/routes/shifts/company.js`
- `web/src/panels/shared/CopilotPanel.jsx`
- `mobile/App.js`

## Kaynak gerÃ§ek
- Makine-okur kaynak: `tools/repo_contract_state.json > hotFileQueuePolicy`
- YÃ¼rÃ¼tÃ¼lebilir kapÄ±: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- DoÄŸrulama: taze `repo_audit` Ã§Ä±ktÄ±sÄ± ile policy seti birebir eÅŸleÅŸmelidir.
