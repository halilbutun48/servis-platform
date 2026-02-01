# tools/gate.ps1
param(
  [Parameter(Mandatory=$false)]
  [ValidateRange(0,16)]
  [int]$To = 15,

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

# ✅ default: M0..M16
$checks = @(
  @{ n = 0;  name="M0";  cmd="node scripts/m0check.js"  },
  @{ n = 1;  name="M1";  cmd="node scripts/m1check.js"  },
  @{ n = 2;  name="M2";  cmd="node scripts/m2check.js"  },
  @{ n = 3;  name="M3";  cmd="node scripts/m3check.js"  },
  @{ n = 4;  name="M4";  cmd="node scripts/m4check.js"  },
  @{ n = 5;  name="M5";  cmd="node scripts/m5check.js"  },
  @{ n = 6;  name="M6";  cmd="node scripts/m6check.js"  },
  @{ n = 7;  name="M7";  cmd="node scripts/m7check.js"  },
  @{ n = 8;  name="M8";  cmd="node scripts/m8check.js"  },
  @{ n = 9;  name="M9";  cmd="node scripts/m9check.js"  },
  @{ n = 10; name="M10"; cmd="node scripts/m10check.js" },
  @{ n = 11; name="M11"; cmd="node scripts/m11check.js" },
  @{ n = 12; name="M12"; cmd="node scripts/m12check.js" },
  @{ n = 13; name="M13"; cmd="node scripts/m13check.js" },
  @{ n = 14; name="M14"; cmd="node scripts/m14check.js" },
  @{ n = 15; name="M15"; cmd="node scripts/m15check.js" },
  @{ n = 16; name="M16"; cmd="node scripts/m16check.js" }
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

# Include all checks up to -To; missing scripts are a hard error (milestone discipline)
$runList = @()
foreach ($c in $checks) {
  if ($c.n -gt $To) { continue }

  $hostPath = Join-Path $backend ("scripts/m{0}check.js" -f $c.n)
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
  Dc -f $composeFile up -d --remove-orphans | Out-Host
} else {
  Write-Host "=== Docker Compose Build+Up ===" -ForegroundColor Cyan
  Dc -f $composeFile up -d --build --remove-orphans | Out-Host
}

# Wait API health
Write-Host ""
Write-Host "=== API Health ===" -ForegroundColor Cyan
$max = 60
$ok = $false
for ($i=0; $i -lt $max; $i++) {
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

  # alpine güvenli: bash yerine sh
  Dc -f $composeFile exec -T $ApiService sh -lc ("cd /app/backend && {0}" -f $c.cmd) | Out-Host
}

Write-Host ""
Write-Host ("=== GATE PASS ✅ (M0→M{0}) ===" -f $To) -ForegroundColor Green
Write-Host ""
