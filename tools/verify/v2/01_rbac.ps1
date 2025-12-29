param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ExpectedBuild = "",
  [int]$VehicleId = 1,
  [int]$SchoolId = 1,
  [int]$RouteId = 1
)
$ErrorActionPreference="Stop"

function NormBase([string]$u){
  $u = ([string]$u).Trim()
  if(-not ($u.StartsWith("http://") -or $u.StartsWith("https://"))){ $u = "http://$u" }
  return $u.TrimEnd("/")
}
$BaseUrl = NormBase $BaseUrl

function Fail([string]$msg){
  Write-Host ("FAIL " + $msg) -ForegroundColor Red
  $script:failed = $true
}
function Pass([string]$msg){
  Write-Host ("PASS " + $msg) -ForegroundColor Green
}
function Warn([string]$msg){
  Write-Host ("WARN " + $msg) -ForegroundColor Yellow
}

function GetToken([string]$email,[string]$password){
  try {
    $body = @{ email=$email; password=$password } | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Method Post -Uri ($BaseUrl + "/api/auth/login") -ContentType "application/json" -Body $body -TimeoutSec 15
    if($r.token){ return [string]$r.token }
    if($r.data -and $r.data.token){ return [string]$r.data.token }
    return ""
  } catch {
    return ""
  }
}

function TryGet([string]$path,[string]$token){
  try{
    $h = @{}
    if($token){ $h["x-auth-token"] = $token }
    $r = Invoke-RestMethod -Uri ($BaseUrl + $path) -Headers $h -TimeoutSec 15
    return @{ ok=$true; status=200; body=$r }
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    return @{ ok=$false; status=$code; err=$_.Exception.Message }
  }
}

$failed = $false

# Demo creds (repo icinde zaten kullaniliyor)
$creds = @(
  @{ role="SUPER_ADMIN";  email="admin@demo.com";       pass="demo123" },
  @{ role="SERVICE_ROOM"; email="room@demo.com";        pass="demo123" },
  @{ role="SCHOOL_ADMIN"; email="school_admin@demo.com";pass="demo123" },
  @{ role="DRIVER";       email="driver_seed@demo.com"; pass="demo123" },
  @{ role="PARENT";       email="parent_seed@demo.com"; pass="demo123" }
)

$tokens = @{}
foreach($c in $creds){
  $t = GetToken $c.email $c.pass
  if(-not $t){
    Fail ("auth login failed for " + $c.role + " (" + $c.email + ")")
  } else {
    $tokens[$c.role] = $t
    Pass ("auth OK " + $c.role)
  }
}

if($failed){ exit 1 }

# === RBAC MATRIX (minimum) ===
# 1) /api/me -> herkes 200
foreach($role in $tokens.Keys){
  $r = TryGet "/api/me" $tokens[$role]
  if($r.ok){ Pass ("/me ok " + $role) } else { Fail ("/me " + $role + " status=" + $r.status) }
}

# 2) /api/school/me -> SCHOOL_ADMIN 200, digerleri 403/401
foreach($role in $tokens.Keys){
  $r = TryGet "/api/school/me" $tokens[$role]
  if($role -eq "SCHOOL_ADMIN"){
    if($r.ok){ Pass ("/school/me ok SCHOOL_ADMIN") } else { Fail ("/school/me SCHOOL_ADMIN status=" + $r.status) }
  } else {
    if(-not $r.ok -and ($r.status -eq 401 -or $r.status -eq 403)){
      Pass ("/school/me blocked " + $role + " (" + $r.status + ")")
    } elseif($r.ok){
      Warn ("/school/me unexpectedly allowed for " + $role)
    } else {
      Fail ("/school/me unexpected status for " + $role + " => " + $r.status)
    }
  }
}

# 3) /api/admin/schools -> SUPER_ADMIN ve SERVICE_ROOM 200, digerleri 403/401
foreach($role in $tokens.Keys){
  $r = TryGet "/api/admin/schools" $tokens[$role]
  if($role -in @("SUPER_ADMIN","SERVICE_ROOM")){
    if($r.ok){ Pass ("/admin/schools ok " + $role) } else { Fail ("/admin/schools " + $role + " status=" + $r.status) }
  } else {
    if(-not $r.ok -and ($r.status -eq 401 -or $r.status -eq 403)){
      Pass ("/admin/schools blocked " + $role + " (" + $r.status + ")")
    } elseif($r.ok){
      Warn ("/admin/schools unexpectedly allowed for " + $role)
    } else {
      Fail ("/admin/schools unexpected status for " + $role + " => " + $r.status)
    }
  }
}

if($failed){ exit 1 } else { exit 0 }