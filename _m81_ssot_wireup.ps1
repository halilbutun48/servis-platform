$ErrorActionPreference = "Stop"
$repo = "D:\servis-platform"

$mf = Join-Path $repo "tools\milestone_pack_manifest.json"
$obj = Get-Content $mf -Raw -Encoding UTF8 | ConvertFrom-Json
$exists = @($obj.stages | Where-Object { $_.id -eq "M81" }).Count -gt 0
if (-not $exists) {
  $stage = [pscustomobject]@{
    id = "M81"
    group = 81
    kind = "pack"
    script = "tools/pack_m81_mobile_saha_sertlestirme.ps1"
    repoParam = "RepoRoot"
    supportsNoBuild = $false
    check = "tools/check_m81_mobile_saha_sertlestirme_repo_contract.ps1"
    runbook = "docs/RUNBOOK_M81_MOBILE_SAHA_SERTLESTIRME.md"
    checklist = "docs/CHECKLIST_SSOT.md"
  }
  $obj.stages += $stage
}
$obj.generatedAt = "2026-04-03T00:00:00.000Z"
$obj | ConvertTo-Json -Depth 100 | Set-Content $mf -Encoding UTF8

$targets = @(
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md",
  "tools\README.md",
  "docs\STARTPACK_V1.md"
) | ForEach-Object { Join-Path $repo $_ }

foreach ($p in $targets) {
  $t = Get-Content $p -Raw -Encoding UTF8
  $t = $t.Replace("İş sırası olarak sonraki ana faz `M81` mobil saha sertleştirmedir.","M81 mobil saha sertleştirme resmi pack hattına bağlandı; sonraki ana faz `M82` controlled cleanup hazırlığıdır.")
  $t = $t.Replace("2. `M81` mobil saha sertleştirme işlerini aç","2. `M81` mobil saha sertleştirme resmi pack hattını koru")
  $t = $t.Replace("Repo şu an `M79`’a kadar doğrulanmış; `M80` kabul kapısı ve `M80.1` / `M80.2` / `M80.3` daraltma dosya setleri pack-pass görünür durumdadır. İş sırası olarak sonraki ana faz `M81` mobil saha sertleştirmedir; saha testi `M82` sonrası kullanıcı tarafından yapılacaktır.","Repo şu an `M0->M81` green doğrulamasını görmüş durumdadır. `M81` mobil saha sertleştirme resmi pack hattına bağlanmıştır; saha testi `M82` sonrası kullanıcı tarafından yapılacaktır.")
  $t = $t.Replace("Repo şu anda “M79’a kadar doğrulanmış, M80 kabul kapısı açılmış ve `M80.1` / `M80.2` / `M80.3` daraltma turları pack-pass ile görünür” durumdadır. Teknik state markerları compatibility için M80 tarafında kalabilir; iş sırası olarak sonraki ana faz `M81` mobil saha sertleştirmedir. `M82` controlled cleanup sonrası saha testi kullanıcı tarafından yapılacaktır.","Repo şu anda `M0->M81` green doğrulamasını görmüş durumdadır. `M81` mobil saha sertleştirme resmi pack hattına bağlanmıştır. `M82` controlled cleanup sonrası saha testi kullanıcı tarafından yapılacaktır.")
  if ($t -notmatch "pack_m81_mobile_saha_sertlestirme") {
    $t += [Environment]::NewLine + '- M81 mobil saha sertlestirme: tools\pack_m81_mobile_saha_sertlestirme.ps1 -RepoRoot D:\servis-platform'
  }
  Set-Content $p $t -Encoding UTF8
}
