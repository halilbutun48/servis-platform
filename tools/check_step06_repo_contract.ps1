param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'
function Must-Exist([string]$rel,[string]$label){
  $p = Join-Path $RepoRoot $rel
  if (!(Test-Path -LiteralPath $p)) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function Must-Contain([string]$rel,[string]$needle,[string]$label){
  $p = Join-Path $RepoRoot $rel
  $t = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if ($t -notlike "*$needle*") { throw "FAIL $label" }
  Write-Host "OK $label"
}
function Must-NotContain([string]$rel,[string]$needle,[string]$label){
  $p = Join-Path $RepoRoot $rel
  $t = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if ($t -like "*$needle*") { throw "FAIL $label" }
  Write-Host "OK $label"
}

$navDock = 'web\src\layout\NavDock.jsx'
$schoolAccess = 'web\src\panels\school\ParentInvitePanel.jsx'
$acceptAccess = 'web\src\panels\public\AcceptParentInvitePanel.jsx'
$app = 'web\src\App.jsx'
$schoolRoute = 'backend\src\routes\schoolParentInvites.js'
$authRoute = 'backend\src\routes\auth.js'

Must-Exist $navDock "nav dock exists"
Must-Exist $schoolAccess "school parent access panel exists"
Must-Exist $acceptAccess "public parent access panel exists"
Must-Exist $schoolRoute "school parent access route exists"
Must-Exist $authRoute "auth parent access route exists"

Must-Contain $navDock "Veli Erişimi" "school nav parent access label"
Must-Contain $schoolAccess "/api/school/parent-invites" "school parent access endpoint"
Must-Contain $schoolAccess "#/accept-parent-invite?token=" "school parent access public link builder"
Must-Contain $schoolAccess "mail, telefon veya ad soyad gerekmez" "school parent access explains no contact fields"
Must-Contain $acceptAccess "/api/auth/parent-invite/accept" "public accept parent access endpoint"
Must-Contain $acceptAccess "Kod + PIN ile giriş" "public panel uses code + pin"
Must-Contain $app '"/accept-parent-invite"' "public accept route registered"
Must-NotContain $app '"/accept-invite"' "legacy invite accept route removed"

Write-Host "STEP06 PARENT ACCESS REPO CONTRACT PASS"
