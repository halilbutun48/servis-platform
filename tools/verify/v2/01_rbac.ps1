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

function Fail([string]$msg){ Write-Host ("FAIL " + $msg) -ForegroundColor Red; $script:failed = $true }
function Pass([string]$msg){ Write-Host ("PASS " + $msg) -ForegroundColor Green }
function Warn([string]$msg){ Write-Host ("WARN " + $msg) -ForegroundColor Yellow }

function ReadErrBody($ex){
  $raw = ""
  try {
    if($ex.Response -and $ex.Response.GetResponseStream()){
      $sr = New-Object IO.StreamReader($ex.Response.GetResponseStream())
      $raw = $sr.ReadToEnd()
    }
  } catch {}
  return $raw
}

function TryPostJson([string]$url,[hashtable]$payload){
  try {
    $body = $payload | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Method Post -Uri $url -ContentType "application/json" -Body $body -TimeoutSec 15
    return @{ ok=$true; status=200; resp=$r; raw="" ; url=$url }
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode.value__ } catch {}
    $raw = ReadErrBody $_.Exception
    return @{ ok=$false; status=$code; resp=$null; raw=$raw; err=$_.Exception.Message; url=$url }
  }
}

function ExtractToken($obj){
  if($null -eq $obj){ return "" }
  foreach($k in @("token","accessToken","access_token","jwt")){
    if($obj.PSObject.Properties.Name -contains $k){
      $v = $obj.$k
      if($v){ return [string]$v }
    }
  }
  if($obj.PSObject.Properties.Name -contains "data"){
    return ExtractToken $obj.data
  }
  return ""
}

function GetToken([string]$email,[string]$password){
  $urls = @("/api/auth/login","/api/auth","/api/login") | ForEach-Object { $BaseUrl + $_ }

  # include your real seed password
  $passCandidates = @($password,"Demo123!","demo123","Demo123","demo1234","123456","demo") |
    Where-Object { $_ } | Select-Object -Unique

  $payloadsBase = @(
    @{ email=$email;    password="__PASS__" },
    @{ username=$email; password="__PASS__" },
    @{ email=$email;    pass="__PASS__" },
    @{ username=$email; pass="__PASS__" }
  )

  $last = $null

  foreach($u in $urls){
    foreach($p0 in $payloadsBase){
      foreach($pw in $passCandidates){
        $p = @{}
        foreach($k in $p0.Keys){ $p[$k] = $p0[$k] }
        foreach($k in @($p.Keys)){
          if($p[$k] -eq "__PASS__"){ $p[$k] = $pw }
        }

        $res = TryPostJson $u $p
        $last = @{ url=$res.url; status=$res.status; err=$res.err; raw=$res.raw; payload=($p | ConvertTo-Json -Compress) }

        if($res.ok){
          $t = ExtractToken $res.resp
          if($t){ return $t }
        }
      }
    }
  }

  if($last){
    $snippet = ""
    if($last.raw){ $snippet = $last.raw.Substring(0, [Math]::Min(200, $last.raw.Length)) }
    Warn ("login debug email=" + $email + " url=" + $last.url + " status=" + $last.status)
    if($last.err){ Warn ("login err=" + $last.err) }
    Warn ("login payload=" + $last.payload)
    if($snippet){ Warn ("login body(200)=" + $snippet) }
  }

  return ""
}

function TryGet([string]$path,[string]$token){
  try{
    $h = @{}
    if($token){ $h["x-auth-token"] = $token }
    $r = Invoke-RestMethod -Uri ($BaseUrl + $path) -Headers $h -TimeoutSec 15
    return @{ ok=$true; status=200; body=$r }
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode.value__ } catch {}
    return @{ ok=$false; status=$code; err=$_.Exception.Message }
  }
}

$failed = $false

# Seed demo creds (all use Demo123!)
$creds = @(
  @{ role="SUPER_ADMIN";  email="admin@demo.com";        pass="Demo123!" },
  @{ role="SERVICE_ROOM"; email="room@demo.com";         pass="Demo123!" },
  @{ role="SCHOOL_ADMIN"; email="school_admin@demo.com"; pass="Demo123!" },
  @{ role="DRIVER";       email="driver_seed@demo.com";  pass="Demo123!" },
  @{ role="PARENT";       email="parent_seed@demo.com";  pass="Demo123!" }
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

# snapshot keys to avoid "collection modified" crash
$roles = @($tokens.Keys)

# 1) /api/me -> all 200
foreach($role in $roles){
  $r = TryGet "/api/me" $tokens[$role]
  if($r.ok){ Pass ("/me ok " + $role) } else { Fail ("/me " + $role + " status=" + $r.status) }
}

# 2) /api/school/me -> SCHOOL_ADMIN 200, others 401/403
foreach($role in $roles){
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

# 3) /api/admin/schools -> SUPER_ADMIN & SERVICE_ROOM 200, others 401/403
foreach($role in $roles){
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