import https from "node:https";
import { ExternalReferenceProviderError } from "./providerRegistry.js";

export const EPDK_PETROL_BULLETIN_URL = "https://apigateway.epdk.gov.tr/petrolBayiSatisFiyatBulten";
export const EPDK_PETROL_BULLETIN_SOURCE_URL = "https://www.epdk.gov.tr/Detay/Icerik/3-0-226/web-servisler";

const DIESEL = "FUEL_DIESEL";
const GASOLINE_95 = "FUEL_GASOLINE_95";

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizedProductLabel(value) {
  return normalizeText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ı", "i")
    .toUpperCase();
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

function bulletinDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(now));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day}.${values.month}.${values.year}`;
}

function asOfDate(value, now = new Date()) {
  const sourceDate = String(value || "").slice(0, 10);
  const currentTurkeyDate = bulletinDate(now);
  if (/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)) {
    const [year, month, day] = sourceDate.split("-");
    if (`${day}.${month}.${year}` === currentTurkeyDate) return new Date(now);
  }
  const parsed = new Date(`${sourceDate}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function familyFor(value) {
  const label = normalizedProductLabel(value);
  if (label === "MOTORIN") return DIESEL;
  if (label === "KURSUNSUZ BENZIN 95 OKTAN") return GASOLINE_95;
  return null;
}

function requestBulletinJson({ endpoint, reportDate, timeoutMs = 8000 }) {
  const url = new URL(endpoint);
  const body = JSON.stringify({ raporTarihi: reportDate });
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
        "user-agent": "servis-platform-external-reference/1.0",
      },
    }, (response) => {
      let payload = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { payload += chunk; });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          const code = response.statusCode === 429 ? "RATE_LIMITED" : "SOURCE_UNAVAILABLE";
          reject(new ExternalReferenceProviderError(code, `EPDK günlük bülteni ${response.statusCode} döndürdü.`, { retryable: code === "RATE_LIMITED" || response.statusCode >= 500 }));
          return;
        }
        try {
          resolve(JSON.parse(payload));
        } catch {
          reject(new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "EPDK günlük bülteni JSON olarak okunamadı."));
        }
      });
    });
    request.setTimeout(Math.max(500, Number(timeoutMs) || 8000), () => {
      request.destroy(new ExternalReferenceProviderError("TIMEOUT", "EPDK günlük bülteni zaman aşımına uğradı.", { retryable: true }));
    });
    request.on("error", (error) => {
      if (error instanceof ExternalReferenceProviderError) {
        reject(error);
        return;
      }
      reject(new ExternalReferenceProviderError("SOURCE_UNAVAILABLE", "EPDK günlük bülteni kullanılamıyor.", { retryable: true }));
    });
    request.end(body);
  });
}

export function createEpdkPetrolBulletinProvider({ endpoint = EPDK_PETROL_BULLETIN_URL, timeoutMs = 8000, now = () => new Date() } = {}) {
  return Object.freeze({
    key: "EPDK_PETROL_BULLETIN",
    families: [DIESEL, GASOLINE_95],
    configured: Boolean(endpoint),
    // EPDK's API gateway can briefly rate-limit the bulletin immediately
    // after the province SOAP query. Keep the approved fallback deterministic
    // without replacing it with a guessed neighboring-province value.
    fallbackDelayMs: 20_000,
    fetch: async (request = {}) => {
      const requestedFamily = String(request.family || "").toUpperCase();
      if (![DIESEL, GASOLINE_95].includes(requestedFamily)) {
        throw new ExternalReferenceProviderError("UNIT_FAMILY_MISMATCH", "EPDK günlük bülteni yalnızca yol yakıtlarını destekler.");
      }
      const effectiveNow = request.now || now();
      const reportDate = bulletinDate(effectiveNow);
      const payload = await requestBulletinJson({ endpoint, reportDate, timeoutMs });
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const row = rows.find((candidate) => (
        familyFor(candidate?.Yakıt || candidate?.Yakit || candidate?.fuelType) === requestedFamily
        && /^litre$/i.test(normalizeText(candidate?.["Ölçü Birimi"] || candidate?.["Olcu Birimi"] || candidate?.unit))
      ));
      if (!row) {
        throw new ExternalReferenceProviderError("NO_DATA", "EPDK günlük bülteni istenen yakıt ailesi için veri döndürmedi.");
      }
      const valueDecimal = canonicalDecimal(row?.Fiyat ?? row?.Price ?? row?.value);
      const valueMinor = decimalToMinor(valueDecimal);
      const asOf = asOfDate(row?.Tarih || row?.date, effectiveNow);
      if (!valueDecimal || valueMinor === null || !asOf) {
        throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "EPDK günlük bülteni güvenli fiyat/tarih sağlamadı.");
      }
      const reportedFuelType = normalizeText(row?.Yakıt || row?.Yakit || row?.fuelType);
      return {
        family: requestedFamily,
        valueDecimal,
        valueMinor,
        unit: "CURRENCY_PER_L",
        currencyCode: "TRY",
        sourceName: "T.C. EPDK — Petrol Piyasası Bayi Satış Fiyatı Bülteni (Günlük)",
        sourceUrl: EPDK_PETROL_BULLETIN_SOURCE_URL,
        providerVersion: "EPDK-PETROL-BULLETIN-295-V1",
        asOf: asOf.toISOString(),
        regionCode: null,
        scopeType: "GLOBAL",
        scopeKey: "TURKEY",
        sourceMetadata: {
          providerService: "petrolBayiSatisFiyatBulten",
          bulletinId: "295",
          reportDate,
          geographicScope: "TURKEY",
          geographicScopeLabel: "Türkiye geneli",
          requestedProvinceCode: request.regionCode ? String(request.regionCode).toUpperCase() : null,
          reportedFuelType,
          aggregation: "OFFICIAL_DAILY_BULLETIN_VALUE",
          sourceUnit: "Litre",
          fallbackPolicy: "EXACT_PROVINCE_EPDK_THEN_TURKEY_EPDK_BULLETIN",
          noProvinceSubstitution: true,
        },
      };
    },
  });
}
