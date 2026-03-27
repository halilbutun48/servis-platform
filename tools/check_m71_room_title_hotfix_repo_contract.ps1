param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
function Ok($m){ Write-Host "OK $m" }
function Fail($m){ throw "FAIL $m" }
function MustExist($p){ if(Test-Path $p){ Ok "$p exists" } else { Fail "$p missing" } }

Write-Host "=== M71 ROOM TITLE HOTFIX CHECK ==="
$co = Join-Path $RepoRoot 'backend\src\routes\companyOverview.js'
$ag = Join-Path $RepoRoot 'backend\src\routes\agreements.js'
MustExist $co
MustExist $ag
$coTxt = Get-Content -Raw $co
$agTxt = Get-Content -Raw $ag
if($coTxt -match 'title\s*:\s*true'){ Fail 'companyOverview room select still uses title' } else { Ok 'companyOverview room select title removed' }
if($agTxt -match 'title\s*:\s*true'){ Fail 'agreements room select still uses title' } else { Ok 'agreements room select title removed' }
node --check $co | Out-Null
Ok 'companyOverview node --check ok'
node --check $ag | Out-Null
Ok 'agreements node --check ok'
Write-Host "=== M71 ROOM TITLE HOTFIX CHECK PASS ==="
