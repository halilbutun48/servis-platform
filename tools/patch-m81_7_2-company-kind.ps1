# M81.7.2 — Ensure School/Parent schema compatibility
# - Company.kind (CompanyKind)
# - Personel.kind (PersonelKind)
# - If Notification has user relation, ensure User.notifications opposite exists
# Safe/idempotent patch for backend/prisma/schema.prisma

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$schemaPath = Join-Path $repoRoot 'backend\prisma\schema.prisma'

if (-not (Test-Path $schemaPath)) {
  throw "schema.prisma not found at: $schemaPath"
}

$raw = Get-Content $schemaPath -Raw

function Ensure-Enum([string]$name, [string]$body, [ref]$text) {
  if ($text.Value -match "(?s)\benum\s+$name\s*\{") { return }

  # Insert enums right before the first model declaration (best-effort)
  $m = [regex]::Match($text.Value, "(?m)^model\s+")
  if ($m.Success) {
    $idx = $m.Index
    $text.Value = $text.Value.Substring(0, $idx) + "enum $name {\n$body\n}\n\n" + $text.Value.Substring($idx)
  } else {
    $text.Value = $text.Value + "\n\nenum $name {\n$body\n}\n"
  }
}

function Ensure-CompanyKind([ref]$text) {
  if ($text.Value -match "(?s)model\s+Company\s*\{.*?\bkind\s+CompanyKind\b") { return }

  $pattern = "(?s)(model\s+Company\s*\{\s*\n)"
  if ($text.Value -match $pattern) {
    $text.Value = [regex]::Replace($text.Value, $pattern, "`$1  kind      CompanyKind @default(COMPANY)\n", 1)
  }

  if (-not ($text.Value -match "@@index\(\[kind\]\)")) {
    $text.Value = [regex]::Replace($text.Value, "(?s)(model\s+Company\s*\{.*?\n)(\s*@@index\()", "`$1  @@index([kind])\n\n  `$2", 1)
  }
  if (-not ($text.Value -match "@@index\(\[regionId,\s*kind\]\)")) {
    # Only add this composite index if Company has regionId field
    if ($text.Value -match "(?s)model\s+Company\s*\{.*?\bregionId\b") {
      $text.Value = [regex]::Replace($text.Value, "(?s)(model\s+Company\s*\{.*?\n)(\s*@@index\()", "`$1  @@index([regionId, kind])\n\n  `$2", 1)
    }
  }
}

function Ensure-PersonelKind([ref]$text) {
  if ($text.Value -match "(?s)model\s+Personel\s*\{.*?\bkind\s+PersonelKind\b") { return }

  # Insert right after companyId if possible
  $pattern = "(?s)(model\s+Personel\s*\{.*?\n\s*companyId\s+Int\s*\n)"
  if ($text.Value -match $pattern) {
    $text.Value = [regex]::Replace($text.Value, $pattern, "`$1  kind      PersonelKind @default(PERSONEL)\n", 1)
  } else {
    $pattern2 = "(?s)(model\s+Personel\s*\{\s*\n)"
    $text.Value = [regex]::Replace($text.Value, $pattern2, "`$1  kind      PersonelKind @default(PERSONEL)\n", 1)
  }

  if (-not ($text.Value -match "@@index\(\[companyId,\s*kind\]\)")) {
    $text.Value = [regex]::Replace($text.Value, "(?s)(model\s+Personel\s*\{.*?\n)(\s*@@index\()", "`$1  @@index([companyId, kind])\n\n  `$2", 1)
  }
}

function Ensure-UserNotificationsIfNeeded([ref]$text) {
  # If Notification has userId/user relation, User must have notifications[]
  $notifHasUser = $text.Value -match "(?s)model\s+Notification\s*\{.*?\buserId\b" -or $text.Value -match "(?s)model\s+Notification\s*\{.*?\buser\s+User\?\b"
  if (-not $notifHasUser) { return }

  if ($text.Value -match "(?s)model\s+User\s*\{.*?\bnotifications\s+Notification\[\]\b") { return }

  $pattern = "(?s)(model\s+User\s*\{\s*\n)"
  if ($text.Value -match $pattern) {
    $text.Value = [regex]::Replace($text.Value, $pattern, "`$1  notifications Notification[]\n", 1)
  }
}

$txt = [ref]$raw

Ensure-Enum 'CompanyKind' "  COMPANY\n  SCHOOL" $txt
Ensure-Enum 'PersonelKind' "  PERSONEL\n  STUDENT" $txt

Ensure-CompanyKind $txt
Ensure-PersonelKind $txt
Ensure-UserNotificationsIfNeeded $txt

Set-Content -Path $schemaPath -Value $txt.Value -Encoding UTF8
Write-Host "✅ Patched schema.prisma for School/Parent compatibility." -ForegroundColor Green
