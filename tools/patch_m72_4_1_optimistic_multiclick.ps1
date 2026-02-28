# tools/patch_m72_4_1_optimistic_multiclick.ps1
$ErrorActionPreference = "Stop"

$route = Join-Path (Get-Location) "web\src\panels\driver\RoutePanel.jsx"
if (!(Test-Path $route)) { throw "RoutePanel.jsx not found: $route" }

$txt = Get-Content $route -Raw

$func = @"
  function applyOptimisticReached() {
    try {
      const now = new Date().toISOString();
      setData((prev) => {
        if (!prev) return prev;

        const ordered = Array.isArray(prev.orderedStops) ? prev.orderedStops : [];
        const prevLast = Number(prev?.progress?.lastReachedOrder || 0) || 0;

        // current stop = nextStop (preferred) or first stop after lastReachedOrder
        const curr =
          prev.nextStop ||
          ordered.find((s) => Number(s?.order || 0) > prevLast) ||
          null;

        if (!curr) return prev;

        // order from curr or list
        const ordFromList = ordered.find((s) => s && s.id === curr.id)?.order;
        const currOrder = Number(curr?.order || ordFromList || 0) || prevLast;
        const newLast = Math.max(prevLast, currOrder);

        const mark = (arr) =>
          Array.isArray(arr)
            ? arr.map((s) =>
                s && s.id === curr.id
                  ? { ...s, reachedAt: s.reachedAt || now }
                  : s
              )
            : arr;

        const next = ordered.find((s) => Number(s?.order || 0) > newLast) || null;

        return {
          ...prev,
          orderedStops: mark(ordered),
          routeStops: mark(prev.routeStops || []),
          progress: { ...(prev.progress || {}), lastReachedOrder: newLast },
          nextStop: next,
        };
      });
    } catch {}
  }
"@

# 1) Ensure/replace applyOptimisticReached function
if ($txt -match 'function applyOptimisticReached\(') {
  $txt2 = [regex]::Replace(
    $txt,
    '(?s)\s*function applyOptimisticReached\([\s\S]*?\n\s*}\n',
    "`n$func`n",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
  $txt = $txt2
} else {
  # insert right before async function reached()
  $txt2 = [regex]::Replace(
    $txt,
    '(?s)\n\s*async function reached\(\)\s*\{',
    "`n$func`n`n  async function reached() {",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
  $txt = $txt2
}

# 2) Make queued branch call applyOptimisticReached() (no args)
$txt = $txt.Replace("applyOptimisticReached(nextStop);", "applyOptimisticReached();")

# 3) If queued branch is just return; inject optimistic call
$txt = [regex]::Replace(
  $txt,
  '(?s)\n\s*if\s*\(r\?\.\s*queued\)\s*\{\s*\n\s*return;\s*\n\s*\}',
  "`n      if (r?.queued) {`n        // M72.4.1: optimistic local progress while queued (multi-click safe)`n        applyOptimisticReached();`n        return;`n      }",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

Set-Content $route $txt -Encoding utf8
Write-Host "PATCHED: $route"
