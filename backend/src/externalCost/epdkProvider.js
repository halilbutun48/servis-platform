import crypto from "node:crypto";
import { ENV } from "../env.js";
import { ExternalReferenceProviderError } from "./providerRegistry.js";
import { provinceCodeFromName } from "./referenceLayers.js";

export const EPDK_SOURCE_URL = "https://www.epdk.gov.tr/Detay/Icerik/3-0-0-1206/akaryakit-bayi-fiyatlarina-iliskin-xml-web-servis";
export const EPDK_PETROL_ENDPOINT = "https://lisansws.epdk.gov.tr/services/bildirimPetrolAkaryakitFiyatlari";
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
      if (date && province && price) nodes.push({ date, province, price, fuelType, recordTag: localName(node.name) });
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

function decimalToMinor(value) {
  const text = normalizeText(value).replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = (fraction + "00").slice(0, 2);
  const roundUp = Number((fraction + "000")[2] || 0) >= 5;
  const minor = Number(whole) * 100 + Number(cents) + (roundUp ? 1 : 0);
  return Number.isSafeInteger(minor) ? minor : null;
}

function minorToDecimal(minor) {
  return (Number(minor) / 100).toFixed(2);
}

function matchesFamily(family, fuelType) {
  const text = normalizeText(fuelType).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (family === DIESEL) return text.includes("MOTORIN");
  if (family === GASOLINE_95) return text.includes("BENZIN") && text.includes("95");
  if (family === LPG) return text.includes("LPG") || text.includes("OTOGAZ");
  return false;
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
  const rows = parseRecordNodes(decoded)
    .filter((row) => matchesFamily(family, row.fuelType))
    .map((row) => ({ ...row, asOf: parseDate(row.date), valueMinor: decimalToMinor(row.price) }))
    .filter((row) => row.asOf && row.valueMinor !== null && row.valueMinor >= 0);
  if (!rows.length) {
    throw new ExternalReferenceProviderError("NO_DATA", "EPDK returned no matching fuel record for the requested province.");
  }
  const requestedProvince = String(regionCode || "");
  const mismatched = rows.find((row) => {
    const responseProvince = provinceCodeFromName(row.province);
    if (!responseProvince) return false;
    if (requestedProvince === responseProvince) return false;
    return !(requestedProvince.startsWith("34") && responseProvince === "34");
  });
  if (mismatched) {
    throw new ExternalReferenceProviderError("REGION_MISMATCH", "EPDK response province does not match the requested traffic code.");
  }
  const sorted = rows.map((row) => row.valueMinor).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const medianMinor = sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  const latestAsOf = rows.reduce((latest, row) => (row.asOf > latest ? row.asOf : latest), rows[0].asOf);
  const provinceName = rows.find((row) => row.asOf.getTime() === latestAsOf.getTime())?.province || rows[0].province;
  return {
    family,
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
      minimumValueMinor: sorted[0],
      maximumValueMinor: sorted[sorted.length - 1],
      normalization: "Source TRY/liter decimal rounded to nearest kuruş; no raw XML persisted.",
      fetchedAt: new Date(now).toISOString(),
    },
    rawPayloadHash: crypto.createHash("sha256").update(xml).digest("hex"),
    normalizedValueLabel: minorToDecimal(medianMinor),
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
