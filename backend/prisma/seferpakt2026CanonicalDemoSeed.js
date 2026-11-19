import { ROOM_COST_CATEGORY_LABELS } from "../src/finance/roomCostCategoryCatalog.js";

const CANONICAL_DEMO_MARKER = "SEFERPAKT_DEMO_2026_CANONICAL_V1";
const DEMO_REFERENCE_DATE = new Date("2026-10-22T00:00:00.000Z");

const DATE = Object.freeze({
  septemberStart: "2026-09-01",
  septemberEnd: "2026-09-30",
  octoberStart: "2026-10-01",
  octoberEnd: "2026-10-31",
  completedShiftStart: "2026-09-15T06:00:00.000Z",
  completedShiftEnd: "2026-09-15T14:00:00.000Z",
  ongoingShiftStart: "2026-10-22T06:00:00.000Z",
  ongoingShiftEnd: "2026-10-22T14:00:00.000Z",
});

const CATEGORY_LABELS = ROOM_COST_CATEGORY_LABELS;

const FULL_DATA = Object.freeze({
  customer: Object.freeze({ companyKey: "DEMO_COMPANY", companyName: "DemoCompany" }),
  completedServiceKey: "SEPTEMBER_COMPLETED",
  route: Object.freeze({
    templateKey: "SEPTEMBER_COMPLETED_ROUTE",
    name: marker("ROUTE_TEMPLATE_SEPTEMBER_FULL"),
    routeSource: "OSRM_DOCKER_RUNTIME",
    direction: "INBOUND",
    pattern: "LOOP",
    hub: Object.freeze({ lat: 41.025, lng: 28.989 }),
    plannedDistanceKm: 13.53,
    plannedDurationMinutes: 22.4,
    stops: Object.freeze([
      Object.freeze({ name: "Demo konut durağı", lat: 41.015, lng: 28.979, order: 1, type: "COMMON", passengerCount: 10 }),
      Object.freeze({ name: "Demo şirket durağı", lat: 41.025, lng: 28.989, order: 2, type: "COMMON", passengerCount: 10 }),
    ]),
  }),
  passengers: Object.freeze({
    count: 20,
    dataClass: "DEMO_SYNTHETIC_PERSONEL",
    passengerMarkers: Object.freeze(Array.from({ length: 20 }, (_, index) => `PASSENGER_${String(index + 1).padStart(2, "0")}`)),
  }),
  usagePlan: Object.freeze({
    title: marker("USAGE_PLAN_SEPTEMBER_FULL"),
    monthlyServiceDays: 20,
    dailyHours: 8,
    monthlyHours: 160,
    morningStartMin: 360,
    returnStartMin: 840,
    routePattern: "LOOP",
    basis: "DEMO_PLANNING_ASSUMPTION",
  }),
  costBaseline: Object.freeze({
    baselineSource: marker("COST_BASELINE_FULL"),
    manualBaselineOperationalCostMinor: 2390000,
    targetContributionBps: 2000,
    riskReserveBps: 500,
    quoteFloorMinor: 2987500,
    quoteFloorPerPassengerMinor: 149375,
    dataClass: "DEMO_PLANNING_ASSUMPTION",
  }),
  vehicleAlternatives: Object.freeze([
    Object.freeze({ vehicleType: "MINIBUS", plate: "34ABC126", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" }),
    Object.freeze({ vehicleType: "MIDIBUS", plate: "34ABC123", capacity: 29, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" }),
    Object.freeze({ vehicleType: "OTOBUS", plate: "34 ABC 125", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" }),
  ]),
  externalReferences: Object.freeze([
    Object.freeze({ referenceKey: marker("REF_DIESEL_PRICE_2026"), family: "FUEL_DIESEL", valueDecimal: "42.00", valueMinor: 4200, unit: "CURRENCY_PER_L", currencyCode: "TRY" }),
    Object.freeze({ referenceKey: marker("REF_MAINTENANCE_RATE_2026"), family: "MAINTENANCE_REFERENCE", valueDecimal: "95.00", valueMinor: 95, unit: "CURRENCY_PER_KM", currencyCode: "TRY" }),
    // The provider contract has no compound shift/vehicle unit. Persist the
    // supported per-trip unit; the planning evidence carries the explicit
    // vehicle and planned-movement denominator.
    Object.freeze({ referenceKey: marker("REF_DRIVER_PER_SHIFT_2026"), family: "REGIONAL_COST_REFERENCE", valueDecimal: "5000.00", valueMinor: 500000, unit: "CURRENCY_PER_TRIP", currencyCode: "TRY" }),
  ]),
});

const MISSING_DATA = Object.freeze({
  companyKey: "DEMO_COMPANY_B",
  expectedState: "MISSING_DATA",
  missingFields: Object.freeze(["route", "passengers", "costBaseline", "paymentEvidence"]),
  preserveAgreementMarker: marker("AGREEMENT_FIRM_B_CONTINUED"),
});

function marker(kind) {
  return `${CANONICAL_DEMO_MARKER}:${kind}`;
}

function buildService({ serviceKey, periodStart, periodEnd, shiftStart, shiftEnd, shiftStatus, agreementStatus, offerStatus, amountMinor, companyOfferAmount = amountMinor, roomOfferAmount = amountMinor }) {
  return {
    serviceKey,
    periodStart,
    periodEnd,
    agreement: {
      marker: marker(`AGREEMENT_${serviceKey}`),
      startDate: periodStart,
      endDate: periodEnd,
      status: agreementStatus,
      companyOfferAmount,
      roomOfferAmount,
      negotiationCompanyNote: `${marker(`AGREEMENT_${serviceKey}`)}:COMPANY_INITIAL_OFFER`,
      negotiationRoomNote: `${marker(`AGREEMENT_${serviceKey}`)}:ROOM_COUNTER_ACCEPTED`,
    },
    shift: {
      marker: marker(`SHIFT_${serviceKey}`),
      startAt: shiftStart,
      endAt: shiftEnd,
      status: shiftStatus,
    },
    offer: {
      status: offerStatus,
      amountCompany: companyOfferAmount,
      amountRoom: roomOfferAmount,
    },
    hakedis: serviceKey === "SEPTEMBER_COMPLETED"
      ? {
        reference: marker("HAKEDIS_SEPTEMBER"),
        amountMinor,
        status: "FINALIZED",
        source: "INTERNAL_ACTUAL",
      }
      : null,
    invoice: serviceKey === "SEPTEMBER_COMPLETED"
      ? {
        reference: marker("INVOICE_SEPTEMBER"),
        amountMinor,
        status: "ISSUED",
        source: "INTERNAL_ACTUAL",
      }
      : null,
  };
}

function buildFirmBService({ companyId, roomId, vehicleId, driverId }) {
  return {
    serviceKey: "FIRM_B_CONTINUED",
    companyId,
    roomId,
    vehicleId,
    driverId,
    periodStart: DATE.octoberStart,
    periodEnd: "2026-11-30",
    agreement: {
      marker: marker("AGREEMENT_FIRM_B_CONTINUED"),
      startDate: DATE.octoberStart,
      endDate: "2026-11-30",
      status: "ACTIVE",
      companyOfferAmount: 11000000,
      roomOfferAmount: 11000000,
    },
    offer: {
      status: "ACCEPTED",
      amountCompany: 11000000,
      amountRoom: 11000000,
    },
    shifts: [
      {
        marker: marker("SHIFT_FIRM_B_OCTOBER_COMPLETED"),
        startAt: "2026-10-10T06:00:00.000Z",
        endAt: "2026-10-10T14:00:00.000Z",
        status: "DONE",
      },
      {
        marker: marker("SHIFT_FIRM_B_NOVEMBER_PLANNED"),
        startAt: "2026-11-10T06:00:00.000Z",
        endAt: "2026-11-10T14:00:00.000Z",
        status: "APPROVED",
      },
    ],
    hakedis: null,
    invoice: null,
  };
}

function buildPartnerScenario({ scenarioKey, companyId, roomId, vehicleId, driverId }) {
  const isSchool = scenarioKey === "SCHOOL";
  const amountCompany = isSchool ? 9500000 : 11500000;
  const amountRoom = isSchool ? 10000000 : 12000000;
  const completedDay = isSchool ? "2026-09-17" : "2026-09-18";
  const plannedDay = isSchool ? "2026-10-17" : "2026-10-18";
  const companyName = isSchool ? "DemoOkul" : "DemoOrganizasyon";
  const routeStops = isSchool
    ? [
      { name: "Demo okul öğrenci durağı", lat: 41.021, lng: 28.986, order: 1, type: "COMMON", passengerCount: 1 },
      { name: "Demo okul kampüsü", lat: 41.028, lng: 28.995, order: 2, type: "COMMON", passengerCount: 1 },
      { name: "Demo okul dönüş durağı", lat: 41.024, lng: 28.991, order: 3, type: "MANUAL", passengerCount: 1 },
    ]
    : [
      { name: "Demo organizasyon buluşma", lat: 41.048, lng: 28.82, order: 1, type: "COMMON", passengerCount: 2 },
      { name: "Demo organizasyon otel", lat: 40.976, lng: 28.824, order: 2, type: "COMMON", passengerCount: 1 },
      { name: "Demo organizasyon salon", lat: 41.02, lng: 28.58, order: 3, type: "MANUAL", passengerCount: 1 },
    ];
  const passengerCount = isSchool ? 1 : 4;
  const prefix = `PARTNER_${scenarioKey}`;
  return {
    scenarioKey,
    companyId,
    roomId,
    vehicleId,
    driverId,
    companyName,
    agreementMarker: marker(`AGREEMENT_${scenarioKey}_FULL`),
    organizationPlanTitle: isSchool ? null : marker("ORGANIZATION_REQUEST_FULL"),
    agreement: {
      startDate: "2026-09-01",
      endDate: "2026-10-31",
      status: "ACTIVE",
      companyOfferAmount: amountCompany,
      roomOfferAmount: amountRoom,
    },
    shifts: [
      {
        marker: marker(`SHIFT_${scenarioKey}_SEPTEMBER_COMPLETED`),
        startAt: `${completedDay}T06:30:00.000Z`,
        endAt: `${completedDay}T14:30:00.000Z`,
        status: "DONE",
      },
      {
        marker: marker(`SHIFT_${scenarioKey}_OCTOBER_PLANNED`),
        startAt: `${plannedDay}T06:30:00.000Z`,
        endAt: `${plannedDay}T14:30:00.000Z`,
        status: "APPROVED",
      },
    ],
    offer: {
      status: "ACCEPTED",
      amountCompany,
      amountRoom,
      noteCompany: `2026 ${companyName} başlangıç teklifi; ${amountCompany} minor.`,
      noteRoom: `2026 ${companyName} ROOM karşı teklif ve kabulü; ${amountRoom} minor.`,
    },
    routeStops,
    passengerCount,
    passengerMarker: `${marker(`PASSENGER_${scenarioKey}`)}:`,
    costs: [
      {
        categoryKey: "FUEL",
        sourceRef: marker(`EXPENSE_${scenarioKey}_FUEL`),
        amountMinor: isSchool ? 320000 : 380000,
        description: `2026 ${companyName} tamamlanan hizmet yakıt gideri`,
      },
      {
        categoryKey: "EMPLOYER_MONTHLY_COST",
        sourceRef: marker(`EXPENSE_${scenarioKey}_DRIVER`),
        amountMinor: isSchool ? 480000 : 520000,
        description: `2026 ${companyName} hizmet sürücü işveren maliyeti`,
      },
    ],
    hakedis: {
      reference: marker(`HAKEDIS_${scenarioKey}`),
      amountMinor: amountRoom,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    },
    invoice: {
      reference: marker(`INVOICE_${scenarioKey}`),
      amountMinor: amountRoom,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    },
    collection: {
      idempotencyKey: marker(`MANUAL_COLLECTION_${scenarioKey}`),
      amountMinor: isSchool ? 5000000 : 6000000,
      collectedAt: "2026-10-06",
    },
    routeSnapshotInputHash: `${marker("ROUTE_SNAPSHOT_DEMO_PLANNING")}:${prefix}`,
  };
}

export function buildSeferpakt2026DemoPlan({ companyId, firmBCompanyId = null, roomId, vehicleId, driverId } = {}) {
  const completedService = buildService({
    serviceKey: "SEPTEMBER_COMPLETED",
    periodStart: DATE.septemberStart,
    periodEnd: DATE.septemberEnd,
    shiftStart: DATE.completedShiftStart,
    shiftEnd: DATE.completedShiftEnd,
    shiftStatus: "DONE",
    agreementStatus: "DONE",
    offerStatus: "ACCEPTED",
    amountMinor: 14000000,
    companyOfferAmount: 15000000,
    roomOfferAmount: 14000000,
  });
  const ongoingService = buildService({
    serviceKey: "OCTOBER_ONGOING",
    periodStart: DATE.octoberStart,
    periodEnd: DATE.octoberEnd,
    shiftStart: DATE.ongoingShiftStart,
    shiftEnd: DATE.ongoingShiftEnd,
    shiftStatus: "APPROVED",
    agreementStatus: "ACTIVE",
    offerStatus: "OPEN",
    amountMinor: 16000000,
  });
  const firmBService = firmBCompanyId == null
    ? null
    : buildFirmBService({ companyId: firmBCompanyId, roomId, vehicleId, driverId });

  const expenseEntries = [
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_FUEL"),
      categoryKey: "FUEL",
      amountMinor: 240000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      agreementServiceKey: completedService.serviceKey,
      shiftServiceKey: completedService.serviceKey,
      vehicleId,
      driverId: null,
      occurrenceKind: "PER_SHIFT",
      allocation: "DIRECT",
      allocationUnit: "shift",
      description: "Eylül 2026 tamamlanan hizmeti için vardiya bağlantılı yakıt gideri",
    },
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_MAINTENANCE"),
      categoryKey: "MAINTENANCE",
      amountMinor: 180000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      shiftServiceKey: null,
      vehicleId,
      driverId: null,
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      description: "Eylül 2026 araç bakım gideri; servis dağıtımı bekliyor",
    },
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_DRIVER"),
      categoryKey: "EMPLOYER_MONTHLY_COST",
      amountMinor: 500000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      shiftServiceKey: null,
      vehicleId: null,
      driverId,
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      description: "Eylül 2026 sürücü aylık toplam işveren maliyeti",
    },
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_RENT"),
      categoryKey: "RENT",
      amountMinor: 600000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      shiftServiceKey: null,
      vehicleId,
      driverId: null,
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      description: "Eylül 2026 araç kira gideri; vardiyaya doğrudan yüklenmedi",
    },
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_REPAIR"),
      categoryKey: "REPAIR",
      amountMinor: 220000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      vehicleId,
      driverId: null,
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      description: "Eylül 2026 araç onarım gideri; kullanım payına dağıtıldı",
    },
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_TIRE_RIM"),
      categoryKey: "TIRE_RIM",
      amountMinor: 150000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      vehicleId,
      driverId: null,
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      description: "Eylül 2026 lastik ve jant bakım payı",
    },
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_TRAFFIC_INSURANCE"),
      categoryKey: "TRAFFIC_INSURANCE",
      amountMinor: 300000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      vehicleId,
      driverId: null,
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      description: "Eylül 2026 trafik sigortası dönem payı",
    },
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_MTV"),
      categoryKey: "MTV_TAX",
      amountMinor: 120000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      vehicleId,
      driverId: null,
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      description: "Eylül 2026 MTV vergi dönem payı",
    },
    {
      sourceRef: marker("EXPENSE_SEPTEMBER_HGS"),
      categoryKey: "HGS_TOLL",
      amountMinor: 80000,
      periodStart: DATE.septemberStart,
      periodEnd: DATE.septemberEnd,
      shiftServiceKey: completedService.serviceKey,
      vehicleId,
      driverId: null,
      occurrenceKind: "ONE_OFF",
      allocation: "DIRECT",
      allocationUnit: "trip",
      description: "Eylül 2026 tamamlanan demo vardiyasının HGS geçiş gideri",
    },
    {
      sourceRef: marker("EXPENSE_OCTOBER_FUEL"),
      categoryKey: "FUEL",
      amountMinor: 260000,
      periodStart: DATE.octoberStart,
      periodEnd: DATE.octoberEnd,
      agreementServiceKey: ongoingService.serviceKey,
      shiftServiceKey: ongoingService.serviceKey,
      vehicleId,
      driverId: null,
      occurrenceKind: "PER_SHIFT",
      allocation: "DIRECT",
      allocationUnit: "shift",
      description: "Ekim 2026 devam eden hizmeti için vardiya bağlantılı yakıt gideri",
    },
    {
      sourceRef: marker("EXPENSE_OCTOBER_DRIVER"),
      categoryKey: "EMPLOYER_MONTHLY_COST",
      amountMinor: 500000,
      periodStart: DATE.octoberStart,
      periodEnd: DATE.octoberEnd,
      shiftServiceKey: null,
      vehicleId: null,
      driverId,
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      description: "Ekim 2026 sürücü aylık toplam işveren maliyeti",
    },
  ];

  return {
    marker: CANONICAL_DEMO_MARKER,
    referenceDate: DEMO_REFERENCE_DATE.toISOString().slice(0, 10),
    companyId,
    roomId,
    vehicleId,
    driverId,
    firmBCompanyId,
    completedService,
    ongoingService,
    firmBService,
    expenseEntries: expenseEntries.map((entry) => ({ recordKind: "ACTUAL", ...entry })),
    fullData: FULL_DATA,
    missingData: MISSING_DATA,
    paymentEvidence: null,
    unsupportedFutureFixtures: ["M18_DEMO_ROOM_FINANCE_FOUNDATION_V1", "M18_DEMO_ROOM_HAKEDIS_COVERAGE_V1"],
  };
}

async function ensureCategory(tx, roomId, key) {
  return tx.roomCostCategory.upsert({
    where: { roomId_key: { roomId, key } },
    update: { label: CATEGORY_LABELS[key], kind: "BUILT_IN", isActive: true },
    create: { roomId, key, label: CATEGORY_LABELS[key], kind: "BUILT_IN", isActive: true },
  });
}

async function ensureService(tx, plan, service) {
  const agreement = await tx.agreement.upsert({
    where: { id: (await tx.agreement.findFirst({ where: { companyId: plan.companyId, roomId: plan.roomId, companyOfferNote: service.agreement.marker }, select: { id: true } }))?.id || -1 },
    update: {
      companyId: plan.companyId,
      roomId: plan.roomId,
      vehicleId: plan.vehicleId,
      driverId: plan.driverId,
      startDate: new Date(`${service.periodStart}T00:00:00.000Z`),
      endDate: new Date(`${service.periodEnd}T00:00:00.000Z`),
      weekMask: 127,
      startMin: FULL_DATA.usagePlan.morningStartMin,
      endMin: FULL_DATA.usagePlan.returnStartMin,
      status: service.agreement.status,
      companyOfferAmount: service.agreement.companyOfferAmount,
      companyOfferNote: service.agreement.marker,
      roomOfferAmount: service.agreement.roomOfferAmount,
      roomOfferNote: `${service.agreement.marker}:ROOM_COUNTER_ACCEPTED; initialCompanyOffer=${service.agreement.companyOfferAmount}; finalAccepted=${service.agreement.roomOfferAmount}`,
      hubLat: FULL_DATA.route.hub.lat,
      hubLng: FULL_DATA.route.hub.lng,
      direction: FULL_DATA.route.direction,
      pattern: FULL_DATA.route.pattern,
    },
    create: {
      companyId: plan.companyId,
      roomId: plan.roomId,
      vehicleId: plan.vehicleId,
      driverId: plan.driverId,
      startDate: new Date(`${service.periodStart}T00:00:00.000Z`),
      endDate: new Date(`${service.periodEnd}T00:00:00.000Z`),
      weekMask: 127,
      startMin: FULL_DATA.usagePlan.morningStartMin,
      endMin: FULL_DATA.usagePlan.returnStartMin,
      status: service.agreement.status,
      companyOfferAmount: service.agreement.companyOfferAmount,
      companyOfferNote: service.agreement.marker,
      roomOfferAmount: service.agreement.roomOfferAmount,
      roomOfferNote: `${service.agreement.marker}:ROOM_COUNTER_ACCEPTED; initialCompanyOffer=${service.agreement.companyOfferAmount}; finalAccepted=${service.agreement.roomOfferAmount}`,
      hubLat: FULL_DATA.route.hub.lat,
      hubLng: FULL_DATA.route.hub.lng,
      direction: FULL_DATA.route.direction,
      pattern: FULL_DATA.route.pattern,
    },
  });
  const shift = await tx.shift.upsert({
    where: { id: (await tx.shift.findFirst({ where: { companyId: plan.companyId, roomId: plan.roomId, companyOfferNote: service.shift.marker }, select: { id: true } }))?.id || -1 },
    update: {
      companyId: plan.companyId,
      roomId: plan.roomId,
      vehicleId: plan.vehicleId,
      driverId: plan.driverId,
      agreementId: agreement.id,
      startAt: new Date(service.shift.startAt),
      endAt: new Date(service.shift.endAt),
      status: service.shift.status,
      companyOfferAmount: service.offer.amountCompany,
      companyOfferNote: service.shift.marker,
      roomOfferAmount: service.offer.amountRoom,
      roomOfferNote: `${service.shift.marker}:ROOM_COUNTER_ACCEPTED; initialCompanyOffer=${service.offer.amountCompany}; finalAccepted=${service.offer.amountRoom}`,
      hubLat: FULL_DATA.route.hub.lat,
      hubLng: FULL_DATA.route.hub.lng,
      direction: FULL_DATA.route.direction,
      pattern: FULL_DATA.route.pattern,
    },
    create: {
      companyId: plan.companyId,
      roomId: plan.roomId,
      vehicleId: plan.vehicleId,
      driverId: plan.driverId,
      agreementId: agreement.id,
      startAt: new Date(service.shift.startAt),
      endAt: new Date(service.shift.endAt),
      status: service.shift.status,
      companyOfferAmount: service.offer.amountCompany,
      companyOfferNote: service.shift.marker,
      roomOfferAmount: service.offer.amountRoom,
      roomOfferNote: `${service.shift.marker}:ROOM_COUNTER_ACCEPTED; initialCompanyOffer=${service.offer.amountCompany}; finalAccepted=${service.offer.amountRoom}`,
      hubLat: FULL_DATA.route.hub.lat,
      hubLng: FULL_DATA.route.hub.lng,
      direction: FULL_DATA.route.direction,
      pattern: FULL_DATA.route.pattern,
    },
  });
  await tx.shiftOffer.upsert({
    where: { shiftId_roomId: { shiftId: shift.id, roomId: plan.roomId } },
    update: {
      status: service.offer.status,
      amountCompany: service.offer.amountCompany,
      noteCompany: `2026 COMPANY_INITIAL_OFFER; amount=${service.offer.amountCompany}.`,
      amountRoom: service.offer.amountRoom,
      noteRoom: `2026 ROOM_COUNTER_ACCEPTED; amount=${service.offer.amountRoom}.`,
    },
    create: {
      shiftId: shift.id,
      roomId: plan.roomId,
      status: service.offer.status,
      amountCompany: service.offer.amountCompany,
      noteCompany: `2026 COMPANY_INITIAL_OFFER; amount=${service.offer.amountCompany}.`,
      amountRoom: service.offer.amountRoom,
      noteRoom: `2026 ROOM_COUNTER_ACCEPTED; amount=${service.offer.amountRoom}.`,
    },
  });
  await tx.shiftProgress.upsert({
    where: { shiftId: shift.id },
    update: { lastReachedOrder: service.shift.status === "DONE" ? 2 : 0, completedAt: service.shift.status === "DONE" ? new Date(service.shift.endAt) : null },
    create: { shiftId: shift.id, lastReachedOrder: service.shift.status === "DONE" ? 2 : 0, completedAt: service.shift.status === "DONE" ? new Date(service.shift.endAt) : null },
  });
  await tx.stop.deleteMany({ where: { shiftId: shift.id } });
  await tx.stop.createMany({
    data: FULL_DATA.route.stops.map((stop) => ({
      shiftId: shift.id,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      order: stop.order,
      type: stop.type,
      state: service.shift.status === "DONE" ? "REACHED" : "PENDING",
    })),
  });
  return { agreement, shift };
}

async function ensureVehicleAlternative(tx, roomId, spec) {
  const existing = await tx.vehicle.findUnique({ where: { plate: spec.plate } });
  if (existing && existing.roomId !== roomId) throw new Error(`SEFERPAKT_2026_VEHICLE_TENANT_MISMATCH:${spec.plate}`);
  const data = {
    roomId,
    plate: spec.plate,
    capacity: spec.capacity,
    type: spec.vehicleType,
    status: "ACTIVE",
    note: `${CANONICAL_DEMO_MARKER}:VEHICLE_ALTERNATIVE:${spec.vehicleType}`,
  };
  return existing
    ? tx.vehicle.update({ where: { id: existing.id }, data: { capacity: data.capacity, type: data.type, status: data.status, note: data.note } })
    : tx.vehicle.create({ data });
}

async function ensureRouteTemplate(tx, roomId, route, name) {
  const existing = await tx.routeTemplate.findFirst({ where: { roomId, name }, select: { id: true } });
  const template = existing
    ? await tx.routeTemplate.update({ where: { id: existing.id }, data: { status: "ACTIVE" } })
    : await tx.routeTemplate.create({ data: { roomId, name, status: "ACTIVE" } });
  await tx.routeTemplateStop.deleteMany({ where: { routeTemplateId: template.id } });
  await tx.routeTemplateStop.createMany({
    data: route.stops.map((stop) => ({
      routeTemplateId: template.id,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      order: stop.order,
      type: stop.type,
    })),
  });
  return template;
}

async function ensureOrganizationUsagePlan(tx, { companyId, roomId, agreementId, shiftId, serviceKey, fullData }) {
  const title = serviceKey === "SEPTEMBER_COMPLETED"
    ? fullData.usagePlan.title
    : marker("USAGE_PLAN_OCTOBER_FULL");
  const planDate = serviceKey === "SEPTEMBER_COMPLETED" ? "2026-09-15" : "2026-10-22";
  const existing = await tx.organizationPlan.findFirst({ where: { companyId, title }, select: { id: true } });
  const data = {
    companyId,
    title,
    planDate: new Date(`${planDate}T00:00:00.000Z`),
    startMin: 6 * 60,
    endMin: 14 * 60,
    roomId,
    notes: `${fullData.usagePlan.basis}; monthlyServiceDays=${fullData.usagePlan.monthlyServiceDays}; monthlyHours=${fullData.usagePlan.monthlyHours}; serviceKey=${serviceKey}`,
    status: "SHIFT_PUBLISHED",
    publishedShiftId: shiftId,
    linkedAgreementId: agreementId,
  };
  const usagePlan = existing
    ? await tx.organizationPlan.update({ where: { id: existing.id }, data })
    : await tx.organizationPlan.create({ data });
  await tx.organizationStop.deleteMany({ where: { planId: usagePlan.id } });
  await tx.organizationStop.createMany({
    data: fullData.route.stops.map((stop, index) => ({
      planId: usagePlan.id,
      name: stop.name,
      address: `DEMO-${serviceKey}-${index + 1}`,
      lat: stop.lat,
      lng: stop.lng,
      order: stop.order,
      passengerCount: stop.passengerCount ?? Math.ceil(fullData.passengers.count / fullData.route.stops.length),
      note: "DEMO_SENTETIK_PERSONEL; gerçek açık adres değildir",
    })),
  });
  return usagePlan;
}

async function ensureSupportShift(tx, plan, fullData) {
  const supportMarker = marker("SHIFT_SEPTEMBER_SUPPORT");
  const existing = await tx.shift.findFirst({
    where: {
      companyId: plan.companyId,
      roomId: plan.roomId,
      OR: [
        { companyOfferNote: supportMarker },
        {
          agreementId: null,
          vehicleId: plan.vehicleId,
          driverId: plan.driverId,
          startAt: new Date("2026-09-04T04:00:00.000Z"),
          endAt: new Date("2026-09-04T06:00:00.000Z"),
        },
      ],
    },
    select: { id: true, companyOfferNote: true },
  });
  const data = {
    companyId: plan.companyId,
    roomId: plan.roomId,
    vehicleId: plan.vehicleId,
    driverId: plan.driverId,
    agreementId: null,
    startAt: new Date("2026-09-04T04:00:00.000Z"),
    endAt: new Date("2026-09-04T06:00:00.000Z"),
    status: "DONE",
    requiredPaxOverride: fullData.passengers.count,
    hubLat: 41.01,
    hubLng: 28.97,
    routeSnapshotPolyline: JSON.stringify(fullData.route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))),
    routeSnapshotDistanceM: Math.round(fullData.route.plannedDistanceKm * 1000),
    routeSnapshotDurationSec: fullData.route.plannedDurationMinutes * 60,
    routeSnapshotValidatedAt: new Date("2026-09-04T06:00:00.000Z"),
    routeSnapshotInputHash: `${marker("ROUTE_SNAPSHOT_DEMO_PLANNING")}:SUPPORT`,
    companyOfferNote: existing?.companyOfferNote || supportMarker,
  };
  const shift = existing
    ? await tx.shift.update({ where: { id: existing.id }, data })
    : await tx.shift.create({ data });
  await tx.shiftProgress.upsert({
    where: { shiftId: shift.id },
    update: { lastReachedOrder: fullData.route.stops.length, completedAt: data.endAt },
    create: { shiftId: shift.id, lastReachedOrder: fullData.route.stops.length, completedAt: data.endAt },
  });
  await tx.stop.deleteMany({ where: { shiftId: shift.id } });
  await tx.stop.createMany({
    data: fullData.route.stops.map((stop) => ({
      shiftId: shift.id,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      order: stop.order,
      type: stop.type,
      state: "REACHED",
      reachedAt: data.endAt,
    })),
  });
  return shift;
}

async function ensurePassengerLinks(tx, companyId, shiftIds, fullData) {
  const passengers = [];
  for (let index = 0; index < fullData.passengers.count; index += 1) {
    const phone = `+905550010${String(index + 1).padStart(2, "0")}`;
    const existing = await tx.personel.findFirst({ where: { companyId, phone }, select: { id: true } });
    const personel = existing
      ? await tx.personel.update({ where: { id: existing.id }, data: { fullName: `Demo Yolcu ${String(index + 1).padStart(2, "0")}`, kind: "PERSONEL", geoStatus: "OK", geoManualOverride: true, homeLat: 41.01 + index * 0.001, homeLng: 28.97 + index * 0.001 } })
      : await tx.personel.create({ data: { companyId, kind: "PERSONEL", fullName: `Demo Yolcu ${String(index + 1).padStart(2, "0")}`, phone, geoStatus: "OK", geoManualOverride: true, homeLat: 41.01 + index * 0.001, homeLng: 28.97 + index * 0.001 } });
    passengers.push(personel);
  }
  for (const shiftId of shiftIds) {
    const stops = await tx.stop.findMany({ where: { shiftId }, orderBy: { order: "asc" }, select: { id: true } });
    for (const [index, personel] of passengers.entries()) {
      const stop = stops[index % Math.max(stops.length, 1)];
      await tx.shiftPersonel.upsert({
        where: { shiftId_personelId: { shiftId, personelId: personel.id } },
        update: { note: `${CANONICAL_DEMO_MARKER}:PASSENGER_LINK` },
        create: { shiftId, personelId: personel.id, note: `${CANONICAL_DEMO_MARKER}:PASSENGER_LINK` },
      });
      if (stop) {
        await tx.stopAssignment.upsert({
          where: { shiftId_personelId: { shiftId, personelId: personel.id } },
          update: { stopId: stop.id, walkM: 80 + index * 20 },
          create: { shiftId, stopId: stop.id, personelId: personel.id, walkM: 80 + index * 20 },
        });
      }
    }
  }
  return passengers;
}

async function ensureCostBaseline(tx, roomId, fullData, completedShiftId) {
  const existing = await tx.roomQuoteFloorDraft.findFirst({ where: { roomId, baselineSource: fullData.costBaseline.baselineSource }, select: { id: true } });
  const data = {
    roomId,
    status: "DRAFT",
    currencyCode: "TRY",
    manualBaselineOperationalCostMinor: fullData.costBaseline.manualBaselineOperationalCostMinor,
    targetContributionBps: fullData.costBaseline.targetContributionBps,
    riskReserveBps: fullData.costBaseline.riskReserveBps,
    quoteFloorMinor: fullData.costBaseline.quoteFloorMinor,
    quoteFloorPerPassengerMinor: fullData.costBaseline.quoteFloorPerPassengerMinor,
    baselineSource: fullData.costBaseline.baselineSource,
    inputSnapshot: {
      dataClass: fullData.costBaseline.dataClass,
      serviceKey: fullData.completedServiceKey,
      shiftId: completedShiftId,
      passengerCount: fullData.passengers.count,
      route: fullData.route,
      vehicleAlternatives: fullData.vehicleAlternatives,
      fuelPriceSource: fullData.externalReferences[0].referenceKey,
      fuelConsumptionSource: "DEMO_PLANNING_ASSUMPTION",
    },
    calculationVersion: "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
    version: 1,
  };
  return existing
    ? tx.roomQuoteFloorDraft.update({ where: { id: existing.id }, data })
    : tx.roomQuoteFloorDraft.create({ data });
}

async function ensureAllocationLine(tx, entry, { shift, amountMinor, quantity, vehicleId, driverId, agreementId, evidenceRef }) {
  if (!entry || amountMinor <= 0) return null;
  const lineageKey = `SHIFT:${shift.id}`;
  return tx.roomCostAllocationLine.upsert({
    where: { roomId_entryId_lineageKey: { roomId: entry.roomId, entryId: entry.id, lineageKey } },
    update: {
      targetKind: "SHIFT",
      vehicleId: vehicleId ?? null,
      driverId: driverId ?? null,
      agreementId: agreementId ?? null,
      shiftId: shift.id,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      quantity,
      unit: "hours",
      unitRateMinor: null,
      allocatedAmountMinor: amountMinor,
      currencyCode: entry.currencyCode,
      sourceRef: entry.sourceRef,
      evidenceRef,
    },
    create: {
      roomId: entry.roomId,
      entryId: entry.id,
      lineageKind: "REFERENCE",
      targetKind: "SHIFT",
      lineageKey,
      vehicleId: vehicleId ?? null,
      driverId: driverId ?? null,
      agreementId: agreementId ?? null,
      shiftId: shift.id,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      quantity,
      unit: "hours",
      allocatedAmountMinor: amountMinor,
      currencyCode: entry.currencyCode,
      sourceRef: entry.sourceRef,
      evidenceRef,
    },
  });
}

async function ensureFirmBCompany(tx, baseCompany) {
  const existing = await tx.company.findFirst({ where: { name: "DemoCompanyB" } });
  if (existing) {
    return tx.company.update({
      where: { id: existing.id },
      data: { kind: "COMPANY", status: "ACTIVE", regionId: baseCompany.regionId },
    });
  }
  return tx.company.create({
    data: {
      name: "DemoCompanyB",
      kind: "COMPANY",
      status: "ACTIVE",
      regionId: baseCompany.regionId,
    },
  });
}

async function ensureContinuedService(tx, service) {
  const agreementData = {
    companyId: service.companyId,
    roomId: service.roomId,
    vehicleId: service.vehicleId,
    driverId: service.driverId,
    startDate: new Date(`${service.agreement.startDate}T00:00:00.000Z`),
    endDate: new Date(`${service.agreement.endDate}T00:00:00.000Z`),
    weekMask: 127,
    startMin: 9 * 60,
    endMin: 17 * 60,
    status: service.agreement.status,
    companyOfferAmount: service.agreement.companyOfferAmount,
    companyOfferNote: service.agreement.marker,
    roomOfferAmount: service.agreement.roomOfferAmount,
    roomOfferNote: `${service.agreement.marker}:ROOM_ACCEPTED`,
  };
  const existingAgreement = await tx.agreement.findFirst({
    where: { companyId: service.companyId, roomId: service.roomId, companyOfferNote: service.agreement.marker },
    select: { id: true },
  });
  const agreement = existingAgreement
    ? await tx.agreement.update({ where: { id: existingAgreement.id }, data: agreementData })
    : await tx.agreement.create({ data: agreementData });

  const shifts = [];
  for (const shiftSpec of service.shifts) {
    const shiftData = {
      companyId: service.companyId,
      roomId: service.roomId,
      vehicleId: service.vehicleId,
      driverId: service.driverId,
      agreementId: agreement.id,
      startAt: new Date(shiftSpec.startAt),
      endAt: new Date(shiftSpec.endAt),
      status: shiftSpec.status,
      companyOfferAmount: service.offer.amountCompany,
      companyOfferNote: shiftSpec.marker,
      roomOfferAmount: service.offer.amountRoom,
      roomOfferNote: `${shiftSpec.marker}:ROOM_ACCEPTED`,
    };
    const existingShift = await tx.shift.findFirst({
      where: { companyId: service.companyId, roomId: service.roomId, companyOfferNote: shiftSpec.marker },
      select: { id: true },
    });
    const shift = existingShift
      ? await tx.shift.update({ where: { id: existingShift.id }, data: shiftData })
      : await tx.shift.create({ data: shiftData });
    await tx.shiftOffer.upsert({
      where: { shiftId_roomId: { shiftId: shift.id, roomId: service.roomId } },
      update: {
        status: service.offer.status,
        amountCompany: service.offer.amountCompany,
        amountRoom: service.offer.amountRoom,
        noteCompany: "2026 Firma B demo hizmet teklifi.",
        noteRoom: "2026 Firma B ROOM kabulü.",
      },
      create: {
        shiftId: shift.id,
        roomId: service.roomId,
        status: service.offer.status,
        amountCompany: service.offer.amountCompany,
        amountRoom: service.offer.amountRoom,
        noteCompany: "2026 Firma B demo hizmet teklifi.",
        noteRoom: "2026 Firma B ROOM kabulü.",
      },
    });
    await tx.shiftProgress.upsert({
      where: { shiftId: shift.id },
      update: {
        lastReachedOrder: shiftSpec.status === "DONE" ? 2 : 0,
        completedAt: shiftSpec.status === "DONE" ? new Date(shiftSpec.endAt) : null,
      },
      create: {
        shiftId: shift.id,
        lastReachedOrder: shiftSpec.status === "DONE" ? 2 : 0,
        completedAt: shiftSpec.status === "DONE" ? new Date(shiftSpec.endAt) : null,
      },
    });
    shifts.push(shift);
  }
  return { agreement, shifts };
}

async function ensureFinanceRecord(tx, plan, service, entry, categoryByKey, serviceIds) {
  const existingRows = await tx.roomCostEntry.findMany({
    where: { roomId: plan.roomId, sourceRef: entry.sourceRef },
    orderBy: { id: "desc" },
  });
  // A correction chain may retain historical rows with the same sourceRef.
  // The canonical seed updates only the newest non-reversal economic row and
  // never rewrites a historical/original row into the current replacement.
  const existing = existingRows.find((row) => !row.isReversal && row.lifecycle === "CONFIRMED" && (
    entry.agreementServiceKey ? row.agreementId === serviceIds[entry.agreementServiceKey].agreement.id : row.agreementId === null
  )) || existingRows.find((row) => !row.isReversal && row.lifecycle === "CONFIRMED") || null;
  const data = {
    roomId: plan.roomId,
    categoryId: categoryByKey[entry.categoryKey].id,
    vehicleId: entry.vehicleId,
    driverId: entry.driverId,
    agreementId: entry.agreementServiceKey
      ? serviceIds[entry.agreementServiceKey].agreement.id
      : null,
    shiftId: entry.shiftServiceKey ? serviceIds[entry.shiftServiceKey].shift.id : null,
    occurredAt: new Date(`${entry.periodStart}T12:00:00.000Z`),
    periodStart: new Date(`${entry.periodStart}T00:00:00.000Z`),
    periodEnd: new Date(`${entry.periodEnd}T00:00:00.000Z`),
    amountMinor: entry.amountMinor,
    currencyCode: "TRY",
    // These are synthetic demo planning amounts, not tax documents. Keep the
    // ledger explicit so the financial preview can calculate gross demo
    // economics without pretending to know a real VAT amount.
    vatMode: "NOT_APPLICABLE",
    vatAmountMinor: null,
    recordKind: "ACTUAL",
    occurrenceKind: entry.occurrenceKind,
    allocation: entry.allocation,
    allocationUnit: entry.occurrenceKind === "PER_KM" ? "km" : "period",
    evidenceRef: entry.sourceRef,
    sourceRef: entry.sourceRef,
    sourceType: CANONICAL_DEMO_MARKER,
    description: entry.description,
    lifecycle: "CONFIRMED",
    version: 1,
    confirmedAt: new Date(`${entry.periodStart}T12:00:00.000Z`),
  };
  return existing
    ? tx.roomCostEntry.update({ where: { id: existing.id }, data })
    : tx.roomCostEntry.create({ data });
}

async function ensureManualCollectionForInvoice(tx, { roomId, companyId, invoiceId, idempotencyKey, amountMinor, collectedAt }) {
  const actor = await tx.user.findFirst({
    where: { role: "ROOM", roomId },
    select: { id: true },
  });
  if (!actor) throw new Error("SEFERPAKT_2026_ROOM_ACTOR_REQUIRED_FOR_COLLECTION");

  const data = {
    invoiceId,
    companyId,
    roomId,
    amountMinor,
    currencyCode: "TRY",
    collectedAt: new Date(`${collectedAt}T00:00:00.000Z`),
    paymentMethod: "BANK_TRANSFER",
    direction: "COLLECTION",
    status: "CONFIRMED",
    sourceRef: idempotencyKey,
    note: "DEMO_MANUAL_COLLECTION_NOT_BANK_VERIFIED",
    idempotencyKey,
    version: 1,
    createdByUserId: actor.id,
    confirmedByUserId: actor.id,
    confirmedAt: new Date("2026-10-05T12:00:00.000Z"),
  };
  return tx.invoiceCollection.upsert({
    where: { roomId_idempotencyKey: { roomId, idempotencyKey } },
    update: data,
    create: data,
  });
}

async function ensureManualCollection(tx, { roomId, companyId, invoiceId }) {
  return ensureManualCollectionForInvoice(tx, {
    roomId,
    companyId,
    invoiceId,
    idempotencyKey: marker("MANUAL_COLLECTION_SEPTEMBER"),
    amountMinor: 8000000,
    collectedAt: "2026-10-05",
  });
}

async function ensurePartnerPassenger(tx, scenario, index) {
  if (scenario.scenarioKey === "SCHOOL") {
    const student = await tx.personel.findFirst({
      where: { companyId: scenario.companyId, kind: "STUDENT" },
      orderBy: { id: "asc" },
    });
    if (!student) throw new Error("SEFERPAKT_2026_SCHOOL_STUDENT_PREREQUISITE_MISSING");
    return student;
  }
  const phone = `+9055519${String(index + 1).padStart(3, "0")}`;
  return tx.personel.upsert({
    where: { companyId_phone: { companyId: scenario.companyId, phone } },
    update: {
      kind: "PERSONEL",
      fullName: `Demo Organizasyon Katılımcı ${String(index + 1).padStart(2, "0")}`,
      geoStatus: "OK",
      geoManualOverride: true,
      homeLat: 41.04 + index * 0.002,
      homeLng: 28.82 + index * 0.002,
    },
    create: {
      companyId: scenario.companyId,
      kind: "PERSONEL",
      fullName: `Demo Organizasyon Katılımcı ${String(index + 1).padStart(2, "0")}`,
      phone,
      geoStatus: "OK",
      geoManualOverride: true,
      homeLat: 41.04 + index * 0.002,
      homeLng: 28.82 + index * 0.002,
    },
  });
}

async function ensurePartnerScenario(tx, scenario) {
  const agreementData = {
    companyId: scenario.companyId,
    roomId: scenario.roomId,
    vehicleId: scenario.vehicleId,
    driverId: scenario.driverId,
    startDate: new Date(`${scenario.agreement.startDate}T00:00:00.000Z`),
    endDate: new Date(`${scenario.agreement.endDate}T00:00:00.000Z`),
    weekMask: 127,
    startMin: 6 * 60 + 30,
    endMin: 14 * 60 + 30,
    status: scenario.agreement.status,
    companyOfferAmount: scenario.agreement.companyOfferAmount,
    companyOfferNote: scenario.agreementMarker,
    roomOfferAmount: scenario.agreement.roomOfferAmount,
    roomOfferNote: `${scenario.agreementMarker}:ROOM_COUNTER_ACCEPTED`,
  };
  const existingAgreement = await tx.agreement.findFirst({
    where: { companyId: scenario.companyId, roomId: scenario.roomId, companyOfferNote: scenario.agreementMarker },
    select: { id: true },
  });
  const agreement = existingAgreement
    ? await tx.agreement.update({ where: { id: existingAgreement.id }, data: agreementData })
    : await tx.agreement.create({ data: agreementData });

  const shifts = [];
  for (const shiftSpec of scenario.shifts) {
    const shiftData = {
      companyId: scenario.companyId,
      roomId: scenario.roomId,
      vehicleId: scenario.vehicleId,
      driverId: scenario.driverId,
      agreementId: agreement.id,
      startAt: new Date(shiftSpec.startAt),
      endAt: new Date(shiftSpec.endAt),
      status: shiftSpec.status,
      companyOfferAmount: scenario.offer.amountCompany,
      companyOfferNote: shiftSpec.marker,
      roomOfferAmount: scenario.offer.amountRoom,
      roomOfferNote: `${shiftSpec.marker}:ROOM_COUNTER_ACCEPTED`,
      requiredPaxOverride: scenario.passengerCount,
      hubLat: 41.02,
      hubLng: 28.98,
      routeSnapshotPolyline: JSON.stringify(scenario.routeStops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))),
      // Partner fixture routes intentionally have no calculated metric yet.
      // Do not encode a 1m/1s placeholder: the UI must not turn unknown data
      // into a fake 0 km / 0 dk result or derive fuel/profit from it.
      routeSnapshotDistanceM: null,
      routeSnapshotDurationSec: null,
      routeSnapshotValidatedAt: null,
      routeSnapshotInputHash: null,
    };
    const existingShift = await tx.shift.findFirst({
      where: { companyId: scenario.companyId, roomId: scenario.roomId, companyOfferNote: shiftSpec.marker },
      select: { id: true },
    });
    const shift = existingShift
      ? await tx.shift.update({ where: { id: existingShift.id }, data: shiftData })
      : await tx.shift.create({ data: shiftData });
    await tx.shiftOffer.upsert({
      where: { shiftId_roomId: { shiftId: shift.id, roomId: scenario.roomId } },
      update: {
        status: scenario.offer.status,
        amountCompany: scenario.offer.amountCompany,
        amountRoom: scenario.offer.amountRoom,
        noteCompany: scenario.offer.noteCompany,
        noteRoom: scenario.offer.noteRoom,
      },
      create: {
        shiftId: shift.id,
        roomId: scenario.roomId,
        status: scenario.offer.status,
        amountCompany: scenario.offer.amountCompany,
        amountRoom: scenario.offer.amountRoom,
        noteCompany: scenario.offer.noteCompany,
        noteRoom: scenario.offer.noteRoom,
      },
    });
    await tx.shiftProgress.upsert({
      where: { shiftId: shift.id },
      update: {
        lastReachedOrder: shiftSpec.status === "DONE" ? scenario.routeStops.length : 0,
        completedAt: shiftSpec.status === "DONE" ? new Date(shiftSpec.endAt) : null,
      },
      create: {
        shiftId: shift.id,
        lastReachedOrder: shiftSpec.status === "DONE" ? scenario.routeStops.length : 0,
        completedAt: shiftSpec.status === "DONE" ? new Date(shiftSpec.endAt) : null,
      },
    });
    await tx.stop.deleteMany({ where: { shiftId: shift.id } });
    await tx.stop.createMany({
      data: scenario.routeStops.map((stop) => ({
        shiftId: shift.id,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        order: stop.order,
        type: stop.type,
        state: shiftSpec.status === "DONE" ? "REACHED" : "PENDING",
        reachedAt: shiftSpec.status === "DONE" ? new Date(shiftSpec.endAt) : null,
      })),
    });
    shifts.push(shift);
  }

  let organizationPlan = null;
  if (scenario.organizationPlanTitle) {
    organizationPlan = await tx.organizationPlan.upsert({
      where: { id: (await tx.organizationPlan.findFirst({ where: { companyId: scenario.companyId, title: scenario.organizationPlanTitle }, select: { id: true } }))?.id || -1 },
      update: {
        companyId: scenario.companyId,
        title: scenario.organizationPlanTitle,
        planDate: new Date("2026-09-18T00:00:00.000Z"),
        startMin: 6 * 60 + 30,
        endMin: 14 * 60 + 30,
        roomId: scenario.roomId,
        notes: `${CANONICAL_DEMO_MARKER}:ORGANIZATION_REQUEST_NEGOTIATION_ACCEPTED; participantCount=${scenario.passengerCount}`,
        status: "SHIFT_PUBLISHED",
        publishedShiftId: shifts[0].id,
        linkedAgreementId: agreement.id,
      },
      create: {
        companyId: scenario.companyId,
        title: scenario.organizationPlanTitle,
        planDate: new Date("2026-09-18T00:00:00.000Z"),
        startMin: 6 * 60 + 30,
        endMin: 14 * 60 + 30,
        roomId: scenario.roomId,
        notes: `${CANONICAL_DEMO_MARKER}:ORGANIZATION_REQUEST_NEGOTIATION_ACCEPTED; participantCount=${scenario.passengerCount}`,
        status: "SHIFT_PUBLISHED",
        publishedShiftId: shifts[0].id,
        linkedAgreementId: agreement.id,
      },
    });
    await tx.organizationStop.deleteMany({ where: { planId: organizationPlan.id } });
    await tx.organizationStop.createMany({
      data: scenario.routeStops.map((stop) => ({
        planId: organizationPlan.id,
        name: stop.name,
        address: "DEMO_SENTETIK; gerçek açık adres değildir",
        lat: stop.lat,
        lng: stop.lng,
        order: stop.order,
        passengerCount: stop.passengerCount,
        note: "DEMO_SENTETIK_ORGANIZATION_STOP",
      })),
    });
    await tx.shift.updateMany({ where: { id: { in: shifts.map((shift) => shift.id) } }, data: { organizationPlanId: organizationPlan.id } });
  }

  const passengers = [];
  for (let index = 0; index < scenario.passengerCount; index += 1) {
    passengers.push(await ensurePartnerPassenger(tx, scenario, index));
  }
  for (const shift of shifts) {
    const stops = await tx.stop.findMany({ where: { shiftId: shift.id }, orderBy: { order: "asc" }, select: { id: true } });
    for (const [index, passenger] of passengers.entries()) {
      const stop = stops[index % Math.max(stops.length, 1)];
      await tx.shiftPersonel.upsert({
        where: { shiftId_personelId: { shiftId: shift.id, personelId: passenger.id } },
        update: { note: `${CANONICAL_DEMO_MARKER}:PASSENGER_LINK:${scenario.scenarioKey}` },
        create: { shiftId: shift.id, personelId: passenger.id, note: `${CANONICAL_DEMO_MARKER}:PASSENGER_LINK:${scenario.scenarioKey}` },
      });
      if (stop) {
        await tx.stopAssignment.upsert({
          where: { shiftId_personelId: { shiftId: shift.id, personelId: passenger.id } },
          update: { stopId: stop.id, walkM: 100 + index * 25 },
          create: { shiftId: shift.id, personelId: passenger.id, stopId: stop.id, walkM: 100 + index * 25 },
        });
      }
    }
  }
  if (scenario.scenarioKey === "SCHOOL") {
    const student = passengers[0];
    const existingPickup = await tx.pickupRequest.findFirst({ where: { shiftId: shifts[0].id, personelId: student.id }, select: { id: true } });
    const pickupData = { shiftId: shifts[0].id, personelId: student.id, lat: student.homeLat || 41.021, lng: student.homeLng || 28.986, status: "OPEN" };
    if (existingPickup) await tx.pickupRequest.update({ where: { id: existingPickup.id }, data: pickupData });
    else await tx.pickupRequest.create({ data: pickupData });
  }

  const categoryRows = await Promise.all([...new Set(scenario.costs.map((entry) => entry.categoryKey))].map((key) => ensureCategory(tx, scenario.roomId, key)));
  const categoryByKey = Object.fromEntries(categoryRows.map((row) => [row.key, row]));
  const completedShift = shifts[0];
  const financeRecords = [];
  for (const entry of scenario.costs) {
    const existing = await tx.roomCostEntry.findFirst({ where: { roomId: scenario.roomId, sourceRef: entry.sourceRef, sourceType: CANONICAL_DEMO_MARKER }, select: { id: true } });
    const data = {
      roomId: scenario.roomId,
      categoryId: categoryByKey[entry.categoryKey].id,
      vehicleId: scenario.vehicleId,
      driverId: entry.categoryKey === "EMPLOYER_MONTHLY_COST" ? scenario.driverId : null,
      agreementId: agreement.id,
      shiftId: completedShift.id,
      occurredAt: new Date("2026-09-18T12:00:00.000Z"),
      periodStart: new Date("2026-09-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-30T00:00:00.000Z"),
      amountMinor: entry.amountMinor,
      currencyCode: "TRY",
      vatMode: "UNKNOWN",
      vatAmountMinor: null,
      recordKind: "ACTUAL",
      occurrenceKind: entry.categoryKey === "FUEL" ? "PER_SHIFT" : "PERIODIC",
      allocation: "DIRECT",
      allocationUnit: entry.categoryKey === "FUEL" ? "shift" : "period",
      evidenceRef: entry.sourceRef,
      sourceRef: entry.sourceRef,
      sourceType: CANONICAL_DEMO_MARKER,
      description: entry.description,
      lifecycle: "CONFIRMED",
      version: 1,
      confirmedAt: new Date("2026-09-18T12:00:00.000Z"),
    };
    const financeRecord = existing
      ? await tx.roomCostEntry.update({ where: { id: existing.id }, data })
      : await tx.roomCostEntry.create({ data });
    financeRecords.push(financeRecord);
    await ensureAllocationLine(tx, financeRecord, {
      shift: completedShift,
      amountMinor: entry.amountMinor,
      quantity: entry.categoryKey === "FUEL" ? 1 : 1,
      vehicleId: scenario.vehicleId,
      driverId: entry.categoryKey === "EMPLOYER_MONTHLY_COST" ? scenario.driverId : null,
      agreementId: agreement.id,
      evidenceRef: `${entry.sourceRef}:DIRECT_SHIFT_ALLOCATION`,
    });
  }

  const hakedis = await tx.hakedisRecord.upsert({
    where: { reference: scenario.hakedis.reference },
    update: {
      agreementId: agreement.id,
      companyId: scenario.companyId,
      roomId: scenario.roomId,
      periodStart: new Date(`${scenario.hakedis.periodStart}T00:00:00.000Z`),
      periodEnd: new Date(`${scenario.hakedis.periodEnd}T00:00:00.000Z`),
      amountMinor: scenario.hakedis.amountMinor,
      status: "FINALIZED",
      source: "INTERNAL_ACTUAL",
      notes: `2026 ${scenario.companyName} tamamlanan hizmet hakedişi`,
    },
    create: {
      reference: scenario.hakedis.reference,
      agreementId: agreement.id,
      companyId: scenario.companyId,
      roomId: scenario.roomId,
      periodStart: new Date(`${scenario.hakedis.periodStart}T00:00:00.000Z`),
      periodEnd: new Date(`${scenario.hakedis.periodEnd}T00:00:00.000Z`),
      amountMinor: scenario.hakedis.amountMinor,
      status: "FINALIZED",
      source: "INTERNAL_ACTUAL",
      notes: `2026 ${scenario.companyName} tamamlanan hizmet hakedişi`,
    },
  });
  const invoice = await tx.invoiceRecord.upsert({
    where: { reference: scenario.invoice.reference },
    update: {
      agreementId: agreement.id,
      companyId: scenario.companyId,
      roomId: scenario.roomId,
      periodStart: new Date(`${scenario.invoice.periodStart}T00:00:00.000Z`),
      periodEnd: new Date(`${scenario.invoice.periodEnd}T00:00:00.000Z`),
      amountMinor: scenario.invoice.amountMinor,
      status: "ISSUED",
      source: "INTERNAL_ACTUAL",
      notes: `2026 ${scenario.companyName} tamamlanan hizmet faturası`,
      issuedAt: new Date("2026-09-30T12:00:00.000Z"),
    },
    create: {
      reference: scenario.invoice.reference,
      agreementId: agreement.id,
      companyId: scenario.companyId,
      roomId: scenario.roomId,
      periodStart: new Date(`${scenario.invoice.periodStart}T00:00:00.000Z`),
      periodEnd: new Date(`${scenario.invoice.periodEnd}T00:00:00.000Z`),
      amountMinor: scenario.invoice.amountMinor,
      status: "ISSUED",
      source: "INTERNAL_ACTUAL",
      notes: `2026 ${scenario.companyName} tamamlanan hizmet faturası`,
      issuedAt: new Date("2026-09-30T12:00:00.000Z"),
    },
  });
  const collection = await ensureManualCollectionForInvoice(tx, {
    roomId: scenario.roomId,
    companyId: scenario.companyId,
    invoiceId: invoice.id,
    idempotencyKey: scenario.collection.idempotencyKey,
    amountMinor: scenario.collection.amountMinor,
    collectedAt: scenario.collection.collectedAt,
  });
  return {
    scenarioKey: scenario.scenarioKey,
    companyId: scenario.companyId,
    agreementId: agreement.id,
    shiftIds: shifts.map((shift) => shift.id),
    offerIds: await tx.shiftOffer.findMany({ where: { shiftId: { in: shifts.map((shift) => shift.id) }, roomId: scenario.roomId }, select: { id: true } }).then((rows) => rows.map((row) => row.id)),
    organizationPlanId: organizationPlan?.id || null,
    passengerIds: passengers.map((passenger) => passenger.id),
    costIds: financeRecords.map((entry) => entry.id),
    hakedisId: hakedis.id,
    invoiceId: invoice.id,
    collectionId: collection.id,
  };
}

async function ensureFullDataGraph(tx, plan, fullData, services) {
  const alternativeVehicles = {};
  for (const spec of fullData.vehicleAlternatives) {
    alternativeVehicles[spec.vehicleType] = await ensureVehicleAlternative(tx, plan.roomId, spec);
  }

  const routeTemplates = {};
  const usagePlans = {};
  for (const service of [plan.completedService, plan.ongoingService]) {
    const serviceIds = services[service.serviceKey];
    const routeName = service.serviceKey === "SEPTEMBER_COMPLETED"
      ? fullData.route.name
      : marker("ROUTE_TEMPLATE_OCTOBER_FULL");
    routeTemplates[service.serviceKey] = await ensureRouteTemplate(tx, plan.roomId, fullData.route, routeName);
    usagePlans[service.serviceKey] = await ensureOrganizationUsagePlan(tx, {
      companyId: plan.companyId,
      roomId: plan.roomId,
      agreementId: serviceIds.agreement.id,
      shiftId: serviceIds.shift.id,
      serviceKey: service.serviceKey,
      fullData,
    });
    await tx.shift.update({
      where: { id: serviceIds.shift.id },
      data: {
        organizationPlanId: usagePlans[service.serviceKey].id,
        requiredPaxOverride: fullData.passengers.count,
        hubLat: fullData.route.hub.lat,
        hubLng: fullData.route.hub.lng,
        direction: fullData.route.direction,
        pattern: fullData.route.pattern,
        routeSnapshotPolyline: JSON.stringify(fullData.route.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))),
        routeSnapshotDistanceM: Math.round(fullData.route.plannedDistanceKm * 1000),
        routeSnapshotDurationSec: fullData.route.plannedDurationMinutes * 60,
        routeSnapshotValidatedAt: new Date(`${service.shift.startAt}`),
        routeSnapshotInputHash: `${marker("ROUTE_SNAPSHOT_DEMO_PLANNING")}:${service.serviceKey}`,
      },
    });
  }

  const supportShift = await ensureSupportShift(tx, plan, fullData);
  const passengers = await ensurePassengerLinks(tx, plan.companyId, [services[plan.completedService.serviceKey].shift.id, supportShift.id, services[plan.ongoingService.serviceKey].shift.id], fullData);
  // ExternalCostReference is intentionally constrained to verified external
  // sources. Demo planning assumptions stay in the quote-floor input snapshot
  // and are never persisted as market evidence.
  const externalReferences = [];
  const costBaseline = await ensureCostBaseline(tx, plan.roomId, fullData, services[plan.completedService.serviceKey].shift.id);

  return {
    alternativeVehicles,
    routeTemplates,
    usagePlans,
    supportShift,
    passengers,
    externalReferences,
    costBaseline,
  };
}

async function ensureFullDataAllocations(tx, plan, fullData, services, supportShift, financeRecords) {
  const completedShift = services[plan.completedService.serviceKey].shift;
  const completedAgreement = services[plan.completedService.serviceKey].agreement;
  const ongoingShift = services[plan.ongoingService.serviceKey].shift;
  const ongoingAgreement = services[plan.ongoingService.serviceKey].agreement;
  const allocations = [];
  for (const entrySpec of plan.expenseEntries) {
    const entry = financeRecords[entrySpec.sourceRef];
    if (!entry) continue;
    const evidenceRef = `${entry.sourceRef}:USAGE_HOURS_DEMO_PLANNING`;
    const periodMonth = entry.periodStart instanceof Date
      ? entry.periodStart.toISOString().slice(0, 7)
      : String(entry.periodStart || "").slice(0, 7);
    if (entrySpec.categoryKey === "FUEL" && entrySpec.shiftServiceKey === plan.completedService.serviceKey) {
      allocations.push(await ensureAllocationLine(tx, entry, {
        shift: completedShift,
        amountMinor: entry.amountMinor,
        quantity: 8,
        vehicleId: entry.vehicleId,
        driverId: entry.driverId,
        agreementId: completedAgreement.id,
        evidenceRef,
      }));
      continue;
    }
    if (entrySpec.categoryKey === "FUEL" && entrySpec.shiftServiceKey === plan.ongoingService.serviceKey) {
      allocations.push(await ensureAllocationLine(tx, entry, {
        shift: ongoingShift,
        amountMinor: entry.amountMinor,
        quantity: 8,
        vehicleId: entry.vehicleId,
        driverId: entry.driverId,
        agreementId: ongoingAgreement.id,
        evidenceRef,
      }));
      continue;
    }
    if (!["MAINTENANCE", "EMPLOYER_MONTHLY_COST", "RENT", "REPAIR", "TIRE_RIM", "TRAFFIC_INSURANCE", "MTV_TAX"].includes(entrySpec.categoryKey)) continue;
    if (periodMonth !== "2026-09") {
      await tx.roomCostAllocationLine.deleteMany({
        where: {
          roomId: plan.roomId,
          entryId: entry.id,
          NOT: { lineageKey: `SHIFT:${ongoingShift.id}` },
        },
      });
      allocations.push(await ensureAllocationLine(tx, entry, {
        shift: ongoingShift,
        amountMinor: entry.amountMinor,
        quantity: 8,
        vehicleId: entry.vehicleId,
        driverId: entry.driverId,
        agreementId: ongoingAgreement.id,
        evidenceRef,
      }));
      continue;
    }
    // The COMPANY FULL_DATA acceptance chain is intentionally self-contained:
    // every September periodic cost belongs to the completed service. Remove
    // any previous split/support lines before writing the idempotent full
    // allocation so the selected ROOM service cannot report a pending share.
    await tx.roomCostAllocationLine.deleteMany({
      where: { roomId: plan.roomId, entryId: entry.id },
    });
    allocations.push(await ensureAllocationLine(tx, entry, {
      shift: completedShift,
      amountMinor: entry.amountMinor,
      quantity: 8,
      vehicleId: entry.vehicleId,
      driverId: entry.driverId,
      agreementId: completedAgreement.id,
      evidenceRef,
    }));
  }
  const sourceTotals = [];
  for (const entrySpec of plan.expenseEntries.filter((item) => ["FUEL", "MAINTENANCE", "EMPLOYER_MONTHLY_COST", "RENT", "REPAIR", "TIRE_RIM", "TRAFFIC_INSURANCE", "MTV_TAX", "HGS_TOLL"].includes(item.categoryKey))) {
    const entry = financeRecords[entrySpec.sourceRef];
    if (!entry) continue;
    const lines = await tx.roomCostAllocationLine.findMany({ where: { roomId: plan.roomId, entryId: entry.id } });
    sourceTotals.push({
      entryId: entry.id,
      sourceRef: entry.sourceRef,
      sourceAmountMinor: entry.amountMinor,
      allocatedAmountMinor: entry.allocation === "DIRECT"
        ? entry.amountMinor
        : lines.reduce((sum, line) => sum + Number(line.allocatedAmountMinor || 0), 0),
    });
  }
  if (sourceTotals.some((item) => item.allocatedAmountMinor > item.sourceAmountMinor)) throw new Error("SEFERPAKT_2026_ALLOCATION_EXCEEDS_SOURCE");
  return { allocations, sourceTotals };
}

export async function ensureSeferpakt2026CanonicalDemoInTransaction(tx) {
    const [company, room, vehicle, driver] = await Promise.all([
      tx.company.findFirst({ where: { name: "DemoCompany" } }),
      tx.room.findFirst({ where: { name: "DemoRoom" } }),
      tx.vehicle.findFirst({ where: { plate: "34ABC123" } }),
      tx.driver.findFirst({ where: { driverCode: "SRC-000001" } }),
    ]);
    if (!company || !room || !vehicle || !driver) throw new Error("SEFERPAKT_2026_PREREQUISITE_MISSING");
    if (vehicle.roomId !== room.id || driver.roomId !== room.id) throw new Error("SEFERPAKT_2026_TENANT_RELATION_INVALID");
    const firmBCompany = await ensureFirmBCompany(tx, company);
    const plan = buildSeferpakt2026DemoPlan({ companyId: company.id, firmBCompanyId: firmBCompany.id, roomId: room.id, vehicleId: vehicle.id, driverId: driver.id });
    const services = {
      [plan.completedService.serviceKey]: await ensureService(tx, plan, plan.completedService),
      [plan.ongoingService.serviceKey]: await ensureService(tx, plan, plan.ongoingService),
    };
    const firmBService = await ensureContinuedService(tx, plan.firmBService);
    const [schoolCompany, organizationCompany] = await Promise.all([
      tx.company.findFirst({ where: { name: "DemoOkul", kind: "SCHOOL" }, select: { id: true, name: true } }),
      tx.company.findFirst({ where: { name: "DemoOrganizasyon", kind: "ORGANIZATION" }, select: { id: true, name: true } }),
    ]);
    if (!schoolCompany || !organizationCompany) throw new Error("SEFERPAKT_2026_SCHOOL_ORGANIZATION_PREREQUISITE_MISSING");
    const partnerScenarios = [
      await ensurePartnerScenario(tx, buildPartnerScenario({ scenarioKey: "SCHOOL", companyId: schoolCompany.id, roomId: room.id, vehicleId: vehicle.id, driverId: driver.id })),
      await ensurePartnerScenario(tx, buildPartnerScenario({ scenarioKey: "ORGANIZATION", companyId: organizationCompany.id, roomId: room.id, vehicleId: vehicle.id, driverId: driver.id })),
    ];
    const fullDataGraph = await ensureFullDataGraph(tx, plan, plan.fullData, services);
    const categoryKeys = [...new Set(plan.expenseEntries.map((entry) => entry.categoryKey))];
    const categoryRows = await Promise.all(categoryKeys.map((key) => ensureCategory(tx, room.id, key)));
    const categoryByKey = Object.fromEntries(categoryRows.map((row) => [row.key, row]));
    const financeRecords = {};
    for (const entry of plan.expenseEntries) {
      financeRecords[entry.sourceRef] = await ensureFinanceRecord(tx, plan, null, entry, categoryByKey, services);
    }
    const allocation = await ensureFullDataAllocations(tx, plan, plan.fullData, services, fullDataGraph.supportShift, financeRecords);
    let manualCollection = null;
    for (const service of [plan.completedService, plan.ongoingService]) {
      if (service.hakedis) {
        await tx.hakedisRecord.upsert({
          where: { reference: service.hakedis.reference },
          update: {
            agreementId: services[service.serviceKey].agreement.id,
            companyId: company.id,
            roomId: room.id,
            periodStart: new Date(`${service.periodStart}T00:00:00.000Z`),
            periodEnd: new Date(`${service.periodEnd}T00:00:00.000Z`),
            amountMinor: service.hakedis.amountMinor,
            status: service.hakedis.status,
            source: service.hakedis.source,
            notes: "Eylül 2026 tamamlanan hizmet hakedişi",
          },
          create: {
            reference: service.hakedis.reference,
            agreementId: services[service.serviceKey].agreement.id,
            companyId: company.id,
            roomId: room.id,
            periodStart: new Date(`${service.periodStart}T00:00:00.000Z`),
            periodEnd: new Date(`${service.periodEnd}T00:00:00.000Z`),
            amountMinor: service.hakedis.amountMinor,
            status: service.hakedis.status,
            source: service.hakedis.source,
            notes: "Eylül 2026 tamamlanan hizmet hakedişi",
          },
        });
      }
      if (service.invoice) {
        const invoice = await tx.invoiceRecord.upsert({
          where: { reference: service.invoice.reference },
          update: {
            agreementId: services[service.serviceKey].agreement.id,
            companyId: company.id,
            roomId: room.id,
            periodStart: new Date(`${service.periodStart}T00:00:00.000Z`),
            periodEnd: new Date(`${service.periodEnd}T00:00:00.000Z`),
            amountMinor: service.invoice.amountMinor,
            status: service.invoice.status,
            source: service.invoice.source,
            notes: "Eylül 2026 tamamlanan hizmet faturası",
            issuedAt: new Date("2026-09-30T12:00:00.000Z"),
          },
          create: {
            reference: service.invoice.reference,
            agreementId: services[service.serviceKey].agreement.id,
            companyId: company.id,
            roomId: room.id,
            periodStart: new Date(`${service.periodStart}T00:00:00.000Z`),
            periodEnd: new Date(`${service.periodEnd}T00:00:00.000Z`),
            amountMinor: service.invoice.amountMinor,
            status: service.invoice.status,
            source: service.invoice.source,
            notes: "Eylül 2026 tamamlanan hizmet faturası",
            issuedAt: new Date("2026-09-30T12:00:00.000Z"),
          },
        });
        manualCollection = await ensureManualCollection(tx, {
          roomId: room.id,
          companyId: company.id,
          invoiceId: invoice.id,
        });
      }
    }
    return {
      manifest: plan,
      ids: {
        companyId: company.id,
        roomId: room.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        completedAgreementId: services[plan.completedService.serviceKey].agreement.id,
        completedShiftId: services[plan.completedService.serviceKey].shift.id,
        ongoingAgreementId: services[plan.ongoingService.serviceKey].agreement.id,
        ongoingShiftId: services[plan.ongoingService.serviceKey].shift.id,
        firmBCompanyId: firmBCompany.id,
        firmBAgreementId: firmBService.agreement.id,
        firmBShiftIds: firmBService.shifts.map((shift) => shift.id),
        supportShiftId: fullDataGraph.supportShift.id,
        passengerIds: fullDataGraph.passengers.map((personel) => personel.id),
        routeTemplateIds: Object.fromEntries(Object.entries(fullDataGraph.routeTemplates).map(([key, row]) => [key, row.id])),
        usagePlanIds: Object.fromEntries(Object.entries(fullDataGraph.usagePlans).map(([key, row]) => [key, row.id])),
        alternativeVehicleIds: Object.fromEntries(Object.entries(fullDataGraph.alternativeVehicles).map(([key, row]) => [key, row.id])),
        externalReferenceIds: fullDataGraph.externalReferences.map((row) => row.id),
        quoteFloorDraftId: fullDataGraph.costBaseline.id,
        allocationLineIds: allocation.allocations.filter(Boolean).map((row) => row.id),
        partnerScenarios,
      },
      databaseMutations: true,
      externalSideEffects: false,
      paymentEvidence: manualCollection
        ? "DEMO_MANUAL_COLLECTION_NOT_BANK_VERIFIED"
        : null,
      manualCollection: manualCollection
        ? { id: manualCollection.id, amountMinor: manualCollection.amountMinor, status: manualCollection.status }
        : null,
      fullData: {
        routeTemplateIds: Object.fromEntries(Object.entries(fullDataGraph.routeTemplates).map(([key, row]) => [key, row.id])),
        usagePlanIds: Object.fromEntries(Object.entries(fullDataGraph.usagePlans).map(([key, row]) => [key, row.id])),
        supportShiftId: fullDataGraph.supportShift.id,
        externalReferenceState: "NOT_PERSISTED_DEMO_ASSUMPTION",
        allocationSourceTotals: allocation.sourceTotals,
      },
    };
}

export async function ensureSeferpakt2026CanonicalDemo(prisma) {
  return prisma.$transaction((tx) => ensureSeferpakt2026CanonicalDemoInTransaction(tx));
}

// Stable logical selectors for normal DEMO/E2E selection. These keys are
// intentionally independent from database IDs; the existing seed markers and
// tenant/foreign-key relations remain the source of truth for resolution.
export const CANONICAL_DEMO_SCENARIO_KEYS = Object.freeze({
  COMPANY_CORE: Object.freeze({
    key: "DEMO_COMPANY_CORE",
    companyName: "DemoCompany",
    serviceKeys: Object.freeze(["SEPTEMBER_COMPLETED", "OCTOBER_ONGOING"]),
  }),
  SCHOOL_OPERATIONS: Object.freeze({
    key: "PARTNER_SCHOOL",
    companyName: "DemoOkul",
    scenarioKey: "SCHOOL",
    shiftKeys: Object.freeze(["SHIFT_SCHOOL_SEPTEMBER_COMPLETED", "SHIFT_SCHOOL_OCTOBER_PLANNED"]),
  }),
  ORGANIZATION_OPERATIONS: Object.freeze({
    key: "PARTNER_ORGANIZATION",
    companyName: "DemoOrganizasyon",
    scenarioKey: "ORGANIZATION",
    shiftKeys: Object.freeze(["SHIFT_ORGANIZATION_SEPTEMBER_COMPLETED", "SHIFT_ORGANIZATION_OCTOBER_PLANNED"]),
  }),
  M18_COMPANY_ROOM_SHIFT: Object.freeze({
    key: "M18_COMPANY_ROOM_SHIFT_ACCEPTANCE",
    companyName: "DemoCompany",
    roomName: "DemoRoom",
    vehiclePlate: "34ABC126",
    driverLabel: "Driver One",
    source: "CommercialSource/AuditLog relation; resolve by tenant and FK, not by copied IDs",
  }),
  M18_PARENT_SHIFT: Object.freeze({
    key: "M18_PARENT_AUTHORIZED_SHIFT",
    companyName: "DemoOkul",
    vehiclePlate: "34 ABC 125",
    source: "authorized parent/child relation; resolve by tenant and StopAssignment relation",
  }),
  M18_AGREEMENT: Object.freeze({
    key: "M18_COMPANY_ROOM_AGREEMENT_ACCEPTANCE",
    companyName: "DemoCompany",
    roomName: "DemoRoom",
    status: "APPROVED",
    source: "agreement source/audit lineage; do not infer from numeric ID alone",
  }),
});

export { CANONICAL_DEMO_MARKER, DEMO_REFERENCE_DATE };
