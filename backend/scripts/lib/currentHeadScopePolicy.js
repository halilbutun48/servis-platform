import { CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256 } from "./prismaSchemaIdentity.js";
import { CURRENT_CLOSURE_PRODUCT_SOURCE_ENTRIES } from "./pre18LifecycleClassification.js";
import { activeMilestoneCurrentHeadEntries } from "./milestoneOwnershipAuthority.js";

// Historical commercial split-route identity remains separately pinned for
// security review. It is not a current working-tree scope allowlist.
export const CURRENT_HEAD_COMMERCIAL_SPLIT_ROUTE_IDENTITY = Object.freeze([
  {
    path: "backend/src/routes/commercialCore.js",
    sha256: "14D111ADCF9C3005DACF0D7CE246EEA22109B1D2C4EDC4DA9380F2DA0461265F",
  },
  {
    path: "backend/src/routes/commercialCoreRoutes.js",
    sha256: "28CFE870EB4F981B8AFC3AC42C4838C44B5E54EB4A4F95086C0B0134DC109C30",
  },
  {
    path: "backend/src/routes/commercialCorePaymentRoutes.js",
    sha256: "53C908A0C414D73A9BC397DCC89FC1D8DD285AC0D842FD949426911307DFA993",
  },
  {
    path: "backend/src/routes/commercialCorePaymentReportsRoutes.js",
    sha256: "B75677CFBED20166B2DE6CA3DF7068F9591081CEC72EAAC9DEE17BC501F35481",
  },
  {
    path: "backend/src/routes/commercialCoreRoomRoutes.js",
    sha256: "33702851BD305EC69D9C21982B3AC49705CBD75612172992A8AA01163DC9F56B",
  },
  {
    path: "backend/src/routes/commercialCoreRouteData.js",
    sha256: "2DF560872A4B6B94C576DD7DA0610C44F053B1EA494EA57B307BFED5030A5A6C",
  },
]);

// The accepted Sefer Abi / Actionable Events backend-context change has one
// current-head owner. Each record is exact-pinned after bounded authorization,
// tenant, context-isolation and read-only acceptance; this is not a wildcard
// for later backend changes.
export const CURRENT_HEAD_APPROVED_SEFER_ABI_BACKEND_CONTEXT_ACCEPTANCE = Object.freeze([
  {
    path: "backend/src/routes/ai.js",
    sha256: "B9C4EB10AD84B2E631849F825B5CB4D69793F3CD6F28B00889EB9F7149EE961F",
    owner: "PRE_18_SEFER_ABI_ACTIONABLE_EVENTS_BACKEND_CONTEXT_ACCEPTANCE",
  },
  {
    path: "backend/src/services/dashboardBulk.js",
    sha256: "A67C83C15740AA2426F48E852F29A11F75B2EFC35A84A954C9F7137B84D3D02A",
    owner: "PRE_18_SEFER_ABI_ACTIONABLE_EVENTS_BACKEND_CONTEXT_ACCEPTANCE",
  },
  {
    path: "backend/src/ai/chat/conversationTaskStateShared.js",
    sha256: "6BA9366F646AD3C0CCABDACE6143AB72B5D51CEA04090EA6D89C0EBAC0CE8C36",
    owner: "PRE_18_SEFER_ABI_ACTIONABLE_EVENTS_BACKEND_CONTEXT_ACCEPTANCE",
  },
]);

// These service sources were accepted by their bounded PRE-#18 packages and
// are already recorded in the canonical lifecycle registry. Project their
// exact current identities into the current-head route/service scope so the
// roadmap lock consumes the same accepted authority. This remains an exact
// path/hash list; it is not a wildcard or a second identity ledger.
const CURRENT_HEAD_ACCEPTED_SERVICE_PATHS = new Set([
  "backend/src/services/actionableEvents.js",
  "backend/src/services/authorizedProductAwareness.js",
  "backend/src/services/queryPlanExecutor.js",
]);

export const CURRENT_HEAD_APPROVED_CURRENT_ACCEPTED_SERVICE_SOURCES = Object.freeze(
  CURRENT_CLOSURE_PRODUCT_SOURCE_ENTRIES
    .filter(({ path }) => CURRENT_HEAD_ACCEPTED_SERVICE_PATHS.has(path))
    .map(({ path, sha256, owner }) => ({ path, sha256, owner })),
);

// These exact Prisma worktree identities are the accepted ROOM/COMPANY/M18
// fixture and schema changes already recorded in the locked invariant ledger.
// They are a bounded current-head exception, not permission for arbitrary
// future Prisma edits or a production DB write.
export const CURRENT_HEAD_APPROVED_PRISMA_WORKTREE_ENTRIES = Object.freeze([
  { path: "backend/prisma/m18DemoFixtureFoundation.js", sha256: "853DB1EB108D12954C915AC00CE1FD87B0C49FC436C692886A6711694D8292E4", owner: "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01" },
  { path: "backend/prisma/schema/commercial.prisma", sha256: "0CC039A0FB0DB619557DC159176BAD9D74802A8DD5B5344CD24F127D7867A7E7", owner: "ROOM_FINANCE_PRODUCT_ACCEPTED_BOUNDED" },
  { path: "backend/prisma/schema/fleet.prisma", sha256: "3244525182CC94B78D514049D8D1B0BBD44332E82A8B237BD68149CC5922B16B", owner: "ROOM_FINANCE_PRODUCT_ACCEPTED_BOUNDED" },
  { path: "backend/prisma/schema/identity.prisma", sha256: "FDE64B473560443ACC1B0CDC5CEB874E977C4A40016F6B4B9E46034444A19E6A", owner: "ROOM_FINANCE_PRODUCT_ACCEPTED_BOUNDED" },
  { path: "backend/prisma/schema/operations.prisma", sha256: "6B2A1C358B9EBAFE9BB3D3675B38F4DF45CB8A9B9F6FFF74FD52062AFA464A2E", owner: "ROOM_FINANCE_PRODUCT_ACCEPTED_BOUNDED" },
  { path: "backend/prisma/schema/tenant.prisma", sha256: "5D5CE4AB2211D6B9C3935C5C506E83CA380D472D72D3CC91BB0443055A901264", owner: "ROOM_FINANCE_PRODUCT_ACCEPTED_BOUNDED" },
  { path: "backend/prisma/seed.js", sha256: "1C914232F65E1133FDDE0D4A180ABD9E240668AD4C3072BF438B1F5F4D81CDF7", owner: "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01" },
]);

// Screen-context authority has a distinct owner from presentation identity.
// These exact pins were accepted by the bounded route-policy, stale-context,
// Floating/full Copilot and server-hint isolation contract. They do not grant
// future source changes or turn the registry into an authorization authority.
export const CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE = Object.freeze([
  {
    path: "web/src/App.jsx",
    sha256: "1AEEF8F9A4195024E1AB6EA50BF72DDBEA8006226EA4E4E05924739CD8472B52",
    owner: "PRE_18_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE",
  },
  {
    path: "web/src/layout/AppShell.jsx",
    sha256: "2E88DC82822CACAF0CAEB2EAF6B7DDCAD88A7D398E88CACAC4C812E5FA862BFE",
    owner: "PRE_18_SUPER_ADMIN_BOUNDED_FINAL_BACKFILL_01",
  },
  {
    path: "web/src/copilot/routeContext.js",
    sha256: "54F58E779908F254CCE63A2FA088A3FF0B99EB2E29E1FB919FA0C779A334A9ED",
    owner: "PRE_18_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE",
  },
  {
    path: "web/src/copilot/screenRegistry.js",
    sha256: "3FFF110D83CD723FC4528CC2E91F021E1B4318AF028E7107B0BFED95C91F2A81",
    owner: "PRE_18_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE",
  },
  {
    path: "web/src/components/copilot/FloatingCopilotDrawer.jsx",
    sha256: "64DA2F246F0C82048C1C0A829851F461F3C6A0ACF0572A786B7234A8179999BB",
    owner: "PRE_18_SEFER_ABI_FINAL_UX_AND_CHARACTER_STATE_CLOSURE_01",
  },
  {
    path: "web/src/panels/shared/CopilotPanel.jsx",
    sha256: "7A3BD7C6804E4AE852F13629EF57DBDB0C0E8ABC5AA5D64D98542DC3B1978CE3",
    owner: "PRE_18_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE",
  },
  {
    path: "web/src/utils/copilotSharedState.js",
    sha256: "6CBF51EB5118A2310ABB00AD6C1A2627EE34A759E08DD1CFBBF44E2A5E4620B7",
    owner: "PRE_18_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE",
  },
]);

// The backend catalog and service consume only authenticated role/company
// context when validating a client screen hint. Keep these entries separate
// from the preceding Actionable Events acceptance while deriving both through
// the same current-head policy owner.
export const CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_BACKEND_ACCEPTANCE = Object.freeze([
  {
    path: "backend/src/ai/jobGuide/screenCatalog.js",
    sha256: "D77932247CAFA4267508C82B5A48A7C342847517307675619AD459DC02A91F3C",
    owner: "PRE_18_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE",
  },
]);

// The semantic-priority corrective is accepted through this same current-head
// policy owner after its bounded generic-help, role-help, continuation and
// visible-matrix evidence passes. It is exact source identity, not a generic
// allowance for future Sefer Abi changes. The service entry supersedes its
// earlier screen-context-only identity while the frozen screen-context
// behavioural contract remains independently covered by its 29-case check.
// The operation-health profile precedence corrective is included only after
// its focused Company/Super Admin path-selection acceptance passes.
// C1 v3 extends this same bounded family for the accepted start-readiness and
// urgent-risk routing/remap contract. C2 extends it for the accepted
// dynamic-follow-up, clarification, root-cause and direct-status boundaries;
// it remains an exact identity list.
export const CURRENT_HEAD_APPROVED_SEFER_ABI_SEMANTIC_REASONING_ACCEPTANCE = Object.freeze([
  {
    path: "backend/src/ai/service.js",
    sha256: "186DEAE407BCB7396C630860D5AD73D66113AED652424080D6CC371D6773975C",
    owner: "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE",
  },
  {
    path: "backend/src/ai/chat/canonicalSemanticRequest.js",
    // Immutable PRE-18 identity; M18 records the superseding current source
    // separately in its active ownership manifest.
    sha256: "7C39D5F458FBAB8F86E105722197298ECE8045BF0872F8DA9C967321C1C5E252",
    owner: "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE",
  },
  {
    path: "backend/src/ai/chat/conversationRouting.js",
    sha256: "A94722550C797BDD7B5C1B27B1CE730362D0A3CA8EB47676DAE18E38944BB565",
    owner: "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE",
  },
  {
    path: "backend/src/ai/chat/semanticIntentPlanner.js",
    sha256: "B447E3A60924156CDA74A35471BB45AB719634ECD1ED7E8CD03ACB81865DE583",
    owner: "PRE_18_PERSONEL_LOCATION_SIGNAL_SEMANTIC_VOCABULARY_REGRESSION_CORRECTIVE_01",
  },
  {
    path: "backend/src/ai/chat/intentRouter.js",
    sha256: "CD3B0853320C2773D5CCD42CD8050CF5B84608FC83F18D9A9F110989C1291B9F",
    owner: "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE",
  },
  {
    path: "backend/src/ai/chat/helpComposer.js",
    sha256: "3663D4C15879691ED0486D67C522F0C432BE7F1C2E9709E58ED21E289D056A58",
    owner: "PRE_18_FINAL_VERIFY_FOUNDATION_TRIPLE_RESIDUAL_CLOSURE_01",
  },
  {
    path: "backend/src/ai/chat/conversationTaskStateClarifiers.js",
    sha256: "75F6BC7CA7B9D38E0F4CE7F79A320F6FBBD30B1DC4FA36326E73A3ADF6CA21E7",
    owner: "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE",
  },
  {
    path: "backend/src/ai/chat/conversationTaskStateBuilders.js",
    sha256: "510A9D7D7FA6B9F1EAA771238A3FDD31DF258C0B1651C4A090D402A6D2ACB1F2",
    owner: "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE",
  },
  {
    path: "backend/src/ai/chat/seferAbiReasoningAssistant.js",
    sha256: "5CE69B34F73017E4004D2CC0A333D4C3B8F1B57AED6F3009C0D25E35DC9A6169",
    owner: "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE",
  },
  {
    path: "backend/src/ai/chat/conversationOperationHealthEngine.js",
    sha256: "DA78F288FFD4C660A5865600094FE3E1D0221A34642B2A66F832EBFDF98045E8",
    owner: "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE",
  },
]);

// Frozen PRE-#18 working-tree scope. These identities remain historical
// evidence of the immutable closure; they are not a requirement that those
// paths stay dirty after PRE-#18 is committed.
export const PRE18_HISTORICAL_CONCURRENT_BACKEND_DIFF = Object.freeze([
  {
    path: "backend/scripts/lib/pre_18_authenticated_role_context.mjs",
    sha256: "A456E01013C39585395FB45A521CF3DF6412757319FC24FE26C63BFAC9BE9315",
    owner: "PRE_18_FOUNDATION",
  },
  // Current working-tree driver-create correction: connect the required
  // Prisma room relation and omit an empty optional device value. Keep exact
  // identity pinning; this does not expand authorization or tenant scope.
  {
    path: "backend/src/routes/drivers.js",
    sha256: "4B67CAC108E04C7AC326CFE5B50E825597C106947AD6B8FD4198C18EA25762C5",
  },
  {
    path: "backend/src/services/agreementSourceLineageService.js",
    sha256: "6B411A750AF66EC684D42D33D2771371840DEEC09F931500341D33F8A361C511",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
  },
  {
    path: "backend/src/services/paymentBackbone.js",
    sha256: "D113CA27FA50F74D82E79FF0A5502F0CEFF1916CEEC879799261CFF7ED6F39A3",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
  },
  {
    path: "backend/src/routes/commercialCorePaymentReportsRoutes.js",
    sha256: "B75677CFBED20166B2DE6CA3DF7068F9591081CEC72EAAC9DEE17BC501F35481",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
  },
  {
    path: "backend/src/routes/trustQuality.js",
    sha256: "0E2358DAA468D205DAC92CFF6E01BA4CE3FD3E89350505BE6DF704882C6A8FBD",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
  },
  ...CURRENT_HEAD_APPROVED_SEFER_ABI_BACKEND_CONTEXT_ACCEPTANCE,
  ...CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_BACKEND_ACCEPTANCE,
  ...CURRENT_HEAD_APPROVED_SEFER_ABI_SEMANTIC_REASONING_ACCEPTANCE,
  ...CURRENT_HEAD_APPROVED_CURRENT_ACCEPTED_SERVICE_SOURCES,
]);

function mergeCurrentHeadIdentities(...entryGroups) {
  const byPath = new Map();
  for (const entry of entryGroups.flat()) {
    const path = String(entry?.path || "").replace(/\\/g, "/").replace(/^\.\//, "");
    if (!path || path.includes("*") || path.includes("..")) throw new Error(`CURRENT_HEAD_SCOPE_INVALID_PATH:${path || "(empty)"}`);
    // A currently active numbered-milestone entry may advance a historical
    // path only by replacing that path's exact live identity. The historical
    // entry itself stays frozen in PRE18_HISTORICAL_CONCURRENT_BACKEND_DIFF.
    byPath.set(path, Object.freeze({ ...entry, path }));
  }
  return Object.freeze([...byPath.values()]);
}

export const CURRENT_HEAD_ACTIVE_MILESTONE_DIFF = activeMilestoneCurrentHeadEntries();

// One current-head authority: frozen PRE-#18 records plus the active numbered
// milestone. Later milestone records replace only their own current paths.
export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF = mergeCurrentHeadIdentities(
  PRE18_HISTORICAL_CONCURRENT_BACKEND_DIFF,
  CURRENT_HEAD_ACTIVE_MILESTONE_DIFF,
);

// Current product terminology ownership remains exact-pinned separately from
// the uncommitted backend route scope. The payment service is already part of
// the accepted current product baseline and is not an additional working-tree
// backend change.
export const CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY = Object.freeze([
  {
    path: "backend/src/services/paymentBackbone.js",
    sha256: "D113CA27FA50F74D82E79FF0A5502F0CEFF1916CEEC879799261CFF7ED6F39A3",
  },
  {
    path: "web/src/components/PanelChrome.jsx",
    sha256: "54777BE86FB65ED26F0A75D72512C8726833915E490A24B62B42A225263D14C6",
    owner: "PRE_18_PANELCHROME_SEMANTIC_PRESENTATION_ACCEPTANCE",
  },
]);

// This is the immutable PRE-#18 side of the current-head policy. It is used
// only to prove a later milestone's explicit supersession; it is never
// rewritten by that later milestone.
export const PRE18_HISTORICAL_CURRENT_HEAD_IDENTITIES = Object.freeze([
  ...PRE18_HISTORICAL_CONCURRENT_BACKEND_DIFF,
  ...CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY,
  ...CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE,
  ...CURRENT_HEAD_APPROVED_SEFER_ABI_SEMANTIC_REASONING_ACCEPTANCE,
  ...CURRENT_CLOSURE_PRODUCT_SOURCE_ENTRIES,
]);

export function getPre18HistoricalCurrentHeadIdentity(candidatePath) {
  const normalized = String(candidatePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
  return PRE18_HISTORICAL_CURRENT_HEAD_IDENTITIES.find(({ path }) => path === normalized) || null;
}

export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS =
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.map(({ path }) => path);

export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF_WITHOUT_COMMERCIAL_CORE_CHILDREN =
  Object.freeze(
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(
      ({ path }) => !path.startsWith("backend/src/routes/commercialCore") || path === "backend/src/routes/commercialCore.js"
    )
  );

export const CURRENT_HEAD_APPROVED_SCHEMA = CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256;
