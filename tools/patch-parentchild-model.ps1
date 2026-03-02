# PATCH: Ensure ParentChild model exists in Prisma schema (for SUPER_ADMIN parent↔student binding)
# - Adds model ParentChild if missing
# - Adds relation arrays to User and Personel models if missing
# - Writes UTF-8 (no BOM) + backup to tools/_backup
param(
  [string]$SchemaPath = "backend/prisma/schema.prisma"
)

function WriteUtf8NoBom([string]$path, [string]$content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

if (!(Test-Path $SchemaPath)) {
  throw "schema.prisma not found at: $SchemaPath"
}

$schema = Get-Content $SchemaPath -Raw -Encoding UTF8

# Backup
$backupDir = Join-Path "tools" "_backup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = Join-Path $backupDir ("schema.prisma.bak.parentchild.$ts")
Copy-Item $SchemaPath $bak -Force

$changed = $false

# 1) Ensure ParentChild model exists
if ($schema -notmatch '(?s)\bmodel\s+ParentChild\s*\{') {
  $model = @"

model ParentChild {
  id           Int      @id @default(autoincrement())
  parentUserId Int
  personelId   Int
  createdAt    DateTime @default(now())

  parent User     @relation("ParentUserChildren", fields: [parentUserId], references: [id])
  child  Personel @relation("ParentChildPersonel", fields: [personelId], references: [id])

  @@unique([parentUserId, personelId])
  @@index([personelId])
}
"@
  $schema = $schema.TrimEnd() + $model
  $changed = $true
}

# Helper: insert field line before closing brace of a model
function EnsureModelField([string]$schemaText, [string]$modelName, [string]$fieldRegex, [string]$fieldLine) {
  $pattern = "(?s)(\bmodel\s+$modelName\s*\{)(.*?)(\n\})"
  $m = [regex]::Match($schemaText, $pattern)
  if (!$m.Success) { return @($schemaText, $false, "Model $modelName not found") }

  $body = $m.Groups[2].Value
  if ([regex]::IsMatch($body, $fieldRegex)) {
    return @($schemaText, $false, "Field already present in $modelName")
  }

  # Insert before the model close brace
  $newBody = $body.TrimEnd() + "`n  $fieldLine`n"
  $out = $schemaText.Substring(0, $m.Index) + $m.Groups[1].Value + $newBody + $m.Groups[3].Value + $schemaText.Substring($m.Index + $m.Length)
  return @($out, $true, "Inserted into $modelName")
}

# 2) Ensure User has parentChildren relation
$result = EnsureModelField $schema "User" "\bparentChildren\b" 'parentChildren ParentChild[] @relation("ParentUserChildren")'
$schema = $result[0]
if ($result[1]) { $changed = $true }

# 3) Ensure Personel has parentLinks relation
$result = EnsureModelField $schema "Personel" "\bparentLinks\b" 'parentLinks ParentChild[] @relation("ParentChildPersonel")'
$schema = $result[0]
if ($result[1]) { $changed = $true }

if (!$changed) {
  Write-Host "ℹ️ schema.prisma already contains ParentChild + relations (no changes). Backup: $bak"
  exit 0
}

# Normalize: remove accidental duplicate blank lines (light touch)
$schema = $schema -replace "(\r?\n){4,}", "`r`n`r`n`r`n"

WriteUtf8NoBom $SchemaPath $schema
Write-Host "✅ Patched schema.prisma for ParentChild binding. Backup: $bak"
Write-Host "Next: .\tools\reset-and-pack.ps1"
