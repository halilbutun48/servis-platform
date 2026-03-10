# tools/fix-escaped-import-quotes.ps1
# Fix accidental \" sequences in JS import statements (causes SyntaxError in Node ESM).
# Targets known files, but is safe to run multiple times.

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Location).Path
$targets = @(
  "backend/src/routes/gps.js",
  "backend/src/routes/driver.js",
  "backend/src/routes/shifts/driver.js"
)

function Write-Utf8NoBom([string]$path, [string]$content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

$changed = 0
foreach ($rel in $targets) {
  $path = Join-Path $repoRoot $rel
  if (!(Test-Path $path)) { continue }

  $lines = [System.IO.File]::ReadAllLines($path)
  $out = New-Object System.Collections.Generic.List[string]
  $fileChanged = $false

  foreach ($line in $lines) {
    $newLine = $line
    if ($newLine -match '^\s*import\s+.*\sfrom\s+\\"') {
      # Replace only on import lines.
      $newLine = $newLine -replace '\\"', '"'
      $fileChanged = $true
    }
    $out.Add($newLine) | Out-Null
  }

  if ($fileChanged) {
    Write-Utf8NoBom $path ($out -join "`n")
    $changed++
    Write-Host "✅ Fixed escaped quotes in: $rel"
  }
}

if ($changed -eq 0) {
  Write-Host "ℹ️ No escaped import quotes found (already ok)."
} else {
  Write-Host "✅ Done. Files patched: $changed"
  Write-Host "Next: .\tools\reset-and-pack.ps1"
}
