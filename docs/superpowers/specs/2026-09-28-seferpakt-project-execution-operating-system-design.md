# SeferPakt Cross-Milestone Governance Architecture
## Project Execution Operating System

**Status:** Design specification only. This document does not authorize enforcement, product behavior changes, roadmap reordering, milestone creation, commits, tags, pushes, or closure.

**Purpose:** Define one bounded execution operating system for the remaining SeferPakt milestones. The operating system prevents endless micro-correctives, phrase patches, repeated rediscovery, contradictory evidence, and simultaneous half-open frontiers while preserving the existing milestone and closure governance.

**Compatibility boundary:** The existing 40-step closure plan, GLOBAL_LOCKED_INVARIANT_SUITE, milestone ordering, canonical product owners, and current M18 boundaries remain authoritative.

## 1. Problem statement

The project has repeatedly encountered the same operational failure pattern:

- one concrete symptom is fixed without closing its root class;
- a later check or real user exposes another manifestation of the same root;
- the next turn reopens broad discovery instead of resuming from the exact frontier;
- implementation examples are mistaken for unseen semantic acceptance;
- a shared change is declared global before representative canary proof;
- product, harness/evidence, and repository closure status are collapsed into one ambiguous PASS/FAIL;
- a known issue moves between documents without one current owner;
- three or more micro-fixes accumulate even though the authority boundary, state model, or interface is wrong.

This creates long corrective chains without a durable definition of when a capability is stable, when a finding belongs in the current package, and when repeated symptoms require architectural review.

The Project Execution Operating System provides a bounded loop, a single active frontier, root-class accounting, holdout acceptance, two-sweep freeze, milestone contracts, canary expansion, and explicit integration with the existing invariant and 40-step closure systems.

## 2. Goals

1. Make every bounded package start from one concrete goal, red proof, root-class classification, and exact blocker.
2. Stop a repeated root class from receiving a third micro-corrective after two independent bounded attempts.
3. Make two fresh zero-defect sweeps a durable freeze signal for a capability or surface.
4. Require unseen/holdout acceptance for semantic and AI behavior where applicable.
5. Maintain exactly one EXECUTING_ACTIVE_FRONTIER at all times; a security/foundation stop-the-line suspends the prior frontier and becomes the sole active frontier.
6. Give each milestone a durable contract with explicit inputs, outputs, owners, boundaries, canaries, acceptance, freeze, and reopen rules.
7. Use behavior classes and deterministic inventories instead of Cartesian test growth.
8. Expand shared changes through canonical owner, canary, second surface, responsive parity, and only then broader coverage.
9. Keep PRODUCT_STATE, EVIDENCE_HARNESS_STATE, and REPOSITORY_CLOSURE_STATE separate.
10. Make later milestones consume earlier capability contracts without silently redefining them.
11. Reuse existing SSOTs and checks rather than creating duplicate ledgers, primers, or sentence-level checkers.
12. Preserve the existing 40-step chain as the final milestone closure mechanism rather than turning it into a daily package checklist.

## 3. Non-goals

This design does not:

- change product behavior, semantic routing, authorization, tenant isolation, schema, or runtime data;
- implement enforcement, automation, or new check scripts;
- reorder the roadmap or create a governance-only milestone;
- reopen PRE-#18, redesign M18, or start #19;
- replace GLOBAL_LOCKED_INVARIANT_SUITE or its registry/ledger;
- turn every finding into a new document;
- require every bounded package to execute all 40 closure steps;
- replace real user or real device acceptance with synthetic checkers;
- create a second ownership authority, evidence SSOT, task state, or product architecture;
- authorize business writes, approvals, dispatch, or execution.

## 4. Existing governance integration

The operating system extends the existing governance rather than replacing it.

| Responsibility | Existing canonical owner | Operating-system use |
| --- | --- | --- |
| Engineering entry and navigation | docs/INDEX.md, docs/README.md | Link the current contract and reading order; do not duplicate product truth. |
| Product and current milestone truth | docs/PRIMER_SSOT.md, docs/MILESTONE_REGISTRY_V1.md, docs/CHECKLIST_SSOT.md | Hold the current milestone, phase, scope, and capability contract. |
| Next controlled work | docs/NEXT_BACKLOG_V1.md | Hold the one current frontier and observed backlog disposition. |
| Onboarding and working rules | docs/STARTPACK_V1.md, docs/AGENTS.md | Tell Codex/agents how to resume from the active frontier and avoid broad rediscovery. |
| Capability ownership | docs/domains/CAPABILITY_OWNERSHIP_MAP.md, documentation registry | Resolve canonical product owners and check owners. |
| Milestone ownership/current-head identity | backend/scripts/lib/milestoneOwnershipAuthority.js and the active milestone manifest | Prove exact owner paths and current-head identity. |
| Locked invariants | docs/LOCKED_INVARIANT_REGISTRY_V1.json | Register approved durable rules/subrules only after duplicate/owner review. |
| Violation and status evidence | docs/LOCKED_INVARIANT_VIOLATION_LEDGER_V1.json and .md | Keep PROVEN_PASS, PROVEN_FAIL, UNPROVEN, and blocked states distinct. |
| Check chain | package.json, backend/scripts/run_repo_check_chain.js, run_product_extensions_check_chain.js | Run the applicable gates; do not invent a parallel chain. |
| Final closure | Existing M90/M91/M92 closure documents and verify:final | Preserve the 40-step closure order and final repository boundary. |

The new design document is the architecture reference for this operating system. It does not become a second product or invariant SSOT.

## 5. Bounded execution loop

Every bounded package follows this loop:

~~~text
GOAL / CONCRETE DEFECT
  -> RED PROOF
  -> ROOT-CLASS CLASSIFICATION
  -> SMALLEST CORRECT ROOT FIX
  -> REAL ACCEPTANCE
  -> GLOBAL LOCKED INVARIANT GATE
  -> CLOSE / FREEZE
~~~

### 5.1 Loop stages

| Stage | Required evidence | Exit condition |
| --- | --- | --- |
| Goal | One capability/defect and explicit non-goals | The active frontier names the package. |
| Red proof | Reproducible failing source, runtime, browser, or evidence result | A concrete failure is captured; no speculative scope. |
| Root class | Shared owner, authority boundary, and affected behavior class | The issue is SAME_ROOT/CURRENT_SCOPE, DIFFERENT_ROOT/BACKLOG, or STOP-THE-LINE. |
| Smallest fix | One canonical owner and bounded delta | No unrelated refactor or phrase patch is introduced. |
| Real acceptance | Natural user behavior against current source/runtime | Product behavior is proven for the affected class; evidence is reproducible. |
| Global gate | Applicable invariant statuses and owners | All due-now locked rules are green or an explicit stop is recorded. |
| Close/freeze | Package status, evidence paths, root-class counters | The frontier advances or the capability enters freeze. |

A package may not expand indefinitely because an unrelated finding appeared. The finding is classified into the current package, observed backlog, or security/foundation interruption before any work continues.

### 5.2 Bounded package contract

Before implementation, record:

- MILESTONE_ID, PHASE, and ACTIVE_FRONTIER;
- one ACTIVE_ROOT_CLASS and its red proof;
- goal, non-goals, canonical owner, and expected next state;
- write/approval boundary;
- acceptance classes and canary surfaces;
- affected invariant IDs/subrules;
- stop conditions and evidence output paths.

The bounded package closes only when the required product, evidence, and repository states are separately recorded.

## 6. Root-class model

A root class is the earliest shared authority, data-flow, state, interface, or architecture failure that explains multiple concrete manifestations. A raw symptom, phrase, screenshot, or route is not automatically a root class.

Each root-class record contains:

~~~text
RootClassRecord {
  rootClassId,
  title,
  earliestFailingLayer,
  canonicalOwner,
  affectedCapabilityOrSurface,
  firstObservedEvidence,
  manifestations,
  independentAttemptIds,
  status,
  currentFrontierRelation,
  reopenEvidence
}
~~~

Track at minimum:

- OPEN_ROOT_CLASS_COUNT;
- NEW_ROOT_CLASS_IN_FRESH_SWEEP;
- REPEATED_ROOT_CLASS_COUNT;
- CLOSED_ROOT_CLASS_COUNT;
- ROOT_CLASS_ATTEMPT_COUNT.

Twenty manifestations of one root class do not become twenty architectural failures. They remain manifestations linked to one root-class record until a distinct earliest failing layer is proven.

A root class is considered closed only when the shared owner is fixed, the representative real acceptance is green, the negative controls remain valid, and the relevant invariant gate is green.

## 7. Third-repeat architectural escalation

The same root class may receive at most two independent bounded root-corrective attempts.

An independent attempt must have its own red proof, root classification, smallest fix, and real acceptance. Re-running the same checker or changing a phrase does not create a new independent attempt.

If the same root class reappears after two independent bounded attempts in the same architecture epoch:

~~~text
THIRD_REAPPEARANCE
  -> ARCHITECTURAL_REVIEW_REQUIRED
  -> stop third micro-corrective
  -> inspect ownership, authority, data flow, state model, interface boundary,
     persistence, and architecture
~~~

The architectural review must identify whether the prior attempts fixed the wrong owner, failed to persist state, allowed a downstream override, used a false proof fixture, or lacked a required interface contract. Architectural review alone never resets the count. A new attempt epoch is allowed only after an approved architectural decision materially changes the relevant canonical owner, authority boundary, state model, interface contract, or persistence model.

Every root-class record retains immutable lifetime history and records:

- ROOT_CLASS_TOTAL_LIFETIME_ATTEMPTS;
- ROOT_CLASS_CURRENT_ARCHITECTURE_EPOCH_ATTEMPTS;
- ARCHITECTURE_EPOCH_ID;
- ARCHITECTURE_DECISION_ID;
- MATERIAL_ROOT_BOUNDARY_CHANGE.

The operational escalation key is rootClassId + capabilityContractVersion + architectureEpoch. A milestone transition alone never resets root history. A new epoch must reference the approved architectural decision and the material boundary change that makes a new bounded attempt legitimate.

A security/KVKK or global-invariant stop-the-line interruption may preempt this rule, but it must retain the same root-class history and must not be used to evade architectural review.

## 8. Fresh-sweep/freeze model

A capability or surface becomes eligible for FREEZE only when all of the following are true:

~~~text
OPEN_ROOT_CLASS_COUNT = 0
AND
FRESH_SWEEP_1.NEW_ROOT_CLASS_DEFECT = 0
AND
FRESH_SWEEP_2.NEW_ROOT_CLASS_DEFECT = 0
AND
PACKAGE_SPECIFIC_ACCEPTANCE = PASS
AND
GLOBAL_LOCKED_INVARIANT_SUITE = PASS
=> FREEZE_ELIGIBLE
~~~

A fresh sweep uses current source/runtime, representative natural interactions, and the required role/tenant/responsive layers for that capability. It must not be a replay of identical implementation examples.

The freeze record contains:

~~~text
FreezeRecord {
  capabilityContractId,
  independentlyTestableCapabilityOrSurfaceKey,
  contractVersion,
  applicableRoleTenantVariantSet,
  milestoneId,
  sweep1Evidence,
  sweep2Evidence,
  sourceIdentity,
  runtimeIdentity,
  closedRootClasses,
  newRootClassCount,
  frozenAt,
  reopenCriteria
}
~~~

If a relevant canonical owner, authority boundary, or capability-contract version changes between sweep 1 and sweep 2, the sweep pair must restart from sweep 1. An unrelated repository change does not invalidate a proven sweep when current ownership, impact, and identity evidence proves that the capability contract is unaffected.

FREEZE means:

- no broad rediscovery;
- no speculative reopening;
- no repetitive re-testing without cause;
- later work consumes the contract rather than redefining it.

A frozen capability may reopen only for:

- CONCRETE_REGRESSION;
- SECURITY_KVKK_DEFECT;
- CANONICAL_CONTRADICTION;
- DEPENDENCY_INVALIDATION.

The reopen record must identify the evidence that invalidated the freeze and return the capability to one active frontier. A new user preference or a broader future capability is not, by itself, a regression of a frozen capability.

## 9. AI holdout/unseen model

AI and Sefer Abi behavior is accepted by semantic behavior class, not by the phrases used during implementation.

Maintain two logically separate corpora:

1. **Development corpus:** examples used while developing or debugging the interpreter.
2. **Holdout corpus:** unseen natural paraphrases withheld from production-source edits and used only for acceptance.

The holdout corpus must cover applicable explicit intent, continuation, referent, task resume, ambiguity, recovery, wrong screen/tab, stale state, unauthorized entity, genuine OOS, target grounding, and no-write behavior.

Acceptance requirements:

- the holdout resolves to the same canonical behavior class as the development example;
- no production source phrase branch is added for the holdout phrase;
- semantic outcome, authorization, grounding, target, next step, and write boundary are correct;
- negative controls remain negative;
- PHRASE_PATCH_COUNT = 0.

Phrase lists may exist in tests, fixtures, documentation, and holdout corpora. Growing application-code synonym dictionaries are not an acceptable architecture.

A holdout failure is a red proof for the existing behavior class first. It is not permission to add the exact phrase to production code.

## 10. Single active frontier model

At any moment there is exactly one EXECUTING_ACTIVE_FRONTIER. There are never two simultaneously active execution frontiers.

The conceptual state is:

~~~text
ActiveFrontier {
  milestone,
  phase,
  activeFrontier,
  activeRootClass,
  blocker,
  nextIfGreen,
  productState,
  evidenceHarnessState,
  repositoryClosureState,
  owner,
  evidencePaths,
  updatedAt
}
~~~

Every newly discovered issue is classified:

- **A. SAME_ROOT / CURRENT_SCOPE:** remains in the current package and can be handled without changing its goal.
- **B. DIFFERENT_ROOT / DIFFERENT_SCOPE:** enters the observed backlog with an owner and does not expand the current package.
- **C. SECURITY/FOUNDATION STOP-THE-LINE:** the previous execution frontier becomes SUSPENDED and the stop-the-line frontier becomes the one ACTIVE frontier. When the interruption closes, the suspended frontier can resume or be reclassified; it is never concurrently active.

The active frontier is not the same as the whole backlog. A backlog item cannot be worked in parallel as an untracked second frontier.

## 11. Milestone Contract model

Every remaining milestone begins with one durable Milestone Contract. The contract is an extension of the existing milestone registry and roadmap owners; it is not a new roadmap.

Required fields:

~~~text
MilestoneContract {
  milestoneId,
  lifecycleStatus: "DRAFT" | "ACTIVE" | "FREEZE_ELIGIBLE" | "FROZEN" | "CLOSED",
  goal,
  nonGoals,
  inputCapabilityContracts,
  outputCapabilityContracts,
  canonicalOwners,
  newCapabilities,
  existingInvariants,
  behaviorClasses,
  canarySurfaces,
  realUserScenarios,
  responsiveRequirements,
  publicRuntimePolicy: "PUBLIC_REQUIRED" | "PUBLIC_NOT_APPLICABLE",
  publicRuntimeRequirements,
  writeApprovalBoundary,
  freezeCriteria,
  reopenCriteria,
  closureRequirements
}
~~~

Additional governance metadata should include current phase, active frontier, root-class attempt history, source/runtime identity rules, and evidence locations.

A governed delta is required when scope, owner, invariant, write boundary, or closure requirement changes. The delta records the old value, new value, reason, evidence, and approver. A new finding alone does not amend the contract.

Capability and milestone contract lifecycle is explicit: DRAFT -> ACTIVE -> FREEZE_ELIGIBLE -> FROZEN -> CLOSED. A contract is not CLOSED because its design is written or because a downstream target is described. M18 Conversation Core / semantic contract is currently an ACTIVE target/output contract under M18 work, not a CLOSED dependency. A later milestone may consume an earlier contract as canonical only after that contract's required closure state is proven.

Each contract declares one public-runtime policy. If the policy is PUBLIC_REQUIRED and the public layer is unavailable, the acceptance state is ENVIRONMENT_BLOCK and no freeze claim is permitted. PUBLIC_NOT_APPLICABLE is valid only when the contract explicitly proves that public runtime is not an applicable acceptance layer; its minimum equivalent proof is same-source canonical runtime, real browser/device behavior, required responsive acceptance, and applicable role/tenant negatives. Lack of availability must never be converted silently to PUBLIC_NOT_APPLICABLE.

## 12. Behavior-class testing model

Testing uses two layers:

### A. Deterministic inventory coverage

Inventory every canonical product element or capability that must be known, including role, tenant/entity context, route, menu, submenu, disclosure, tab, section, card, control, field, modal/drawer, business function, purpose, preconditions, invalid/error state, recovery, workflow state, transition, next step, safe action, and write/approval boundary where applicable.

Inventory coverage proves that the element/capability is represented and owned. It does not prove every natural-language behavior.

### B. Representative behavior-class acceptance

Select representative cases for:

- explicit intent;
- continuation and task resume;
- entity referent and ambiguity;
- wrong screen/tab and stale state;
- unauthorized entity and tenant negative;
- genuine OOS;
- unseen paraphrase;
- recovery/user error;
- target grounding and exact DOM identity;
- responsive/occlusion behavior;
- read-only/no-write boundary.

Do not build a Cartesian matrix of every control × every phrase × every viewport × every state. The class matrix must explain why each representative case covers a shared rule and what remains intentionally sampled.

## 13. Canary/expansion model

A shared-code change is not globally proven merely because the owner is shared. Rollout is:

~~~text
CANONICAL OWNER TEST
  -> REPRESENTATIVE CANARY SURFACE
  -> SECOND DIFFERENT SURFACE
  -> DESKTOP/MOBILE OR REQUIRED RESPONSIVE PARITY
  -> BROADER MATRIX
~~~

The first canary must exercise the concrete red proof. The second surface must differ in role, route, state, or product domain. Responsive proof is required when presentation or geometry can affect the behavior. Broader matrix work starts only after the prior layer is green.

If the second surface exposes a different root class, it enters the observed backlog or becomes the new bounded frontier according to the single-frontier rule; it does not silently expand the first package.

## 14. Product/evidence/repo state separation

Maintain three distinct state ledgers conceptually and in reports:

| Ledger | Meaning | Examples |
| --- | --- | --- |
| PRODUCT_STATE | Current product behavior and semantic/runtime truth | Product defect, product pass, safe write boundary, runtime source identity |
| EVIDENCE_HARNESS_STATE | Whether the check, fixture, browser, screenshot, or evidence package is valid | stale report, false pass, harness defect, environment block, evidence contradiction |
| REPOSITORY_CLOSURE_STATE | Ownership, current-head, docs sync, staging, commit, tag, push, and remote parity | owned delta, unowned delta, dirty worktree, committed-head validation |

A product may be correct while the harness is wrong. A harness may be green while the product UI is wrong. A repository may be dirty while current-source semantic proof is valid. Final milestone closure still requires all applicable closure states green.

Reports must print these ledgers separately and must not convert a harness failure into a runtime semantic outcome. HARNESS_FAILURE is evidence state, not product behavior.

## 15. Cross-milestone capability contracts

Closed milestones expose durable contracts consumed by later milestones. A later milestone may extend a contract through a governed delta, but may not silently redefine its authority or boundary.

The current roadmap contracts are:

| Milestone | Contract status | Consumes/provides |
| --- | --- | --- |
| M18 | ACTIVE target/output contract | Defines Sefer Abi canonical semantic request, task/entity continuity, authorized guided interaction, exact target grounding, read-only/no-business-write boundary, responsive guidance, and visible-language safety. It is not a CLOSED dependency in this design stage. |
| #19 | DRAFT/future contract | Will consume M18 only after the required M18 closure state is proven, then add natural-language form/action preparation without redefining M18 authorization or enabling business writes. |
| #20 | DRAFT/future contract | Will consume the closed prior contracts and add operational planning/optimization or disruption preparation under its own acceptance. |
| #21 | DRAFT/future contract | Will consume closed prior contracts and own controlled safe action, approval, and execution boundaries. |
| #22–#29 | DRAFT/future contracts | Will consume the same closed task/entity/authorization backbone for voice capabilities; they do not create a parallel assistant state. |
| #30–#33 | DRAFT/future contracts | Will consume closed backbone contracts for proactive/agentic behavior with explicit opt-in and safety contracts. |
| #39 | DRAFT/future contract | Owns exhaustive all-role integrated E2E acceptance; earlier milestones do not claim its coverage. |

These ownerships are taken from the current roadmap and capability map. This design does not start or implement any later milestone.

## 16. Global invariant integration

GLOBAL_LOCKED_INVARIANT_SUITE remains the background stop-the-line mechanism. This operating system does not redesign its registry, status semantics, phase applicability, or violation ledger.

The normal bounded package condition remains:

~~~text
PACKAGE_SPECIFIC_ACCEPTANCE = PASS
AND
GLOBAL_LOCKED_INVARIANT_SUITE = PASS
~~~

If an applicable invariant fails, is unproven, has a coverage gap, has an unknown owner, or is contradicted, stop and report its canonical INVARIANT_ID and SUBRULE_KEY. A package may not hide a due-now failure by moving it to a later phase or by creating a duplicate rule.

Subject to duplicate audit during later adoption, these rules belong under one coherent durable umbrella family: EXECUTION-GOVERNANCE-BOUNDED-PROGRESS.

| Subrule key | Required meaning |
| --- | --- |
| ROOT_CLASS_REPEATED_AFTER_TWO_ATTEMPTS_ESCALATES | A third recurrence becomes ARCHITECTURAL_REVIEW_REQUIRED; no third micro-patch. |
| TWO_FRESH_SWEEPS_ZERO_NEW_ROOT_FREEZE | Two independent fresh sweeps with zero new root classes make a capability/surface freeze-eligible. |
| AI_HOLDOUT_REQUIRED_WHERE_APPLICABLE | AI/semantic behavior requires unseen/holdout acceptance and PHRASE_PATCH_COUNT = 0. |
| SINGLE_ACTIVE_FRONTIER | Exactly one EXECUTING_ACTIVE_FRONTIER exists at all times; a security/foundation stop suspends the prior frontier and becomes the sole active frontier. |

These are proposed subrules, not registry edits. They must not be forced into unrelated product or security families, and they are not four separate invariant families. Registration is a later governed change after duplicate audit and owner assignment; no registry edit is part of this design-only document.

## 17. 40-step closure integration

The existing 40-step master closure plan remains canonical and unchanged.

The layers have different purposes:

- **Bounded execution loop:** daily/package work from red proof to close/freeze.
- **Surface/capability freeze:** two fresh zero-root-class sweeps protect a stable capability from rediscovery loops.
- **Milestone product acceptance:** behavior corpus, real-user acceptance, responsive/device and required public-runtime evidence.
- **40-step closure chain:** final milestone closure, durable state/document synchronization, ownership/current-head validation, staging, commit, immutable tag, push, and remote SHA parity.

The 40-step chain is not required in full for every bounded package. A bounded package still runs the applicable focused checks and global invariant gate. Later closure phases remain registered and are due only when their lifecycle phase begins.

## 18. Repository artifact ownership

The design prefers extending existing canonical owners. It does not authorize new files or enforcement yet.

| Required artifact | Recommended canonical owner/path | Design decision |
| --- | --- | --- |
| A. Project Execution Contract | docs/PRIMER_SSOT.md, linked from docs/INDEX.md | Add a concise execution-loop reference; the detailed architecture remains this spec. No parallel project contract. |
| B. Milestone Contract Template | docs/MILESTONE_REGISTRY_V1.md | Add a standard contract block for future milestones; keep historical compatibility ordering intact. |
| C. Active Frontier / Freeze Ledger | docs/NEXT_BACKLOG_V1.md is the sole ACTIVE_FRONTIER owner; docs/MILESTONE_REGISTRY_V1.md owns Milestone Contract and Freeze provenance | Use versioned fenced machine-readable blocks in these existing owners if needed. Do not duplicate the complete ACTIVE_FRONTIER record in two SSOTs. Other documents reference its canonical identity. |
| D. Agent/Codex onboarding reference | docs/STARTPACK_V1.md and docs/AGENTS.md, indexed by docs/INDEX.md | Add the resume-from-frontier and no-broad-rediscovery rules to existing onboarding. |
| E. Locked invariant/subrule registration | docs/LOCKED_INVARIANT_REGISTRY_V1.json and the existing violation ledger | Register only after duplicate audit and owner assignment; do not copy rules into a new registry. |
| Evidence/harness state | Existing package manifests, check outputs, and evidence ledgers owned by the relevant milestone | Keep evidence state separate from product state; do not create one universal PASS ledger. |
| Ownership/current-head | backend/scripts/lib/milestoneOwnershipAuthority.js and the active milestone manifest | Preserve exact path identity and active milestone semantics. |
| Closure chain | Existing M90/M91/M92 closure docs, package.json, and verify:final | Keep the current 40-step owner and command topology. |

Use versioned fenced machine-readable blocks in the existing owners if automation needs them. PROJECT_EXECUTION_STATE_V1.json is not introduced by default.

## 19. Agent/Codex onboarding behavior

A new Codex or agent session starts from the existing reading order, then resumes the one frontier:

1. Read docs/AGENTS.md and docs/STARTPACK_V1.md.
2. Read docs/INDEX.md, docs/PRIMER_SSOT.md, docs/MILESTONE_REGISTRY_V1.md, docs/NEXT_BACKLOG_V1.md, and the applicable invariant registry/ledger.
3. Read the latest package evidence and the current ACTIVE_FRONTIER record.
4. State the current milestone, phase, root class, blocker, owner, and next-if-green before using tools.
5. Do not broad-rediscover the repository unless a permitted reopen reason exists.
6. Classify every new finding as SAME_ROOT/CURRENT_SCOPE, DIFFERENT_ROOT/BACKLOG, or SECURITY/FOUNDATION STOP-THE-LINE.
7. Keep product, evidence/harness, and repository closure status separate in updates.
8. Stop at the requested boundary; do not commit, tag, push, start #19, or close a milestone unless explicitly authorized.

This behavior is an onboarding contract, not a second task-state system.

## 20. Automation opportunities

Future enforcement should extend existing checks instead of creating one checker per phrase or per document:

- active-frontier shape and single-frontier validation;
- Milestone Contract required-field validation;
- root-class attempt count and third-repeat escalation;
- two-fresh-sweep freeze eligibility and reopen evidence;
- holdout corpus provenance and PHRASE_PATCH_COUNT enforcement;
- product/evidence/repository ledger separation;
- milestone capability-contract compatibility;
- invariant registration duplicate/owner audit;
- closure-phase applicability against the existing 40-step chain.

Candidate implementation owners are backend/scripts check-chain infrastructure, docs/LOCKED_INVARIANT_REGISTRY_V1.json, existing milestone ownership utilities, and package manifests. No automation is implemented by this document.

## 21. Failure/escalation policy

| Situation | Required classification | Action |
| --- | --- | --- |
| Same root class, first or second bounded attempt | SAME_ROOT / CURRENT_SCOPE | Continue only within the contract. |
| Same root after two independent attempts | ARCHITECTURAL_REVIEW_REQUIRED | Stop micro-correctives; review authority/state/interface architecture. |
| Different root or scope | DIFFERENT_ROOT / DIFFERENT_SCOPE | Record in observed backlog; do not expand current package. |
| Security, KVKK, authorization, tenant, or locked-invariant failure | SECURITY/FOUNDATION STOP-THE-LINE | Interrupt according to canonical global policy and preserve prior frontier. |
| Stale evidence or harness failure | EVIDENCE_HARNESS_STATE failure | Repair/regenerate evidence or harness; do not call it a product semantic result. |
| Runtime/source mismatch | STALE_RUNTIME or RUNTIME_SOURCE_MISMATCH | Realign or stop; never fabricate acceptance. |
| Environment unavailable | ENVIRONMENT_BLOCK | Stop the affected acceptance layer; retain the current product claim as unproven. |
| Canonical contradiction | CANONICAL_CONTRADICTION | Stop and reconcile the owner before further implementation. |

No escalation category permits silently deleting evidence, weakening a gate, or changing scope without a governed delta.

## 22. Risks/trade-offs

| Risk | Mitigation |
| --- | --- |
| Governance becomes bureaucracy | Reuse existing documents/checks; one frontier and one contract per milestone. |
| Freeze hides a rare defect | Require two fresh sweeps, record source/runtime identity, and retain concrete reopen criteria. |
| Holdout acceptance becomes phrase accounting | Measure semantic classes and outcomes; forbid production phrase patches. |
| Third-repeat rule delays a useful small fix | Permit an approved material architectural change to open a new architecture epoch while preserving immutable lifetime history and lifetime attempt counters. |
| A backlog grows without ownership | Every different-root item receives owner, evidence, and next review phase. |
| Product and repository status are conflated | Maintain three separate ledgers and report them separately. |
| Machine-readable state creates a duplicate SSOT | Prefer existing milestone/backlog owners; require approval for any companion JSON. |
| Future milestone contracts drift | Require governed delta and cross-milestone contract compatibility. |

## 23. Migration/adoption for current M18

This document does not reopen or rework M18. Adoption is documentation/procedure only:

1. Treat the current M18 milestone and its existing ownership manifest as the current contract source.
2. Record the latest concrete M18 result as the single ACTIVE_FRONTIER, not as a broad rediscovery invitation.
3. Classify prior repeated corrective families into root-class history without rewriting historical evidence.
4. Apply the two-sweep freeze rule only to future fresh sweeps; do not backdate a freeze from incomplete historical evidence.
5. Keep existing M18 no-write, role/tenant, semantic, guided-target, and global-invariant boundaries intact.
6. Use the existing M18 package/check/evidence owners; do not create an M18 governance parallel.
7. Do not start #19 as part of adoption.

Any documentation or registry update required to adopt this design is a later governed change and is not performed here.

## 24. Adoption for the remaining roadmap

Before a later milestone begins:

1. Create or update its Milestone Contract in the existing milestone registry.
2. Declare input/output capability contracts and the exact previous contracts it consumes.
3. Declare behavior classes, canaries, responsive/public requirements, write/approval boundaries, freeze/reopen criteria, and closure requirements.
4. Set one ACTIVE_FRONTIER and one root class.
5. Run the bounded loop and canary expansion.
6. Require unseen/holdout acceptance for AI behavior where applicable.
7. Close or freeze only after the applicable package and global gates are green.
8. Hand the durable capability contract to the next milestone without silently redefining it.
9. Leave the 40-step final closure requirements to the milestone’s actual closure phase.

The current roadmap remains the source of milestone ordering and ownership. This design does not authorize #19, #20, #21, or any later implementation.

## 25. Acceptance criteria

The design is ready for human review only when its future operating rules are explicit and internally consistent:

1. The bounded execution loop is defined from red proof through close/freeze.
2. Third repetition of the same root class in one architecture epoch escalates to ARCHITECTURAL_REVIEW_REQUIRED without resetting lifetime history.
3. Freeze eligibility requires OPEN_ROOT_CLASS_COUNT = 0, two fresh zero-root-class sweeps, PACKAGE_SPECIFIC_ACCEPTANCE = PASS, and GLOBAL_LOCKED_INVARIANT_SUITE = PASS.
4. AI behavior requires unseen/holdout acceptance where applicable and PHRASE_PATCH_COUNT = 0.
5. Exactly one EXECUTING_ACTIVE_FRONTIER is represented; a security interruption suspends the prior frontier and activates the stop-the-line frontier.
6. Milestone Contract fields cover the complete bounded scope and closure boundary.
7. Behavior-class testing replaces Cartesian brute-force expansion.
8. Shared changes use owner/canary/second-surface/responsive/broader expansion.
9. Product, evidence/harness, and repository closure states remain separate.
10. Cross-milestone capability contracts use explicit DRAFT/ACTIVE/FREEZE_ELIGIBLE/FROZEN/CLOSED status and only CLOSED contracts are canonical dependencies.
11. The existing locked-invariant suite remains the stop-the-line gate.
12. The existing 40-step closure chain remains unchanged and phase-aware.
13. Recommended artifact owners are identified without creating duplicate SSOTs.
14. No product implementation, enforcement, roadmap reorder, commit, tag, push, #19 start, or milestone closure occurs in this design-only stage.

## 26. Open questions

No architectural decision remains unresolved in this bounded revision. The following are implementation-level approvals for a later adoption task, not open architecture:

- exact fenced-block syntax and parser placement inside the existing milestone/backlog owners;
- exact check-chain command and evidence filenames;
- final duplicate-audit result before registering EXECUTION-GOVERNANCE-BOUNDED-PROGRESS;
- exact retention of root-class and freeze evidence within existing package artifacts.

Those details require human review before enforcement or registry changes, but they do not alter the resolved ownership, lifecycle, frontier, freeze, public-runtime, or escalation contracts.

## Human review boundary

This document is a design/specification artifact only. It does not implement any rule, modify product behavior, create a check, alter existing milestone ordering, start #19, or perform commit/tag/push/closure work.
