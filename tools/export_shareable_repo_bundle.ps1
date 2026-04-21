param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "artifacts\shareable-export")
)

$ErrorActionPreference = "Stop"

# shareable export excludes: backend/data/*.json, data/*.json, README_M*_OVERLAY*.txt
# shareable export excludes: artifacts/, web/dist/, mobile/dist/
# shareable export excludes: pack_living_final.log, pack_living_latest.log
# legacy note: Compress-Archive fallback was replaced because long paths and hidden files made it brittle.
# Windows note: prefer pwsh for this script; Windows PowerShell remains supported through the .NET zip fallback.

$RepoRoot = (Resolve-Path $RepoRoot).Path
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$statePath = Join-Path $RepoRoot "tools\repo_contract_state.json"
$state = Get-Content $statePath -Raw | ConvertFrom-Json
$policy = $state.shareablePackageHygiene

function Normalize-RelPath {
  param([string]$Path)
  return ($Path -replace "\\", "/").TrimStart("/")
}

function Get-RelativeRepoPath {
  param([string]$FullPath)
  $root = $RepoRoot.TrimEnd("\", "/")
  $full = [System.IO.Path]::GetFullPath($FullPath)
  if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "path is outside repo root: $FullPath"
  }
  $rel = $full.Substring($root.Length).TrimStart("\", "/")
  return Normalize-RelPath $rel
}

function Convert-GlobToRegex {
  param([string]$Glob)
  $escaped = [System.Text.RegularExpressions.Regex]::Escape((Normalize-RelPath $Glob))
  $escaped = $escaped -replace "\\\*\\\*", ".*"
  $escaped = $escaped -replace "\\\*", "[^/]*"
  return "^$escaped$"
}

function Test-ForbiddenRelPath {
  param([string]$RelPath)
  $rel = Normalize-RelPath $RelPath
  $segmented = "/" + $rel + "/"

  foreach ($segment in @(".git", "node_modules")) {
    if ($segmented.IndexOf("/$segment/", [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
      return $true
    }
  }

  foreach ($exact in @($policy.forbiddenExactFiles)) {
    if ($rel -ieq (Normalize-RelPath $exact)) {
      return $true
    }
  }

  foreach ($prefix in @($policy.forbiddenPathPrefixes)) {
    $normalizedPrefix = Normalize-RelPath $prefix
    if ($rel.StartsWith($normalizedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }

  foreach ($glob in @($policy.forbiddenGlobFiles)) {
    if ($rel -imatch (Convert-GlobToRegex $glob)) {
      return $true
    }
  }

  return $false
}

function Assert-InsideRoot {
  param(
    [string]$ChildPath,
    [string]$RootPath
  )
  $root = [System.IO.Path]::GetFullPath($RootPath).TrimEnd("\", "/")
  $child = [System.IO.Path]::GetFullPath($ChildPath)
  if (-not $child.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "refusing to write outside staging root: $ChildPath"
  }
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "servis-platform-shareable-$timestamp"
$stageRoot = Join-Path $tempRoot "servis-platform"
$zipPath = Join-Path $OutputDir "servis-platform_shareable_$timestamp.zip"
$copied = 0

if (Test-Path $tempRoot) {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

try {
  Get-ChildItem -Path $RepoRoot -Recurse -Force -File -ErrorAction Stop | ForEach-Object {
    $fullPath = $_.FullName
    $skip = $fullPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)
    $rel = $null

    if (-not $skip) {
      $rel = Get-RelativeRepoPath $fullPath
      $skip = Test-ForbiddenRelPath $rel
    }

    if (-not $skip) {
      $dest = Join-Path $stageRoot ($rel -replace "/", [System.IO.Path]::DirectorySeparatorChar)
      Assert-InsideRoot -ChildPath $dest -RootPath $stageRoot

      $destDir = Split-Path -Parent $dest
      New-Item -ItemType Directory -Force -Path $destDir | Out-Null
      Copy-Item -LiteralPath $fullPath -Destination $dest -Force
      $script:copied += 1
    }
  }

  if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }

  $tar = Get-Command tar.exe -ErrorAction SilentlyContinue
  if ($tar) {
    & $tar.Source -a -c -f $zipPath -C $tempRoot "servis-platform"
    if ($LASTEXITCODE -ne 0) {
      throw "tar.exe failed with exit code $LASTEXITCODE"
    }
  } else {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($stageRoot, $zipPath)
  }

  if (-not (Test-Path $zipPath)) {
    throw "shareable export zip was not created: $zipPath"
  }

  Write-Host "INFO shareable export copied files: $copied"
  Write-Host "INFO shareable export zip: $zipPath"
  Write-Output $zipPath
} finally {
  if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
