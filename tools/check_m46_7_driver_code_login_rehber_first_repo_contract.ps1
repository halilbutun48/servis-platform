param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'

function ReadText([string]$rel){
  $path = Join-Path $RepoRoot $rel
  return [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).Normalize()
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  $norm = [string]$txt
  foreach($needle in $needles){
    if ($needle -and $norm.Contains(([string]$needle).Normalize())) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}
function MustMatch([string]$txt,[string]$pattern,[string]$label){
  if (-not [regex]::IsMatch($txt, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host 'INFO Checking M46.7 files'
@(
  'backend\scripts\m46_7_driver_code_login_rehber_first_check.js',
  'tools\pack_m46_7_driver_code_login_rehber_first.ps1',
  'tools\check_m46_7_driver_code_login_rehber_first_repo_contract.ps1',
  'docs\RUNBOOK_M46_7_DRIVER_CODE_LOGIN_REHBER_FIRST.md',
  'web\src\layout\NavDock.jsx',
  'web\src\layout\AppShell.jsx',
  'web\src\components\copilot\FloatingCopilotDrawer.jsx',
  'web\src\panels\room\DriversPanel.jsx',
  'web\src\panels\driver\PinChangePanel.jsx',
  'web\src\App.jsx',
  'backend\src\routes\drivers.js',
  'backend\src\routes\auth.js',
  'backend\src\routes\me.js',
  'backend\src\validators.js',
  'backend\prisma\schema.prisma'
) | ForEach-Object { MustExist $_ }

Write-Host 'INFO Checking copilot access model'
$shell = ReadText 'web\src\layout\AppShell.jsx'
$drawer = ReadText 'web\src\components\copilot\FloatingCopilotDrawer.jsx'
MustContainText $shell 'FloatingCopilotDrawer' 'app shell mounts floating copilot drawer'
MustContainAny $drawer @('ROOM','COMPANY','DRIVER','PERSONEL','PARENT') 'floating copilot drawer supports role guides'

Write-Host 'INFO Checking driver code login backend'
$schema = ReadText 'backend\prisma\schema.prisma'
$drivers = ReadText 'backend\src\routes\drivers.js'
$auth = ReadText 'backend\src\routes\auth.js'
$me = ReadText 'backend\src\routes\me.js'
$validators = ReadText 'backend\src\validators.js'
MustMatch $schema 'driverCode\s+String\?\s+@unique' 'schema has driverCode'
MustMatch $schema 'pinTemporary\s+Boolean\s+@default\(true\)' 'schema has pinTemporary'
MustContainText $drivers 'loginMode: "DRIVER_CODE_PIN"' 'driver create returns login mode'
MustContainText $drivers 'issuedCredentials' 'driver routes expose issued credentials'
MustContainText $drivers 'reset-pin' 'driver routes include pin reset'
MustContainText $auth 'findLoginUser' 'auth can find login user by identifier'
MustContainText $auth 'driver/change-pin' 'auth exposes driver pin change'
MustContainText $me 'requirePinChange' 'me exposes requirePinChange'
MustContainText $validators 'identifier' 'login schema accepts identifier'

Write-Host 'INFO Checking web driver login flow'
$app = ReadText 'web\src\App.jsx'
$panel = ReadText 'web\src\panels\room\DriversPanel.jsx'
$pinPanel = ReadText 'web\src\panels\driver\PinChangePanel.jsx'
MustContainAny $app @('E-posta veya Sürücü Kodu','Sürücü Kodu','Surucu Kodu','SRC-000001','setIdentifier') 'login card says driver code'
MustContainText $app '/driver/change-pin' 'app routes driver pin change'
MustContainAny $panel @('Sürücü Kodu','Surucu Kodu','driverCode') 'drivers panel shows driver code'
MustContainAny $panel @('Geçici PIN','Gecici PIN','temporaryPin') 'drivers panel shows temporary pin'
MustContainAny $panel @('PIN üret','PIN uret','resetPin(','temporaryPin') 'drivers panel can reset pin'
MustContainAny $pinPanel @("PIN'i Kaydet",'PIN Kaydet','Kaydediliyor...','changeDriverPin(','Yeni PIN belirle','PIN güncellendi','PIN guncellendi') 'driver pin panel can save pin'

Write-Host 'M46.7 DRIVER CODE LOGIN + REHBER FIRST REPO CONTRACT PASS'
