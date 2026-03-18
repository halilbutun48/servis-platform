param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host "INFO $m" }
function Ok($m){ Write-Host "OK $m" }
function MustExist($rel){ $p = Join-Path $RepoRoot $rel; if (!(Test-Path -LiteralPath $p)) { throw "FAIL $rel missing" }; Ok "$rel exists" }
function MustContain($rel, $needle, $label){
  $p = Join-Path $RepoRoot $rel
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Ok $label
}
function MustMatch($rel, $pattern, $label){
  $p = Join-Path $RepoRoot $rel
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if ($txt -notmatch $pattern) { throw "FAIL $label" }
  Ok $label
}

Info 'Checking backend telematics files'
@(
  'backend\src\routes\telematics.js',
  'backend\src\telematics\hash.js',
  'backend\src\telematics\providers.js',
  'backend\src\telematics\service.js',
  'backend\scripts\m44_telematics_check.js'
) | ForEach-Object { MustExist $_ }

Info 'Checking prisma schema additions'
MustContain 'backend\prisma\schema.prisma' 'enum GpsDeviceStatus {' 'schema has GpsDeviceStatus enum'
MustContain 'backend\prisma\schema.prisma' 'model GpsDevice {' 'schema has GpsDevice model'
MustMatch 'backend\prisma\schema.prisma' 'gpsDevices\s+GpsDevice\[\]' 'vehicle has gpsDevices relation'

Info 'Checking env + compose wiring'
MustContain '.env.example' 'TELEMATICS_ENABLED=1' '.env example has TELEMATICS_ENABLED'
MustContain '.env.example' 'TELEMATICS_VENDOR_SHARED_SECRET=' '.env example has TELEMATICS_VENDOR_SHARED_SECRET'
MustContain 'infra\docker-compose.yml' 'TELEMATICS_ENABLED' 'docker compose passes TELEMATICS_ENABLED'
MustContain 'infra\docker-compose.yml' 'TELEMATICS_VENDOR_SHARED_SECRET' 'docker compose passes TELEMATICS_VENDOR_SHARED_SECRET'

Info 'Checking server + tools wiring'
MustContain 'backend\src\server.js' 'app.use("/api/telematics", telematicsLimiter);' 'server applies telematics limiter'
MustContain 'backend\src\server.js' 'app.use("/api/telematics", telematicsRouter(io));' 'server mounts telematics router'
MustContain 'tools\README.md' 'pack_m44_telematics.ps1' 'tools readme mentions m44 pack'
MustExist 'tools\pack_m44_telematics.ps1'
MustExist 'tools\check_m44_telematics_repo_contract.ps1'
MustExist 'docs\overlays\OVERLAY_NOTES_M44_TELEMATICS_2026-03-10.md'

Write-Host 'M44 TELEMATICS REPO CONTRACT PASS'
