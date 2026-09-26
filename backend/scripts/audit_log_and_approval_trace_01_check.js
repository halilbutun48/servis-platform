#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsCheckScripts } from "./lib/productExtensionsRegistry.js";
import {
  CANONICAL_PRESENTATION_PROVENANCE_BY_PATH,
  evaluatePresentationIdentity,
  getPresentationIdentityProjection,
  LIFECYCLE_DEFERRED_SUPERSEDED_ORPHAN_PATHS,
} from "./lib/presentationProvenanceAuthority.js";
import {
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
  CURRENT_HEAD_COMMERCIAL_SPLIT_ROUTE_IDENTITY,
  CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE,
  CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY,
} from "./lib/currentHeadScopePolicy.js";
import {
  BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET,
  isBatch14DocArchitectureConsolidationPath,
  BATCH11_INDEX_WORKTREE_SCOPE_PATH_SET,
  isBatch13AppJsxMigrationConsumerPath,
  isBatch13FoundationCommandSurfacePath,
  isBatch13FoundationOwnerPath,
  isBatch13FoundationSupportPath,
  isAppJsxRoleTenantScopePath,
  isBatch11IndexWorktreeScopePath,
  isCommercialPaymentSecurityCheckerPath,
  isM80M89ContractSweepRepoContractPath,
  mustDiffEmptyOrExactlyWithIdentity,
  mustStatusSubsetWithIdentity,
} from "./lib/guardGitScope.js";
import {
  ACTIVE_CURRENT_HARNESS_PATHS,
  ACTIVE_CURRENT_SOURCE_PATHS,
  RATIFIED_CURRENT_HARNESS_PATHS,
  DURABLE_CURRENT_CHECKER_PATHS,
  RECOVERED_DURABLE_CHECKER_PATHS,
  getActiveCurrentHarnessEntry,
  classifyLifecyclePath,
  assertLifecycleClassificationIntegrity,
} from "./lib/pre18LifecycleClassification.js";
import { normalizedTextSha256 } from "./lib/guardTextIntegrity.js";
import { activeMilestoneTouchedPaths } from "./lib/milestoneOwnershipAuthority.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const paths = {
  packageJson: path.join(repoRoot, "package.json"),
  harnessCheck: path.join(repoRoot, "backend", "scripts", "script_harness_consolidation_01_check.js"),
  harnessDoc: path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md"),
  guide: path.join(repoRoot, "docs", "SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"),
  primer: path.join(repoRoot, "docs", "PRIMER_SSOT.md"),
  doc: path.join(repoRoot, "docs", "AUDIT_LOG_AND_APPROVAL_TRACE_01.md"),
  securityDoc: path.join(repoRoot, "docs", "SECURITY_KVKK_FINAL_01.md"),
  dataIntegrityDoc: path.join(repoRoot, "docs", "DATA_INTEGRITY_AND_RECOVERY_01.md"),
  packageOwnershipManifest: path.join(repoRoot, "backend", "scripts", "lib", "packageOwnershipDeltaManifest.json"),
  allPanelsSmokeReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_ALL_PANELS_REALITY_AUDIT_01", "report.json"),
  premiumSmokeReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_LIVE_PANEL_PREMIUM_SMOKE_01", "report.json"),
  debugLog: path.join(repoRoot, "debug.log"),
};

function readFile(relOrAbsPath) {
  return fs.readFileSync(relOrAbsPath, "utf8");
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizePath(text) {
  return String(text || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContains(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) {
      throw new Error(`FAIL ${label}: missing ${needle}`);
    }
    cursor = index + target.length;
  }
  console.log(`OK ${label}`);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitStatusNames() {
  const out = execFileSync("git", ["status", "--short"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*../, "").trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length > 0) {
    throw new Error(`FAIL ${label}: ${unexpected.join(", ")}`);
  }
  console.log(`OK ${label}`);
}

function fileSha256(relPath) {
  return createHash("sha256")
    .update(fs.readFileSync(path.join(repoRoot, normalizePath(relPath))))
    .digest("hex")
    .toUpperCase();
}

function readCanonicalSmokeIdentityMap(reportPath, { auditName, label }) {
  const report = JSON.parse(readFile(reportPath));
  if (auditName && report.auditName !== auditName) {
    throw new Error(`FAIL ${label} audit identity`);
  }
  const counts = report.statusCounts || {};
  if (counts.PASS !== 82 || ["PASS-", "UX-FIX", "BLOCKER", "AUTH-BLOCKED", "NOT-FOUND"].some((status) => counts[status] !== 0)) {
    throw new Error(`FAIL ${label} accepted outcome`);
  }
  const entries = report.sourceIdentityFiles;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`FAIL ${label} source identities`);
  }
  const identities = new Map();
  for (const entry of entries) {
    const relativePath = normalizePath(entry?.path);
    const sha256 = String(entry?.sha256 || "").toUpperCase();
    if (!relativePath || !/^[A-F0-9]{64}$/.test(sha256) || identities.has(relativePath)) {
      throw new Error(`FAIL ${label} source identity shape`);
    }
    identities.set(relativePath, sha256);
  }
  return identities;
}

function mergeExactIdentityMaps(...identityMaps) {
  const merged = new Map();
  for (const identityMap of identityMaps) {
    for (const [relativePath, sha256] of identityMap) {
      const existing = merged.get(relativePath);
      if (existing && existing !== sha256) {
        throw new Error(`FAIL canonical smoke source identity conflict: ${relativePath}`);
      }
      merged.set(relativePath, sha256);
    }
  }
  return merged;
}

function buildRegistryOwnedCheckerPaths(packageScripts, registryScripts) {
  const paths = new Set();

  for (const script of registryScripts) {
    const command = packageScripts?.[script];
    if (typeof command !== "string") {
      continue;
    }
    const match = command.match(/^\s*node\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }
    const resolved = normalizePath(match[1].replace(/^["']|["']$/g, ""));
    if (resolved.startsWith("backend/scripts/")) {
      paths.add(resolved);
    }
  }

  return paths;
}

function buildPackageWiredScriptPaths(packageScripts, scriptPrefix) {
  const paths = new Set();

  for (const [script, command] of Object.entries(packageScripts || {})) {
    if (!script.startsWith(scriptPrefix) || typeof command !== "string") {
      continue;
    }
    const match = command.match(/^\s*node\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }
    const resolved = normalizePath(match[1].replace(/^["']|["']$/g, ""));
    if (resolved.startsWith("backend/scripts/")) {
      paths.add(resolved);
    }
  }

  return paths;
}

function buildExpectedShaMap(entries) {
  return new Map(entries.map(({ path: entryPath, sha256 }) => [normalizePath(entryPath), String(sha256).toUpperCase()]));
}

const batch09ApprovedConcurrentWorktreeEntries = [
  { path: "backend/README.md", sha256: "0E5C4A471BB7CD0B361C7EC6FB33899CABD810D8CB3892913F66FE26BE8F8AE7" },
    { path: "backend/scripts/canonical_provenance_registry_01_check.js", sha256: "4E9EEE56CE5C55C30C367485E17C2DDA39FF2A1862D93CBC52A0F408526A8BB2" },
  { path: "backend/scripts/lib/canonicalProvenanceRegistry.js", sha256: "AAAC80CC837CDCC2A871D2E2A9D8E4538CA1360080C591DFEDECA2755840B705" },
  { path: "backend/scripts/ux_all_panels_reality_audit_01_check.js", sha256: "918F2D60DE76DBFC25E410BF0E4DB5045812A57A33D35E2BC7F72CE647421FF1" },
  { path: "backend/src/bootstrap/rateLimits.js", sha256: "92C93F276B04E5B4A3179E5F93D6396A37FA968000AA2FCEAE1E1F51752E0135" },
  { path: "backend/src/middleware/apiRequestLog.js", sha256: "5F27CA48608B10C6DDCD35F9D1C1E146D6AD432EAD63C90CF117F0EA3A051EE3" },
  { path: "backend/src/middleware/asyncHandler.js", sha256: "F206378CE995B6B15A3C340F81E8F8B16EDA65638558EF46F1F373ABBF166F0C" },
  { path: "infra/docker-compose.yml", sha256: "020E0CDFC9745991CB349FED12CEB741BFB973540116FD4664F8ACEFB7A09B22" },
];
const batch09ApprovedConcurrentWorktreeShas = buildExpectedShaMap(batch09ApprovedConcurrentWorktreeEntries);

const batch09CommercialSplitRouteEntries = Object.freeze(
  CURRENT_HEAD_COMMERCIAL_SPLIT_ROUTE_IDENTITY.filter(({ path: entryPath }) =>
    normalizePath(entryPath).startsWith("backend/src/routes/commercialCore"),
  ),
);
const batch09CommercialSplitRouteShas = buildExpectedShaMap(batch09CommercialSplitRouteEntries);

const batch09ProvenanceClosureEntries = [
  { path: "backend/src/lib/requestUrl.js", sha256: "629D6C894B91551AB14518F36E2BF4C5CEF48DC60ADBB01A17EFE7755C30063E" },
  { path: "backend/src/server.js", sha256: "1FD7A545B43FA265A15737759CBE5DE1887C7CA3A3846170E3F9D0EFFEEABF77" },
];
const batch09ProvenanceClosureShas = buildExpectedShaMap(batch09ProvenanceClosureEntries);

const auditApprovalOwnedEntries = [
  { path: "backend/scripts/room_profitability_and_quote_floor_01_expansion.js", sha256: "E47DA8DADBE47B50BBF02BAB9EA5382FF0B90715A503ACBA0786FFF510D92498" },
  { path: "backend/src/finance/companyBudgetAndServiceCost.js", sha256: "541C7826251217FF0245307C5BA645AF559FF4E935970B5A95DC9FB3AC13F5E6" },
  { path: "backend/src/finance/financialOperationsScope.js", sha256: "24B4CDCC47CACC407B340E1F00BE2BD7FBDCB728153DF15E8FA001A7772DE863" },
  { path: "backend/src/finance/roomProfitabilityAndQuoteFloor.js", sha256: "0DDF16B9E4EBBE0C39793CFA5586F08B3E9614BA6C76CF33ABAAB809AB153BE8" },
  { path: "web/src/api.js", sha256: "C72688E9EB42D3AA7E5DC96B1A5436D95B9E51920DB4E7A6D624CBF7517E2279" },
  { path: "web/src/panels/shared/FinancialOperationsPanel.jsx", sha256: "CD938593C8F99DEBA6BE13838739BC1F633201E58AF6EBF0C92EEB43A4875DB7" },
  { path: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx", sha256: "4B22D27C2D5BBC69CAAD13941F038A241E9C28181C344ACF550EB81A07580A94" },
  { path: "web/src/panels/shared/financialOperationsPresentation.js", sha256: "6D3D3E324EF9DED3DD12FD1414C6EE61B7757EEE6BDE0ABDA2728FFB306587DB" },
  { path: "web/src/panels/shared/ExternalReferenceCard.jsx", sha256: "60B8BB302B626BC91BAE94748921F97D07ECAC6B75633F1A08494BD37D128BDE" },
  { path: "web/src/panels/parent/LivePanel.jsx", sha256: "E63AABA557A730CC19B277FC4E64E7D6F2E4189B818BFBA7B7D277C8A467545C" },
];
const auditApprovalOwnedShas = buildExpectedShaMap(auditApprovalOwnedEntries);

const currentClosureCorrectiveEntries = [
  { path: "backend/src/ai/chat/canonicalConversationState.js", sha256: "4AA67996BD7A5F956C767C406929E243279A83BAC75DE9B509959E76877A20E2" },
  { path: "backend/src/ai/chat/conversationTaskStateDynamicQuestions.js", sha256: "1E534ABB11B9D7A31A0293E32A556F86CB3F07BA2785A60A796CD310647E7556" },
  { path: "backend/src/services/actionableEvents.js", sha256: "0809B33DA5E3FA2F1F0B7240764F9773AB4E670A02CFAAE86E2E8019A4A79853" },
  { path: "web/src/components/CollapsibleSection.jsx", sha256: "4D8DD2BAC0BF931650C1BD3A093086B8906818607542C6D8F5E4643D5D6490FB" },
  { path: "web/src/components/map/ReadableMiniRouteMap.jsx", sha256: "4450A81C7A710D558E78D61469745B9CD28789BB4ABC04E6A4E96D3FC6EB0097" },
  { path: "web/src/utils/displayStatus.js", sha256: "DB0EE1A4D57EC9F7A9F6194C9495B470A65146536335E47A5F9BF9034B39C0AF" },
  { path: "web/src/utils/roleNavigation.js", sha256: "37E838A9F962F17C768151F8D8D74B2B99556E6AABAF0953C2B99615117C5397" },
  { path: "web/src/utils/terminology.js", sha256: "B34B51C6F2A55BBDEADDF3286C1CCFDFF8138EC5AE519286649B73AB8AFAC069" },
  { path: "backend/src/ai/jobGuide/screenCatalog.roomCompany.js", sha256: "F5E819AB22DD8BB244DBBCD9C633F57EF2AFC084E11E4FF62045DB882543D260" },
  { path: "backend/src/services/queryPlanExecutor.js", sha256: "34F65FD7F3971C60E47A7BF4F9963F9EB40243AE77E045B89CAD0B9B008158AA" },
  { path: "web/src/components/CommercialReadonlySummary.jsx", sha256: "DE176A4AB0297680CD5C59B1530E5A876C85EA28CCC8A21DE9FE0CA76F399B36" },
  { path: "web/src/components/OperationsCommandCenter.jsx", sha256: "D5F1181D8414BC49BF700A7688FAFD9FBE74539F78A16FB67BDCBEFA24088961" },
  { path: "web/src/components/map/MapView.jsx", sha256: "DFD648AC0D68FC40DA11FD1FE60D3969D1DFE05C811B4504B0E48B052D293311" },
  { path: "web/src/panels/company/PassengerLinksPanel.jsx", sha256: "A80115478963A14CC95AE20821E008E3E158F45D80122408EF20491AEDA3C844" },
  { path: "web/src/utils/dashboardBulk.js", sha256: "73856CA9042F631909914290F28BEFCFD9538DCFEBFEF2D10987773F3F48E175" },
  { path: "backend/scripts/sefer_abi_room_fuel_province_coverage_01_acceptance.mjs", sha256: "09B9A61CC245A24C51B53E10E6EF9A56E2B52A148CB55F90303B6A1ECDE03310" },
  { path: "backend/src/externalCost/externalCostReferenceService.js", sha256: "EADD157A8C93448EDD3C9E9A4F3D93BFCD3235CBBCEE0AB3282370ABFAADE436" },
  { path: "backend/src/externalCost/providerFactory.js", sha256: "1CC8266F1B519443C440AB4A7F7AE53BCCFC8A9C6A016E9670D62BD430392EA2" },
  { path: "backend/src/externalCost/providerRegistry.js", sha256: "E28C27183C8FF124BB452F8D1ADD0077B2FF292463534A2FFB6A866E59E5B225" },
  { path: "backend/src/externalCost/referenceLayers.js", sha256: "3687A4C373798BF6138F93476EBFCD59B22F4993973ADCBD37F3CA048D0801F8" },
  { path: "backend/src/externalCost/epdkBulletinProvider.js", sha256: "6883D0C607AFE0FEDFD0D9B1F1B50DC32139F9A0C50388A2AFB753780F93CFD1" },
  { path: "backend/src/finance/costScenarioForecast.js", sha256: "C1401ACE7AA006874F5FCB28ECCC969E0949BAF30AD43654316364AF9E79491F" },
  { path: "web/src/panels/shared/CostScenarioWorkspacePanel.jsx", sha256: "31617B1E30A373558FF7BE1545FDAC29679407B5CC07B072F4EC0871C4EE7FDC" },
  { path: "backend/src/ai/chat/authorizationGate.js", sha256: "8556F409BA3C4835CBB8043396A88BFD14DA905DEBACA2694F94E5D138F0E82B" },
  { path: "backend/src/ai/chat/fieldPrivacyPolicy.js", sha256: "EF87634FBA829AF4C0CEB84AEE9A338C4B629B3158BF20504F06A403849D68A0" },
  { path: "backend/src/ai/chat/userFacingLanguageNormalizer.js", sha256: "C9B1161D0EFD2474CDFD3416230826AF0ACEA820D4EA762ADF54029D13CAECB4" },
  { path: "backend/src/ai/schemas.js", sha256: "D85A8A6DC4BA320AF5D7EE67DFC78A4282C93BE73CB982415AA0F72DB5D49895" },
  { path: "backend/src/services/authorizedProductAwareness.js", sha256: "154CB640CC7634D04209E77F1392A98350A60A901396041F3C8505C49612E4C7" },
  { path: "web/src/components/geo/GeoLocationPicker.jsx", sha256: "F009CD05537C062E4151BE4E439BE8CAE501F2C78BD3A963198A699020DFD569" },
  { path: "web/src/components/geo/HubMapPicker.jsx", sha256: "E5A6E4EEF74785594E8DDCAD2F35C174A106CADABDBCD6164D807033FEEBC310" },
  { path: "web/src/panels/shared/CommercialShiftCardPresentation.jsx", sha256: "4E10C7893D5825ABA5465955811535398AC031449C7E420499A939F97DDF66A4" },
  { path: "web/src/utils/copilotSelection.js", sha256: "0F40C84BA2210176488BF475D6073C3D5E4713556ADFE12A2FB5BB54ABFDA38B" },
  { path: "web/vite.config.js", sha256: "D6525E52EB61C4034A9C17F82537E2D127C95B017DDCB4ACE46B4E6029695A73" },
];
const currentClosureCorrectiveShas = buildExpectedShaMap(currentClosureCorrectiveEntries);

const pausedMilestoneWorktreeEntries = [
  { path: "backend/scripts/sefer_abi_cost_analysis_assistant_01_acceptance.mjs", sha256: "D02E2152766A74B53F8C9E90FC46655B0986CEC46DFB5154629A6AB50A864033" },
  { path: "backend/src/ai/chat/seferAbiCostAnalysisAssistant.js", sha256: "867B28C7E2E69137C3DE2E25EEEDF985A1892FAF9A1A0CAEF492C04FCC9CCEC2" },
];
const pausedMilestoneWorktreeShas = buildExpectedShaMap(pausedMilestoneWorktreeEntries);

// Current PRE-#18/product-flow worktree identities are exact-pinned here so
// audit-trace hygiene can distinguish the approved presentation snapshot from
// unrelated files. This is intentionally not a wildcard or a directory rule.
const currentPre18IdentityEntries = [
  { path: "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md", sha256: "4B0870AF0EE5BC409D34188B575538983CE0A3C1AA825BDD88F3CDA74D23E4C4" },
  { path: "backend/scripts/pre_18_major_findings_corrective_01_browser.mjs", sha256: "F27DA7B7B2CA9E6C00E451F5154D16E041717DA29AD037F01CDC5774D683D348" },
  { path: "backend/scripts/pre_18_premium_ui_polish_01_browser.mjs", sha256: "79CA5112CB91663F76EA4369B0DE3094C39FAC61F572CBE2A389053B4CEDF9C8" },
  { path: "backend/scripts/pre_18_premium_ui_polish_01_check.js", sha256: "2ACD68FAF19A25440A10BF272F2FC21AB6DDFC7BFB2CFD83E3FC2A2C38A8381A" },
  { path: "backend/scripts/lib/presentationProvenanceAuthority.js", sha256: "C145567FAAEA21F6EA2BFCB198D045C34928D36E26B1E6BBD6AC12665B249EE7" },
  { path: "backend/scripts/pre_18_presentation_provenance_authority_01_check.mjs", sha256: "0B105B27C4745ED08745C71562CA270005F8539BA5EBD6C7B0DEE210FD580B43" },
  { path: "backend/scripts/pre_18_agreement_wizard_unreachable_defensive_branch_check.mjs", sha256: "696B68BEF3533C7535C82693FA9AA516C87476BA2F615EB39B62169CA10ED6AF" },
  { path: "backend/scripts/pre_18_final_two_presentation_residual_reachability_01.mjs", sha256: "8E592425CFBE271C001C241C9E37581C3FBFD2B19142323E62DC5F4FD5A3B2F7" },
  { path: "backend/scripts/pre_18_backend_security_context_acceptance_check.mjs", sha256: "4EB2B93C95735942F285326E5EF05AAC034802537309BA0E5BEDD6670A99B7ED" },
  { path: "backend/scripts/pre_18_semantic_reasoning_source_identity_acceptance_check.mjs", sha256: "B04E56682FC9E742254FA18EDC84ADDD1D5F0E26C7004818D516B1E9009C5C08" },
  { path: "backend/scripts/pre_18_semantic_priority_acceptance_check.mjs", sha256: "DF92212AE1C8D6EA697D108F11FE9FF9F6CE8F3049112EB43BB05DFEC88FE5C9" },
  { path: "backend/scripts/pre_18_operation_health_profile_precedence_acceptance_check.mjs", sha256: "827FEA3C457AC22688408C88B5546934A4626678A501AF83E249574F535446B8" },
  { path: "backend/scripts/pre_18_harness_gate_policy_projection_check.mjs", sha256: "FC7ECFF4539079B795D66D478D77D534593A3B626A438F6A39B28F3887341799" },
  { path: "backend/scripts/pre_18_screen_context_authority_acceptance_check.mjs", sha256: "9202BAD50835C367208BA09348C97366F3E2F4FB895804D8A7FB4A6F255A5A7B" },
  { path: "backend/scripts/pre_18_semantic_gate_scope_calibration_check.mjs", sha256: "DF765A9C8645815C02228FDB783B5D80C95996055E3A0F0EDD3C40371F91E235" },
  { path: "backend/scripts/pre_18_panelchrome_source_identity_acceptance_check.mjs", sha256: "1A08FC1F2FE1CF349F807CF61B8A2F76FC4F22FE6FDF9D5919F354375F3EC41D" },
  { path: "backend/scripts/pre_18_generic_product_help_safety_acceptance_check.mjs", sha256: "F972165308458FF22287C98380592A63D82F9C874B88941FDE713F2839F0C69C" },
  { path: "backend/scripts/pre_18_package_b_v2_semantic_ownership_acceptance_check.mjs", sha256: "65F7C972E30F29FFE2FFC30B8FE84A2FD9E26973BF17B23F28C97CB01D86D002" },
  { path: "backend/scripts/pre_18_package_c1_v3_start_readiness_remap_acceptance_check.mjs", sha256: "54B71CB4E5A45FFB26125EF3E218765010CC0739CB3B8366D2BE815FCD349FFF" },
  { path: "backend/scripts/pre_18_package_c2_semantic_contract_acceptance_check.mjs", sha256: "96BAD3A7762870C41DB329D3971174AB1ACB1236F4259DC33AA016205CCE50D3" },
  { path: "backend/scripts/pre_18_package_c3_v2_plan_review_acceptance_check.mjs", sha256: "E1422950EBC4D4534392C360DF6DB5056ADE67E159F8AEB48A05BF6E5FBB0C64" },
  { path: "docs/PRE_18_PREMIUM_UI_POLISH_01.md", sha256: "8477B3536E2F6B890476FD920C5B39D63DF96E11CF5F271EF223666CCE4927A6" },
  { path: "web/src/components/PanelChrome.jsx", sha256: "DA045B7FBD18EE8CAA4360F0E7EEC753400C575B92CB9D650E988C3272D8F8DE" },
  { path: "web/src/components/TabletOpsQuickBar.jsx", sha256: "217B4C8E7D2DAEE2CD82E4CADE624913F88BF22706C5F7EB90829136D5439C07" },
  { path: "web/src/components/copilot/ChatDiagnosticSignals.jsx", sha256: "7060869E3BCDC7EB90363D40906C559768C4DE8DC623D4CBB6BE3C36AB73457B" },
  { path: "web/src/components/copilot/ChatQualitySummary.jsx", sha256: "9AB9717CFF5573B727D9C748D34CFCEA81A91D3BEE52AE41F5A4A877E4CC2581" },
  { path: "web/src/components/map/mapShell.css", sha256: "B47104D45BDDFFFBCE728D277BAF713C09AB2D7CAD68634AA52151E4EEB38363" },
  { path: "web/src/index.css", sha256: "87382B601364EF14068F8B8718266AF32996D2A17CDB5AF7DC324D3E8CCC0B0E" },
  { path: "web/src/layout/AppShell.jsx", sha256: "104E57678B11CB96EA9A0AD6BCEB84AB3AEBEE4656DDEDD1BD197F9BD017652F" },
  { path: "web/src/panels/company/AgreementWizard.jsx", sha256: "DE2C02163322FD8547064C9F0DF43CA808466D8DE5648A35154C94FD69CCF113" },
  { path: "web/src/panels/company/CommercialFlowPanel.jsx", sha256: "53717D3FA833733943DEFAC29B788A6F1DBCDAF40537F3684E2465C23D2D5D1F" },
  { path: "web/src/panels/company/HubPanel.jsx", sha256: "49F8FA65EC44D9E64691772F19F86B435E458CBED50E23A92C4734A8213AB58A" },
  { path: "web/src/panels/company/PersonelAccessPanel.jsx", sha256: "19DFD95DE75EB9E65E6BA6507B5587D0B3E3922720A50025DDB3CB0ADDF19C8D" },
  { path: "web/src/panels/company/companyAgreementsMobileCards.jsx", sha256: "EC839D264ACAC9795FB5CCAB9764E734EC48B549F85A8069A7AAF5FCF3759481" },
  { path: "web/src/panels/company/companyShiftsPanelCards.jsx", sha256: "6B1B597DC624A631BB422E61FB3E220618138115532354F15B5236E2A5ACAF5F" },
  { path: "web/src/panels/company/companyShiftsPanelMobileCards.jsx", sha256: "7EF25E7C506E00B22C3439D008DDB70C0ABCB752E4B37D43EAF353B19400836B" },
  { path: "web/src/panels/company/companyShiftsPanelSections.jsx", sha256: "B376E43834BDA1F28D7BEC2716883FCCF4FFF7DE7046BC22C53E5CD4A6CCF2C8" },
  { path: "web/src/panels/company/planBuilderPanelSections.jsx", sha256: "7314FF9147161CF0B3BD8418FC29BCD773933C085B1F1D413C31720EF4175D98" },
  { path: "web/src/panels/organization/PlansPanel.jsx", sha256: "FE5E92D1DB8AC4AFE956EB606B191BEB0383161F4D3E5C2995853DAC9B77A105" },
  { path: "web/src/panels/organization/organizationPlansShared.jsx", sha256: "4767F805803F5926D20DDF3CDDFF8FB0813E812EA636F70C75FA1116CC7D84A9" },
  { path: "web/src/panels/parent/LivePanel.jsx", sha256: "81045CE97E10C61312A4EC7BA72BBB29C7466FBBC2BC3FBA8CA92A4159593B61" },
  { path: "web/src/panels/personel/LivePanel.jsx", sha256: "A835F4F3AB3F6E086F11BA7A892E992238FFA435093F80C2EE0BF35E24267B80" },
  { path: "web/src/panels/personel/MyRidePanel.jsx", sha256: "A5D3968352C13CC3E4B7FD46B6B96723121AFFD4AAAA7B46512244F4EB469AD6" },
  { path: "web/src/panels/room/HubPanel.jsx", sha256: "A943A3F72EB3D94872D3759BC65EC04E6873F95BFBAE9305A0A12DC56CBD383C" },
  { path: "web/src/panels/room/OffersPanel.jsx", sha256: "78C4E79E2405EDDC5C7648364A257F38A18F2B6EB11F1CC78A60D8A33DCA1C3A" },
  { path: "web/src/panels/room/RoomDriversStatusTable.jsx", sha256: "65D3CB2D169FD0DED0A2B1B945FC7F403CE6BEB62851EAD53CB73225648BE70B" },
  { path: "web/src/panels/room/ShiftsPanel.jsx", sha256: "39EDE93B88CEE8F6FAF307B5373D7571A5447A767EAE55AAB37BC12C11DEC356" },
  { path: "web/src/panels/room/VehiclesPanel.jsx", sha256: "B20476882B0939AE4D8E2FE2B1714D70DAF8433B507761EFDCAE306ADD4F8DAB" },
  { path: "web/src/panels/room/roomShiftsPanelSections.jsx", sha256: "E3FBBF35549D243FA194BD8A0155BF400CDD7776C0686A8CCC9400C279A0251F" },
  { path: "web/src/panels/school/ParentInvitePanel.jsx", sha256: "5D1CDE4DAB3632522C24041D5853F822AF856F88847CCD14034C6063EF29E0BC" },
  { path: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx", sha256: "C25C9E09D331C702A51FACD29775768FE1A54F16350BFB12E82D0F59EEF1DBD0" },
  { path: "web/src/panels/shared/FinancialOperationsPanel.jsx", sha256: "4FE9B845CA8A4DCE13997F4D48FD20D20912AD34E61262D3422F058BB6581CF3" },
  { path: "web/src/panels/shared/NotificationsPanel.jsx", sha256: "87BD69AB6EFB291CBB0F7BBCAA67CEBDDA9034F9F3D11B65AB46E23F267D998F" },
  { path: "web/src/panels/shared/OfferQualityRankingCard.jsx", sha256: "8A45012DBAA1D9181E51CD7E9DDFE4EDD577F9BCE30F43BC174ED0684FEBA4AA" },
  { path: "web/src/panels/superadmin/LogExportPanel.jsx", sha256: "08F2D2B0BD4B5B1BEFA36558954B9C743DE07B5CC4BC5B8B2ED76844899346F7" },
  { path: "web/src/panels/superadmin/ObservabilityPanel.jsx", sha256: "FF296DF7391F99E44DB59C1F7DF539044FC874CEA7B5053138D2E6426D471328" },
  { path: "web/src/panels/superadmin/OperationsPanel.jsx", sha256: "802FD1E5BB9D9BF5FCD1DDF5F41E537573785CAF09F932E1E03565D8AA3C3143" },
  { path: "web/src/panels/superadmin/PilotLaunchGatePanel.jsx", sha256: "4BFC7CC60A64DBB0B7F57460A1DD9B396944690759B02DF7C7C793FB0D11989C" },
  { path: "web/src/panels/superadmin/RoomsPanel.jsx", sha256: "78B8B08DBEBA86C5F7C4E06030AF9D0E3F28A5510EF92C177F9316E97E96A417" },
  { path: "web/src/state/sessionProvider.jsx", sha256: "DD18027A9489EEB6FF69879237566105AE31476CE1B439BF59671FAFBAA0A73B" },
  { path: "web/src/utils/copilotFacts.js", sha256: "7ABBE72071284CA242680B7B2C02486B6B2CE67213DA56A04BDF55B44211BF2E" },
  { path: "web/src/utils/liveTrackingCopy.js", sha256: "80CFAD6538634EEBB9EE7CF1226AAAD31AD99E22D94F3DE37B9D589C6C04EA5F" },
];
const currentPre18IdentityShas = buildExpectedShaMap(currentPre18IdentityEntries);
const activeMilestoneIdentityByPath = new Map(
  activeMilestoneTouchedPaths().map((entry) => [normalizePath(entry.path), entry]),
);
assertLifecycleClassificationIntegrity([
  ...currentPre18IdentityEntries.map(({ path: entryPath }) => entryPath),
  ...ACTIVE_CURRENT_SOURCE_PATHS,
  ...RATIFIED_CURRENT_HARNESS_PATHS,
  ...DURABLE_CURRENT_CHECKER_PATHS,
  ...RECOVERED_DURABLE_CHECKER_PATHS,
  ...ACTIVE_CURRENT_HARNESS_PATHS,
  ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.map(({ path: entryPath }) => entryPath),
]);

const auditDocWorktreeEntries = [
  { path: "docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md", sha256: "AE93752F59CE9FC1763708FD40EB4DD3B4E10BC5D54CCF98B16C94C61564DF2B" },
  { path: "docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md", sha256: "550FD0EB75144987CB5DB759628ACF6D1EC4EE4A5AEE08584D74B6FCEDFA9860" },
  { path: "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md", sha256: "6A11ABE8A17CC907FA4C3B93940C8FCDC2F58B918C24A6B4EE62525A2D54640B" },
  { path: "docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md", sha256: "A7EF3D0DB003D206845EBDBF3DFF52B82839A993966BE10618C32EC7A418889E" },
  { path: "docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md", sha256: "36D7BCC36F1F2772524EC66B07A2A1363CA584ECAADD19C7FD4F7A750CF4A988" },
  { path: "docs/UX_PANEL_INVENTORY_02A_AUDIT.md", sha256: "039246CFBD967E9AA63CBCED301A9AE4FB58F0DB4946A8CFE3C4C7BEB15E7B19" },
];
const auditDocWorktreeShas = buildExpectedShaMap(auditDocWorktreeEntries);

// #14 audit/closure files are an exact, bounded scope. They are allowed here
// because the audit adds the School → Parent Access closure and its evidence;
// this must not become a broad working-tree exception.
const projectGapReadinessExactPaths = new Set(
  [
    "backend/scripts/project_wide_gap_and_release_readiness_audit_01_check.js",
    "backend/scripts/project_wide_gap_and_release_readiness_audit_01_acceptance.mjs",
    "backend/scripts/project_wide_gap_and_release_readiness_audit_01_browser.mjs",
    "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01.md",
    "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_CAPABILITY_MATRIX.json",
    "docs/PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_GAP_REGISTER.json",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "package.json",
    "tools/check_step06_repo_contract.ps1",
  ].map((value) => normalizePath(value)),
);

function classifyActiveCurrentHarness(file) {
  const normalized = normalizePath(file);
  const entry = getActiveCurrentHarnessEntry(normalized);
  if (!entry) return false;
  const actual = fileSha256(normalized);
  if (actual !== entry.sha256) {
    return { category: "UNKNOWN", detail: `${normalized} expected ${entry.sha256} got ${actual}` };
  }
  return { category: "ACTIVE_CURRENT_HARNESS" };
}

function classifyDirtyPath(file, context) {
  const normalized = normalizePath(file);

  if (normalized === context.selfPath) {
    return { category: "SELF_AUDIT_APPROVAL_GUARD" };
  }

  if (projectGapReadinessExactPaths.has(normalized)) {
    return { category: "PROJECT_GAP_READINESS_14" };
  }

  const activeMilestone = activeMilestoneIdentityByPath.get(normalized);
  if (activeMilestone && activeMilestone.acceptance === "PASS" && activeMilestone.identityRegistered === true && activeMilestone.lifecycle) {
    if (activeMilestone.identityMode === "CONTRACT_SELF") return { category: "ACTIVE_MILESTONE_GOVERNANCE" };
    const expected = String(activeMilestone.rawSha256 || "").toUpperCase();
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "ACTIVE_MILESTONE_GOVERNANCE" }
      : { category: "UNKNOWN", detail: `${normalized} active milestone expected ${expected} got ${actual}` };
  }

  // Exact current-head identities are authoritative over older package-local
  // snapshots. Keep App.jsx on its dedicated role/tenant classification path.
  const currentHeadExpected = context.approvedCurrentHeadShas.get(normalized);
  if (normalized !== "web/src/App.jsx" && currentHeadExpected && fileSha256(normalized) === currentHeadExpected) {
    return { category: "APPROVED_CURRENT_HEAD_PRODUCT" };
  }

  const packageOwnershipSha = context.packageOwnershipShas.get(normalized);
  if (packageOwnershipSha) {
    const actual = fileSha256(normalized);
    return actual === packageOwnershipSha
      ? { category: "CANONICAL_PACKAGE_OWNERSHIP_IDENTITY" }
      : { category: "UNKNOWN", detail: `${normalized} package ownership expected ${packageOwnershipSha} got ${actual}` };
  }

  const canonicalSmokeSha = context.canonicalSmokeIdentityShas.get(normalized);
  if (canonicalSmokeSha) {
    const actual = fileSha256(normalized);
    return actual === canonicalSmokeSha
      ? { category: "CURRENT_CANONICAL_SMOKE_EVIDENCE" }
      : { category: "UNKNOWN", detail: `${normalized} canonical smoke expected ${canonicalSmokeSha} got ${actual}` };
  }

  if (isBatch13FoundationOwnerPath(normalized)) {
    return { category: "BATCH13_FOUNDATION_OWNER" };
  }

  if (isBatch13FoundationSupportPath(normalized)) {
    return { category: "BATCH13_FOUNDATION_SUPPORT" };
  }

  if (isBatch13FoundationCommandSurfacePath(normalized)) {
    return { category: "BATCH13_FOUNDATION_COMMAND_SURFACE" };
  }

  if (isBatch13AppJsxMigrationConsumerPath(normalized)) {
    return { category: "BATCH13_APP_JSX_MIGRATION_CONSUMER" };
  }

  if (context.coreGuardShas.has(normalized)) {
    const expected = context.coreGuardShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "CORE_GUARD_INFRA" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (currentClosureCorrectiveShas.has(normalized)) {
    const expected = currentClosureCorrectiveShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "CURRENT_CLOSURE_CORRECTIVE" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (pausedMilestoneWorktreeShas.has(normalized)) {
    const expected = pausedMilestoneWorktreeShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "PAUSED_MILESTONE_WORKTREE" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (context.registryCheckerPaths.has(normalized)) {
    return { category: "ACTIVE_PRODUCT_EXTENSION_CHECKER_INFRA" };
  }

  if (context.batch09ApprovedConcurrentWorktreeShas.has(normalized)) {
    const expected = context.batch09ApprovedConcurrentWorktreeShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "APPROVED_CONCURRENT_CANONICAL_WORKTREE" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (context.batch09CommercialSplitRouteShas.has(normalized)) {
    const expected = context.batch09CommercialSplitRouteShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "APPROVED_CONCURRENT_CANONICAL_ROUTE" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (context.batch09ProvenanceClosureShas.has(normalized)) {
    const expected = context.batch09ProvenanceClosureShas.get(normalized);
    const actual = fileSha256(normalized);
    if (actual !== expected) {
      return { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
    }
    if (normalized === "backend/src/lib/requestUrl.js") {
      return { category: "LEGITIMATE_CANONICAL_NEW_FILE" };
    }
    if (normalized === "backend/src/server.js") {
      return { category: "PROVEN_BATCH09_CHANGE" };
    }
    return { category: "APPROVED_CONCURRENT_CANONICAL_WORKTREE" };
  }

  const lifecycle = classifyLifecyclePath(normalized);
  if (lifecycle?.category === "DURABLE_CURRENT_CHECKER") {
    if (lifecycle.identityMode !== "CONTRACT_SELF") {
      const actual = normalizedTextSha256(normalized);
      if (actual !== lifecycle.sha256) return { category: "UNKNOWN", detail: `${normalized} expected ${lifecycle.sha256} got ${actual}` };
    }
    return { category: "DURABLE_CURRENT_CHECKER" };
  }
  if (lifecycle?.category === "ACTIVE_CURRENT_SOURCE") {
    const actual = normalizedTextSha256(normalized);
    if (actual !== lifecycle.sha256) return { category: "UNKNOWN", detail: `${normalized} expected ${lifecycle.sha256} got ${actual}` };
    return { category: "ACTIVE_CURRENT_SOURCE" };
  }
  if (lifecycle?.category === "UNOWNED_CURRENT_CHANGE") {
    return { category: "UNOWNED_CURRENT_CHANGE" };
  }
  if (lifecycle?.category === "HISTORICAL_NONAUTHORITATIVE") {
    return { category: "HISTORICAL_NONAUTHORITATIVE" };
  }
  if (lifecycle?.category === "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT") {
    return { category: "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT" };
  }

  // Current presentation authority supersedes retired audit-local snapshots.
  // The comparison remains exact and uses the authority's declared algorithm.
  const canonicalPresentation = CANONICAL_PRESENTATION_PROVENANCE_BY_PATH.get(normalized);
  if (canonicalPresentation && canonicalPresentation.currentLifecycleStatus !== "CURRENT_DIRTY_UNRESOLVED") {
    const rawSha = canonicalPresentation.acceptedIdentities?.rawSha256;
    const normalizedSha = canonicalPresentation.acceptedIdentities?.normalizedSha256;
    if (rawSha && fileSha256(normalized) === rawSha) {
      return { category: "CURRENT_PRESENTATION_AUTHORITY" };
    }
    if (!rawSha && normalizedSha && normalizedTextSha256(normalized) === normalizedSha) {
      return { category: "CURRENT_PRESENTATION_AUTHORITY" };
    }
  }

  const activeHarness = classifyActiveCurrentHarness(normalized);
  if (activeHarness) return activeHarness;

  if (ACTIVE_CURRENT_SOURCE_PATHS.includes(normalized) || RATIFIED_CURRENT_HARNESS_PATHS.includes(normalized) || DURABLE_CURRENT_CHECKER_PATHS.includes(normalized)) {
    const expected = currentPre18IdentityShas.get(normalized) || currentClosureCorrectiveShas.get(normalized);
    const actual = fileSha256(normalized);
    if (actual !== expected) return { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
    if (ACTIVE_CURRENT_SOURCE_PATHS.includes(normalized)) return { category: "ACTIVE_CURRENT_SOURCE" };
    if (RATIFIED_CURRENT_HARNESS_PATHS.includes(normalized)) return { category: "ACTIVE_CURRENT_HARNESS" };
    return { category: "DURABLE_CURRENT_CHECKER" };
  }

  if (currentPre18IdentityShas.has(normalized) && !LIFECYCLE_DEFERRED_SUPERSEDED_ORPHAN_PATHS.has(normalized)) {
    const expected = currentPre18IdentityShas.get(normalized);
    const actual = fileSha256(normalized);
    if (actual === expected) {
      return { category: "CURRENT_PRE_18_PRODUCT_FLOW" };
    }
    return { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (auditApprovalOwnedShas.has(normalized) && !LIFECYCLE_DEFERRED_SUPERSEDED_ORPHAN_PATHS.has(normalized)) {
    const expected = auditApprovalOwnedShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "AUDIT_APPROVAL_OWNED_PRODUCT" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  const presentationProjection = getPresentationIdentityProjection(normalized, {
    consumer: "AUDIT",
    algorithm: "RAW_SHA256",
  });
  if (presentationProjection.inPresentationScope) {
    if (presentationProjection.record?.currentLifecycleStatus === "SUPERSEDED_ORPHAN_SOURCE") {
      if (presentationProjection.record.owner !== "SUPERSEDED_ORPHAN_REVIEW" || presentationProjection.record.authorizationState !== "LIFECYCLE_DEFERRED_SUPERSEDED_ORPHAN") {
        return { category: "UNKNOWN", detail: `${normalized} lifecycle owner missing` };
      }
      return /^[A-F0-9]{64}$/.test(fileSha256(normalized))
        ? { category: "LIFECYCLE_DEFERRED_PRESENTATION_SOURCE" }
        : { category: "UNKNOWN", detail: `${normalized} lifecycle source identity unreadable` };
    }
    const presentationIdentity = evaluatePresentationIdentity(normalized, {
      consumer: "AUDIT",
      algorithm: "RAW_SHA256",
      actualSha256: fileSha256(normalized),
    });
    return presentationIdentity.accepted
      ? { category: "APPROVED_TERMINOLOGY_PRESENTATION" }
      : { category: "UNKNOWN", detail: `${normalized} canonical presentation identity ${presentationIdentity.reason}` };
  }

  if (auditDocWorktreeShas.has(normalized)) {
    const expected = auditDocWorktreeShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "DOC_WORKTREE_SCOPE" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (isBatch13FoundationSupportPath(normalized)) {
    return { category: "BATCH13_FOUNDATION_SUPPORT" };
  }

  if (isBatch13FoundationCommandSurfacePath(normalized)) {
    return { category: "BATCH13_FOUNDATION_COMMAND_SURFACE" };
  }

  if (isCommercialPaymentSecurityCheckerPath(normalized)) {
    return { category: "COMMERCIAL_PAYMENT_SECURITY_CHECKER_INFRA" };
  }

  if (isM80M89ContractSweepRepoContractPath(normalized)) {
    return { category: "M80_M89_CONTRACT_SWEEP_REPO_CONTRACT" };
  }

  if (context.approvedCurrentHeadShas.has(normalized)) {
    const expected = context.approvedCurrentHeadShas.get(normalized);
    const actual = fileSha256(normalized);
    if (actual === expected) {
      return { category: "APPROVED_CURRENT_HEAD_PRODUCT" };
    }
    if (normalized.startsWith("backend/src/routes/")) {
      return { category: "ROUTE", detail: `${normalized} expected ${expected} got ${actual}` };
    }
    if (normalized.startsWith("backend/src/services/")) {
      return { category: "SERVICE", detail: `${normalized} expected ${expected} got ${actual}` };
    }
    return { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (context.runtimeDataPaths.has(normalized)) {
    return { category: "RUNTIME_DATA" };
  }

  if (context.outOfScopeCurrentHeadHelperPaths.has(normalized)) {
    if (normalized === "backend/scripts/lib/pre18LifecycleClassification.js") {
      const actual = fileSha256(normalized);
      if (actual !== "C7F61D9137232E7C625E5D6FC479D05779C8F072835B9E33712462B0F9867F94") {
        return { category: "UNKNOWN", detail: `${normalized} lifecycle registry identity mismatch` };
      }
    }
    return { category: "OUT_OF_SCOPE_CURRENT_HEAD_HELPER" };
  }

  if (isAppJsxRoleTenantScopePath(normalized)) {
    return { category: "ROLE_TENANT_AUTH_OWNED_PRODUCT" };
  }

  if (context.batch10DocWorktreePaths.has(normalized)) {
    return { category: "DOC_WORKTREE_SCOPE" };
  }

  if (isBatch14DocArchitectureConsolidationPath(normalized)) {
    return { category: "DOC_WORKTREE_SCOPE" };
  }

  if (isBatch11IndexWorktreeScopePath(normalized) || BATCH11_INDEX_WORKTREE_SCOPE_PATH_SET.has(normalized)) {
    return { category: "INDEX_WORKTREE_SCOPE" };
  }

  if (context.testInfraPaths.has(normalized)) {
    return { category: "TEST_INFRA" };
  }

  if (normalized.startsWith("backend/src/routes/")) {
    return { category: "ROUTE" };
  }

  if (normalized.startsWith("backend/src/services/")) {
    return { category: "SERVICE" };
  }

  if (normalized === "backend/prisma/schema.prisma" || normalized.startsWith("backend/prisma/")) {
    return { category: "PRISMA_SCHEMA" };
  }

  if (normalized.startsWith("backend/src/")) {
    return { category: "UNKNOWN" };
  }

  if (normalized.startsWith("backend/scripts/")) {
    return { category: "UNKNOWN" };
  }

  return { category: "UNKNOWN" };
}

function main() {
  console.log("=== AUDIT-LOG-AND-APPROVAL-TRACE-01 CHECK ===");
  must(
    batch09CommercialSplitRouteEntries.length === 6,
    "commercial split route identity remains the exact six-entry current-head family",
  );

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const packageScripts = JSON.parse(pkg).scripts || {};
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const securityDoc = readFile(paths.securityDoc);
  const dataIntegrityDoc = readFile(paths.dataIntegrityDoc);
  const activeRegistryCheckerPaths = buildRegistryOwnedCheckerPaths(packageScripts, productExtensionsCheckScripts);
  const packageOwnershipShas = new Map(
    JSON.parse(readFile(paths.packageOwnershipManifest)).touchedPaths
      .filter((entry) => entry.acceptance === "PASS" && entry.identityRegistered === true && entry.lifecycle && entry.rawSha256)
      .map((entry) => [normalizePath(entry.path), String(entry.rawSha256).toUpperCase()]),
  );
  const coreGuardEntries = [
    { path: "backend/scripts/current_head_scope_policy_01_check.js", sha256: "1B9D790AF2740A338DCC46FB4C317D468073C0D66A166BE254B11F71FECDE2D6" },
   { path: "backend/scripts/lib/currentHeadScopePolicy.js", sha256: "8C2CD3AF926CCA2297701AF5DFEF603E8ECFAA1B2EF9D1B88BB15B941323B668" },
   { path: "backend/scripts/lib/prismaSchemaIdentity.js", sha256: "014012B45C27F7C17FAD497A0053D95183E5D4BCB50E76CAE2B17C5D4E272689" },
  { path: "backend/scripts/lib/productExtensionsRegistry.js", sha256: "6C0FA82E0B7024D4DADF5AA588E33509A5D91866CF39D8D875A0BFEF94064D8F" },
  { path: "backend/scripts/lib/guardGitScope.js", sha256: "2293510B16AABB37453931C32ADC754F5947BE7BED50AFA395E505022C8FB2E1" },
  { path: "backend/scripts/lib/guardRunnerContracts.js", sha256: "1B180E2E1C901041734CCE494774865C9644CA02917B1326B6FEF8EB713E239A" },
    { path: "backend/scripts/lib/guardSmokeEvidence.js", sha256: "D8233D3711D5C4CFE7F41F0B06DE717C6CC67F86F9D21991E19933A4DB5AE28F" },
    { path: "backend/scripts/lib/guardValidationEnvironment.js", sha256: "F894AD74F40A38EDD878B1387423785B48FAEB5F4F224C31668B208B94D95B38" },
    { path: "backend/scripts/run_product_extensions_check_chain.js", sha256: "0147598C4FB8076959907447F4125F3923CC86B8FAA8CFD34C2FA3CF60FFAB03" },
    { path: "backend/scripts/verify_chain_01_product_extensions_check.js", sha256: "F96EF91D2FE5601222C3EFFE6CA172101D252E635BC604BF1CC8DC703C43C54B" },
  ];
  const coreGuardShas = buildExpectedShaMap(coreGuardEntries);
  const approvedCurrentHeadShas = buildExpectedShaMap([
    ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
    ...CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE.filter(({ path: entryPath }) =>
      normalizePath(entryPath) !== "web/src/App.jsx",
    ),
    ...CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY,
  ]);
  const canonicalSmokeIdentityShas = mergeExactIdentityMaps(
    readCanonicalSmokeIdentityMap(paths.allPanelsSmokeReport, {
      auditName: "UX_ALL_PANELS_REALITY_AUDIT_01",
      label: "all-panels smoke evidence",
    }),
    readCanonicalSmokeIdentityMap(paths.premiumSmokeReport, {
      label: "premium smoke evidence",
    }),
  );
  const packageWiredSmokeInfraPaths = buildPackageWiredScriptPaths(packageScripts, "smoke:");
  const batch10DocWorktreePaths = BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET;
  const batch14DocArchitectureConsolidationPaths = new Set([
    "docs/architecture/README.md",
    "docs/architecture/workflows/README.md",
    "docs/architecture/workflows/roles/README.md",
  ]);
  const outOfScopeCurrentHeadHelperPaths = new Set([
    "backend/scripts/run_repo_check_chain.js",
    "backend/scripts/m82_9_dormant_payment_backbone_check.js",
    "backend/src/ops/trustQualityManifest.js",
    "backend/scripts/plan_center_guided_flow_persistence_01_check.js",
    "backend/scripts/pay_01a_readonly_payment_readiness_check.js",
    "backend/scripts/pay_01b_payment_preview_readonly_check.js",
    "backend/scripts/pay_01c_payment_preview_detail_filter_check.js",
    "backend/scripts/pay_01d_payment_preview_csv_export_check.js",
    "backend/scripts/lib/prismaSchemaIdentity.js",
    "backend/scripts/lib/pre18LifecycleClassification.js",
  ]);
  const runtimeDataPaths = new Set([
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
    "backend/artifacts/runtime-data/field-feedback-records.json",
  ]);
  const testInfraPaths = new Set([...batch10DocWorktreePaths, ...batch14DocArchitectureConsolidationPaths, ...packageWiredSmokeInfraPaths]);
  const selfPath = "backend/scripts/audit_log_and_approval_trace_01_check.js";

  const wiringNeedles = [
    [pkg, '"check:auditlogandapprovaltrace01": "node backend/scripts/audit_log_and_approval_trace_01_check.js"'],
    [pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"'],
    [pkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"'],
    [harnessCheck, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [harnessCheck, "check:auditlogandapprovaltrace01"],
    [harnessCheck, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [harnessCheck, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [harnessDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [harnessDoc, "check:auditlogandapprovaltrace01"],
    [harnessDoc, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [harnessDoc, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [guide, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [guide, "check:auditlogandapprovaltrace01"],
    [guide, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [guide, "node backend\\scripts\\audit_log_and_approval_trace_01_check.js"],
    [primer, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [primer, "check:auditlogandapprovaltrace01"],
    [primer, "docs/AUDIT_LOG_AND_APPROVAL_TRACE_01.md"],
    [primer, "backend/scripts/audit_log_and_approval_trace_01_check.js"],
    [securityDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
    [dataIntegrityDoc, "AUDIT-LOG-AND-APPROVAL-TRACE-01"],
  ];
  for (const [text, needle] of wiringNeedles) {
    addContains(cases, `wiring contains ${needle}`, text, needle);
  }

  const headings = [
    "# AUDIT-LOG-AND-APPROVAL-TRACE-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Auditability principles",
    "## 4) Event taxonomy",
    "## 5) Approval trace lifecycle",
    "## 6) Action-prep vs execution boundary",
    "## 7) Approval-required action matrix",
    "## 8) KVKK-safe audit payload policy",
    "## 9) Never-log / never-store matrix",
    "## 10) Role / tenant / scope audit policy",
    "## 11) Rejection / cancel / timeout / stale approval policy",
    "## 12) Runtime-data / generated artifact / commit-external boundary",
    "## 13) AI / Copilot recommendation trace policy",
    "## 14) No write-action / human approval boundary",
    "## 15) Release gate checklist",
    "## 16) What is not changed",
    "## 17) Validation results",
    "## 18) Remaining risks",
    "## 19) Next recommended milestone",
  ];
  for (const heading of headings) {
    addContains(cases, `doc heading ${heading}`, doc, heading);
  }
  addCase(cases, "doc heading order", () => {
    ordered(doc, headings, "audit trace doc heading order");
  });

  const principleNeedles = [
    "static policy / doc / code inventory",
    "Probe gerekli değildir",
    "append-only",
    "deterministic",
    "Action-prep",
    "execution boundary",
    "correlationId",
    "requestId",
    "Companion references",
    "raw secret",
  ];
  for (const needle of principleNeedles) {
    addContains(cases, `principle ${needle}`, doc, needle);
  }

  assertProductExtensionsIncludes(
    "check:auditlogandapprovaltrace01",
    "product extensions registry includes check:auditlogandapprovaltrace01",
    productExtensionsCheckScripts,
  );

  const eventTaxonomy = [
    "recommendation_prepared",
    "approval_requested",
    "approval_granted",
    "approval_rejected",
    "approval_cancelled",
    "approval_expired",
    "action_blocked",
    "action_not_executed",
    "human_override",
    "safety_policy_blocked",
    "stale_context_blocked",
    "scope_mismatch_blocked",
  ];
  for (const needle of eventTaxonomy) {
    addContains(cases, `event taxonomy ${needle}`, doc, needle);
  }

  addCase(cases, "event lifecycle order", () => {
    ordered(doc, [
      "recommendation_prepared",
      "approval_requested",
      "approval_granted",
      "approval_rejected",
      "approval_cancelled",
      "approval_expired",
      "action_blocked",
      "action_not_executed",
      "human_override",
      "safety_policy_blocked",
      "stale_context_blocked",
      "scope_mismatch_blocked",
    ], "audit trace lifecycle order");
  });

  const boundaryNeedles = [
    "PREPARE",
    "DRAFT",
    "EXECUTE",
    "Hidden background action",
    "Silent write-action",
    "Write-action dispatcher",
  ];
  for (const needle of boundaryNeedles) {
    addContains(cases, `action boundary ${needle}`, doc, needle);
  }

  const approvalMatrixNeedles = [
    "RFQ send",
    "offer accept/reject",
    "agreement execute",
    "dispatch apply",
    "driver/vehicle assign",
    "route apply",
    "payment/hakediş execute",
    "messaging/SMS/email/push",
    "provider credential read/write/use",
    "user/admin write",
    "public lead conversion",
    "quality decision apply",
    "agreement route refresh apply",
  ];
  for (const needle of approvalMatrixNeedles) {
    addContains(cases, `approval matrix ${needle}`, doc, needle);
  }

  const payloadFields = [
    "eventType",
    "actorRole",
    "actorScopeType",
    "actorScopeIdHashOrOpaqueRef",
    "targetType",
    "targetScopeType",
    "targetScopeIdHashOrOpaqueRef",
    "actionType",
    "approvalState",
    "policyVersion",
    "reasonCode",
    "timestamp",
    "correlationId",
    "requestId",
    "sourceSurface",
  ];
  for (const needle of payloadFields) {
    addContains(cases, `payload field ${needle}`, doc, needle);
  }

  const neverLogNeedles = [
    "full name",
    "phone",
    "address",
    "email",
    "TCKN",
    "token",
    "refresh token",
    "cookie",
    "password",
    "provider credential",
    "raw GPS",
    "debug payload",
    "secret header",
    "raw access token",
    "raw session token",
  ];
  for (const needle of neverLogNeedles) {
    addContains(cases, `never-log ${needle}`, doc, needle);
  }

  const scopeNeedles = [
    "SUPER_ADMIN",
    "COMPANY",
    "ROOM",
    "DRIVER",
    "PERSONEL",
    "PARENT",
    "SCHOOL",
    "ORGANIZATION",
    "actorScopeType",
    "targetScopeType",
    "actorScopeIdHashOrOpaqueRef",
    "targetScopeIdHashOrOpaqueRef",
    "cross-tenant",
    "cross-org",
    "Scope mismatch blocked",
  ];
  for (const needle of scopeNeedles) {
    addContains(cases, `scope policy ${needle}`, doc, needle);
  }

  const rejectionNeedles = [
    "approval_rejected",
    "approval_cancelled",
    "approval_expired",
    "stale_context_blocked",
    "scope_mismatch_blocked",
    "safety_policy_blocked",
    "action_not_executed",
    "Silent fallback to execution yoktur",
  ];
  for (const needle of rejectionNeedles) {
    addContains(cases, `rejection policy ${needle}`, doc, needle);
  }

  const runtimeBoundaryNeedles = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
    "backend/artifacts/browser-smoke/",
    "backend/artifacts/load-test/",
    "backend/artifacts/db-scaling/",
    "backend/artifacts/observability/",
    "backend/artifacts/data-integrity/",
    "backend/artifacts/role-redteam/",
    "backend/artifacts/security-kvkk/",
    "backend/artifacts/audit-trace/",
    "debug.log",
    "No stage/commit/tag/push",
  ];
  for (const needle of runtimeBoundaryNeedles) {
    addContains(cases, `runtime boundary ${needle}`, doc, needle);
  }

  const aiTraceNeedles = [
    "Copilot öneri, hazırlık ve risk özeti üretebilir",
    "recommendation_prepared",
    "approval_requested",
    "COPILOT-HUMAN-APPROVAL-01",
    "COPILOT-AI-ACTION-ROADMAP-01",
    "COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01",
    "Runtime AI/model execution açılmaz",
    "Tool execution açılmaz",
    "Write-action açılmaz",
    "Human approval explicit ve auditable kalır",
  ];
  for (const needle of aiTraceNeedles) {
    addContains(cases, `ai trace ${needle}`, doc, needle);
  }

  const noWriteNeedles = [
    "No production DB",
    "No public URL",
    "No real token/credential generation",
    "No destructive query",
    "No schema/migration",
    "No route/service/prisma diff",
    "No runtime AI/model execution",
    "No stage/commit/tag/push",
    "No smoke threshold loosening",
    "No 429 allowlist",
    "No hidden auto-execute",
    "No admin/user write",
  ];
  for (const needle of noWriteNeedles) {
    addContains(cases, `write boundary ${needle}`, doc, needle);
  }

  const releaseGateNeedles = [
    "check:auditlogandapprovaltrace01",
    "check:securitykvkkfinal01",
    "check:roledataisolationredteam01",
    "check:dataintegrityandrecovery01",
    "check:backendlintwarningburndown01",
    "check:observabilitymonitoringalerting01",
    "check:dbpoolandapiscaling01",
    "check:loadtest2000users01",
    "check:cachecoalescingandbackoff01",
    "check:dashboardbulkendpoint01",
    "check:productionratelimitpolicy01",
    "check:requeststormresilience01",
    "check:airesponsesemanticqualitygate01",
    "check:testqualityandflakeaudit01",
    "check:hotfilesplitwebpanels01",
    "check:hotfilesplitaichatcomposers01",
    "check:copilotnextbestactionengine01",
    "check:copilotoperationhealthengine01",
    "check:copilotplanreviewengine01",
    "check:copilotworkflowreasoningengine01",
    "check:seferabiturkishterminology01",
    "check:seferabiturkishuserfacinglanguage01",
    "check:copilotriskscoringengine01",
    "check:copilotrootcauseengine01",
    "check:copilotsmartdiagnosticengine01",
    "check:copilotdynamicquestionengine01",
    "check:copilotclarifyingquestionengine01",
    "check:copilotroutereviewhumanapproval01",
    "check:exceltoroutereadinessredteam01",
    "check:product-extensions",
    "verify:repo",
    "verify:final",
    "npm --prefix backend run lint",
    "npm --prefix web run lint",
    "18/82/82/82",
    "consoleErrorCount=0",
    "pageErrorCount=0",
    "429=none",
  ];
  for (const needle of releaseGateNeedles) {
    addContains(cases, `release gate ${needle}`, doc, needle);
  }
  addCase(cases, "release gate checklist order", () => {
    ordered(doc, [
      "check:auditlogandapprovaltrace01",
      "check:securitykvkkfinal01",
      "check:roledataisolationredteam01",
      "check:dataintegrityandrecovery01",
      "check:backendlintwarningburndown01",
      "check:observabilitymonitoringalerting01",
      "check:dbpoolandapiscaling01",
      "check:loadtest2000users01",
      "check:cachecoalescingandbackoff01",
      "check:dashboardbulkendpoint01",
      "check:productionratelimitpolicy01",
      "check:requeststormresilience01",
      "check:airesponsesemanticqualitygate01",
      "check:testqualityandflakeaudit01",
      "check:hotfilesplitwebpanels01",
      "check:hotfilesplitaichatcomposers01",
      "check:copilotnextbestactionengine01",
      "check:copilotoperationhealthengine01",
      "check:copilotplanreviewengine01",
      "check:copilotworkflowreasoningengine01",
      "check:seferabiturkishterminology01",
      "check:seferabiturkishuserfacinglanguage01",
      "check:copilotriskscoringengine01",
      "check:copilotrootcauseengine01",
      "check:copilotsmartdiagnosticengine01",
      "check:copilotdynamicquestionengine01",
      "check:copilotclarifyingquestionengine01",
      "check:copilotroutereviewhumanapproval01",
      "check:exceltoroutereadinessredteam01",
      "check:product-extensions",
      "verify:repo",
      "verify:final",
      "npm --prefix backend run lint",
      "npm --prefix web run lint",
    ], "audit trace release gate order");
  });

  const companionNeedles = [
    "SECURITY-KVKK-FINAL-01",
    "ROLE-DATA-ISOLATION-REDTEAM-01",
    "DATA-INTEGRITY-AND-RECOVERY-01",
    "OBSERVABILITY-MONITORING-ALERTING-01",
    "DB-POOL-AND-API-SCALING-01",
    "LOAD-TEST-2000-USERS-01",
    "CACHE-COALESCING-AND-BACKOFF-01",
    "REQUEST-STORM-RESILIENCE-01",
    "PRODUCTION-RATE-LIMIT-POLICY-01",
  ];
  for (const needle of companionNeedles) {
    addContains(cases, `companion ${needle}`, doc, needle);
  }

  const validationTokens = [
    "auditabilitySummary",
    "approvalMatrixSummary",
    "eventTaxonomySummary",
    "traceLifecycleSummary",
    "kvkkSafeAuditPayloadSummary",
    "runtimeGeneratedArtifactSummary",
    "humanApprovalBoundarySummary",
    "compatibilitySummary",
    "smokeThresholdSummary",
    "chainWiringSummary",
    "commitExternalSummary",
    "prismaSummary",
  ];
  for (const needle of validationTokens) {
    addContains(cases, `validation token ${needle}`, doc, needle);
  }

  const validationSummaryNeedles = [
    "append-only audit and approval trace stays visible",
    "approval-required action matrix stays blocked until explicit human approval",
    "recommendation_prepared, approval_requested, approval_granted, approval_rejected, approval_cancelled, approval_expired, action_blocked, action_not_executed, human_override, safety_policy_blocked, stale_context_blocked, scope_mismatch_blocked",
    "trace moves from recommendation to request to approval or block, then stops without silent execution",
    "eventType, actorRole, actorScopeType, actorScopeIdHashOrOpaqueRef, targetType, targetScopeType, targetScopeIdHashOrOpaqueRef, actionType, approvalState, policyVersion, reasonCode, timestamp, correlationId, requestId, sourceSurface and no raw PII/token/credential/raw GPS",
    "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace remain commit-external",
    "no write-action / human approval boundary stays visible",
    "SECURITY-KVKK-FINAL-01 | ROLE-DATA-ISOLATION-REDTEAM-01 | DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01",
    "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none",
    "package.json + runner + verify chain + harness check/doc + guide + primer",
    "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace are commit-external; stage stays empty",
    "No route/service/prisma diff; no production DB; no schema/migration; read-only only",
  ];
  for (const needle of validationSummaryNeedles) {
    addContains(cases, `validation summary ${needle}`, doc, needle);
  }

  const summaryPairs = [
    ["auditabilitySummary", "append-only audit and approval trace stays visible"],
    ["approvalMatrixSummary", "approval-required action matrix stays blocked until explicit human approval"],
    ["eventTaxonomySummary", "recommendation_prepared, approval_requested, approval_granted, approval_rejected, approval_cancelled, approval_expired, action_blocked, action_not_executed, human_override, safety_policy_blocked, stale_context_blocked, scope_mismatch_blocked"],
    ["traceLifecycleSummary", "trace moves from recommendation to request to approval or block, then stops without silent execution"],
    ["kvkkSafeAuditPayloadSummary", "eventType, actorRole, actorScopeType, actorScopeIdHashOrOpaqueRef, targetType, targetScopeType, targetScopeIdHashOrOpaqueRef, actionType, approvalState, policyVersion, reasonCode, timestamp, correlationId, requestId, sourceSurface and no raw PII/token/credential/raw GPS"],
    ["runtimeGeneratedArtifactSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace remain commit-external"],
    ["humanApprovalBoundarySummary", "no write-action / human approval boundary stays visible"],
    ["compatibilitySummary", "SECURITY-KVKK-FINAL-01 | ROLE-DATA-ISOLATION-REDTEAM-01 | DATA-INTEGRITY-AND-RECOVERY-01 | OBSERVABILITY-MONITORING-ALERTING-01 | DB-POOL-AND-API-SCALING-01 | LOAD-TEST-2000-USERS-01 | CACHE-COALESCING-AND-BACKOFF-01 | REQUEST-STORM-RESILIENCE-01 | PRODUCTION-RATE-LIMIT-POLICY-01"],
    ["smokeThresholdSummary", "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none"],
    ["chainWiringSummary", "package.json + runner + verify chain + harness check/doc + guide + primer"],
    ["commitExternalSummary", "runtime-data/browser-smoke/load-test/db-scaling/observability/data-integrity/role-redteam/security-kvkk/audit-trace are commit-external; stage stays empty"],
    ["prismaSummary", "No route/service/prisma diff; no production DB; no schema/migration; read-only only"],
  ];
  for (const [key, value] of summaryPairs) {
    addContains(cases, `summary ${key}`, doc, `${key}=${value}`);
  }

  const files = gitStatusNames();
  const stageEmpty = gitLines(["diff", "--cached", "--name-only"]).length === 0;
  const diffCheckClean = gitLines(["diff", "--check"]).length === 0;
  const cachedDiffCheckClean = gitLines(["diff", "--cached", "--check"]).length === 0;
  const prismaDiffEmpty = gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0;
  const gitShowCheckClean = gitLines(["show", "--check", "--stat", "HEAD"]).length > 0;
  const debugLogAbsent = !fs.existsSync(paths.debugLog);

  addCase(cases, "working tree hygiene", () => {
    const failures = [];

    for (const file of files) {
      const classification = classifyDirtyPath(file, {
        selfPath,
        registryCheckerPaths: activeRegistryCheckerPaths,
        coreGuardShas,
        approvedCurrentHeadShas,
        packageOwnershipShas,
        canonicalSmokeIdentityShas,
        batch09ApprovedConcurrentWorktreeShas,
        batch09CommercialSplitRouteShas,
        batch09ProvenanceClosureShas,
        runtimeDataPaths,
        outOfScopeCurrentHeadHelperPaths,
        batch10DocWorktreePaths,
        testInfraPaths,
      });

      if (classification.detail) {
        failures.push(`${file} => ${classification.category} (${classification.detail})`);
        continue;
      }

      switch (classification.category) {
        case "SELF_AUDIT_APPROVAL_GUARD":
        case "ACTIVE_PRODUCT_EXTENSION_CHECKER_INFRA":
        case "BATCH13_FOUNDATION_OWNER":
        case "BATCH13_FOUNDATION_SUPPORT":
        case "BATCH13_FOUNDATION_COMMAND_SURFACE":
        case "BATCH13_APP_JSX_MIGRATION_CONSUMER":
        case "COMMERCIAL_PAYMENT_SECURITY_CHECKER_INFRA":
        case "CORE_GUARD_INFRA":
        case "APPROVED_CURRENT_HEAD_PRODUCT":
        case "CANONICAL_PACKAGE_OWNERSHIP_IDENTITY":
        case "CURRENT_CANONICAL_SMOKE_EVIDENCE":
        case "CURRENT_PRESENTATION_AUTHORITY":
        case "APPROVED_CONCURRENT_CANONICAL_WORKTREE":
        case "APPROVED_CONCURRENT_CANONICAL_ROUTE":
        case "CURRENT_CLOSURE_CORRECTIVE":
        case "PAUSED_MILESTONE_WORKTREE":
        case "LEGITIMATE_CANONICAL_NEW_FILE":
        case "PROVEN_BATCH09_CHANGE":
        case "M80_M89_CONTRACT_SWEEP_REPO_CONTRACT":
        case "DOC_WORKTREE_SCOPE":
        case "OUT_OF_SCOPE_CURRENT_HEAD_HELPER":
        case "INDEX_WORKTREE_SCOPE":
        case "TEST_INFRA":
        case "RUNTIME_DATA":
        case "AUDIT_APPROVAL_OWNED_PRODUCT":
        case "APPROVED_TERMINOLOGY_PRESENTATION":
        case "LIFECYCLE_DEFERRED_PRESENTATION_SOURCE":
        case "HISTORICAL_NONAUTHORITATIVE":
        case "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT":
        case "ACTIVE_CURRENT_HARNESS":
        case "ACTIVE_CURRENT_SOURCE":
        case "DURABLE_CURRENT_CHECKER":
        case "CURRENT_PRE_18_PRODUCT_FLOW":
        case "ACTIVE_MILESTONE_GOVERNANCE":
        case "ROLE_TENANT_AUTH_OWNED_PRODUCT":
        case "PROJECT_GAP_READINESS_14":
          break;
        case "ROUTE":
        case "SERVICE":
        case "PRISMA_SCHEMA":
        case "AUDIT_APPROVAL_OWNED_PRODUCT":
        case "SECURITY_KVKK_OWNED_PRODUCT":
        case "UNKNOWN":
        default:
          failures.push(`${file} => ${classification.category}`);
          break;
      }
    }

    must(failures.length === 0, `working tree hygiene: ${failures.join(", ") || "(none)"}`);
  });
  addCase(cases, "stage remains empty", () => must(stageEmpty, "staged files present"));
  addCase(cases, "git diff --check stays clean", () => must(diffCheckClean, "git diff --check findings"));
  addCase(cases, "git diff --cached --check stays clean", () => must(cachedDiffCheckClean, "git diff --cached --check findings"));
  addCase(cases, "route diff stays compatible", () => {
    mustStatusSubsetWithIdentity(
      ["backend/src/routes"],
      [
        ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) => entryPath.startsWith("backend/src/routes/")),
      ],
      "route diff stays compatible",
    );
  });
  addCase(cases, "service diff stays compatible", () => {
    // Clean historical services are not current working-tree scope. Keep the
    // existing exact identity allowlist for any service that is actually
    // changed, while rejecting unexpected paths and identity mismatches.
    mustStatusSubsetWithIdentity(
      ["backend/src/services"],
      CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) => entryPath.startsWith("backend/src/services/")),
      "service status stays compatible",
    );
  });
  addCase(cases, "prisma diff stays empty", () => must(prismaDiffEmpty, "prisma diff not empty"));
  addCase(cases, "git show --check --stat HEAD succeeds", () => must(gitShowCheckClean, "git show --check --stat HEAD produced no output"));
  addCase(cases, "debug.log stays absent", () => must(debugLogAbsent, "debug.log exists"));

  const results = [];
  for (const entry of cases) {
    try {
      entry.fn();
      results.push({ label: entry.label, ok: true });
    } catch (error) {
      results.push({ label: entry.label, ok: false, error: error?.message || String(error) });
      console.log(`FAIL ${entry.label}`);
    }
  }

  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const guardCases = results.length;

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.error(`FAIL ${failure.label}: ${failure.error}`);
    }
    console.log(`guardCases=${guardCases}`);
    console.log(`passCount=${passCount}`);
    console.log(`failCount=${failCount}`);
    process.exit(1);
  }

  const summaryLines = summaryPairs.map(([key, value]) => `${key}=${value}`);

  console.log("PASS AUDIT-LOG-AND-APPROVAL-TRACE-01");
  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log("failCount=0");
  for (const line of summaryLines) {
    console.log(line);
  }
}

main();
