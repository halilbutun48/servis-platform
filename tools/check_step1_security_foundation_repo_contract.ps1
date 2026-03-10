param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Must-Contain {
  param(
    [string]$File,
    [string]$Needle,
    [string]$Label
  )
  $path = Join-Path $RepoRoot $File
  if (!(Test-Path $path)) { throw "repo contract fail: $Label :: file not found $path" }
  $raw = Get-Content -Raw -LiteralPath $path
  if ($raw -notlike "*${Needle}*") { throw "repo contract fail: $Label :: missing '$Needle' in $path" }
  Write-Host "OK $Label"
}

Write-Host ""
Write-Host "=== STEP1 SECURITY FOUNDATION REPO CONTRACT CHECK ==="

Must-Contain -File "backend/src/server.js" -Needle "const exportLimiter = rateLimit(" -Label "export limiter declared"
Must-Contain -File "backend/src/server.js" -Needle 'app.use("/api/logs/export", exportLimiter);' -Label "scoped log export limiter mounted"
Must-Contain -File "backend/src/server.js" -Needle 'app.use("/api/admin/logs/export", exportLimiter);' -Label "admin log export limiter mounted"
Must-Contain -File "backend/src/server.js" -Needle 'app.use("/api/auth/login", authLimiter);' -Label "login limiter mounted"
Must-Contain -File "backend/src/server.js" -Needle 'app.use("/api/gps", gpsLimiter);' -Label "gps limiter mounted"
Must-Contain -File "backend/src/server.js" -Needle 'handler: limiter429Handler' -Label "rate limit handler wired"
Must-Contain -File "backend/src/env.js" -Needle 'EXPORT_RATE_LIMIT_WINDOW_MS' -Label "export limiter env window"
Must-Contain -File "backend/src/env.js" -Needle 'EXPORT_RATE_LIMIT_MAX' -Label "export limiter env max"
Must-Contain -File "backend/src/routes/auth.js" -Needle 'AUTH_REFRESH_REUSE_DETECTED' -Label "refresh reuse audit action"
Must-Contain -File "backend/src/routes/auth.js" -Needle 'REFRESH_REUSE_DETECTED' -Label "refresh reuse response code"
Must-Contain -File "backend/src/routes/auth.js" -Needle 'await prisma.refreshSession.updateMany({' -Label "refresh reuse revokes active sessions"
Must-Contain -File "backend/scripts/step1_security_foundation_check.js" -Needle 'company admin stats forbidden' -Label "rbac runtime harness company deny case"
Must-Contain -File "backend/scripts/step1_security_foundation_check.js" -Needle 'parent driver today forbidden' -Label "rbac runtime harness parent deny case"

Write-Host ""
Write-Host "=== STEP1 SECURITY FOUNDATION REPO CONTRACT PASS OK ==="

