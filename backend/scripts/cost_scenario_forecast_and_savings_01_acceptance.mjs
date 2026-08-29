import crypto from "node:crypto";
import { prisma } from "../src/prisma.js";

const BASE_URL = (process.env.ACCEPTANCE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` :: ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login(identifier) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `#4-acceptance-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`login ${identifier} ${response.status}`);
  return body.token;
}

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, body: payload, data: payload?.data || payload };
}

async function domainFingerprint() {
  const [companies, rooms, shifts, agreements, budgets, drafts, hakedis, invoices, externalReferences] = await Promise.all([
    prisma.company.findMany({ orderBy: { id: "asc" }, select: { id: true, kind: true, name: true, status: true } }),
    prisma.room.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, status: true } }),
    prisma.shift.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, vehicleId: true, driverId: true, status: true, startAt: true, endAt: true, routeSnapshotDistanceM: true, routeSnapshotDurationSec: true, companyOfferAmount: true, roomOfferAmount: true } }),
    prisma.agreement.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, companyOfferAmount: true, roomOfferAmount: true } }),
    prisma.companyBudgetPlan.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, status: true, currencyCode: true, budgetAmountMinor: true, version: true } }),
    prisma.roomQuoteFloorDraft.findMany({ orderBy: { id: "asc" }, select: { id: true, roomId: true, status: true, currencyCode: true, manualBaselineOperationalCostMinor: true, version: true } }),
    prisma.hakedisRecord.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, amountMinor: true } }),
    prisma.invoiceRecord.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, amountMinor: true } }),
    prisma.externalCostReference.findMany({ orderBy: { id: "asc" }, select: { id: true, family: true, valueDecimal: true, valueMinor: true, freshness: true, confidence: true } }),
  ]);
  const serialized = JSON.stringify({ companies, rooms, shifts, agreements, budgets, drafts, hakedis, invoices, externalReferences });
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

const completeInput = {
  currencyCode: "TRY",
  vehicleCount: 1,
  vehicleType: "MINIBUS",
  vehicleCapacity: 16,
  passengerCount: 10,
  stopCount: 2,
  serviceDistanceKm: 100,
  totalDistanceKm: 100,
  routeDurationMinutes: 60,
  serviceDayCount: 10,
  shiftsPerServiceDay: 1,
  shiftCount: 10,
  tripCount: 10,
  fuelConsumptionLitersPer100Km: 10,
  fuelUnitPriceMinor: 4000,
  driverBasePerShiftMinor: 10000,
  maintenancePerKmMinor: 100,
};

async function main() {
  const [companyToken, roomToken, schoolToken, organizationToken, personelToken] = await Promise.all([
    login("company@demo.com"),
    login("room@demo.com"),
    login("school@demo.com"),
    login("organization@demo.com"),
    login("personel@demo.com"),
  ]);
  pass("canonical demo identities login");

  const before = await domainFingerprint();
  const companyBaseline = await request("/api/cost-scenarios/baseline?scope=COMPANY", { token: companyToken });
  const roomBaseline = await request("/api/cost-scenarios/baseline?scope=ROOM", { token: roomToken });
  const schoolBaseline = await request("/api/cost-scenarios/baseline?scope=COMPANY", { token: schoolToken });
  const organizationBaseline = await request("/api/cost-scenarios/baseline?scope=COMPANY", { token: organizationToken });
  if (companyBaseline.status === 200 && companyBaseline.data?.scope === "COMPANY" && companyBaseline.data?.normalBudgetLifecycle === true) pass("COMPANY baseline is tenant scoped and available", companyBaseline.data.source?.label);
  else fail("COMPANY baseline is tenant scoped and available", `${companyBaseline.status}/${companyBaseline.body?.error?.code}`);
  if (roomBaseline.status === 200 && roomBaseline.data?.scope === "ROOM" && roomBaseline.data?.safety?.noLiveMutation === true) pass("ROOM baseline is tenant scoped and read-only", roomBaseline.data.source?.label);
  else fail("ROOM baseline is tenant scoped and read-only", `${roomBaseline.status}/${roomBaseline.body?.error?.code}`);
  if (schoolBaseline.status === 200 && schoolBaseline.data?.planningOnly === true && schoolBaseline.data?.normalBudgetLifecycle === false) pass("SCHOOL planning boundary is explicit");
  else fail("SCHOOL planning boundary is explicit", `${schoolBaseline.status}/${schoolBaseline.data?.planningOnly}`);
  if (organizationBaseline.status === 200 && organizationBaseline.data?.planningOnly === true && organizationBaseline.data?.normalBudgetLifecycle === false) pass("ORGANIZATION planning boundary is explicit");
  else fail("ORGANIZATION planning boundary is explicit", `${organizationBaseline.status}/${organizationBaseline.data?.planningOnly}`);
  const baselineMapCases = [companyBaseline.data, roomBaseline.data, schoolBaseline.data, organizationBaseline.data];
  if (baselineMapCases.every((item) => item?.baselineSourceMap && item?.baselineConfidence?.level && Array.isArray(item?.missingFields))) pass("role baseline source maps and confidence are API visible");
  else fail("role baseline source maps and confidence are API visible");
  const contextsWithCanonicalRegion = baselineMapCases.filter((item) => item?.regionName || item?.regionResolution?.status === "RESOLVED");
  if (contextsWithCanonicalRegion.length > 0 && contextsWithCanonicalRegion.every((item) => item.regionResolution?.status === "RESOLVED" && item.regionResolution?.regionName === item.regionName && item.regionResolution?.usedSilentIstanbulFallback === false)) pass("canonical COMPANY/SCHOOL/ORGANIZATION/ROOM regions are propagated without silent fallback", contextsWithCanonicalRegion.map((item) => `${item.scope}:${item.regionName}`).join(", "));
  else if (contextsWithCanonicalRegion.length === 0) pass("canonical role contexts have no stored region evidence to propagate");
  else fail("canonical COMPANY/SCHOOL/ORGANIZATION/ROOM regions are propagated without silent fallback");
  const roomFinancialOperations = await request("/api/commercial-core/room/financial-operations/preview", { token: roomToken });
  const companyFinancialOperations = await request("/api/company/overview/financial-operations/preview", { token: companyToken });
  const roomFinancialSnapshot = roomFinancialOperations.data?.snapshot || {};
  // ROOM returns a nested financial snapshot; COMPANY's canonical budget owner
  // returns the same evidence at the surface root. Normalize only the harness
  // view so this acceptance proves the real response contracts without making
  // the product emit a duplicate wrapper.
  const companyFinancialSnapshot = companyFinancialOperations.data?.snapshot || companyFinancialOperations.data || {};
  if (roomFinancialOperations.status === 200 && roomFinancialSnapshot.regionName && roomFinancialSnapshot.regionResolution?.status === "RESOLVED" && roomFinancialSnapshot.regionCode && roomFinancialOperations.data?.quoteFloorDraft) pass("real ROOM financial owner propagates canonical operation region", `${roomFinancialSnapshot.regionName}/${roomFinancialSnapshot.regionCode}`);
  else fail("real ROOM financial owner propagates canonical operation region", `${roomFinancialOperations.status}/${roomFinancialSnapshot.regionName}/${roomFinancialSnapshot.regionResolution?.status}`);
  if (companyFinancialOperations.status === 200 && companyFinancialSnapshot.regionName && companyFinancialSnapshot.regionResolution?.status === "RESOLVED" && companyFinancialSnapshot.regionCode) pass("real COMPANY financial owner propagates canonical operation region", `${companyFinancialSnapshot.regionName}/${companyFinancialSnapshot.regionCode}`);
  else fail("real COMPANY financial owner propagates canonical operation region", `${companyFinancialOperations.status}/${companyFinancialSnapshot.regionName}/${companyFinancialSnapshot.regionResolution?.status}`);
  const companyRouteRecovered = companyBaseline.data?.input?.passengerCount != null && companyBaseline.data?.input?.serviceDistanceKm != null && companyBaseline.data?.input?.routeDurationMinutes != null;
  if (companyRouteRecovered && companyBaseline.data?.source?.label === "Son doğrulanmış vardiya" && companyBaseline.data?.baselineSourceMap?.serviceDistanceKm?.classification === "DIRECT_EXISTING_DATA") pass("COMPANY baseline selects validated route and auto-fills recoverable fields");
  else fail("COMPANY baseline selects validated route and auto-fills recoverable fields", JSON.stringify({ source: companyBaseline.data?.source, input: companyBaseline.data?.input, route: companyBaseline.data?.baselineSourceMap?.serviceDistanceKm }));
  const organizationDoesNotInventVehicle = organizationBaseline.data?.input?.vehicleCount === undefined
    && organizationBaseline.data?.baselineSourceMap?.vehicleCount?.classification === "NOT_APPLICABLE_FOR_ROLE"
    && organizationBaseline.data?.input?.serviceDistanceKm != null;
  if (organizationDoesNotInventVehicle) pass("ORGANIZATION plan does not invent vehicle baseline and derives route evidence");
  else fail("ORGANIZATION plan does not invent vehicle baseline and derives route evidence");

  const completeBody = {
    scope: "COMPANY",
    baselineReferenceId: companyBaseline.data?.baselineReferenceId,
    baselineInput: completeInput,
    scenarioOverrides: { vehicleCount: 1, serviceDistanceKm: 20, totalDistanceKm: 20 },
  };
  const preview = await request("/api/cost-scenarios/preview", { token: companyToken, method: "POST", body: completeBody });
  if (preview.status === 200 && preview.data?.status === "READY" && preview.data?.savingsMinor > 0 && preview.data?.baseline?.costMinor != null) pass("COMPANY real preview produces explainable savings", `${preview.data.savingsMinor}`);
  else fail("COMPANY real preview produces explainable savings", `${preview.status}/${preview.data?.status}/${preview.data?.error?.code}`);
  if (preview.data?.baseline?.costMinor < Number.MAX_SAFE_INTEGER && preview.data?.scenario?.costMinor < Number.MAX_SAFE_INTEGER && preview.data?.currencyCode === "TRY") pass("preview keeps safe money and currency contract");
  else fail("preview keeps safe money and currency contract");
  if (preview.data?.safety?.readOnly && preview.data?.safety?.writeAction === false && preview.data?.safety?.notPersisted && preview.data?.safety?.noLiveMutation) pass("preview response exposes no-write safety contract");
  else fail("preview response exposes no-write safety contract");
  if (preview.data?.provenance?.scenarioDataClass === "USER_SCENARIO_OVERRIDE" && preview.data?.provenance?.baselineDataClass) pass("preview keeps baseline and scenario provenance distinct");
  else fail("preview keeps baseline and scenario provenance distinct");
  if (preview.data?.baselineConfidence?.level && preview.data?.baselineSourceMap?.serviceDistanceKm && preview.data?.safety?.previewOnly === true) pass("preview propagates baseline confidence and source map");
  else fail("preview propagates baseline confidence and source map");
  if (preview.data?.referenceResolution?.vehicleConsumption?.baseline?.selected?.sourceKind === "USER_ACTUAL"
    && preview.data?.resolvedAssumptions?.baseline?.vehicleConsumption?.unit === "L_PER_100_KM"
    && preview.data?.resolvedAssumptions?.precedence?.vehicleConsumption?.includes("TECHNICAL_CLASS_REFERENCE")) pass("#5-ready assumption contract exposes #4 resolved consumption provenance");
  else fail("#5-ready assumption contract exposes #4 resolved consumption provenance");

  const referenceLayers = await request("/api/external-cost-references/layers?family=FUEL_DIESEL&unit=CURRENCY_PER_L&currencyCode=TRY&scope=COMPANY", { token: companyToken });
  const referenceLayerPayload = referenceLayers.data || referenceLayers.body || {};
  const externalLayer = (referenceLayerPayload.layers || []).find((layer) => layer.layer === "EXTERNAL_MARKET_REFERENCE" && layer.available);
  const lowInputExternalReference = externalLayer ? {
    providerKey: externalLayer.providerKey,
    family: externalLayer.family || "FUEL_DIESEL",
    unit: externalLayer.unit || "CURRENCY_PER_L",
    currencyCode: externalLayer.currencyCode || "TRY",
    regionCode: externalLayer.regionCode,
    scopeType: externalLayer.scopeType,
    scopeKey: externalLayer.scopeKey,
  } : null;
  const lowInputPreview = await request("/api/cost-scenarios/preview", {
    token: companyToken,
    method: "POST",
    body: {
      scope: "COMPANY",
      baselineReferenceId: companyBaseline.data?.baselineReferenceId,
      baselineInput: {
        currencyCode: "TRY",
        vehicleType: companyBaseline.data?.input?.vehicleType || "MINIBUS",
        vehicleCount: companyBaseline.data?.input?.vehicleCount || 1,
        vehicleCapacity: companyBaseline.data?.input?.vehicleCapacity || 16,
        passengerCount: companyBaseline.data?.input?.passengerCount || 10,
        serviceDistanceKm: companyBaseline.data?.input?.serviceDistanceKm,
        totalDistanceKm: companyBaseline.data?.input?.totalDistanceKm,
        routeDurationMinutes: companyBaseline.data?.input?.routeDurationMinutes,
        serviceDayCount: companyBaseline.data?.input?.serviceDayCount || 1,
        shiftCount: companyBaseline.data?.input?.shiftCount || 1,
        tripCount: companyBaseline.data?.input?.tripCount || 1,
        fuelType: "DIESEL",
      },
      scenarioOverrides: { passengerCount: Number(companyBaseline.data?.input?.passengerCount || 10) + 1 },
      ...(lowInputExternalReference ? { externalReference: lowInputExternalReference } : {}),
    },
  });
  if (lowInputPreview.status === 200
    && lowInputPreview.data?.referenceResolution?.vehicleConsumption?.baseline?.selected?.sourceKind === "TECHNICAL_CLASS_REFERENCE"
    && lowInputPreview.data?.changedDimensions?.length === 1
    && lowInputPreview.data?.changedDimensions?.[0] === "passengerCount"
    && lowInputPreview.data?.safety?.noLiveMutation === true) pass("zero-input baseline keeps technical fallback and one-field what-if contract");
  else fail("zero-input baseline keeps technical fallback and one-field what-if contract", `${lowInputPreview.status}/${lowInputPreview.data?.status}/${lowInputPreview.data?.changedDimensions}`);
  const lowInputAlternatives = lowInputPreview.data?.vehiclePlanAlternatives?.items || [];
  const expectedVehicleClasses = ["MINIBUS", "MIDIBUS", "OTOBUS"];
  const capacityDerived = lowInputAlternatives.length === expectedVehicleClasses.length
    && expectedVehicleClasses.every((vehicleType) => lowInputAlternatives.some((item) => item.vehicleType === vehicleType))
    && lowInputAlternatives.every((item) => item.capacity > 0 && item.requiredVehicleCount === Math.max(1, Math.ceil(item.passengerCount / item.capacity)));
  if (lowInputPreview.status === 200 && capacityDerived) pass("low-input preview derives capacity-safe vehicle counts for every class", JSON.stringify(lowInputAlternatives.map((item) => ({ type: item.vehicleType, count: item.requiredVehicleCount, capacity: item.capacity }))));
  else fail("low-input preview derives capacity-safe vehicle counts for every class", `${lowInputPreview.status}/${lowInputAlternatives.length}`);
  const lowInputHasAutomaticFuelPrice = Boolean(externalLayer);
  const ownConsumptionAndCostPass = lowInputPreview.status === 200
    && lowInputAlternatives.every((item) => item.fuelConsumptionReference?.version && item.fuelRequirementLiters !== null)
    && (lowInputHasAutomaticFuelPrice ? lowInputAlternatives.every((item) => item.costMinor !== null) : lowInputAlternatives.every((item) => item.costMinor === null && item.missingData.some((value) => /yakıt fiyatı|maliyet tabanı/i.test(value))));
  if (ownConsumptionAndCostPass) pass("low-input preview calculates each vehicle alternative with its own consumption reference", lowInputHasAutomaticFuelPrice ? "#2 fuel price available" : "#2 fuel price unavailable; no cost was fabricated");
  else fail("low-input preview calculates each vehicle alternative with its own consumption reference");
  const partialVehicleComparisonPass = lowInputHasAutomaticFuelPrice
    ? lowInputPreview.status === 200
      && lowInputPreview.data?.vehiclePlanAlternatives?.recommendation?.vehicleType
      && lowInputPreview.data?.vehiclePlanAlternatives?.recommendation?.reason
      && lowInputAlternatives.every((item) => item.costCoverage?.status === "PARTIAL")
      && lowInputAlternatives.every((item) => (item.missingOptionalCosts || []).length === 2)
      && lowInputAlternatives.every((item) => item.previewSafety?.noLiveMutation === true)
    : lowInputPreview.status === 200
      && lowInputAlternatives.length === 3
      && !lowInputPreview.data?.vehiclePlanAlternatives?.recommendation
      && lowInputAlternatives.every((item) => item.costMinor === null)
      && lowInputAlternatives.every((item) => item.previewSafety?.noLiveMutation === true);
  if (partialVehicleComparisonPass) pass("partial vehicle alternative comparison remains available and discloses optional costs", lowInputHasAutomaticFuelPrice ? "driver/maintenance missing" : "fuel price no-data disclosed");
  else fail("partial vehicle alternative comparison remains available and discloses optional costs");

  const regionalReference = await request("/api/external-cost-references?family=FUEL_DIESEL&unit=CURRENCY_PER_L&currencyCode=TRY&providerKey=EPDK_PETROL&regionCode=16&scopeType=CITY&scopeKey=16", { token: roomToken });
  const regionalMarketReference = regionalReference.data?.marketReference || regionalReference.body?.marketReference || null;
  const regionalReferenceRequest = regionalMarketReference ? {
    providerKey: regionalMarketReference.providerKey,
    family: regionalMarketReference.family,
    unit: regionalMarketReference.unit,
    currencyCode: regionalMarketReference.currencyCode,
    regionCode: regionalMarketReference.regionCode,
    scopeType: regionalMarketReference.scopeType,
    scopeKey: regionalMarketReference.scopeKey,
  } : null;
  const roomRegionalPreview = regionalReferenceRequest ? await request("/api/cost-scenarios/preview", {
    token: roomToken,
    method: "POST",
    body: {
      scope: "ROOM",
      baselineReferenceId: roomBaseline.data?.baselineReferenceId,
      baselineInput: {
        currencyCode: "TRY",
        vehicleType: "MINIBUS",
        vehicleCount: 1,
        vehicleCapacity: 16,
        passengerCount: 10,
        stopCount: 2,
        serviceDistanceKm: 100,
        totalDistanceKm: 100,
        routeDurationMinutes: 60,
        serviceDayCount: 10,
        shiftCount: 10,
        tripCount: 10,
        fuelType: "DIESEL",
      },
      scenarioOverrides: { useExternalFuelPrice: true },
      externalReference: regionalReferenceRequest,
    },
  }) : null;
  if (regionalReferenceRequest && roomRegionalPreview?.status === 200 && roomRegionalPreview.data?.referenceResolution?.fuelPrice?.baseline?.sourceKind === "EXTERNAL_CURRENT_REFERENCE" && roomRegionalPreview.data?.baseline?.costMinor !== null && roomRegionalPreview.data?.costCoverage?.baseline?.status === "PARTIAL") pass("ROOM consumes the canonical #2 provincial fuel reference with partial monetary output", `${regionalMarketReference.regionCode}/${regionalMarketReference.freshness}`);
  else if (!regionalReferenceRequest) fail("ROOM consumes the canonical #2 provincial fuel reference with partial monetary output", "No stored province-16 reference available for this read-only acceptance fixture");
  else fail("ROOM consumes the canonical #2 provincial fuel reference with partial monetary output", `${roomRegionalPreview.status}/${roomRegionalPreview.data?.referenceResolution?.fuelPrice?.baseline?.sourceKind}/${roomRegionalPreview.data?.baseline?.costMinor}`);

  const companyIdentity = await prisma.user.findUnique({ where: { email: "company@demo.com" }, select: { companyId: true } });
  const companyShift = companyIdentity?.companyId
    ? await prisma.shift.findFirst({
      where: { companyId: companyIdentity.companyId, status: { not: "DRAFT" }, routeSnapshotValidatedAt: { not: null } },
      orderBy: [{ routeSnapshotValidatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { _count: { select: { stops: true } }, stops: { orderBy: { order: "asc" }, take: 1, select: { lat: true, lng: true } } },
    })
    : null;
  const enrichedBody = {
    ...completeBody,
    baselineInput: { ...completeInput, shiftStartMinutes: 480, shiftEndMinutes: 540 },
    scenarioOverrides: {
      vehicleCount: 2,
      shiftStartMinutes: 510,
      riskAssumptions: { riskFuelUnitPriceMinor: 5000, riskDistanceKm: 125, riskDurationMinutes: 80 },
      routeAlternative: { type: "REVERSE_STOP_ORDER" },
      dispatchAlternative: { vehicleId: "preview-vehicle", driverId: "preview-driver", routeReference: "preview-route" },
    },
  };
  const enrichedPreview = await request("/api/cost-scenarios/preview", { token: companyToken, method: "POST", body: enrichedBody });
  if (enrichedPreview.status === 200 && ["EXPECTED", "BEST", "RISK"].every((key) => enrichedPreview.data?.scenarioVariants?.[key]?.scenarioType === key)) pass("master primer variants are API visible");
  else fail("master primer variants are API visible", `${enrichedPreview.status}/${Object.keys(enrichedPreview.data?.scenarioVariants || {})}`);
  if (enrichedPreview.status === 200 && enrichedPreview.data?.timingComparison?.shiftTimeChanged === true && enrichedPreview.data?.routeAlternative?.compared === true && enrichedPreview.data?.routeAlternative?.applied === false) pass("timing and route alternatives are compared without apply");
  else fail("timing and route alternatives are compared without apply", `${enrichedPreview.status}/${enrichedPreview.data?.timingComparison?.status}/${enrichedPreview.data?.routeAlternative?.status}`);
  if (enrichedPreview.status === 200 && enrichedPreview.data?.scenarioVariants?.RISK?.status === "READY" && enrichedPreview.data?.dispatchAlternative?.status === "SEAM_PROVEN_DEFERRED_TO_#20" && enrichedPreview.data?.dispatchAlternative?.applied === false) pass("risk and dispatch boundary are explicit");
  else fail("risk and dispatch boundary are explicit", `${enrichedPreview.status}/${enrichedPreview.data?.scenarioVariants?.RISK?.status}/${enrichedPreview.data?.dispatchAlternative?.status}`);
  if (enrichedPreview.status === 200 && ["READY", "INSUFFICIENT_DATA"].includes(enrichedPreview.data?.forecast?.status) && enrichedPreview.data?.forecast?.equation === "actualToDate + remainingForecast = forecastPeriodEnd" && ["READY", "INSUFFICIENT_DATA"].includes(enrichedPreview.data?.budgetVariance?.status) && enrichedPreview.data?.plannedVsActual?.dimensions) pass("forecast variance and planned-vs-actual report explicit evidence state");
  else fail("forecast variance and planned-vs-actual report explicit evidence state", `${enrichedPreview.status}/${enrichedPreview.data?.forecast?.status}/${enrichedPreview.data?.budgetVariance?.status}`);
  if (companyShift?.stops?.[0]) {
    const stopAdd = await request("/api/cost-scenarios/preview", {
      token: companyToken,
      method: "POST",
      body: { ...completeBody, baselineInput: { ...completeInput, stopCount: companyShift._count.stops }, scenarioOverrides: { scenarioStopOperations: [{ operation: "ADD", lat: companyShift.stops[0].lat, lng: companyShift.stops[0].lng }] } },
    });
    const stopRemove = await request("/api/cost-scenarios/preview", {
      token: companyToken,
      method: "POST",
      body: { ...completeBody, baselineInput: { ...completeInput, stopCount: companyShift._count.stops }, scenarioOverrides: { scenarioStopOperations: [{ operation: "REMOVE", index: 0 }] } },
    });
    if (stopAdd.status === 200 && stopAdd.data?.dimensions?.stopCount?.scenario === companyShift._count.stops + 1 && stopAdd.data?.routeAlternative?.applied === false) pass("stop add is a route preview comparison");
    else fail("stop add is a route preview comparison", `${stopAdd.status}/${stopAdd.data?.dimensions?.stopCount?.scenario}`);
    if (stopRemove.status === 200 && stopRemove.data?.dimensions?.stopCount?.scenario === Math.max(0, companyShift._count.stops - 1) && stopRemove.data?.routeAlternative?.applied === false) pass("stop remove is a route preview comparison");
    else fail("stop remove is a route preview comparison", `${stopRemove.status}/${stopRemove.data?.dimensions?.stopCount?.scenario}`);
  } else {
    fail("stop add is a route preview comparison", "No canonical company shift stop is available");
    fail("stop remove is a route preview comparison", "No canonical company shift stop is available");
  }

  const roomPreview = await request("/api/cost-scenarios/preview", {
    token: roomToken,
    method: "POST",
    body: { ...completeBody, scope: "ROOM", baselineReferenceId: roomBaseline.data?.baselineReferenceId, scenarioOverrides: { ...completeInput, vehicleCount: 2 } },
  });
  if (roomPreview.status === 200 && roomPreview.data?.status === "READY" && roomPreview.data?.dimensions?.vehicleCount?.scenario === 2) pass("ROOM real preview isolates vehicle scenario");
  else fail("ROOM real preview isolates vehicle scenario", `${roomPreview.status}/${roomPreview.data?.status}`);
  const aPreview = await request("/api/cost-scenarios/preview", { token: companyToken, method: "POST", body: { ...completeBody, scenarioOverrides: { passengerCount: 11 } } });
  const bPreview = await request("/api/cost-scenarios/preview", { token: companyToken, method: "POST", body: { ...completeBody, scenarioOverrides: { passengerCount: 12 } } });
  if (aPreview.status === 200 && bPreview.status === 200 && aPreview.data?.scenarioId !== bPreview.data?.scenarioId && aPreview.data?.safety?.notPersisted && bPreview.data?.safety?.notPersisted) pass("A/B previews stay isolated and transient");
  else fail("A/B previews stay isolated and transient");

  const schoolPreview = await request("/api/cost-scenarios/preview", {
    token: schoolToken,
    method: "POST",
    body: { ...completeBody, baselineReferenceId: schoolBaseline.data?.baselineReferenceId, scenarioOverrides: { serviceDistanceKm: 80, totalDistanceKm: 80 } },
  });
  if (schoolPreview.status === 200 && schoolPreview.data?.provenance?.companyKind === "SCHOOL" && schoolPreview.data?.safety?.noBudgetChange) pass("SCHOOL preview stays planning-only");
  else fail("SCHOOL preview stays planning-only", `${schoolPreview.status}/${schoolPreview.data?.provenance?.companyKind}`);

  const orgPreview = await request("/api/cost-scenarios/preview", {
    token: organizationToken,
    method: "POST",
    body: { ...completeBody, baselineReferenceId: organizationBaseline.data?.baselineReferenceId, scenarioOverrides: { passengerCount: 12 } },
  });
  if (orgPreview.status === 200 && orgPreview.data?.provenance?.companyKind === "ORGANIZATION" && orgPreview.data?.safety?.noShiftChange) pass("ORGANIZATION preview stays planning-only");
  else fail("ORGANIZATION preview stays planning-only", `${orgPreview.status}/${orgPreview.data?.provenance?.companyKind}`);

  const foreignCompany = await request("/api/cost-scenarios/baseline?scope=COMPANY&companyId=3", { token: companyToken });
  const foreignRoom = await request("/api/cost-scenarios/baseline?scope=ROOM&roomId=999999", { token: roomToken });
  if (foreignCompany.status === 403) pass("COMPANY cross-tenant baseline is denied", String(foreignCompany.status));
  else fail("COMPANY cross-tenant baseline is denied", String(foreignCompany.status));
  if (foreignRoom.status === 403) pass("ROOM cross-tenant baseline is denied", String(foreignRoom.status));
  else fail("ROOM cross-tenant baseline is denied", String(foreignRoom.status));
  const personelAttempt = await request("/api/cost-scenarios/baseline?scope=COMPANY", { token: personelToken });
  if (personelAttempt.status === 403) pass("PERSONEL is denied from scenario surface", String(personelAttempt.status));
  else fail("PERSONEL is denied from scenario surface", String(personelAttempt.status));
  const invalidScope = await request("/api/cost-scenarios/baseline?scope=DRIVER", { token: companyToken });
  if (invalidScope.status === 400) pass("invalid scenario scope is rejected", String(invalidScope.status));
  else fail("invalid scenario scope is rejected", String(invalidScope.status));

  const insufficient = await request("/api/cost-scenarios/preview", {
    token: companyToken,
    method: "POST",
    body: { ...completeBody, scenarioOverrides: { passengerCount: 30, vehicleCount: 1 } },
  });
  if (insufficient.status === 200 && insufficient.data?.status === "BLOCKED" && insufficient.data?.scenario?.costMinor === null) pass("capacity failure is fail-safe");
  else fail("capacity failure is fail-safe", `${insufficient.status}/${insufficient.data?.status}`);
  const invalidMoney = await request("/api/cost-scenarios/preview", {
    token: companyToken,
    method: "POST",
    body: { ...completeBody, baselineInput: { ...completeInput, fuelUnitPriceMinor: "12.5" } },
  });
  if (invalidMoney.status === 200 && invalidMoney.data?.status === "BLOCKED" && invalidMoney.data?.invalidFields?.includes("fuelUnitPriceMinor")) pass("unsafe money is rejected without a write");
  else fail("unsafe money is rejected without a write", `${invalidMoney.status}/${invalidMoney.data?.status}`);
  const mismatch = await request("/api/cost-scenarios/preview", {
    token: companyToken,
    method: "POST",
    body: { ...completeBody, baselineReferenceId: "base_not_this_tenant" },
  });
  if (mismatch.status === 409) pass("stale baseline reference requires refresh", String(mismatch.status));
  else fail("stale baseline reference requires refresh", String(mismatch.status));

  const externalAttempt = await request("/api/cost-scenarios/preview", {
    token: companyToken,
    method: "POST",
    body: {
      ...completeBody,
      scenarioOverrides: { ...completeInput, useExternalFuelPrice: true },
      externalReference: { family: "FUEL_DIESEL", unit: "CURRENCY_PER_L", currencyCode: "TRY", regionCode: "TR", scopeType: "GLOBAL", scopeKey: "GLOBAL" },
    },
  });
  if (externalAttempt.status === 200 && externalAttempt.data?.provenance?.externalReference?.usedForActualTruth !== true && externalAttempt.data?.safety?.notPersisted) pass("external reference remains forecast-only");
  else fail("external reference remains forecast-only", `${externalAttempt.status}/${externalAttempt.data?.provenance?.externalReference?.usedForActualTruth}`);

  const after = await domainFingerprint();
  if (before === after) pass("scenario GET/POST leaves live domain data unchanged");
  else fail("scenario GET/POST leaves live domain data unchanged", `${before.slice(0, 10)} != ${after.slice(0, 10)}`);
}

try {
  await main();
} catch (error) {
  fail("acceptance runner completed", error?.stack || String(error));
} finally {
  await prisma.$disconnect();
}

if (results.some((result) => !result.ok)) {
  console.error(`#4 acceptance failed: ${results.filter((result) => result.ok).length}/${results.length}`);
  process.exit(1);
}
console.log(`#4 acceptance passed: ${results.length}/${results.length}`);
