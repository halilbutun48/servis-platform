# NEXT BACKLOG V1

## Deferred post-#18 closure phase — Sağlam Merdiven Repository Exit ve Test Altyapısı Kalibrasyonu

Bu bölüm gelecekteki kapanış aşamasını tanımlar; mevcut aktif frontier'i,
B/C-3'ü veya #18 FULL D-LEVEL çalışmalarını değiştirmez. Faz yalnızca
`#18 FULL_D_LEVEL_CLOSED` kanıtlandıktan sonra, ayrı bir bounded görev ve
ayrı checkpoint ile başlatılabilir. #18 kapanmadan bu genel repository
temizliği, test altyapısı kalibrasyonu veya Git kapanışı başlatılamaz.

**Kapsam:** NEW-01 sonrasındaki gerçek tracked, untracked ve ilgili ignored
repository ağacının sahiplik ve kullanım denetimi; eski/boş/mükerrer/sahipsiz
artıkların kanıtla sınıflandırılması; geçersiz route/endpoint/model/service/
feature flag/dependency yollarının güvenli incelemesi; checker/runner/harness/
fixture beklentilerinin gerçek son ürün davranışına kalibrasyonu; dirty worktree
uzlaştırması; tek release adayı üzerinde birleşik regresyon, gerçek Chromium,
aynı-build public, sekiz rol, Finans 11 sekme ve Sefer Abi kabulinin yeniden
bağlanması.

**Korumalar:** NEW-01 kanıtı yeniden üretilmez; reset/clean/checkout,
kontrolsüz silme, canonical DB/runtime değişikliği, güvenlik kapısı gevşetme
ve dirty worktree kaybı yoktur. Manuel ödeme beyanı, ROOM tahsilat onayı,
audit, idempotency ve finansal mutabakat korunur. Ödeme aracılığı, payout veya
settlement kodu yalnız gerçek ürün politikası, kullanım grafiği ve güncel
regresyon kanıtıyla sınıflandırılır; kanıtsız silinmez.

**Kapanış kapısı:** Kaynağı belli olmayan veya repository-owned artık
bırakılmadan önce her dosya/route/model/servis/test/harness için sahip,
tüketici, provenance, kullanım ve geri dönüş kararı bulunur. Ürün kusuru,
test/harness kusuru, stale runtime ve fixture farkı ayrı raporlanır. Son
birleşik adayda kritik sekiz rol akışları, Finans 11 sekme matematiği, Sefer
Abi ve gerçek Chromium/public same-build kanıtı geçmeden commit/tag/push
yetkisi kullanılmaz. Bu fazın sonraki giriş adı:
`SEFERPAKT — #18 SONRASI REPOSITORY EXIT VE TEST ALTYAPISI KALİBRASYONU`.

## Latest canonical handoff checkpoint (2026-10-30 — bounded ROOM Finance platform reference UX acceptance)

This additive checkpoint closes only the approved ROOM Finance platform-reference and Sefer Abi UX slice. The five ROOM Finance tabs and existing calculations remain intact. The worktree remains dirty; no business-write, seed, reset, migration, commit, tag or push was performed.

- **API gate — PASS / live activation NOT_PROVEN:** the old raw accepted-offer path that could publish `110.000 TL` from seven Istanbul offers belonging to one ROOM was removed from the external reference path. The path now delegates to the canonical fail-closed gate. Live local/public snapshots return `NOT_PROVEN`, `available=false`, `valueMinor=null`, `range=null`, `rawTenantDataExposed=false`; no arbitrary threshold or policy was activated.
- **Evidence policy — PASS:** the gate tests reject missing policy, non-READY canonical commercial evidence, DEMO/test observations, incomplete or mismatched comparison dimensions and insufficient independent ROOM diversity. The controlled positive fixture opens only with an explicitly supplied approved policy and three independent ROOM observations, returning an aggregated median without room/agreement identifiers. No real DB fixture or business write was used.
- **Sefer Abi/API/frontend parity — PASS:** the exact platform-history question reaches the existing `platform-agreement-reference-fail-closed` response with `NOT_PROVEN`, `liveAverageEnabled=false`, `rawTenantDataExposed=false`, `readOnly=true` and `writeAction=false`. The UI separates `Yakıt fiyatı referansı` (EPDK, `/L`) from the closed `Platform geçmiş anlaşma referansı`; same-ROOM history remains distinct.
- **Visual acceptance — PASS:** local/public same runtime assets matched by SHA-256. Chromium checked all five tabs at `1440x900`, `1024x900`, `390x844` and `320x800`; 22 view results per environment, no horizontal overflow, console/page errors `0`, and no unexpected business writes. Evidence: `docs/evidence/room-finance-platform-reference-ux-acceptance-20261030.json` and `backend/artifacts/room-finance-platform-reference-ux-acceptance-20261030`.
- **Targeted verification — PASS with one unrelated suite finding:** platform reference layers `4/4`, canonical gate `15/15`, Sefer Abi advisory `24/24`, routing regression `1/1`, UI source regression `2/2`, web build PASS. The wider finance routing file remains `24/25` because an existing dynamic E2E assertion expected Vardiya `#311` while the live fixture returned `#316`; it is not attributed to this slice and is not relabeled PASS.
- **Broad security/RBAC — NOT_PROVEN:** existing broad harness failures remain bounded by dirty-worktree/provenance/diff scope. They are not evidence of a product defect, but they are also not claimed as a security PASS. Live platform average/range and competitor information remain closed until approved policy and sufficient real independent ROOM evidence prove every gate together.

## Latest canonical handoff checkpoint (2026-10-30 — COMPANY budget / end-user acceptance)

This additive checkpoint closes only the bounded COMPANY budget presentation correction. No new milestone, finance engine or screen architecture was opened. The worktree remains dirty; no business-write, seed, reset, migration, commit, tag or push was performed. ROOM #207 canonical pricing, ROOM/COMPANY finance acceptance and M18 are preserved.

- **Budget verification — PASS:** the real COMPANY record is plan `4`, `companyId=1`, `budgetAmountMinor=20000000`, which is `200.000 ₺`. API/storage were correct. The defect was the edit field exposing minor units (`20000000`) while labelled TL. The form now displays `200000`, converts back to minor units on submit, and does not alter the financial record. Committed amount is `150.000 ₺`; usable amount is `50.000 ₺`.
- **First view — PASS:** the first view now prioritizes Planlanan bütçe, Sözleşmelerle taahhüt edilen, Kullanılabilir bütçe, Doğrulanmış gerçekleşen harcama and the next action. The current verified realized expense is `null`, so the UI says “Doğrulanmadı”; hakediş `140.000 ₺`, fatura `140.000 ₺` and ödenen `80.000 ₺` remain separate evidence and are not summed.
- **Progressive disclosure / language — PASS:** reconciliation, scenarios, comparisons, calculation details and export remain available behind disclosures. COMPANY copy uses “Yakıt fiyatı referansı” and user language; DEMO stres, dry-run, canonical, Delta and raw internal wording are not visible on the accepted surface. Missing driver/maintenance inputs are not presented as a complete service cost.
- **Real browser evidence — PASS_BOUNDED:** local/public same-build Chromium at 1440/1024/390/320 recorded before `61/61 PASS` and after `117/117 PASS`, with zero console/page errors, zero 5xx/429 responses, zero unexpected business writes and no horizontal overflow. Evidence: `docs/evidence/company-budget-ux-acceptance-20261030.json` and `backend/artifacts/browser-smoke/company-budget-ux-after-20261030`.
- **Role/tenant — PASS:** COMPANY preview and plan are authorized and company-scoped; ROOM cannot read the COMPANY preview; ROOM-private internal cost, margin and quote-floor fields remain hidden.
- **Targeted verification — PASS:** budget/UX unit tests `29/29`, reconciliation check `49/49`, accounting contract check `20/20`, web build PASS, global locked invariant suite PASS with due-now violations/unproven/coverage-gap `0`.
- **Explicit NOT_PROVEN:** global lint and the broad financial/RBAC guard remain blocked by existing dirty-worktree diff/provenance and panel-size guard findings; they are not product or RBAC PASS. Verified realized expense remains closed as `DATA_MISSING` until an actual confirmed expense record exists. No new milestone or refactor was opened.

## Latest canonical handoff checkpoint (2026-10-30 — platform historical reference security acceptance)

This additive checkpoint closes only the remaining bounded SeferPakt-wide historical agreement price reference acceptance. The worktree remains dirty; no reset, clean, restore, commit, tag or push was performed. Existing ROOM #207 canonical pricing, ROOM/COMPANY finance acceptance and M18 are preserved.

- **Source/runtime:** branch `m90d1_web_lint_inventory`, HEAD `3af6c1ac007cacf884ccdbb0bb50858f8eed486f`; local/public same frontend build `assets/index-D1AQyX_v.js`. `personel_api` was restarted once and reloaded once more after the final semantic patch; PostgreSQL, Redis, solver, worker and OSRM were not restarted.
- **Policy gate:** `PASS` for the bounded fail-closed acceptance. The live platform average remains `NOT_PROVEN_CLOSED`: no arbitrary policy activation, no demo/test inclusion, no incomplete comparison dimensions, no insufficient sample/diversity, no privacy/competition/re-ID bypass, and no raw tenant/agreement output.
- **Sefer Abi:** exact platform-wide question now reaches `platform-agreement-reference-fail-closed` on both local and public runtime, with canonical `ASSESS_CURRENT_RISK / BUDGET`, `platformHistoricalReferenceIntent=true`, `NOT_PROVEN`, `liveAverageEnabled=false`, `rawTenantDataExposed=false`, `readOnly=true`, `writeAction=false`; it no longer falls through to the unrelated `4 vardiya kaydı` answer.
- **Verification:** focused backend `64/64 PASS`; global locked invariant suite `PASS` with due-now fail/unproven/coverage-gap `0`; local/public same-build Chromium `101/101 PASS` across 1440/1024/390/320, console/page errors `0`, 5xx/429 `0`, business mutation requests `0`. Evidence: `docs/evidence/smart-price-reference-platform-gate-acceptance-20261030.json`.
- **Broad security harness:** `NOT_PROVEN — HARNESS_GOVERNANCE_OR_RUNTIME_PROVENANCE_SCOPE`, `258 PASS / 3 FAIL`. The three reproducible failures are route diff, service-scope status and backend Prisma-diff guards against the existing broad dirty worktree/provenance boundary; they are not relabeled as product/RBAC PASS and the prior capacity interruption is not treated as a product defect.
- **Remaining condition:** keep live platform averages and competitor information closed until an approved policy plus sufficient real anonymous independent ROOM evidence proves comparability, privacy, re-identification and competition gates together. No new milestone or refactor was opened.

## Latest canonical handoff checkpoint (2026-10-30 — COMPANY selected-record recovery)

This additive checkpoint supersedes the previous same-day handoff for the active M18 COMPANY frontier. The worktree remains dirty; no reset, clean, restore, commit, tag or push was performed.

- **Source identity:** HEAD `3af6c1ac007cacf884ccdbb0bb50858f8eed486f`, branch `m90d1_web_lint_inventory`; local/public frontend asset `assets/index-B_dvKBfO.js`, SHA-256 `675F30C01608BBD211DA971AF66AF737FA73357EB7E44DE7A254F0F4646675D3`.
- **Completed bounded slice:** COMPANY selected-record recovery is `PRODUCT_PASS_BOUNDED`. The live selection now outranks stale discourse for polite follow-ups such as “Peki bunun…”, cleared selection does not resurrect the previous agreement, and explicit cross-tenant agreement requests are denied before selected-record fallback. Evidence: `docs/evidence/m18-company-selected-record-recovery-20261030.json`.
- **Real browser proof:** Local and public COMPANY Chromium both completed #207 status → #195 selection → #195 follow-up. Both denied a foreign-tenant request without exposing data or navigation. Current console error count was `0` in both sessions; no business-write occurred.
- **Next non-finance slice:** COMPANY Operations Panel / Vardiyalar guidance is the next bounded D-Level surface. Local/public natural Turkish status and follow-up questions completed; menu, six operations tabs, contextual “Vardiyalar” guidance, role/tenant boundary and 1440/1024/390/320 overflow checks were verified. Targeted operations checks pass.
- **Verification:** selected-record recovery `6/6 PASS`; canonical conversation + price advisory `24/24 PASS`; company checkpoint 07 and 08 `PASS`; web build `PASS`; global locked invariant suite `PASS` with due-now violations `0`. The mobile action-clarity guard remains a separate `FAIL_HARNESS` because its dirty-worktree status scan hit `git ENOBUFS`; it is not a product result.
- **Preserved open findings:** `cop04bfix02`, `cop04bfix04`, the DRIVER role-overview finding, Smart Price Reference V2.3 `NOT_PROVEN (LIVE_DATA_BLOCKER)`, and platform-wide price average `OPEN_NOT_CLOSED` remain open. M18 remains `OPEN_NOT_CLOSED`.

## Latest canonical handoff checkpoint (2026-10-30)

This additive checkpoint supersedes the older historical handoff below for current execution. The worktree remains dirty; no reset, clean, restore, commit, tag or push was performed.

- **Source identity:** HEAD `3af6c1ac007cacf884ccdbb0bb50858f8eed486f`, branch `m90d1_web_lint_inventory`.
- **V2.3 blocker:** Smart Price Reference V2 remains `PRODUCT_PASS_BOUNDED`; V2.2 isolated calculations remain accepted; V2.3 real positive Chromium remains `NOT_PROVEN (LIVE_DATA_BLOCKER)`. Do not repeat data discovery, create backdated/DONE data, use SQL to force lifecycle state, or weaken business rules. Re-run only after two comparable real service periods are created by the canonical lifecycle. Platform-wide price average remains `OPEN_NOT_CLOSED`.
- **M18 status:** ROOM functional 10/10 remains closed. The current role frontier was COMPANY. The first bounded COMPANY slice is complete: finance guidance now stays within budget/service-cost vocabulary and does not expose ROOM profitability or quote-floor language. Evidence: `docs/evidence/m18-company-finance-guidance-20261030.json`.
- **Real acceptance of the slice:** Local and public COMPANY Chromium used the selected budget/contract read-only context, the same Sefer Abi suggestion, and 1440/1024/390/320 checks. No console error, horizontal overflow, ROOM-private cost/margin field or business write was observed. Focused Sefer Abi regression is `19/19 PASS`; global locked invariant suite and web build pass.
- **Next single frontier:** Continue with COMPANY selected-record recovery and the remaining non-finance D-Level guidance/natural-language/chip/security/mobile acceptance. Do not reopen ROOM, ROOM+COMPANY finance acceptance, or V2.3 data discovery. Existing broad guard failures remain separate technical debt: `cop04bfix02`, `cop04bfix04`, and the all-roles DRIVER overview check.

## Current canonical handoff checkpoint (2026-10-14)

This additive checkpoint is the current variable-progress handoff. The repository remains dirty and no reset, clean, restore, commit, tag or push was performed.

- **Source identity:** HEAD `d85ea52218adcfcbacbdac279526ca0e767c4d0d`, branch `m90d1_web_lint_inventory`.
- **Runtime at sync:** `personel_api` container `7c9d787a4641` is running with the repository bind-mounted at `/app`; `/health` reports `ok=true`, `dbOk=true`, version `0.1.0`, and `http://localhost:5173/` returns HTTP 200 from the canonical Vite process rooted at `D:\servis-platform\web`. Host/container backend source hashes match for the WP-09 anchor/catalog owners. No service restart was performed.
- **M18 ROOM status:** WP-01–10 `PASS_BOUNDED` under their source-owned contracts; WP-11 `OPEN` after local integrated ROOM Chromium acceptance, with public same-build `ENVIRONMENT_BLOCK/NOT_PROVEN` and repository `verify:repo`/`verify:final` blocked by the existing ownership delta; M18-GOV-001 `PROVEN`; global locked-invariant suite `PASS`; ROOM D-Level and M18 `NOT_CLOSED`.
- **Permanent demo-data readiness policy:** Before each milestone/role FULL PRODUCT RUN across all eight roles, verify demo/test database identity, inventory and reuse canonical records/relationships, classify every `NOT_PROVEN`, and create only minimum idempotent fixture data when the root is genuinely `DATA_MISSING` or `DATA_RELATION_MISSING`. Keep isolated/public evidence separate; do not use data to hide product, UI-target, harness, authorization, runtime, environment or governance defects. This does not change `M18_NO_BUSINESS_WRITE` or any security/governance gate. Current M18 finance readiness evidence: `docs/evidence/m18-room-demo-financial-data-readiness-20261017.json`; selected-finance-record product acceptance remains `NOT_PROVEN` and M18 remains `NOT_CLOSED`.
- **WP-08 evidence boundary:** `web/src/utils/copilotFacts.js` is the canonical contextual chip owner and `backend/scripts/ux_copilot_smart_chips_01_check.js` is the permanent regression owner. Real Chromium proved the authorized DRIVER no-assigned-shift/no-selection branches at 1440×900, 390×844 and 320×844. The current runtime has no authorized selected DRIVER record, so live selected-record browser evidence remains `NOT_PROVEN` debt rather than a fabricated pass. Wrong-tenant execution remains `NOT_EXECUTED`; the later aggregate all-chip browser attempt remains `FAIL_HARNESS` and is not product evidence.
- **Preserved WP-08 corrective:** record-specific driver chips require a real positive selected record; no-selection surfaces receive capability-grounded page questions. Existing selected-record static regressions remain in force.
- **WP-09 evidence boundary:** Real Chromium verified representative ROOM menu navigation, Agreements selected-record/list and disclosure continuity, Operation Health tab activation/problem content, Financial Operations disclosures, and guided Agreement-list GÖSTER at 1440×900, 390×844 and 320×844. At 320px the settled target geometry was target `y=34.9..444.9`, drawer `y=460.6..756`, unique canonical highlight, no overlap, and no horizontal overflow; an earlier pre-settlement screenshot was not treated as a product failure. The focused isolated tenant-A/tenant-B acceptance also passed at 1440×900: tenant-B saw its own synthetic agreement; tenant-A received a safe no-authorized-record answer for tenant-B's ID with no foreign target/data leak. Evidence: `docs/evidence/m18-wp09-tenant-isolation-real-browser-20261014.json`.
- **Open governance/evidence ledger:** duplicate-key lint in `backend/src/ai/chat/canonicalSemanticRequest.js`; `verify:repo` ownership delta; historical source-size/harness findings; historical role-boundary mismatch; WP-08 selected-record evidence debt; existing technical demo-marker UI leakage; current-runtime selected-shift leaf evidence `NOT_EXECUTED` because the authorized list is empty; public same-build `NOT_PROVEN`; WP-11 not started. M18-GOV-001 is not reopened. WP-10 evidence: `docs/evidence/m18-wp10-responsive-leaf-actions-20261014.json`; the focused touch regression now covers Sefer Abi drawer, shell menu/logout and mobile navigation-close controls at 390/320.
- **WP-11 evidence:** Local integrated Chromium at 1440×900, 390×844 and 320×844 passed bounded ROOM navigation, Agreement collection/status/detail, Operation Health and Sefer Abi submit/close/reopen checks; Agreement `room:agreements:list` had one visible canonical DOM target, visible highlight and `Gösterilen: 5 / Toplam: 5`; no horizontal overflow. Evidence: `docs/evidence/m18-wp11-room-combined-20261014.json`. Public hostname resolution failed, so `PUBLIC_REQUIRED` remains an environment blocker; `verify:repo`/`verify:final` remain blocked by ownership delta. No product corrective was started.
- **Next single frontier:** Resolve the public same-build environment/provenance gate and repository ownership-delta closure evidence for WP-11; do not start another product package or another role automatically. Read `docs/AGENTS.md` for execution rules and this section for the current handoff; milestone contract/freeze authority remains `docs/MILESTONE_REGISTRY_V1.md`.

## Current frontier (2026-09-24)

<!-- SEFERPAKT_EXECUTING_ACTIVE_FRONTIER_V1
{
  "schemaVersion": "SEFERPAKT_EXECUTING_ACTIVE_FRONTIER_V1",
  "milestone": "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01",
  "phase": "M18_PRODUCT_ACCEPTANCE",
  "frontierStatus": "EXECUTING",
  "activeFrontier": "M18/STEP_04_OF_40",
  "activeRootClass": "CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION",
  "activeRootClassState": "ACTIVE",
  "rootClassHistoryState": "ACTIVE",
  "rootClassHistory": {
    "rootClassId": "CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION",
    "title": "Canonical candidate/domain interpretation under-classifies explicit authorized product intent or selects a role-inapplicable workflow before validation",
    "earliestFailingLayer": "canonical semantic candidate/domain interpretation",
    "canonicalOwner": "backend/src/ai/chat/canonicalSemanticRequest.js",
    "affectedCapabilityOrSurface": "SCHOOL /school/operations explicit Sözleşmeler navigation and ROOM /room vardiya oluşturma guidance",
    "firstObservedEvidence": "SCHOOL_RUNTIME_CANONICAL_DOMAIN_CLASSIFICATION",
    "manifestations": [
      "Authorized School planning/evidence intent was under-classified as clarification despite live School operations context.",
      "Authorized School Sözleşmeler navigation was under-classified as generic clarification while the canonical screen is available.",
      "ROOM vardiya oluşturma intent selected the COMPANY_GUIDED_NEW_PLAN model despite ROOM role context and ROOM product knowledge."
    ],
    "independentAttemptIds": [
      "M18-CSA-CANDIDATE-DOMAIN-ATTEMPT-01",
      "M18-CSA-CANDIDATE-DOMAIN-ATTEMPT-02",
      "M18-CSA-SEMANTIC-SCOPE-ATTEMPT-01",
      "M18-CSA-SEMANTIC-SCOPE-ATTEMPT-02",
      "M18-CSA-SEMANTIC-ACTION-ATTEMPT-01",
      "M18-CSA-SEMANTIC-ACTION-ATTEMPT-02",
      "M18-CSA-SEMANTIC-ACTION-ATTEMPT-03"
    ],
    "withinV3ArchitectureDecision": {
      "decisionId": "M18-ARCH-DECISION-SEFER-ABI-CANDIDATE-FORMATION-HYBRID-V1-2026-09-30",
      "status": "HUMAN_APPROVED_REGISTERED",
      "registeredAtHead": "d85ea52218adcfcbacbdac279526ca0e767c4d0d",
      "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1",
      "contractVersion": "SEFER-ABI-CANONICAL-REQUEST-V3",
      "rootClassId": "CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION",
      "disposition": "NEW_ARCHITECTURE_DECISION_WITHIN_V3_CONTRACT",
      "candidateStrategy": "DETERMINISTIC_FIRST_MODEL_FALLBACK",
      "typedFrame": "PRESERVED",
      "deterministicEvidence": "COMPOSITIONAL",
      "confidencePolicy": "DETERMINISTIC_FIRST; MODEL_FALLBACK_ONLY_ON_UNRESOLVED_OR_LOW_CONFIDENCE; VERSIONED_THRESHOLD",
      "modelProposalSchema": ["actionClass", "objectClass", "modifiers", "evidence", "confidence", "resolutionStatus"],
      "typedOutputAllowlist": "ALLOWLISTED_V3_ACTION_OBJECT_MODIFIER_VALUES_ONLY",
      "modelAuthority": "CANDIDATE_AND_EVIDENCE_PROPOSAL_ONLY",
      "deterministicPostValidation": "REQUIRED_BEFORE_CANONICAL_MAPPING_AUTHORIZATION_GROUNDING_OR_EXECUTION",
      "authorizationOrder": "AFTER_SEMANTIC_INTERPRETATION",
      "securityTenantPrivacyBoundary": "MODEL_NEVER_AUTHORIZES_OR_SELECTS_TENANT_ENTITY_ACCESS_PRIVACY_OR_WRITES",
      "promptInjectionBoundary": "USER_CONTENT_IS_UNTRUSTED_AND_CANNOT_CHANGE_SCHEMA_ALLOWLIST_OR_SYSTEM_CONTRACT",
      "provenancePolicy": "RECORD_PROVIDER_MODEL_VERSION_FINGERPRINT_INPUT_CLASS_AND_PROPOSAL_PROVENANCE",
      "timeoutFailurePolicy": "TIMEOUT_UNAVAILABLE_INVALID_OR_CONFLICTING_PROPOSAL_RESOLVES_SAFE_CLARIFICATION",
      "leastContext": true,
      "noSecondSemanticAuthority": true,
      "failClosed": true,
      "phrasePatchCount": 0,
      "attempt03": "PROVEN_PASS",
      "implementationStatus": "IMPLEMENTED_ACCEPTANCE_PASS",
      "attempt03Evidence": {
        "attemptId": "M18-CSA-SEMANTIC-ACTION-ATTEMPT-03",
        "status": "PROVEN_PASS",
        "rootClassId": "CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION",
        "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1",
        "contractVersion": "SEFER-ABI-CANONICAL-REQUEST-V3",
        "package": "DETERMINISTIC_COMPOSITIONAL_FIRST_AND_RESPONSE_COMPOSITION_ACCEPTANCE",
        "localSourceIdentity": {
          "canonicalSemanticRequestSha256": "7F7B8B65FC89F4241E30C1C0E9BC78C6070882DDFBFFDF363A9494D7FCFBDD0C",
          "serviceSha256": "DFC9174A7D0581E0FB2D90B8890B168F3D9B49DE51F9E95852D218B0003D5F01",
          "frontendServedMainJsSha256": "8EE80094126AB991D4AD147F574DB08F6E3BA5E878B79576A4A9BA762396FE65",
          "publicServedMainJsSha256": "8EE80094126AB991D4AD147F574DB08F6E3BA5E878B79576A4A9BA762396FE65",
          "backendStartup": "2026-09-30T10:01:45.070Z"
        },
        "acceptance": {
          "desktop": "PASS",
          "tablet": "PASS",
          "mobile390x844": "PASS",
          "publicCompany": "PASS",
          "publicRoom": "PASS",
          "roleCapabilitySeparation": "PASS",
          "businessWrites": 0,
          "phrasePatchCount": 0,
          "modelFallbackInvoked": 0,
          "responsiveOverflow": 0,
          "fakeNavigationSuccess": 0
        },
        "runtime": "https://special-isolation-moisture-ultimate.trycloudflare.com",
        "nextGate": "NEW_FROZEN_UNSEEN_HOLDOUT",
        "rootStatus": "ACTIVE_NOT_FROZEN"
      },
      "implementationStaging": {
        "disposition": "WITHIN_V3_IMPLEMENTATION_STAGING_DISPOSITION_REGISTERED",
        "currentStage": "DETERMINISTIC_COMPOSITIONAL_FIRST",
        "modelFallbackStatus": "DEFERRED_NOT_ACTIVE",
        "externalProviderPrerequisiteForAttempt03": false,
        "providerModelRuntimeChanges": 0,
        "safeClarification": "LOW_CONFIDENCE_OR_UNRESOLVED",
        "attempt03Status": "PROVEN_PASS",
        "attempt03Boundary": "RAW_UTTERANCE_PLUS_MINIMAL_AUTHENTICATED_CURRENT_CONTEXT -> COMPOSITIONAL_DETERMINISTIC_EVIDENCE -> TYPED_DETERMINISTIC_CANDIDATE -> CONFIDENCE_RESOLUTION -> V3_SEMANTIC_ACTION -> CAPABILITY_MAPPING -> CONSISTENCY_VALIDATION -> AUTHORIZATION -> GROUNDING -> WORKFLOW_TARGET",
        "redFamilies": ["CREATE_GENERALIZATION", "CREATE_VIEW_NAVIGATE_RESTART_OOS", "CONTINUE_RESUME_RESTART_NEW_INTENT", "COMPARE_ANALYZE_PREPARE", "NEGATION_AMBIGUITY_UNRESOLVED_OOS", "ROLE_AUTH_TENANT_NEGATIVES", "NO_SECOND_AUTHORITY", "NO_DOWNSTREAM_REPAIR", "NO_WRITE"],
        "acceptanceChain": "RED -> COMPOSITIONAL_DETERMINISTIC_IMPLEMENTATION -> CONFIDENCE_RESOLUTION -> FOCUSED_SEMANTIC_AND_CONSISTENCY -> PRODUCTION_PARITY -> REAL_BROWSER -> RESPONSIVE -> SAME_BUILD_PUBLIC -> ROLE_POLICY_NEGATIVES -> NO_WRITE",
        "futureModelActivationGate": "COMPOSITIONAL_IMPLEMENTATION -> FOCUSED_ACCEPTANCE -> REAL_BROWSER_PUBLIC_PROOF -> FRESH_FROZEN_UNSEEN_HOLDOUT",
        "futureProviderGovernance": "SEPARATE_EXPLICIT_PACKAGE_FOR_PROVIDER_OWNER_CONFIG_TYPED_ALLOWLIST_TIMEOUT_FAILURE_PROVENANCE_PRIVACY_TENANT_ROLE_ENTITY_REVIEW_POST_VALIDATION_AND_MODEL_REGRESSION",
        "freshHoldout": "LATER_SEPARATE_NEW_FROZEN_MANIFEST"
      },
      "nextPackage": "RED -> compositional deterministic evidence -> confidence/resolution boundary -> bounded model fallback -> strict typed validation -> deterministic capability/consistency/authorization/grounding -> focused/service/browser/public/no-write proof",
      "futureHoldout": "new frozen manifest; development and holdout corpora separate; model/version fingerprint recorded"
    },
    "status": "ACTIVE",
    "currentFrontierRelation": "M18/STEP_04_OF_40",
    "boundedAttemptEvidence": {
      "status": "PROVEN_PASS",
      "rootAttemptCount": "UNKNOWN",
      "attemptId": "M18-CSA-SEMANTIC-SCOPE-ATTEMPT-02",
      "rootClassId": "CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION",
      "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-SCOPE-V1",
      "architectureDecisionId": "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-SCOPE-V1-2026-09-29",
      "proof": "New-epoch bounded package 02 completed RED -> minimal canonical navigation-cue fix -> focused PASS -> same-source public acceptance. The authorized SCHOOL movement class, ROOM role-aware shift guidance, COMPANY create-shift negative, and ambiguous-navigation negative all passed; the root remains ACTIVE and is not frozen.",
      "redEvidence": {
        "classification": "PRODUCT_REGRESSION",
        "earliestFailingLayer": "canonical semantic scope classification",
        "reference": "SCHOOL_EXPLICIT_SURFACE_MOVEMENT_RECURRENCE",
        "check": "backend/scripts/canonical_conversation_core_01_check.js",
        "failure": "authorized SCHOOL movement wording with the known Sözleşmeler surface fell to PRODUCT_AMBIGUOUS / CLARIFY_SEMANTIC_REQUEST because the canonical navigation cue did not recognize generalized movement verbs such as geç"
      },
      "fixEvidence": {
        "owner": "backend/src/ai/chat/canonicalSemanticRequest.js + backend/scripts/canonical_conversation_core_01_check.js",
        "contract": "Known authorized product surfaces now share a generalized explicit movement-verb behavior class; unique surface evidence is still required, vague navigation remains non-explicit, and downstream authorization/grounding boundaries are unchanged",
        "focusedResult": "PASS"
      },
      "publicAcceptanceEvidence": {
        "runtime": "same-source public tunnel after personel_api restart",
        "sourceHash": "backend/src/ai/chat/canonicalSemanticRequest.js = 5cc38fbb854abbedb911da26f35cd4a18e638498d4a5b7f54eb80e9badebadd8",
        "genuineOffTopicCanary": "PASS",
        "ambiguousProductCanary": "PASS",
        "deicticCurrentSurfaceCanary": "PASS",
        "schoolExactNavigation": "PASS",
        "schoolUnseenNavigationParaphrases": ["Sözleşmelere geç = PASS", "Sözleşme sayfasına ilerle = PASS"],
        "roomRoleAwareGuidance": ["vardiya oluşturmak istiyorum = PASS", "Vardiyalar ekranına geç = PASS"],
        "companyCreateShiftNegative": "PASS",
        "businessWrites": 0
      },
      "currentStatus": "NEW_EPOCH_ATTEMPT_02_FOCUSED_AND_PUBLIC_PASS_ROOT_ACTIVE",
      "evidencePaths": [
        "backend/src/ai/chat/canonicalSemanticRequest.js",
        "backend/src/ai/chat/conversationRouting.js",
        "backend/src/ai/chat/authorizationGate.js",
        "backend/src/ai/service.js",
        "backend/src/ai/chat/canonicalConversationTrace.js",
        "backend/scripts/canonical_conversation_core_01_check.js",
        "SEMANTIC_SCOPE_BOUNDARY_RECURRENCE",
        "same-source public tunnel /company",
        "POST /api/ai/copilot only; businessWrites=0"
      ]
    },
    "latestCompletedAttemptEvidence": {
      "attemptId": "M18-CSA-SEMANTIC-ACTION-ATTEMPT-02",
      "status": "PROVEN_PASS",
      "rootClassId": "CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION",
      "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1",
      "architectureDecisionId": "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-ACTION-V1-2026-09-29",
      "package": "V3_CONTINUATION_ROOT_CORRECTIVE",
      "redEvidence": {
        "activeTaskContinuation": "Kaldığımız yerden ilerleyelim previously resolved to UNRESOLVED / CLARIFY",
        "equivalentContinuation": "Buradan sürdürelim, sıradaki adıma geçelim",
        "restartContrast": "Akışı sıfırdan başlatalım remained distinct from CONTINUE",
        "newIntentContrast": "Sözleşmeler ekranına geçelim must leave the active guided task"
      },
      "fixEvidence": {
        "owner": "backend/src/ai/chat/canonicalSemanticRequest.js",
        "supportingOwners": [
          "backend/src/ai/chat/canonicalConversationTrace.js",
          "backend/scripts/canonical_conversation_core_01_check.js"
        ],
        "contract": "Natural continuation evidence now resolves CONTINUE from active-task context without phrase-specific routing; restart/start-over remains typed and distinct, and explicit new intent wins",
        "focusedResult": "PASS"
      },
      "productionPath": {
        "continue": "CONTINUE_EXPLANATION / CONTINUE_CURRENT_REASONING / CREATE_SHIFT",
        "restart": "RESTART remains distinct from CONTINUE and maps to the approved start-over path",
        "newIntent": "Explicit Sözleşmeler navigation supersedes the previous guided target",
        "ambiguityAndOos": "Active task alone does not steal genuine ambiguity, cost, or off-topic intent",
        "businessWrites": 0
      },
      "realBrowser": {
        "localCompany": [
          "active COMPANY continuation preserved the guided task and Rehberi Başlat target",
          "Baştan başlayalım and Akışı sıfırdan başlatalım remained distinct restart behavior",
          "Sözleşmeler ekranına geçelim replaced the previous target without fake navigation",
          "no generic clarification or business action for valid continuation"
        ],
        "publicCompany": [
          "Vardiya oluşturmak istiyorum established the active COMPANY guided context",
          "Kaldığımız yerden ilerleyelim returned CREATE_SHIFT continuation guidance with Rehberi Başlat target",
          "Akışı sıfırdan başlatalım returned distinct start-over guidance",
          "Sözleşmeler ekranına geçelim changed the visible target to Sözleşmeler"
        ]
      },
      "publicAcceptance": {
        "runtime": "https://room-queen-shares-wing.trycloudflare.com",
        "frontendSourceIdentity": "public /src/main.jsx SHA256 B11E2B2A744681EF5986C3F75FDFD9ABB26671BABC019520565A096856D1F538; local Vite dev source matches",
        "backendHealth": "version 0.1.0, dbOk=true, startup identity 2026-09-30T05:58:09.798Z; identical to local personel_api",
        "companySession": "company@demo.com / Hizmet Alan Firma; normal public login",
        "continue": "PASS: active COMPANY task continued with CREATE_SHIFT / CONTINUE_EXPLANATION",
        "restart": "PASS: start-over remained distinct from CONTINUE",
        "newIntent": "PASS: Sözleşmeler navigation replaced the prior Rehberi Başlat target",
        "businessWrites": 0
      },
      "evidencePaths": [
        "backend/src/ai/chat/canonicalSemanticRequest.js",
        "backend/src/ai/chat/canonicalConversationTrace.js",
        "backend/scripts/canonical_conversation_core_01_check.js",
        "same-source local browser /company",
        "same-source public tunnel /company",
        "POST /api/ai/copilot only; businessWrites=0"
      ],
      "currentStatus": "V3_CONTINUATION_ROOT_CORRECTIVE_ATTEMPT_02_FOCUSED_REAL_PUBLIC_PASS_ROOT_ACTIVE"
    },
    "reopenEvidence": "Semantic-action Attempt 02 corrected natural continuation evidence at the canonical semantic boundary; same-source local and public COMPANY acceptance passed for continuation, restart, and explicit new intent. Root remains ACTIVE pending broader holdout and fresh-sweep governance.",
    "totalLifetimeAttempts": null,
    "currentArchitectureEpochAttempts": null,
    "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1",
    "architectureDecisionId": "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-ACTION-V1-2026-09-29",
    "architectureEpochTransition": {
      "fromArchitectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-SCOPE-V1",
      "toArchitectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1",
      "architectureDecisionId": "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-ACTION-V1-2026-09-29",
      "recordedAtHead": "d85ea52218adcfcbacbdac279526ca0e767c4d0d",
      "materialBoundaryChange": {
        "canonicalRequestSchema": true,
        "canonicalTaskActionRepresentation": true,
        "semanticActionCandidateInterface": true,
        "semanticScopeActionSiblingContract": true,
        "operationWorkflowConsistencyValidation": true,
        "typedConsumerContract": true
      },
      "historicalAttemptsPreserved": [
        {
          "attemptId": "M18-CSA-SEMANTIC-SCOPE-ATTEMPT-01",
          "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-SCOPE-V1",
          "architectureDecisionId": "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-SCOPE-V1-2026-09-29"
        },
        {
          "attemptId": "M18-CSA-SEMANTIC-SCOPE-ATTEMPT-02",
          "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-SCOPE-V1",
          "architectureDecisionId": "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-SCOPE-V1-2026-09-29"
        }
      ],
      "semanticScopeAttempt03": "NOT_CREATED",
      "architecturalReviewDisposition": "HUMAN_APPROVED_MATERIAL_BOUNDARY_CHANGE"
    },
    "priorArchitectureEpochTransition": {
      "fromArchitectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-CORE-V1",
      "toArchitectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-SCOPE-V1",
      "architectureDecisionId": "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-SCOPE-V1-2026-09-29",
      "recordedAtHead": "d85ea52218adcfcbacbdac279526ca0e767c4d0d",
      "historicalAttemptsPreserved": [
        "M18-CSA-CANDIDATE-DOMAIN-ATTEMPT-01",
        "M18-CSA-CANDIDATE-DOMAIN-ATTEMPT-02"
      ],
      "attempt03UnderPriorEpoch": "NOT_CREATED"
    }
  },
  "historicalRootClassRecords": [
    {
      "rootClassId": "CANONICAL_SEMANTIC_AUTHORITY_POST_CANONICAL_MUTATION",
      "status": "SUPERSEDED_BY_NEW_ROOT_CLASS",
      "totalLifetimeAttempts": null,
      "currentArchitectureEpochAttempts": null,
      "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-CORE-V1",
      "architectureDecisionId": "M18-SEFER-ABI-CANONICAL-CONVERSATION-CORE-DESIGN-2026-09-28",
      "independentAttemptIds": [
        "M18-CSA-POSTCANONICAL-ATTEMPT-01"
      ],
      "evidence": "The post-canonical cost-routing corrective remains immutable historical evidence. Its valid canonical School evidence request passed focused and same-source public acceptance; the current stopped findings fail earlier at canonical interpretation.",
      "boundedAttemptEvidence": {
        "attemptId": "M18-CSA-POSTCANONICAL-ATTEMPT-01",
        "status": "PROVEN_PASS",
        "earliestFailingLayer": "post-canonical service routing",
        "reference": "SCHOOL_PUBLIC_POST_CANONICAL_COST_TAKEOVER",
        "owner": "backend/src/ai/service.js",
        "businessWrites": 0
      }
    }
  ],
  "blocker": "AI_HOLDOUT_REQUIRED_WHERE_APPLICABLE",
  "nextIfGreen": "M18/STEP_05_OF_40",
  "productState": "ACTIVE_M18_PRODUCT_ACCEPTANCE",
  "evidenceHarnessState": "EXISTING_M18_EVIDENCE_REFERENCED",
  "repositoryClosureState": "PRE_COMMIT_CLOSURE_NOT_STARTED",
  "owner": "docs/NEXT_BACKLOG_V1.md",
  "evidencePaths": [
    "docs/PRIMER_SSOT.md",
    "docs/MILESTONE_REGISTRY_V1.md",
    "docs/NEXT_BACKLOG_V1.md",
    "backend/src/ai/chat/canonicalSemanticRequest.js",
    "backend/src/ai/chat/semanticIntentPlanner.js"
  ],
  "updatedAt": "2026-09-29T12:54:54.744Z"
}
-->

### Observed backlog (M18 Step 4 runtime holdout)

- `SCHOOL_RUNTIME_CANONICAL_DOMAIN_CLASSIFICATION`: the browser-originated School canary for “Bu servis planında neye bakmalıyım?” reached `SEFER-ABI-CANONICAL-REQUEST-V1` with an `ORGANIZATION_PLAN` candidate and incorrectly resolved to `UNCLEAR_OR_AMBIGUOUS` / `SAFE_CLARIFICATION` instead of the retained School reasoning contract. Earliest owner: `backend/src/ai/chat/canonicalSemanticRequest.js`; classification: `PRODUCT_REGRESSION / CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION`; one bounded corrective attempt is proven and recorded as `M18-CSA-CANDIDATE-DOMAIN-ATTEMPT-01`. The later recurrence was reviewed under the same root; the human-approved semantic-scope boundary now opens `M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-SCOPE-V1` while preserving the two prior attempts under `M18-ARCH-EPOCH-SEFER-ABI-CORE-V1`.
- `SCHOOL_PUBLIC_POST_CANONICAL_COST_TAKEOVER`: an equivalent School evidence holdout was canonically resolved to `CHECK_EVIDENCE_SUFFICIENCY / OPERATIONS / EVIDENCE_SUFFICIENCY`, then replaced by cost reasoning in `backend/src/ai/service.js`. Classification: `PRODUCT_REGRESSION / SAME_ROOT` for `CANONICAL_SEMANTIC_AUTHORITY_POST_CANONICAL_MUTATION`; no new root ID is introduced. The earlier candidate/domain item remains historical after its focused corrective.
- `SCHOOL_EXPLICIT_AGREEMENTS_NAVIGATION`: Attempt 02 public acceptance passed in the authorized `/school/operations` context: “Sözleşmeler ekranını aç” and an unseen navigation paraphrase resolve to the authorized Sözleşmeler surface, not generic clarification. This remains a manifestation of `CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION` and is covered by `M18-CSA-CANDIDATE-DOMAIN-ATTEMPT-02`.
- `ROOM_COMPANY_WORKFLOW_LEAK`: Attempt 02 public acceptance passed after policy reconciliation. ROOM does not create a new shift/demand record; its create request returns truthful existing-shift operational guidance and never selects `COMPANY_GUIDED_NEW_PLAN`. The generic create endpoint is COMPANY/SUPER_ADMIN only while ROOM’s existing-shift operational route scope remains available. The ROOM catalog no longer exposes an unsupported “Yeni oluştur” capability. This remains the same candidate/domain root manifestation and is covered by `M18-CSA-CANDIDATE-DOMAIN-ATTEMPT-02`.
- `SEMANTIC_SCOPE_BOUNDARY_RECURRENCE`: a fresh clean COMPANY session initially classified “Pizza mı makarna mı?” as `CLARIFY_SEMANTIC_REQUEST / PRODUCT / CLARIFY` instead of `GENUINE_OFF_TOPIC_SAFE / OFF_TOPIC_SAFE`. The earliest owner was `backend/src/ai/chat/canonicalSemanticRequest.js`; the new-epoch bounded package is recorded as `M18-CSA-SEMANTIC-SCOPE-ATTEMPT-01` with focused and same-source public probes passing. No old-epoch Attempt 03 was created; the broader holdout remains pending.
- `SEMANTIC_SCOPE_ATTEMPT_01_SCHOOL_UNSEEN_NAVIGATION_FAILURE`: closed by `M18-CSA-SEMANTIC-SCOPE-ATTEMPT-02`. The shared canonical movement cue now resolves authorized School movement paraphrases to the Sözleşmeler surface; vague navigation remains clarification, and same-source public School/Room/Company checks passed with zero business writes.

### PRE-#18 immutable closure

PRE-#18 combined acceptance, No-Surprise Repository Exit, final terminology / Sefer Abi closure, and the bounded public-runtime recheck are GREEN. `#18` has not started. The next project action is a new chat loading the post-PRE-#18 master primer after the immutable closure SHA/tag is established; proven-closed work is not reopened without concrete newer regression evidence.

The current engineering entrypoint is [docs/INDEX.md](INDEX.md). PRE-#18 foundation acceptance, role/product acceptance and documentation/SSOT reconciliation are green at the current HEAD; `verify:repo` and `verify:final` pass, KVKK is `262/262`, role/data isolation is `216/216`, and active/product unowned is `0`. `PREMIUM_UI` is `72_OF_72_PROVEN`; Foundation Exit is `GREEN PRESERVED`, ROOM/OTHER423 is `PROVEN_CLOSED`, and the No-Surprise Repository Exit classification is green. PRE-#18 is `FINAL CLOSURE READY`; #18 and commit/tag/push have not started. The planning notes below are retained as historical compatibility material and do not replace the current frontier.

### M18 final acceptance / pre-commit closure preparation (2026-09-26)

M18 is the current bounded screen-grounded guidance milestone at HEAD `5501de58f86a52f0c518005c0e79ace580dbcb3a`. Its accepted frontier is 8 roles, `109/109` current menu/route targets, local and same-build public representative guidance, mobile/desktop guided UX and the safe boundary `ANLAT → GÖSTER → BİRLİKTE YAP`; no business write or #19 work is implied. The next product owners remain #19 natural-language preparation, #20 dispatch/optimizer, #21 controlled safe action/approval, #22–#29 voice, #30–#33 proactive/agentic extensions and #39 exhaustive integrated E2E. Exact commit/tag/push remains a later closure step.

Tarih: 2026-04-19
Timezone: Europe/Istanbul

Current direction: **servis-platform m90d1_web_lint_inventory -> M0->M89 green -> M90C.6 / M90C.7 / M90C.8 / M90C.9 closure görünürlüğü -> M91 / M92 repo-native verification spine -> ihtiyaç-temelli kontrollü ilerleme**

Single-roof verification update: `M91` route preview local acceptance bandı ve `M92` repo verification spine eklendi. Günlük resmi kontrol girişi `npm run verify:repo`.

## 0.1) 2026-05-08 Product Backlog Update
- DOCS-STATE-01 sonrası resmi sonraki ürün sırası `VERIFY-CHAIN-01` olarak görünür kalır.
- `MOBILE-TEXT-01` green/closed; personel, veli ve biniş değişikliği kartlarındaki eski hazırlık dili sade Türkçeye çekildi.
- P0:
  - `VERIFY-CHAIN-01`
  - `M95-EXPORT-01`
- P1:
  - `UX-TEXT-02`
  - `E2E-SMOKE-01`
  - `UX-QA-01`
- P2:
  - `WEB-01C`
  - `M44-T1/T5`
  - `BRAND-FINAL-01`
  - `CLEANUP-01`
  - `FIELD-LAUNCH-PACK-01`
  - `PERF-REGRESSION-01`
- `VERIFY-CHAIN-01` ürün uzantısı zinciri `check:product-extensions` ile `verify:final` içine bağlanır.
- `M95-EXPORT-01` export zip / runtime check uyumu, shareable export paketinde runtime JSON yokluğunu INFO/SKIP kabul edecek şekilde korunur.
- `COP-02B` green/closed; bağlamlı öneri ve takip sorusu zinciri canonical product extensions altında görünür.
- `COP-03A` green/closed; Copilot ekran bilgi omurgası ve registry/catalog parity tamamlandı.
- Bu sıra docs/state görünürlüğü içindir; yeni ürün davranışı açmaz.

## 0) 2026-04-19 Gece Kontrol Notu
- `verify:repo` PASS, `verify:ci` PASS, `verify:final` PASS.
- Repo check chain sonucu: `PASS 20 / FAIL 0`; selected static milestone set: `PASS 88 / FAIL 0 / SKIP 74`.
- `M91` route preview / source shift hattı ve `M92` repo verification spine doğrulanmıştır.
- docs/tools reorganizasyonu `Tur 1`, `Tur 2`, `Tur 3` kapanmıştır.
- CI fresh runner hazırlığı workflow içinde explicit: `npm --prefix backend ci` ve `npm --prefix web ci`.
- Bu backlog içinde `M90` closure referansları compatibility / görünür kapanış hattı olarak korunur.
- Gerçek çalışma yönü: büyük reorganizasyon değil, ihtiyaç-temelli kontrollü ilerleme.
- Kalan son çizgi sırası: runtime JSON soft-gate'leri -> queue dayanıklılığı -> sıcak dosya borcu (en son).

## 1) Resmi Durum
- Güncel doğrulanmış baz: `MASTER PACK PASS OK (M0->M89)`.
- Tarihsel tam master referansı korunur: `MASTER PACK PASS OK (M0->M79)`.
- Repo audit: `REPO AUDIT MASTER PASS`.
- `tools/STABLE_TO.txt = 78` M78.x compatibility marker olarak korunur.
- Parent Access akışı legacy invite değildir; öğrenci + süre + erişim linki + erişim kodu + PIN mantığıyla çalışır.
- OSRM kodu repoda vardır ama default compose modu fallback davranır.
- M58, M77, M78, M79, M80-M89 ve M90 hattı yaşayan compatibility görünürlüğü içinde korunur; bu yeni ürün modülü açma çağrısı değildir.
- Üst ticari kapanış marker'ları explicit korunur: `M83`, `M84`, `M85`, `M86`, `M87`, `M88`, `M89`.

## 2) Hemen Sonraki Ana Faz
1. `M90` — kapanmış closure / verification marker'larını green görünürlükte tutarak ihtiyaç-temelli kontrollü ilerlemeyi koru.
2. `M90A` — canonical markdown hizasını yalnız gerçek ihtiyaç çıktığında düzelt.
3. `M90B` — `repo_contract_state` + pack/verify convergence çizgisini state-first tut.
4. `M90C` — screenshot bağımlılığını azaltan proof reformunu ürün davranışı açmadan sürdür.
5. `M90D` — `SCRIPT_KILAVUZU_MILESTONE_HARITASI` tek dosya standardını bozma.
6. `M90E` — repo hijyen kapanışını shareable export disipliniyle koru.

## 2.0) Closure Gate Visibility
- `M90B.1` executable closure gate kanonik kapanış hattının immediate gate'i olarak korunur.
- `M90C.3` kapanmıştır; M90B.1 görünürlüğü backlog içinde devam eder.
- `M90C.5` schema için resmi karar kapısıdır.
- `M90C.6` hot-file queue policy, `M90C.7` export/package hygiene closure ve `M90C.8` CI / verification visibility kapanmıştır.
- `M90C.9`, `M91` ve `M92` green / compatibility görünürlüğü olarak korunur; resmi çalışma yönü `M90` rotası içinde kontrollü ilerlemedir.

## 2.1) helpComposer Exception Policy
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasıdır.
- Bu dosyada line-count reduction hedefi yoktur.
- Agresif küçültme/refactor yapılmayacaktır.
- Sadece acceptance-safe lokal düzeltme yapılabilir.
- M90C.1, M90C.2 ve M90C.3 kapanmıştır; helpComposer policy canonical docs içine işlenmiştir.

## 2.2) PRISMA_SCHEMA_MODULARIZATION_01
- `backend/prisma/schema.prisma` tek canonical Prisma entrypoint'tir; domain declarations `backend/prisma/schema/` native Prisma modüllerindedir.
- #11, eski M90 tek-dosya hot-file kararını supersede eder; bu kontrollü architectural refactor'tur, ürün davranışı ve DB semantiği değişmez.
- Kanonik owner/check zinciri: `npm --prefix backend run prisma:modularization:acceptance`, `npm --prefix backend run prisma:modularization:check` ve `npm --prefix backend run prisma:verify`.
- Yeni model/enum/relation değişiklikleri #11 parity, #10 generation ve migration-impact doğrulamasından geçmeden kabul edilmez.

## 2.3) DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01
- #12, PostgreSQL custom-format backup, checksum, retention inventory ve izole gerçek restore rehearsal için tek canonical owner'dır.
- Owner: `backend/src/ops/databaseBackupService.js`; CLI: `backend/scripts/database_backup_retention_and_integrity_01.mjs`; acceptance: `backend/scripts/database_backup_retention_and_integrity_01_acceptance.mjs`; checker: `backend/scripts/database_backup_retention_and_integrity_01_check.js`.
- `ACCOUNTING_BACKUP_INTEGRITY_V1` metadata, source/schema identity, idempotency, retention, restore compatibility ve audit reference taşır; parola ve payload loglanmaz.
- Restore yalnız `isolated=true` ve ayrı hedef ile çalışır; canonical DB overwrite, reset/reseed, migration ve accounting/payment write yoktur.
- M45 script/tool adları compatibility delegate olarak korunur; yeni backup engine veya ikinci scheduler açılmaz.

## 2.4) M90C.6 — Hot-File Queue Policy
- Hot/large file listesi artık sadece rapor değildir; resmi sınıflı queue olarak takip edilir.
- Kör refactor yapılmaz; önce acceptance, sonra kontrollü temizlik uygulanır.
- `helpComposer.js` **justified exception** olarak korunur; `schema.prisma` #11 canonical entrypoint'tir, domain hot-file borcu modüllerle ve ownership checker ile yönetilir.
- `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/company.js`, `web/src/panels/shared/CopilotPanel.jsx` ve `mobile/App.js` **acceptance-sensitive / later** sınıfındadır.
- `web/src/panels/company/ShiftPeopleTab.jsx` **safe candidate review** kuyruğundadır.
- `web/src/panels/company/AgreementWizard.jsx` kontrollü extraction ile 1000 satır altına indi; artık hot-file kuyruğunda değildir.
- `web/src/panels/company/ShiftsPanel.jsx` kontrollü extraction ile 1000 satır altına indi; artık hot-file kuyruğunda değildir.
- `web/src/panels/company/AgreementsPanel.jsx` kontrollü extraction ile 1000 satır altına indi; artık hot-file kuyruğunda değildir.
- `web/src/panels/room/ShiftsPanel.jsx` kontrollü extraction ile 1000 satır altına indi; artık hot-file kuyruğunda değildir.
- Kanonik komut: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`.

## 2.5) M90C.7 — Export / Package Hygiene Closure
- Shareable repo paketi çalışma alanı artığı taşımayacaktır.
- `.env`, `web/dist`, `mobile/dist`, `backend/data/*.json`, overlay readme/log kalıntıları ve mevcut zip arşivleri export dışında kalır.
- Satır azaltma en sona bırakılır; bu adım davranış refactor'u değildir.
- Kanonik komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`.
- Shareable zip komutu: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`.

## 2.6) M90C.8 — CI / Verification Visibility
- Yerelde çalışan verify hattı repo-native görünür hale getirilmiştir.
- Kök komut: `npm run verify:ci`.
- Fresh runner kurulum kapısı: `npm --prefix backend ci` ve `npm --prefix web ci`.
- Kök zincir backend + web lint çalıştırır; web lint kanonik kanıt dosyası: `artifacts/lint/web_lint_latest.txt`.
- Workflow: `.github/workflows/vardis_verification_visibility.yml`.
- `repo-verification` işi root verify chain'i, `shareable-export` işi M90C.7 export hygiene pack'i çalıştırır.
- Artifact görünürlüğü: `artifacts/repo-audit/repo_audit_latest.json`, `artifacts/lint/web_lint_latest.txt` ve `artifacts/shareable-export/servis-platform_shareable_*.zip`.
- Satır azaltma en sona bırakılır; bu adım görünür doğrulama içindir.

## 2.7) M90C.9 — Güvenli Kapanış / Final Hygiene Checklist
- Kanonik final giriş komutu: `npm run verify:final`.
- `verify:final`, önce `verify:repo` zincirini çalıştırır; sonra `verify:snapshot` soft gate raporunu yeniler.
- Final giriş bu yüzden hem `artifacts/lint/web_lint_latest.txt` hem `artifacts/repo-audit/physical_snapshot_hygiene_latest.json` üretir/günceller.
- Windows tarafında export/hijyen kapanışı için tercih edilen kabuk `pwsh` olacaktır.
- Final closure sırası: `verify:final` -> `type artifacts\lint\web_lint_latest.txt` -> `pack_m90_c7_export_package_hygiene` -> `export_shareable_repo_bundle` -> `git status --short`.
- `tools/export_shareable_repo_bundle.ps1` PS5 uyumsuz API çağrılarını geri getirmeyecek; `tar.exe` / `.NET ZipFile` fallback korunacaktır.
- Satır azaltma hâlâ en sona bırakılır; bu adım release/shareable/export/verify kapanış emniyetidir.

## 3) Bu Turun Çalışma Kuralı
- Ürün davranışını bozma.
- Yeni özellik açma.
- Önce `npm run verify:repo` ile green baz korunur.
- Gerekirse `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform` ile closure gate doğrulanır.
- Önce canonical docs/state hizasını düzelt.
- Script/check sistemini yeni canonical duruma göre güncelle.
- Screenshot metin bağımlılığını azalt.
- Master rerun ve repo audit sona yakın çalıştır.
- Agreement artık direct açılmaz; doğru akış önce shift/vardiya, sonra `Sözleşmeye Dönüştür`.
- `sourceShiftId` zorunlu mantık korunur.

## 4) Kanonik Komutlar
- `npm run verify:repo`
- `npm run verify:ci`
- `npm run verify:final`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m91_shift_agreement_route_preview.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m92_repo_verification_spine.ps1 -RepoRoot D:\servis-platform`

## 5) Açık Hizalama Notu
- `docs/overlays/M80`, `M81`, `M82` klasörleri güncel milestone anlamı değildir.
- Tek aktif script rehberi: `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`.
- Eski V1/V2/V3 script guide dosyaları tarihsel yönlendirme notudur.
- M90, yeni ürün modülü değildir; repo gerçeğinin tekleştirilmesi işidir.

## 6) İlk Cümle
Güncel baz: `servis-platform` branch `m90d1_web_lint_inventory`, master pack `M0->M89` green. `M90C.1`, `M90C.2`, `M90C.3`, `M90C.4`, `M90C.5`, `M90C.6`, `M90C.7`, `M90C.8`, `M90C.9`, `M91`, `M92` ve docs/tools Tur 1-2-3 kapanmıştır; sonraki resmi yön büyük reorganizasyon değil, ihtiyaç-temelli kontrollü ilerlemedir.

## Repo Contract State
- Makine-okur durum özeti: `tools/repo_contract_state.json`.
- State-first docs-contract kuralı: önce `repo_contract_state.json`, sonra markdown anlatımı okunur.

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

## M90C.6 Historical Closure Chain
- M90C.1-M90C.5 closed before M90C.6 hot-file queue policy.
- M90C.7 export/package hygiene, M90C.8 CI/verification visibility, and M90C.9 safe closure/final hygiene follow after M90C.6.

## M90C.6 Exact Closure Chain Markers
- M90C.1-M90C.5 closure before M90C.6
- M90C.7 export/package hygiene after M90C.6
- M90C.8 CI/verification visibility after M90C.6
- M90C.9 safe closure/final hygiene after M90C.6

M90C.1 / M90C.2 / M90C.3 / M90C.4 / M90C.5 kapandi

## ROOM_FINANCE_DEMO_FINANCIAL_DATA_COMPLETION_BOUNDED — 2026-10-30
- Durum: Bounded ROOM Finans + Sefer Abi kabulü; yeni milestone, finans motoru, sekme veya mimari refactor açılmadı.
- Kanonik DEMO bağlamı: ROOM #21, araç #8, sürücü #5, sözleşme #209, tamamlanmış canonical vardiya #367; rota 8,276 m; kayıtlar `SEFERPAKT_ROOM_FINANCE_DEMO_DATA_V1` işaretiyle izlenebilir.
- Gerçek gider kanıtı: 28 `ACTUAL + CONFIRMED` TRY kaydı, tüm ilgili araç/sürücü/rota kalemleri dahil; brüt toplam `1.049.000 minor = 10.490,00 TL`; canonical dağıtım `READY`; son idempotent tamamlama çalışmasında yeni yazım `0`.
- Ticari kanıt: kabul edilmiş sözleşme fiyatı `10.000.000 minor = 100.000,00 TL`; pazarlık kanıtı `PARTIAL`; gelir/hakediş/fatura/tahsilat ve KDV ayrıştırılmış net sonuç `NOT_PROVEN`, sahte kayıt oluşturulmadı.
- Platform referansı pozitif DEMO: 6 bağımsız ROOM, karşılaştırılabilir ve canonical kabul audit zincirli kayıt; ortalama `11.250.000 minor = 112.500,00 TL`, aralık `10.000.000–12.500.000 minor = 100.000–125.000 TL`; yalnız kontrollü DEMO etiketiyle yayımlandı.
- Platform referansı negatif canlı kapsam: onaylı politika/uygun bağımsız örneklem yoksa `NOT_PROVEN`, tutar/aralık yok; 110.000 TL yayımlanmadı; EPDK yakıt referansı ayrı kaldı; çapraz ROOM/COMPANY ham kayıt erişimi reddedildi.
- Sefer Abi düzeltmesi: aynı seçili vardiyanın server-owned dağıtılmış gerçekleşen maliyeti finans API’si ve yanıt içinde `10.490,00 TL`; eski `3.020,00 TL` planlama tabanı sızıntısı giderildi; sözleşme fiyatı, platform DEMO ortalaması ve maliyet ayrı gösteriliyor.
- Görsel/işlevsel kanıt: local/public aynı build Chromium; 1440, 1024, 390, 320 px; beş sekme, uzun mobil kaydırma, açılır ayrıntılar, Sefer Abi drawer, overflow ve console/page hatası kabulü PASS. JS SHA `5098225f69b985ecc18441e40f99141f89f54b36ac8edd41d438310f7696b5d2`; CSS SHA `799232502eea4c582b74319ade4d7ace79145cf114f259d962d1a78c6ec601d4`.
- Hedefli regresyonlar: ROOM finans sekmeleri, operasyonel maliyet modeli guard cases `489/489 PASS`, Türkçe terminoloji, Sefer Abi maliyet/finans unit testleri ve pozitif/negatif gerçek Chromium kabulü PASS. Operasyonel maliyet ve ROOM quote-floor checker'ları guard/provenance sınırı nedeniyle suite olarak `NOT_PROVEN`; Sefer Abi legacy checker'ı eski “10 intent” sayım beklentisinde `NOT_PROVEN`. Geniş RBAC/security harness başarısızlıkları da mevcut dirty worktree/provenance kapsam sınırı olarak tutuldu; bu bounded akışta yeni güvenlik ihlali bulunmadı.
- Kanıt dosyaları: `backend/artifacts/room-finance-demo-data-completion-20261030.json`, `backend/artifacts/room-finance-platform-reference-product-acceptance-20261030/result.json`, `backend/artifacts/room-finance-platform-reference-ux-acceptance-20261030/result.json`, `backend/artifacts/room-finance-platform-reference-api-acceptance-20261030.json`.
- Güvenlik/işletim sınırı: doğrudan SQL business-write, reset, migration, seed/reseed, fabricated audit veya production policy etkinleştirme yapılmadı; commit/tag/push yapılmadı. Gerçek üretim verisi/politikası geldiğinde aynı fail-closed kapı ve ayrı operasyonel onaylar yeniden aranmalıdır.

## ROOM_FINANCE_INCOME_CHAIN_BOUNDED — 2026-10-30
- Kapsam: mevcut ROOM Finans + Sefer Abi zincirinin kalan gelir/mutabakat kanıtı; önceki 28 gider / 10.490,00 TL kabulü, 6 ROOM platform ortalaması (112.500,00 TL; 100.000–125.000 TL), beş finans sekmesi ve M18 korunmuştur. Kök `AGENTS.md` içine tüm roller/backend/frontend/mobil/Sefer Abi için kalıcı canonical kod yaşam döngüsü hijyeni eklendi.
- PASS — Mevcut canonical pozitif gelir zinciri: agreement `#195`, ROOM `#1`, COMPANY `#1`, DONE vardiya `#257`; FINALIZED hakediş `#191` = `14.000.000` minor TRY (`140.000,00 TL`); ISSUED fatura `#176` = `14.000.000` minor TRY (`140.000,00 TL`); CONFIRMED tahsilat `#5` = `8.000.000` minor TRY (`80.000,00 TL`); açık alacak `6.000.000` minor TRY (`60.000,00 TL`); canonical reconciliation `MATCHED`, fark `0`.
- PASS — Hakediş + fatura tek ekonomik geliri iki kez toplamıyor; tahsilat ayrı tahsilat defteri olarak `collected` ve `receivable` döndü. Dönem dışı #195 sorgusu `PERIOD_MISMATCH` ve beklenen tutar yok.
- PASS — Negatif güvenlik davranışı: ROOM `#1` kullanıcısının ROOM `#21` sözleşmesi `#209` için reconciliation isteği `403`; ROOM `#21` kendi #209 kaydında `NO_HAKEDIS`, beklenen tutar `null`; Sefer Abi “karşılaştırılabilir hakediş kaydı yok / hesaplanamıyor” diyor ve tutar uydurmuyor.
- PASS — API → frontend → Sefer Abi: local/public aynı runtime davranışı; #195 için her iki uçta `140.000,00 TL` hakediş ve fatura, #209 için tutarsızlık/eksik kanıt açıklaması; UI yanıtında `agreement.id=`, `target.path=`, `INTERNAL_ACTUAL`, `NOT_PROVEN` gibi teknik sızıntılar yok.
- PASS — Gerçek Chromium kanıtı: local/public; `1440x900`, `1024x900`, `390x844`, `320x800`; pozitif ve negatif toplam 16 UI koşusu. Her koşuda yatay taşma yok, console/page error yok, 5xx/429 yok, business-write isteği yok. Kanıt: `backend/artifacts/room-finance-income-chain-acceptance-20261030/result.json` ve aynı klasördeki ekran görüntüleri.
- PASS — Hedefli regresyonlar: backend income reconciliation/collection/accounting/lifecycle `16/16`; web finans sunumları `9/9`; Sefer Abi finans/price/HGS `40/40`; seçili sözleşme v. ekran-geneli finans yönlendirme guard `2/2`.
- NOT_PROVEN — #209 için COMPANY talebi → ROOM teklifi → yeni hakediş → yeni fatura → tahsilat zincirini mevcut kayıtlardan ileriye taşımak: M18 sözleşmesi ROOM Finans içinde hakediş/fatura oluşturma/kesinleştirme için canonical UI/API yazma sahibi tanımlamıyor; bu işte ikinci motor, fixture seed'i veya M18 genişletmesi yapılmadı. Mevcut #195 zinciri yazma sahipliğinin başka canonical yüzeyde zaten bulunduğunu kanıtlıyor; #209 için eksik olan şey veri değil, yetkili ürün akışının kapsamıdır.
- NOT_PROVEN — beş finans sekmesinin önceki kabulü bu bounded zincir için yeniden açılmadı; önceki checkpoint’teki local/public aynı-build PASS aynen korunmuştur. Bu tur yalnız zincir bağlamındaki sözleşme/mutabakat ekranını gerçek Chromium’da doğruladı.
- Korunan sınırlar: doğrudan SQL, reset, migration, seed/reseed, fabricated audit, üretim politikasını etkinleştirme, tenant gevşetme, commit/tag/push yapılmadı. Geniş RBAC/security harness kapsam/provenance açıkları önceki checkpoint’teki sınıflandırmayla değişmeden kalır; bu bounded akışta yeni güvenlik ihlali bulunmadı.
- Kapanış: `ROOM_FINANCE_INCOME_CHAIN_BOUNDED`; canlı üretim politikası/verisi ve ROOM için yetkili hakediş/fatura işlem sahibi tanımlanması, ayrı kullanıcı kararı gereken operasyonel koşullardır. COMPANY/M18 üzerinde kendiliğinden ilerlenmeyecektir.
