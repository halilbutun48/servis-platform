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
    if ($trim -match '^=== ' -or $trim -match '^--- ') {
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

function ConvertTo-NativeArgumentString {
  param(
    [Parameter()][object[]]$ArgumentList
  )

  $parts = @()
  foreach ($arg in @($ArgumentList)) {
    if ($null -eq $arg) { continue }
    $s = [string]$arg
    if ($s -match '[\s"]') {
      $escaped = $s -replace '(\\*)"', '$1$1\\"'
      $escaped = $escaped -replace '(\\+)$', '$1$1'
      $parts += '"' + $escaped + '"'
    } else {
      $parts += $s
    }
  }
  return ($parts -join ' ')
}

function Invoke-ExternalColor {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter()][object[]]$ArgumentList
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $psi.Arguments = ConvertTo-NativeArgumentString -ArgumentList $ArgumentList
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  [void]$proc.Start()

  while (-not $proc.HasExited -or -not $proc.StandardOutput.EndOfStream -or -not $proc.StandardError.EndOfStream) {
    while (-not $proc.StandardOutput.EndOfStream) {
      Write-StatusLine $proc.StandardOutput.ReadLine()
    }
    while (-not $proc.StandardError.EndOfStream) {
      Write-StatusLine $proc.StandardError.ReadLine()
    }
    Start-Sleep -Milliseconds 50
  }

  $proc.WaitForExit()
  return $proc.ExitCode
}
