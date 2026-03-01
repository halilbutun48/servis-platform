# tools/patch_m74_room_live_progress.ps1
$ErrorActionPreference = "Stop"

function Ensure-InsertedLine {
  param(
    [string]$Path,
    [string]$Needle,
    [string]$InsertAfterRegex,
    [string]$LineToInsert
  )

  if (!(Test-Path $Path)) { throw "Missing file: $Path" }

  $txt = Get-Content $Path -Raw
  if ($txt -like "*$Needle*") {
    Write-Host "OK (already present): $Needle"
    return
  }

  $rx = [regex]$InsertAfterRegex
  $m = $rx.Match($txt)
  if (!$m.Success) { throw "Pattern not found in ${Path}: $InsertAfterRegex" }

  $idx = $m.Index + $m.Length
  $txt2 = $txt.Substring(0, $idx) + "`n" + $LineToInsert + $txt.Substring($idx)

  Set-Content $Path $txt2 -Encoding utf8
  Write-Host "PATCHED: $Path (inserted)"
}

function Ensure-ReplacedOnce {
  param(
    [string]$Path,
    [string]$FindRegex,
    [string]$Replacement
  )

  if (!(Test-Path $Path)) { throw "Missing file: $Path" }

  $txt = Get-Content $Path -Raw
  $rx = [regex]$FindRegex
  if (!$rx.IsMatch($txt)) { throw "Pattern not found in ${Path}: $FindRegex" }

  # If already contains replacement key path, skip
  if ($txt -like "*$Replacement*") {
    Write-Host "OK (replacement already present)"
    return
  }

  $txt2 = $rx.Replace($txt, $Replacement, 1)
  Set-Content $Path $txt2 -Encoding utf8
  Write-Host "PATCHED: $Path (replaced)"
}

$root = Get-Location

# 1) App.jsx: import + route
$app = Join-Path $root "web\src\App.jsx"

Ensure-InsertedLine `
  -Path $app `
  -Needle 'import RoomLiveProgressPanel' `
  -InsertAfterRegex '(?m)^import RoomHubPanel .*;$' `
  -LineToInsert 'import RoomLiveProgressPanel from "./panels/room/LiveProgressPanel";'

# Insert route after /room/map
Ensure-InsertedLine `
  -Path $app `
  -Needle 'path === "/room/live"' `
  -InsertAfterRegex '(?m)^\s*if \(path === "/room/map"\) return \{ layout: true, node: <RoomMapPanel /> \};\s*$' `
  -LineToInsert '    if (path === "/room/live") return { layout: true, node: <RoomLiveProgressPanel /> };'

# 2) NavDock.jsx: add menu item under ROOM -> Operasyon items
$nav = Join-Path $root "web\src\layout\NavDock.jsx"

# Insert item after 'items: [' inside Operasyon section
# (We keep it simple and stable: find the Operasyon section block)
$pattern = '(?s)(title:\s*"Operasyon",\s*items:\s*\[\s*)([^\]]*)\]'
$txt = Get-Content $nav -Raw
if ($txt -notmatch '/room/live') {
  $txt2 = [regex]::Replace($txt, $pattern, {
      param($m)
      $head = $m.Groups[1].Value
      $body = $m.Groups[2].Value
      if ($body -match '/room/live') { return $m.Value }
      return $head + '  { label: "Canlı Takip", path: "/room/live" },' + "`n" + $body + ']'
    }, 1, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  Set-Content $nav $txt2 -Encoding utf8
  Write-Host "PATCHED: $nav (added /room/live)"
} else {
  Write-Host "OK: NavDock already has /room/live"
}

Write-Host "`nM74 patch done."

