# tools\snap-move-artifacts.ps1
# Find/move local artifacts (bak/bad/orig, crashbak/fixbak, patch/fix scripts, dumps) into _snapshots.
# ASCII-only.

param(
  [switch]$DryRun,
  [switch]$FailIfFound
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dest  = Join-Path $root ("_snapshots\_artifacts_" + $stamp)

# Exclude heavy/irrelevant dirs
$excludeDirRegex = '\\(node_modules|dist|build|coverage|\.git|_snapshots)\\'

function Is-Excluded([string]$fullPath) {
  return ($fullPath -match $excludeDirRegex)
}

function Ensure-Dir([string]$p){
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force $p | Out-Null }
}

# Artifact rules:
# - backups: *.bak, *.bak_*, *.bak-nul, *.bak_nul, *.bad, *.orig
# - crashbak/fixbak: *crashbak_*, *fixbak_*
# - one-off scripts: backend|web: patch-*.cjs, fix-*.cjs, repair-*.cjs, sanitize-*.cjs, scan-*.cjs
# - tools helpers: tools\fix-*.ps1, tools\repair-*.ps1, tools\sanitize-*.ps1
# - db dumps: *.sql, *.dump, *.backup
function Is-Artifact([string]$fullPath) {
  $rel  = $fullPath.Replace($root + "\", "")
  $name = [IO.Path]::GetFileName($fullPath)

  # NEVER treat Prisma migration.sql as artifact
  if ($rel -match '^backend\\prisma\\migrations\\.+\\migration\.sql$') { return $false }

  if ($name -match '\.bak$') { return $true }
  if ($name -match '\.bad$') { return $true }
  if ($name -match '\.orig$') { return $true }
  if ($name -match '\.bak[_-]') { return $true }   # .bak_* or .bak-nul etc
  if ($name -match 'crashbak_') { return $true }
  if ($name -match 'fixbak_')   { return $true }

  if ($name -match '\.(sql|dump|backup)$') { return $true }

  # one-off scripts in backend/web
  if ($rel -match '^(backend|web)\\(patch|fix|repair|sanitize|scan)-.+\.(cjs|js)$') { return $true }

  # tools one-off scripts
  if ($rel -match '^tools\\(fix|repair|sanitize)-.+\.ps1$') { return $true }

  return $false
}

$found = @()

Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { -not (Is-Excluded $_.FullName) } |
  ForEach-Object {
    if (Is-Artifact $_.FullName) {
      $rel = $_.FullName.Replace($root + "\", "")
      $found += [pscustomobject]@{
        RelPath = $rel
        SizeKB  = [math]::Round($_.Length / 1KB, 1)
      }
    }
  }

if ($found.Count -eq 0) {
  Write-Host "ARTIFACT CHECK: OK (none found outside _snapshots)" -ForegroundColor Green
  exit 0
}

Write-Host ("ARTIFACT CHECK: FOUND {0} file(s)" -f $found.Count) -ForegroundColor Yellow
$found | Sort-Object RelPath | Format-Table -AutoSize

if ($DryRun) {
  Write-Host ("DryRun: would move into: {0}" -f $dest) -ForegroundColor Yellow
  if ($FailIfFound) { exit 2 } else { exit 0 }
}

# Move
Ensure-Dir $dest
$moved = 0

foreach ($x in $found) {
  $src = Join-Path $root $x.RelPath
  if (-not (Test-Path $src)) { continue }

  $to  = Join-Path $dest $x.RelPath
  Ensure-Dir (Split-Path -Parent $to)

  Move-Item -Force $src $to
  $moved++
}

Write-Host ("Moved {0} artifact(s) into {1}" -f $moved, $dest) -ForegroundColor Green
exit 0
