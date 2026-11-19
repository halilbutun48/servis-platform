import crypto from "node:crypto";
import { ExternalReferenceProviderError } from "./providerRegistry.js";
import { findTurkeyTollCoverageByHighwayId } from "./tollCoverageCatalog.js";

export const KGM_TOLL_CALCULATOR_URL = "https://vatandas.kgm.gov.tr/";
export const KGM_TOLL_TARIFF_URL = "https://www.kgm.gov.tr/sayfalar/kgm/sitetr/otoyollar/ucretleryeni.aspx";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

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

function tokenFromHtml(html) {
  const match = String(html || "").match(/name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']/i)
    || String(html || "").match(/value=["']([^"']+)["'][^>]*name=["']__RequestVerificationToken["']/i);
  return match?.[1] || null;
}

function parseAmount(html) {
  const match = String(html || "").match(/([\d.,]+)\s*TL/i);
  const valueDecimal = decimalText(match?.[1]);
  const valueMinor = decimalToMinor(match?.[1]);
  if (!valueDecimal || valueMinor === null) throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "KGM resmi hesaplayıcı güvenli ücret döndürmedi.");
  const distanceMatch = String(html || "").match(/mesafe[\s\S]{0,120}?([\d.,]+)\s*km/i);
  return { valueDecimal, valueMinor, distanceKm: distanceMatch?.[1] ? decimalText(distanceMatch[1]) : null };
}

function parseTariffEffectiveDate(html) {
  const source = String(html || "");
  const match = source.match(/(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})/);
  if (!match) return null;
  const validityWindow = source.slice(match.index, match.index + match[0].length + 160);
  if (!/(?:geçerli|gecerli|valid)/i.test(validityWindow)) return null;
  const day = String(match[1]).padStart(2, "0");
  const month = String(match[2]).padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function officialDocumentCollectionEvidence(html, coverage, requestedTariffDate) {
  const source = String(html || "");
  const documentFile = String(coverage?.tariffDocumentFile || "").trim();
  if (!documentFile) return null;
  const escapedFile = documentFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const documentMatch = source.match(new RegExp(`href=["']([^"']*\\/(\\d{4})Gecis_Ucret\\/${escapedFile})["']`, "i"));
  if (!documentMatch) return null;
  const collectionYear = Number(documentMatch[2]);
  const effectiveDate = `${collectionYear}-01-01`;
  if (String(requestedTariffDate || "") !== effectiveDate) return null;
  return {
    effectiveDate,
    status: "VERIFIED_OFFICIAL_DOCUMENT_COLLECTION",
    collectionYear,
    documentPath: documentMatch[1],
  };
}

function tariffDateStatus(request, effectiveDate) {
  if (!effectiveDate) return "NOT_RETURNED_BY_OFFICIAL_SOURCE";
  return String(request.tariffDate || "") === effectiveDate
    && String(request.serviceDate || "") >= effectiveDate
    ? "VERIFIED"
    : "MISMATCH";
}

async function readResponse(response, label) {
  const body = await response.text();
  if (!response.ok) {
    throw new ExternalReferenceProviderError(response.status === 429 ? "RATE_LIMITED" : "SOURCE_UNAVAILABLE", `${label} resmi kaynağı ${response.status} döndürdü.`, { retryable: response.status >= 500 || response.status === 429 });
  }
  return body;
}

function stationExists(stations, requested) {
  const wanted = clean(requested).toLocaleUpperCase("tr-TR");
  return stations.some((station) => clean(typeof station === "string" ? station : station?.name || station?.text).toLocaleUpperCase("tr-TR") === wanted);
}

export function createKgmTollProvider({ fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  return Object.freeze({
    key: "KGM_TOLL",
    families: ["TOLL", "BRIDGE", "TUNNEL"],
    configured: true,
    fetch: async (request = {}) => {
      const highwayId = Number(request.highwayId);
      if (!Number.isSafeInteger(highwayId) || highwayId <= 0) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", "KGM highwayId is required.");
      const coverage = findTurkeyTollCoverageByHighwayId(highwayId);
      if (!coverage || coverage.providerKey !== "KGM_TOLL" || coverage.adapterStatus !== "SUPPORTED") {
        throw new ExternalReferenceProviderError("NO_DATA", "KGM kesimi için açık ve geçerli resmi tarife kanıtı bulunamadı.");
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Math.max(500, Number(timeoutMs) || 8000));
      try {
        const home = await fetchImpl(KGM_TOLL_CALCULATOR_URL, { headers: { accept: "text/html" }, signal: controller.signal });
        const html = await readResponse(home, "KGM");
        const token = tokenFromHtml(html);
        if (!token) throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "KGM resmi hesaplayıcı doğrulama alanı döndürmedi.");

        const tariffResponse = await fetchImpl(KGM_TOLL_TARIFF_URL, {
          headers: { accept: "text/html" },
          signal: controller.signal,
        });
        const tariffBody = await readResponse(tariffResponse, "KGM tarife");
        const explicitTariffEffectiveDate = parseTariffEffectiveDate(tariffBody);
        const collectionEvidence = officialDocumentCollectionEvidence(tariffBody, coverage, request.tariffDate);
        const tariffEffectiveDate = explicitTariffEffectiveDate || collectionEvidence?.effectiveDate || null;
        const tariffEffectiveDateStatus = explicitTariffEffectiveDate
          ? tariffDateStatus(request, explicitTariffEffectiveDate)
          : collectionEvidence?.status || tariffDateStatus(request, tariffEffectiveDate);

        const stationResponse = await fetchImpl(`${KGM_TOLL_CALCULATOR_URL}Toll/GetTolls`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded; charset=UTF-8", RequestVerificationToken: token },
          body: new URLSearchParams({ highwayId: String(highwayId) }).toString(),
          signal: controller.signal,
        });
        const stationBody = await readResponse(stationResponse, "KGM gişe");
        let stations;
        try { stations = JSON.parse(stationBody); } catch { throw new ExternalReferenceProviderError("INVALID_PROVIDER_RESPONSE", "KGM gişe listesi JSON olarak okunamadı."); }
        if (!Array.isArray(stations) || !stationExists(stations, request.entryStation) || !stationExists(stations, request.exitStation)) {
          throw new ExternalReferenceProviderError("NO_DATA", "KGM resmi gişe listesi rota giriş/çıkışını doğrulamadı.");
        }

        const form = new URLSearchParams({
          HighwayId: String(highwayId),
          EntranceTollId: String(request.entryStation),
          ExitTollId: String(request.exitStation),
          SinifId: String(request.hgsClass),
          __RequestVerificationToken: token,
        });
        const resultResponse = await fetchImpl(KGM_TOLL_CALCULATOR_URL, {
          method: "POST",
          headers: { accept: "text/html", "content-type": "application/x-www-form-urlencoded" },
          body: form.toString(),
          signal: controller.signal,
        });
        const resultBody = await readResponse(resultResponse, "KGM ücret");
        const parsed = parseAmount(resultBody);
        const asOf = new Date(request.now || Date.now()).toISOString();
        return {
          family: String(request.family || "TOLL").toUpperCase(),
          valueDecimal: parsed.valueDecimal,
          valueMinor: parsed.valueMinor,
          unit: "CURRENCY_PER_TRIP",
          currencyCode: String(request.currencyCode || "TRY").toUpperCase(),
          sourceName: "Karayolları Genel Müdürlüğü — Resmî Geçiş Ücreti Hesaplayıcı",
          sourceUrl: KGM_TOLL_CALCULATOR_URL,
          providerVersion: "KGM-TOLL-CALCULATOR-V1",
          asOf,
          scopeType: "GLOBAL",
          scopeKey: "TURKEY",
          sourceMetadata: {
            officialTariffPage: KGM_TOLL_TARIFF_URL,
            officialTariffDocument: collectionEvidence?.documentPath
              ? new URL(collectionEvidence.documentPath, KGM_TOLL_TARIFF_URL).toString()
              : coverage.tariffDocumentUrl,
            tariffDocumentFile: coverage.tariffDocumentFile,
            tariffDocumentCollection: collectionEvidence?.collectionYear ? `${collectionEvidence.collectionYear}Gecis_Ucret` : null,
            calculator: KGM_TOLL_CALCULATOR_URL,
            coverageKey: coverage.coverageKey,
            highwayId,
            routeId: request.routeId,
            routeSnapshotInputHash: request.routeSnapshotInputHash || null,
            segmentId: request.segmentId,
            paidSegment: request.paidSegment,
            entryStation: request.entryStation,
            exitStation: request.exitStation,
            direction: request.direction,
            hgsClass: request.hgsClass,
            serviceDate: request.serviceDate,
            tariffRequestedDate: request.tariffDate,
            tariffEffectiveDate,
            tariffEffectiveDateStatus,
            passageContextStatus: "OFFICIAL_VERIFIED",
            distanceKm: parsed.distanceKm,
            tariffIncludesVat: "NOT_PROVEN_BY_CALCULATOR_RESPONSE",
            tariffPayloadHash: crypto.createHash("sha256").update(tariffBody).digest("hex"),
          },
          rawPayloadHash: crypto.createHash("sha256").update(resultBody).digest("hex"),
        };
      } catch (error) {
        if (error?.name === "AbortError") throw new ExternalReferenceProviderError("TIMEOUT", "KGM resmi hesaplayıcı zaman aşımına uğradı.", { retryable: true });
        if (error instanceof ExternalReferenceProviderError) throw error;
        throw new ExternalReferenceProviderError("SOURCE_UNAVAILABLE", "KGM resmi hesaplayıcı kullanılamıyor.", { retryable: true });
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}
