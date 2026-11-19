import crypto from "node:crypto";
import { ExternalReferenceProviderError } from "./providerRegistry.js";
import { findTurkeyTollCoverage } from "./tollCoverageCatalog.js";

export const OTOYOL_A5_CALCULATOR_URL = "https://isletme.otoyolas.com.tr/gecis-ucreti-hesapla/";
export const OTOYOL_A5_ENDPOINT = "https://mobil.otoyolas.com.tr/WS_Restful/calculatePrice2";
const OTOYOL_A5_COVERAGE_KEY = "OTOYOL-O5-GEBZE-ORHANGAZI-IZMIR";

function clean(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }

function decimalText(value) {
  const normalized = clean(value).replace(/\./g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return fraction ? `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}` : whole;
}

function decimalToMinor(value) {
  const normalized = decimalText(value);
  if (!normalized) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}

export function createOtoyolTollProvider({ fetchImpl = fetch, endpoint = OTOYOL_A5_ENDPOINT, timeoutMs = 8000 } = {}) {
  return Object.freeze({
    key: "OTOYOL_A5",
    families: ["TOLL", "BRIDGE"],
    configured: Boolean(endpoint),
    fetch: async (request = {}) => {
      const hgsClass = Number(request.hgsClass);
      if (!Number.isSafeInteger(hgsClass) || hgsClass < 1 || hgsClass > 6) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", "Otoyol araç sınıfı 1 ile 6 arasında olmalıdır.");
      const url = new URL(endpoint);
      url.searchParams.set("enterStation", String(request.entryStation || ""));
      url.searchParams.set("exitStation", String(request.exitStation || ""));
      url.searchParams.set("vehicleType", String(hgsClass));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Math.max(500, Number(timeoutMs) || 8000));
      try {
        const coverage = findTurkeyTollCoverage(OTOYOL_A5_COVERAGE_KEY);
        if (!coverage || coverage.providerKey !== "OTOYOL_A5" || coverage.adapterStatus !== "SUPPORTED") {
          throw new ExternalReferenceProviderError("NO_DATA", "Otoyol A.Ş. kesimi için açık ve geçerli resmi tarife kanıtı bulunamadı.");
        }
        const response = await fetchImpl(url, { headers: { accept: "application/json" }, signal: controller.signal });
        const body = await response.text();
        if (!response.ok) throw new ExternalReferenceProviderError(response.status === 429 ? "RATE_LIMITED" : "SOURCE_UNAVAILABLE", `Otoyol A.Ş. resmi hesaplayıcı ${response.status} döndürdü.`, { retryable: response.status >= 500 || response.status === 429 });
        let payload;
        try { payload = JSON.parse(body); } catch { throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "Otoyol A.Ş. sonucu JSON olarak okunamadı."); }
        const valueDecimal = decimalText(payload?.price);
        const valueMinor = decimalToMinor(payload?.price);
        if (!valueDecimal || valueMinor === null) throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "Otoyol A.Ş. güvenli ücret döndürmedi.");
        return {
          family: String(request.family || "TOLL").toUpperCase(),
          valueDecimal,
          valueMinor,
          unit: "CURRENCY_PER_TRIP",
          currencyCode: String(request.currencyCode || "TRY").toUpperCase(),
          sourceName: "Otoyol Yatırım ve İşletme A.Ş. — Resmî Geçiş Ücreti Hesaplayıcı",
          sourceUrl: OTOYOL_A5_CALCULATOR_URL,
          providerVersion: "OTOYOL-A5-CALCULATOR-V1",
          asOf: new Date(request.now || Date.now()).toISOString(),
          scopeType: "GLOBAL",
          scopeKey: "TURKEY",
          sourceMetadata: {
            officialCalculator: OTOYOL_A5_CALCULATOR_URL,
            endpoint,
            coverageKey: coverage.coverageKey,
            operator: coverage.operator,
            routeId: request.routeId,
            routeSnapshotInputHash: request.routeSnapshotInputHash || null,
            segmentId: request.segmentId,
            paidSegment: request.paidSegment,
            entryStation: request.entryStation,
            exitStation: request.exitStation,
            direction: request.direction,
            hgsClass,
            serviceDate: request.serviceDate,
            tariffRequestedDate: request.tariffDate,
            tariffEffectiveDateStatus: "NOT_RETURNED_BY_OFFICIAL_CALCULATOR",
            passageContextStatus: "REQUEST_CONTEXT_ONLY",
            pricingType: clean(payload?.ptype) || null,
            noStationSubstitution: true,
          },
          rawPayloadHash: crypto.createHash("sha256").update(body).digest("hex"),
        };
      } catch (error) {
        if (error?.name === "AbortError") throw new ExternalReferenceProviderError("TIMEOUT", "Otoyol A.Ş. resmi hesaplayıcı zaman aşımına uğradı.", { retryable: true });
        if (error instanceof ExternalReferenceProviderError) throw error;
        throw new ExternalReferenceProviderError("SOURCE_UNAVAILABLE", "Otoyol A.Ş. resmi hesaplayıcı kullanılamıyor.", { retryable: true });
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}
