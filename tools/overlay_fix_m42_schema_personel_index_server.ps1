$ErrorActionPreference = 'Stop'

Write-Host '=== FIX M42 PRISMA (Personel credentials line) + server.js checkin mount ==='

$repo = (Resolve-Path "$PSScriptRoot\..\..").Path
$schemaPath = Join-Path $repo 'backend\prisma\schema.prisma'
$serverPath = Join-Path $repo 'backend\src\server.js'

function Backup-File($p) {
  if (!(Test-Path $p)) { return }
  $ts = (Get-Date).ToString('yyyyMMdd-HHmmss')
  $bak = "$p.bak.$ts"
  Copy-Item -Force $p $bak
  return $bak
}

if (!(Test-Path $schemaPath)) { throw "schema not found: $schemaPath" }
$schemaBak = Backup-File $schemaPath

$raw = Get-Content -Raw -Encoding UTF8 $schemaPath
$orig = $raw

# 1) Fix invalid inline model attribute on credentials field
$raw = [regex]::Replace(
  $raw,
  '(^\s*credentials\s+PersonelCredential\[\]\s+)@@index\(\[companyId,\s*kind\]\)\s*$',
  '${1}',
  [System.Text.RegularExpressions.RegexOptions]::Multiline
)

# 2) Ensure Personel model has @@index([companyId, kind]) as a standalone line
$m = [regex]::Match($raw, '(?s)model\s+Personel\s*\{.*?\n\}', [System.Text.RegularExpressions.RegexOptions]::None)
if (!$m.Success) { throw 'model Personel block not found' }
$block = $m.Value
if ($block -notmatch '@@index\(\[companyId,\s*kind\]\)') {
  # Insert before closing brace
  $block2 = [regex]::Replace($block, '\n\}$', "`n  @@index([companyId, kind])`n}")
  $raw = $raw.Replace($block, $block2)
}

if ($raw -eq $orig) {
  Write-Host 'ℹ️ No schema changes needed.'
} else {
  Set-Content -Encoding UTF8 $schemaPath $raw
  Write-Host "✅ Patched schema: $schemaPath"
  if ($schemaBak) { Write-Host "   backup: $schemaBak" }
}

# 3) server.js: mount /api/checkin if missing
if (Test-Path $serverPath) {
  $serverBak = Backup-File $serverPath
  $s = Get-Content -Raw -Encoding UTF8 $serverPath
  if ($s -notmatch 'app\.use\(\s*["\']\/api\/checkin["\']\s*,') {
    if ($s -match 'app\.use\(\s*["\']\/api\/offers["\']\s*,\s*offersRouter\(io\)\s*\)\s*;') {
      $s2 = [regex]::Replace(
        $s,
        '(app\\.use\(\s*[\"\']\/api\/offers[\"\']\s*,\s*offersRouter\(io\)\s*\)\s*;)',
        '$1' + "`napp.use(\"/api/checkin\", checkinRouter(io));",
        [System.Text.RegularExpressions.RegexOptions]::None
      )
      Set-Content -Encoding UTF8 $serverPath $s2
      Write-Host "✅ Patched server.js: mounted /api/checkin"
      if ($serverBak) { Write-Host "   backup: $serverBak" }
    } else {
      Write-Host '⚠️ server.js: offers mount anchor not found; skipping auto-insert for /api/checkin.'
      Write-Host '   You can add manually: app.use("/api/checkin", checkinRouter(io));'
    }
  } else {
    Write-Host 'ℹ️ server.js already mounts /api/checkin.'
  }
  } else {
    Write-Host "⚠️ server.js not found: $serverPath (skipped)"
  }
}

Write-Host '=== DONE ==='
