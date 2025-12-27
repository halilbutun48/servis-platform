# encoding-check.ps1
# Checks: UTF-8 BOM and any non-ASCII bytes (>0x7F) in source files.
# Exit 0 if clean, 1 if any problems.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

# IMPORTANT: No trailing commas here (",") -> they turn strings into arrays in PowerShell
$targets = @(
  (Join-Path -Path $root -ChildPath "backend")
  (Join-Path -Path $root -ChildPath "web\src")
  (Join-Path -Path $root -ChildPath "tools")
)

$includes = @("*.js","*.jsx","*.ts","*.tsx","*.json","*.ps1")

function Is-IgnoredPath($full) {
  return ($full -match "\\node_modules\\") -or
         ($full -match "\\dist\\") -or
         ($full -match "\\build\\") -or
         ($full -match "\\coverage\\") -or
         ($full -match "\\\.git\\")
}

$files = Get-ChildItem $targets -Recurse -File -Include $includes -ErrorAction SilentlyContinue |
  Where-Object { -not (Is-IgnoredPath $_.FullName) }

$bad = @()

foreach ($f in $files) {
  $b = [IO.File]::ReadAllBytes($f.FullName)

  $hasBom   = ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF)
  $nonAscii = @($b | Where-Object { $_ -gt 0x7F }).Count

  if ($hasBom -or $nonAscii -gt 0) {
    $bad += [pscustomobject]@{
      Path          = $f.FullName
      BOM           = $hasBom
      NONASCII_BYTES = $nonAscii
    }
  }
}

if ($bad.Count -gt 0) {
  Write-Host "ENCODING CHECK: FAIL" -ForegroundColor Red
  $bad | Sort-Object NONASCII_BYTES -Descending | Format-Table -AutoSize
  exit 1
}

Write-Host "ENCODING CHECK: PASS" -ForegroundColor Green
exit 0