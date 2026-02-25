# tools/gate.ps1
param(
  [Parameter(Mandatory=$false)]
  [ValidateRange(0,34)]
  [int]$To = 21,

  [Parameter(Mandatory=$false)]
  [string]$ComposeDir = "infra",

  [Parameter(Mandatory=$false)]
  [string]$RepoDir = ".",

  [Parameter(Mandatory=$false)]
  [string]$ApiService = "api",

  [Parameter(Mandatory=$false)]
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

# ✅ check list (milestone discipline)
$checks = @(
  @{ n = 0;  name = "M0";  cmd = "node scripts/m0check.js" },
  @{ n = 1;  name = "M1";  cmd = "node scripts/m1check.js" },
  @{ n = 2;  name = "M2";  cmd = "node scripts/m2check.js" },
  @{ n = 3;  name = "M3";  cmd = "node scripts/m3check.js" },
  @{ n = 4;  name = "M4";  cmd = "node scripts/m4check.js" },
  @{ n = 5;  name = "M5";  cmd = "node scripts/m5check.js" },
  @{ n = 6;  name = "M6";  cmd = "node scripts/m6check.js" },
  @{ n = 7;  name = "M7";  cmd = "node scripts/m7check.js" },
  @{ n = 8;  name = "M8";  cmd = "node scripts/m8check.js" },
  @{ n = 9;  name = "M9";  cmd = "node scripts/m9check.js" },
  @{ n = 10; name = "M10"; cmd = "node scripts/m10check.js" },
  @{ n = 11; name = "M11"; cmd = "node scripts/m11check.js" },
  @{ n = 12; name = "M12"; cmd = "node scripts/m12check.js" },
  @{ n = 13; name = "M13"; cmd = "node scripts/m13check.js" },
  @{ n = 14; name = "M14"; cmd = "node scripts/m14check.js" },
  @{ n = 15; name = "M15"; cmd = "node scripts/m15check.js" },

  # Sub-milestones (still under -To 16): deterministic contract checks
  @{ n = 16; name = "M16";   file = "m16check.js";  cmd = "node scripts/m16check.js" },
  @{ n = 16; name = "M16.2"; file = "m162check.js"; cmd = "node scripts/m162check.js" },
  @{ n = 16; name = "M16.3"; file = "m163check.js"; cmd = "node scripts/m163check.js" },

  @{ n = 17; name = "M17"; file = "m17check.js"; cmd = "node scripts/m17check.js" },
  @{ n = 18; name = "M18"; file = "m18check.js"; cmd = "node scripts/m18check.js" },
  @{ n = 19; name = "M19"; file = "m19check.js"; cmd = "node scripts/m19check.js" },
  @{ n = 20; name = "M20"; file = "m20check.js"; cmd = "node scripts/m20check.js" },
  @{ n = 21; name = "M21"; file = "m21check.js"; cmd = "node scripts/m21check.js" },
  @{ n = 22; name = "M22"; file = "m22check.js"; cmd = "node scripts/m22check.js" },
  @{ n = 23; name = "M23"; file = "m23check.js"; cmd = "node scripts/m23check.js" },
  @{ n = 24; name = "M24"; file = "m24check.js"; cmd = "node scripts/m24check.js" },
  @{ n = 25; name = "M25"; file = "m25check.js"; cmd = "node scripts/m25check.js" },
  @{ n = 26; name = "M26"; file = "m26check.js"; cmd = "node scripts/m26check.js" },
  @{ n = 27; name = "M27"; file = "m27check.js"; cmd = "node scripts/m27check.js" },
  @{ n = 28; name = "M28"; file = "m28check.js"; cmd = "node scripts/m28check.js" },
  @{ n = 29; name = "M29"; file = "m29check.js"; cmd = "node scripts/m29check.js" },
  @{ n = 30; name = "M30"; file = "m30check.js"; cmd = "node scripts/m30check.js" },
  @{ n = 31; name = "M31"; file = "m31check.js"; cmd = "node scripts/m31check.js" },
  @{ n = 32; name = "M32"; file = "m32check.js"; cmd = "node scripts/m32check.js" },
  @{ n = 33; name = "M33"; file = "m33check.js"; cmd = "node scripts/m33check.js" },
  @{ n = 34; name = "M34"; file = "m34check.js"; cmd = "node scripts/m34check.js" }
)

$repo = (Resolve-Path $RepoDir).Path
$compose = Join-Path $repo $ComposeDir
$backend = Join-Path $repo "backend"
$composeFile = Join-Path $compose "docker-compose.yml"

if (-not (Test-Path $compose)) { throw "compose dir not found: $compose" }
if (-not (Test-Path $composeFile)) { throw "compose file not found: $composeFile" }
if (-not (Test-Path $backend)) { throw "backend dir not found: $backend" }

Write-Host ""
Write-Host ("=== GATE (M0→M{0}) ===" -f $To) -ForegroundColor Cyan
Write-Host ""

# ✅ Compose runner seçimi:
# - Prefer: docker + "compose"
# - Fallback: docker-compose
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
$dockerComposeCmd = Get-Command docker-compose -ErrorAction SilentlyContinue

$dc = $null
$dcBaseArgs = @()

if ($dockerCmd) {
  $dc = $dockerCmd.Source
  $dcBaseArgs = @("compose")
} elseif ($dockerComposeCmd) {
  $dc = $dockerComposeCmd.Source
  $dcBaseArgs = @()
} else {
  throw "Docker not found. Install Docker Desktop (docker) or docker-compose."
}

function Dc {
  param([Parameter(ValueFromRemainingArguments=$true)] $Args)

  & $dc @dcBaseArgs @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Docker compose command failed: $dc $($dcBaseArgs -join ' ') $($Args -join ' ')"
  }
}

# Include all checks up to -To; missing scripts are a hard error
$runList = @()
foreach ($c in $checks) {
  if ($c.n -gt $To) { continue }

  $scriptFile = if ($c.ContainsKey('file') -and $c.file) { $c.file } else { ("m{0}check.js" -f $c.n) }
  $hostPath = Join-Path $backend ("scripts/{0}" -f $scriptFile)

  if (-not (Test-Path $hostPath)) {
    throw "Missing check script on host ($hostPath) required for -To $To"
  }

  $runList += $c
}

# Clean up any previous run (do NOT remove volumes)
Write-Host "=== Docker Compose Down (safe) ===" -ForegroundColor Cyan
try {
  Dc -f $composeFile down --remove-orphans | Out-Host
} catch {
  # down başarısız olsa bile devam edebiliriz (ilk run vs.)
  Write-Host ("down skipped: {0}" -f ($_.Exception.Message)) -ForegroundColor DarkYellow
}

Write-Host ""

if ($NoBuild) {
  Write-Host "=== Docker Compose Up (NoBuild) ===" -ForegroundColor Cyan
  # IMPORTANT: use --detach (NOT -d), because -d can be captured as PowerShell -Debug
  Dc -f $composeFile up --detach --remove-orphans | Out-Host
} else {
  Write-Host "=== Docker Compose Build+Up ===" -ForegroundColor Cyan
  Dc -f $composeFile up --detach --build --remove-orphans | Out-Host
}

# Wait API health
Write-Host ""
Write-Host "=== API Health ===" -ForegroundColor Cyan

$max = 60
$ok = $false
for ($i = 0; $i -lt $max; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3000/health" -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch {}

  Start-Sleep -Seconds 1
}

if (-not $ok) {
  Write-Host "API health timeout. Last logs:" -ForegroundColor Red
  try { Dc -f $composeFile logs --tail 120 $ApiService | Out-Host } catch {}
  throw "API health timeout"
}

Write-Host "health OK" -ForegroundColor Green

# Run milestone checks inside api container
Write-Host ""
Write-Host "=== Milestone checks ===" -ForegroundColor Cyan

foreach ($c in $runList) {
  Write-Host ""
  Write-Host ("--- {0} ---" -f $c.name) -ForegroundColor Cyan

  # alpine: bash yerine sh
  Dc -f $composeFile exec -T $ApiService sh -lc ("cd /app/backend && {0}" -f $c.cmd) | Out-Host
}

Write-Host ""
Write-Host ("=== GATE PASS ✅ (M0→M{0}) ===" -f $To) -ForegroundColor Green
Write-Host ""
