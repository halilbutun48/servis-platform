# tools\panel-smoke.ps1
# Panel-level smoke checks (auth + key role endpoints + optional DB user list)
# ASCII-only.

param(
  [string]$Backend = "http://localhost:3000",
  [string]$Web     = "http://localhost:5173",
  [string]$Password = "Demo123!",
  [switch]$CheckDb
)

$ErrorActionPreference = "Stop"

function Pass([string]$m){ Write-Host ("PASS  " + $m) -ForegroundColor Green }
function Warn([string]$m){ Write-Host ("WARN  " + $m) -ForegroundColor Yellow }
function Fail([string]$m){ Write-Host ("FAIL  " + $m) -ForegroundColor Red; throw $m }

function Get-Json([string]$url, [hashtable]$headers=@{}){
  return Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 10
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# --- prereq: gen-token tool must exist ---
$tokenTool = Join-Path $root "backend\tools\gen-token.js"
if (-not (Test-Path $tokenTool)) { Fail ("gen-token.js missing: " + $tokenTool) }

function Get-Jwt([string]$email, [string]$pass){
  $raw = (node $tokenTool $email $pass 2>&1 | Out-String)
  $m = [regex]::Match($raw, 'eyJ[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+')
  if (-not $m.Success) {
    throw ("JWT not found for " + $email + ". Output: " + ($raw -replace "\s+"," "))
  }
  return $m.Value
}

# --- optional DB check (exactly demo users only) ---
if ($CheckDb) {
  try {
    docker ps 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) { throw "docker not available" }

    # Count
    $cnt = @'
SELECT COUNT(*) FROM public."User";
'@ | docker exec -i servis_postgres psql -U postgres -d servisdb -t -A -P pager=off
    $cnt = [int]($cnt.Trim())

    # Emails (one per line)
    $emailsRaw = @'
SELECT "email" FROM public."User" ORDER BY "email";
'@ | docker exec -i servis_postgres psql -U postgres -d servisdb -t -A -P pager=off

    $emails = @($emailsRaw -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })

    $expected = @(
      "admin@demo.com",
      "room@demo.com",
      "school_admin@demo.com",
      "driver_seed@demo.com",
      "parent_seed@demo.com"
    )

    $missing = @($expected | Where-Object { $emails -notcontains $_ })
    $extra   = @($emails   | Where-Object { $expected -notcontains $_ })

    if ($cnt -ne 5) { Fail ("DB User count expected 5, got " + $cnt) }
    if ($missing.Count -gt 0) { Fail ("DB missing expected user(s): " + ($missing -join ", ")) }
    if ($extra.Count -gt 0) { Fail ("DB has extra user(s): " + ($extra -join ", ")) }

    Pass "DB users: exactly 5 demo accounts (no extras)"
  } catch {
    Warn ("DB check skipped/failed: " + ($_.Exception.Message -replace "\s+"," "))
  }
}

# --- basic health/build ---
Get-Json "$Backend/api/_ping" | Out-Null
Pass "BE /api/_ping"

$beBuildObj  = Get-Json "$Backend/api/_build"
Pass "BE /api/_build"

$webBuildObj = Get-Json "$Web/api/_build"
Pass "WEB /api/_build"

function Get-BuildId($x){
  if ($null -eq $x) { return "" }
  if ($x -is [string]) { return $x.Trim() }
  if ($x.PSObject.Properties.Name -contains "buildId") { return [string]$x.buildId }
  if ($x.PSObject.Properties.Name -contains "build")   { return [string]$x.build }
  if ($x.PSObject.Properties.Name -contains "id")      { return [string]$x.id }
  return ($x | ConvertTo-Json -Compress)
}

$beBuild  = Get-BuildId $beBuildObj
$webBuild = Get-BuildId $webBuildObj
if ($beBuild -and $webBuild -and ($beBuild -eq $webBuild)) {
  Pass ("Build match: " + $beBuild)
} else {
  Fail ("Build mismatch: BE=" + $beBuild + " WEB=" + $webBuild)
}

# --- role auth checks + minimal panel endpoints ---
$users = @(
  @{ Role="SUPER_ADMIN";  Email="admin@demo.com" },
  @{ Role="SERVICE_ROOM"; Email="room@demo.com" },
  @{ Role="SCHOOL_ADMIN"; Email="school_admin@demo.com"; NeedsSchoolMe=$true },
  @{ Role="DRIVER";       Email="driver_seed@demo.com" },
  @{ Role="PARENT";       Email="parent_seed@demo.com"; NeedsEventsMe=$true }
)

$rows = @()

foreach ($u in $users) {
  try {
    $jwt = Get-Jwt $u.Email $Password
    $headers = @{ "x-auth-token" = $jwt }

    $meResp = Get-Json "$Backend/api/me" $headers
    if (-not $meResp.ok) { throw "/api/me ok=false" }

    $meEmail = $meResp.me.email
    $meRole  = $meResp.me.role
    $schoolId = $meResp.me.schoolId

    if ($meEmail -ne $u.Email) { throw ("/api/me email mismatch: " + $meEmail) }
    if ($meRole  -ne $u.Role)  { throw ("/api/me role mismatch: " + $meRole) }

    # School admin: school/me must match schoolId
    if ($u.ContainsKey("NeedsSchoolMe") -and $u.NeedsSchoolMe) {
      $sch = Get-Json "$Backend/api/school/me" $headers
      if (-not $sch.ok) { throw "/api/school/me ok=false" }
      if ($null -eq $schoolId) { throw "schoolId is null for SCHOOL_ADMIN" }
      if ([int]$sch.school.id -ne [int]$schoolId) { throw "school/me id != me.schoolId" }
      Pass ("SCHOOL_ADMIN school/me OK (schoolId=" + $schoolId + ")")
    }

    # Parent: events/me must exist and return ok=true
    if ($u.ContainsKey("NeedsEventsMe") -and $u.NeedsEventsMe) {
      $ev = Get-Json "$Backend/api/events/me" $headers
      if (-not $ev.ok) { throw "/api/events/me ok=false" }
      Pass "PARENT events/me OK"
    }

    $rows += [pscustomobject]@{
      Email    = $u.Email
      Expected = $u.Role
      Ok       = $true
      Role     = $meRole
      SchoolId = $schoolId
      Error    = ""
    }

    Pass ("AUTH OK: " + $u.Role + " (" + $u.Email + ")")
  } catch {
    $rows += [pscustomobject]@{
      Email    = $u.Email
      Expected = $u.Role
      Ok       = $false
      Role     = ""
      SchoolId = ""
      Error    = ($_.Exception.Message -replace "\s+"," ")
    }
    Fail ("AUTH FAIL: " + $u.Role + " (" + $u.Email + ") :: " + ($_.Exception.Message -replace "\s+"," "))
  }
}

Write-Host ""
Write-Host "=== PANEL SMOKE SUMMARY ===" -ForegroundColor Cyan
$rows | Format-Table -AutoSize

Pass "PANEL SMOKE: ALL GREEN"
exit 0
