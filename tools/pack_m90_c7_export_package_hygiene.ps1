param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"
& (Join-Path $RepoRoot "tools\check_m90_c7_export_package_hygiene_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M90C.7 repo contract failed." }

& (Join-Path $RepoRoot "tools\_repo_hygiene_preflight.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M90C.7 repo hygiene preflight failed." }

$backend = Join-Path $RepoRoot "backend"
Push-Location $RepoRoot
try {
  node backend/scripts/repo_audit.js
  if (-not $?) { throw "repo audit rerun failed before M90C.7 check." }
} finally {
  Pop-Location
}

$zipPath = & (Join-Path $RepoRoot "tools\export_shareable_repo_bundle.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "shareable export tool failed during M90C.7 pack." }
if (-not (Test-Path $zipPath)) { throw "shareable export zip not found: $zipPath" }

$statePath = Join-Path $RepoRoot "tools\repo_contract_state.json"
$state = Get-Content $statePath -Raw | ConvertFrom-Json
$policy = $state.shareablePackageHygiene

function Normalize-ZipRelPath {
  param([string]$Path)
  $entry = ($Path -replace "\\", "/").TrimStart("/")
  if ($entry.StartsWith("servis-platform/", [System.StringComparison]::OrdinalIgnoreCase)) {
    $entry = $entry.Substring("servis-platform/".Length)
  }
  return $entry.TrimStart("/")
}

function Convert-GlobToRegex {
  param([string]$Glob)
  $escaped = [System.Text.RegularExpressions.Regex]::Escape((Normalize-ZipRelPath $Glob))
  $escaped = $escaped -replace "\\\*\\\*", ".*"
  $escaped = $escaped -replace "\\\*", "[^/]*"
  return "^$escaped$"
}

function Test-ForbiddenZipEntry {
  param([string]$EntryName)
  $entry = Normalize-ZipRelPath $EntryName
  $segmented = "/" + $entry + "/"

  foreach ($segment in @(".git", "node_modules")) {
    if ($segmented.IndexOf("/$segment/", [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
      return $true
    }
  }

  foreach ($exact in @($policy.forbiddenExactFiles)) {
    if ($entry -ieq (Normalize-ZipRelPath $exact)) {
      return $true
    }
  }

  foreach ($prefix in @($policy.forbiddenPathPrefixes)) {
    $normalizedPrefix = Normalize-ZipRelPath $prefix
    if ($entry.StartsWith($normalizedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }

  foreach ($glob in @($policy.forbiddenGlobFiles)) {
    if ($entry -imatch (Convert-GlobToRegex $glob)) {
      return $true
    }
  }

  return $false
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entries = @($zip.Entries | ForEach-Object { $_.FullName })
  if ($entries.Count -eq 0) {
    throw "shareable export zip is empty: $zipPath"
  }

  foreach ($entry in $entries) {
    if (Test-ForbiddenZipEntry $entry) {
      throw "shareable export contains forbidden entry: $entry"
    }
  }

  Write-Host ("INFO shareable export inspected entries: " + $entries.Count)
} finally {
  $zip.Dispose()
}

Push-Location $backend
try {
  npm run m90c7check
  if (-not $?) { throw "M90C.7 export / package hygiene check failed." }
} finally {
  Pop-Location
}

Write-Host ("INFO shareable export zip verified at: " + $zipPath)
Write-Host "M90C.7 export / package hygiene PACK PASS"
