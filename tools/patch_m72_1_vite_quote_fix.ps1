# tools/patch_m72_1_vite_quote_fix.ps1
$ErrorActionPreference = "Stop"

$targets = @(
  "web\src\panels\driver\TodayPanel.jsx",
  "web\src\panels\driver\RoutePanel.jsx"
)

$old = 'import QueueDetailTable from \"../../components/QueueDetailTable\";'
$new = 'import QueueDetailTable from "../../components/QueueDetailTable";'

$changed = 0
foreach($rel in $targets){
  $p = Join-Path (Get-Location) $rel
  if(!(Test-Path $p)){
    Write-Host "SKIP (not found): $rel"
    continue
  }
  $t = Get-Content $p -Raw
  if($t -like "*$old*"){
    $t2 = $t.Replace($old, $new)
    Set-Content $p $t2 -Encoding utf8
    Write-Host "PATCHED: $rel"
    $changed++
  } else {
    Write-Host "OK (pattern not found): $rel"
  }
}

Write-Host "`nDone. Patched files: $changed"
