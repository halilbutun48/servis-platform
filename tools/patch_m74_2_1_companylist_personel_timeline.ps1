# tools/patch_m74_2_1_companylist_personel_timeline.ps1
$ErrorActionPreference = "Stop"

function Read-Text($p) { Get-Content $p -Raw }
function Write-Text($p, $t) { Set-Content $p $t -Encoding utf8 }

function Ensure-ImportAfterLine {
  param([string]$Path,[string]$AnchorLine,[string]$ImportLine,[string]$Needle)
  $txt = Read-Text $Path
  if ($txt -like "*$Needle*") { Write-Host "OK import: $Needle"; return $txt }
  $idx = $txt.IndexOf($AnchorLine)
  if ($idx -lt 0) { throw "Anchor not found in ${Path}: $AnchorLine" }
  $insertAt = $idx + $AnchorLine.Length
  $txt2 = $txt.Substring(0,$insertAt) + "`n" + $ImportLine + $txt.Substring($insertAt)
  Write-Text $Path $txt2
  Write-Host "PATCHED import: $Path"
  return $txt2
}

function Insert-AfterMatch {
  param([string]$Path,[string]$Needle,[string]$InsertText)
  $txt = Read-Text $Path
  if ($txt -like "*$InsertText*") { Write-Host "OK insert already present"; return $txt }
  $idx = $txt.IndexOf($Needle)
  if ($idx -lt 0) { throw "Needle not found in ${Path}: $Needle" }
  $insertAt = $idx + $Needle.Length
  $txt2 = $txt.Substring(0,$insertAt) + "`n" + $InsertText + $txt.Substring($insertAt)
  Write-Text $Path $txt2
  Write-Host "PATCHED insert: $Path"
  return $txt2
}

function Insert-AfterFirstOccurrence {
  param([string]$Path,[string]$Find,[string]$Insert)
  $txt = Read-Text $Path
  if ($txt -like "*$Insert*") { Write-Host "OK already"; return $txt }
  $idx = $txt.IndexOf($Find)
  if ($idx -lt 0) { throw "Find not found in ${Path}: $Find" }
  $pos = $idx + $Find.Length
  $txt2 = $txt.Substring(0,$pos) + $Insert + $txt.Substring($pos)
  Write-Text $Path $txt2
  Write-Host "PATCHED: $Path"
  return $txt2
}

function Insert-AfterButtonCloseNear {
  param([string]$Path,[string]$Anchor,[string]$ButtonHtml)
  $txt = Read-Text $Path
  if ($txt -like "*$ButtonHtml*") { Write-Host "OK button already present"; return $txt }

  $start = 0
  $count = 0
  while ($true) {
    $idx = $txt.IndexOf($Anchor, $start)
    if ($idx -lt 0) { break }
    $close = $txt.IndexOf("</button>", $idx)
    if ($close -lt 0) { break }

    $after = $close + 9
    # guard: don't double insert near same block
    $window = $txt.Substring($idx, [Math]::Min(200, $txt.Length - $idx))
    if ($window -notmatch "/room/preview" -and $window -notmatch "Önizle") {
      $txt = $txt.Substring(0,$after) + "`n        " + $ButtonHtml + $txt.Substring($after)
      $count++
      $start = $after + $ButtonHtml.Length
    } else {
      $start = $after
    }
  }

  if ($count -gt 0) {
    Write-Text $Path $txt
    Write-Host "PATCHED buttons ($count): $Path"
  } else {
    Write-Host "OK (no anchor occurrences patched): $Path"
  }
  return $txt
}

# =========================
# 1) Personel — MyRidePanel timeline in "Şu anki durum"
# =========================
$my = Join-Path (Get-Location) "web\src\panels\personel\MyRidePanel.jsx"
if (Test-Path $my) {
  $txt = Read-Text $my

  # import
  if ($txt -notmatch "StopTimeline") {
    $txt = [regex]::Replace($txt, "(?m)^import\s+\{\s*navigate\s*\}\s+from\s+`"../../router`";\s*$",
      '$0' + "`n" + 'import StopTimeline from "../../components/StopTimeline";', 1)
    Write-Text $my $txt
    Write-Host "PATCHED import StopTimeline: $my"
  } else { Write-Host "OK StopTimeline import: $my" }

  # derived constants after vehicle line
  $needle = "  const vehicle = myShift?.vehicle || null;"
  if ($txt -notmatch "const myStopsForTimeline") {
    $insert = @"
  const myStopsForTimeline = useMemo(() => {
    const arr = Array.isArray(myShift?.stops) ? myShift.stops : [];
    return arr.map((s, i) => ({ ...s, order: s?.order ?? (i + 1) }));
  }, [myShift]);

  const myNextStopId = useMemo(() => {
    const arr = myStopsForTimeline || [];
    const last = Number(myShift?.progress?.lastReachedOrder || 0) || 0;

    const next = arr.find((s) => {
      const st = String(s?.state || "").toUpperCase();
      if (st === "REACHED" || st === "SKIPPED" || st === "DONE") return false;
      if (s?.reachedAt) return false;
      const o = Number(s?.order || 0) || 0;
      return o > last;
    }) || arr.find((s) => {
      const st = String(s?.state || "").toUpperCase();
      return st !== "REACHED" && st !== "SKIPPED" && st !== "DONE" && !s?.reachedAt;
    }) || null;

    return next?.id ?? null;
  }, [myStopsForTimeline, myShift]);
"@
    $txt = $txt.Replace($needle, $needle + "`n" + $insert)
    Write-Text $my $txt
    Write-Host "PATCHED derived timeline consts: $my"
  } else { Write-Host "OK timeline consts: $my" }

  # Insert JSX block into "Şu anki durum" card (after Start line)
  $anchor = '              <div className="muted">Start: {fmtTR(myShift.startAt)} • End: {fmtTR(myShift.endAt)}</div>'
  if ($txt -notmatch "Mini Timeline") {
    $block = @"

              <div style={{ marginTop: 10 }}>
                <div className="muted" style={{ marginBottom: 6 }}>Mini Timeline</div>
                <StopTimeline stops={myStopsForTimeline} nextStopId={myNextStopId} compact />
              </div>
"@
    if ($txt.Contains($anchor)) {
      $txt = $txt.Replace($anchor, $anchor + $block)
      Write-Text $my $txt
      Write-Host "PATCHED JSX timeline: $my"
    } else {
      Write-Host "WARN: anchor not found for JSX insert in $my"
    }
  } else { Write-Host "OK JSX timeline present: $my" }
} else {
  Write-Host "SKIP: $my not found"
}

# =========================
# 2) Company — ShiftsPanel: add Önizle button + modal
# =========================
$shifts = Join-Path (Get-Location) "web\src\panels\company\ShiftsPanel.jsx"
if (Test-Path $shifts) {
  $txt = Read-Text $shifts

  # import RoutePreviewModal
  if ($txt -notmatch "RoutePreviewModal") {
    $anchor = 'import PlanBuilderPanel from "./PlanBuilderPanel";'
    if ($txt.Contains($anchor)) {
      $txt = $txt.Replace($anchor, $anchor + "`n" + 'import RoutePreviewModal from "../../components/RoutePreviewModal";')
      Write-Text $shifts $txt
      Write-Host "PATCHED import RoutePreviewModal: $shifts"
    } else {
      Write-Host "WARN: import anchor not found in $shifts"
    }
  } else { Write-Host "OK RoutePreviewModal import: $shifts" }

  # state after extendModal
  $stateNeedle = '  const [extendModal, setExtendModal] = useState({ open: false, shift: null, endLocal: "", note: "" });'
  if ($txt -notmatch "previewModal") {
    if ($txt.Contains($stateNeedle)) {
      $ins = '  const [previewModal, setPreviewModal] = useState({ open: false, shiftId: null });'
      $txt = $txt.Replace($stateNeedle, $stateNeedle + "`n" + $ins)
      Write-Text $shifts $txt
      Write-Host "PATCHED previewModal state: $shifts"
    } else {
      Write-Host "WARN: extendModal needle not found in $shifts"
    }
  } else { Write-Host "OK previewModal state: $shifts" }

  # add Önizle button after openExtendModal(s) buttons
  $btn = '<button type="button" className="btn sm" disabled={busy} onClick={() => setPreviewModal({ open: true, shiftId: s.id })}>Önizle</button>'
  $txt = Insert-AfterButtonCloseNear -Path $shifts -Anchor 'onClick={() => openExtendModal(s)}' -ButtonHtml $btn

  # render modal before extend modal comment
  $marker = "{/* ✅ M51: Extend modal */}"
  if ($txt -notmatch "RoutePreviewModal" -or $txt -notmatch "previewModal\.open") {
    # ensure not double
    if ($txt -notmatch "previewModal\.open \?") {
      $modalBlock = @"
{/* M74.2.1: Preview modal from Company list */}
{previewModal.open ? (
  <RoutePreviewModal
    open={previewModal.open}
    onClose={() => setPreviewModal({ open: false, shiftId: null })}
    title={previewModal.shiftId ? `Shift #${previewModal.shiftId} — Rota/Durak Önizleme` : "Rota/Durak Önizleme"}
    shiftId={previewModal.shiftId}
  />
) : null}

"@
      if ($txt.Contains($marker)) {
        $txt = $txt.Replace($marker, $modalBlock + $marker)
        Write-Text $shifts $txt
        Write-Host "PATCHED preview modal render: $shifts"
      } else {
        Write-Host "WARN: marker not found for modal insertion in $shifts"
      }
    }
  } else { Write-Host "OK modal render present: $shifts" }

} else {
  Write-Host "SKIP: $shifts not found"
}

# =========================
# 3) RoutePreviewModal: ensure Mini Timeline block exists
# =========================
$rpm = Join-Path (Get-Location) "web\src\components\RoutePreviewModal.jsx"
if (Test-Path $rpm) {
  $txt = Read-Text $rpm

  if ($txt -notmatch "StopTimeline") {
    # insert import after apiFallback import line
    $txt = [regex]::Replace($txt, '(?m)^import\s+\{\s*apiOr404Fallback\s*\}\s+from\s+`"\.\./utils/apiFallback`";\s*$',
      '$0' + "`n" + 'import StopTimeline from "./StopTimeline";', 1)
    Write-Text $rpm $txt
    Write-Host "PATCHED import StopTimeline: $rpm"
  }

  if ($txt -notmatch "Mini Timeline") {
    # insert helper + render block (simple)
    $txt = $txt.Replace('const effStops = remote.stops ?? stops ?? [];',
      'const effStops = remote.stops ?? stops ?? [];' + "`n" + '      const stopsForTimeline = (Array.isArray(effStops) ? effStops : []).map((s,i)=>({ ...s, order: s?.order ?? (i+1) }));' + "`n" +
      '      const nextStopId = stopsForTimeline.find((s)=>{ const st=String(s?.state||"").toUpperCase(); return st!=="REACHED" && st!=="SKIPPED" && st!=="DONE" && !s?.reachedAt; })?.id ?? null;'
    )

    $needle = '        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, alignItems: "start", marginTop: 12 }}>'
    if ($txt.Contains($needle)) {
      $insert = @"

        <div className="card" style={{ marginTop: 12, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <b>Mini Timeline</b>
            {nextStopId ? <span className="muted" style={{ fontSize: 12 }}>NEXT vurgulu</span> : null}
          </div>
          <div style={{ marginTop: 8 }}>
            <StopTimeline stops={stopsForTimeline} nextStopId={nextStopId} compact />
          </div>
        </div>

"@
      $txt = $txt.Replace($needle, $insert + $needle)
      Write-Text $rpm $txt
      Write-Host "PATCHED Mini Timeline block: $rpm"
    } else {
      Write-Host "WARN: grid needle not found in RoutePreviewModal.jsx"
    }
  } else {
    Write-Host "OK: RoutePreviewModal already has Mini Timeline"
  }
} else {
  Write-Host "SKIP: $rpm not found"
}

Write-Host "`nM74.2.1 patch done."


