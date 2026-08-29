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

  const completeBody = {
    scope: "COMPANY",
    baselineReferenceId: companyBaseline.data?.baselineReferenceId,
    baselineInput: completeInput,
    scenarioOverrides: { vehicleCount: 1, serviceDistanceKm: 50, totalDistanceKm: 50 },
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

  const companyShift = companyBaseline.data?.source?.shiftId
    ? await prisma.shift.findUnique({ where: { id: Number(companyBaseline.data.source.shiftId) }, select: { _count: { select: { stops: true } }, stops: { orderBy: { order: "asc" }, take: 1, select: { lat: true, lng: true } } } })
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
