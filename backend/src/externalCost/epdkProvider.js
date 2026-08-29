import crypto from "node:crypto";
import { ENV } from "../env.js";
import { ExternalReferenceProviderError } from "./providerRegistry.js";
import { provinceCodeFromName } from "./referenceLayers.js";

export const EPDK_SOURCE_URL = "https://www.epdk.gov.tr/Detay/Icerik/3-0-0-1206/akaryakit-bayi-fiyatlarina-iliskin-xml-web-servis";
export const EPDK_PETROL_ENDPOINT = "https://lisansws.epdk.gov.tr/services/bildirimPetrolAkaryakitFiyatlari";
export const EPDK_PETROL_BULLETIN_URL = "https://apigateway.epdk.gov.tr/petrolBayiSatisFiyatBulten";
export const EPDK_PETROL_BULLETIN_SWAGGER_URL = "https://apigateway.epdk.gov.tr/petrolBayiSatisFiyatBulten?swagger";
export const EPDK_LPG_ENDPOINT = "https://lisansws.epdk.gov.tr/services/bildirimLPGTarife";
export const EPDK_PETROL_QUERY_NO = 72;

const DIESEL = "FUEL_DIESEL";
const GASOLINE_95 = "FUEL_GASOLINE_95";
const LPG = "FUEL_LPG";

function localName(value) {
  return String(value || "").split(":").pop().trim();
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagValue(fields, candidates) {
  const wanted = new Set(candidates.map((candidate) => localName(candidate).toUpperCase()));
  const entry = Object.entries(fields).find(([key]) => wanted.has(key.toUpperCase()));
  return normalizeText(entry?.[1]);
}

function normalizedProductLabel(value) {
  return normalizeText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ı", "i")
    .toUpperCase();
}

const SOURCE_PRODUCT_FAMILY = Object.freeze({
  MOTORIN: DIESEL,
  "KURSUNSUZ BENZIN 95 OKTAN": GASOLINE_95,
});

function parseRecordNodes(xml) {
  const nodes = [];
  const stack = [];
  const tokenPattern = /<\/?([A-Za-z0-9_:.-]+)(?:\s[^>]*)?>|([^<]+)/g;
  let match;
  while ((match = tokenPattern.exec(xml))) {
    const tag = match[1];
    if (!tag) {
      if (stack.length) stack[stack.length - 1].text += match[2];
      continue;
    }
    const raw = match[0];
    if (raw.startsWith("</")) {
      const node = stack.pop();
      if (!node) continue;
      const date = tagValue(node.fields, ["Tarih", "Date"]);
      const province = tagValue(node.fields, ["Il", "İl", "Province", "Sehir"]);
      const price = tagValue(node.fields, ["Fiyat", "Price", "BayiFiyat"]);
      const fuelType = tagValue(node.fields, ["YakitTipi", "YakıtTipi", "UrunTipi", "ÜrünTipi", "ProductType"]);
      const unit = tagValue(node.fields, ["Ölçü Birimi", "Olcu Birimi", "OlcuBirimi", "Birim", "Unit"]);
      const brand = tagValue(node.fields, ["FirmaMarkasi", "Firma Markası", "Brand", "Dealer"]);
      if (date && province && price) nodes.push({ date, province, price, fuelType, unit, brand, recordTag: localName(node.name) });
      if (stack.length) {
        const parent = stack[stack.length - 1];
        parent.text += node.text;
        if (!Object.keys(node.fields).length) parent.fields[localName(node.name)] = normalizeText(node.text);
      }
      continue;
    }
    if (raw.endsWith("/>") || raw.startsWith("<?") || raw.startsWith("<!")) continue;
    stack.push({ name: tag, text: "", fields: {} });
    if (stack.length > 1) {
      const parent = stack[stack.length - 2];
      const childName = localName(tag);
      parent.fields[childName] = "";
    }
  }

  // The parser above intentionally keeps only direct scalar tags. Fill direct values
  // with a second bounded pass so namespace/prefix variations remain harmless.
  if (nodes.length) return nodes;

  const result = [];
  const recordPattern = /<([A-Za-z0-9_:.-]+)>\s*([\s\S]*?)<\/\1>/g;
  while ((match = recordPattern.exec(xml))) {
    const block = match[2];
    if (!/(?:<[^>]*Tarih[^>]*>|<[^>]*Date[^>]*>)/i.test(block) || !/(?:<[^>]*Fiyat[^>]*>|<[^>]*Price[^>]*>)/i.test(block)) continue;
    const fields = {};
    for (const fieldMatch of block.matchAll(/<([A-Za-z0-9_:.-]+)>([^<]*)<\/\1>/g)) {
      fields[localName(fieldMatch[1])] = decodeXml(fieldMatch[2]);
    }
    const date = tagValue(fields, ["Tarih", "Date"]);
    const province = tagValue(fields, ["Il", "İl", "Province", "Sehir"]);
    const price = tagValue(fields, ["Fiyat", "Price", "BayiFiyat"]);
    if (date && province && price) {
      result.push({
        date,
        province,
        price,
        fuelType: tagValue(fields, ["YakitTipi", "YakıtTipi", "UrunTipi", "ÜrünTipi", "ProductType"]),
        unit: tagValue(fields, ["Ölçü Birimi", "Olcu Birimi", "OlcuBirimi", "Birim", "Unit"]),
        brand: tagValue(fields, ["FirmaMarkasi", "Firma Markası", "Brand", "Dealer"]),
        recordTag: localName(match[1]),
      });
    }
  }
  return result;
}

function parseDate(value) {
  const date = new Date(String(value || "").replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function canonicalDecimal(value) {
  const text = normalizeText(value).replace(",", ".");
  if (!/^\d+(?:\.\d{1,12})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fraction.replace(/0+$/, "");
  return normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
}

function decimalToMinor(value) {
  const text = canonicalDecimal(value);
  if (!text) return null;
  const [whole, fraction = ""] = text.split(".");
  let minor = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  if (Number(fraction[2] || 0) >= 5) minor += 1n;
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}

function matchesFamily(family, fuelType) {
  return SOURCE_PRODUCT_FAMILY[normalizedProductLabel(fuelType)] === family;
}

function decimalToScaled(value, scale) {
  const text = canonicalDecimal(value);
  if (!text) return null;
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * (10n ** BigInt(scale)) + BigInt((fraction + "0".repeat(scale)).slice(0, scale) || "0");
}

function scaledToDecimal(value, scale) {
  const divisor = 10n ** BigInt(scale);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(scale, "0").replace(/0+$/, "")}`;
}

function medianScaled(values, scale) {
  const sorted = values.map((value) => decimalToScaled(value, scale)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return scaledToDecimal(sorted[middle], scale);
  const sum = sorted[middle - 1] + sorted[middle];
  return sum % 2n === 0n ? scaledToDecimal(sum / 2n, scale) : scaledToDecimal(sum, scale + 1);
}

function quartileScaled(values, scale, upper) {
  const scaled = values.map((value) => decimalToScaled(value, scale)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (!scaled.length) return null;
  const midpoint = Math.floor(scaled.length / 2);
  const subset = upper ? scaled.slice(Math.ceil(scaled.length / 2)) : scaled.slice(0, midpoint);
  if (!subset.length) return scaledToDecimal(scaled[0], scale);
  const middle = Math.floor(subset.length / 2);
  if (subset.length % 2) return scaledToDecimal(subset[middle], scale);
  const sum = subset[middle - 1] + subset[middle];
  return sum % 2n === 0n ? scaledToDecimal(sum / 2n, scale) : scaledToDecimal(sum, scale + 1);
}

function decimalDistribution(values) {
  const normalized = values.map(canonicalDecimal).filter(Boolean);
  const scale = normalized.reduce((maximum, value) => Math.max(maximum, value.split(".")[1]?.length || 0), 0);
  const sorted = normalized.map((value) => decimalToScaled(value, scale)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    count: normalized.length,
    min: sorted.length ? scaledToDecimal(sorted[0], scale) : null,
    q1: quartileScaled(normalized, scale, false),
    median: medianScaled(normalized, scale),
    q3: quartileScaled(normalized, scale, true),
    max: sorted.length ? scaledToDecimal(sorted[sorted.length - 1], scale) : null,
    precision: scale,
  };
}

export function isCrossSurfaceScaleCompatible(sourceValue, officialValue) {
  const source = canonicalDecimal(sourceValue);
  const official = canonicalDecimal(officialValue);
  if (!source || !official) return false;
  const scale = Math.max(source.split(".")[1]?.length || 0, official.split(".")[1]?.length || 0);
  const left = decimalToScaled(source, scale);
  const right = decimalToScaled(official, scale);
  return left * 4n >= right && right * 4n >= left;
}

function soapBody(queryNo, provinceCode) {
  const safeProvince = String(provinceCode || "").replace(/[^0-9]/g, "");
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gen="http://genel.service.ws.epvys.g222.tubitak.gov.tr/"><soapenv:Header/><soapenv:Body><gen:genelSorgu><sorguNo>${queryNo}</sorguNo><parametreler>${safeProvince}</parametreler></gen:genelSorgu></soapenv:Body></soapenv:Envelope>`;
}

async function fetchXml({ endpoint, queryNo, provinceCode, fetchImpl = fetch, timeoutMs = ENV.EXTERNAL_REFERENCE_PROVIDER_TIMEOUT_MS }) {
  if (!endpoint || !queryNo) {
    throw new ExternalReferenceProviderError("INVALID_CONFIG", "EPDK service endpoint/query is not configured.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(500, Number(timeoutMs) || 8000));
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "text/xml; charset=utf-8",
        SOAPAction: '"genelSorgu"',
        accept: "text/xml",
      },
      body: soapBody(queryNo, provinceCode),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      const fault = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i)?.[1] || "";
      throw new ExternalReferenceProviderError(response.status === 429 ? "RATE_LIMITED" : "SOURCE_UNAVAILABLE", `EPDK service returned ${response.status}. ${normalizeText(decodeXml(fault))}`, { retryable: response.status >= 500 || response.status === 429 });
    }
    if (!/<(?:return|[^>]*:return)[^>]*>/i.test(text)) {
      throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "EPDK response does not contain a return payload.");
    }
    return text;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ExternalReferenceProviderError("TIMEOUT", "EPDK service timed out.", { retryable: true });
    }
    if (error instanceof ExternalReferenceProviderError) throw error;
    throw new ExternalReferenceProviderError("SOURCE_UNAVAILABLE", "EPDK service is unavailable.", { retryable: true });
  } finally {
    clearTimeout(timeout);
  }
}

export function parseEpdkFuelResponse(xml, { family, regionCode, now = new Date() } = {}) {
  const decoded = decodeXml(xml);
  const familyRows = parseRecordNodes(decoded)
    .filter((row) => matchesFamily(family, row.fuelType))
    .map((row) => ({ ...row, asOf: parseDate(row.date), sourcePrice: canonicalDecimal(row.price) }))
    .filter((row) => row.asOf && row.sourcePrice !== null);
  if (!familyRows.length) {
    throw new ExternalReferenceProviderError("NO_DATA", "EPDK returned no matching fuel record for the requested province.");
  }
  const requestedProvince = String(regionCode || "");
  const mismatched = familyRows.find((row) => {
    const responseProvince = provinceCodeFromName(row.province);
    if (!responseProvince) return false;
    if (requestedProvince === responseProvince) return false;
    return !(requestedProvince.startsWith("34") && responseProvince === "34");
  });
  if (mismatched) {
    throw new ExternalReferenceProviderError("REGION_MISMATCH", "EPDK response province does not match the requested traffic code.");
  }
  const latestAsOf = familyRows.reduce((latest, row) => (row.asOf > latest ? row.asOf : latest), familyRows[0].asOf);
  const rows = familyRows.filter((row) => row.asOf.getTime() === latestAsOf.getTime());
  const distribution = decimalDistribution(rows.map((row) => row.sourcePrice));
  const medianDecimal = distribution.median;
  const medianMinor = decimalToMinor(medianDecimal);
  if (!medianDecimal || medianMinor === null) {
    throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "EPDK returned an unsafe decimal fuel price.");
  }
  const provinceName = rows[0]?.province || familyRows[0].province;
  const sourceUnits = [...new Set(rows.map((row) => normalizeText(row.unit)).filter(Boolean))];
  if (sourceUnits.some((unit) => !/^litre$/i.test(unit))) {
    throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "EPDK canonical road-fuel records reported a non-litre unit.");
  }
  return {
    family,
    valueDecimal: medianDecimal,
    valueMinor: medianMinor,
    unit: "CURRENCY_PER_L",
    currencyCode: "TRY",
    sourceName: "T.C. EPDK — İllere Göre Akaryakıt Bayi Fiyatları",
    sourceUrl: EPDK_SOURCE_URL,
    providerVersion: "EPDK-PETROL-SOAP-72-V1",
    asOf: latestAsOf.toISOString(),
    regionCode: String(regionCode || "").toUpperCase(),
    scopeType: "CITY",
    scopeKey: String(regionCode || "").toUpperCase(),
    sourceMetadata: {
      providerService: "bildirimPetrolAkaryakitFiyatlari",
      queryNo: EPDK_PETROL_QUERY_NO,
      provinceCode: String(regionCode || "").toUpperCase(),
      provinceName,
      reportedFuelType: family === DIESEL ? "Motorin" : "Kurşunsuz Benzin 95 Oktan",
      aggregation: "MEDIAN_DEALER_REPORTED_PRICE",
      recordCount: rows.length,
      historicalMatchedRecordCount: familyRows.length,
      minimumValueDecimal: distribution.min,
      q1ValueDecimal: distribution.q1,
      medianValueDecimal: distribution.median,
      q3ValueDecimal: distribution.q3,
      maximumValueDecimal: distribution.max,
      minimumValueMinor: decimalToMinor(distribution.min),
      medianValueMinor: medianMinor,
      maximumValueMinor: decimalToMinor(distribution.max),
      sourcePriceField: "Fiyat",
      sourceUnitField: sourceUnits.length ? "Ölçü Birimi" : null,
      sourceUnit: "Litre",
      sourceScale: "UNSCALED_DECIMAL_TL_PER_LITER",
      sourcePricePrecision: distribution.precision,
      normalizedRatePrecision: medianDecimal.split(".")[1]?.length || 0,
      minorCompatibilityPolicy: "HALF_UP_TO_TRY_KURUS; valueDecimal remains the exact normalized rate.",
      normalization: "Latest canonical product-date only; exact decimal rate retained; valueMinor is explicit HALF_UP kuruş compatibility; no raw XML persisted.",
      officialUnitCrossCheck: EPDK_PETROL_BULLETIN_SWAGGER_URL,
      fetchedAt: new Date(now).toISOString(),
    },
    rawPayloadHash: crypto.createHash("sha256").update(xml).digest("hex"),
    normalizedValueLabel: medianDecimal,
    sourceEvidence: {
      rawPriceField: "Fiyat",
      rawSamples: rows.slice(0, 3).map((row) => ({ date: row.date, province: row.province, fuelType: row.fuelType, brand: row.brand || null, unit: row.unit || null, rawPrice: row.price })),
      sourceUnitFieldPresent: sourceUnits.length > 0,
      latestSourceDate: rows[0]?.date || null,
      matchedProductNames: [...new Set(familyRows.map((row) => row.fuelType))],
      excludedProductNames: [...new Set(parseRecordNodes(decoded).map((row) => row.fuelType).filter((fuelType) => fuelType && !matchesFamily(family, fuelType)))].slice(0, 32),
    },
  };
}

function validateProvinceCode(value) {
  const code = String(value || "").trim();
  if (!/^\d{1,3}$/.test(code)) {
    throw new ExternalReferenceProviderError("MISSING_SCOPE", "EPDK requires a province traffic code; no silent Istanbul fallback is allowed.");
  }
  return code;
}

export function createEpdkPetrolProvider({ endpoint = ENV.EPDK_PETROL_ENDPOINT || EPDK_PETROL_ENDPOINT, queryNo = ENV.EPDK_PETROL_QUERY_NO || EPDK_PETROL_QUERY_NO, fetchImpl = fetch, timeoutMs = ENV.EXTERNAL_REFERENCE_PROVIDER_TIMEOUT_MS } = {}) {
  return Object.freeze({
    key: "EPDK_PETROL",
    families: [DIESEL, GASOLINE_95],
    configured: Boolean(endpoint && queryNo),
    fetch: async (request = {}) => {
      const regionCode = validateProvinceCode(request.regionCode);
      const xml = await fetchXml({ endpoint, queryNo, provinceCode: regionCode, fetchImpl, timeoutMs });
      return parseEpdkFuelResponse(xml, { family: String(request.family || "").toUpperCase(), regionCode, now: request.now || new Date() });
    },
  });
}

export function createEpdkLpgProvider({ endpoint = ENV.EPDK_LPG_ENDPOINT || EPDK_LPG_ENDPOINT, queryNo = ENV.EPDK_LPG_QUERY_NO, fetchImpl = fetch, timeoutMs = ENV.EXTERNAL_REFERENCE_PROVIDER_TIMEOUT_MS } = {}) {
  return Object.freeze({
    key: "EPDK_LPG",
    families: [LPG],
    configured: Boolean(endpoint && queryNo),
    fetch: async (request = {}) => {
      const regionCode = validateProvinceCode(request.regionCode);
      const xml = await fetchXml({ endpoint, queryNo, provinceCode: regionCode, fetchImpl, timeoutMs });
      return parseEpdkFuelResponse(xml, { family: LPG, regionCode, now: request.now || new Date() });
    },
  });
}
