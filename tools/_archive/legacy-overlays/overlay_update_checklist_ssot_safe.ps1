# tools/overlay_update_checklist_ssot_safe.ps1
# Safe overlay applier: copies tools/CHECKLIST_SSOT.md to docs/CHECKLIST_SSOT.md (UTF-8 no BOM)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$src  = Join-Path $PSScriptRoot "CHECKLIST_SSOT.md"
$dst  = Join-Path $root "docs\CHECKLIST_SSOT.md"

if (!(Test-Path $src)) { throw "Missing source file: $src" }

$raw = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($dst, $raw, $utf8NoBom)

Write-Host "✅ Updated (safe): $dst" -ForegroundColor Green
