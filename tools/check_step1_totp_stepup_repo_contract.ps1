param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
$srcRoot = Join-Path $RepoRoot 'backend\src'

function Ok([string]$m) { Write-Host "OK $m" }

function NeedAny([string[]]$needles, [string]$label) {
  $files = Get-ChildItem -Path $srcRoot -Recurse -File -Include *.js
  foreach ($f in $files) {
    $txt = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
    foreach ($needle in $needles) {
      if ($txt -like "*$needle*") { Ok $label; return }
    }
  }
  throw "repo contract fail: $label :: missing any of [$($needles -join ', ')] under $srcRoot"
}

Write-Host '=== STEP1 TOTP STEP-UP REPO CONTRACT CHECK ==='
NeedAny @('requireStepUp(') 'requireStepUp middleware declared'
NeedAny @('requireStepUpWrite(') 'requireStepUpWrite middleware declared'
NeedAny @('/api/auth') 'auth router mounted'
NeedAny @('/totp/status','/auth/totp/status') 'totp status route mounted'
NeedAny @('/totp/setup','/auth/totp/setup') 'totp setup route mounted'
NeedAny @('/totp/enable','/auth/totp/enable') 'totp enable route mounted'
NeedAny @('/totp/verify','/auth/totp/verify') 'totp verify route mounted'
NeedAny @('stepUpRequired') 'login returns stepUpRequired flag'
NeedAny @('requireStepUp("SUPER_ADMIN")',"requireStepUp('SUPER_ADMIN')") 'admin route guarded by step-up'
NeedAny @('requireStepUpWrite(') 'room sensitive writes guarded by step-up write'
Write-Host 'STEP1 TOTP STEP-UP REPO CONTRACT CHECK PASS'
