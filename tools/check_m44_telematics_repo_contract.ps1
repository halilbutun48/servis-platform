param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function Ok([string]$m) { Write-Host "OK $m" }
function NeedExists([string]$file) {
  $p = Join-Path $RepoRoot $file
  if (-not (Test-Path -LiteralPath $p)) { throw "FAIL $file exists" }
  Ok "$file exists"
}
function NeedContains([string]$file, [string]$needle, [string]$label) {
  $p = Join-Path $RepoRoot $file
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Ok $label
}
function NeedAnyFileContains([string[]]$files, [string[]]$needles, [string]$label) {
  foreach ($file in $files) {
    $p = Join-Path $RepoRoot $file
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
    foreach ($needle in $needles) {
      if ($txt.Contains($needle)) { Ok $label; return }
    }
  }
  throw "FAIL $label"
}
function NeedRegex([string]$file, [string]$pattern, [string]$label) {
  $p = Join-Path $RepoRoot $file
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not [regex]::IsMatch($txt, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
    throw "FAIL $label"
  }
  Ok $label
}

Write-Host "INFO Checking backend telematics files"
@(
  'backend\src\routes\telematics.js',
  'backend\src\telematics\hash.js',
  'backend\src\telematics\providers.js',
  'backend\src\telematics\service.js',
  'backend\scripts\m44_telematics_check.js'
) | ForEach-Object { NeedExists $_ }

Write-Host "INFO Checking prisma schema additions"
NeedContains 'backend\prisma\schema.prisma' 'enum GpsDeviceStatus' 'schema has GpsDeviceStatus enum'
NeedContains 'backend\prisma\schema.prisma' 'model GpsDevice' 'schema has GpsDevice model'
NeedRegex 'backend\prisma\schema.prisma' 'model\s+Vehicle\s*\{[\s\S]*?\bgpsDevices\b[\s\S]*?\}' 'vehicle has gpsDevices relation'

Write-Host "INFO Checking env + compose wiring"
NeedContains '.env.example' 'TELEMATICS_ENABLED' '.env example has TELEMATICS_ENABLED'
NeedContains '.env.example' 'TELEMATICS_VENDOR_SECRET_GENERIC' '.env example has TELEMATICS_VENDOR_SECRET_GENERIC'
NeedContains '.env.example' 'TELEMATICS_VENDOR_SECRET_TRACCAR' '.env example has TELEMATICS_VENDOR_SECRET_TRACCAR'
NeedContains '.env.example' 'TELEMATICS_VENDOR_SHARED_SECRET_LEGACY_ALLOWED' '.env example has TELEMATICS_VENDOR_SHARED_SECRET_LEGACY_ALLOWED'
NeedContains 'infra\docker-compose.yml' 'TELEMATICS_ENABLED' 'docker compose passes TELEMATICS_ENABLED'
NeedContains 'infra\docker-compose.yml' 'TELEMATICS_VENDOR_SECRET_GENERIC' 'docker compose passes TELEMATICS_VENDOR_SECRET_GENERIC'
NeedContains 'infra\docker-compose.yml' 'TELEMATICS_VENDOR_SECRET_TRACCAR' 'docker compose passes TELEMATICS_VENDOR_SECRET_TRACCAR'

Write-Host "INFO Checking server + tools wiring"
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\routeMounts.js') @('/api/telematics') 'server mounts telematics router'
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\routeMounts.js') @('telematicsLimiter') 'server applies telematics limiter'
NeedContains 'tools\pack_m44_telematics.ps1' 'm44_telematics_check.js' 'pack runs m44 runtime check'
NeedContains 'tools\check_m44_telematics_repo_contract.ps1' 'server mounts telematics router' 'repo contract includes telematics mount assertion'

Write-Host 'M44 TELEMATICS REPO CONTRACT PASS'
