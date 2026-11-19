# MILESTONE REGISTRY V1

## Current variable-progress pointer (2026-10-14)

Milestone contract and freeze provenance remain owned by this registry. The latest mutable M18/ROOM progress, WP-08 recovery boundary and next frontier are maintained only in [docs/NEXT_BACKLOG_V1.md](NEXT_BACKLOG_V1.md); historical HEAD/status overlays below are not a replacement for that current handoff.

### Demo data preparation boundary

Verified demo/test fixture preparation may occur before acceptance through the canonical seed/fixture/domain owners when the target database is proven non-production and the change is minimum, idempotent, traceable, tenant/role-safe and integrity-preserving. This is test setup, not product business-write execution; it does not alter `M18_NO_BUSINESS_WRITE`, the write-approval boundary, locked security invariants, or the field-launch gate.

## Current frontier (2026-09-24)

<!-- <!-- SEFERPAKT_MILESTONE_CONTRACT_V1
{
  "milestoneId": "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01",
  "lifecycleStatus": "ACTIVE",
  "goal": "Adopt the bounded screen-grounded guidance and execution-governance contract without business-write expansion.",
  "nonGoals": [
    "Conversation Core implementation",
    "#19",
    "final repository closure"
  ],
  "inputCapabilityContracts": [
    "PRE18_IMMUTABLE_CLOSURE"
  ],
  "outputCapabilityContracts": [
    "SCREEN_GROUNDED_GUIDANCE",
    "SAFE_UI_NAVIGATION"
  ],
  "canonicalOwners": [
    "docs/NEXT_BACKLOG_V1.md",
    "docs/MILESTONE_REGISTRY_V1.md",
    "docs/PRIMER_SSOT.md",
    "docs/LOCKED_INVARIANT_REGISTRY_V1.json",
    "backend/scripts/run_repo_check_chain.js"
  ],
  "newCapabilities": [
    "SEFERPAKT_EXECUTING_ACTIVE_FRONTIER_V1",
    "SEFERPAKT_MILESTONE_CONTRACT_V1"
  ],
  "existingInvariants": [
    "GLOBAL_LOCKED_INVARIANT_SUITE",
    "M18_NO_BUSINESS_WRITE"
  ],
  "behaviorClasses": [
    "current-screen-help",
    "target-grounding",
    "continuation-recovery",
    "holdout-unseen"
  ],
  "canarySurfaces": [
    "COMPANY",
    "ROOM",
    "DRIVER",
    "SUPER_ADMIN"
  ],
  "realUserScenarios": [
    "guided target recovery",
    "safe navigation",
    "mobile compact guidance"
  ],
  "responsiveRequirements": [
    "desktop",
    "tablet",
    "mobile"
  ],
  "publicRuntimePolicy": "PUBLIC_REQUIRED",
  "publicRuntimeRequirements": [
    "same-build public/tunnel identity",
    "real browser/device proof",
    "role/tenant negatives"
  ],
  "writeApprovalBoundary": "guidance/navigation/highlight only; no consequential business mutation",
  "rootClassAccounting": {
    "state": "ACTIVE",
    "rootClassId": "CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION",
    "ROOT_CLASS_TOTAL_LIFETIME_ATTEMPTS": null,
    "ROOT_CLASS_CURRENT_ARCHITECTURE_EPOCH_ATTEMPTS": null,
    "ARCHITECTURE_EPOCH_ID": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1",
    "ARCHITECTURE_DECISION_ID": "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-ACTION-V1-2026-09-29",
    "MATERIAL_ROOT_BOUNDARY_CHANGE": {
      "canonicalSemanticAuthority": true,
      "postCanonicalMutationBoundary": true,
      "taskEntityContinuityBoundary": true,
      "deterministicAuthorizationGroundingBoundary": true,
      "visibleRenderingBoundary": true
    },
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
    },
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
      "modelFallbackHumanPolicyDisposition": {
        "status": "TECHNICAL_POLICY_APPROVED_LEGAL_PRIVACY_BLOCKED",
        "recordedAtHead": "d85ea52218adcfcbacbdac279526ca0e767c4d0d",
        "contractVersion": "SEFER-ABI-CANONICAL-REQUEST-V3",
        "architectureEpochId": "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1",
        "providerArchitecture": "ONE_CANONICAL_PROVIDER_BOUNDARY_ONE_INITIAL_PROVIDER",
        "initialProvider": "HUMAN_DECISION_REQUIRED",
        "initialModel": "HUMAN_DECISION_REQUIRED",
        "serverSideOnly": true,
        "highConfidenceDeterministicProviderCalls": 0,
        "fallbackEligibility": "LOW_CONFIDENCE_OR_ELIGIBLE_UNRESOLVED_ONLY",
        "ambiguityPolicy": "CLARIFICATION_BY_DEFAULT",
        "genuineOffTopicProviderCall": false,
        "modelAuthority": "SEMANTIC_CANDIDATE_EVIDENCE_PROPOSAL_ONLY",
        "deterministicValidation": "REQUIRED",
        "authorizationCapabilityWorkflowRouteTargetWriteAuthority": "MODEL_FORBIDDEN",
        "failurePolicy": "FAIL_CLOSED_TO_SAFE_CLARIFICATION_OR_SEMANTIC_UNRESOLVED",
        "cachePolicy": "NO_CACHE_BY_DEFAULT",
        "modelVersionPolicy": "PINNED_ID_AND_FINGERPRINT;_REPLAY_ON_MATERIAL_CHANGE",
        "rawUtteranceLongTermLogging": "NO_BY_DEFAULT",
        "technicalDataMinimization": "APPROVED",
        "externalProcessingAuthorization": "LEGAL_PRIVACY_CONFIRMATION_REQUIRED",
        "providerDataRegion": "LEGAL_PRIVACY_CONFIRMATION_REQUIRED",
        "providerTrainingSecondaryUse": "LEGAL_PRIVACY_CONFIRMATION_REQUIRED",
        "providerRetentionDeletion": "LEGAL_PRIVACY_CONFIRMATION_REQUIRED",
        "personalDataInUtterance": "LEGAL_PRIVACY_CONFIRMATION_REQUIRED",
        "publicRuntimeProcessing": "LEGAL_PRIVACY_CONFIRMATION_REQUIRED",
        "secretOwner": "NEW_SEMANTIC_PROVIDER_SECRET_OWNER_REQUIRED",
        "numericTimeoutRetryCircuitBreakerBudgets": "HUMAN_DECISION_REQUIRED",
        "implementationReady": false,
        "attempt04": "NOT_CREATED",
        "runB": "IMMUTABLE_STOPPED_AT_B02",
        "runC": "NOT_CREATED"
      },
      "nextPackage": "RED -> compositional deterministic evidence -> confidence/resolution boundary -> bounded model fallback -> strict typed validation -> deterministic capability/consistency/authorization/grounding -> focused/service/browser/public/no-write proof",
      "futureHoldout": "new frozen manifest; development and holdout corpora separate; model/version fingerprint recorded"
    },
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
    "thirdRecurrenceAction": "ARCHITECTURAL_REVIEW_REQUIRED",
    "milestoneTransitionResetsHistory": false,
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
    ]
  },
  "freezeCriteria": {
    "OPEN_ROOT_CLASS_COUNT": "0",
    "FRESH_SWEEP_1_NEW_ROOT_CLASS_DEFECT": "0",
    "FRESH_SWEEP_2_NEW_ROOT_CLASS_DEFECT": "0",
    "PACKAGE_SPECIFIC_ACCEPTANCE": "PASS",
    "GLOBAL_LOCKED_INVARIANT_SUITE": "PASS"
  },
  "reopenCriteria": [
    "new concrete root-class evidence",
    "source/runtime identity invalidation",
    "invariant regression"
  ],
  "closureRequirements": [
    "final durable state",
    "docs sync",
    "committed-head validation",
    "immutable tag",
    "push",
    "remote parity"
  ]
}
-->

## PRE-#18 immutable closure (2026-09-25)

- Combined acceptance is GREEN and the No-Surprise Repository Exit is GREEN (`487/487` candidates classified, `0` unexplained).
- Final terminology / Sefer Abi residual closure and bounded public-runtime source-match recheck are PASS; no raw same-class status leakage remains.
- `#18` is not started. This package is the exact immutable PRE-#18 closure step; proven-closed milestones require concrete newer regression evidence before reopening.

- `#1–#14`, `#16` and the M80–M92 verification spine remain closed/proven according to their current immutable closure or operational evidence.
- PRE-#18 foundation semantic, security, ownership, lifecycle and documentation/SSOT reconciliation is closed at HEAD `e3bec6177f32263325bd14e876502faacac7a5b0`.
- `verify:repo` is `PASS 32/32`, `verify:final` is `PASS`, KVKK is `262/262`, role/data isolation is `216/216`, and active/product unowned is `0`.
- `PREMIUM_UI` is `72_OF_72_PROVEN`; Foundation Exit is `GREEN PRESERVED`, ROOM/OTHER423 is `PROVEN_CLOSED`, and No-Surprise Repository Exit is green after current-tree classification.
- PRE-#18 is `FINAL CLOSURE READY`; #18 is not started, and no commit/tag/push is implied by this documentation state.

## #18 active bounded implementation (2026-09-25)

- `COPILOT-UI-ELEMENT-ANCHOR-AND-GUIDED-HIGHLIGHT-01` is the current numbered milestone after the immutable PRE-#18 closure tag `v2026.09.25-pre18-immutable-closure`.
- Scope is screen-grounded Sefer Abi guidance: semantic target resolution from the authorized current UI surface, bounded highlight/scroll/focus, guided continuation and safe navigation. It does not execute business writes or reopen PRE-#18.
- Canonical owners: `backend/src/ai/chat/copilotUiElementAnchor.js`, `web/src/components/copilot/GuidedTargetOverlay.jsx`, `check:copilotuielementanchor01`, and `smoke:copilotuielementanchor01`.

## #18 final bounded acceptance / pre-commit closure preparation (2026-09-26)

- Current HEAD is `5501de58f86a52f0c518005c0e79ace580dbcb3a` on `m90d1_web_lint_inventory`; the existing M18 immutable tags remain historical evidence and this stage does not commit, tag or push.
- Final accepted scope covers all 8 supported roles, `109/109` current menu/route targets, local and same-build public representative guidance, desktop/tablet/mobile behavior, desktop resize, mobile compact guided UX, suggestions, modal stacking, current-screen help, continuation/recovery/back, offer navigation and nonexistent-target rejection.
- `PRODUCT_DEFECTS_REMAINING = 0`, fake navigation `0`, business write execution `0`, package ownership/current-head/M90C.6/onboarding/smart-chips governance PASS, `verify:repo = 32/32`, `verify:final = PASS`.
- M18 is the `ANLAT → GÖSTER → BİRLİKTE YAP` foundation. #19 preparation, #20 dispatch/optimizer, #21 controlled safe action/approval, #22–#29 voice, #30–#33 proactive/agentic work and #39 exhaustive all-role E2E retain their existing ownership. M18 does not claim #39 coverage or start #19.

### M18 additive final frontend / brand / premium UX closure gate

The product-owner-approved frontend/brand/UX decision is recorded inside M18's
existing final closure; it does not create a new milestone or replace the active
frontier. B-04 and subsequent role-based functional acceptance continue in their
existing order and are not restarted or split. Existing M18 functional, Finans
11, and closed B/C evidence remains valid in its original scope.

The gate requires current same-build evidence for approved SeferPakt assets and
their source/runtime visibility; Login, AppShell, NavDock, mobile menu, favicon
and manifest; all eight roles; ROOM finance/operations; COMPANY/SCHOOL/
ORGANIZATION budget, offer and service tracking; DRIVER/PERSONEL/PARENT mobile
flows; shared forms/tables/charts/maps/modals/notifications; Sefer Abi identity
and interaction; 1440/1024/390/320 Chromium; keyboard/safe-area/device checks;
and measured task success, steps, manual entry, time, errors/recovery and
five-second comprehension. The #18 internal design descriptions being removed
are not interchangeable with the approved product logo or brand assets.

The ROOM Finans acceptance additionally includes `D-FIN-01`: in both `Araç
Karşılaştır` and `Teklif ve Kârlılık`, an authorized ROOM/tenant user must be
able to select a real request/offer and see its customer, request/offer/
counter-offer/accepted-offer/contract relationship, status, period, route and
vehicle context. The selection must persist across tabs and carry the vehicle
to profitability. Replacing the offer must replace the entire context so the
old price, cost, period or vehicle cannot leak. Offer price, planning estimate,
realized expense and proven profit remain distinct; missing data links to the
real correction record; Sefer Abi is aware of the selected offer and vehicle.
Two-offer switching, vehicle change, missing-data completion, tenant/RBAC
negatives, responsive behavior, audit and durable regression are mandatory
real-Chromium evidence. A technical test PASS without end-to-end user proof
does not close the criterion. The existing Finans 11 engine and canonical
ledger ownership are preserved; no new finance engine or independent tab is
authorized by this criterion.

Until all mandatory rows are proven with real user/browser evidence and durable
regressions, the state is explicitly:

- `M18_FRONTEND_BRAND_UX_FINAL_GATE = NOT_PROVEN`
- `FULL_D_LEVEL_CLOSED = FALSE`
- `SAFE_TO_PROMOTE = FALSE`
- `#19 = NOT_STARTED`

Documentation of this gate must not turn an unexecuted visual test into PASS,
pause B-04, reopen closed work without newer regression evidence, or grant
commit/merge/push/cutover authority.

The older ordering below is retained as historical compatibility context. It is not the current frontier and must not override `docs/INDEX.md`, `docs/PRIMER_SSOT.md`, or current-head evidence.

## 1) Tarihsel kapatılan resmi hatlar
- `M59 - gozlemleme + saha teshis - open historical gate`
- `M60 - saha acceptance merkezi - green`
- `M61 - ssot + milestone hizasi - green`
- `M62 - ticari omurga guclendirme - green`
- `M63 - guven + kalite + hizmet degerlendirme - green-base`
- `M64 - dogal copilot katmani - green`
- `M65 - pilot launch gate - green`
- `M67->M75 - living baseline / hot-path daraltma hatti - green`
- `M78 - operasyon dogrulama living hatti - green-base`
- `M78.1 - operasyon dogrulama yuzeyi - active-history`
- `M78.2 - operasyon dogrulama kayit katmani - active-history`
- `M78.3 - operasyon dogrulama ozet ve filtre katmani - active-history`
- `M79 - living verification toplama hatti - green`

## 2) Güncel kapalı upper route
- `M80 - final sert kabul ve yuk guveni - green`
- `M80.1 - hot panel daraltma - green`
- `M80.2 - agreements + shifts giris yuku - green`
- `M80.3 - georeview + shifts son giris yuku - green`
- `M81 - mobil saha sertlestirme - green`
- `M82.1 - backend correctness kilidi - green`
- `M82.8 - verification 2.0 - green`
- `M82.9 - dormant payment backbone - green`
- `M82.10 - super admin ticari ayarlar - green`
- `M82.11 - payment readonly ticari yuzey - green`
- `M83 - saha test hazirlik paketi - green`
- `M84 - saha gozlem / geri bildirim dongusu - green`
- `M85 - odeme opsiyonel pilot - green`
- `M86 - odeme zorunlu rollout - green`
- `M87 - odeme hesabi hazirligi - green`
- `M88 - settlement operasyon masasi - green`
- `M89 - settlement mutabakat masasi - green`

## 3) Historical compatibility ordering (not current frontier)
- `#3 HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01 - green / immutable closure`
  - amac: sözleşme, operasyon kanıtı, hakediş ve fatura verisini dönem bazında salt-okunur mutabakat önizlemesi ve açıklaması olarak karşılaştırmak
  - komut: `npm run check:hakedisinvoicereconciliationpreview01` ve gerçek kabul için `npm run accept:hakedisinvoicereconciliationpreview01`
  - kural: ödeme, fatura onayı, hakediş kesinleştirmesi ve muhasebe yazımı yoktur; `EXTERNAL_REFERENCE` ve `DEMO_FIXTURE` mutabakat gerçeği değildir
- `M90 - canonical closure / 10-10 kapanis paketi`
  - amac: canonical markdown, state, script-guide, proof-politikasi ve verification orkestrasyonunu tek gercekte toplamak
  - kural: yeni urun ozelligi degil; docs/verify/hijyen hizasi onceliklidir
- `M90B.1 - executable closure gate`
  - amac: `M0->M89 green` bazinin ustune docs/state/pack/verify convergence icin calisan resmi kapanis kapisi koymak
  - komut: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- `M90C.6 - hot-file queue policy`
  - amac: repo-audit large/hot file listesini resmi sinifli queue olarak kilitlemek; justified exception / safe candidate review / acceptance-sensitive-later dagilimini state-first policy ile dogrulamak
  - komut: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- `M90C.7 - export / package hygiene closure`
  - amac: shareable repo exportunu env/build/runtime-json/overlay artigi tasimayan temiz zip olarak kilitlemek
  - komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- `M90C.8 - CI / verification visibility`
  - amac: yereldeki kanonik verify zincirini repo-native workflow ile görünür hale getirmek
  - komut: `tools\pack_m90_c8_ci_verification_visibility.ps1 -RepoRoot D:\servis-platform`
- `M90C.9 - safe closure / final hygiene checklist`
  - amac: release/shareable/export/verify siralamasini tek resmi checklist altinda sabitlemek ve Windows tarafinda pwsh tercih kuralini yazili hale getirmek
  - komut: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
- `#2 EXTERNAL-COST-DATA-PROVIDER-AND-FRESHNESS-01 - active execution`
  - amac: provider-bağımsız dış maliyet/referans veri sözleşmesi, provenance, freshness, cache, retry/fallback ve güvenli okuma/import sınırını kurmak; gerçek provider edinimi sonraki entegrasyon kapsamındadır
  - komut: `npm run check:externalcostdataproviderfreshness01`
  - kural: `INTERNAL_ACTUAL`, `EXTERNAL_REFERENCE` ve `DEMO_FIXTURE` ayrıdır; dış referans #1'in gerçek maliyet verisinin yerine geçmez
- `#4 COST-SCENARIO-FORECAST-AND-SAVINGS-01 - active execution`
  - amaç: mevcut plan ile alternatif araç/kapasite/yolcu/mesafe/süre/hizmet günü/yakıt varsayımlarını açıklanabilir tasarruf veya ek maliyet preview'ı olarak karşılaştırmak
  - sahipler: `backend/src/finance/costScenarioForecast.js`, `backend/src/routes/costScenario.js`, `web/src/panels/shared/CostScenarioWorkspacePanel.jsx`
  - komutlar: `npm run check:costscenarioforecastandsavings01`, `npm run accept:costscenarioforecastandsavings01`, `npm run smoke:costscenarioforecastandsavings01`
  - kural: operational cost model tek hesap sahibidir; scenario ephemeral'dır, canlı veri ve finansal lifecycle yazmaz; #5 başlatılmaz
- `#11 PRISMA-SCHEMA-MODULARIZATION-01 - next / architectural refactor`
  - amaç: Prisma 5.22.0 native schema-folder desteğiyle canonical domain modüllerini okunur ve ownership-explicit hale getirmek; model/DMMF/DB semantiğini değiştirmemek
  - sahipler: `backend/prisma/schema.prisma`, `backend/prisma/schema/*.prisma`, `backend/scripts/prisma_schema_modularization_01.mjs`, `backend/scripts/prisma_schema_modularization_01_check.js`
  - komutlar: `npm --prefix backend run prisma:modularization:acceptance`, `npm --prefix backend run prisma:modularization:check`, `npm --prefix backend run prisma:verify`
  - kural: custom schema compiler, competing SSOT, yeni migration, DB mutation ve ürün/UI davranışı yoktur; #10 generation owner korunur
- `#12 DATABASE-BACKUP-RETENTION-AND-INTEGRITY-01 - next / recovery integrity`
  - amaç: provider-independent PostgreSQL custom backup, checksum, retention inventory, isolated restore rehearsal ve current-head evidence sözleşmesini tek owner altında kapatmak
  - sahipler: `backend/src/ops/databaseBackupService.js`, `backend/scripts/database_backup_retention_and_integrity_01.mjs`, `backend/scripts/database_backup_retention_and_integrity_01_acceptance.mjs`, `backend/scripts/database_backup_retention_and_integrity_01_check.js`
  - komutlar: `npm --prefix backend run backup:acceptance`, `npm run check:databasebackupretentionandintegrity01`
  - kural: canonical DB overwrite, reset/reseed, migration, accounting/payment write, provider lock-in ve protected runtime-data değişikliği yoktur; M45 yüzeyleri yalnız compatibility delegate'tir

## 3.1) Son kapanan ürün hatları [green / closed]
- `WEB-01A - green/closed`
- `WEB-01B - green/closed`
- `WEB-01-FIX - green/closed` (`8b9c9eb / v2026.05.08-web01-fix-flow-check-system-language`)
- `QLT-04B - green/closed`
- `PAY-01A-E - green/closed` (`PAY-01E` kapanış halkası dahil)
- `PAY-SAFE-01 - green/closed` (`5722590 / v2026.05.07-paysafe01-payment-write-gate`)
- `COP-01A-E - green/closed` (`COP-01E` kabul halkası dahil)
- `COP-02A - green/closed`
- `COP-02B - green/closed`
- `COP-03A - green/closed`
- `OP-04 - green/closed`
- `UX-KVKK-01 - green/closed`
- `MOBILE-TEXT-01 - green/closed`
- `COMPANY-BUDGET-AND-SERVICE-COST-01 - green/closed`
- `DOCS-STATE-01 - active/next`
- `VERIFY-CHAIN-01 - active/next`
- `M95-EXPORT-01 - active/next`
- upcoming: `WEB-01C`, `M44-T1/T5`, `FIELD-LAUNCH-PACK-01`
- `M91 - shift/agreement route preview`
  - amac: vardiya kaynakli sozlesme akisinda rota onizleme ve kaynak vardiya baglantisini korumak
  - komut: `tools\pack_m91_shift_agreement_route_preview.ps1 -RepoRoot D:\servis-platform`
- `M92 - repo verification spine`
  - amac: tum repo kontrol zincirini tek catiya toplamak
  - komut: `npm run verify:repo`
  - pack: `tools\pack_m92_repo_verification_spine.ps1 -RepoRoot D:\servis-platform`
- `M93 - queue durability proof - green`
  - amaç: autoReachedQueue için Redis down/up, worker restart reclaim, dead-letter görünürlüğü ve threshold kanıtını resmi hatta bağlamak
  - komut: `tools\pack_m93_queue_durability_proof.ps1 -RepoRoot D:\servis-platform`
- `M94-D2 / M94-D3 - admin audit + payment export polish + settlement ledger CSV cleanup - green`
  - amaç: admin write step-up, payment ledger export audit standardı ve ledger CSV temizliğini küçük bir kapanışta toplamak
  - komut: `node backend/scripts/m94d_admin_payment_security_export_check.js`
- `M94-E - queue chaos/alarm proof - active`
  - amaç: autoReachedQueue için Redis unavailable, stale claim reclaim, dead-letter ve threshold alarm proof'unu güvenli check/probe ile görünür kılmak
  - komut: `node backend/scripts/m94e_queue_chaos_alarm_check.js && node backend/scripts/m94e_queue_chaos_alarm_probe.js`
- `M95-E0 - android apk/aab build readiness - active`
  - amaç: Android APK/AAB build hazırlığını resmi runbook/check ile görünür kılmak; saha kanıtından ayrı tutmak
  - komut: `node mobile/scripts/m95_e0_android_build_readiness_check.js`
- `M95-E25 - mobil saha kabul checklist’i - active`
  - amaç: mobil uygulamanın saha öncesi temel kullanıcı akışlarını sade Türkçe checklist ile doğrulamak
  - komut: `node backend/scripts/m95_e25_mobile_field_acceptance_check.js`
- `M95-E26 - android emulator smoke planı - active`
  - amaç: gerçek cihaz öncesi local emulator üzerinde API base, APK profil ve temel rollerin smoke planını görünür kılmak
  - komut: `node backend/scripts/m95_e26_android_emulator_smoke_plan_check.js`
- `M95-E27 - gerçek Android cihaz saha proof hazırlığı - active`
  - amaç: gerçek cihaz testinden önce izin, ekran, GPS, ağ ve kanıt planını kilitlemek
  - komut: `node backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js`
- `M95-EXPORT-01 - export zip / runtime check uyumu - active`
  - amaç: shareable export paketinde runtime JSON yokluğunu INFO/SKIP kabul edecek şekilde saha check uyumunu korumak
  - komut: `node backend/scripts/m95_export_01_runtime_check_compat_check.js`
- `M96-A - driver availability local state - active`
  - amaç: sürücü mola / müsaitlik / yeni iş durumunu mobil yerel state olarak görünür kılmak
  - komut: `node mobile/scripts/m96_a_driver_availability_check.js`
- `M96-B - mobile notifications foundation - active`
  - amaç: driver, personel, veli ve operasyon bildirim yüzeylerini mobilde tek foundation altında görünür kılmak
  - komut: `node mobile/scripts/m96_b_notifications_check.js`
- `M96-C - boarding change local model - active`
  - amaç: biniş değişikliği taleplerini mobil yerel istek modeli olarak görünür kılmak; backend/panel bind sonraki halkada yaşar
  - komut: `node mobile/scripts/m96_c_boarding_change_check.js`
- `M96-C2 - boarding change operations readiness - active`
  - amaç: biniş değişikliği için backend/panel/audit/notification/auto-accept görünürlüğünü doğrulamak
  - komut: `node backend/scripts/m96_c2_boarding_change_ops_check.js`
- `M96-D - driver change awareness - active`
  - amaç: sürücü değişiklik farkındalığı ve sesli uyarı katmanını mobilde görünür kılmak
  - komut: `node mobile/scripts/m96_d_driver_change_awareness_check.js`
- `M97 - check-in panel integrations - active`
  - amaç: room/company/school/organization/driver check-in görünürlük ve kısayollarını panel/nav katmanında güvenli biçimde restore etmek
  - komut: `node backend/scripts/m97_panel_integration_check.js`
- `M97-A - room operation board - active`
  - amaç: room operasyon panelinde bugünkü görevler, aktif servisler, sürücü / araç durumu ve biniş değişikliği özetini tek yerde göstermek
  - komut: `node backend/scripts/m97_a_room_operation_panel_check.js`
- `M97-B - company operations panel - active`
  - amaç: company / organization tarafında personel servis atamaları, sözleşme ilişkisi ve biniş değişikliği özetini tek yerde göstermek
  - komut: `node backend/scripts/m97_panel_operations_check.js`
- `M97-C - school operations panel - active`
  - amaç: school tarafında öğrenci servis atamaları, veli bağlantıları ve bildirim geçmişini tek yerde göstermek
  - komut: `node backend/scripts/m97_panel_operations_check.js`
- `M97-D - super admin operations panel - active`
  - amaç: super admin için rol/yetki denetimi, audit/log ve tekrar eden işlem görünürlüğünü tek yerde göstermek
  - komut: `node backend/scripts/m97_panel_operations_check.js`
- `M98 kod + PIN kanıt bandı`
  - `M98-A - personel activation model - active`
  - `M98-B - parent activation and link access - active`
  - `M98-C - link lifetime and tracking authority - active`
  - `M98-D - kvkk visibility matrix - active`
  - `M98-E2E - code + PIN acceptance gate - green`
  - `M98-E3 - code + PIN saha / UX kanıt paketi - active`
  - `M98-E4 - code + PIN runtime smoke - active`
  - `M98-E5 - code + PIN gerçek kullanıcı kabul checklist’i - active`
- `M99-KVKK-01 - mobil/web kvkk sade metin ve izin dili - active`
  - `M99-UX-01 - görünür türkçe metin hijyeni / teknik terim taraması - active`
- `OP-01 - operation proof / service proof merkezi kanıt omurgası - active-readonly`
  - not: `M99-KVKK-01` ve `M99-UX-01` kararları korunur; bu hat readonly özet omurgasıdır.
- `OP-02 - manuel operatör kanıt notu katmanı - active`
  - not: `OP-01` readonly omurga korunur; manuel not sinyali bu katmanda yaşar.
- `OP-03 - web servis kanıtı / manuel not küçük kartı - active`
  - not: `OP-01` readonly omurga ve `OP-02` manuel not katmanı korunur; web kartı yalnız görünür özet sağlar.
- `OP-04 - servis kanıtı durumunu ticari/kalite yüzeylerine readonly köprü - active-readonly`
  - not: `OP-01` readonly omurga, `OP-02` manuel not katmanı ve `OP-03` küçük kart korunur; settlement aktif değildir, komisyon hesaplama aktif değildir.
- `QLT-01 - kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası - active-prep`
  - not: `OP-01/02/03/04` evidence chain bu hazırlığın temelidir; kesin puan veya otomatik sıralama yoktur.
- `QLT-02 - kontrollü kalite skoru taslak modeli - active-draft`
  - not: `QLT-01` hazırlığı üstünden taslak skor üretir; kesin puan, ranking ve settlement yoktur.
- `QLT-03 - kontrollü kalite inceleme akışı - active-review`
  - not: `QLT-02` sonrası kontrollü kalite inceleme kararı halkasıdır; kesin kalite puanı üretmez.
- `QLT-04 - kalite karar geçmişi / denetim izi - active-history`
  - not: `QLT-03` kararlarının küçük readonly geçmiş halkasıdır; kesin kalite puanı, ranking, settlement ve komisyon üretmez.
- `M99-A - mobile regression pack - active`
  - amaç: login, role routing, token/session, bildirim, biniş değişikliği ve müsaitlik regression pack'ini tek check'te yaşatmak
  - komut: `node mobile/scripts/m99_a_mobile_regression_pack_check.js`
- `M99-B - real scenario tests - active`
  - amaç: sürücü, personel, veli ve operasyon yüzeylerini gerçek senaryo pack'iyle tek check'te yaşatmak
  - komut: `node mobile/scripts/m99_b_real_scenario_tests_check.js`
- `M99-C - field launch readiness - active`
  - amaç: gerçek cihaz, zayıf ağ ve saha kanıtı hazırlığını tek check'te görünür kılmak
  - komut: `node mobile/scripts/m99_c_field_launch_readiness_check.js`

## 4) Ticari omurga notu
- Ticari kaynak yalniz sozlesme degildir.
- Kisa sureli isler icin `SHIFT_SERIES` de ticari kaynak olabilir.
- Komisyon snapshot'i ticari kaynak olusturuldugu anda alinir.
- Oda bazli override, global varsayilanin ustunde calisir.

## 5) Bu dosyanin okuma yonu
- Once `tools/repo_contract_state.json` okunur.
- Sonra bu dosya okunur.
- Sonra `docs/PRIMER_SSOT.md` okunur.
- Sonra `docs/STARTPACK_V1.md` okunur.
- Sonra detay icin `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` okunur.

## REPO_CONTRACT_MARKERS_V1
- REGISTRY_ROUTE_M63_M65_V1
- REGISTRY_ROUTE_M80_M89_V1
- REGISTRY_ROUTE_M91_M92_VERIFICATION_SPINE_V1
- REGISTRY_ROUTE_M93_QUEUE_DURABILITY_PROOF_V1
