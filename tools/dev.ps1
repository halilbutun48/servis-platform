param(
  [int]$BackendPort = 3000,
  [int]$WebPort = 5173
)

function Kill-Port([int]$port) {
  $listens = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $listens) {
    $pid = $c.OwningProcess
    if ($pid -and $pid -ne 0) {
      try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
    }
  }
}

function Wait-Http([string]$url, [int]$timeoutSec = 20) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    try {
      $r = Invoke-RestMethod $url -TimeoutSec 3
      return $true
    } catch {
      Start-Sleep -Milliseconds 400
    }
  }
  return $false
}

Write-Host "Stopping old processes on ports $BackendPort and $WebPort..."
Kill-Port $BackendPort
Kill-Port $WebPort

Write-Host "Starting BACKEND..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd D:\servis-platform\backend; node .\server.js"
) | Out-Null

if (-not (Wait-Http "http://127.0.0.1:$BackendPort/api/_ping" 25)) {
  Write-Host "BACKEND did not respond on /api/_ping" -ForegroundColor Red
  exit 1
}
Write-Host "BACKEND OK"

Write-Host "Starting WEB (Vite)..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd D:\servis-platform\web; npm run dev"
) | Out-Null

if (-not (Wait-Http "http://127.0.0.1:$WebPort/api/_ping" 25)) {
  Write-Host "WEB proxy did not respond on /api/_ping" -ForegroundColor Red
  exit 1
}
Write-Host "WEB OK"

Start-Process "http://localhost:$WebPort/"
Write-Host "DONE: http://localhost:$WebPort/" -ForegroundColor Green