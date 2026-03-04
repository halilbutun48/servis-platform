OVERLAY — SuperAdmin Log Export fix + bundle kind normalization/diagnostics

Fixes:
1) SuperAdmin UI error "basePathForKind is not defined"
   - Adds basePathForKind()
   - Uses api.get(...) instead of api(...)

2) /api/logs now normalizes kind (TR/EN labels tolerant) and, on unknown kind,
   returns diagnostic payload:
   { error, kindRaw, kind, supported[] }

Apply:
1) Expand-Archive -Force .\OVERLAY_SUPERADMIN_LOGEXPORT_UI_FIX_2026-03-04.zip .
2) .\tools\pack.ps1 -To 37

After apply:
- SUPER_ADMIN -> Log Export preview should work (login/audit/requests).
- ROOM bundles: if still unknown kind, UI will show kindRaw + supported list.
