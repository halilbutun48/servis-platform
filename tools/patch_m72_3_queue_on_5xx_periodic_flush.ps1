# tools/patch_m72_3_queue_on_5xx_periodic_flush.ps1
$ErrorActionPreference = "Stop"

function Patch-FileReplace {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Replacement,
    [switch]$Regex
  )
  if (!(Test-Path $Path)) {
    Write-Host "SKIP (not found): $Path"
    return $false
  }
  $txt = Get-Content $Path -Raw
  $newTxt = $null
  if ($Regex) {
    $newTxt = [regex]::Replace($txt, $Pattern, $Replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  } else {
    if ($txt.Contains($Pattern)) { $newTxt = $txt.Replace($Pattern, $Replacement) } else { $newTxt = $txt }
  }
  if ($newTxt -ne $txt) {
    Set-Content $Path $newTxt -Encoding utf8
    Write-Host "PATCHED: $Path"
    return $true
  } else {
    Write-Host "OK (no change): $Path"
    return $false
  }
}

$root = Get-Location
$route = Join-Path $root "web\src\panels\driver\RoutePanel.jsx"
$today = Join-Path $root "web\src\panels\driver\TodayPanel.jsx"

# 1) RoutePanel safePost: enqueue on status>=500 too
$pattern1 = @"
    } catch \(e\) \{
      if \(!e\?\.(status)\) \{
        enqueueRequest\(\{ method: 'POST', url, body, label \}\);
        setQLen\(queueSize\(\)\);
        showToast\('Bağlantı yok: Kuyruğa alındı'\);
        return \{ queued: true \};
      \}
      throw e;
    \}
"@

$replacement1 = @"
    } catch (e) {
      const s = Number(e?.status || 0);
      // API down (vite proxy 500) veya network error => kuyrukla
      if (!e?.status || s >= 500) {
        enqueueRequest({ method: 'POST', url, body, label });
        setQLen(queueSize());
        showToast(s >= 500 ? 'Sunucu geçici hatası: Kuyruğa alındı' : 'Bağlantı yok: Kuyruğa alındı');
        return { queued: true };
      }
      throw e;
    }
"@

Patch-FileReplace -Path $route -Pattern $pattern1 -Replacement $replacement1 -Regex

# 2) RoutePanel: periodic flush while online & queue>0
$needle2 = @"
}, [online]);



// 🔔 toast when progress advances (auto-reached or manual)
"@

$insert2 = @"
}, [online]);

// M72.3: PERIODIC FLUSH while online (covers API restart without offline->online)
useEffect(() => {
  if (!online) return;
  if (!qLen) return;
  const t = setInterval(() => {
    if (!isOnline()) return;
    if (queueSize() <= 0) return;
    if (flushing || busy) return;
    flushNow();
  }, 5000);
  return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [online, qLen, flushing, busy]);



// 🔔 toast when progress advances (auto-reached or manual)
"@

Patch-FileReplace -Path $route -Pattern $needle2 -Replacement $insert2

# 3) TodayPanel startShift: enqueue on status>=500 too
$needle3 = "if (!e2?.status) {"
$repl3 = "if (!e2?.status || Number(e2.status) >= 500) {"
Patch-FileReplace -Path $today -Pattern $needle3 -Replacement $repl3

# 4) TodayPanel: periodic flush while online & queue>0
$needle4 = @"
}, [online]);


  async function flushNow() {
"@

$insert4 = @"
}, [online]);

// M72.3: PERIODIC FLUSH while online (covers API restart without offline->online)
useEffect(() => {
  if (!online) return;
  if (!qLen) return;
  const t = setInterval(() => {
    if (!isOnline()) return;
    if (queueSize() <= 0) return;
    if (flushing || busyId) return;
    flushNow();
  }, 5000);
  return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [online, qLen, flushing, busyId]);


  async function flushNow() {
"@

Patch-FileReplace -Path $today -Pattern $needle4 -Replacement $insert4

Write-Host "`nDone."
