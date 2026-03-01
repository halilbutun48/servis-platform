# tools/patch_m74_5_2_room_company_focus_nav.ps1
$ErrorActionPreference = "Stop"

function Read-Text([string]$Path) { Get-Content $Path -Raw }
function Write-Text([string]$Path, [string]$Text) { Set-Content $Path $Text -Encoding utf8 }

function Patch-File([string]$Path, [ScriptBlock]$Mutate) {
  if (!(Test-Path $Path)) { Write-Host "SKIP (not found): $Path"; return $false }
  $txt = Read-Text $Path
  $new = & $Mutate $txt
  if ($new -ne $txt) {
    Write-Text $Path $new
    Write-Host "PATCHED: $Path"
    return $true
  } else {
    Write-Host "OK: $Path"
    return $true
  }
}

function Find-RoomLivePanel {
  $root = Join-Path (Get-Location) "web\src\panels\room"
  if (!(Test-Path $root)) { return $null }
  $cands = Get-ChildItem -Path $root -Recurse -Filter *.jsx -ErrorAction SilentlyContinue
  foreach($f in $cands) {
    $t = Read-Text $f.FullName
    if ($t -like "*Canlı Takip*" -or $t -like "*Canlı Liste*" -or $t -like "*Room • Canlı Takip*" -or $t -like "*Room · Canlı Takip*") {
      return $f.FullName
    }
  }
  return $null
}

$companyPath = Join-Path (Get-Location) "web\src\panels\company\MapPanel.jsx"
$roomPath = Find-RoomLivePanel

# --- helpers (JSX-safe) ---
$helpers = @"
function focusStop(stop) {
  const lat = Number(String(stop?.lat ?? stop?.location?.lat ?? "").replace(",", "."));
  const lng = Number(String(stop?.lng ?? stop?.location?.lng ?? "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
}

function openNav(stop, originVehicle) {
  const dLat = Number(String(stop?.lat ?? stop?.location?.lat ?? "").replace(",", "."));
  const dLng = Number(String(stop?.lng ?? stop?.location?.lng ?? "").replace(",", "."));
  if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) return;

  const oLat = Number(String(originVehicle?.gpsLast?.lat ?? "").replace(",", "."));
  const oLng = Number(String(originVehicle?.gpsLast?.lng ?? "").replace(",", "."));
  const hasOrigin = Number.isFinite(oLat) && Number.isFinite(oLng);

  const dest = `${dLat},${dLng}`;
  const url = hasOrigin
    ? `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

  window.open(url, "_blank", "noopener,noreferrer");
}
"@

function Ensure-Helpers([string]$t) {
  if ($t -like "*function focusStop(*" -and $t -like "*function openNav(*") { return $t }
  # insert before export default
  $m = [regex]::Match($t, "(?m)^\s*export\s+default\s+function")
  if ($m.Success) {
    return $t.Insert($m.Index, $helpers + "`n`n")
  }
  # fallback: insert after last import
  $m2 = [regex]::Matches($t, "(?m)^\s*import .*;")
  if ($m2.Count -gt 0) {
    $last = $m2[$m2.Count-1]
    return $t.Insert($last.Index + $last.Length, "`n`n" + $helpers + "`n")
  }
  return $t
}

function Ensure-TimelineOnSelect([string]$t) {
  # Add onSelect to StopTimeline if missing
  $rx = [regex]'(?s)<StopTimeline\b(?![^>]*\bonSelect=)([^>]*)\/>'
  return $rx.Replace($t, '<StopTimeline$1 onSelect={(s) => focusStop(s)} />')
}

function Ensure-NavButton([string]$t, [string]$originVar) {
  # Insert button after NEXT pill in "Sıradaki:" line if missing
  if ($t -like "*Navigasyon Aç*") { return $t }
  $rx = [regex]'(Sıradaki:\s*<span[^>]*data-status="NEXT"[^>]*>\s*\{[^}]+\}\s*</span>)'
  return $rx.Replace($t, ('$1 <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openNav(nextStop, ' + $originVar + ')}>Navigasyon Aç</button>'), 1)
}

function Ensure-CompanySelectionGuard([string]$t) {
  if ($t -like "*setSelectedVehicleId((prev)*items.some*" ) { return $t }
  $needle = "setVehicles(items);"
  $idx = $t.IndexOf($needle)
  if ($idx -lt 0) { return $t }
  $pos = $idx + $needle.Length
  $ins = "`n      setSelectedVehicleId((prev) => (prev -and (items | Where-Object { `$_.id -eq prev }).Count -gt 0) ? prev : ((items | Select-Object -First 1).id));"
  # The above uses PS syntax inside JS - WRONG. We must insert JS code, not PS.
  return $t
}

# IMPORTANT: company selection guard must be JS, so implement separately below with regex on JS arrays

function Ensure-CompanySelectionGuardJS([string]$t) {
  if ($t -like "*setSelectedVehicleId((prev) =>*" ) { return $t }
  $needle = "setVehicles(items);"
  $idx = $t.IndexOf($needle)
  if ($idx -lt 0) { return $t }
  $pos = $idx + $needle.Length
  $ins = "`n      setSelectedVehicleId((prev) => (prev && items.some((v) => v.id === prev)) ? prev : (items[0]?.id ?? null));"
  return $t.Insert($pos, $ins)
}

function Ensure-MapH([string]$t) {
  # unify map height style if present
  $rx = [regex]'\["--mapH"\]\s*:\s*"[^"]+"'
  if ($rx.IsMatch($t)) {
    return $rx.Replace($t, '["--mapH"]: "min(520px, calc(100vh - 420px))"', 1)
  }
  return $t
}

# --- Patch Company MapPanel.jsx ---
Patch-File $companyPath {
  param($t)
  $t = Ensure-Helpers $t
  $t = Ensure-TimelineOnSelect $t
  $t = Ensure-NavButton $t "selectedVehicle"
  $t = Ensure-CompanySelectionGuardJS $t
  $t = Ensure-MapH $t
  return $t
} | Out-Null

# --- Patch Room Live panel (if found) ---
if ($roomPath) {
  Patch-File $roomPath {
    param($t)
    $t = Ensure-Helpers $t
    $t = Ensure-TimelineOnSelect $t

    # Try to add nav button: assume nextStop + selectedVehicle exists in room live panel.
    # If origin variable differs, you can manually rename later.
    $originVar = "selectedVehicle || selected || vehicle"
    $t = Ensure-NavButton $t $originVar

    $t = Ensure-MapH $t
    return $t
  } | Out-Null
} else {
  Write-Host "WARN: Room Canlı Takip paneli bulunamadı. (web/src/panels/room içinde 'Canlı Takip' arandı)"
}

Write-Host "`nDone."
