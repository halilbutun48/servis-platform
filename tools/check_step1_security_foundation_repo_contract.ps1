param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
$srcRoot = Join-Path $RepoRoot 'backend\src'

function Ok([string]$m){ Write-Host "OK $m" }
function NeedExists([string]$file){ $p = Join-Path $RepoRoot $file; if (-not (Test-Path -LiteralPath $p)) { throw "repo contract fail: $file exists" }; Ok "$file exists" }
function NeedContains([string]$file, [string]$needle, [string]$label){ $p = Join-Path $RepoRoot $file; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if (-not $txt.Contains($needle)) { throw "repo contract fail: $label :: missing '$needle' in $file" }; Ok $label }
function NeedAnyFileContains([string[]]$files, [string[]]$needles, [string]$label){
  foreach ($file in $files) {
    $p = Join-Path $RepoRoot $file
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
    foreach ($needle in $needles) { if ($txt.Contains($needle)) { Ok $label; return } }
  }
  throw "repo contract fail: $label"
}
function NeedRecursiveContains([string[]]$needles, [string]$label){
  $files = Get-ChildItem -Path $srcRoot -Recurse -File -Include *.js
  foreach ($f in $files) {
    $txt = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
    foreach ($needle in $needles) { if ($txt.Contains($needle)) { Ok $label; return } }
  }
  throw "repo contract fail: $label"
}

Write-Host '=== STEP1 SECURITY FOUNDATION REPO CONTRACT CHECK ==='
NeedExists 'backend\src\server.js'
NeedExists 'backend\src\bootstrap\rateLimits.js'
NeedExists 'backend\src\routes\auth.js'
NeedExists 'tools\pack_step1_security_foundation.ps1'
NeedExists 'tools\check_step1_security_foundation_repo_contract.ps1'
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\rateLimits.js') @('exportLimiter','createApiRateLimiters') 'export limiter declared'
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\rateLimits.js') @('readLimiter','createApiRateLimiters') 'read limiter declared'
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\rateLimits.js') @('writeLimiter','createApiRateLimiters') 'write limiter declared'
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\routeMounts.js') @('/api/auth') 'server mounts auth route'
NeedContains 'backend\src\routes\auth.js' '/login' 'auth route exposes login'
NeedContains 'backend\src\routes\auth.js' '/refresh' 'auth route exposes refresh'
NeedContains 'backend\src\routes\auth.js' '/logout' 'auth route exposes logout'
NeedRecursiveContains @('authRequired','requireRole') 'auth guards declared somewhere under backend src'
NeedContains 'tools\pack_step1_security_foundation.ps1' 'step1_security_foundation' 'pack file wired'
Write-Host 'STEP1 SECURITY FOUNDATION REPO CONTRACT PASS OK'
