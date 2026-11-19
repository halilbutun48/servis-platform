[CmdletBinding(SupportsShouldProcess)]
param(
  [int]$MinimumAgeHours = 24
)

$ErrorActionPreference = "Stop"
$lifecycle = "temporary-test"
$owner = "seferpakt"
$cutoff = (Get-Date).ToUniversalTime().AddHours(-$MinimumAgeHours)

$ids = @(& docker ps -aq --filter "label=com.seferpakt.owner=$owner" --filter "label=com.seferpakt.lifecycle=$lifecycle")
if ($LASTEXITCODE -ne 0) { throw "Unable to list owned temporary test containers" }

$removed = @()
$protected = @()
foreach ($id in $ids | Where-Object { $_ }) {
  $raw = & docker inspect $id 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Unable to inspect temporary container $id" }
  $item = ($raw -join "") | ConvertFrom-Json | Select-Object -First 1
  $labels = $item.Config.Labels
  $created = [DateTime]::Parse($item.Created).ToUniversalTime()
  $hasMounts = @($item.Mounts).Count -gt 0
  $rollback = $labels.'com.seferpakt.rollback' -eq "true"
  $eligible = $item.State.Status -eq "exited" -and $created -lt $cutoff -and -not $hasMounts -and -not $rollback
  if (-not $eligible) {
    $protected += [pscustomobject]@{ id = $id.Substring(0, 12); status = $item.State.Status; created = $created; mounted = $hasMounts; rollback = $rollback }
    continue
  }
  if ($PSCmdlet.ShouldProcess($id, "remove owned stopped SeferPakt temporary test container")) {
    & docker rm $id *> $null
    if ($LASTEXITCODE -ne 0) { throw "Unable to remove exact temporary container $id" }
    $removed += $id
  }
}

[ordered]@{
  owner = $owner
  lifecycle = $lifecycle
  cutoffUtc = $cutoff.ToString("o")
  removedIds = $removed
  protected = $protected
  volumesTouched = $false
  networksTouched = $false
} | ConvertTo-Json -Depth 8
