param(
  [string]$RepoRoot = (Get-Location).Path
)

$schemaPath = Join-Path $RepoRoot 'backend/prisma/schema.prisma'
if (!(Test-Path $schemaPath)) {
  throw "schema.prisma not found: $schemaPath"
}

$txt = Get-Content $schemaPath -Raw

# If already fixed, exit cleanly.
if ($txt -match '(?ms)^model\s+User\s*\{.*?\n\s*notifications\s+Notification\[\].*?\n\}') {
  Write-Host "OK: User.notifications already present."
  exit 0
}

# Find the User model block.
$re = [regex]'(?ms)^model\s+User\s*\{.*?^\}'
$m = $re.Match($txt)
if (!$m.Success) {
  throw "model User block not found in schema.prisma"
}

$userBlock = $m.Value

# Insert the relation field near other relations, before @@index or before closing brace.
$insertLine = "  notifications Notification[]`r`n"

if ($userBlock -match '(?m)^\s*@@') {
  $userBlock2 = [regex]::Replace($userBlock, '(?m)^(\s*@@)', $insertLine + '$1', 1)
} else {
  $userBlock2 = [regex]::Replace($userBlock, '(?m)^\}', $insertLine + "}", 1)
}

$txt2 = $txt.Substring(0, $m.Index) + $userBlock2 + $txt.Substring($m.Index + $m.Length)
Set-Content -Path $schemaPath -Value $txt2 -Encoding UTF8

Write-Host "PATCHED: Added User.notifications relation (Notification[])."
