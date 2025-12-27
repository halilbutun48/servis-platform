# tools/phase3-absence.ps1
param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$VerboseOut
)

# Normalize BaseUrl (PS 5.1 friendly)
$BaseUrl = ([string]$BaseUrl).Trim()
if (-not ($BaseUrl.StartsWith("http://") -or $BaseUrl.StartsWith("https://"))) {
  $BaseUrl = "http://$BaseUrl"
}
$BaseUrl = $BaseUrl.TrimEnd("/")

$ErrorActionPreference = "Stop"

function Fail([string]$msg) {
  Write-Host "FAIL $msg"
  exit 1
}

function Assert([bool]$cond, [string]$msg) {
  if (-not $cond) { Fail $msg }
}

function Get-StatusCode($err) {
  try {
    $r = $err.Exception.Response
    if ($null -eq $r) { return $null }
    return [int]$r.StatusCode
  } catch {
    return $null
  }
}

function Get-Token($email, $password) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json -Compress
  $r = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body $body
  Assert ([bool]$r.token) "token missing for $email"
  return $r.token
}

function Api($method, $url, $token, $bodyObj=$null) {
  $u = ([string]$url).Trim()
  # gizli CRLF/tab/space temizle (URI patlamasın)
  $u = $u -replace "[`r`n`t ]", ""

  if ($VerboseOut) { Write-Host "CALL $method $u" }

  $headers = @{ "x-auth-token" = $token }

  if ($null -eq $bodyObj) {
    return Invoke-RestMethod -Method $method -Uri ([Uri]$u) -Headers $headers
  } else {
    $json = $bodyObj | ConvertTo-Json -Depth 20 -Compress
    return Invoke-RestMethod -Method $method -Uri ([Uri]$u) -Headers $headers -ContentType "application/json" -Body $json
  }
}

function Has-Prop($obj, [string]$name) {
  if ($null -eq $obj) { return $false }
  try {
    return ($obj.PSObject.Properties.Name -contains $name)
  } catch {
    return $false
  }
}

function Pick-Items($obj) {
  if ($null -eq $obj) { return @() }

  # direkt array döndüyse
  if ($obj -is [System.Array]) { return @($obj) }

  # güvenli property kontrolü
  if (Has-Prop $obj "items" -and $null -ne $obj.items) { return @($obj.items) }
  if (Has-Prop $obj "students" -and $null -ne $obj.students) { return @($obj.students) }
  if (Has-Prop $obj "absences" -and $null -ne $obj.absences) { return @($obj.absences) }

  return @()
}

function Pick-Id($obj) {
  if ($null -eq $obj) { return $null }
  if (Has-Prop $obj "id" -and $null -ne $obj.id) { return [int]$obj.id }
  if (Has-Prop $obj "absence" -and $null -ne $obj.absence -and $null -ne $obj.absence.id) { return [int]$obj.absence.id }
  if (Has-Prop $obj "item" -and $null -ne $obj.item -and $null -ne $obj.item.id) { return [int]$obj.item.id }
  if (Has-Prop $obj "student" -and $null -ne $obj.student -and $null -ne $obj.student.id) { return [int]$obj.student.id }
  return $null
}

Write-Host "=== PHASE-3 ABSENCE SMOKE ==="

# 1) login school admin
$tokSchool = Get-Token "school_admin@demo.com" "Demo123!"
Write-Host "PASS auth SCHOOL_ADMIN"

# 2) create or pick a student
$studentsUrl = "$BaseUrl/api/school/students"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$studentName = "Absence Test Student $stamp"

$student = $null
try {
  $resp = Api "POST" $studentsUrl $tokSchool @{ fullName = $studentName }
  Assert ($null -ne $resp.student -and $null -ne $resp.student.id) "student.id missing"
  $student = $resp.student
  Write-Host "PASS student created id=$($student.id)"
} catch {
  Write-Host "WARN student create failed, fallback to list"
  if ($VerboseOut) { Write-Host $_.Exception.Message }

  $list  = Api "GET" $studentsUrl $tokSchool

  # ✅ KRİTİK FIX: tek eleman gelirse scalar olmasın -> her zaman array
  $items = @(Pick-Items $list)

  if ($VerboseOut) {
    Write-Host "DEBUG students list type: $($list.GetType().FullName)"
    try { Write-Host ("DEBUG students props: " + ($list.PSObject.Properties.Name -join ", ")) } catch {}
  }

  Assert ($items.Count -ge 1) "no students found to run absence test"
  $student = $items[0]
  Assert ($null -ne $student.id) "student.id missing in list"
  Write-Host "PASS picked existing student id=$($student.id)"
}

$studentId = [int]$student.id
Assert ($studentId -gt 0) "studentId invalid"

# 3) create absence
$day = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")  # yarın
$absenceUrl = "$BaseUrl/api/absence"

$absResp = $null
try {
  $absResp = Api "POST" $absenceUrl $tokSchool @{
    studentId = $studentId
    day       = $day
    reason    = "Test"
  }
} catch {
  $code = Get-StatusCode $_
  if ($code -eq 404) {
    Fail "MISSING_ENDPOINT: POST /api/absence (backend'de route yok / mount edilmemiş)"
  }
  throw
}

$absenceId = Pick-Id $absResp
Assert ($null -ne $absenceId) "absence.id missing"
Write-Host "PASS absence created id=$absenceId day=$day"

# 4) list absences and verify
$listAbs = $null
try {
  $listAbs = Api "GET" ("{0}?studentId={1}&from={2}&to={3}&take=50" -f $absenceUrl, $studentId, $day, $day) $tokSchool
} catch {
  $code = Get-StatusCode $_
  if ($code -eq 404) { Fail "MISSING_ENDPOINT: GET /api/absence" }
  throw
}

# ✅ KRİTİK FIX: tek eleman gelirse scalar olmasın -> her zaman array
$absItems = @(Pick-Items $listAbs)

# DEBUG: boşsa raw response'u bas
if ($absItems.Count -lt 1 -and $VerboseOut) {
  Write-Host "DEBUG absence list type: $($listAbs.GetType().FullName)"
  try { Write-Host ("DEBUG absence props: " + ($listAbs.PSObject.Properties.Name -join ", ")) } catch {}
  Write-Host "DEBUG absList(raw):"
  $listAbs | ConvertTo-Json -Depth 10
}

Assert ($absItems.Count -ge 1) "absence list empty"
$hit = $absItems | Where-Object { $_.id -eq $absenceId }
Assert ($null -ne $hit) "created absence not found in list"
Write-Host "PASS absence listed"

# 5) duplicate day should fail (409/400 vb)
$dupAllowed = $false
try {
  Api "POST" $absenceUrl $tokSchool @{ studentId = $studentId; day = $day; reason = "Dup" } | Out-Null
  $dupAllowed = $true
} catch {
  $code = Get-StatusCode $_
  if ($code -ge 500) { Fail "duplicate request caused server error ($code)" }
}
Assert (-not $dupAllowed) "duplicate absence was allowed (expected 409/400)"
Write-Host "PASS duplicate blocked"

# 6) delete absence (yoksa WARN)
try {
  Api "DELETE" "$absenceUrl/$absenceId" $tokSchool | Out-Null
  Write-Host "PASS absence deleted"
} catch {
  $code = Get-StatusCode $_
  if ($code -eq 404 -or $code -eq 405) {
    Write-Host "WARN delete endpoint missing (DELETE /api/absence/:id)"
  } else {
    throw
  }
}

Write-Host "=== ABSENCE SMOKE GREEN ==="
