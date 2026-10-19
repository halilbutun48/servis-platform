# AGENTS.md

## Repository governance entrypoint

Before any bounded work in this repository, read [`docs/AGENTS.md`](docs/AGENTS.md). It is the detailed, canonical execution-governance instruction for all milestones and platforms.

The canonical state owners remain unchanged:

- `docs/NEXT_BACKLOG_V1.md` owns the executing active frontier.
- `docs/MILESTONE_REGISTRY_V1.md` owns milestone contracts and freeze provenance.
- `docs/PRIMER_SSOT.md` is the canonical living product/execution primer.
- `docs/LOCKED_INVARIANT_REGISTRY_V1.json` and its violation ledger own locked-invariant status.

Do not create a competing governance registry, state owner or platform-specific interpretation of these rules. Preserve the current repository/source precedence, locked product and security decisions, immutable evidence, and the existing 40-step closure chain.

The standing conditional local `personel_api` restart policy is defined in `docs/AGENTS.md`; it is not permission to restart production, Docker Desktop, databases, other services, or to start a second backend.

## Permanent acceptance boundaries

- A checker or code GREEN result alone is not product acceptance; claims require current backend/frontend, real Chromium/mobile, role/tenant and semantic user-visible evidence.
- Product work follows `user need → working product behavior → real user/browser acceptance → durable regression → security and milestone closure`; checker expectations validate that behavior and never replace the product requirement.
- Package acceptance, ROOM D-Level acceptance, M18 closure and final product acceptance remain separate decisions.
- Do not reopen proven-closed work without concrete regression evidence; resolve proven defects at the smallest structural canonical owner.
- No external LLM/API/SDK or unauthorized action is allowed. Product/runtime business writes remain bounded by role, tenant, approval and milestone contracts. Verified demo/test data preparation is permitted only after the target database is proven non-production/demo/test and the operation is authorized, minimum, idempotent, traceable and performed through canonical seed/fixture/domain mechanisms; it must not touch real customer/production data, reset/drop/reseed the database, bypass authorization/KVKK, or perform uncontrolled edits. Operations requiring user approval must not be applied silently.
- Preserve the user's dirty worktree: tracked, untracked and relevant ignored worktree files belong to the user unless explicit scope says otherwise. Do not use destructive reset, clean, checkout, restore or overwrite operations without explicit authorization; do not delete another active task's changes, and do not commit, tag or push without user instruction.
- Keep the existing 40-step roadmap and its state owners; stable rules belong here and changing progress belongs in `docs/NEXT_BACKLOG_V1.md`.
- Keep total monthly infrastructure cost within 15,000 TL.

## Permanent product-first anti-checker-loop lock

The existing Permanent acceptance boundaries and K anti-loop rule are binding: checker results support regression protection and do not replace real Turkish user/browser acceptance.

The D-Level order is locked: ROOM → COMPANY → SCHOOL → ORGANIZATION → DRIVER → PERSONEL → PARENT → SUPER_ADMIN → integrated eight-role real-user acceptance. General checker/harness reliability review, calibration, consolidation or retirement assessment belongs to the #18 final stage after those role acceptances, not before them. An unrelated checker failure must not block bounded real-user D-Level work; concrete security, tenant, KVKK, data-integrity or directly related product regressions remain immediate exceptions.

Bounded D-Level work follows: **bulk detection → root-cause grouping → bounded corrective → targeted regression → combined real Chromium/public acceptance → baseline**. Long work is split into 3–5 durable checkpoints with exact scenario IDs. Every new task must name the open user task or mandatory security gate it closes; otherwise it does not displace the active role acceptance. Existing checkers and proven PASS evidence remain intact, while unrelated failures stay visible for the #18 final calibration backlog without triggering a new general audit loop.

## ROOM M18 functional-scope and immutable-baseline boundary

`ROLE FUNCTIONAL 10/10` is based on complete real-function coverage, not a historical fixed test count. For ROOM, every mandatory reachable function must have a unique traceable acceptance ID, explicit acceptance criteria, canonical owner, real user purpose, expected visible result and valid current public Chromium/mobile evidence. Every function must be classified as `PRODUCT_PASS`, `MERGED_ALREADY_PROVEN`, `OWNER_APPROVED_DE-SCOPE`, `PRODUCT_FAIL`, `PRODUCT_GAP`, `REQUIRED_NOT_PROVEN` or `SECURITY_BLOCK`; `ROOM FUNCTIONAL 10/10` must not be declared while any mandatory function remains `PRODUCT_FAIL`, `PRODUCT_GAP`, `REQUIRED_NOT_PROVEN`, `SECURITY_BLOCK` or has an open regression. Checker GREEN cannot replace real Chromium acceptance. All reachable authorized surfaces and unauthorized negative boundaries remain in scope; a historical count may not be used to omit a real function.

The historical ROOM 132-cell formula and 69 `NOT_PROVEN` records remain immutable audit history. They must not be deleted, silently converted to PASS, or bulk-merged without a traceable canonical function decision. Historical aliases, duplicate cells and owner-approved de-scope decisions remain separately recorded and do not create synthetic PASS rows.

After ROOM FUNCTIONAL 10/10 is proven, and before COMPANY acceptance begins, bind the ROOM closure baseline to the canonical source/runtime identity, the unique functional acceptance manifest, public Chromium and mobile PASS evidence, demo-data and tenant-security references, durable regressions and integrity hashes for the evidence files. Do not mutate closed historical acceptance evidence; append later results as versioned evidence. When COMPANY or a later role changes shared sources, preserve the directly affected ROOM behaviors and reaccept them before that later role closes if a concrete regression is found.

For every bounded change, inspect the relevant worktree state before editing and preserve unrelated active-task changes. No destructive reset, clean, checkout, restore or overwrite is permitted without explicit scope and authorization.

## SEFERPAKT — MANDATORY 8-ROLE FUNCTIONAL ACCEPTANCE STANDARD

This standard applies to ROOM, COMPANY, SCHOOL, ORGANIZATION, DRIVER, PERSONEL, PARENT, and SUPER_ADMIN.

A role is not FUNCTIONAL 10/10 merely because its API tests or checkers are GREEN.

### A. Complete surface coverage

For each role, enumerate the complete interface tree reachable from the current source and real browser:

- main and submenus;
- pages, tabs and subtabs;
- accordions, disclosures, drawers, modals and popovers;
- tables, lists, filters, search and record details;
- selected-record context and authorized action controls;
- dynamic content and suggested-question chips;
- empty, populated, loading, error, stale and unauthorized states;
- responsive and mobile behavior.

Map every reachable surface to acceptance evidence. If the predefined manifest is narrower than the actual UI tree, complete the coverage. An authorized surface may not be omitted; an unauthorized surface must be covered by a negative test.

### B. 100% of suggested questions

Every suggested-question chip displayed for each tested role, screen and record context must be checked. Each chip must be contextually appropriate, answer the actual question in understandable Turkish, use authorized current data, reveal or open the real DOM target when needed, preserve role and tenant boundaries, update when the screen or selected record changes, fail safely on stale context, and provide a useful user result.

Report displayed chips and tested context combinations numerically. One incorrect or unsafe chip blocks the applicable acceptance.

### C. Turkish natural-language acceptance

Important user tasks must be tested with realistic Turkish variants, including short, long, incomplete, contextual, synonymous, conversational and follow-up requests. Cover, as applicable:

- Bunu göster.
- Bunun ayrıntısını aç.
- Buradan hangileri oluşmuş?
- Adım adım anlat.
- Devam.
- Geri.
- Önceki adıma dön.
- Bulamadım.
- O menü yok.
- Neden böyle?
- Nasıl yapacağım?

Ambiguous requests must not invent a record or target; use safe clarification or recovery.

### D. Required end-to-end function chain

Every important user task must be validated as one chain:

`ANLA → BAĞLAMI KORU → ANLAT → GÖSTER → YÖNLENDİR → YETKİLİ UYGULA`

- **ANLA:** resolve intent, operation, object and scope correctly.
- **BAĞLAMI KORU:** preserve active tenant, role, screen, selected record and task step.
- **ANLAT:** provide an accurate, clear Turkish answer grounded in authorized evidence.
- **GÖSTER:** find and visibly identify the real UI target when required.
- **YÖNLENDİR:** open the correct menu, tab and record; Devam, Geri and Bulamadım must use real task state.
- **YETKİLİ UYGULA:** perform only the operation allowed by the milestone. Critical or unauthorized commercial actions must not happen silently.

Within M18, application is limited to permitted guidance and UI actions; later #19 and #20 operations are not forced into M18. Intent labels, HTTP 200, answer text or a highlight alone are not acceptance; the user-visible task result is required.

### E. Demo-data readiness

For each critical function, cover the meaningful available cases: a populated positive case, empty result, multiple records or relations, missing or ambiguous data, selected-record changes, role and tenant negatives, and domain-specific statuses.

Missing data cannot be reported as PASS. Reuse existing demo fixtures first. If data is genuinely missing, prepare only a minimum, idempotent, isolated fixture plan. Any new database write requires the existing authorization and approval boundary; no destructive reset, reseed or uncontrolled edit is allowed, and real customer data is not used.

### F. Real browser and device evidence

On the same-source canonical runtime, verify real Chromium, desktop, 1024px, 390px mobile, 320px mobile, real DOM/target transitions, drawer/modal/accordion interactions, horizontal overflow and blocked touch targets, and a representative same-build public/tunnel environment.

Do not treat a result as PASS for a new source until loaded runtime identity matches the source identity.

### G. Security

For every role, test with real negatives: role and tenant isolation; unauthorized screen and record access; financial and personal-data leakage; selected-record confusion; stale-target behavior; unauthorized write actions; and critical-operation approval boundaries.

A real security defect cannot be deferred.

### H. Durable regression protection

Add every real product defect to the applicable existing regression scope. Preserve the exact source, runtime and evidence baseline for an accepted role. When a later role changes shared sources, rerun the affected prior-role regressions. A PASS from an older source is not automatically valid for a new source.

### I. Two-stage acceptance

**ROLE FUNCTIONAL 10/10:** all required role functions, natural-language tasks, suggested questions, real browser/DOM behavior, mobile behavior, demo-data readiness, real security and regression protections PASS; each mandatory function has a unique traceable ID, explicit criteria, canonical owner and current evidence, with no open `PRODUCT_FAIL`, `PRODUCT_GAP`, `REQUIRED_NOT_PROVEN`, `SECURITY_BLOCK` or regression.

**M18 FORMAL CLOSED:** after all eight roles are complete, strict global KVKK, SHA/identity, ownership, provenance, repository hygiene and all mandatory final governance gates PASS.

Historical identity and hygiene reconciliation may remain for the final stage, but real security and authorization defects may never be deferred. FUNCTIONAL 10/10 does not mean FORMAL CLOSED.

### J. Acceptance reporting

Every role's final report must include at least: total/reached/missing surfaces; suggested-question total/PASS/FAIL; Turkish natural-language tasks; ANLA–UYGULA end-to-end results; demo-fixture readiness; public Chromium and mobile evidence; role/tenant security negatives; durable regression status; ROLE FUNCTIONAL 10/10 result; and M18 FORMAL governance status.

Missing evidence remains NOT_PROVEN; PASS must not be invented.

### K. Anti-loop rule

Resolve real product defects at their structural canonical owner. Do not change correct product behavior to satisfy a wrong checker. Do not silently remove mandatory security or governance gates. Do not create repeated general audit loops for the same evidence and root cause. The same acceptance discipline applies to every role.

This standard does not invalidate acceptance results already proven in the active ROOM work. ROOM must not be declared 10/10 until its missing evidence is complete, and the same standard applies automatically to the other roles.
