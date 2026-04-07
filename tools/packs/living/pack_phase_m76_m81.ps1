param([string]$RepoRoot = '', [string]$ComposeDir = 'infra', [switch]$NoBuild, [int]$To = 79)
$ErrorActionPreference = 'Stop'
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..\..\..')).Path
}
& (Join-Path $ScriptRoot '..\..\_packs\pack_m76_m81.ps1') -RepoRoot $RepoRoot -ComposeDir $ComposeDir -NoBuild:$NoBuild -To $To
