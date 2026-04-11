# PRIMER SSOT â€” canonical living route snapshot

Bu primer yaÅŸayan hattÄ±n resmi Ã¶zetidir.

## GÃ¼ncel baz
- Repo: `servis-platform`
- Branch: `main`
- GÃ¼ncel doÄŸrulanmÄ±ÅŸ baz: `M0->M89 green`
- Tarihsel temiz anchor: `M0->M79`
- Sonraki kontrollÃ¼ iÅŸ: `M90 â€” Canonical Closure / 10-10 kapanÄ±ÅŸ paketi`
- Ä°lk yÃ¼rÃ¼tÃ¼lebilir kapanÄ±ÅŸ kapÄ±sÄ±: `M90B.1 â€” executable closure gate`
- M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 / M90C.7 / M90C.8 kapanmÄ±ÅŸtÄ±r; sÄ±radaki resmi iÅŸ: `M90C.9 â€” gÃ¼venli kapanÄ±ÅŸ / final hygiene checklist`

## GÃ¼ncel yaÅŸayan sÄ±ra
- `M80` â€” final sert kabul ve yÃ¼k gÃ¼veni
- `M80.1` â€” hot panel daraltma
- `M80.2` â€” agreements + shifts giriÅŸ yÃ¼kÃ¼
- `M80.3` â€” georeview + shifts son giriÅŸ yÃ¼kÃ¼
- `M81` â€” mobil saha sertleÅŸtirme
- `M82.1` â€” backend correctness kilidi
- `M82.8` â€” Verification 2.0
- `M82.9` â€” dormant payment backbone
- `M82.10` â€” super admin ticari ayarlar
- `M82.11` â€” payment readonly ticari yÃ¼zey
- `M83` â€” saha hazÄ±rlÄ±k paketi
- `M84` â€” saha geri bildirim dÃ¶ngÃ¼sÃ¼
- `M85` â€” opsiyonel Ã¶deme pilotu
- `M86` â€” zorunlu Ã¶deme rollout
- `M87` â€” Ã¶deme hesabÄ± hazÄ±rlÄ±ÄŸÄ±
- `M88` â€” settlement operasyon masasÄ±
- `M89` â€” settlement mutabakat masasÄ±

## ÃœrÃ¼n Ã§erÃ§evesi
- Platform sadece personel deÄŸildir; Ã¶ÄŸrenci/veli + personel alanlarÄ±nÄ± birlikte taÅŸÄ±r.
- Marka dili: **Vardis**
- Konumlama: **pazar + sÃ¶zleÅŸme + operasyon**
- YazÄ±lÄ±m ÅŸu anda Ã¼cretsiz kullanÄ±m yÃ¶nÃ¼nde kurgulanÄ±r; gelir modeli gelecekte Ã¶deme/komisyon aracÄ±lÄ±ÄŸÄ±dÄ±r.
- Ã–deme omurgasÄ± gerÃ§ek charge/payout aÃ§madan Ã¶nce dormant/feature-flag mantÄ±ÄŸÄ±nda ilerler.

## KalÄ±cÄ± kurallar
- AdÄ±m adÄ±m, kontrollÃ¼ ilerlenir.
- Overlay zip tek kÃ¶k klasÃ¶rlÃ¼ olmalÄ±dÄ±r.
- UI dili sade TÃ¼rkÃ§e ve dÃ¼ÅŸÃ¼k biliÅŸsel yÃ¼klÃ¼ kalmalÄ±dÄ±r.
- â€œwizardâ€ yerine tek Guided Mode/Stepper yaklaÅŸÄ±mÄ± korunur.
- â€œdriver GPSâ€ yerine â€œsÃ¼rÃ¼cÃ¼nÃ¼n telefon GPS'iâ€ kullanÄ±lÄ±r.
- â€œagreementâ€ yerine â€œsÃ¶zleÅŸmeâ€ kullanÄ±lÄ±r.
- Sistem eskiye dÃ¶ndÃ¼rÃ¼lmez; script/check/doc yeni canonical gerÃ§eÄŸe gÃ¶re gÃ¼ncellenir.

## M90 odak noktasÄ±
- kanonik markdown hizasÄ±
- state/pack/verify uyumu
- ilk yÃ¼rÃ¼tÃ¼lebilir kapanÄ±ÅŸ kapÄ±sÄ±: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- tek parÃ§a script rehberi
- screenshot baÄŸÄ±mlÄ±lÄ±ÄŸÄ±nÄ± azaltan proof reformu
- repo hijyen kapanÄ±ÅŸÄ±

## helpComposer exception policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasÄ±dÄ±r.
- Bu dosyada line-count reduction hedefi yoktur.
- Agresif kÃ¼Ã§Ã¼ltme/refactor yapÄ±lmaz.
- YalnÄ±z acceptance-safe lokal dÃ¼zeltme yapÄ±labilir.
- M90C.1, M90C.2 ve M90C.3 kapanmÄ±ÅŸtÄ±r; helpComposer policy canonical docs iÃ§ine iÅŸlenmiÅŸtir.

## schema.prisma decision
- `backend/prisma/schema.prisma` bu M90 hattÄ±nda **justified exception** olarak korunur.
- Bu dosyada sÄ±rf line-count dÃ¼ÅŸsÃ¼n diye path/split refactor yapÄ±lmayacaktÄ±r.
- GerekÃ§e: schema tek dosyada migration + seed + Prisma client + repo-contract check hattÄ±nÄ±n ortak referansÄ±dÄ±r.
- M90 kapanÄ±ÅŸ hattÄ±nda schema split yapmak acceptance deÄŸeri Ã¼retmez; yÃ¼ksek araÃ§lama / migration / contract riski Ã¼retir.
- Ä°zin verilen deÄŸiÅŸiklikler: migration-safe alan/model/enumeration ekleri, relation/index/constraint dÃ¼zeltmeleri, acceptance-safe lokal ÅŸema tamiri.
- Bu karar, schema Ã¼zerinde Ã§alÄ±ÅŸma yasaÄŸÄ± deÄŸildir; yalnÄ±z line-count odaklÄ± yapÄ±sal bÃ¶lmeyi M90 dÄ±ÅŸÄ±nda bÄ±rakÄ±r.
- Yeniden deÄŸerlendirme tetikleyicisi: M90 sonrasÄ± planlÄ± tooling hazÄ±rlÄ±ÄŸÄ± + explicit split ihtiyacÄ± + contract/check hattÄ±nÄ±n buna gÃ¶re tasarlanmasÄ±.

## hot-file queue policy
- Hot/large file kuyruÄŸu yalnÄ±z sayÄ±sal repo-audit Ã§Ä±ktÄ±sÄ± deÄŸildir; resmi sÄ±nÄ±flÄ± queue olarak yÃ¶netilir.
- KÃ¶r line-count dÃ¼ÅŸÃ¼rme yapÄ±lmaz; Ã¶nce acceptance, sonra kontrollÃ¼ temizlik uygulanÄ±r.
- `backend/src/ai/chat/helpComposer.js` ve `backend/prisma/schema.prisma` queue iÃ§inde **justified exception** olarak kalÄ±r.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js`, `web/src/panels/shared/CopilotPanel.jsx` ve `mobile/App.js` **acceptance-sensitive / later** sÄ±nÄ±fÄ±ndadÄ±r.
- `backend/src/ai/jobGuide/screenCatalog.js`, `web/src/panels/room/ShiftsPanel.jsx` **safe candidate review** kuyruÄŸundadÄ±r.
- Bu queue, `tools/repo_contract_state.json` iÃ§indeki `hotFileQueuePolicy` alanÄ± ve `repo_audit` Ã§Ä±ktÄ±sÄ± ile birlikte doÄŸrulanÄ±r.

## export / package hygiene closure
- SatÄ±r azaltma en sona bÄ±rakÄ±lÄ±r; bu adÄ±m export gÃ¼veni ve Ã§alÄ±ÅŸma alanÄ± hijyeni iÃ§indir.
- `.env`, build/dist artÄ±klarÄ±, runtime JSON store dosyalarÄ± ve overlay/log kalÄ±ntÄ±larÄ± shareable pakete giremez.
- Kanonik komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Shareable zip Ã¼retimi: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`.

## CI / verification visibility
- Repo-native gÃ¶rÃ¼nÃ¼r doÄŸrulama zinciri: `npm run verify:ci`.
- Root verify zinciri backend + web lint Ã§alÄ±ÅŸtÄ±rÄ±r; web lint kanonik kanÄ±tÄ±: `artifacts/lint/web_lint_latest.txt`.
- Workflow: `.github/workflows/vardis_verification_visibility.yml`.
- `repo-verification` iÅŸi root verify chain Ã§alÄ±ÅŸtÄ±rÄ±r; `shareable-export` iÅŸi M90C.7 export hygiene pack Ã§alÄ±ÅŸtÄ±rÄ±r.
- Artifact gÃ¶rÃ¼nÃ¼rlÃ¼ÄŸÃ¼: `artifacts/repo-audit/repo_audit_latest.json`, `artifacts/lint/web_lint_latest.txt` ve `artifacts/shareable-export/servis-platform_shareable_*.zip`.
- SatÄ±r azaltma en sona bÄ±rakÄ±lÄ±r; bu adÄ±m gÃ¶rÃ¼nÃ¼r doÄŸrulama iÃ§indir.


## safe closure / final hygiene checklist
- Kanonik final doÄŸrulama giriÅŸi: `npm run verify:final`.
- `verify:final`, root lint zinciri Ã¼zerinden backend + web lint Ã§alÄ±ÅŸtÄ±rÄ±r ve web lint kanÄ±tÄ±nÄ± `artifacts/lint/web_lint_latest.txt` dosyasÄ±na yazar.
- Windows tarafÄ±nda export/hijyen komutlarÄ±nda tercih edilen kabuk: `pwsh`.
- Final closure sÄ±rasÄ±: `npm run verify:final` -> `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform` -> `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform` -> `git status --short`.
- `tools/export_shareable_repo_bundle.ps1` iÃ§inde `tar.exe` / `.NET ZipFile` fallback korunur; `GetRelativePath` ve `ConvertFrom-Json -Depth` gibi PS5 uyumsuzluklarÄ± geri gelmez.
- SatÄ±r azaltma en sona bÄ±rakÄ±lÄ±r; bu adÄ±m yalnÄ±z gÃ¼venli kapanÄ±ÅŸ ve hijyen checklist'idir.

## REPO_CONTRACT_MARKERS_V1
- PRIMER_LIVING_ROUTE_M59_M89_V1
- PRIMER_ROUTE_M63_V1
- PRIMER_ROUTE_M64_V1
- PRIMER_ROUTE_M65_V1
- M75_GREEN_BASELINE_MARKER_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1
- NO_FIELD_TEST_BEFORE_CONTROLLED_SIGNOFF_V1
- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1

## TTL_PRESETS_PARENT_PUBLIC_LINKS_V1
- Veli eriÅŸimi ve personel/Ã¶ÄŸrenci public link presetleri marker-first okunur.
- SÃ¼re presetleri: 1 gÃ¼n / 1 hafta / 1 ay / 6 ay / 1 yÄ±l.
- Maksimum sÃ¼re: 365 gÃ¼n.

## PRIMER_WARN_CLEANUP_M90D_V1
- PRIMER_ROUTE_M45_RETENTION_BACKUP_V1
- PRIMER_ROUTE_M47_4_MOBILE_READINESS_V1
- PRIMER_ROUTE_M60_FIELD_ACCEPTANCE_V1
- PRIMER_ROUTE_M62_COMMERCIAL_CORE_V1

## M47_4_MOBILE_READINESS_ROUTE_V1
- Compatibility note: m47.3 green, m47.4 next route.
- Marker-first route: mobile readiness web pass canonical bridge after m47.3.

