import { prisma } from "../src/prisma.js";
import { refreshExternalCostReference, getReferenceLayers } from "../src/externalCost/externalCostReferenceService.js";
import { buildPlatformObservedReference, resolveRegionScope } from "../src/externalCost/referenceLayers.js";
import { createEpdkPetrolProvider } from "../src/externalCost/epdkProvider.js";

const regionCode = String(process.env.EPDK_ACCEPTANCE_REGION_CODE || "16");
const providerKey = "EPDK_PETROL";
const families = ["FUEL_DIESEL", "FUEL_GASOLINE_95"];
const createdIds = [];

function must(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}

try {
  const liveProvider = createEpdkPetrolProvider();
  const existingByFamily = {};
  for (const family of families) {
    const live = await liveProvider.fetch({ family, regionCode });
    must(live.rawPayloadHash?.length === 64 && live.sourceMetadata?.recordCount > 0 && live.sourceEvidence?.rawSamples?.[0]?.rawPrice, `real ${family} provider ingestion has non-synthetic payload identity and raw evidence`);
    existingByFamily[family] = await prisma.externalCostReference.findFirst({
      where: { providerKey, family, regionCode },
      orderBy: { asOf: "desc" },
      select: { id: true, referenceKey: true },
    });
    const refreshed = await refreshExternalCostReference({
      family,
      unit: "CURRENCY_PER_L",
      currencyCode: "TRY",
      providerKey,
      regionCode,
      scopeType: "CITY",
      scopeKey: regionCode,
    });
    must(refreshed.providerStatus === "CONFIGURED" && refreshed.marketReference?.dataClass === "EXTERNAL_REFERENCE", `${family} provider refresh persists external-only snapshot`);
    const stored = await prisma.externalCostReference.findUnique({ where: { referenceKey: refreshed.marketReference.referenceKey }, select: { id: true, referenceKey: true, dataClass: true, sourceMetadata: true, rawPayloadHash: true, asOf: true, regionCode: true, providerKey: true, valueDecimal: true, valueMinor: true } });
    if (stored?.referenceKey !== existingByFamily[family]?.referenceKey && stored?.id) createdIds.push(stored.id);
    must(stored?.dataClass === "EXTERNAL_REFERENCE" && stored.providerKey === providerKey && stored.regionCode === regionCode, `${family} persistence retains provider/province/classification`);
    must(stored?.sourceMetadata?.recordCount > 0 && stored.rawPayloadHash?.length === 64 && stored.asOf && stored.valueDecimal && Number.isSafeInteger(stored.valueMinor), `${family} persistence retains precision/provenance/as-of/hash without raw XML`);
  }

  const layers = await getReferenceLayers({ family: "FUEL_DIESEL", unit: "CURRENCY_PER_L", currencyCode: "TRY", providerKey, regionCode, scopeType: "CITY", scopeKey: regionCode, scope: "ROOM", actualValueMinor: "90000", refresh: "false" }, { role: "ROOM", roomId: 1 });
  must(layers.layers.length === 3 && layers.separation.externalPlatformActualDistinct && layers.selected.authority === "USER_ACTUAL", "three-layer resolver keeps user actual precedence and separation");
  must(layers.layers[1].state === "INSUFFICIENT_SAMPLE" && !Object.prototype.hasOwnProperty.call(layers, "rawPlatformObservations"), "platform threshold hides insufficient observations and raw rows");

  const region = resolveRegionScope({ provinceName: "Bursa" });
  const syntheticSufficient = buildPlatformObservedReference({ region, minSampleCount: 2, observations: [{ valueMinor: 1000, observedAt: new Date() }, { valueMinor: 1200, observedAt: new Date() }] });
  must(syntheticSufficient.available && syntheticSufficient.valueMinor === 1100, "isolated synthetic aggregate proves sufficient-sample path without production fixture promotion");
  console.log(JSON.stringify({ decision: "#2_API_DB_ACCEPTANCE_PASS", residueBeforeCleanup: Object.values(existingByFamily).every(Boolean) ? "none-for-key" : "created", provider: providerKey, regionCode, families, layerCount: layers.layers.length, noAutoOffer: layers.pricingGuidance.automaticOfferAction === false }));
} finally {
  for (const createdId of createdIds) {
    const audit = await prisma.auditLog.findMany({ where: { entity: "ExternalCostReference", entityId: createdId }, select: { id: true } });
    await prisma.externalCostReference.delete({ where: { id: createdId } }).catch(() => {});
    if (audit.length) await prisma.auditLog.deleteMany({ where: { id: { in: audit.map((item) => item.id) } } });
  }
  await prisma.$disconnect();
}
