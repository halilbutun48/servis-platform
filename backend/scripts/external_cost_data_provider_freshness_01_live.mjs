import https from "node:https";
import { createEpdkPetrolProvider, EPDK_PETROL_BULLETIN_SWAGGER_URL, EPDK_PETROL_BULLETIN_URL, isCrossSurfaceScaleCompatible } from "../src/externalCost/epdkProvider.js";

const regionCode = String(process.env.EPDK_LIVE_REGION_CODE || "16").trim();
const provider = createEpdkPetrolProvider();
const results = [];

function getJsonWithGetBody(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(url, {
      method: "GET",
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) },
    }, (response) => {
      let text = "";
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => {
        try {
          resolve({ status: response.statusCode, body: JSON.parse(text) });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function bulletinDate(rawDate) {
  const match = String(rawDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : null;
}

const references = {};

for (const family of ["FUEL_DIESEL", "FUEL_GASOLINE_95"]) {
  try {
    const reference = await provider.fetch({ family, regionCode });
    references[family] = reference;
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
      sourceEvidence: reference.sourceEvidence,
      distribution: {
        rawPriceMin: reference.sourceMetadata?.minimumValueDecimal,
        rawPriceQ1: reference.sourceMetadata?.q1ValueDecimal,
        rawPriceMedian: reference.sourceMetadata?.medianValueDecimal,
        rawPriceQ3: reference.sourceMetadata?.q3ValueDecimal,
        rawPriceMax: reference.sourceMetadata?.maximumValueDecimal,
        normalizedRate: reference.valueDecimal,
        normalizedMinorCompatibility: reference.valueMinor,
      },
    });
  } catch (error) {
    console.error(JSON.stringify({ family, code: error?.code || "UNKNOWN", message: error?.message || String(error) }));
    process.exit(1);
  }
}

const latestSourceDate = Object.values(references)[0]?.sourceEvidence?.latestSourceDate;
const swaggerResponse = await fetch(EPDK_PETROL_BULLETIN_SWAGGER_URL);
const swaggerText = await swaggerResponse.text();
const swagger = JSON.parse(swaggerText);
const bulletinResponse = await getJsonWithGetBody(EPDK_PETROL_BULLETIN_URL, { raporTarihi: bulletinDate(latestSourceDate) });
const bulletinRows = Array.isArray(bulletinResponse.body?.data) ? bulletinResponse.body.data : [];
const bulletinByFuel = Object.fromEntries(bulletinRows.map((row) => [row["Yakıt"], row]));
const crossCheck = [
  ["FUEL_DIESEL", "Motorin"],
  ["FUEL_GASOLINE_95", "Kurşunsuz Benzin 95 Oktan"],
].map(([family, label]) => ({
  family,
  query72NormalizedRate: references[family]?.valueDecimal || null,
  bulletinRate: bulletinByFuel[label]?.Fiyat ?? null,
  bulletinUnit: bulletinByFuel[label]?.["Ölçü Birimi"] ?? null,
  bulletinDate: bulletinByFuel[label]?.Tarih ?? null,
  scaleCompatible: isCrossSurfaceScaleCompatible(references[family]?.valueDecimal, bulletinByFuel[label]?.Fiyat),
}));

if (swaggerResponse.status !== 200 || swagger.info?.version !== "1.0" || !swaggerText.includes("Ölçü Birimi") || !swaggerText.includes("52.80750")) {
  throw new Error("Official EPDK bulletin Swagger contract proof failed.");
}
if (bulletinResponse.status !== 200 || crossCheck.some((row) => row.bulletinRate === null || row.bulletinUnit !== "Litre" || !row.scaleCompatible)) {
  throw new Error("Official EPDK bulletin cross-check failed.");
}

console.log(JSON.stringify({
  decision: "EPDK_LIVE_ACQUISITION_PASS",
  endpoint: provider.key,
  regionCode,
  synthetic: false,
  semantics: "Fiyat is an unscaled decimal TL/L rate; query-72 SOAP rows have no unit element, cross-validated against the official litre bulletin.",
  officialBulletin: {
    endpoint: EPDK_PETROL_BULLETIN_URL,
    swagger: EPDK_PETROL_BULLETIN_SWAGGER_URL,
    reportDate: bulletinDate(latestSourceDate),
    crossCheck,
  },
  results,
}));
