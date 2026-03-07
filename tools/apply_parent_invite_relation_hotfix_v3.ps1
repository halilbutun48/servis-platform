$ErrorActionPreference = 'Stop'

$repo = (Get-Location).Path
$schema = Join-Path $repo 'backend\prisma\schema.prisma'
if (!(Test-Path $schema)) { throw "schema not found: $schema" }

$backupDir = Join-Path $repo 'tools\_backup'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupDir ("schema_parent_invite_rel_hotfix_v3_{0}.prisma" -f $stamp)
Copy-Item $schema $backup -Force

$text = [System.IO.File]::ReadAllText($schema, [System.Text.Encoding]::UTF8)

# 1) Normalize User model parent invite relation lines safely
$userPattern = 'model User \{[\s\S]*?\n\}'
$m = [regex]::Match($text, $userPattern)
if (-not $m.Success) { throw 'User model not found' }
$userBlock = $m.Value

# remove any existing parentInvites* lines in User block
$userBlock = [regex]::Replace($userBlock, '(?m)^\s*parentInvites\w*\s+ParentInvite\[\].*\r?\n?', '')

if ($userBlock -notmatch '(?m)^\s*parentChildren\s+ParentChild\[\]\s+@relation\("ParentUserChildren"\)\s*$') {
  throw 'parentChildren anchor not found in User model'
}

$userBlock = [regex]::Replace(
  $userBlock,
  '(?m)^(\s*parentChildren\s+ParentChild\[\]\s+@relation\("ParentUserChildren"\)\s*)$',
  '$1`r`n  parentInvitesCreated  ParentInvite[] @relation("ParentInviteCreatedBy")`r`n  parentInvitesConsumed ParentInvite[] @relation("ParentInviteConsumedBy")'
)

$text = $text.Substring(0, $m.Index) + $userBlock + $text.Substring($m.Index + $m.Length)

# 2) Ensure ParentInvite model has createdBy / consumedBy relation fields
$piPattern = 'model ParentInvite \{[\s\S]*?\n\}'
$pm = [regex]::Match($text, $piPattern)
if (-not $pm.Success) { throw 'ParentInvite model not found' }
$piBlock = $pm.Value

if ($piBlock -notmatch '(?m)^\s*createdBy\s+User\?\s+@relation\("ParentInviteCreatedBy"') {
  if ($piBlock -notmatch '(?m)^\s*createdByUserId\s+Int\?\s*$') { throw 'createdByUserId not found in ParentInvite model' }
  $piBlock = [regex]::Replace(
    $piBlock,
    '(?m)^(\s*createdByUserId\s+Int\?\s*)$',
    '$1`r`n`r`n  createdBy  User? @relation("ParentInviteCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)'
  )
}

if ($piBlock -notmatch '(?m)^\s*consumedBy\s+User\?\s+@relation\("ParentInviteConsumedBy"') {
  if ($piBlock -notmatch '(?m)^\s*consumedByUserId\s+Int\?\s*$') { throw 'consumedByUserId not found in ParentInvite model' }
  $piBlock = [regex]::Replace(
    $piBlock,
    '(?m)^(\s*consumedByUserId\s+Int\?\s*)$',
    '$1`r`n  consumedBy User? @relation("ParentInviteConsumedBy", fields: [consumedByUserId], references: [id], onDelete: SetNull)'
  )
}

$text = $text.Substring(0, $pm.Index) + $piBlock + $text.Substring($pm.Index + $pm.Length)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($schema, $text, $utf8NoBom)

Write-Host "UPDATED backend/prisma/schema.prisma" -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor Yellow
