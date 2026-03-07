$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$schema = Join-Path $repo 'backend/prisma/schema.prisma'
if (!(Test-Path $schema)) { throw "schema not found: $schema" }

$backupDir = Join-Path $repo 'tools/_backup'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupDir ("schema_parent_invite_hotfix_v2_" + $stamp + ".prisma")
Copy-Item $schema $backup -Force

$text = [System.IO.File]::ReadAllText($schema, [System.Text.Encoding]::UTF8)
$orig = $text

# 1) User model relation fix
$userPattern = '(?ms)(parentChildren\s+ParentChild\[\]\s+@relation\("ParentUserChildren"\)\s*)(?:\r?\n\s*parentInvites\s+ParentInvite\[\]\s*)?'
$userReplacement = @'
$1
  parentInvitesCreated  ParentInvite[] @relation("ParentInviteCreatedBy")
  parentInvitesConsumed ParentInvite[] @relation("ParentInviteConsumedBy")
'@
$text = [regex]::Replace($text, $userPattern, $userReplacement, 1)

# Clean accidental duplicate insertions if re-run
$text = [regex]::Replace($text, '(?m)^(\s*parentInvitesCreated\s+ParentInvite\[\]\s+@relation\("ParentInviteCreatedBy"\)\s*\r?\n)(?:\s*parentInvitesCreated\s+ParentInvite\[\]\s+@relation\("ParentInviteCreatedBy"\)\s*\r?\n)+', '$1')
$text = [regex]::Replace($text, '(?m)^(\s*parentInvitesConsumed\s+ParentInvite\[\]\s+@relation\("ParentInviteConsumedBy"\)\s*\r?\n)(?:\s*parentInvitesConsumed\s+ParentInvite\[\]\s+@relation\("ParentInviteConsumedBy"\)\s*\r?\n)+', '$1')
$text = [regex]::Replace($text, '(?m)^\s*parentInvites\s+ParentInvite\[\]\s*\r?\n', '')

# 2) ParentInvite model scalar fields (ensure they exist)
if ($text -notmatch '(?m)^\s*consumedByUserId\s+Int\?\s*$') {
  $text = [regex]::Replace($text, '(?m)^(\s*consumedAt\s+DateTime\?\s*)$', "$1`r`n  consumedByUserId Int?", 1)
}
if ($text -notmatch '(?m)^\s*createdByUserId\s+Int\?\s*$') {
  $text = [regex]::Replace($text, '(?m)^(\s*revokedAt\s+DateTime\?\s*)$', "$1`r`n  createdByUserId Int?", 1)
}

# 3) ParentInvite relation fields
if ($text -notmatch 'ParentInviteConsumedBy') {
  $text = [regex]::Replace(
    $text,
    '(?ms)(model\s+ParentInvite\s*\{.*?child\s+Personel\s+@relation\("ParentInviteChild",\s*fields:\s*\[childPersonelId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)\s*)',
    @'
$1
  consumedBy User? @relation("ParentInviteConsumedBy", fields: [consumedByUserId], references: [id], onDelete: SetNull)
  createdBy  User? @relation("ParentInviteCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
'@,
    1
  )
}

# 4) Remove accidental duplicate relation lines if re-run
$text = [regex]::Replace($text, '(?m)^(\s*consumedBy\s+User\?\s+@relation\("ParentInviteConsumedBy".*\)\s*\r?\n)(?:\s*consumedBy\s+User\?\s+@relation\("ParentInviteConsumedBy".*\)\s*\r?\n)+', '$1')
$text = [regex]::Replace($text, '(?m)^(\s*createdBy\s+User\?\s+@relation\("ParentInviteCreatedBy".*\)\s*\r?\n)(?:\s*createdBy\s+User\?\s+@relation\("ParentInviteCreatedBy".*\)\s*\r?\n)+', '$1')

if ($text -eq $orig) {
  Write-Host "No schema changes were needed. Backup: $backup" -ForegroundColor Yellow
} else {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($schema, $text, $utf8NoBom)
  Write-Host "UPDATED backend/prisma/schema.prisma" -ForegroundColor Green
  Write-Host "Backup: $backup" -ForegroundColor DarkGray
}
