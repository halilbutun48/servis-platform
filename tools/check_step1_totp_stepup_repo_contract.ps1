param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")

function Need-InFile {
  param([string]$File,[string]$Needle,[string]$Label)
  $raw = Get-Content -Raw -Encoding UTF8 $File
  if ($raw -notlike ("*" + $Needle + "*")) {
    throw "repo contract fail: $Label :: missing '$Needle' in $File"
  }
  Write-StatusLine "OK $Label"
}

Write-StatusLine "=== STEP1 TOTP STEP-UP REPO CONTRACT CHECK ==="

Need-InFile (Join-Path $RepoRoot "backend/src/auth/middleware.js") 'export function requireStepUp(' 'requireStepUp middleware declared'
Need-InFile (Join-Path $RepoRoot "backend/src/auth/middleware.js") 'export function requireStepUpWrite(' 'requireStepUpWrite middleware declared'
Need-InFile (Join-Path $RepoRoot "backend/src/routes/auth.js") '/totp/status' 'totp status route mounted'
Need-InFile (Join-Path $RepoRoot "backend/src/routes/auth.js") '/totp/setup' 'totp setup route mounted'
Need-InFile (Join-Path $RepoRoot "backend/src/routes/auth.js") '/totp/enable' 'totp enable route mounted'
Need-InFile (Join-Path $RepoRoot "backend/src/routes/auth.js") '/totp/verify' 'totp verify route mounted'
Need-InFile (Join-Path $RepoRoot "backend/src/routes/auth.js") 'stepUpRequired:' 'login returns stepUpRequired flag'
Need-InFile (Join-Path $RepoRoot "backend/src/server.js") 'app.use("/api/admin", authRequired(), requireStepUp("SUPER_ADMIN"));' 'admin route guarded by step-up'
Need-InFile (Join-Path $RepoRoot "backend/src/server.js") 'app.use("/api/logs/export", authRequired(), requireStepUp("ROOM", "SUPER_ADMIN"));' 'logs export guarded by step-up'
Need-InFile (Join-Path $RepoRoot "backend/src/server.js") 'app.use("/api/drivers", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));' 'drivers write guarded by step-up'
Need-InFile (Join-Path $RepoRoot "backend/src/server.js") 'app.use("/api/shifts", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));' 'shifts write guarded by step-up'
Need-InFile (Join-Path $RepoRoot "backend/src/auth/totp.js") 'export function verifyTotp(' 'totp verifier present'
# UI checks intentionally ASCII-only to avoid Windows codepage false negatives on Turkish labels.
Need-InFile (Join-Path $RepoRoot "web/src/panels/shared/TotpStepUpCard.jsx") 'onClick={onSetup}' 'web setup card present'
Need-InFile (Join-Path $RepoRoot "web/src/panels/shared/TotpStepUpCard.jsx") 'onClick={onVerify}' 'web verify card present'
Need-InFile (Join-Path $RepoRoot "web/src/layout/AppShell.jsx") '<TotpStepUpCard />' 'app shell renders step-up card'
Need-InFile (Join-Path $RepoRoot "backend/scripts/step1_totp_stepup_check.js") 'room sensitive write blocked before setup' 'runtime harness room pre-setup case'
Need-InFile (Join-Path $RepoRoot "backend/scripts/step1_totp_stepup_check.js") 'super admin stats allowed after verify' 'runtime harness super post-verify case'

Write-StatusLine "=== STEP1 TOTP STEP-UP REPO CONTRACT PASS OK ==="
