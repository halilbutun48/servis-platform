param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)

$schema = Join-Path $RepoRoot 'backend\prisma\schema.prisma'
if (!(Test-Path $schema)) { throw "schema not found: $schema" }

$backupDir = Join-Path $RepoRoot ("tools\_backup\organization_schema_dedupe_" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $schema (Join-Path $backupDir 'schema.prisma') -Force

$content = Get-Content $schema -Raw -Encoding UTF8

function Remove-DuplicateModelBlocks {
  param(
    [string]$Text,
    [string]$ModelName
  )

  $pattern = "(?ms)^[ \t]*model[ \t]+" + [regex]::Escape($ModelName) + "[ \t]*\{.*?^[ \t]*\}[ \t]*\r?\n?"
  $matches = [regex]::Matches($Text, $pattern)
  if ($matches.Count -le 1) { return $Text }

  # Keep the first block, remove later ones from the end backwards.
  for ($i = $matches.Count - 1; $i -ge 1; $i--) {
    $m = $matches[$i]
    $Text = $Text.Remove($m.Index, $m.Length)
  }
  return $Text
}

$content = Remove-DuplicateModelBlocks -Text $content -ModelName 'OrganizationPlan'
$content = Remove-DuplicateModelBlocks -Text $content -ModelName 'OrganizationStop'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($schema, $content, $utf8NoBom)

Write-Host "UPDATED backend\prisma\schema.prisma" -ForegroundColor Green
Write-Host "Backup: $backupDir" -ForegroundColor Yellow
Write-Host "Organization schema duplicate models cleaned" -ForegroundColor Green
