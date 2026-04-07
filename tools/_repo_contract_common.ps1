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
    @([string][char]0x2018,"'"), @([string][char]0x2019,"'"),
    @([string][char]0x201C,'"'), @([string][char]0x201D,'"'),
    @([string][char]0x00A0,' '), @([string][char]0x2022,' '),
    @([string][char]0x2192,'->'), @('\\','/'), @('`','')
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



function Test-RepoContractContainsAny {
  param(
    [Parameter(Mandatory=$true)][string]$Text,
    [Parameter(Mandatory=$true)][string[]]$Needles
  )
  $normalizedText = Normalize-RepoContractText $Text
  foreach ($needle in $Needles) {
    if ($normalizedText.Contains((Normalize-RepoContractText ([string]$needle)))) {
      return $true
    }
  }
  return $false
}

function Assert-RepoContractContainsAll {
  param(
    [Parameter(Mandatory=$true)][string]$Text,
    [Parameter(Mandatory=$true)][string[]]$Needles,
    [Parameter(Mandatory=$true)][string]$Label
  )
  $normalizedText = Normalize-RepoContractText $Text
  foreach ($needle in $Needles) {
    if (-not $normalizedText.Contains((Normalize-RepoContractText ([string]$needle)))) {
      throw "FAIL $Label"
    }
  }
  Write-Host "OK $Label"
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

# Backward-compat helper for older repo-contract checks.
function Assert-FileExists {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][Alias('RelPath')][string]$RelativePath
  )
  Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $RelativePath
}


function Assert-RepoContractMilestoneMention {
  param(
    [Parameter(Mandatory=$true)][string]$Text,
    [Parameter(Mandatory=$true)][string]$Milestone,
    [string[]]$Descriptors = @(),
    [Parameter(Mandatory=$true)][string]$Label
  )

  $normalizedText = Normalize-RepoContractText $Text
  $normalizedMilestone = Normalize-RepoContractText ([string]$Milestone)
  if (-not $normalizedText.Contains($normalizedMilestone)) {
    throw "FAIL $Label"
  }

  if ($null -eq $Descriptors -or $Descriptors.Count -eq 0) {
    Write-Host "OK $Label"
    return
  }

  foreach ($descriptor in $Descriptors) {
    $normalizedDescriptor = Normalize-RepoContractText ([string]$descriptor)
    if ($normalizedDescriptor -and $normalizedText.Contains($normalizedDescriptor)) {
      Write-Host "OK $Label"
      return
    }
  }

  throw "FAIL $Label"
}
