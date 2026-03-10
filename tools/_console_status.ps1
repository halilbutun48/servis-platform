# tools/_console_status.ps1
function Write-StatusLine {
  param(
    [Parameter(ValueFromPipeline=$true)]
    [AllowNull()]
    [object]$Line
  )
  process {
    if ($null -eq $Line) { return }
    $s = [string]$Line
    $trim = $s.Trim()

    if ($trim -match '^=== .*PASS .*===\s*$') {
      Write-Host $s -ForegroundColor Green
      return
    }
    if ($trim -match '^=== ') {
      Write-Host $s -ForegroundColor Cyan
      return
    }
    if ($trim -match '^--- ') {
      Write-Host $s -ForegroundColor Cyan
      return
    }
    if ($trim -match '^\s*OK\b' -or $trim -eq 'health OK') {
      Write-Host $s -ForegroundColor Green
      return
    }
    if ($trim -match '^\s*(FAIL|ERROR)\b' -or
        $trim -match '^API health timeout' -or
        $trim -match '^repo contract fail:' -or
        $trim -match '^Docker compose command failed:' -or
        $trim -match '^Exception:') {
      Write-Host $s -ForegroundColor Red
      return
    }
    if ($trim -match '^\s*WARN\b' -or $trim -match '^down skipped:') {
      Write-Host $s -ForegroundColor Yellow
      return
    }
    if ($trim -match '^\s*(INFO|WAIT|CLEAN)\b' -or $trim -match '^Target stage:' -or $trim -match '^Mode:') {
      Write-Host $s -ForegroundColor Cyan
      return
    }

    Write-Host $s
  }
}

function Invoke-ExternalColor {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter()][object[]]$ArgumentList
  )
  & $FilePath @ArgumentList 2>&1 | ForEach-Object { Write-StatusLine $_ }
  return $LASTEXITCODE
}
