# tools/patch_m74_5_map_focus_nav.ps1
$ErrorActionPreference = "Stop"

function Patch-File {
  param(
    [string]$Path,
    [ScriptBlock]$Mutate
  )
  if (!(Test-Path $Path)) { Write-Host "SKIP (not found): $Path"; return }
  $txt = Get-Content $Path -Raw
  $new = & $Mutate $txt
  if ($new -ne $txt) {
    Set-Content $Path $new -Encoding utf8
    Write-Host "PATCHED: $Path"
  } else {
    Write-Host "OK: $Path"
  }
}

function Ensure-InsertedAfter {
  param([string]$Text,[string]$Needle,[string]$InsertAfter,[string]$Insert)
  if ($Text -like "*$Needle*") { return $Text }
  $idx = $Text.IndexOf($InsertAfter)
  if ($idx -lt 0) { return $Text }
  $pos = $idx + $InsertAfter.Length
  return $Text.Substring(0,$pos) + "`n" + $Insert + $Text.Substring($pos)
}

# 1) Company MapPanel: timeline click -> focus map, nav button
$company = Join-Path (Get-Location) "web\src\panels\company\MapPanel.jsx"
Patch-File -Path $company -Mutate {
  param($t)

  # add helpers once (after fitAll() function)
  $helperNeedle = "function focusStop("
  if ($t -notmatch [regex]::Escape($helperNeedle)) {
    $anchor = "function fitAll()"
    $i = $t.IndexOf($anchor)
    if ($i -ge 0) {
      $end = $t.IndexOf("}", $i)
      if ($end -ge 0) {
        $ins = @"
function focusStop(stop) {
  const lat = Number(String(stop?.lat ?? "").replace(",", "."));
  const lng = Number(String(stop?.lng ?? "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
}

function openNav(stop, originVehicle) {
  const dLat = Number(String(stop?.lat ?? "").replace(",", "."));
  const dLng = Number(String(stop?.lng ?? "").replace(",", "."));
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
        $t = $t.Substring(0, $end+1) + "`n`n" + $ins + $t.Substring($end+1)
      }
    }
  }

  # add onSelect to StopTimeline (if present)
  $t = $t -replace '(<StopTimeline\s+stops=\{selStops\}\s+nextStopId=\{nextStopId\}\s+compact\s*/>)',
                   '<StopTimeline stops={selStops} nextStopId={nextStopId} compact onSelect={(s) => focusStop(s)} />'

  # add nav button near next stop pill
  $t = $t -replace '(Sıradaki:\s*<span className="pill" data-status="NEXT">\{nextStop\.name\}</span>)',
                   '$1 <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openNav(nextStop, selectedVehicle)}>Navigasyon Aç</button>'

  return $t
}

# 2) Personel LivePanel: timeline click -> focus map, nav button
$personel = Join-Path (Get-Location) "web\src\panels\personel\LivePanel.jsx"
Patch-File -Path $personel -Mutate {
  param($t)

  # helpers once (before return)
  if ($t -notmatch "function focusStop") {
    $anchor = "export default function"
    $idx = $t.IndexOf($anchor)
    if ($idx -ge 0) {
      $ins = @"
function focusStop(stop) {
  const lat = Number(String(stop?.lat ?? "").replace(",", "."));
  const lng = Number(String(stop?.lng ?? "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
}

function openNav(stop, originVehicle) {
  const dLat = Number(String(stop?.lat ?? "").replace(",", "."));
  const dLng = Number(String(stop?.lng ?? "").replace(",", "."));
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
      $t = $ins + "`n" + $t
    }
  }

  # onSelect for timeline
  $t = $t -replace '(<StopTimeline\s+stops=\{stops\}\s+nextStopId=\{nextStopId\}\s+compact\s*/>)',
                   '<StopTimeline stops={stops} nextStopId={nextStopId} compact onSelect={(s) => focusStop(s)} />'

  # nav button in next stop block (if exists)
  $t = $t -replace '(Sıradaki:\s*<span className="pill" data-status="NEXT">\{nextStop\.name\}</span>)',
                   '$1 <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openNav(nextStop, vehicle)}>Navigasyon Aç</button>'

  return $t
}

Write-Host "`nDone."
