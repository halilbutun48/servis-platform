$ErrorActionPreference="Stop"

function HC([string]$name,[string]$url){
  $r = Invoke-RestMethod -Uri $url -TimeoutSec 6
  "$name OK -> $url"
  return $r
}

# Public/health
HC "BE /_ping"  "http://127.0.0.1:3000/api/_ping"  | Out-Null
$beBuild = HC "BE /_build" "http://127.0.0.1:3000/api/_build"
$webBuild = HC "WEB proxy /_build" "http://127.0.0.1:5173/api/_build"
HC "BE gps last" "http://127.0.0.1:3000/api/gps/last?vehicleId=1" | Out-Null

# Token varsa auth'lı endpointleri de doğrula
# Kullanım: $env:SERVIS_TOKEN="..."; .\tools\smoke.ps1
if ($env:SERVIS_TOKEN) {
  $h = @{ "x-auth-token" = $env:SERVIS_TOKEN }

  Invoke-RestMethod -Headers $h -Uri "http://127.0.0.1:3000/api/me" -TimeoutSec 6 | Out-Null
  "AUTH /api/me OK"

  # Veli tarafı
  try {
    Invoke-RestMethod -Headers $h -Uri "http://127.0.0.1:3000/api/events/me" -TimeoutSec 6 | Out-Null
    "AUTH /api/events/me OK"
  } catch {
    "AUTH /api/events/me SKIP/FAIL (role veya route yok olabilir)"
  }

  # School scope
  try {
    Invoke-RestMethod -Headers $h -Uri "http://127.0.0.1:3000/api/school/me" -TimeoutSec 6 | Out-Null
    "AUTH /api/school/me OK"
  } catch {
    "AUTH /api/school/me SKIP/FAIL (role veya route yok olabilir)"
  }
} else {
  "SERVIS_TOKEN yok: Auth testleri atlandı (env var: `$env:SERVIS_TOKEN)"
}

"SMOKE: ALL GREEN (auth testleri token varsa)"
