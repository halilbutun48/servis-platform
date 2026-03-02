# M81.7.4 — schema.prisma repair: dedupe User.notifications relation
# Fixes Prisma P1012:
#   Field "notifications" is already defined on model "User".
# Safe/idempotent: keeps only ONE "notifications Notification[]" line inside model User.

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Location).Path
$schema = Join-Path $repoRoot "backend\prisma\schema.prisma"
if (!(Test-Path $schema)) {
  throw "schema.prisma not found at: $schema (run from repo root D:\servis-platform)"
}

# backup
$backupDir = Join-Path $repoRoot "tools\_backup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $backupDir ("schema.prisma.bak.user-notifs." + $ts)
Copy-Item -Force $schema $backupPath

$txt = Get-Content -Raw -Encoding UTF8 $schema

# Find model User block (non-greedy). Prisma schema doesn't support nested braces in model blocks.
$re = [regex]'(?ms)model\s+User\s*\{\s*(.*?)\s*\}'
$m = $re.Match($txt)
if (!$m.Success) {
  throw "model User { ... } block not found in schema.prisma"
}

$body = $m.Groups[1].Value
$lines = $body -split "`r?`n"

$kept = $false
$outLines = New-Object System.Collections.Generic.List[string]
$removedCount = 0

foreach ($line in $lines) {
  $trim = $line.Trim()
  if ($trim -match '^\s*notifications\s+Notification\[\]\s*$') {
    if (-not $kept) {
      $outLines.Add($line)
      $kept = $true
    } else {
      $removedCount++
      continue
    }
  } else {
    $outLines.Add($line)
  }
}

if (-not $kept) {
  # Add it near the end of the User model, before closing brace.
  $outLines.Add("  notifications Notification[]")
}

$newBody = ($outLines -join "`r`n")

# Replace only the first match
$newTxt = $re.Replace($txt, { param($mm) "model User {`r`n" + $newBody + "`r`n}" }, 1)

Set-Content -Encoding UTF8 -NoNewline -Path $schema -Value $newTxt

Write-Host "✅ schema.prisma updated. Removed duplicate User.notifications lines: $removedCount"
Write-Host "Backup saved: $backupPath"
Write-Host "Next: .\tools\reset-and-pack.ps1"
