# tools/patch_planbuilder_istanbul_fix.ps1
# Fix regression where istanbulLocalToUtcIso is accidentally scoped inside buildLocalRangeFromItem()
# Safe: only patches if the known bad pattern is present.

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$path = Join-Path $root "web\src\panels\company\PlanBuilderPanel.jsx"
if (!(Test-Path $path)) { throw "File not found: $path (run from repo root: D:\servis-platform)" }

$txt = Get-Content $path -Raw

# Detect the broken block: conversion helper defined after return inside buildLocalRangeFromItem
$pat = [regex]::new(
    'function\s+buildLocalRangeFromItem\(\s*baseYmd\s*,\s*item\s*\)\s*\{(?s).*?return\s+\{\s*startAtLocal\s*,\s*endAtLocal\s*\}\s*;\s*//\s*datetime-local\s*\(Istanbul\s*local\)\s*->\s*UTC\s*ISO\s*const\s+IST_OFFSET_MIN\s*=\s*180;\s*function\s+istanbulLocalToUtcIso\(\s*dtLocal\s*\)\s*\{(?s).*?\}\s*\}',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

if (-not $pat.IsMatch($txt)) {
  Write-Host "OK: PlanBuilderPanel.jsx already looks patched (no regression pattern found)."
  exit 0
}

# Patch by inserting a closing brace after buildLocalRangeFromItem's return block and moving helper to top-level.
# We'll do a more controlled replacement based on a capture.
$pat2 = [regex]::new(
'function\s+buildLocalRangeFromItem\(\s*baseYmd\s*,\s*item\s*\)\s*\{(?<body>(?s).*?)return\s+\{\s*startAtLocal\s*,\s*endAtLocal\s*\}\s*;\s*//\s*datetime-local\s*\(Istanbul\s*local\)\s*->\s*UTC\s*ISO\s*const\s+IST_OFFSET_MIN\s*=\s*180;\s*function\s+istanbulLocalToUtcIso\(\s*dtLocal\s*\)\s*\{(?<conv>(?s).*?)\}\s*\}',
[System.Text.RegularExpressions.RegexOptions]::Singleline
)

$m = $pat2.Match($txt)
if (-not $m.Success) { throw "Unexpected: regression pattern detected but capture failed." }

$body = $m.Groups["body"].Value
$conv = $m.Groups["conv"].Value

$replacement = "function buildLocalRangeFromItem(baseYmd, item) {`n" + $body + "return { startAtLocal, endAtLocal };`n}`n`n// datetime-local (Istanbul local) -> UTC ISO`nconst IST_OFFSET_MIN = 180;`nfunction istanbulLocalToUtcIso(dtLocal) {`n" + $conv + "}`n"

$newTxt = $txt.Substring(0, $m.Index) + $replacement + $txt.Substring($m.Index + $m.Length)

# Write UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $newTxt, $utf8NoBom)

Write-Host "PATCHED: Fixed istanbulLocalToUtcIso scoping in PlanBuilderPanel.jsx"
