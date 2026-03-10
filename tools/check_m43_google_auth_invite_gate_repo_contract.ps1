param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host "INFO $m" }
function Ok($m){ Write-Host "OK $m" }
function MustExist($rel){ $p = Join-Path $RepoRoot $rel; if (!(Test-Path -LiteralPath $p)) { throw "FAIL $rel missing" }; Ok "$rel exists" }
function MustContain($rel, $needle, $label){ $p = Join-Path $RepoRoot $rel; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if ($txt -notlike "*$needle*") { throw "FAIL $label" }; Ok $label }

Info 'Checking new backend files'
@(
  'backend\src\auth\google.js',
  'backend\src\routes\auth_step2.js',
  'backend\scripts\m43_google_auth_invite_gate_check.js'
) | ForEach-Object { MustExist $_ }

Info 'Checking prisma schema additions'
MustContain 'backend\prisma\schema.prisma' 'model UserIdentity {' 'schema has UserIdentity model'
MustContain 'backend\prisma\schema.prisma' 'model Invite {' 'schema has Invite model'
MustContain 'backend\prisma\schema.prisma' 'enum IdentityProvider {' 'schema has IdentityProvider enum'
MustContain 'backend\prisma\schema.prisma' 'enum InviteType {' 'schema has InviteType enum'

Info 'Checking backend wiring'
MustContain 'backend\package.json' 'google-auth-library' 'backend package has google-auth-library'
MustContain 'backend\src\server.js' 'app.use("/api/auth/google", authLimiter);' 'server applies auth limiter to google auth'
MustContain 'backend\src\server.js' 'app.use("/api/auth", authStep2Router);' 'server mounts auth step2 router'
MustContain '.env.example' 'GOOGLE_AUTH_ENABLED=1' '.env example has GOOGLE_AUTH_ENABLED'
MustContain '.env.example' 'GOOGLE_CLIENT_ID=' '.env example has GOOGLE_CLIENT_ID'
MustContain 'infra\docker-compose.yml' 'GOOGLE_AUTH_ENABLED' 'docker compose passes GOOGLE_AUTH_ENABLED'
MustContain 'infra\docker-compose.yml' 'GOOGLE_CLIENT_ID' 'docker compose passes GOOGLE_CLIENT_ID'

Info 'Checking web additions'
@(
  'web\src\components\GoogleLoginButton.jsx',
  'web\src\panels\public\AcceptInvitePanel.jsx',
  'web\src\panels\shared\AuthInvitesPanel.jsx'
) | ForEach-Object { MustExist $_ }
MustContain 'web\.env.example' 'VITE_GOOGLE_CLIENT_ID=' 'web env example has VITE_GOOGLE_CLIENT_ID'
MustContain 'web\src\App.jsx' '/accept-invite' 'app routes accept-invite'
MustContain 'web\src\App.jsx' 'AuthInvitesPanel' 'app imports AuthInvitesPanel'
MustContain 'web\src\layout\NavDock.jsx' 'auth-invites' 'nav has auth-invites entry'
MustContain 'web\src\panels\public\AcceptParentInvitePanel.jsx' 'GoogleLoginButton' 'parent invite panel includes Google login button'

Write-Host 'M43 GOOGLE AUTH + INVITE GATE REPO CONTRACT PASS'
