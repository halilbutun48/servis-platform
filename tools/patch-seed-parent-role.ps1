param(
  [string]$RepoRoot = (Get-Location).Path
)

$seed = Join-Path $RepoRoot 'backend\prisma\seed.js'
if (!(Test-Path $seed)) {
  throw "seed.js not found: $seed"
}

$txt = Get-Content $seed -Raw
$orig = $txt

# Replace Role.PARENT usages with string literal "PARENT" to avoid undefined when prisma client enums are stale.
$txt = [regex]::Replace($txt, 'Role\\.PARENT', '"PARENT"')

if ($txt -ne $orig) {
  $bak = $seed + '.bak.' + (Get-Date -Format 'yyyyMMdd_HHmmss')
  Copy-Item $seed $bak -Force
  Set-Content -Path $seed -Value $txt -Encoding UTF8
  Write-Host "✅ Patched seed.js (backup: $bak)" -ForegroundColor Green
} else {
  Write-Host "ℹ️ seed.js already ok (no Role.PARENT found)." -ForegroundColor Cyan
}
