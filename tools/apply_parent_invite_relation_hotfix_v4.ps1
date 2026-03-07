Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$schema = Join-Path $repoRoot 'backend/prisma/schema.prisma'
if (!(Test-Path $schema)) { throw "schema not found: $schema" }

$backupDir = Join-Path $repoRoot 'tools/_backup'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupDir ("schema_parent_invite_hotfix_v4_{0}.prisma" -f $stamp)
Copy-Item $schema $backup -Force

$lines = [System.Collections.Generic.List[string]]::new()
(Get-Content -Path $schema -Encoding UTF8) | ForEach-Object { [void]$lines.Add($_) }

function Get-ModelRange {
  param(
    [System.Collections.Generic.List[string]]$AllLines,
    [string]$ModelName
  )

  $start = -1
  for ($i = 0; $i -lt $AllLines.Count; $i++) {
    if ($AllLines[$i].Trim() -eq "model $ModelName {") {
      $start = $i
      break
    }
  }
  if ($start -lt 0) { throw "model not found: $ModelName" }

  $depth = 0
  for ($j = $start; $j -lt $AllLines.Count; $j++) {
    $line = $AllLines[$j]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $depth += $opens
    $depth -= $closes
    if ($j -gt $start -and $depth -eq 0) {
      return @{ Start = $start; End = $j }
    }
  }

  throw "model end not found: $ModelName"
}

function Update-Range {
  param(
    [System.Collections.Generic.List[string]]$AllLines,
    [int]$Start,
    [int]$End,
    [string[]]$NewLines
  )

  for ($i = $End; $i -ge $Start; $i--) {
    $AllLines.RemoveAt($i)
  }
  for ($i = $NewLines.Length - 1; $i -ge 0; $i--) {
    $AllLines.Insert($Start, $NewLines[$i])
  }
}

function Update-UserModel {
  param([string[]]$Block)

  $createdLine = '  parentInvitesCreated  ParentInvite[] @relation("ParentInviteCreatedBy")'
  $consumedLine = '  parentInvitesConsumed ParentInvite[] @relation("ParentInviteConsumedBy")'

  $out = [System.Collections.Generic.List[string]]::new()
  foreach ($line in $Block) {
    if ($line -match '^\s*parentInvites(?:Created|Consumed)?\b') { continue }
    [void]$out.Add($line)
  }

  $insertAt = -1
  for ($i = 0; $i -lt $out.Count; $i++) {
    if ($out[$i] -match '^\s*parentChildren\b') {
      $insertAt = $i + 1
      break
    }
  }
  if ($insertAt -lt 0) {
    $insertAt = $out.Count - 1
  }

  $out.Insert($insertAt, $createdLine)
  $out.Insert($insertAt + 1, $consumedLine)
  return ,$out.ToArray()
}

function Update-ParentInviteModel {
  param([string[]]$Block)

  $createdIdLine = '  createdByUserId Int'
  $consumedIdLine = '  consumedByUserId Int?'
  $createdRelLine = '  createdBy   User  @relation("ParentInviteCreatedBy", fields: [createdByUserId], references: [id])'
  $consumedRelLine = '  consumedBy  User? @relation("ParentInviteConsumedBy", fields: [consumedByUserId], references: [id])'

  $out = [System.Collections.Generic.List[string]]::new()
  foreach ($line in $Block) {
    if ($line -match '^\s*createdBy\b') { continue }
    if ($line -match '^\s*consumedBy\b') { continue }
    if ($line -match '^\s*createdByUserId\b') { continue }
    if ($line -match '^\s*consumedByUserId\b') { continue }
    [void]$out.Add($line)
  }

  $insertAt = $out.Count - 1
  for ($i = 0; $i -lt $out.Count; $i++) {
    if ($out[$i] -match '^\s*createdAt\b') {
      $insertAt = $i
      break
    }
  }

  $out.Insert($insertAt, $createdIdLine)
  $out.Insert($insertAt + 1, $consumedIdLine)
  $out.Insert($insertAt + 2, $createdRelLine)
  $out.Insert($insertAt + 3, $consumedRelLine)
  return ,$out.ToArray()
}

$userRange = Get-ModelRange -AllLines $lines -ModelName 'User'
$userBlock = $lines.GetRange($userRange.Start, $userRange.End - $userRange.Start + 1).ToArray()
$userNew = Update-UserModel -Block $userBlock
Update-Range -AllLines $lines -Start $userRange.Start -End $userRange.End -NewLines $userNew

$parentInviteRange = Get-ModelRange -AllLines $lines -ModelName 'ParentInvite'
$parentInviteBlock = $lines.GetRange($parentInviteRange.Start, $parentInviteRange.End - $parentInviteRange.Start + 1).ToArray()
$parentInviteNew = Update-ParentInviteModel -Block $parentInviteBlock
Update-Range -AllLines $lines -Start $parentInviteRange.Start -End $parentInviteRange.End -NewLines $parentInviteNew

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($schema, ($lines -join [Environment]::NewLine), $utf8NoBom)

Write-Host "UPDATED backend/prisma/schema.prisma" -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor Yellow
