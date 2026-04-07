param([string]$RepoRoot = '', [string]$ComposeDir = 'infra', [switch]$NoBuild)
$ErrorActionPreference = 'Stop'
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
& (Join-Path $ScriptRoot 'pack_m76_m81.ps1') -RepoRoot $RepoRoot -ComposeDir $ComposeDir -NoBuild:$NoBuild -To 79
