REPO AUDIT FIX OVERLAY — 2026-03-07

İçerik:
- ParentInvite Prisma modeli + reverse relation'lar
- gps/status env threshold uyumu
- m4check/fullcheck env-aware GPS threshold fix

Uygulama:
.\tools\apply_overlay_repo_audit_fix.ps1

Sonra:
.\tools\pack.ps1 -To 41
.\tools\pack_m42_optional.ps1
