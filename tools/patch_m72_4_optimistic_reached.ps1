# tools/patch_m72_4_optimistic_reached.ps1
$ErrorActionPreference = "Stop"

function Replace-Regex {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Replacement
  )
  if (!(Test-Path $Path)) {
    Write-Host "SKIP (not found): $Path"
    return $false
  }
  $txt = Get-Content $Path -Raw
  $newTxt = [regex]::Replace($txt, $Pattern, $Replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if ($newTxt -ne $txt) {
    Set-Content $Path $newTxt -Encoding utf8
    Write-Host "PATCHED: $Path"
    return $true
  }
  Write-Host "OK (no change): $Path"
  return $false
}

$root = Get-Location
$route = Join-Path $root "web\src\panels\driver\RoutePanel.jsx"

# 1) Insert applyOptimisticReached helper right before async function reached()
$patternInsert = '(?s)\n\s*async function reached\(\) \{'
$replacementInsert = @"

  function applyOptimisticReached(stop) {
    try {
      if (!stop) return;
      const now = new Date().toISOString();
      setData((prev) => {
        if (!prev) return prev;

        const ordered = Array.isArray(prev.orderedStops) ? prev.orderedStops : [];
        const prevLast = Number(prev?.progress?.lastReachedOrder || 0) || 0;

        // order bilgisini stop'tan veya ordered listeden al
        const ordFromList = ordered.find((s) => s && s.id === stop.id)?.order;
        const currOrder = Number(stop.order || ordFromList || 0) || 0;
        const newLast = Math.max(prevLast, currOrder || prevLast);

        const patchArr = (arr) =>
          Array.isArray(arr)
            ? arr.map((s) =>
                s && s.id === stop.id
                  ? { ...s, reachedAt: s.reachedAt || now }
                  : s
              )
            : arr;

        const next = ordered.find((s) => Number(s?.order || 0) > newLast) || null;

        return {
          ...prev,
          orderedStops: patchArr(ordered),
          routeStops: patchArr(prev.routeStops || []),
          progress: { ...(prev.progress || {}), lastReachedOrder: newLast },
          nextStop: next,
        };
      });
    } catch {}
  }


  async function reached() {
"@

$null = Replace-Regex -Path $route -Pattern $patternInsert -Replacement $replacementInsert

# 2) Change queued branch in reached() to apply optimistic progress
$patternQueued = "(?s)const r = await safePost\\(url, null, 'reached'\\);\\s*\\n\\s*if \\(r\\?\\.queued\\) \\{\\s*\\n\\s*return;\\s*\\n\\s*\\}"
$replacementQueued = "const r = await safePost(url, null, 'reached');\n\n      if (r?.queued) {\n        // M72.4: optimistic local progress while queued\n        applyOptimisticReached(nextStop);\n        return;\n      }"

$null = Replace-Regex -Path $route -Pattern $patternQueued -Replacement $replacementQueued

Write-Host "`nDone."
