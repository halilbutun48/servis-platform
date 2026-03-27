param(
  [string]$RepoRoot = "D:\servis-platform"
)
$ErrorActionPreference = "Stop"
function Ok([string]$m) { Write-Host "OK $m" }
function Fail([string]$m) { throw "FAIL $m" }
Write-Host "=== M71 WORKFLOW LOADSUMMARY HOTFIX CHECK ==="
$file = Join-Path $RepoRoot "web\src\panels\company\WorkflowPanel.jsx"
if (!(Test-Path $file)) { Fail "web\\src\\panels\\company\\WorkflowPanel.jsx exists" } else { Ok "web\\src\\panels\\company\\WorkflowPanel.jsx exists" }
$content = Get-Content -Raw -Path $file
if ($content -match 'onClick=\{loadStats\}') { Fail "legacy loadStats click removed" } else { Ok "legacy loadStats click removed" }
if ($content -match 'onClick=\{\(\) => loadSummary\(\)\}') { Ok "reload button uses loadSummary wrapper" } else { Fail "reload button uses loadSummary wrapper" }
if ($content -match 'async function loadSummary\(') { Ok "loadSummary function exists" } else { Fail "loadSummary function exists" }
Write-Host "=== M71 WORKFLOW LOADSUMMARY HOTFIX CHECK PASS ==="
