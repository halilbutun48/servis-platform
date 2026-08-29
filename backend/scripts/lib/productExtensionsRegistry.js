import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const productExtensionsRepoRoot = path.resolve(__dirname, "../../..");

export const productExtensionsCheckScripts = Object.freeze([
  "node backend/scripts/current_head_scope_policy_01_check.js",
  "check:op04",
  "check:qlt04b",
  "check:qltpaybridge01",
  "check:seferscore01",
  "check:roadmaplockaimarketplace01",
  "check:publiclanding01",
  "check:publiclandingplatformfirst01",
  "check:publiclandingfinalpromise01",
  "check:leadcapture01",
  "check:onboardingreview01",
  "check:onboardingreviewfinalaudit01",
  "check:invitebasedmembership01",
  "check:verifiedsupplier01",
  "check:suppliermatching01",
  "check:supplieroffercollect01",
  "check:copilotofferanalysis01",
  "check:copilotnegotiationassist01",
  "check:copilotofferrecommendation01",
  "check:copilotshifttoagreementprep01",
  "check:copilotdispatchactionprep01",
  "check:copilotactionprep01",
  "check:financialoperationssurfaceandrbac01",
  "check:operationalcostmodel01",
  "check:roomprofitabilityandquotefloor01",
  "check:companybudgetandservicecost01",
  "check:hakedisinvoicereconciliationpreview01",
  "check:costscenarioforecastandsavings01",
  "check:uxmarketplacepanels01",
  "check:productflowbuttonaudit01",
  "check:agreementsourceshiftlineage01",
  "check:marketplacefreetooperate01",
  "check:m44telematicst1t5",
  "check:telematicsproviderhub01",
  "check:safedrive01",
  "check:offerrankingquality01",
  "check:pay01e",
  "check:paysafe01",
  "check:web01a",
  "check:web01b",
  "check:uxsuperadminoverviewcleanup01",
  "check:uxsuperadminpanelclarity01",
  "check:uxsuperadminlivemonitoring01",
  "check:uxsuperadminauditpanel01",
  "check:uxsuperadminqualitypanel01",
  "check:uxsuperadmincommercialflow01",
  "check:uxsuperadminfielddispatchdiscovery01",
  "check:uxsuperadminfieldacceptancecenter01",
  "check:cop01e",
  "check:cop02a",
  "check:cop02b",
  "check:cop03a",
  "check:cop03afix01",
  "check:cop03afix02",
  "check:cop03b",
  "check:cop03c",
  "check:cop03cfix01",
  "check:uxkvkk01",
  "check:docsstate01",
  "check:e2esmoke01",
  "check:fieldlaunch01",
  "check:cop03cfix02",
  "check:cop04afix03",
  "check:cop04afix04",
  "check:cop03cfix03",
  "check:cop04a",
  "check:cop04afix02",
  "check:cop04afix01",
  "check:cop04b",
  "check:cop04bfix01",
  "check:cop04bfix02",
  "check:cop04bfix03",
  "check:cop04bfix04",
  "check:cop04bfix05",
  "check:cop04bfix06",
  "check:cop04bfix07",
  "check:cop04bfix08",
  "check:copilotroletaskmatrix01",
  "check:copilotairoadmap01",
  "check:copilotdemandintake01",
  "check:copilotdemandagreement01",
  "check:copilotrfqprep01",
  "check:copilothumanapproval01",
  "check:copilotexceldemandimport01",
  "check:addressgeocodingconfidence01",
  "check:copilotstoproutedraft01",
  "check:osrmroutedraftfromexcel01",
  "check:copilotroutereviewhumanapproval01",
  "check:exceltoroutereadinessredteam01",
  "check:copiloteblockruntimeanswerintegration01",
  "check:copilotguidedtaskengine01",
  "check:copilotdynamicquestionengine01",
  "check:copilotsmartdiagnosticengine01",
  "check:copilotrootcauseengine01",
  "check:copilotriskscoringengine01",
  "check:copilotclarifyingquestionengine01",
  "check:copilotworkflowreasoningengine01",
  "check:copilotoperationhealthengine01",
  "check:copilotnextbestactionengine01",
  "check:copilotplanreviewengine01",
  "check:hotfilesplitaichatcomposers01",
  "check:hotfilesplitwebpanels01",
  "check:copilotreasoninganswercomposer01",
  "check:ai03bparaphraseintentaudit01",
  "check:ai03bsemanticvisibleaudit01",
  "check:ai03bsemanticvisiblelivematrix01",
  "check:seferabireasoningassistant01",
  "check:seferabiallrolesreasoningassistant01",
  "check:seferabicostanalysisassistant01",
  "check:seferabiturkishterminology01",
  "check:seferabiturkishuserfacinglanguage01",
  "check:copilotcontextmemorytaskstate01",
  "check:uxcopilotsmartchips01",
  "check:uxcopilotpersona01",
  "check:uxcopilotterminal01",
  "check:uxseferabilauncher01",
  "check:seferabiterminalhumanize01",
  "check:copliveaccept01",
  "check:boardingops01a",
  "check:bugrouteimpactpreviewbutton01",
  "check:uxrouteimpactpreviewcompact01",
  "check:uxcontractconversionopsbridgeclarity01",
  "check:shiftdispatchapprovalfix01",
  "check:boardingchangerequestentry01",
  "check:uiactionwiringaudit01",
  "check:boardingops01b",
  "check:boardingops01c",
  "check:routechangefinal01",
  "check:dynamicsavings01",
  "check:scriptharnessconsolidation01",
  "check:authstepupdevtoggle01",
  "check:authstepupproviderlocaldefault01",
  "check:docsbrandcleanup01",
  "check:etasanity01",
  "check:etaosrm01",
  "check:etaosrm02",
  "check:uxcollapsiblepanels01",
  "check:uxpanelstructure02",
  "check:uxpanelinventory02a",
  "check:uxpanelstructure02b",
  "check:uxroomvehiclestelematicsfix",
  "check:roomvehicledriveruppercase01",
  "check:uxroompanelclarity01",
  "check:uxroomopspaneltabs01",
  "check:uxroomopsrelationshippolish01",
  "check:uxroomshiftstabs01",
  "check:uxroomshiftsdensitydedup01",
  "check:uxpremiumcriticalfixroom01",
  "check:uxschoolorganizationpanels01",
  "check:uxcompanyshiftstabs01",
  "check:uxcompanymobileactionclarity01",
  "check:uxcompanypersonelaccessmobileparity01",
  "check:uxpremiumcriticalfixagreementsdetail01",
  "check:uxcompanyagreementsmobileparity01",
  "check:uxcompanyopspaneltabs01",
  "check:uxcompanyqualitytabs01",
  "check:uxcompanypanelssmoke01",
  "check:uxpaneltabsfix01",
  "check:uxlivemaptabsfix01",
  "check:uxlivemaptabssimplify01",
  "check:uxpanelreality02c",
  "check:uxpanelrealitycleanup02d",
  "check:uxpanellayoutwidth02cfix01",
  "check:uxpanellayoutwidth02cfix02",
  "check:uxpanellayoutwidth02cfix03",
  "check:uxnav01",
  "check:uxbrandloginpremium01",
  "check:uxmobilewebshellclarity01",
  "check:uxmobileallrolespanelfix01",
  "check:uxroomcompanyshiftsmobilecardfix01",
  "check:uxshiftsresponsivelayoutfix01",
  "check:uxmobileoverflowminimapreadability01",
  "check:uxmobileoverflowminimappolish02",
  "check:uxdensity01",
  "check:uxpanelstandardarchitecture01",
  "check:finaluxsmoke01",
  "check:uxlivepanelsmokeaudit01",
  "check:uxmobileallrolespanelaudit01",
  "check:uxpremiumcriticaluxfixcleanup01",
  "check:uxsmokepassminusevidence01",
  "check:uxlivepanelpremiumsmoke01",
  "check:uxsmokepassminuszero01",
  "check:mobilewebfinal01",
  "check:uxparentpersonelliveerrorclarity01",
  "check:livetrackingfinal01",
  "check:driverflowfinal01",
  "check:qualitygatefinal01",
  "check:testqualityandflakeaudit01",
  "check:dashboardbulkendpoint01",
  "check:cachecoalescingandbackoff01",
  "check:requeststormresilience01",
  "check:productionratelimitpolicy01",
  "check:airesponsesemanticqualitygate01",
  "check:loadtest2000users01",
  "check:dbpoolandapiscaling01",
  "check:observabilitymonitoringalerting01",
  "check:backendlintwarningburndown01",
  "check:dataintegrityandrecovery01",
  "check:roledataisolationredteam01",
  "check:securitykvkkfinal01",
  "check:auditlogandapprovaltrace01",
]);

export const productExtensionsChecks = Object.freeze(
  productExtensionsCheckScripts.map((script, index) =>
    Object.freeze({
      id: `step-${String(index + 1).padStart(3, "0")}`,
      order: index + 1,
      script,
      command: script === "node backend/scripts/current_head_scope_policy_01_check.js"
        ? ["node", "backend/scripts/current_head_scope_policy_01_check.js"]
        : ["npm", "run", script],
      kind: script === "node backend/scripts/current_head_scope_policy_01_check.js" ? "command" : "npm",
      active: true,
    }),
  ),
);

export function productExtensionsCheckIndex(script) {
  return productExtensionsCheckScripts.indexOf(script);
}

export function assertProductExtensionsIncludes(script, label, registry = productExtensionsCheckScripts) {
  if (!Array.isArray(registry)) {
    throw new Error(`FAIL ${label}: registry is not an array`);
  }
  if (!registry.includes(script)) {
    throw new Error(`FAIL ${label}: missing ${script}`);
  }
}

export function assertProductExtensionsOrder(sequence, label, registry = productExtensionsCheckScripts) {
  if (!Array.isArray(sequence)) {
    throw new Error(`FAIL ${label}: sequence is not an array`);
  }
  if (!Array.isArray(registry)) {
    throw new Error(`FAIL ${label}: registry is not an array`);
  }

  let previousIndex = -1;
  for (const script of sequence) {
    const index = registry.indexOf(script);
    if (index < 0) {
      throw new Error(`FAIL ${label}: missing ${script}`);
    }
    if (index <= previousIndex) {
      throw new Error(`FAIL ${label}: wrong order for ${script}`);
    }
    previousIndex = index;
  }
}

function failRegistry(label, message) {
  throw new Error(`FAIL ${label}: ${message}`);
}

function assertStringArray(value, label, fieldName) {
  if (!Array.isArray(value)) {
    failRegistry(label, `${fieldName} is not an array`);
  }
  if (value.some((part) => typeof part !== "string" || !part.trim())) {
    failRegistry(label, `${fieldName} contains non-string entries`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function assertProductExtensionsRegistryIntegrity({
  registry = productExtensionsChecks,
  scripts = productExtensionsCheckScripts,
  packageScripts = {},
  repoRoot = productExtensionsRepoRoot,
  label = "product extensions registry",
} = {}) {
  if (!Array.isArray(registry)) {
    failRegistry(label, "registry is not an array");
  }
  if (!Array.isArray(scripts)) {
    failRegistry(label, "script list is not an array");
  }
  if (registry.length !== scripts.length) {
    failRegistry(label, `script list length mismatch (${registry.length} !== ${scripts.length})`);
  }
  if (registry.length === 0) {
    failRegistry(label, "registry is empty");
  }
  if (!isPlainObject(packageScripts)) {
    failRegistry(label, "package scripts are not an object");
  }

  const seenScripts = new Set();
  const seenIds = new Set();
  const derivedScripts = [];

  for (const [index, entry] of registry.entries()) {
    const stepNumber = index + 1;
    const expectedId = `step-${String(stepNumber).padStart(3, "0")}`;
    const scriptLabel = `${label} ${expectedId}`;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      failRegistry(label, `${expectedId} is not an object`);
    }
    if (entry.id !== expectedId) {
      failRegistry(label, `wrong id for ${entry.script || expectedId}`);
    }
    if (entry.order !== stepNumber) {
      failRegistry(label, `wrong order for ${entry.script || expectedId}`);
    }
    if (typeof entry.script !== "string" || !entry.script.trim()) {
      failRegistry(label, `missing script at ${expectedId}`);
    }
    if (typeof entry.kind !== "string" || !entry.kind.trim()) {
      failRegistry(label, `missing kind for ${entry.script}`);
    }
    if (entry.active !== true) {
      failRegistry(label, `inactive step for ${entry.script}`);
    }

    assertStringArray(entry.command, scriptLabel, "command");

    if (seenScripts.has(entry.script)) {
      failRegistry(label, `duplicate script ${entry.script}`);
    }
    if (seenIds.has(entry.id)) {
      failRegistry(label, `duplicate id ${entry.id}`);
    }
    seenScripts.add(entry.script);
    seenIds.add(entry.id);
    derivedScripts.push(entry.script);

    if (scripts[index] !== entry.script) {
      failRegistry(label, `registry order mismatch at ${entry.script}`);
    }

    if (entry.kind === "npm") {
      if (entry.command.length !== 3 || entry.command[0] !== "npm" || entry.command[1] !== "run" || entry.command[2] !== entry.script) {
        failRegistry(label, `invalid npm command for ${entry.script}`);
      }
      if (!Object.prototype.hasOwnProperty.call(packageScripts, entry.script)) {
        failRegistry(label, `missing package script ${entry.script}`);
      }
    } else if (entry.kind === "command") {
      if (entry.command.length !== 2 || entry.command[0] !== "node") {
        failRegistry(label, `invalid command shape for ${entry.script}`);
      }
      const commandTarget = path.resolve(repoRoot, entry.command[1]);
      if (!fs.existsSync(commandTarget)) {
        failRegistry(label, `missing command target ${entry.command[1]}`);
      }
    } else {
      failRegistry(label, `unsupported kind ${entry.kind}`);
    }
  }

  for (const script of derivedScripts) {
    assertProductExtensionsIncludes(script, `${label} includes ${script}`, scripts);
  }
  assertProductExtensionsOrder(derivedScripts, `${label} order`, scripts);

  return Object.freeze({
    count: registry.length,
    scripts: Object.freeze([...derivedScripts]),
  });
}
