# tools\inventory-endpoints.ps1
# Lists API endpoints by parsing backend/server.js mounts + backend/routes router.<method>("path")
# ASCII-only.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serverPath = Join-Path $root "backend\server.js"
$routesDir  = Join-Path $root "backend\routes"

if (-not (Test-Path $serverPath)) { throw "Missing: backend\server.js" }
if (-not (Test-Path $routesDir))  { throw "Missing: backend\routes" }

$serverTxt = Get-Content $serverPath -Raw

# app.use("/api/xxx", require("./routes/xxx")) or single quotes
$mountRe = [regex]'app\.use\(\s*["''](?<mount>[^"'']+)["'']\s*,\s*require\(\s*["''](?<req>[^"'']+)["'']\s*\)\s*\)'
$mounts = @()

foreach ($m in $mountRe.Matches($serverTxt)) {
  $mount = $m.Groups["mount"].Value
  $req   = $m.Groups["req"].Value

  # normalize require path -> full file path
  $reqNorm = $req.Replace("/", "\")
  if ($reqNorm.StartsWith(".\")) { $reqNorm = $reqNorm.Substring(2) }
  if ($reqNorm.StartsWith("./")) { $reqNorm = $reqNorm.Substring(2) }
  if (-not $reqNorm.EndsWith(".js")) { $reqNorm = $reqNorm + ".js" }

  $fileFull = Join-Path (Split-Path -Parent $serverPath) $reqNorm
  if (Test-Path $fileFull) {
    $mounts += [pscustomobject]@{ Mount=$mount; File=$fileFull }
  }
}

# Fallback: if server.js mount parsing misses something, include all backend/routes/*.js with unknown mount
$allRouteFiles = Get-ChildItem $routesDir -File -Filter "*.js" | Select-Object -ExpandProperty FullName
$knownFiles = @($mounts | Select-Object -ExpandProperty File)
foreach ($f in $allRouteFiles) {
  if ($knownFiles -notcontains $f) {
    $mounts += [pscustomobject]@{ Mount=""; File=$f }
  }
}

$routeRe = [regex]'router\.(?<method>get|post|put|delete|patch)\(\s*["''](?<path>[^"'']+)["'']'
$rows = @()

function Join-UrlPath([string]$a, [string]$b) {
  if (-not $a) { return $b }
  if (-not $b) { return $a }
  if ($a.EndsWith("/") -and $b.StartsWith("/")) { return ($a.TrimEnd("/") + $b) }
  if (-not $a.EndsWith("/") -and -not $b.StartsWith("/")) { return ($a + "/" + $b) }
  return ($a + $b)
}

foreach ($x in $mounts) {
  $txt = Get-Content $x.File -Raw -ErrorAction SilentlyContinue
  if (-not $txt) { continue }

  foreach ($m in $routeRe.Matches($txt)) {
    $method = $m.Groups["method"].Value.ToUpperInvariant()
    $path   = $m.Groups["path"].Value
    $full   = Join-UrlPath $x.Mount $path

    $rows += [pscustomobject]@{
      Method = $method
      Mount  = $x.Mount
      Path   = $path
      Full   = $full
      File   = ($x.File.Replace($root + "\", ""))
    }
  }
}

if ($rows.Count -eq 0) {
  Write-Host "No endpoints parsed. (Routes may use dynamic paths or different patterns.)" -ForegroundColor Yellow
  exit 0
}

# Show all endpoints
Write-Host "=== ENDPOINTS (parsed) ===" -ForegroundColor Cyan
$rows | Sort-Object Full,Method | Format-Table -AutoSize

# Group by modules we care about
$mods = [ordered]@{
  Absence        = 'absence'
  PickupPIN      = 'pickup|pin'
  HomeSuggestion = 'home|suggest'
  PassengerRoute = 'route|stop|passenger'
  Device         = 'device'
  Camera         = 'camera'
}

Write-Host "`n=== PHASE-3 MODULE COVERAGE (by keyword) ===" -ForegroundColor Cyan
foreach ($k in $mods.Keys) {
  $rx = $mods[$k]
  $hit = $rows | Where-Object { $_.Full -match $rx -or $_.File -match $rx }
  $count = @($hit).Count
  "{0,-15} {1,3} endpoint(s)" -f $k, $count
}

exit 0
