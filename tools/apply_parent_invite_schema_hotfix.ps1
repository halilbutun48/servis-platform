$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$schema = Join-Path $repo 'backend\prisma\schema.prisma'
if (!(Test-Path $schema)) { throw "schema not found: $schema" }
$backupDir = Join-Path $repo 'tools\_backup'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $schema (Join-Path $backupDir "schema_parent_invite_hotfix_$stamp.prisma") -Force

$raw = Get-Content -LiteralPath $schema -Raw -Encoding UTF8

if ($raw -notmatch 'ParentInviteCreatedBy') {
  $raw = [regex]::Replace(
    $raw,
    '(?m)^([ \t]*)parentInvites\s+ParentInvite\[\]\s*$',
    "$1parentInvitesCreated  ParentInvite[] @relation(\"ParentInviteCreatedBy\")`r`n$1parentInvitesConsumed ParentInvite[] @relation(\"ParentInviteConsumedBy\")"
  )
}

if ($raw -notmatch 'createdBy\s+User\?\s+@relation\("ParentInviteCreatedBy"') {
  $raw = [regex]::Replace(
    $raw,
    '(?ms)(model\s+ParentInvite\s*\{.*?child\s+Personel\s+@relation\("ParentInviteChild",\s*fields:\s*\[childPersonelId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)\s*)',
    "$1`r`n  createdBy  User? @relation(\"ParentInviteCreatedBy\", fields: [createdByUserId], references: [id])`r`n  consumedBy User? @relation(\"ParentInviteConsumedBy\", fields: [consumedByUserId], references: [id])`r`n"
  )
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($schema, $raw, $utf8NoBom)
Write-Host "UPDATED backend\\prisma\\schema.prisma" -ForegroundColor Green
Write-Host "Backup: $(Join-Path $backupDir "schema_parent_invite_hotfix_$stamp.prisma")" -ForegroundColor Yellow
Write-Host 'Overlay applied: ParentInvite schema relation hotfix' -ForegroundColor Green
