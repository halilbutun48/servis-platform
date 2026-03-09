param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path $RepoRoot).Path
$schema = Join-Path $repo 'backend/prisma/schema.prisma'
if (!(Test-Path $schema)) { throw "schema not found: $schema" }

$backupDir = Join-Path $repo ("tools/_backup/m42_schema_restore_" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $schema (Join-Path $backupDir 'schema.prisma') -Force

$nl = [Environment]::NewLine
$text = Get-Content -Raw -LiteralPath $schema

function Upsert-Block {
  param([string]$Name, [string]$Kind, [string]$Block)
  $pattern = "(?ms)^$Kind\s+$Name\s*\{.*?^\}"
  if ([regex]::IsMatch($script:text, $pattern)) {
    $script:text = [regex]::Replace($script:text, $pattern, $Block, 1)
  } else {
    $script:text = $script:text.TrimEnd() + $nl + $nl + $Block + $nl
  }
}

function Ensure-Model-Lines {
  param(
    [string]$ModelName,
    [string[]]$RemovePatterns,
    [string[]]$InsertLines
  )
  $pattern = "(?ms)^model\s+$ModelName\s*\{.*?^\}"
  $m = [regex]::Match($script:text, $pattern)
  if (!$m.Success) { throw "model not found: $ModelName" }
  $block = $m.Value
  foreach ($rp in $RemovePatterns) {
    $block = [regex]::Replace($block, "(?m)^\s*$rp\s*\r?\n", '')
  }
  foreach ($line in $InsertLines) {
    if ($block -notmatch [regex]::Escape($line)) {
      $block = $block.TrimEnd() -replace "\}$", ("  $line" + $nl + "}")
    }
  }
  $script:text = $script:text.Substring(0, $m.Index) + $block + $script:text.Substring($m.Index + $m.Length)
}

$enumCredentialType = @'
enum CredentialType {
  QR
  NFC
}
'@

$enumCredentialStatus = @'
enum CredentialStatus {
  ACTIVE
  REVOKED
}
'@

$enumCheckinEventType = @'
enum CheckinEventType {
  BOARD
  ALIGHT
}
'@

$enumCheckinSource = @'
enum CheckinSource {
  QR
  NFC
  MANUAL
}
'@

$modelPersonelCredential = @'
model PersonelCredential {
  id         Int              @id @default(autoincrement())
  personelId Int
  type       CredentialType
  tokenHash  String           @unique
  status     CredentialStatus @default(ACTIVE)
  issuedAt   DateTime         @default(now())
  revokedAt  DateTime?
  lastUsedAt DateTime?

  personel Personel @relation(fields: [personelId], references: [id], onDelete: Cascade)

  @@index([personelId])
  @@index([status])
}
'@

$modelCheckinEvent = @'
model CheckinEvent {
  id         Int              @id @default(autoincrement())
  shiftId     Int
  personelId Int
  eventType  CheckinEventType
  source     CheckinSource
  at         DateTime         @default(now())
  deviceId   String?
  meta       Json?

  shift   Shift   @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  personel Personel @relation(fields: [personelId], references: [id], onDelete: Cascade)

  @@index([shiftId, at])
  @@index([personelId, at])
  @@index([shiftId, personelId, eventType, at])
}
'@

Ensure-Model-Lines -ModelName 'Personel' -RemovePatterns @(
  'credentials\s+PersonelCredential\[\]',
  'checkinEvents\s+CheckinEvent\[\]'
) -InsertLines @(
  'credentials PersonelCredential[]',
  'checkinEvents CheckinEvent[]'
)

Ensure-Model-Lines -ModelName 'Shift' -RemovePatterns @(
  'checkinEvents\s+CheckinEvent\[\]'
) -InsertLines @(
  'checkinEvents CheckinEvent[]'
)

Upsert-Block -Name 'CredentialType' -Kind 'enum' -Block $enumCredentialType
Upsert-Block -Name 'CredentialStatus' -Kind 'enum' -Block $enumCredentialStatus
Upsert-Block -Name 'CheckinEventType' -Kind 'enum' -Block $enumCheckinEventType
Upsert-Block -Name 'CheckinSource' -Kind 'enum' -Block $enumCheckinSource
Upsert-Block -Name 'PersonelCredential' -Kind 'model' -Block $modelPersonelCredential
Upsert-Block -Name 'CheckinEvent' -Kind 'model' -Block $modelCheckinEvent

Set-Content -LiteralPath $schema -Value $text -Encoding UTF8
Write-Host "UPDATED $schema" -ForegroundColor Green
Write-Host "Backup: $backupDir" -ForegroundColor Yellow
