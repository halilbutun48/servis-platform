import { createEpdkPetrolProvider } from "../src/externalCost/epdkProvider.js";

const regionCode = String(process.env.EPDK_LIVE_REGION_CODE || "16").trim();
const provider = createEpdkPetrolProvider();
const results = [];

for (const family of ["FUEL_DIESEL", "FUEL_GASOLINE_95"]) {
  try {
    const reference = await provider.fetch({ family, regionCode });
    results.push({
      family: reference.family,
      valueMinor: reference.valueMinor,
      unit: reference.unit,
      currencyCode: reference.currencyCode,
      provider: provider.key,
      source: reference.sourceName,
      asOf: reference.asOf,
      regionCode: reference.regionCode,
      provinceName: reference.sourceMetadata?.provinceName,
      recordCount: reference.sourceMetadata?.recordCount,
      rawPayloadHashLength: reference.rawPayloadHash?.length || 0,
    });
  } catch (error) {
    console.error(JSON.stringify({ family, code: error?.code || "UNKNOWN", message: error?.message || String(error) }));
    process.exit(1);
  }
}

console.log(JSON.stringify({
  decision: "EPDK_LIVE_ACQUISITION_PASS",
  endpoint: provider.key,
  regionCode,
  synthetic: false,
  results,
}));
