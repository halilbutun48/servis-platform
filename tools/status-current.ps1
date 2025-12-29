param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ExpectedBuild = "",
  [Alias("PackDir","Dir")]
  [string]$LastPackDir = ""
)
$ErrorActionPreference="Stop"
function NormBase([string]$u){
  $u = ([string]$u).Trim()
  if(-not ($u.StartsWith("http://") -or $u.StartsWith("https://"))){ $u = "http://$u" }
  return $u.TrimEnd("/")
}
$BaseUrl = NormBase $BaseUrl

$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$docs = Join-Path $Repo "docs"
New-Item -ItemType Directory -Force $docs | Out-Null
$outPath = Join-Path $docs "STATUS_CURRENT.md"

$buildNow = ""
try {
  $b = Invoke-RestMethod -Uri ($BaseUrl + "/api/_build") -TimeoutSec 10
  $buildNow = $b.build
  if(-not $buildNow){ $buildNow = [string]$b }
} catch {
  $buildNow = "UNKNOWN"
}

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  if($null -eq $text){ $text = "" }
  [System.IO.File]::WriteAllText($path, $text, $enc)
}

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$md = @()
$md += "# STATUS_CURRENT (V1)"
$md += ""
$md += ("UpdatedAt: " + $ts)
$md += ("BaseUrl: " + $BaseUrl)
$md += ("ExpectedBuild: " + $ExpectedBuild)
$md += ("BuildNow: " + $buildNow)
$md += ("LastPackDir: " + $LastPackDir)
$md += ""
$md += "GreenPackSteps:"
$md += "- encoding-check"
$md += "- verify-v2"
$md += "- live-test-pack"
$md += "- panel-proof"
$md += ""
$md += "DocsSingleSource:"
$md += "-"

WriteUtf8NoBom $outPath (($md -join "`r`n") + "`r`n")
Write-Host ("STATUS_CURRENT WROTE => " + $outPath) -ForegroundColor Green