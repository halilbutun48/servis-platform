# encoding-check.ps1
# Checks: UTF-8 BOM, UTF-16 BOM, any NUL bytes (0x00), and any non-ASCII bytes (>0x7F)
# Exit 0 if clean, 1 if any problems.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

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
         ($full -match "\\\.git\\") -or
         ($full -match "\\_snapshots\\") -or
         ($full -match "\.bak$") -or
         ($full -match "\.bad$") -or
         ($full -match "\.crashbak_") -or
         ($full -match "\.fixbak_")
}

$files = Get-ChildItem $targets -Recurse -File -Include $includes -ErrorAction SilentlyContinue |
  Where-Object { -not (Is-IgnoredPath $_.FullName) }

$bad = @()

foreach ($f in $files) {
  $b = [IO.File]::ReadAllBytes($f.FullName)

  $utf8Bom  = ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF)
  $utf16LE  = ($b.Length -ge 2 -and $b[0] -eq 0xFF -and $b[1] -eq 0xFE)
  $utf16BE  = ($b.Length -ge 2 -and $b[0] -eq 0xFE -and $b[1] -eq 0xFF)

  $nulBytes = @($b | Where-Object { $_ -eq 0 }).Count
  $nonAscii = @($b | Where-Object { $_ -gt 0x7F }).Count

  if ($utf8Bom -or $utf16LE -or $utf16BE -or $nulBytes -gt 0 -or $nonAscii -gt 0) {
    $bad += [pscustomobject]@{
      Path          = $f.FullName
      UTF8_BOM      = $utf8Bom
      UTF16_BOM     = ($utf16LE -or $utf16BE)
      NONASCII_BYTES = $nonAscii
      NUL_BYTES     = $nulBytes
    }
  }
}

if ($bad.Count -gt 0) {
  Write-Host "ENCODING CHECK: FAIL" -ForegroundColor Red
  $bad | Sort-Object NONASCII_BYTES,NUL_BYTES -Descending | Format-Table -AutoSize
  exit 1
}

Write-Host "ENCODING CHECK: PASS" -ForegroundColor Green
exit 0