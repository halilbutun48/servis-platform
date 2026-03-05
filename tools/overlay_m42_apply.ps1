param(
  [switch]$NoBackup
)

$ErrorActionPreference = 'Stop'

function Backup-File($path) {
  if ($NoBackup) { return }
  if (-not (Test-Path $path)) { return }
  $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
  Copy-Item -Force $path "$path.bak.$ts"
}

function Ensure-InsertAfter($path, $anchorRegex, $insertText, $guardRegex) {
  $raw = Get-Content -Raw -Encoding UTF8 $path
  if ($guardRegex -and ($raw -match $guardRegex)) { return $false }

  $m = [regex]::Match($raw, $anchorRegex, [System.Text.RegularExpressions.RegexOptions]::Multiline)
  if (-not $m.Success) {
    throw "Anchor not found in $($path): $anchorRegex"
  }

  $idx = $m.Index + $m.Length
  $newRaw = $raw.Substring(0, $idx) + "`n" + $insertText + "`n" + $raw.Substring($idx)

  Backup-File $path
  Set-Content -Path $path -Value $newRaw -Encoding UTF8
  return $true
}

function Ensure-Append($path, $appendText, $guardRegex) {
  $raw = Get-Content -Raw -Encoding UTF8 $path
  if ($guardRegex -and ($raw -match $guardRegex)) { return $false }

  Backup-File $path
  if (-not $raw.EndsWith("`n")) { $raw += "`n" }
  $raw += "`n" + $appendText + "`n"
  Set-Content -Path $path -Value $raw -Encoding UTF8
  return $true
}

function Ensure-ModelField($schemaPath, $modelName, $fieldLine, $fieldGuardRegex) {
  $lines = Get-Content -Encoding UTF8 $schemaPath
  $raw = ($lines -join "`n")
  if ($raw -match $fieldGuardRegex) { return $false }

  $start = -1
  for ($i=0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^model\s+$modelName\s*\{") { $start = $i; break }
  }
  if ($start -lt 0) { throw "Model not found: $modelName" }

  $depth = 0
  for ($i=$start; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $open = ([regex]::Matches($line, "\{")).Count
    $close = ([regex]::Matches($line, "\}")).Count
    $depth += $open
    $depth -= $close

    if ($depth -eq 0 -and $i -gt $start) {
      $before = $lines[0..($i-1)]
      $after = $lines[$i..($lines.Count-1)]
      $new = @()
      $new += $before
      $new += "  $fieldLine"
      $new += $after
      Backup-File $schemaPath
      Set-Content -Path $schemaPath -Value ($new -join "`n") -Encoding UTF8
      return $true
    }
  }
  throw "Could not find closing brace for model: $modelName"
}

function Try-PatchCompose($composePath) {
  if (-not (Test-Path $composePath)) { return $false }
  $raw = Get-Content -Raw -Encoding UTF8 $composePath
  if ($raw -match "FEATURE_CHECKIN") { return $false }

  $insert = @(
    '      FEATURE_CHECKIN: ${FEATURE_CHECKIN:-0}',
    '      CHECKIN_DEDUPE_SEC: ${CHECKIN_DEDUPE_SEC:-60}'
  ) -join "`n"

  try {
    return Ensure-InsertAfter -path $composePath -anchorRegex "^\s*PRISMA_DB_PUSH_FLAGS:.*$" -insertText $insert -guardRegex "FEATURE_CHECKIN"
  } catch {
    try {
      return Ensure-InsertAfter -path $composePath -anchorRegex "^\s*ROUTE_LEARN_INTERVAL_MS:.*$" -insertText $insert -guardRegex "FEATURE_CHECKIN"
    } catch {
      Backup-File $composePath
      Set-Content -Path $composePath -Value ($raw + "`n" + $insert + "`n") -Encoding UTF8
      return $true
    }
  }
}

$repo = (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path
$schema = Join-Path $repo "backend/prisma/schema.prisma"
$server = Join-Path $repo "backend/src/server.js"
$checkinRoute = Join-Path $repo "backend/src/routes/checkin.js"
$compose1 = Join-Path $repo "infra/docker-compose.yml"
$compose2 = Join-Path $repo "infra/infra/docker-compose.yml"

if (-not (Test-Path $schema)) { throw "schema.prisma not found: $schema" }
if (-not (Test-Path $server)) { throw "server.js not found: $server" }
if (-not (Test-Path $checkinRoute)) { throw "checkin route not found (overlay not extracted?): $checkinRoute" }

Write-Host "=== APPLY M42 OPTIONAL CHECKIN (QR/NFC) ===" -ForegroundColor Cyan

# 1) Patch server.js (import + mount)
$changedServer = $false
try {
  $changedServer = $changedServer -or (Ensure-InsertAfter -path $server -anchorRegex "import\s+\{\s*offersRouter\s*\}\s+from\s+.*routes\/offers\.js.*;" -insertText "import { checkinRouter } from \"routes/checkin.js";" -guardRegex "checkinRouter")
} catch {
  $changedServer = $changedServer -or (Ensure-InsertAfter -path $server -anchorRegex "import\s+\*\s+as\s+agreementsMod\s+from\s+.*routes\/agreements\.js.*;" -insertText "import { checkinRouter } from \"routes/checkin.js";" -guardRegex "checkinRouter")
}

try {
  $changedServer = $changedServer -or (Ensure-InsertAfter -path $server -anchorRegex "app\.use\(.*\/api\/offers.*offersRouter\(io\).*\);" -insertText "app.use(\"/api/checkin\", checkinRouter(io));" -guardRegex "\/api\/checkin")
} catch {
  $changedServer = $changedServer -or (Ensure-InsertAfter -path $server -anchorRegex "app\.use\(.*\/api\/agreements.*agreementsRouter\(io\).*\);" -insertText "app.use(\"/api/checkin\", checkinRouter(io));" -guardRegex "\/api\/checkin")
}

# 2) Patch schema.prisma (enums + models + relation fields)
$schemaAppend = @'

enum CredentialType {
  QR
  NFC
}

enum CredentialStatus {
  ACTIVE
  REVOKED
}

enum CheckinEventType {
  BOARD
  ALIGHT
}

enum CheckinSource {
  QR
  NFC
  MANUAL
}

model PersonelCredential {
  id         Int              @id @default(autoincrement())
  personelId Int
  type       CredentialType
  tokenHash  String           @unique
  status     CredentialStatus @default(ACTIVE)
  issuedAt   DateTime         @default(now())
  revokedAt  DateTime?
  lastUsedAt DateTime?
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  personel Personel @relation(fields: [personelId], references: [id], onDelete: Cascade)

  @@index([personelId, status])
  @@index([type])
}

model CheckinEvent {
  id        Int             @id @default(autoincrement())
  shiftId   Int
  personelId Int
  eventType CheckinEventType
  source    CheckinSource
  at        DateTime        @default(now())
  deviceId  String?
  meta      Json?
  createdAt DateTime        @default(now())

  shift    Shift    @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  personel Personel @relation(fields: [personelId], references: [id], onDelete: Cascade)

  @@index([shiftId, at])
  @@index([personelId, at])
  @@index([eventType, at])
}
'@

$changedSchema = Ensure-Append -path $schema -appendText $schemaAppend -guardRegex "enum\s+CredentialType"

$changedSchema = $changedSchema -or (Ensure-ModelField -schemaPath $schema -modelName "Personel" -fieldLine "credentials PersonelCredential[]" -fieldGuardRegex "credentials\s+PersonelCredential\[\]")
$changedSchema = $changedSchema -or (Ensure-ModelField -schemaPath $schema -modelName "Personel" -fieldLine "checkins CheckinEvent[]" -fieldGuardRegex "checkins\s+CheckinEvent\[\]")
$changedSchema = $changedSchema -or (Ensure-ModelField -schemaPath $schema -modelName "Shift" -fieldLine "checkins CheckinEvent[]" -fieldGuardRegex "checkins\s+CheckinEvent\[\]")

# 3) Patch docker-compose (optional toggle via .env)
$changedCompose = $false
$changedCompose = $changedCompose -or (Try-PatchCompose $compose1)
$changedCompose = $changedCompose -or (Try-PatchCompose $compose2)

Write-Host "`n--- RESULT ---" -ForegroundColor Cyan
Write-Host ("server.js patched: {0}" -f $changedServer) -ForegroundColor Green
Write-Host ("schema.prisma patched: {0}" -f $changedSchema) -ForegroundColor Green
Write-Host ("docker-compose patched: {0}" -f $changedCompose) -ForegroundColor Green
Write-Host "`nNext: restart stack (pack will prisma db push)." -ForegroundColor Cyan
