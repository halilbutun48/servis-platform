# PRIMER SNAPSHOT

## GÃ¼ncel baz
- Repo: `servis-platform`
- Branch: `main`
- GÃ¼ncel doÄŸrulanmÄ±ÅŸ baz: `M0->M89 green`
- Tarihsel anchor: `M0->M79`
- M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 / M90C.7 / M90C.8 kapanmÄ±ÅŸtÄ±r; sÄ±radaki resmi iÅŸ: `M90C.9 gÃ¼venli kapanÄ±ÅŸ / final hygiene checklist`
- Ä°lk yÃ¼rÃ¼tÃ¼lebilir kapanÄ±ÅŸ kapÄ±sÄ±: `M90B.1 executable closure gate`

## Repo Ã¼stÃ¼nde yaÅŸayan hat
- `M80 -> M89`

## KÄ±sa Ã¼rÃ¼n Ã§erÃ§evesi
- Vardis, okul/Ã¶ÄŸrenci/veli ile ÅŸirket/personel taÅŸÄ±ma alanlarÄ±nÄ± aynÄ± omurgada taÅŸÄ±r.
- Konumlama: pazar + sÃ¶zleÅŸme + operasyon.
- Ã–deme omurgasÄ± dormant/feature-flag mantÄ±ÄŸÄ±nda ilerler.

## Resmi Ã¼st hat
1. `M82.1` Backend correctness kilidi
2. `M82.8` Verification 2.0
3. `M82.9` Dormant payment backbone
4. `M82.10` Super Admin ticari ayarlar
5. `M82.11` Payment readonly yÃ¼zey
6. `M83` Saha hazÄ±rlÄ±k paketi
7. `M84` Saha geri bildirim dÃ¶ngÃ¼sÃ¼
8. `M85` Opsiyonel Ã¶deme pilotu
9. `M86` Zorunlu Ã¶deme rollout
10. `M87` Ã–deme hesabÄ± hazÄ±rlÄ±ÄŸÄ±
11. `M88` Settlement operasyon masasÄ±
12. `M89` Settlement mutabakat masasÄ±

## M82.1 resmi pack yolu
- `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack.ps1 -To 82 -RepoDir D:\servis-platform -NoBuild`

## M80-M89 yaÅŸayan komut notu
- `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`

## M90 yÃ¶nÃ¼
- canonical markdown hizasÄ±
- state/pack/verify convergence
- ilk yÃ¼rÃ¼tÃ¼lebilir kapanÄ±ÅŸ kapÄ±sÄ±: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- tek parÃ§a script rehberi
- screenshot baÄŸÄ±mlÄ±lÄ±ÄŸÄ±nÄ± azaltan proof reformu
- repo hijyen kapanÄ±ÅŸÄ±

## helpComposer exception policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasÄ±dÄ±r.
- Bu dosyada line-count reduction hedefi yoktur.
- Agresif kÃ¼Ã§Ã¼ltme/refactor yapÄ±lmayacaktÄ±r.
- Sadece acceptance-safe lokal dÃ¼zeltme yapÄ±labilir.
- M90C.1, M90C.2 ve M90C.3 kapanmÄ±ÅŸtÄ±r; helpComposer policy canonical docs iÃ§ine iÅŸlenmiÅŸtir.

## schema.prisma decision
- `backend/prisma/schema.prisma` M90 hattÄ±nda justified exception olarak korunur.
- Bu dosya sÄ±rf satÄ±r sayÄ±sÄ± iÃ§in bÃ¶lÃ¼nmeyecektir.
- Migration + seed + Prisma client + repo-contract yÃ¼zeyleri tek path Ã¼zerinden baÄŸlÄ± kaldÄ±ÄŸÄ± iÃ§in split refactor bu hatta alÄ±nmaz.
- Ä°zin verilen deÄŸiÅŸiklikler: migration-safe alan/model/enum ekleri ve acceptance-safe lokal tamirler.
- Hot/large file queue resmi sÄ±nÄ±flÄ±dÄ±r; doÄŸrulama komutu: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`.
- SatÄ±r azaltma en sona bÄ±rakÄ±lÄ±r; Ã¶nce export/package hijyeni kapanÄ±r.
- Yeni resmi hijyen komutu: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Yeni resmi CI gÃ¶rÃ¼nÃ¼rlÃ¼k komutu: `tools\pack_m90_c8_ci_verification_visibility.ps1 -RepoRoot D:\servis-platform`.
- Yeni resmi final closure komutu: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Root verify chain: `npm run verify:ci`.
- Root verify zinciri web lint kanÄ±tÄ±nÄ± `artifacts/lint/web_lint_latest.txt` dosyasÄ±na yazar.
- Kanonik final verify giriÅŸi: `npm run verify:final`.

## hot-file queue policy
- `backend/src/ai/chat/helpComposer.js` ve `backend/prisma/schema.prisma` justified exception olarak korunur.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js`, `web/src/panels/shared/CopilotPanel.jsx` ve `mobile/App.js` acceptance-sensitive / later sÄ±nÄ±fÄ±ndadÄ±r.
- `backend/src/ai/jobGuide/screenCatalog.js`, `web/src/panels/room/ShiftsPanel.jsx` safe candidate review kuyruÄŸundadÄ±r.
- KÃ¶r line-count dÃ¼ÅŸÃ¼rme yoktur; Ã¶nce acceptance, sonra kontrollÃ¼ temizlik uygulanÄ±r.

## REPO_CONTRACT_MARKERS_V1
- TOOLS_PRIMER_LIVING_ROUTE_M59_M89_V1
- TOOLS_PRIMER_ROUTE_M63_V1
- TOOLS_PRIMER_ROUTE_M64_V1
- TOOLS_PRIMER_ROUTE_M65_V1
- M75_GREEN_BASELINE_MARKER_V1
- LIVING_ROUTE_M82_TO_M89_MARKER_V1
- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1

## TTL_PRESETS_PARENT_PUBLIC_LINKS_V1
- Veli eriÅŸimi ve personel/Ã¶ÄŸrenci public link presetleri marker-first okunur.
- SÃ¼re presetleri: 1 gÃ¼n / 1 hafta / 1 ay / 6 ay / 1 yÄ±l.
- Maksimum sÃ¼re: 365 gÃ¼n.

## TOOLS_PRIMER_WARN_CLEANUP_M90D_V1
- TOOLS_PRIMER_ROUTE_M45_RETENTION_BACKUP_V1
- TOOLS_PRIMER_ROUTE_M57_MOBILE_HARDENING_V1
- TOOLS_PRIMER_ROUTE_M60_FIELD_ACCEPTANCE_V1
- TOOLS_PRIMER_ROUTE_M62_COMMERCIAL_CORE_V1

## M47_4_MOBILE_READINESS_ROUTE_V1
- M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK
- M47.4 MOBILE READINESS WEB PASS
- Marker-first route: mobile readiness web pass canonical bridge after m47.3.



## safe closure / final hygiene checklist
- Windows tarafÄ±nda export/hijyen kapanÄ±ÅŸÄ± iÃ§in tercih edilen shell `pwsh` olur.
- Final sÄ±ra: `npm run verify:final` -> `type artifacts\lint\web_lint_latest.txt` -> `pack_m90_c7_export_package_hygiene` -> `export_shareable_repo_bundle` -> `git status --short`.
- `tools/export_shareable_repo_bundle.ps1` PS5 uyumlu fallback mantÄ±ÄŸÄ±nÄ± korur; `GetRelativePath` ve `ConvertFrom-Json -Depth` gibi kÄ±rÄ±klar geri gelmez.
- SatÄ±r azaltma en sona bÄ±rakÄ±lÄ±r.
