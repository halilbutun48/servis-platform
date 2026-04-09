param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputDir = ""
)
$ErrorActionPreference = "Stop"
# shareable export excludes: backend/data/*.json, README_M*_OVERLAY*.txt
# shareable export excludes: artifacts/, web/dist/, mobile/dist/
# shareable export excludes: pack_living_final.log, pack_living_latest.log
# legacy note: Compress-Archive fallback was replaced for Windows PowerShell 5.1 compatibility

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $RepoRoot "artifacts\shareable-export"
}

$statePath = Join-Path $RepoRoot "tools\repo_contract_state.json"
$state = Get-Content -Raw $statePath | ConvertFrom-Json
$policy = $state.shareablePackageHygiene
if (-not $policy) { throw "shareablePackageHygiene policy missing in repo_contract_state.json" }

function Normalize-Rel([string]$Base, [string]$Full) {
  $baseNorm = [System.IO.Path]::GetFullPath($Base).TrimEnd('\\','/')
  $fullNorm = [System.IO.Path]::GetFullPath($Full)
  if ($fullNorm.StartsWith($baseNorm, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel = $fullNorm.Substring($baseNorm.Length).TrimStart('\\','/')
  } else {
    $rel = $fullNorm
  }
  return ($rel -replace '\\', '/')
}

function Test-ForbiddenRel([string]$Rel) {
  $rel = ($Rel -replace '\\', '/').TrimStart('./')
  foreach ($exact in @($policy.forbiddenExactFiles)) {
    if ($rel -ieq (($exact -replace '\\', '/'))) { return $true }
  }
  foreach ($glob in @($policy.forbiddenGlobFiles)) {
    $pattern = (($glob -replace '\\', '/') -replace '\.', '\\.' -replace '\*', '.*')
    if ($rel -imatch ('^' + $pattern + '$')) { return $true }
  }
  foreach ($prefix in @($policy.forbiddenPathPrefixes)) {
    $normalizedPrefix = ($prefix -replace '\\', '/')
    $trimmed = $normalizedPrefix.TrimEnd('/')
    if ($rel -ieq $trimmed -or $rel.StartsWith($normalizedPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or $rel.Contains('/' + $trimmed + '/')) { return $true }
  }
  return $false
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("vardis_shareable_" + [guid]::NewGuid().ToString('N'))
$stageRoot = Join-Path $tempRoot "servis-platform"
New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null

$copied = 0
Get-ChildItem -Path $RepoRoot -Recurse -Force -File | ForEach-Object {
  $full = $_.FullName
  if ($full.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) { return }
  $rel = Normalize-Rel $RepoRoot $full
  if (Test-ForbiddenRel $rel) { return }
  $dest = Join-Path $stageRoot $rel
  $destDir = Split-Path -Parent $dest
  if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }
  Copy-Item $full $dest -Force
  $copied++
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$zipPath = Join-Path $OutputDir ("servis-platform_shareable_" + $timestamp + ".zip")
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$tarCmd = Get-Command tar.exe -ErrorAction SilentlyContinue
if ($tarCmd) {
  Push-Location $tempRoot
  try {
    & $tarCmd.Source -a -c -f $zipPath "servis-platform" | Out-Null
  } finally {
    Pop-Location
  }
} else {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($stageRoot, $zipPath)
}
Write-Host ("INFO shareable export copied files: " + $copied)
Write-Host ("INFO shareable export zip: " + $zipPath)
$zipPath
