OVERLAY — Logs bundles: accept kind aliases + return supported kinds on error

Fix:
- /api/logs/preview and /api/logs/export now normalize kind:
  - accepts bundle_* kinds and Turkish/label aliases
  - requests -> api, login -> audit_login
- If kind is unknown, response includes:
  { error:"unknown kind", kindRaw, kind, supported:[...] }
  so UI shows exactly what backend received.
- targetType is also normalized (vehicle/driver/room/company/user/personel/student).

Apply:
1) Expand-Archive -Force .\OVERLAY_LOGS_BUNDLE_UNKNOWNKIND_DIAG_2026-03-04.zip .
2) .\tools\pack.ps1 -To 37