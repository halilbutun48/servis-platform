param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function Info($m){ Write-Host "INFO $m" }
function Ok($m){ Write-Host "OK $m" }
function MustExist($rel){ $p = Join-Path $RepoRoot $rel; if (!(Test-Path -LiteralPath $p)) { throw "FAIL $rel missing" }; Ok "$rel exists" }
function MustAbsent($rel){ $p = Join-Path $RepoRoot $rel; if (Test-Path -LiteralPath $p) { throw "FAIL $rel still live" }; Ok "$rel archived" }
function MustContain($rel, $needle, $label){ $p = Join-Path $RepoRoot $rel; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; if ($txt -notlike "*$needle*") { throw "FAIL $label" }; Ok $label }
function MustContainAny($rel, $needles, $label){ $p = Join-Path $RepoRoot $rel; $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8; foreach ($needle in $needles) { if ($txt -like "*$needle*") { Ok $label; return } }; throw "FAIL $label" }
Info 'Checking stale artifacts archived'
@('tools\_overlay_payload\primer_refresh','infra\infra\solver\Dockerfile') | ForEach-Object { MustAbsent $_ }
Info 'Checking canonical files'
@('infra\solver\Dockerfile','tools\PRIMER_SNAPSHOT.md','docs\PRIMER_SSOT.md','docs\overlays\OVERLAY_NOTES_M106_LINK_TTL_AND_HYGIENE_2026-03-10.md') | ForEach-Object { MustExist $_ }
Info 'Checking link TTL sync'
MustContain 'web\src\panels\school\ParentInvitePanel.jsx' '<option value="1">1 gün</option>' 'veli erisimi 1 gun preset'
MustContain 'web\src\panels\school\ParentInvitePanel.jsx' '<option value="7">1 hafta</option>' 'veli erisimi 1 hafta preset'
MustContain 'web\src\panels\school\ParentInvitePanel.jsx' '<option value="30">1 ay</option>' 'veli erisimi 1 ay preset'
MustContain 'web\src\panels\school\ParentInvitePanel.jsx' '<option value="180">6 ay</option>' 'veli erisimi 6 ay preset'
MustContain 'web\src\panels\school\ParentInvitePanel.jsx' '<option value="365">1 yıl</option>' 'veli erisimi 1 yil preset'
MustContain 'backend\src\routes\schoolParentInvites.js' 'Math.min(365' 'veli erisimi backend max 365'
MustContain 'web\src\panels\company\PassengerLinksPanel.jsx' '<option value="7">1 hafta</option>' 'personel link 1 hafta preset'
MustContain 'web\src\panels\company\PassengerLinksPanel.jsx' '<option value="30">1 ay</option>' 'personel link 1 ay preset'
MustContain 'web\src\panels\company\PassengerLinksPanel.jsx' '<option value="180">6 ay</option>' 'personel link 6 ay preset'
MustContain 'web\src\panels\company\PassengerLinksPanel.jsx' '<option value="365">1 yıl</option>' 'personel link 1 yil preset'
MustContain 'backend\src\routes\passengerLinks.js' '.max(365)' 'personel link backend max 365'
MustContain 'backend\src\routes\passengerLinks.js' 'ttlDays) expiresAt = new Date' 'personel link no hard shift-end clamp'
Info 'Checking primer/docs sync'
MustContain 'tools\PRIMER_SNAPSHOT.md' 'TTL_PRESETS_PARENT_PUBLIC_LINKS_V1' 'primer ttl summary sync'
MustContain 'docs\PRIMER_SSOT.md' 'TTL_PRESETS_PARENT_PUBLIC_LINKS_V1' 'docs primer ttl sync'
MustContain 'docs\STARTPACK_V1.md' 'STARTPACK_PARENT_TTL_PRESETS_V1' 'startpack parent ttl sync'
MustContain 'docs\STARTPACK_V1.md' 'STARTPACK_PUBLIC_LINK_TTL_PRESETS_V1' 'startpack personel ttl sync'
MustAbsent 'tools\PRIMER_SNAPSHOT_2026-03-10_M106_1.md'
Write-Host 'REPO HYGIENE M106 CHECK PASS'

