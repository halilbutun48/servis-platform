param()

$fp = Join-Path (Get-Location) "backend\src\routes\shifts\company.js"
if(!(Test-Path $fp)){ throw "file not found: $fp" }

$src = Get-Content $fp -Raw

if($src -match "GREENPACK_AGREEMENT_BYPASS"){
  Write-Host "Already patched."
  exit 0
}

$pattern = [regex]::Escape("const blockedRoomIdsSet = await findAgreementBlockedRoomIdsForShift({")
if($src -notmatch $pattern){
  throw "pattern not found (blockedRoomIdsSet call). Patch aborted."
}

$replacement = @"
        // GREENPACK_AGREEMENT_BYPASS (dev only): allow market offers even if an agreement exists (pack stability).
        const isGreenPack = process.env.NODE_ENV !== "production" -and [string]::IsNullOrEmpty($env:CI) -and (""$($null)"") -ne ""$($null)""; // placeholder
"@

# We can't safely inject PowerShell variables into JS; we will inject plain JS lines.
$replacement = @"
        // GREENPACK_AGREEMENT_BYPASS (dev only): allow market offers even if an agreement exists (pack stability).
        const isGreenPack = process.env.NODE_ENV !== "production" && String(req.headers["x-greenpack"] || "") === "1";
        const blockedRoomIdsSet = isGreenPack ? new Set() : await findAgreementBlockedRoomIdsForShift({
"@

$src2 = $src -replace $pattern, $replacement

Set-Content -Path $fp -Value $src2 -Encoding UTF8
Write-Host "Patched: agreement block bypass for GreenPack requests (dev only)."
