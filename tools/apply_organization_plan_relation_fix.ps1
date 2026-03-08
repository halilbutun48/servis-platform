param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)

$schema = Join-Path $RepoRoot 'backend\prisma\schema.prisma'
if (!(Test-Path $schema)) { throw "schema not found: $schema" }

$raw = [System.IO.File]::ReadAllText($schema, [System.Text.Encoding]::UTF8)
$backupDir = Join-Path $RepoRoot ("tools\_backup\organization_plan_relation_fix_" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $schema (Join-Path $backupDir 'schema.prisma') -Force

$lines = [System.Collections.Generic.List[string]]::new()
$lines.AddRange(($raw -split "`r?`n"))

$start = -1
$end = -1
for ($i=0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^\s*model\s+OrganizationPlan\s*\{') { $start = $i; continue }
  if ($start -ge 0 -and $end -lt 0 -and $lines[$i] -match '^\s*\}\s*$') { $end = $i; break }
}

if ($start -lt 0 -or $end -lt 0) { throw 'OrganizationPlan model not found or malformed' }

$hasShifts = $false
for ($i=$start; $i -le $end; $i++) {
  if ($lines[$i] -match '^\s*shifts\s+Shift\[\]') { $hasShifts = $true; break }
}

if (-not $hasShifts) {
  $insertAt = $end
  for ($i=$start+1; $i -lt $end; $i++) {
    if ($lines[$i] -match '^\s*stops\s+OrganizationStop\[\]') { $insertAt = $i + 1; break }
  }
  $lines.Insert($insertAt, '  shifts Shift[]')
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($schema, ($lines -join "`r`n"), $utf8NoBom)
Write-Host "UPDATED backend\prisma\schema.prisma" -ForegroundColor Green
Write-Host "Backup: $backupDir" -ForegroundColor Yellow
Write-Host "OrganizationPlan relation fix applied" -ForegroundColor Green
