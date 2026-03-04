OVERLAY — logs.js SyntaxError fix + scope/global logs + kind alias

Fixes:
1) Fixes SyntaxError in backend/src/routes/logs.js caused by multi-line double-quoted strings.
   (e.g. out += "# LOG EXPORT<newline>";)

2) Makes /api/logs/preview and /api/logs/export usable without Hedef ID for:
   - kind=api (Requests)
   - kind=audit
   - kind=login (AUTH_LOGIN_* from AuditLog)
   In this mode, logs are filtered by caller scope:
   - SUPER_ADMIN: all
   - ROOM: users in same roomId
   - COMPANY: users in same companyId
   - others: only self

3) Accepts UI alias:
   - kind=requests -> kind=api
   - kind=login supported on /api/logs/preview + /api/logs/export

Apply:
1) Expand-Archive -Force .\OVERLAY_LOGS_SCOPE_SYNTAX_FIX_2026-03-04.zip .
2) .\tools\pack.ps1 -To 37
