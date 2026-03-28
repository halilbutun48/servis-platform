param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
)
$ErrorActionPreference = 'Stop'
function Ok([string]$m){ Write-Host "OK $m" }
function Fail([string]$m){ throw "FAIL $m" }
$panel = Join-Path $RepoRoot 'web\src\panels\company\GeoReviewPanel.jsx'
if (!(Test-Path $panel)) { Fail 'web\\src\\panels\\company\\GeoReviewPanel.jsx exists' }
Ok 'web\\src\\panels\\company\\GeoReviewPanel.jsx exists'
$content = Get-Content -Raw $panel
if ($content -notmatch 'const \{ me, token \} = useSession\(\);') { Fail 'GeoReviewPanel reads token from session' }
Ok 'GeoReviewPanel reads token from session'
if ($content -notmatch 'onClick=\{\(\) => load\(\)\}') { Fail 'GeoReviewPanel reload button uses safe wrapper' }
Ok 'GeoReviewPanel reload button uses safe wrapper'
if ($content -match 'const \{ me \} = useSession\(\);') { Fail 'legacy session destructuring removed' }
Ok 'legacy session destructuring removed'
Write-Host '=== M72 GEOREVIEW TOKEN HOTFIX CHECK PASS ==='
