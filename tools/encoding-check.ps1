# tools/encoding-check.ps1
# Checks: UTF-8 BOM, UTF-16 BOM, any NUL bytes (0x00), and any non-ASCII bytes (>0x7F)
# Exit 0 if clean, 1 if any problems.
# Default: ignores local artifacts (.bak/.bad/.orig/crashbak_/fixbak_/bak_*). Use -IncludeArtifacts to scan them too.

param(
  [switch]$IncludeArtifacts
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$targets = @(
  (Join-Path -Path $root -ChildPath "backend")
  (Join-Path -Path $root -ChildPath "web\src")
  (Join-Path -Path $root -ChildPath "tools")
)

$includes = @("*.js","*.jsx","*.ts","*.tsx","*.mjs","*.cjs","*.json","*.ps1")

function Is-ArtifactName([string]$name) {
  if ($name -match '\.bak$')     { return $true }
  if ($name -match '\.bad$')     { return $true }
  if ($name -match '\.orig$')    { return $true }
  if ($name -match '\.bak[_-]')  { return $true }  # .bak_* or .bak-nul etc
  if ($name -match 'crashbak_')  { return $true }
  if ($name -match 'fixbak_')    { return $true }
  return $false
}

function Is-IgnoredPath([string]$full) {
  if ($full -match "\\node_modules\\") { return $true }
  if ($full -match "\\dist\\")        { return $true }
  if ($full -match "\\build\\")       { return $true }
  if ($full -match "\\coverage\\")    { return $true }
  if ($full -match "\\\.git\\")       { return $true }
  if ($full -match "\\_snapshots\\")  { return $true }

  if (-not $IncludeArtifacts) {
    $name = [IO.Path]::GetFileName($full)
    if (Is-ArtifactName $name) { return $true }
  }

  return $false
}

$files = Get-ChildItem $targets -Recurse -File -Include $includes -ErrorAction SilentlyContinue |
  Where-Object { -not (Is-IgnoredPath $_.FullName) }

$bad = @()

foreach ($f in $files) {
  $b = [IO.File]::ReadAllBytes($f.FullName)

  $utf8Bom = ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF)
  $utf16LE = ($b.Length -ge 2 -and $b[0] -eq 0xFF -and $b[1] -eq 0xFE)
  $utf16BE = ($b.Length -ge 2 -and $b[0] -eq 0xFE -and $b[1] -eq 0xFF)

  $nulBytes = @($b | Where-Object { $_ -eq 0 }).Count
  $nonAscii = @($b | Where-Object { $_ -gt 0x7F }).Count

  $utf16Bom = ($utf16LE -or $utf16BE)
  $likelyUtf16NoBom = (($nulBytes -gt 0) -and (-not $utf16Bom))

  if ($utf8Bom -or $utf16Bom -or $nulBytes -gt 0 -or $nonAscii -gt 0) {
    $bad += [pscustomobject]@{
      Path              = $f.FullName
      UTF8_BOM          = $utf8Bom
      UTF16_BOM         = $utf16Bom
      LIKELY_UTF16_NOBOM = $likelyUtf16NoBom
      NONASCII_BYTES    = $nonAscii
      NUL_BYTES         = $nulBytes
    }
  }
}

if ($bad.Count -gt 0) {
  Write-Host "ENCODING CHECK: FAIL" -ForegroundColor Red
  $bad | Sort-Object NUL_BYTES, NONASCII_BYTES -Descending | Format-Table -AutoSize
  exit 1
}

Write-Host "ENCODING CHECK: PASS" -ForegroundColor Green
exit 0
