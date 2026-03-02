# M81.7.3 — Prisma schema repair (fixes accidental "\n" literal injections + dedupes fields)
# Usage:
#   cd <repo>; .\tools\repair-schema-kind.ps1
#   .\tools\reset-and-pack.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$schema = Join-Path $root "backend\prisma\schema.prisma"

if (!(Test-Path $schema)) {
  throw "schema.prisma not found: $schema"
}

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $root "tools\_backup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backup = Join-Path $backupDir ("schema.prisma.bak." + $ts)
Copy-Item -Force $schema $backup

# Read as UTF-8 (tolerant)
$raw = [System.IO.File]::ReadAllText($schema, [System.Text.Encoding]::UTF8)

# 1) Convert accidental literal "\n" / "\r\n" sequences into real newlines
#    (These were introduced by a patch script writing escaped newlines into schema.prisma)
$raw = $raw -replace "\\r\\n", "`r`n"
$raw = $raw -replace "\\n", "`n"

# Normalize newlines to LF in-memory for easier processing
$raw = $raw -replace "`r`n", "`n"

$lines = $raw -split "`n", -1

$emit = New-Object System.Collections.Generic.List[string]

$curModel = $null
$companyKindSeen = $false
$personelKindSeen = $false
$userNotifsSeen = $false

$seenCompanyKindEnum = $false
$seenPersonelKindEnum = $false
$skippingEnum = $null  # "CompanyKind" | "PersonelKind"

function StartModel([string]$name) {
  $script:curModel = $name
  $script:companyKindSeen = $false
  $script:personelKindSeen = $false
  $script:userNotifsSeen = $false
}

function EndModel() {
  $script:curModel = $null
}

for ($i=0; $i -lt $lines.Length; $i++) {
  $line = $lines[$i]

  # Deduplicate enum blocks if patch ran twice
  if ($skippingEnum) {
    # skip lines until closing brace
    if ($line -match "^\s*\}\s*$") { $skippingEnum = $null }
    continue
  }

  if ($line -match "^\s*enum\s+CompanyKind\s*\{\s*$") {
    if ($seenCompanyKindEnum) { $skippingEnum = "CompanyKind"; continue }
    $seenCompanyKindEnum = $true
    $emit.Add($line)
    continue
  }
  if ($line -match "^\s*enum\s+PersonelKind\s*\{\s*$") {
    if ($seenPersonelKindEnum) { $skippingEnum = "PersonelKind"; continue }
    $seenPersonelKindEnum = $true
    $emit.Add($line)
    continue
  }

  # Track model blocks for targeted dedupe
  if ($line -match "^\s*model\s+([A-Za-z0-9_]+)\s*\{\s*$") {
    StartModel($Matches[1])
    $emit.Add($line)
    continue
  }
  if ($curModel -and ($line -match "^\s*\}\s*$")) {
    EndModel
    $emit.Add($line)
    continue
  }

  if ($curModel -eq "Company") {
    if ($line -match "^\s*kind\s+CompanyKind\b") {
      if ($companyKindSeen) { continue }
      $companyKindSeen = $true
      $emit.Add($line)
      continue
    }
  }

  if ($curModel -eq "Personel") {
    if ($line -match "^\s*kind\s+PersonelKind\b") {
      if ($personelKindSeen) { continue }
      $personelKindSeen = $true
      $emit.Add($line)
      continue
    }
  }

  if ($curModel -eq "User") {
    if ($line -match "^\s*notifications\s+Notification\[\]\s*$") {
      if ($userNotifsSeen) { continue }
      $userNotifsSeen = $true
      $emit.Add($line)
      continue
    }
  }

  $emit.Add($line)
}

# 2) Light cleanup: collapse excessive blank lines (3+ -> 2)
$outLines = @()
$blankRun = 0
foreach ($l in $emit) {
  if ($l.Trim().Length -eq 0) {
    $blankRun++
    if ($blankRun -le 2) { $outLines += $l }
  } else {
    $blankRun = 0
    $outLines += $l
  }
}

$text = ($outLines -join "`n").TrimEnd() + "`n"

# Write UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($schema, $text, $utf8NoBom)

Write-Host "✅ Repaired schema.prisma (backup saved: $backup)" -ForegroundColor Green
Write-Host "Next: .\tools\reset-and-pack.ps1" -ForegroundColor Yellow
