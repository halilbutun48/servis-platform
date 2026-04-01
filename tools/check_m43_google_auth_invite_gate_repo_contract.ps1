param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host "INFO $m" }
function Ok($m){ Write-Host "OK $m" }
function MustExist($rel){ $p = Join-Path $RepoRoot $rel; if (!(Test-Path -LiteralPath $p)) { throw "FAIL $rel missing" }; Ok "$rel exists" }
function MustNotExist($rel){ $p = Join-Path $RepoRoot $rel; if (Test-Path -LiteralPath $p) { throw "FAIL $rel should be removed" }; Ok "$rel removed" }
function MustContain($rel, $needle, $label){ $p = Join-Path $RepoRoot $rel; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if ($txt -notlike "*$needle*") { throw "FAIL $label" }; Ok $label }
function MustNotContain($rel, $needle, $label){ $p = Join-Path $RepoRoot $rel; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if ($txt -like "*$needle*") { throw "FAIL $label" }; Ok $label }

Info 'Checking parent access backend files'
@(
  'backend\src\routes\auth.js',
  'backend\src\routes\auth_step2.js',
  'backend\src\routes\schoolParentInvites.js',
  'backend\scripts\m43_google_auth_invite_gate_check.js'
) | ForEach-Object { MustExist $_ }

Info 'Checking backend wiring'
MustContain 'backend\src\server.js' 'app.use("/api/auth/parent-invite", authLimiter);' 'server rate limits parent access'
MustContain 'backend\src\routes\auth.js' 'authRouter.get("/parent-invite/info"' 'parent access info route exists'
MustContain 'backend\src\routes\auth.js' 'return res.json({ ok: true, access, invite: access });' 'parent access info supports reusable access'
MustContain 'backend\src\routes\auth.js' 'PARENT_ACCESS_LOGIN' 'parent access login audit exists'
MustContain 'backend\src\routes\auth_step2.js' 'AUTH_INVITE_REMOVED' 'legacy auth invite endpoints are disabled'

Info 'Checking web cleanup'
MustExist 'web\src\panels\public\AcceptParentInvitePanel.jsx'
MustExist 'web\src\panels\school\ParentInvitePanel.jsx'
MustNotExist 'web\src\panels\public\AcceptInvitePanel.jsx'
MustNotExist 'web\src\panels\shared\AuthInvitesPanel.jsx'
MustNotExist 'web\src\components\GoogleLoginButton.jsx'
MustContain 'web\src\App.jsx' '/accept-parent-invite' 'app routes accept parent access'
MustNotContain 'web\src\App.jsx' '/accept-invite' 'legacy accept-invite route removed'
MustNotContain 'web\src\App.jsx' 'AuthInvitesPanel' 'auth invites panel import removed'
MustContain 'web\src\layout\NavDock.jsx' '/school/parents' 'school nav exposes parent access'
MustContain 'web\src\panels\public\AcceptParentInvitePanel.jsx' 'accessCode' 'public parent access panel uses access code'
MustContain 'web\src\panels\public\AcceptParentInvitePanel.jsx' 'pin' 'public parent access panel uses pin'
MustContain 'web\src\panels\public\AcceptParentInvitePanel.jsx' 'finishLogin({ token: accessToken });' 'public parent access panel supports direct token login'

Write-Host 'M43 PARENT ACCESS CLEANUP REPO CONTRACT PASS'
