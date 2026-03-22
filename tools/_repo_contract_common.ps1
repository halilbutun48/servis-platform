param()
$ErrorActionPreference = 'Stop'

function Normalize-RepoContractText {
  param([string]$Text)
  if ($null -eq $Text) { return '' }

  $t = [string]$Text
  $pairs = @(
    @([string][char]0x0130,'I'), @([string][char]0x0131,'i'),
    @([string][char]0x015E,'S'), @([string][char]0x015F,'s'),
    @([string][char]0x011E,'G'), @([string][char]0x011F,'g'),
    @([string][char]0x00DC,'U'), @([string][char]0x00FC,'u'),
    @([string][char]0x00D6,'O'), @([string][char]0x00F6,'o'),
    @([string][char]0x00C7,'C'), @([string][char]0x00E7,'c'),
    @([string][char]0x2014,'-'), @([string][char]0x2013,'-'),
    @([string][char]0x2192,'->'), @('`','')
  )
  foreach ($pair in $pairs) { $t = $t.Replace($pair[0], $pair[1]) }
  $t = $t.ToLowerInvariant()
  $t = [regex]::Replace($t, '\s+', ' ')
  return $t.Trim()
}

function Read-RepoContractText {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$RelativePath
  )
  return [IO.File]::ReadAllText((Join-Path $RepoRoot $RelativePath), [System.Text.Encoding]::UTF8)
}

function Assert-RepoContractExists {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$RelativePath
  )
  if (-not (Test-Path (Join-Path $RepoRoot $RelativePath))) {
    throw "FAIL missing $RelativePath"
  }
  Write-Host "OK $RelativePath exists"
}

function Assert-RepoContractContainsAny {
  param(
    [Parameter(Mandatory=$true)][string]$Text,
    [Parameter(Mandatory=$true)][string[]]$Needles,
    [Parameter(Mandatory=$true)][string]$Label
  )

  $normalizedText = Normalize-RepoContractText $Text
  foreach ($needle in $Needles) {
    if ($normalizedText.Contains((Normalize-RepoContractText ([string]$needle)))) {
      Write-Host "OK $Label"
      return
    }
  }

  throw "FAIL $Label"
}
