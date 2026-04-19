# NEXT BACKLOG V1

Tarih: 2026-04-09
Timezone: Europe/Istanbul

Current direction: **servis-platform main -> M0->M89 green -> M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 / M90C.6 / M90C.7 / M90C.8 kapandi -> siradaki resmi is M90C.9 safe closure / final hygiene checklist**

Single-roof verification update: `M91` route preview local acceptance bandi ve `M92` repo verification spine eklendi. Gunluk resmi kontrol girisi `npm run verify:repo`.

## 1) Resmi durum
- GÃ¼ncel doÄŸrulanmÄ±ÅŸ baz: `MASTER PACK PASS OK (M0->M89)`
- Tarihsel tam master referansÄ± korunur: `MASTER PACK PASS OK (M0->M79)`
- Repo audit: `REPO AUDIT MASTER PASS`
- `tools/STABLE_TO.txt = 78` M78.x compatibility marker olarak korunur
- Parent Access akÄ±ÅŸÄ± legacy invite deÄŸildir; Ã¶ÄŸrenci + sÃ¼re + eriÅŸim linki + eriÅŸim kodu + PIN mantÄ±ÄŸÄ±yla Ã§alÄ±ÅŸÄ±r
- OSRM kodu repoda vardÄ±r ama default compose modu fallback davranÄ±r

## 2) Hemen sonraki ana faz
1. `M90C.9` â€” gÃ¼venli kapanÄ±ÅŸ / final hygiene checklist
2. `M90A` â€” canonical markdown hizasÄ±
3. `M90B` â€” `repo_contract_state` + pack/verify convergence
4. `M90C` â€” screenshot baÄŸÄ±mlÄ±lÄ±ÄŸÄ±nÄ± azaltan proof reformu
5. `M90D` â€” `SCRIPT_KILAVUZU_MILESTONE_HARITASI` tek dosya standardÄ±
6. `M90E` â€” repo hijyen kapanÄ±ÅŸÄ±

## 2.0) Closure gate visibility
- `M90B.1` executable closure gate kanonik kapanis hattinin immediate gate'i olarak korunur.
- `M90C.3` kapanmistir; M90B.1 gorunurlugu backlog icinde devam eder.
- `M90C.5` schema iÃ§in resmi karar kapisidir; `M90C.6` hot-file queue policy, `M90C.7` export/package hygiene closure ve `M90C.8` CI / verification visibility kapanmÄ±ÅŸtÄ±r; sÄ±radaki kapÄ± `M90C.9` safe closure / final hygiene checklist'tir.

## 2.1) helpComposer exception policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasÄ±dÄ±r.
- Bu dosyada line-count reduction hedefi yoktur.
- Agresif kÃ¼Ã§Ã¼ltme/refactor yapÄ±lmayacaktÄ±r.
- Sadece acceptance-safe lokal dÃ¼zeltme yapÄ±labilir.
- M90C.1, M90C.2 ve M90C.3 kapanmÄ±ÅŸtÄ±r; helpComposer policy canonical docs iÃ§ine iÅŸlenmiÅŸtir.


## 2.2) schema.prisma decision
- `backend/prisma/schema.prisma` M90 hattÄ±nda **justified exception** olarak korunur.
- Bu dosya line-count nedeniyle bÃ¶lÃ¼nmeyecektir.
- GerekÃ§e: migration, seed, Prisma client ve repo-contract/check yÃ¼zeyleri tek path Ã¼zerinden baÄŸlanmÄ±ÅŸtÄ±r.
- M90 kapanÄ±ÅŸ hattÄ±nda split refactor acceptance deÄŸeri Ã¼retmez; yapÄ±sal risk Ã¼retir.
- Ä°zin verilen deÄŸiÅŸiklikler: migration-safe alan/model/enum ekleri, relation/index/constraint tamiri, acceptance-safe lokal dÃ¼zeltme.
- Bu karar kapanmÄ±ÅŸtÄ±r; hot-file queue policy, export/package hygiene closure ve CI / verification visibility de kapanmÄ±ÅŸtÄ±r; sÄ±radaki gerÃ§ek iÅŸ: `M90C.9 â€” gÃ¼venli kapanÄ±ÅŸ / final hygiene checklist`.

## 2.3) M90C.6 â€” hot-file queue policy
- Hot/large file listesi artÄ±k sadece rapor deÄŸildir; resmi sÄ±nÄ±flÄ± queue olarak takip edilir.
- KÃ¶r refactor yapÄ±lmaz; Ã¶nce acceptance, sonra kontrollÃ¼ temizlik uygulanÄ±r.
- `helpComposer.js` ve `schema.prisma` **justified exception** olarak korunur.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js`, `web/src/panels/shared/CopilotPanel.jsx` ve `mobile/App.js` **acceptance-sensitive / later** sÄ±nÄ±fÄ±ndadÄ±r.
- `backend/src/ai/jobGuide/screenCatalog.js`, `web/src/panels/room/ShiftsPanel.jsx` **safe candidate review** kuyruÄŸundadÄ±r.
- Kanonik komut: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`.

## 2.4) M90C.7 â€” export / package hygiene closure
- Shareable repo paketi Ã§alÄ±ÅŸma alanÄ± artÄ±ÄŸÄ± taÅŸÄ±mayacaktÄ±r.
- `.env`, `web/dist`, `mobile/dist`, `backend/data/*.json`, overlay readme/log kalÄ±ntÄ±larÄ± ve mevcut zip arÅŸivleri export dÄ±ÅŸÄ±nda kalÄ±r.
- SatÄ±r azaltma en sona bÄ±rakÄ±lÄ±r; bu adÄ±m davranÄ±ÅŸ refactor'u deÄŸildir.
- Kanonik komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Shareable zip komutu: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`.

## 2.5) M90C.8 â€” CI / verification visibility
- Yerelde Ã§alÄ±ÅŸan verify hattÄ± repo-native gÃ¶rÃ¼nÃ¼r hale getirilecektir.
- KÃ¶k komut: `npm run verify:ci`.
- KÃ¶k zincir backend + web lint Ã§alÄ±ÅŸtÄ±rÄ±r; web lint kanonik kanÄ±t dosyasÄ±: `artifacts/lint/web_lint_latest.txt`.
- Workflow: `.github/workflows/vardis_verification_visibility.yml`.
- `repo-verification` iÅŸi root verify chain'i, `shareable-export` iÅŸi M90C.7 export hygiene pack'i Ã§alÄ±ÅŸtÄ±rÄ±r.
- Artifact gÃ¶rÃ¼nÃ¼rlÃ¼ÄŸÃ¼: `artifacts/repo-audit/repo_audit_latest.json`, `artifacts/lint/web_lint_latest.txt` ve `artifacts/shareable-export/servis-platform_shareable_*.zip`.
- SatÄ±r azaltma en sona bÄ±rakÄ±lÄ±r; bu adÄ±m gÃ¶rÃ¼nÃ¼r doÄŸrulama iÃ§indir.

## 3) Bu turun Ã§alÄ±ÅŸma kuralÄ±
- Ã¼rÃ¼n davranÄ±ÅŸÄ±nÄ± bozma
- yeni Ã¶zellik aÃ§ma
- Ã¶nce `tools\pack.ps1 -To 89` ile green baz korunur
- sonra `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform` ile closure gate doÄŸrulanÄ±r
- Ã¶nce canonical docs/state hizasÄ±nÄ± dÃ¼zelt
- script/check sistemini yeni canonical duruma gÃ¶re gÃ¼ncelle
- screenshot metin baÄŸÄ±mlÄ±lÄ±ÄŸÄ±nÄ± azalt
- master rerun ve repo audit sona yakÄ±n Ã§alÄ±ÅŸtÄ±r

## 4) Kanonik komutlar
- `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m82_8_verification_2_0.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m85_optional_payment_pilot.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m86_required_payment_rollout.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m87_payment_account_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m88_settlement_operations_console.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m89_settlement_reconciliation_desk.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m91_shift_agreement_route_preview.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m92_repo_verification_spine.ps1 -RepoRoot D:\servis-platform`
- `npm run verify:repo`

## 5) AÃ§Ä±k hizalama notu
- `docs/overlays/M80`, `M81`, `M82` klasÃ¶rleri gÃ¼ncel milestone anlamÄ± deÄŸildir.
- Tek aktif script rehberi: `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- Eski V1/V2/V3 script guide dosyalarÄ± tarihsel yÃ¶nlendirme notudur.
- M90, yeni Ã¼rÃ¼n modÃ¼lÃ¼ deÄŸil; repo gerÃ§eÄŸinin tekleÅŸtirilmesi iÅŸidir.

## 6) Ä°lk cÃ¼mle
GÃ¼ncel baz: `servis-platform` main, master pack `M0->M89` green. `M90C.1`, `M90C.2`, `M90C.3`, `M90C.4`, `M90C.5`, `M90C.6`, `M90C.7` ve `M90C.8` kapanmÄ±ÅŸtÄ±r; sÄ±radaki resmi iÅŸ `M90C.9 gÃ¼venli kapanÄ±ÅŸ / final hygiene checklist`tir.

## Repo contract state
- Makine-okur durum Ã¶zeti: `tools/repo_contract_state.json`
- State-first docs-contract kuralÄ±: Ã¶nce `repo_contract_state.json`, sonra markdown anlatÄ±mÄ± okunur.

## REPO_CONTRACT_MARKERS_V1
- BACKLOG_LIVING_ROUTE_M57_M65_V1
- BACKLOG_ROUTE_M59_V1
- BACKLOG_ROUTE_M63_V1
- BACKLOG_ROUTE_M64_V1
- BACKLOG_ROUTE_M65_V1
- DB_ANONYMIZE_BACKLOG_MARKER_V1

## BACKLOG_WARN_CLEANUP_M90D_V1
- BACKLOG_ROUTE_M60_FIELD_ACCEPTANCE_V1
- BACKLOG_ROUTE_M62_COMMERCIAL_CORE_V1


## 2.6) M90C.9 â€” gÃ¼venli kapanÄ±ÅŸ / final hygiene checklist
- Kanonik final giriÅŸ komutu: `npm run verify:final`.
- `verify:final`, root lint zinciri Ã¼zerinden backend + web lint Ã§alÄ±ÅŸtÄ±rÄ±r ve web lint kanÄ±tÄ±nÄ± `artifacts/lint/web_lint_latest.txt` dosyasÄ±na yazar.
- Windows tarafÄ±nda export/hijyen kapanÄ±ÅŸÄ± iÃ§in tercih edilen kabuk `pwsh` olacaktÄ±r.
- Final closure sÄ±rasÄ±: `verify:final` -> `type artifacts\lint\web_lint_latest.txt` -> `pack_m90_c7_export_package_hygiene` -> `export_shareable_repo_bundle` -> `git status --short`.
- `tools/export_shareable_repo_bundle.ps1` PS5 uyumsuz API Ã§aÄŸrÄ±larÄ±nÄ± geri getirmeyecek; `tar.exe` / `.NET ZipFile` fallback korunacaktÄ±r.
- SatÄ±r azaltma hÃ¢lÃ¢ en sona bÄ±rakÄ±lÄ±r; bu adÄ±m release/shareable/export/verify kapanÄ±ÅŸ emniyetidir.

## M90C.6 historical closure chain
- M90C.1-M90C.5 closed before M90C.6 hot-file queue policy.
- M90C.7 export/package hygiene, M90C.8 CI/verification visibility, and M90C.9 safe closure/final hygiene follow after M90C.6.


## M90C.6 exact closure chain markers
- M90C.1-M90C.5 closure before M90C.6
- M90C.7 export/package hygiene after M90C.6
- M90C.8 CI/verification visibility after M90C.6
- M90C.9 safe closure/final hygiene after M90C.6


M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 kapandi
