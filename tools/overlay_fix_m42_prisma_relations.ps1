# overlay_fix_m42_prisma_relations.ps1
# Fix Prisma opposite relation fields for M42 optional Checkin models.
# - Adds missing back-relations on Personel and Shift models:
#   Personel.credentials : PersonelCredential[]
#   Personel.checkinEvents : CheckinEvent[]
#   Shift.checkinEvents : CheckinEvent[]
#
# Safe to run multiple times (idempotent). Writes UTF-8.

$ErrorActionPreference = "Stop"

$schemaPath = Join-Path $PSScriptRoot "..\backend\prisma\schema.prisma"
$schemaPath = (Resolve-Path $schemaPath).Path

function Patch-ModelFields {
  param(
    [Parameter(Mandatory=$true)][string]$raw,
    [Parameter(Mandatory=$true)][string]$modelName,
    [Parameter(Mandatory=$true)][string[]]$fieldLines
  )

  $pattern = "(?ms)^model\s+$([regex]::Escape($modelName))\s*\{\s*.*?^\}"
  $m = [regex]::Match($raw, $pattern)
  if (-not $m.Success) { throw "Model not found: $modelName" }

  $block = $m.Value

  foreach($line in $fieldLines){
    # normalize spaces for detection
    $needle = [regex]::Escape("  $line")
    if ($block -match $needle) { continue }

    # Insert before first @@index/@@unique/@@map inside model; otherwise before closing brace
    $idx = [regex]::Match($block, "(?m)^\s*@@").Index
    if ($idx -le 0) {
      $idx = $block.LastIndexOf("`n}")
      if ($idx -lt 0) { $idx = $block.Length - 1 }
    }
    $insert = "`n  $line"
    $block = $block.Insert($idx, $insert)
  }

  return $raw.Substring(0, $m.Index) + $block + $raw.Substring($m.Index + $m.Length)
}

$raw = Get-Content -Raw -Encoding UTF8 $schemaPath

# Only patch if M42 models exist (so we don't touch earlier stages)
if ($raw -notmatch "(?m)^model\s+PersonelCredential\s*\{" -and $raw -notmatch "(?m)^model\s+CheckinEvent\s*\{") {
  Write-Host "M42 models not present in schema; nothing to patch."
  exit 0
}

$raw2 = $raw
$raw2 = Patch-ModelFields -raw $raw2 -modelName "Personel" -fieldLines @(
  "credentials   PersonelCredential[]",
  "checkinEvents CheckinEvent[]"
)
$raw2 = Patch-ModelFields -raw $raw2 -modelName "Shift" -fieldLines @(
  "checkinEvents CheckinEvent[]"
)

if ($raw2 -ne $raw) {
  Set-Content -Encoding UTF8 -Path $schemaPath -Value $raw2
  Write-Host "✅ Patched: $schemaPath"
} else {
  Write-Host "✅ Already OK: $schemaPath"
}
