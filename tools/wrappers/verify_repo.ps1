param(
  [string]$Phase = "all",
  [switch]$Continue
)
$ErrorActionPreference = "Stop"
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$rootTools = Split-Path -Parent $ScriptRoot
& (Join-Path $rootTools 'check-repo.ps1') -Phase $Phase -Continue:$Continue
