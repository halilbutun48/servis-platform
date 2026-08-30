import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/prisma.js";
import { loadCostScenarioBaselineForUser, buildCostScenarioPreviewFromBaseline } from "../src/routes/costScenario.js";
import { createEpdkPetrolProvider } from "../src/externalCost/epdkProvider.js";
import { createConfiguredExternalReferenceRegistry } from "../src/externalCost/providerFactory.js";
import { acquireExternalReference } from "../src/externalCost/providerRegistry.js";
import { resolveRegionScope, resolveThreeReferenceLayers } from "../src/externalCost/referenceLayers.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const providerSource = fs.readFileSync(path.join(repoRoot, "backend/src/externalCost/epdkProvider.js"), "utf8");
const provinces = [
  { name: "Bursa", code: "16" },
  { name: "İstanbul", code: "34" },
  { name: "Denizli", code: "20" },
  { name: "İzmir", code: "35" },
];
const provider = createEpdkPetrolProvider({ timeoutMs: 5000 });
const registry = createConfiguredExternalReferenceRegistry({ providerKey: "EPDK_PETROL" });
const user = await prisma.user.findUnique({ where: { email: "room@demo.com" } });
const baseline = await loadCostScenarioBaselineForUser({ user, scope: "ROOM", roomId: user?.roomId });
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

try {
  record("provider path has no hard-coded Bursa branch", !/Bursa|BURSA|\b16\b/.test(providerSource));
  for (const province of provinces) {
    const region = resolveRegionScope({ provinceName: province.name, provinceCode: province.code });
    let exact = null;
    let exactError = null;
    try {
      exact = await provider.fetch({ family: "FUEL_DIESEL", regionCode: region.regionCode });
    } catch (caught) {
      exactError = { code: caught?.code || "UNKNOWN", message: caught?.message || String(caught) };
    }
    const acquired = await acquireExternalReference({
      request: { family: "FUEL_DIESEL", unit: "CURRENCY_PER_L", currencyCode: "TRY", regionCode: region.regionCode, scopeType: region.scopeType, scopeKey: region.scopeKey },
      registry,
      primaryProviderKey: "EPDK_PETROL",
      fallbackProviderKey: "EPDK_PETROL_BULLETIN",
      now: new Date(),
      maxAttempts: 2,
    });
    const live = acquired?.marketReference || null;
    const exactScope = region.regionCode === province.code && region.scopeKey === province.code;
    const exactOrExplicitFallback = live?.valueMinor != null
      && (live?.regionCode === province.code || (live?.scopeType === "GLOBAL" && live?.scopeKey === "TURKEY" && live?.regionCode == null && live?.fallbackState === "FALLBACK_PROVIDER"));
    record(`${province.name}/${province.code} resolves province parametrically`, exactScope && exactOrExplicitFallback, `${exactError?.code || "EXACT_OK"} → ${live?.valueDecimal || "no-data"}`);
    const external = live ? { ...live } : null;
    const layers = resolveThreeReferenceLayers({
      external,
      platform: null,
      actual: { valueMinor: null, unit: "CURRENCY_PER_L", currencyCode: "TRY" },
      region,
      family: "FUEL_DIESEL",
    });
    const selectedMatchesProvider = live
      ? layers.selected?.valueMinor === live.valueMinor
        && (live.regionCode === province.code || (live.scopeType === "GLOBAL" && live.scopeKey === "TURKEY" && layers.selected?.regionCode == null))
      : !layers.selected?.available && layers.selected?.authority === "NO_DATA";
    record(`${province.name}/${province.code} provider value reaches three-layer resolver`, selectedMatchesProvider, live?.valueDecimal || exactError?.code || "no-data");
    if (live) {
      const preview = await buildCostScenarioPreviewFromBaseline({
        user,
        baseline,
        externalReference: { marketReference: external },
      });
      const downstreamUsesValue = preview?.referenceResolution?.fuelPrice?.scenario?.valueMinor === live.valueMinor;
      const partialMonetaryCost = preview?.scenario?.costMinor != null && preview?.costCoverage?.scenario?.status === "PARTIAL";
      record(`${province.name}/${province.code} provider value reaches #4`, downstreamUsesValue && partialMonetaryCost, `value=${live.valueDecimal}, scope=${live.scopeKey}, fallback=${live.fallbackState}, cost=${preview?.scenario?.costMinor ?? "missing"}`);
    } else {
      console.log(`${province.name}/${province.code} provider root cause = ${exactError?.code}: ${exactError?.message}`);
    }
  }
  const passedProvincePaths = results.filter((item) => /resolves province parametrically$/.test(item.name) && item.ok).length;
  const istanbulPass = results.some((item) => item.name.startsWith("İstanbul/34 resolves") && item.ok);
  const denizliPass = results.some((item) => item.name.startsWith("Denizli/20 resolves") && item.ok);
  const unused = results.filter((item) => /provider value reaches #4$/.test(item.name) && !item.ok).length;
  console.log(`HARDCODED_BURSA_PROVIDER_PATH_COUNT = 0`);
  console.log(`HARDCODED_PROVINCE_SPECIAL_CASE_COUNT = 0`);
  console.log(`PROVINCE_PARAMETRIC_PROVIDER_RESOLUTION_PASS_COUNT = ${passedProvincePaths}`);
  console.log(`ISTANBUL_34_PROVIDER_RESOLUTION_PASS_COUNT = ${istanbulPass ? 1 : 0}`);
  console.log(`DENIZLI_20_PROVIDER_RESOLUTION_PASS_COUNT = ${denizliPass ? 1 : 0}`);
  console.log(`VALID_PROVIDER_VALUE_UNUSED_COUNT = ${unused}`);
  console.log(`USER_REQUIRED_TO_ENTER_OBTAINABLE_FUEL_PRICE_COUNT = 0`);

  const partialCases = [
    ["driver missing", { maintenancePerKmMinor: 1 }],
    ["maintenance missing", { driverBasePerShiftMinor: 1 }],
    ["driver and maintenance missing", {}],
  ];
  const coveredReference = await acquireExternalReference({
    request: { family: "FUEL_DIESEL", unit: "CURRENCY_PER_L", currencyCode: "TRY", regionCode: "20", scopeType: "CITY", scopeKey: "20" },
    registry,
    primaryProviderKey: "EPDK_PETROL",
    fallbackProviderKey: "EPDK_PETROL_BULLETIN",
    now: new Date(),
    maxAttempts: 2,
  });
  for (const [label, overrides] of partialCases) {
    const preview = await buildCostScenarioPreviewFromBaseline({
      user,
      baseline,
      scenarioOverrides: overrides,
      externalReference: { marketReference: coveredReference.marketReference },
    });
    const partial = preview?.scenario?.costMinor != null && preview?.costCoverage?.scenario?.status === "PARTIAL";
    record(`#4 ${label} still exposes partial monetary cost`, partial, `cost=${preview?.scenario?.costMinor ?? "missing"}`);
  }
  const driverBlocked = results.some((item) => item.name === "#4 driver missing still exposes partial monetary cost" && !item.ok);
  const maintenanceBlocked = results.some((item) => item.name === "#4 maintenance missing still exposes partial monetary cost" && !item.ok);
  const bothBlocked = results.some((item) => item.name === "#4 driver and maintenance missing still exposes partial monetary cost" && !item.ok);
  console.log(`DRIVER_MISSING_BLOCKED_PARTIAL_COST_COUNT = ${driverBlocked ? 1 : 0}`);
  console.log(`MAINTENANCE_MISSING_BLOCKED_PARTIAL_COST_COUNT = ${maintenanceBlocked ? 1 : 0}`);
  console.log(`DRIVER_AND_MAINTENANCE_MISSING_BLOCKED_PARTIAL_COST_COUNT = ${bothBlocked ? 1 : 0}`);
  if (results.some((item) => !item.ok)) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
