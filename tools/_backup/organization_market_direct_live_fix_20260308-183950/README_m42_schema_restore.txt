Restores the Prisma models/enums required by the optional M42 check-in flow.
Use when pack.ps1 passes but pack_m42_optional.ps1 fails at credential issue / scan steps.

Run from repo root:
  .\apply_overlay_m42_schema_restore.ps1 -RepoRoot D:\servis-platform

Then run:
  .\tools\pack.ps1 -To 41
  .\tools\pack_m42_optional.ps1
