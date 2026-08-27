#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsCheckScripts } from "./lib/productExtensionsRegistry.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";
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
    { path: "backend/scripts/canonical_provenance_registry_01_check.js", sha256: "367A0ECC128DEE9B5B8BD9B969518CFF390DF0F16D1FFC30B3C1A5216F01644C" },
  { path: "backend/scripts/lib/canonicalProvenanceRegistry.js", sha256: "1B8216B400772F3F1D3FACD55BC690FCC2CC662BB3CB93006117534AC6D32F19" },
  { path: "backend/scripts/ux_all_panels_reality_audit_01_check.js", sha256: "F4F9BE905D1908ED9FB632225404968F36080F7B30785A20534D5D7C65380567" },
  { path: "backend/src/bootstrap/rateLimits.js", sha256: "92C93F276B04E5B4A3179E5F93D6396A37FA968000AA2FCEAE1E1F51752E0135" },
  { path: "backend/src/middleware/apiRequestLog.js", sha256: "5F27CA48608B10C6DDCD35F9D1C1E146D6AD432EAD63C90CF117F0EA3A051EE3" },
  { path: "backend/src/middleware/asyncHandler.js", sha256: "F206378CE995B6B15A3C340F81E8F8B16EDA65638558EF46F1F373ABBF166F0C" },
  { path: "infra/docker-compose.yml", sha256: "020E0CDFC9745991CB349FED12CEB741BFB973540116FD4664F8ACEFB7A09B22" },
];
const batch09ApprovedConcurrentWorktreeShas = buildExpectedShaMap(batch09ApprovedConcurrentWorktreeEntries);

const batch09CommercialSplitRouteEntries = Object.freeze(
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) =>
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

const terminologyPresentationEntries = [
  { path: "backend/scripts/_m91_route_preview_checks.js", sha256: "6C75E26FE4A66F5455EE95433C9E979C81364AA9227D25C27E504D0B07C9A1AB" },
  { path: "backend/scripts/m97_a_room_operation_panel_check.js", sha256: "3A6B0A1661EB031B0DC4BA60F75CB84A8BF9B090A39D36318493DA70EE0A70D9" },
  { path: "backend/scripts/m97_panel_operations_check.js", sha256: "6D2A01359E0DAE2A98F8C8E2FF298ABD6412581D872265BE831E97CCA39E3A74" },
  { path: "backend/src/ai/chat/conversationNextBestActionEngine.js", sha256: "82516EBDCBBAAC3A55720BE5964AA22B9445AD7F34B3ED71CD73750C93742F89" },
  { path: "backend/src/ai/chat/conversationPlanReviewEngine.js", sha256: "7B1448F9D8C541752D2465AFBDA8975049A1EAA68EE0D79FD5F593FB49F990C1" },
  { path: "backend/src/ai/chat/conversationRiskScoringEngine.js", sha256: "D0E21A934786272637BEA2E8829F8927AE3A9F0569FE0205A6295D9243F7FBA9" },
  { path: "backend/src/ai/chat/conversationRootCauseEngine.js", sha256: "CBC5B263197B38BB02ABE2711EE80F7A0A573F5C908B11317B1DC4E2695416FA" },
  { path: "backend/src/ai/chat/conversationTaskStateBuilders.js", sha256: "054C67A0FCB07EE54FD7C7A642F9E6080E547126307620787420A37C574ADACB" },
  { path: "backend/src/ai/chat/conversationTaskStateShared.js", sha256: "E2A9332B326726D209B4FEAD880DC74AD62FAE5077BC4474FA8B29757C5902F8" },
  { path: "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js", sha256: "5133BC61EF9503AE31E13190E385FCE58D01B8E2F931B1E7E67A256DB752FBB7" },
  { path: "backend/src/ai/chat/copilotGuidedTaskEngine.js", sha256: "3DE44F99FACA4D50B60E8727DDC8F47A16AD8A835255515340FC7DC172371A25" },
  { path: "backend/src/ai/chat/replyShapes.js", sha256: "2BB1C0C9DD849117EA1A7D0E37E77AE3FF20BE8223114893E38F68CD27CD634C" },
  { path: "backend/src/ai/chat/seferAbiReasoningAssistant.js", sha256: "3C5C91BB8C2E165C4F25885D96FEE7573A35B480D5FE79FB86D1D8A58951BD06" },
  { path: "backend/src/ai/chat/supplierOfferCollect.js", sha256: "FDB2F570EA959A82AD7C34270BDB73D51D69522CEE81517DE65F9C225C0B9196" },
  { path: "mobile/src/app/kvkkVisibilityMatrixState.js", sha256: "048B0B913E9B3CC878171DEC6085A85C6EF0D16669B3D7054E209AD5C18AE1A3" },
  { path: "mobile/src/app/notificationState.js", sha256: "3F7683D6C8EF4743CF70E2A65C059F60360C79EA5F6A9A820D69E9925B2A4BC3" },
  { path: "mobile/src/lib/roleSurface.js", sha256: "EBFB4FEA201F3342C8593BC3170292545C9AE8F4DF62EB5B14EE8B5D74B2F9B2" },
  { path: "mobile/src/screens/DriverAvailabilityCard.js", sha256: "3CA4DFC7700E313936DEACD0253B92979C17C32F5709D115013472B325F0FB4D" },
  { path: "mobile/src/screens/DriverTaskSummaryCard.js", sha256: "383F2EB7ADD7B061082742E036496F5621C4700D074A323C0751B0C184B9E9D5" },
  { path: "web/src/components/AgreementOpsBridgeCard.jsx", sha256: "AFDD26D1161EB49691AD99B4759D687A68DA3474F7CF23978E61027E016E84CC" },
  { path: "web/src/components/PanelFeedbackEntryCard.jsx", sha256: "9A12E8D2AF97F597C5E20A1D0D5C4451D23B94BDE6C5D8F5059FCA9554C185AA" },
  { path: "web/src/components/PaymentPreviewReadonlyCard.jsx", sha256: "DF1B97A17E3AD95AA9C4211979D5ED599A53F9B9B22F8F313C3AAEB4120D4EB7" },
  { path: "web/src/components/ProviderScoreBadge.jsx", sha256: "D6D6040C8F32F2878D58AA4C70C0076668D34DFAB251220E13280A3F7FB0FA29" },
  { path: "web/src/components/ShiftReassignModal.jsx", sha256: "39E7175C89660CAAC5B38E01FF34C92B7BE0A894653B5DC11BFA754EA48EA06A" },
  { path: "web/src/components/TabletOpsQuickBar.jsx", sha256: "75EC308D8EFBDA0968836B65314424E0550C5531BE74994D7F252739F87FDEE7" },
  { path: "web/src/components/public/PublicLeadCaptureModal.jsx", sha256: "CDEA6F178FADE481C7493D7120D09A8473941277F7A5A416789D94A9C52C008E" },
  { path: "web/src/copilot/screenRegistry.js", sha256: "8DBD885C95760A7AF22547222E33FDE559662EB70D8A981DBC92161711B93463" },
  { path: "web/src/layout/AppShell.jsx", sha256: "0F5FACA46B7B87B1EE02B977C17CE1B215B261CB2AE46A7DB93C9467EBDE7642" },
  { path: "web/src/layout/NavDock.jsx", sha256: "AE535CA9FAEE94296FA4321FCCB37ECD69436BA6A4C0D4F238FE01C0B9B5A2A8" },
  { path: "web/src/panels/company/AgreementWizard.jsx", sha256: "C4A8E949F5E6D08BBBD4377E4DAC675E157F93AB5E3F14DADC11996C212B5D69" },
  { path: "web/src/panels/company/AgreementsPanel.jsx", sha256: "E2CDE19CAAC5DA1F66A34DF9366CBFD1775A3D93135421E2A232C6B344C01385" },
  { path: "web/src/panels/company/CommercialFlowPanel.jsx", sha256: "458DED3385528CD844B92C850047861260CB5723A08447F2F8C559A8F6A14023" },
  { path: "web/src/panels/company/CompanyShiftsPanelIntro.jsx", sha256: "01287DBE39ABBC9230B6EB8374349D41754E7DA8665ED720CDCAD9F41B3BDB18" },
  { path: "web/src/panels/company/CompanyShiftsPanelTrackView.jsx", sha256: "2776ADDD4CCD64A5B41C636196BE609569A05D3958CFB7997E79FB6D1860C95B" },
  { path: "web/src/panels/company/OperationsPanel.jsx", sha256: "CACA1085258C8729B2DE3F86CE1BA198C6354FD18A9F579F0415D05151EF0AC0" },
  { path: "web/src/panels/company/WorkflowPanel.jsx", sha256: "51307B906EF7DD100457B1D20DB8C9A5334346BB637D50A989935C960AE7E633" },
  { path: "web/src/panels/company/companyAgreementsOverviewSection.jsx", sha256: "148A6DF5ADC12C6EA41B80165B9A95E6446F3480B03D6FC5D1C25B89945B4DE9" },
  { path: "web/src/panels/company/companyShiftsPanelMobileCards.jsx", sha256: "60187450BB9784FEF006F578E62FEBC73CF397A4C3B54AC6030C80FD443A62A3" },
  { path: "web/src/panels/company/companyShiftsPanelRows.jsx", sha256: "B07A8F54B897DB829E43F51B63CB6B254122504A8B99D9C400A827371D058431" },
  { path: "web/src/panels/company/companyShiftsPanelSections.jsx", sha256: "DC75C0A30D93349F5362D7312B1E379E475ACA0D3619D3C2EB701A54EE20871F" },
  { path: "web/src/panels/company/companyShiftsPanelSummaryCells.jsx", sha256: "9E9A2CBEC80267BA1C26B1D927F9BD0CD52EB4727F42D66316D95D51EB6D10A2" },
  { path: "web/src/panels/personel/LivePanel.jsx", sha256: "D73D0C93507094953BD1EEEAE6FA57CF656CDC662534F384199F132342B766F1" },
  { path: "web/src/panels/personel/MyRidePanel.jsx", sha256: "32F6236954D5A600FFD56A5D80BF83B61373AB5756CB2516F50D24156E876429" },
  { path: "web/src/panels/room/AgreementsPanel.jsx", sha256: "A95D9BC43959CC0ED6417B2376CA9BB5A20B4F05D99B5A93BAEEF9824799D309" },
  { path: "web/src/panels/room/CheckinPanel.jsx", sha256: "82018D28BD380E16B1A0434A8BF6728FC36BDDC6D43D76FC2640BED3E4354663" },
  { path: "web/src/panels/room/CommercialFlowPanel.jsx", sha256: "221744071AD73366242BCA96C6986F76B51BDD4703FCC8FF5806D622B7C29DEE" },
  { path: "web/src/panels/room/DriversPanel.jsx", sha256: "7E1E31C2813A24B95D384441FDFD587924EC3672CA8F7047CE3D35E0AFDF3DD4" },
  { path: "web/src/panels/room/MapPanel.jsx", sha256: "AB49A5566EDD95B31EE03FC42AD352E45C17E5EEA616188965212DC78376C6C0" },
  { path: "web/src/panels/room/OffersPanel.jsx", sha256: "72D0CFC54D1C2983BD97E00BC7BADA008CECF09797BA3C92EE4FE470700ED203" },
  { path: "web/src/panels/room/OperationHealthPanel.jsx", sha256: "597E1D7B915FF732A768AB4662D7623961A2557BEE815B7D8CB56FDEAC0FD068" },
  { path: "web/src/panels/room/VehiclesPanel.jsx", sha256: "6AF5573297F292976419FF0BC5635EEB06A9CEA7BC023AAD0EE11D0B7AB4D14D" },
  { path: "web/src/panels/room/roomAgreementsBridgeSection.jsx", sha256: "E4253C757A7072B1213E44C089B49B47C79EFE05119672D85C01A8FDC3322A5C" },
  { path: "web/src/panels/room/roomAgreementsPanelSections.jsx", sha256: "7D0E6F5D5F9EFC80FCD6F87BC98EB562923714B18F94C1C1DAE72B9A62FCDDB1" },
  { path: "web/src/panels/room/roomOperationsBoard.jsx", sha256: "7E0CBCE7F95BE5C49C9505199F94B04EA5F75211A04C5E4E1E525F959F77C549" },
  { path: "web/src/panels/room/roomShiftsPanelActions.js", sha256: "0E048187178FCEDADE083C859F9EAA0F3E6D02EA8B33412971E90B3756CD2EF1" },
  { path: "web/src/panels/shared/AgreementRouteChangePreviewCard.jsx", sha256: "B0E4C08F73A539847163509D67528B2136835F76C66A1C2C2F9E81C316979447" },
  { path: "web/src/panels/shared/BoardingChangeRequestEntryCard.jsx", sha256: "29E8187256F8E92A46D0828FF2F483CB8CEDA47492671D92A102AF5DDFC843A6" },
  { path: "web/src/panels/shared/CopilotPanel.jsx", sha256: "E49964BF976DFEAC565ECF080098B86318FD122C79E93F4770455E4D2139D72D" },
  { path: "web/src/panels/shared/financialOperationsPresentation.js", sha256: "D7E79FA18725675652AE7692711A59D9D2730EC99514786DAD19986E32CCE59B" },
  { path: "web/src/panels/shared/OfferQualityRankingCard.jsx", sha256: "D31D936C3DF191571E1CB15B42AA01269424744270ECF23B334B3D3D96F00D41" },
  { path: "web/src/panels/shared/SafeDriveSummaryCard.jsx", sha256: "E32862CD035CC336980F091F6975E71878010210159E676E888DE332B72708B2" },
  { path: "web/src/panels/superadmin/CompaniesPanel.jsx", sha256: "BC811B33D764D56ACC2C0D22ABA6F725A9E65DE824E2180E7CEF840B6E786FF4" },
  { path: "web/src/panels/superadmin/PublicLeadReviewPanel.jsx", sha256: "1B8C958B5864FDCE7E670D9A5A8B8D4146CF0ACFDECE697BF374FA1581C9C4EF" },
  { path: "web/src/panels/superadmin/RegionsPanel.jsx", sha256: "3FEA849F097B082E6F57CE5E2F04657738452AA7E8291A3AC83B04161CB1F21B" },
  { path: "web/src/panels/superadmin/RoomsPanel.jsx", sha256: "85A442A7B1E0E82297D3BC91FEB13FF7136466BF930BB7A37BAD590AABA15165" },
  { path: "web/src/panels/superadmin/SuperAdminPanel.jsx", sha256: "FED964C43B0632A12F34246181620D14B3630A480588B55878BFFF537AB2DBDE" },
  { path: "web/src/panels/superadmin/TelematicsHubPanel.jsx", sha256: "17FC6BA18D89C94DA5E348E6955DECB9E5AAB04203CFD99D92E21AAEA2798FAE" },
  { path: "web/src/panels/superadmin/UsersPanel.jsx", sha256: "903ED1F7B0CA5CA7F20F8823E3ED06EDF5EF271F073DD930B8DEF44FA7538C4B" },
  { path: "web/src/utils/copilotPanelHelpers.js", sha256: "454F51E8450AE9A8F08BC166874EE9458D68AC677B9B2E37D96076600105CF97" },
  { path: "web/src/utils/labels.js", sha256: "EBC0D0470AF8484D4AC5139176B09BAC9CA247D30915B7C30FD81D9BCC063282" },
  { path: "web/src/utils/safeDriveSummary.js", sha256: "EBAF201CD46BD87B66FE83CE57B16479FD5DCB5F3AA2D88F5ECE1E9C3C4E4707" },
  { path: "backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js", sha256: "D4F4CC432F0BC7139602EC53B72FAA2473404876E77D4E54AF90445A08D0F099" },
  { path: "backend/src/ai/jobGuide/levels.js", sha256: "5E75C97EEB12975244E4634DDA4AFF9F3016DA7FAC9732756CEB4035569259AB" },
  { path: "backend/src/ai/jobGuide/screenCatalog.js", sha256: "45FF585D95A4DF8C64ABE6DFA403ACE53D130B78CBAB27B35599CE12FDBF04D5" },
  { path: "docs/BUG_ROUTE_IMPACT_PREVIEW_BUTTON_01.md", sha256: "069127242E08DE3A762DCD22447F60D484485D5CE6008A4C8B1CF30409CF3C75" },
  { path: "mobile/src/screens/ParentActivationCard.js", sha256: "84FD1481A050B5757C8FA54BAED869B46EC4B15BB86F20017BD7C33DDA914E5E" },
  { path: "web/src/components/PaymentReadinessReadonlyCard.jsx", sha256: "DCFA5652EF4B23A2E4BDA052EB1492FCBD4001DFC5CEF53F43BE9F2063D237EC" },
  { path: "web/src/panels/company/CheckinPanel.jsx", sha256: "EE5AFE21578A32E69AA8748E38A1976329EE98088EDBFA0449625A957B9C9588" },
  { path: "web/src/panels/company/GeoReviewPanel.jsx", sha256: "D283A0EB5722232669AE9D9D63EE77A9A52567751E517ACDB1035C286FBF76F8" },
  { path: "web/src/panels/company/GuidedPlanModal.jsx", sha256: "E5EC95F4B31A1A0F071C6AD8CBC03FB4EE92792AA83D04F33B9FD031FB2A4952" },
  { path: "web/src/panels/company/HubPanel.jsx", sha256: "68E237BA03F6DA83A91C49EAE170BEB3D6F398A6882417A17AFAF8376AAE359E" },
  { path: "web/src/panels/company/MapPanel.jsx", sha256: "286215AB696E6FE48063DB1A788AB70FE6055E4DCF73D8F9464FBF1761AAAEBF" },
  { path: "web/src/panels/company/PersonelAccessPanel.jsx", sha256: "EBB8050CBB35330E2A96F7A9321673220FDB87271FB101F737B0A8879CC8600A" },
  { path: "web/src/panels/company/ServiceEvaluationPanel.jsx", sha256: "BBEA2130687645E8ADE39EC3559F0A9C61E6FAEE8A74E7AEEAB47DBAD641E59C" },
  { path: "web/src/panels/company/ShiftPeopleTab.jsx", sha256: "A0A065404FE7EF996E5F3D1ADEB496882B561648A28F50A8D1F7957FDEA57FE2" },
  { path: "web/src/panels/company/ShiftTemplatesPanel.jsx", sha256: "934055EEB7407E6AEA43566302A6FFB9689E445A7771AC1C41F6217689A0673E" },
  { path: "web/src/panels/company/ShiftsPanel.jsx", sha256: "9C37254ACA2907EA15C575BD91D5A020DE27991F0BCC1FC1FA62179165368BF5" },
  { path: "web/src/panels/company/companyAgreementsMobileCards.jsx", sha256: "7C912C134C0E7495D5A4C5970246D310FCE8F64D70F987D8302EC7141D84EA9E" },
  { path: "web/src/panels/company/companyShiftsPanelActions.js", sha256: "BA93A4ADE7F75C6B575A3BCC2B3188CA01166B5746B7F4DCC7CEA9223E34D218" },
  { path: "web/src/panels/company/companyShiftsPanelCards.jsx", sha256: "609A195CEF5DD173B9399535D19134C966E5173CE12000AD47E443103D618C17" },
  { path: "web/src/panels/company/companyShiftsPanelFilters.jsx", sha256: "2606B60E3524B61287C619D4587CE28E137B4E1FAE0249E5ACCC48FEAC86C9B4" },
  { path: "web/src/panels/company/guidedPlanModalActions.js", sha256: "6D1ECC91CBDFE38F679B158DF764887DEEDB0799A67545A45C0C0E25B30A0496" },
  { path: "web/src/panels/company/guidedPlanModalCards.jsx", sha256: "B8E7107F8DD19EF48AD6CE714471C5D49995C3B50250C3C9F30EF42AE531D9EB" },
  { path: "web/src/panels/company/guidedPlanModalDestinationCards.jsx", sha256: "6F3A63C50F70ECA5CA88F7C4189CDC6A53C3BF4A147FAAF6AF0C0AEFE0A90DAE" },
  { path: "web/src/panels/company/guidedPlanModalSections.jsx", sha256: "2FE8C218EEB7E90A67D1290B9065B6463C8E0FADE4F4E28FB6B842CF8C77E803" },
  { path: "web/src/panels/company/planBuilderPanelActions.js", sha256: "9897F8A0D0F48AD04E1A188F86E7573B257E3EC3DE44637E92A7E5855F122AB8" },
  { path: "web/src/panels/company/planBuilderPanelSections.jsx", sha256: "B6C0BC2E56DCD8C932F8D7F63BBAE4166E234C13059B7651A8B75D68A380E855" },
  { path: "web/src/panels/company/shiftPeopleTabSections.jsx", sha256: "809972D1C88F11846344BBB500BDA863BF9F67A79EAA713D35DDEDC784BD4FCF" },
  { path: "web/src/panels/company/shiftsPanelOfferUtils.js", sha256: "A4979AD7BD0B3CAFA40D7DF750262CB985B04A589E264967FBF7AEBE41030B88" },
  { path: "web/src/panels/driver/RoutePanel.jsx", sha256: "0116E9F41C6AB1BA6C60C6E903B55BF93A7AD68B042E87742EE64F78F183717D" },
  { path: "web/src/panels/driver/CheckinPanel.jsx", sha256: "7737404647D0FCE22198BFA3A143DC185702E98FEC5AAEA00DBFBFA13C357FDB" },
  { path: "web/src/panels/organization/CenterPanel.jsx", sha256: "AA242BEB3D7E8B4CC64EE2685E0014832288E4EDE4EE931D63BDC405C8427DE0" },
  { path: "web/src/panels/organization/PlansPanel.jsx", sha256: "EF3A8A027E833B6534FCA788F274B96CB2A367688FA059E6F42D0512E40F4D8A" },
  { path: "web/src/panels/organization/organizationPlansShared.jsx", sha256: "4BC15C534A9399FFBB56C31AE256DAA5339D792CCB37A3211519DCE9E19D572C" },
  { path: "web/src/panels/public/PublicLandingPage.jsx", sha256: "0C5C4FA0BD3239D86466BCC032FF693C946040B9940C1606D7F361C977FDBBD2" },
  { path: "web/src/panels/public/PassengerLivePanel.jsx", sha256: "79E4AEAF56B106F966E923701CD07B85A97C8959A47F477872426B60F91944DF" },
  { path: "web/src/panels/room/HubPanel.jsx", sha256: "5D862BDA535D75AB91F788C63D9AD9B0F33DEB93BC288162D62E3F7845BA0C4E" },
  { path: "web/src/panels/room/ShiftsPanel.jsx", sha256: "7C4258644A9E5998059BDD07FA57682C297A826FEC9C6BAFE431B4FB7846EC4A" },
  { path: "web/src/panels/room/roomShiftsMainSections.jsx", sha256: "54492ACB7BDA42CBD10122A5891C6D12E44B271C06CF0B9B7ACD45F37D6FB854" },
  { path: "web/src/panels/room/roomShiftsPanelCards.jsx", sha256: "676EBDF58A97169715581AC857EB51DEA3280BE6DD9CE26D1A363F4C3B059BDF" },
  { path: "web/src/panels/room/roomShiftsPanelMobileCards.jsx", sha256: "012306CE28A65467D41605957CE82006374386301FA82594F32626C7A7F24878" },
  { path: "web/src/panels/room/roomShiftsPanelRows.jsx", sha256: "1A5FF81F47851A7EB44AA20E55BEEDE70F5F5275D68CBB4BFDEF8E87CE702549" },
  { path: "web/src/panels/room/roomShiftsPanelSections.jsx", sha256: "BA8DDA6EA8F2E65776FBD68E58E749097D6E1B3DD98E42D72BCED3F379509B38" },
  { path: "web/src/panels/room/roomShiftsPanelUtils.js", sha256: "F75CE13DF998CEF7C100CD315F9C1196674671B289289D3598B88795077F2078" },
  { path: "web/src/panels/room/roomVehiclesPanelCards.jsx", sha256: "33CB799B71B0848FA6BE8A31E44063A35E7F2A5E86C1CDD134959967E0BEC278" },
  { path: "web/src/panels/room/roomVehiclesPanelRows.jsx", sha256: "A710286C91187E486089002B578F6EC930CAFE97049A4141F5614CFBDEE3ECD6" },
  { path: "web/src/panels/room/roomVehiclesPanelSections.jsx", sha256: "185BEFC7E0BDF848924ADF20E89738DC7AAF6407985B73BE1C146EA81E714C51" },
  { path: "web/src/panels/school/OperationsPanel.jsx", sha256: "294EB887ED6BE3174C3B50BD0752B4A7CA1E15623C60CA1B74270C9FE54F3A49" },
  { path: "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx", sha256: "90EFEEA553153BE1170D80629F996AB034871E8404AFDB32EA20C23CBFA328CF" },
  { path: "web/src/panels/shared/KvkkPanel.jsx", sha256: "DA76C50480A5FE02FD12CDDC34707E2E213831117ED00268AFA31AA2BD60A653" },
  { path: "web/src/panels/shared/NotificationsPanel.jsx", sha256: "99FEA93C853E268B36938E3A16F12E88DCBDAA9D450AF56FDB68870711991BF6" },
  { path: "web/src/panels/shared/PanelKvkkHint.jsx", sha256: "F344E3219052F87F20DB5685FA957EB4A6311DC54A8334D9C6815E89785F490F" },
  { path: "web/src/panels/shared/PlatformFeePreviewCard.jsx", sha256: "552FCB7B157D01E32E0FF38057097F7D7FD137BF9C11038F107345672DEDC829" },
  { path: "web/src/panels/shared/ReportsPanel.jsx", sha256: "1C887505BA91EDA5310D70A71B3CA50B9952F22D42F08C0318142717740BB9C4" },
  { path: "web/src/panels/shared/TotpStepUpCard.jsx", sha256: "21ACB25DB2AFF07643D401AC5C1E16F9E3E2AC0CF028610D895AC38786F48998" },
  { path: "web/src/panels/shared/boardingChangeUi.js", sha256: "01A06C914530EFE950F9FA0E22BE39A411D69C065C226416E4B73E426FF3D175" },
  { path: "web/src/panels/shared/operationsDigestUtils.js", sha256: "7C5921796E17B9708151EA7954FD9B4438591701962588C9DFE98A9F83383DF8" },
  { path: "web/src/panels/superadmin/AuditLogsPanel.jsx", sha256: "2F839DAB142DAEF2BEC4BDD4E6667F4836CCE6E9A44568AFDC8CE555931634FE" },
  { path: "web/src/panels/superadmin/CommercialCorePanel.jsx", sha256: "3A0392D66E6AF3AAA70DEC456A435B0A78A4828EDB9FF11F1554F1E0FB13E123" },
  { path: "web/src/panels/superadmin/TrustQualityPanel.jsx", sha256: "E2952D8C02511E6AD7EFA584AC50C39479C3ED73C3B8026DCB8A75EC8107DB73" },
  { path: "web/src/panels/superadmin/commercialCorePanelShared.jsx", sha256: "9FAE47E7E24DB70A0ADB6F89E41C1BABD8868FDEF9A690CFEAE9D64F8CC9896D" },
  { path: "web/src/utils/agreementCopilotFacts.js", sha256: "8075D1C3974CBA678B825942C0E2521C3DB0B111657191C44A01B6B2F7F9D798" },
  { path: "web/src/utils/agreementPrefill.js", sha256: "E0C991B62E4B2AB6443E81B5DDCBF221704A1AE68C19FB7C0B1DFEFEB0D1E5DC" },
  { path: "web/src/utils/copilotFacts.js", sha256: "C785418E29AC3394B2A00CCD2FC6E841B73B176A1D5CA139E08C25DCAED70DBB" },
  { path: "web/src/utils/notificationV1.js", sha256: "292F6F0A604F4456C2A4EF6A00079D3DF6B175697D61604B05CE3ABD25876360" },
  { path: "web/src/utils/offerQualityRanking.js", sha256: "00BDAF985F08A5DE968E1448158225403AECD5EAE6B670C5BF8CD9E9535CB7F6" },
  { path: "web/src/components/RoutePreviewModal.jsx", sha256: "741450855189B83C6C1A267919A66A8B4FB4E714D385ECA7A984E0EDEEE8A96A" },
  { path: "web/src/lib/markers/vehicleMarkerC.js", sha256: "8C7EA82D00D4E0C9A8D823855629292B894937D60545FBC1C428D0373550B964" },
  { path: "web/src/panels/driver/MapPanel.jsx", sha256: "7F03F8C6DB49518CD06B67DB75AB8AC0419747D0806C3C39548133B06E2AD67E" },
  { path: "web/src/panels/driver/RoutePanel.jsx", sha256: "D0C8902F2E44354C4384E4C0BE80670DF27B6A76589AFF971F283D208C381F10" },
  { path: "web/src/panels/driver/TodayPanel.jsx", sha256: "ACB5EB64D24F958A725D751EBE2F1DDAA2F6818D50605B0849F55CB828E11F02" },
  { path: "web/src/utils/gpsSource.js", sha256: "39B5EC94B2FFC9C95F9312DA277A818AA82CE908C410F6200F916DF144C3958F" },
  { path: "web/src/utils/gpsSourceVisibility.js", sha256: "0270F4C469D502D01D54BB045A9901826B036BEFF2486FF11B11CE87A62FBC8C" },
];
const terminologyPresentationShas = buildExpectedShaMap(terminologyPresentationEntries);

const auditDocWorktreeEntries = [
  { path: "docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md", sha256: "AE93752F59CE9FC1763708FD40EB4DD3B4E10BC5D54CCF98B16C94C61564DF2B" },
  { path: "docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md", sha256: "550FD0EB75144987CB5DB759628ACF6D1EC4EE4A5AEE08584D74B6FCEDFA9860" },
  { path: "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md", sha256: "6A11ABE8A17CC907FA4C3B93940C8FCDC2F58B918C24A6B4EE62525A2D54640B" },
  { path: "docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md", sha256: "A7EF3D0DB003D206845EBDBF3DFF52B82839A993966BE10618C32EC7A418889E" },
  { path: "docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md", sha256: "36D7BCC36F1F2772524EC66B07A2A1363CA584ECAADD19C7FD4F7A750CF4A988" },
  { path: "docs/UX_PANEL_INVENTORY_02A_AUDIT.md", sha256: "9999B6173375FF20E09D6C8B0B2AD3221FC4A7AA3B812BDE485EF268FACA38A8" },
];
const auditDocWorktreeShas = buildExpectedShaMap(auditDocWorktreeEntries);

function classifyDirtyPath(file, context) {
  const normalized = normalizePath(file);

  if (normalized === context.selfPath) {
    return { category: "SELF_AUDIT_APPROVAL_GUARD" };
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

  if (auditApprovalOwnedShas.has(normalized)) {
    const expected = auditApprovalOwnedShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "AUDIT_APPROVAL_OWNED_PRODUCT" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
  }

  if (terminologyPresentationShas.has(normalized)) {
    const expected = terminologyPresentationShas.get(normalized);
    const actual = fileSha256(normalized);
    return actual === expected
      ? { category: "APPROVED_TERMINOLOGY_PRESENTATION" }
      : { category: "UNKNOWN", detail: `${normalized} expected ${expected} got ${actual}` };
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
    batch09CommercialSplitRouteEntries.length === 5,
    "commercial split route identity remains the exact five-entry current-head family",
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
  const coreGuardEntries = [
    { path: "backend/scripts/current_head_scope_policy_01_check.js", sha256: "0F56180FD86135B5742E8D473E61975A1BEB1F57CDA61F2DC4C362575086951F" },
   { path: "backend/scripts/lib/currentHeadScopePolicy.js", sha256: "C43639D2662399C296F2DD734E3B88A4415FEA413D1F6BC154E3B042DB21C6E9" },
  { path: "backend/scripts/lib/productExtensionsRegistry.js", sha256: "6C0FA82E0B7024D4DADF5AA588E33509A5D91866CF39D8D875A0BFEF94064D8F" },
  { path: "backend/scripts/lib/guardGitScope.js", sha256: "7BAA65107857A0A64EF236A130B0E618AD08FC72453928C0A46F243287044EE5" },
  { path: "backend/scripts/lib/guardRunnerContracts.js", sha256: "1B180E2E1C901041734CCE494774865C9644CA02917B1326B6FEF8EB713E239A" },
    { path: "backend/scripts/lib/guardSmokeEvidence.js", sha256: "6992AC173A900820A62F5EC3228F3279E29F0E2C42261EBE3A96CD9B36055141" },
    { path: "backend/scripts/lib/guardValidationEnvironment.js", sha256: "5F909C62C9E376D5FCA38A3E28D30646D4C61CDABB537FE2A5DFDA9C0D8A42DE" },
    { path: "backend/scripts/run_product_extensions_check_chain.js", sha256: "0147598C4FB8076959907447F4125F3923CC86B8FAA8CFD34C2FA3CF60FFAB03" },
    { path: "backend/scripts/verify_chain_01_product_extensions_check.js", sha256: "F96EF91D2FE5601222C3EFFE6CA172101D252E635BC604BF1CC8DC703C43C54B" },
  ];
  const coreGuardShas = buildExpectedShaMap(coreGuardEntries);
  const approvedCurrentHeadShas = buildExpectedShaMap(CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF);
  const packageWiredSmokeInfraPaths = buildPackageWiredScriptPaths(packageScripts, "smoke:");
  const batch10DocWorktreePaths = BATCH10_DOC_WORKTREE_CLOSURE_PATH_SET;
  const batch14DocArchitectureConsolidationPaths = new Set([
    "docs/architecture/README.md",
    "docs/architecture/workflows/README.md",
    "docs/architecture/workflows/roles/README.md",
  ]);
  const outOfScopeCurrentHeadHelperPaths = new Set([
    "backend/scripts/m82_9_dormant_payment_backbone_check.js",
    "backend/src/ops/trustQualityManifest.js",
    "backend/scripts/plan_center_guided_flow_persistence_01_check.js",
    "backend/scripts/pay_01a_readonly_payment_readiness_check.js",
    "backend/scripts/pay_01b_payment_preview_readonly_check.js",
    "backend/scripts/pay_01c_payment_preview_detail_filter_check.js",
    "backend/scripts/pay_01d_payment_preview_csv_export_check.js",
  ]);
  const runtimeDataPaths = new Set([
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
    "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
    "backend/artifacts/runtime-data/public-leads.json",
    "backend/artifacts/runtime-data/quality-review-decisions.json",
    "backend/artifacts/runtime-data/region-failover-drill-state.json",
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
        case "APPROVED_CONCURRENT_CANONICAL_WORKTREE":
        case "APPROVED_CONCURRENT_CANONICAL_ROUTE":
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
        case "ROLE_TENANT_AUTH_OWNED_PRODUCT":
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
    mustDiffEmptyOrExactlyWithIdentity(
      ["backend/src/services"],
      CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path: entryPath }) => entryPath.startsWith("backend/src/services/")),
      "service diff stays compatible",
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
