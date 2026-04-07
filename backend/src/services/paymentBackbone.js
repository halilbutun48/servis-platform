import prisma from "../prisma.js";

export const PAYMENT_MODES = ["OFF", "OPTIONAL", "REQUIRED"];
export const COMMERCIAL_SOURCE_TYPES = ["AGREEMENT", "SHIFT_SERIES"];

export const providerAdapters = {
  DORMANT: {
    key: "DORMANT",
    label: "Dormant adapter",
    mode: "READONLY",
    capabilities: {
      createCharge: false,
      createPayout: false,
      webhook: false,
      reconcile: false,
    },
  },
};

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function upper(value, fallback = "") {
  const v = String(value || fallback).trim().toUpperCase();
  return v || fallback;
}

function clampPaymentMode(value) {
  const v = upper(value, "OFF");
  return PAYMENT_MODES.includes(v) ? v : "OFF";
}

function normalizeCommissionBps(value) {
  return Math.max(0, Math.min(10000, toInt(value, 0)));
}

function normalizeTake(value, fallback = 20, max = 100) {
  return Math.min(max, Math.max(1, Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback));
}

function normalizeSourceIds(sourceIds = []) {
  const input = Array.isArray(sourceIds) ? sourceIds : [sourceIds];
  const ids = input.map((item) => Number(item || 0)).filter((item) => item > 0);
  return Array.from(new Set(ids));
}

function nextOptionalPilotSettlementStatus(enabled) {
  return enabled ? "READY" : "DORMANT";
}

function nextOptionalPilotEntryStatus(enabled) {
  return enabled ? "READY" : "DORMANT";
}

function nextRequiredRolloutSettlementStatus(enabled) {
  return enabled ? "ACTIVE" : "DISABLED";
}

function nextRequiredRolloutEntryStatus(enabled) {
  return enabled ? "READY" : "CANCELLED";
}

function entryStatusFromPlanStatus(status) {
  const v = upper(status, "DORMANT");
  if (v === "ACTIVE") return "READY";
  if (v === "DISABLED") return "CANCELLED";
  return "DORMANT";
}

function commissionFromAmount(amount, bps) {
  const gross = Math.max(0, toInt(amount, 0));
  const rate = Math.max(0, toInt(bps, 0));
  return Math.round((gross * rate) / 10000);
}

async function resolveActiveCommercialConfig(tx, { roomId } = {}) {
  const scopedRoomId = Number(roomId || 0);
  if (scopedRoomId > 0) {
    const roomRule = await tx.commissionRule.findFirst({
      where: { roomId: scopedRoomId, isActive: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
    if (roomRule) {
      return {
        paymentMode: clampPaymentMode(roomRule.paymentMode),
        commissionBps: Math.max(0, toInt(roomRule.commissionBps, 0)),
        scopeType: "ROOM",
        roomId: scopedRoomId,
        ruleId: roomRule.id,
      };
    }
  }

  const globalRule = await tx.commissionRule.findFirst({
    where: { scopeType: "GLOBAL", isActive: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  if (globalRule) {
    return {
      paymentMode: clampPaymentMode(globalRule.paymentMode),
      commissionBps: Math.max(0, toInt(globalRule.commissionBps, 0)),
      scopeType: "GLOBAL",
      roomId: null,
      ruleId: globalRule.id,
    };
  }

  return {
    paymentMode: "OFF",
    commissionBps: 0,
    scopeType: "SYSTEM_DEFAULT",
    roomId: scopedRoomId > 0 ? scopedRoomId : null,
    ruleId: null,
  };
}

function toCommercialSourceSummary(source, plan = null) {
  return {
    id: source.id,
    sourceType: source.sourceType,
    sourceKey: source.sourceKey,
    agreementId: source.agreementId ?? null,
    shiftRootId: source.shiftRootId ?? null,
    shiftGroupKey: source.shiftGroupKey ?? null,
    companyId: source.companyId,
    companyName: source.company?.name || null,
    roomId: source.roomId ?? null,
    roomName: source.room?.name || null,
    paymentModeSnapshot: clampPaymentMode(source.paymentModeSnapshot),
    commissionBpsSnapshot: Math.max(0, toInt(source.commissionBpsSnapshot, 0)),
    amountCompanySnapshot: source.amountCompanySnapshot ?? null,
    amountProviderSnapshot: source.amountProviderSnapshot ?? null,
    currencyCode: source.currencyCode || "TRY",
    providerAdapterKey: source.providerAdapterKey || "DORMANT",
    settlementStatus: source.settlementStatus || "DORMANT",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    settlementPlan: plan
      ? {
          id: plan.id,
          status: plan.status,
          paymentModeSnapshot: plan.paymentModeSnapshot,
          commissionBpsSnapshot: plan.commissionBpsSnapshot,
          grossAmount: plan.grossAmount,
          commissionAmount: plan.commissionAmount,
          providerNetAmount: plan.providerNetAmount,
          currencyCode: plan.currencyCode,
          providerAdapterKey: plan.providerAdapterKey,
        }
      : null,
  };
}

async function upsertCommercialSource(tx, payload) {
  const existing = await tx.commercialSource.findUnique({
    where: { sourceKey: payload.sourceKey },
    include: { settlementPlans: { orderBy: { id: "asc" }, include: { entries: true } } },
  });

  const paymentModeSnapshot = existing?.paymentModeSnapshot || payload.paymentModeSnapshot;
  const commissionBpsSnapshot = existing?.commissionBpsSnapshot ?? payload.commissionBpsSnapshot;
  const sourceData = {
    sourceType: payload.sourceType,
    sourceKey: payload.sourceKey,
    agreementId: payload.agreementId ?? null,
    shiftRootId: payload.shiftRootId ?? null,
    shiftGroupKey: payload.shiftGroupKey ?? null,
    companyId: payload.companyId,
    roomId: payload.roomId ?? null,
    paymentModeSnapshot,
    commissionBpsSnapshot,
    amountCompanySnapshot: payload.amountCompanySnapshot ?? null,
    amountProviderSnapshot: payload.amountProviderSnapshot ?? null,
    currencyCode: payload.currencyCode || "TRY",
    providerAdapterKey: payload.providerAdapterKey || "DORMANT",
    settlementStatus: payload.settlementStatus || "DORMANT",
  };

  const source = existing
    ? await tx.commercialSource.update({ where: { id: existing.id }, data: sourceData })
    : await tx.commercialSource.create({ data: sourceData });

  const grossAmount = Math.max(0, toInt(payload.amountCompanySnapshot ?? payload.amountProviderSnapshot ?? 0, 0));
  const commissionAmount = commissionFromAmount(grossAmount, commissionBpsSnapshot);
  const explicitProviderAmount = Math.max(0, toInt(payload.amountProviderSnapshot ?? 0, 0));
  const providerNetAmount = explicitProviderAmount > 0 ? explicitProviderAmount : Math.max(0, grossAmount - commissionAmount);

  const currentPlan = existing?.settlementPlans?.[0] || null;
  const planData = {
    status: payload.settlementStatus || "DORMANT",
    paymentModeSnapshot,
    commissionBpsSnapshot,
    providerAdapterKey: payload.providerAdapterKey || "DORMANT",
    grossAmount,
    commissionAmount,
    providerNetAmount,
    currencyCode: payload.currencyCode || "TRY",
  };

  const plan = currentPlan
    ? await tx.settlementPlan.update({ where: { id: currentPlan.id }, data: planData })
    : await tx.settlementPlan.create({ data: { commercialSourceId: source.id, ...planData } });

  const existingEntries = currentPlan?.entries || [];
  const entryMap = new Map(existingEntries.map((entry) => [String(entry.kind), entry]));
  const entries = [
    { kind: "COMPANY_CHARGE", amount: grossAmount, note: "Dormant company-side charge preview" },
    { kind: "PLATFORM_COMMISSION", amount: commissionAmount, note: "Dormant platform commission preview" },
    { kind: "PROVIDER_PAYOUT", amount: providerNetAmount, note: "Dormant provider payout preview" },
  ];
  for (const entry of entries) {
    const current = entryMap.get(entry.kind) || null;
    const data = {
      kind: entry.kind,
      status: entryStatusFromPlanStatus(planData.status),
      amount: entry.amount,
      currencyCode: payload.currencyCode || "TRY",
      note: entry.note,
      providerRef: null,
      dueAt: null,
    };
    if (current) {
      await tx.settlementEntry.update({ where: { id: current.id }, data });
    } else {
      await tx.settlementEntry.create({ data: { settlementPlanId: plan.id, ...data } });
    }
  }

  return toCommercialSourceSummary(source, plan);
}

export async function upsertAgreementCommercialBackbone(agreementId, options = {}) {
  const id = Number(agreementId || 0);
  if (id <= 0) return null;
  const txClient = options.tx || prisma;
  const run = async (tx) => {
    const agreement = await tx.agreement.findUnique({ where: { id } });
    if (!agreement) return null;

    const config = await resolveActiveCommercialConfig(tx, { roomId: agreement.roomId });
    const companyAmount = agreement.companyOfferAmount != null ? toInt(agreement.companyOfferAmount, 0) : null;
    const providerAmount = agreement.roomOfferAmount != null
      ? toInt(agreement.roomOfferAmount, 0)
      : companyAmount;

    return upsertCommercialSource(tx, {
      sourceType: "AGREEMENT",
      sourceKey: `AGREEMENT:${agreement.id}`,
      agreementId: agreement.id,
      shiftRootId: null,
      shiftGroupKey: null,
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      paymentModeSnapshot: config.paymentMode,
      commissionBpsSnapshot: config.commissionBps,
      amountCompanySnapshot: companyAmount,
      amountProviderSnapshot: providerAmount,
      currencyCode: "TRY",
      providerAdapterKey: "DORMANT",
      settlementStatus: "DORMANT",
    });
  };
  return options.tx ? run(txClient) : txClient.$transaction(run);
}

export function buildShiftSeriesKey(shift) {
  const rootId = Number(shift?.splitRootId || shift?.id || 0);
  if (rootId > 0) return { rootId, sourceKey: `SHIFT_SERIES:ROOT:${rootId}` };
  const groupKey = String(shift?.splitGroupKey || "").trim();
  if (groupKey) return { rootId: Number(shift?.id || 0) || null, sourceKey: `SHIFT_SERIES:GROUP:${groupKey}` };
  const shiftId = Number(shift?.id || 0);
  if (shiftId > 0) return { rootId: shiftId, sourceKey: `SHIFT_SERIES:ROOT:${shiftId}` };
  return { rootId: null, sourceKey: null };
}

export async function upsertShiftSeriesCommercialBackboneByShiftId(shiftId, options = {}) {
  const id = Number(shiftId || 0);
  if (id <= 0) return null;
  const txClient = options.tx || prisma;
  const run = async (tx) => {
    const shift = await tx.shift.findUnique({ where: { id } });
    if (!shift) return null;
    if (Number(shift.agreementId || 0) > 0) return null;

    const identity = buildShiftSeriesKey(shift);
    const rootShiftId = Number(identity.rootId || 0);
    const sourceKey = identity.sourceKey;
    if (!sourceKey || rootShiftId <= 0) return null;

    const rootShift = rootShiftId === shift.id ? shift : await tx.shift.findUnique({ where: { id: rootShiftId } });
    if (!rootShift) return null;

    const config = await resolveActiveCommercialConfig(tx, { roomId: rootShift.roomId });
    const companyAmount = rootShift.companyOfferAmount != null ? toInt(rootShift.companyOfferAmount, 0) : null;
    const providerAmount = rootShift.roomOfferAmount != null
      ? toInt(rootShift.roomOfferAmount, 0)
      : companyAmount;

    return upsertCommercialSource(tx, {
      sourceType: "SHIFT_SERIES",
      sourceKey,
      agreementId: null,
      shiftRootId: rootShift.id,
      shiftGroupKey: rootShift.splitGroupKey || shift.splitGroupKey || null,
      companyId: rootShift.companyId,
      roomId: rootShift.roomId,
      paymentModeSnapshot: config.paymentMode,
      commissionBpsSnapshot: config.commissionBps,
      amountCompanySnapshot: companyAmount,
      amountProviderSnapshot: providerAmount,
      currencyCode: "TRY",
      providerAdapterKey: "DORMANT",
      settlementStatus: "DORMANT",
    });
  };
  return options.tx ? run(txClient) : txClient.$transaction(run);
}



async function listCommercialSourcesByWhere(where = {}) {
  const rows = await prisma.commercialSource.findMany({
    where,
    include: { settlementPlans: { orderBy: { id: "asc" } } },
  })
  return rows.map((row) => toCommercialSourceSummary(row, row.settlementPlans?.[0] || null))
}

export async function buildAgreementCommercialBackboneMap(agreementIds = []) {
  const ids = Array.from(new Set((agreementIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)))
  if (!ids.length) return {}
  const items = await listCommercialSourcesByWhere({
    sourceType: "AGREEMENT",
    agreementId: { in: ids },
  })
  const map = {}
  for (const item of items) {
    const id = Number(item.agreementId || 0)
    if (id > 0) map[id] = item
  }
  return map
}

export async function buildShiftCommercialBackboneMap(shifts = []) {
  const list = Array.isArray(shifts) ? shifts : []
  if (!list.length) return {}

  const agreementIds = []
  const sourceKeys = []
  const shiftIdsBySourceKey = new Map()

  for (const shift of list) {
    const agreementId = Number(shift?.agreementId || 0)
    const shiftId = Number(shift?.id || 0)
    if (agreementId > 0) {
      agreementIds.push(agreementId)
      continue
    }
    if (shiftId <= 0) continue
    const identity = buildShiftSeriesKey(shift)
    const sourceKey = String(identity?.sourceKey || "").trim()
    if (!sourceKey) continue
    sourceKeys.push(sourceKey)
    const arr = shiftIdsBySourceKey.get(sourceKey) || []
    arr.push(shiftId)
    shiftIdsBySourceKey.set(sourceKey, arr)
  }

  const out = {}
  const [agreementMap, seriesItems] = await Promise.all([
    buildAgreementCommercialBackboneMap(agreementIds),
    sourceKeys.length
      ? listCommercialSourcesByWhere({
          sourceType: "SHIFT_SERIES",
          sourceKey: { in: Array.from(new Set(sourceKeys)) },
        })
      : Promise.resolve([]),
  ])

  for (const shift of list) {
    const shiftId = Number(shift?.id || 0)
    if (shiftId <= 0) continue
    const agreementId = Number(shift?.agreementId || 0)
    if (agreementId > 0 && agreementMap[agreementId]) {
      out[shiftId] = agreementMap[agreementId]
    }
  }

  for (const item of seriesItems) {
    const ids = shiftIdsBySourceKey.get(String(item.sourceKey || "")) || []
    for (const shiftId of ids) out[shiftId] = item
  }

  return out
}

export async function listCommissionRules({ scopeType, roomId, take = 50 } = {}) {
  const where = {};
  const scope = upper(scopeType, "");
  if (scope === "GLOBAL" || scope === "ROOM") where.scopeType = scope;
  const scopedRoomId = Number(roomId || 0);
  if (scopedRoomId > 0) where.roomId = scopedRoomId;
  const rows = await prisma.commissionRule.findMany({
    where,
    include: { room: { select: { id: true, name: true } } },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    take: Math.min(200, Math.max(1, Number(take || 50))),
  });
  return rows.map((row) => ({
    id: row.id,
    scopeType: row.scopeType,
    roomId: row.roomId ?? null,
    roomName: row.room?.name || null,
    paymentMode: clampPaymentMode(row.paymentMode),
    commissionBps: normalizeCommissionBps(row.commissionBps),
    isActive: !!row.isActive,
    note: row.note || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function upsertGlobalCommissionRule({ paymentMode, commissionBps, note } = {}) {
  return prisma.$transaction(async (tx) => {
    await tx.commissionRule.updateMany({ where: { scopeType: "GLOBAL", isActive: true }, data: { isActive: false } });
    const created = await tx.commissionRule.create({
      data: {
        scopeType: "GLOBAL",
        roomId: null,
        paymentMode: clampPaymentMode(paymentMode),
        commissionBps: normalizeCommissionBps(commissionBps),
        isActive: true,
        note: String(note || "").trim() || null,
      },
      include: { room: { select: { id: true, name: true } } },
    });
    return {
      id: created.id,
      scopeType: created.scopeType,
      roomId: created.roomId ?? null,
      roomName: null,
      paymentMode: clampPaymentMode(created.paymentMode),
      commissionBps: normalizeCommissionBps(created.commissionBps),
      isActive: !!created.isActive,
      note: created.note || "",
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  });
}

export async function upsertRoomCommissionRule({ roomId, paymentMode, commissionBps, note } = {}) {
  const scopedRoomId = Number(roomId || 0);
  if (scopedRoomId <= 0) throw new Error("Geçerli roomId gerekli");
  return prisma.$transaction(async (tx) => {
    await tx.commissionRule.updateMany({ where: { roomId: scopedRoomId, isActive: true }, data: { isActive: false } });
    const created = await tx.commissionRule.create({
      data: {
        scopeType: "ROOM",
        roomId: scopedRoomId,
        paymentMode: clampPaymentMode(paymentMode),
        commissionBps: normalizeCommissionBps(commissionBps),
        isActive: true,
        note: String(note || "").trim() || null,
      },
      include: { room: { select: { id: true, name: true } } },
    });
    return {
      id: created.id,
      scopeType: created.scopeType,
      roomId: created.roomId ?? null,
      roomName: created.room?.name || null,
      paymentMode: clampPaymentMode(created.paymentMode),
      commissionBps: normalizeCommissionBps(created.commissionBps),
      isActive: !!created.isActive,
      note: created.note || "",
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  });
}

export async function disableRoomCommissionRule(roomId) {
  const scopedRoomId = Number(roomId || 0);
  if (scopedRoomId <= 0) throw new Error("Geçerli roomId gerekli");
  const result = await prisma.commissionRule.updateMany({
    where: { roomId: scopedRoomId, isActive: true },
    data: { isActive: false },
  });
  return { roomId: scopedRoomId, disabledCount: Number(result.count || 0) };
}

export async function buildPaymentBackboneSettings() {
  const [globalRule, roomRules, roomRuleCount] = await Promise.all([
    prisma.commissionRule.findFirst({
      where: { scopeType: "GLOBAL", isActive: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }),
    prisma.commissionRule.findMany({
      where: { scopeType: "ROOM", isActive: true },
      include: { room: { select: { id: true, name: true } } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 100,
    }),
    prisma.commissionRule.count({ where: { scopeType: "ROOM", isActive: true } }),
  ]);

  return {
    paymentModes: PAYMENT_MODES,
    globalRule: globalRule
      ? {
          id: globalRule.id,
          paymentMode: clampPaymentMode(globalRule.paymentMode),
          commissionBps: normalizeCommissionBps(globalRule.commissionBps),
          note: globalRule.note || "",
          updatedAt: globalRule.updatedAt,
        }
      : {
          id: null,
          paymentMode: "OFF",
          commissionBps: 0,
          note: "",
          updatedAt: null,
        },
    roomOverrides: roomRules.map((row) => ({
      id: row.id,
      roomId: row.roomId ?? null,
      roomName: row.room?.name || `Room #${row.roomId}`,
      paymentMode: clampPaymentMode(row.paymentMode),
      commissionBps: normalizeCommissionBps(row.commissionBps),
      note: row.note || "",
      updatedAt: row.updatedAt,
    })),
    roomOverrideCount: roomRuleCount,
    summary: "Super Admin payment mode ve komisyon ayarları dormant ticari omurgaya veri sağlar; gerçek charge/payout hala kapalıdır.",
  };
}

export async function buildPaymentBackboneStatus() {
  const [commissionRules, paymentAccounts, sources, settlementPlanCount, settlementPlanRows] = await Promise.all([
    prisma.commissionRule.count(),
    prisma.paymentAccount.count(),
    prisma.commercialSource.findMany({ orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.settlementPlan.count(),
    prisma.settlementPlan.findMany({
      select: { status: true, paymentModeSnapshot: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const rule = await resolveActiveCommercialConfig(prisma, {});
  const byType = {
    agreement: 0,
    shiftSeries: 0,
  };
  for (const item of sources) {
    if (String(item.sourceType) === "AGREEMENT") byType.agreement += 1;
    if (String(item.sourceType) === "SHIFT_SERIES") byType.shiftSeries += 1;
  }

  const optionalPilot = {
    candidateCount: 0,
    readyCount: 0,
    dormantCount: 0,
    requiredCount: 0,
    offCount: 0,
  };
  const requiredRollout = {
    candidateCount: 0,
    activeCount: 0,
    disabledCount: 0,
    waitingCount: 0,
  };
  for (const row of settlementPlanRows) {
    const mode = clampPaymentMode(row.paymentModeSnapshot);
    if (mode === "OPTIONAL") {
      optionalPilot.candidateCount += 1;
      if (String(row.status || "").toUpperCase() === "READY") optionalPilot.readyCount += 1;
      else optionalPilot.dormantCount += 1;
    } else if (mode === "REQUIRED") {
      optionalPilot.requiredCount += 1;
      requiredRollout.candidateCount += 1;
      const status = String(row.status || "DORMANT").toUpperCase();
      if (status === "ACTIVE") requiredRollout.activeCount += 1;
      else if (status === "DISABLED") requiredRollout.disabledCount += 1;
      else requiredRollout.waitingCount += 1;
    } else {
      optionalPilot.offCount += 1;
    }
  }

  return {
    activeMilestone: requiredRollout.activeCount > 0 ? "M86" : (optionalPilot.readyCount > 0 ? "M85" : "M82.9"),
    dormant: optionalPilot.readyCount <= 0,
    paymentModes: PAYMENT_MODES,
    providerAdapters: Object.values(providerAdapters),
    activeRule: {
      paymentMode: rule.paymentMode,
      commissionBps: rule.commissionBps,
      scopeType: rule.scopeType,
      roomId: rule.roomId ?? null,
      ruleId: rule.ruleId ?? null,
    },
    cards: {
      commissionRules,
      paymentAccounts,
      commercialSources: byType.agreement + byType.shiftSeries,
      agreementSources: byType.agreement,
      shiftSeriesSources: byType.shiftSeries,
      settlementPlans: settlementPlanCount,
      optionalPilotCandidates: optionalPilot.candidateCount,
      optionalPilotReady: optionalPilot.readyCount,
      requiredRolloutCandidates: requiredRollout.candidateCount,
      requiredRolloutActive: requiredRollout.activeCount,
    },
    optionalPilot,
    requiredRollout,
    recentSources: sources.map((item) => ({
      id: item.id,
      sourceType: item.sourceType,
      sourceKey: item.sourceKey,
      paymentModeSnapshot: item.paymentModeSnapshot,
      commissionBpsSnapshot: item.commissionBpsSnapshot,
      settlementStatus: item.settlementStatus,
      updatedAt: item.updatedAt,
    })),
    summary: requiredRollout.activeCount > 0
      ? "REQUIRED moddaki ticari kaynaklar aktif rollout kapsamina alindi; settlement planlari ACTIVE, entry satirlari READY durumunda izlenir. Gercek provider entegrasyonu hala DORMANT adapter uzerinden temsil edilir."
      : optionalPilot.readyCount > 0
      ? "Opsiyonel odeme pilotu secili ticari kaynaklarda READY durumuna alinabilir; gercek charge/payout hala zorunlu rollout degildir."
      : "Odeme/komisyon omurgasi feature-flagli ve dormant kuruldu. Gercek charge/payout acik degil; yalnizca snapshot ve settlement hazirlik kaydi uretilir.",
  };
}

export async function buildOptionalPaymentPilotStatus() {
  const [candidateRows, readyRows] = await Promise.all([
    prisma.settlementPlan.findMany({
      where: { paymentModeSnapshot: "OPTIONAL" },
      select: { id: true, status: true, commercialSourceId: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    prisma.commercialSource.findMany({
      where: { paymentModeSnapshot: "OPTIONAL", settlementStatus: "READY" },
      select: { id: true },
      take: 500,
    }),
  ]);

  const counts = { candidateCount: 0, readyCount: 0, dormantCount: 0, otherCount: 0 };
  for (const row of candidateRows) {
    counts.candidateCount += 1;
    const status = String(row.status || "DORMANT").toUpperCase();
    if (status === "READY") counts.readyCount += 1;
    else if (status === "DORMANT") counts.dormantCount += 1;
    else counts.otherCount += 1;
  }

  return {
    activeMilestone: "M85",
    adapterKey: "DORMANT",
    candidateCount: counts.candidateCount,
    readyCount: counts.readyCount,
    dormantCount: counts.dormantCount,
    otherCount: counts.otherCount,
    activeSourceIds: readyRows.map((row) => row.id),
    summary: counts.candidateCount
      ? "OPTIONAL moddaki ticari kaynaklar pilot secim listesinde gorunur; secilenler READY durumuna alinir, gercek tahsilat yine dormant kalir."
      : "OPTIONAL modda pilot adayi kaynak yok. Once global veya oda bazli payment mode'u OPTIONAL yap ve yeni ticari kaynak olustur.",
  };
}

export async function listOptionalPaymentPilotCandidates({ take = 20 } = {}) {
  const rows = await prisma.commercialSource.findMany({
    where: { paymentModeSnapshot: "OPTIONAL" },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: normalizeTake(take, 20, 100),
    include: {
      company: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      settlementPlans: { include: { entries: true }, orderBy: { id: "asc" } },
    },
  });
  return rows.map((row) => toCommercialSourceSummary(row, row.settlementPlans?.[0] || null));
}

async function setOptionalPaymentPilotEnabled(sourceIds = [], enabled = true) {
  const ids = normalizeSourceIds(sourceIds);
  if (!ids.length) return { changedCount: 0, items: [] };

  return prisma.$transaction(async (tx) => {
    const rows = await tx.commercialSource.findMany({
      where: { id: { in: ids }, paymentModeSnapshot: "OPTIONAL" },
      include: { settlementPlans: { include: { entries: true }, orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    });

    const items = [];
    for (const row of rows) {
      const nextStatus = nextOptionalPilotSettlementStatus(enabled);
      const source = await tx.commercialSource.update({
        where: { id: row.id },
        data: { settlementStatus: nextStatus },
        include: {
          company: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
        },
      });

      const plan = row.settlementPlans?.[0]
        ? await tx.settlementPlan.update({
            where: { id: row.settlementPlans[0].id },
            data: { status: nextStatus },
          })
        : null;

      for (const entry of row.settlementPlans?.[0]?.entries || []) {
        await tx.settlementEntry.update({
          where: { id: entry.id },
          data: { status: nextOptionalPilotEntryStatus(enabled) },
        });
      }

      items.push(toCommercialSourceSummary(source, plan));
    }

    return { changedCount: items.length, items };
  });
}

export async function activateOptionalPaymentPilot({ sourceIds } = {}) {
  return setOptionalPaymentPilotEnabled(sourceIds, true);
}

export async function deactivateOptionalPaymentPilot({ sourceIds } = {}) {
  return setOptionalPaymentPilotEnabled(sourceIds, false);
}


export async function buildRequiredPaymentRolloutStatus() {
  const rows = await prisma.settlementPlan.findMany({
    where: { paymentModeSnapshot: "REQUIRED" },
    select: { id: true, status: true, commercialSourceId: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const counts = { candidateCount: 0, activeCount: 0, disabledCount: 0, waitingCount: 0 };
  for (const row of rows) {
    counts.candidateCount += 1;
    const status = String(row.status || "DORMANT").toUpperCase();
    if (status === "ACTIVE") counts.activeCount += 1;
    else if (status === "DISABLED") counts.disabledCount += 1;
    else counts.waitingCount += 1;
  }

  return {
    activeMilestone: "M86",
    adapterKey: "DORMANT",
    candidateCount: counts.candidateCount,
    activeCount: counts.activeCount,
    disabledCount: counts.disabledCount,
    waitingCount: counts.waitingCount,
    summary: counts.candidateCount
      ? "REQUIRED moddaki ticari kaynaklar zorunlu rollout listesinde ACTIVE/DISABLED akisi ile yonetilir. Entry satirlari ACTIVE oldugunda READY olur; gercek provider entegrasyonu hala DORMANT adapter uzerinden temsil edilir."
      : "REQUIRED modda rollout adayi kaynak yok. Once global veya oda bazli payment mode'u REQUIRED yap ve yeni ticari kaynak olustur.",
  };
}

export async function listRequiredPaymentRolloutCandidates({ take = 20 } = {}) {
  const rows = await prisma.commercialSource.findMany({
    where: { paymentModeSnapshot: "REQUIRED" },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: normalizeTake(take, 20, 100),
    include: {
      company: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      settlementPlans: { include: { entries: true }, orderBy: { id: "asc" } },
    },
  });
  return rows.map((row) => toCommercialSourceSummary(row, row.settlementPlans?.[0] || null));
}

async function setRequiredPaymentRolloutEnabled(sourceIds = [], enabled = true) {
  const ids = normalizeSourceIds(sourceIds);
  if (!ids.length) return { changedCount: 0, items: [] };

  return prisma.$transaction(async (tx) => {
    const rows = await tx.commercialSource.findMany({
      where: { id: { in: ids }, paymentModeSnapshot: "REQUIRED" },
      include: { settlementPlans: { include: { entries: true }, orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    });

    const items = [];
    for (const row of rows) {
      const nextStatus = nextRequiredRolloutSettlementStatus(enabled);
      const source = await tx.commercialSource.update({
        where: { id: row.id },
        data: { settlementStatus: nextStatus },
        include: {
          company: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
        },
      });

      const plan = row.settlementPlans?.[0]
        ? await tx.settlementPlan.update({
            where: { id: row.settlementPlans[0].id },
            data: { status: nextStatus },
          })
        : null;

      for (const entry of row.settlementPlans?.[0]?.entries || []) {
        await tx.settlementEntry.update({
          where: { id: entry.id },
          data: { status: nextRequiredRolloutEntryStatus(enabled) },
        });
      }

      items.push(toCommercialSourceSummary(source, plan));
    }

    return { changedCount: items.length, items };
  });
}

export async function activateRequiredPaymentRollout({ sourceIds } = {}) {
  return setRequiredPaymentRolloutEnabled(sourceIds, true);
}

export async function deactivateRequiredPaymentRollout({ sourceIds } = {}) {
  return setRequiredPaymentRolloutEnabled(sourceIds, false);
}

function isPaymentAccountReadyStatus(status) {
  const v = upper(status, "INACTIVE");
  return v === "ACTIVE" || v === "VERIFIED";
}

function toPaymentAccountSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerType: row.ownerType,
    companyId: row.companyId ?? null,
    roomId: row.roomId ?? null,
    providerKey: row.providerKey || "DORMANT",
    status: row.status || "INACTIVE",
    label: row.label || "",
    maskedIban: row.maskedIban || "",
    accountRef: row.accountRef || "",
    note: row?.metaJson?.note || "",
    updatedAt: row.updatedAt,
  };
}

function paymentModePriority(mode) {
  const v = clampPaymentMode(mode);
  if (v === "REQUIRED") return 3;
  if (v === "OPTIONAL") return 2;
  return 1;
}

function settlementPriority(status) {
  const v = upper(status, "DORMANT");
  if (v === "ACTIVE") return 4;
  if (v === "READY") return 3;
  if (v === "DISABLED") return 2;
  return 1;
}

export async function buildPaymentAccountReadinessStatus() {
  const [accounts, sources] = await Promise.all([
    prisma.paymentAccount.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 500 }),
    prisma.commercialSource.findMany({
      where: { paymentModeSnapshot: { in: ["OPTIONAL", "REQUIRED"] } },
      select: { companyId: true, roomId: true },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    }),
  ]);

  const companyIds = Array.from(new Set(sources.map((row) => Number(row.companyId || 0)).filter((id) => id > 0)));
  const roomIds = Array.from(new Set(sources.map((row) => Number(row.roomId || 0)).filter((id) => id > 0)));

  const companyAccounts = new Map();
  const roomAccounts = new Map();
  const platformAccounts = [];
  for (const row of accounts) {
    const item = toPaymentAccountSummary(row);
    if (row.ownerType === "COMPANY" && Number(row.companyId || 0) > 0 && !companyAccounts.has(Number(row.companyId))) {
      companyAccounts.set(Number(row.companyId), item);
    } else if (row.ownerType === "ROOM" && Number(row.roomId || 0) > 0 && !roomAccounts.has(Number(row.roomId))) {
      roomAccounts.set(Number(row.roomId), item);
    } else if (row.ownerType === "PLATFORM") {
      platformAccounts.push(item);
    }
  }

  let companyReadyCount = 0;
  let companyMissingCount = 0;
  let companyErrorCount = 0;
  for (const id of companyIds) {
    const item = companyAccounts.get(id);
    if (!item) companyMissingCount += 1;
    else if (upper(item.status, "INACTIVE") === "ERROR") companyErrorCount += 1;
    else if (isPaymentAccountReadyStatus(item.status)) companyReadyCount += 1;
  }

  let roomReadyCount = 0;
  let roomMissingCount = 0;
  let roomErrorCount = 0;
  for (const id of roomIds) {
    const item = roomAccounts.get(id);
    if (!item) roomMissingCount += 1;
    else if (upper(item.status, "INACTIVE") === "ERROR") roomErrorCount += 1;
    else if (isPaymentAccountReadyStatus(item.status)) roomReadyCount += 1;
  }

  return {
    activeMilestone: "M87",
    providerAdapters: Object.values(providerAdapters),
    platformAccountCount: platformAccounts.length,
    companyCandidateCount: companyIds.length,
    roomCandidateCount: roomIds.length,
    companyReadyCount,
    roomReadyCount,
    companyMissingCount,
    roomMissingCount,
    companyErrorCount,
    roomErrorCount,
    summary: companyIds.length || roomIds.length
      ? "OPTIONAL/REQUIRED ticari kaynaklarda kullanilacak sirket ve oda odeme hesaplari Super Admin tarafindan hazirlik durumuyla izlenir. Bu faz hesap metadata ve readiness omurgasidir; gercek provider charge/payout hala ayri fazdadir."
      : "Odeme hesabi hazirlik ozeti icin once OPTIONAL veya REQUIRED modda ticari kaynak olusmasi gerekir.",
  };
}

export async function listPaymentAccountReadinessCandidates({ take = 30 } = {}) {
  const rows = await prisma.commercialSource.findMany({
    where: { paymentModeSnapshot: { in: ["OPTIONAL", "REQUIRED"] } },
    include: {
      company: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      settlementPlans: { orderBy: { id: "asc" }, take: 1, include: { entries: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 1000,
  });

  const companyIds = Array.from(new Set(rows.map((row) => Number(row.companyId || 0)).filter((id) => id > 0)));
  const roomIds = Array.from(new Set(rows.map((row) => Number(row.roomId || 0)).filter((id) => id > 0)));
  const accountWhere = (companyIds.length || roomIds.length)
    ? {
        OR: [
          ...(companyIds.length ? [{ companyId: { in: companyIds } }] : []),
          ...(roomIds.length ? [{ roomId: { in: roomIds } }] : []),
        ],
      }
    : null;
  const accounts = accountWhere
    ? await prisma.paymentAccount.findMany({ where: accountWhere, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] })
    : [];

  const companyAccounts = new Map();
  const roomAccounts = new Map();
  for (const row of accounts) {
    const item = toPaymentAccountSummary(row);
    if (row.ownerType === "COMPANY" && Number(row.companyId || 0) > 0 && !companyAccounts.has(Number(row.companyId))) {
      companyAccounts.set(Number(row.companyId), item);
    } else if (row.ownerType === "ROOM" && Number(row.roomId || 0) > 0 && !roomAccounts.has(Number(row.roomId))) {
      roomAccounts.set(Number(row.roomId), item);
    }
  }

  const items = new Map();
  function pushCandidate(ownerType, ownerId, payload) {
    if (Number(ownerId || 0) <= 0) return;
    const key = `${ownerType}:${ownerId}`;
    const current = items.get(key);
    const next = {
      key,
      ownerType,
      ownerId: Number(ownerId),
      ownerName: payload.ownerName || `${ownerType} #${ownerId}`,
      companyId: payload.companyId ?? null,
      roomId: payload.roomId ?? null,
      paymentModeHint: payload.paymentModeHint || "OFF",
      settlementStatusHint: payload.settlementStatusHint || "DORMANT",
      sourceKey: payload.sourceKey || "-",
      sourceType: payload.sourceType || "-",
      companyName: payload.companyName || null,
      roomName: payload.roomName || null,
      updatedAt: payload.updatedAt || null,
    };
    if (!current) {
      items.set(key, next);
      return;
    }
    if (paymentModePriority(next.paymentModeHint) > paymentModePriority(current.paymentModeHint)) current.paymentModeHint = next.paymentModeHint;
    if (settlementPriority(next.settlementStatusHint) > settlementPriority(current.settlementStatusHint)) {
      current.settlementStatusHint = next.settlementStatusHint;
      current.sourceKey = next.sourceKey;
      current.sourceType = next.sourceType;
    }
    if (String(next.updatedAt || "") > String(current.updatedAt || "")) current.updatedAt = next.updatedAt;
    if (!current.companyName && next.companyName) current.companyName = next.companyName;
    if (!current.roomName && next.roomName) current.roomName = next.roomName;
  }

  for (const row of rows) {
    pushCandidate("COMPANY", row.companyId, {
      ownerName: row.company?.name || `Şirket #${row.companyId}`,
      companyId: row.companyId,
      roomId: row.roomId ?? null,
      companyName: row.company?.name || null,
      roomName: row.room?.name || null,
      paymentModeHint: row.paymentModeSnapshot,
      settlementStatusHint: row.settlementStatus,
      sourceKey: row.sourceKey,
      sourceType: row.sourceType,
      updatedAt: row.updatedAt,
    });
    if (Number(row.roomId || 0) > 0) {
      pushCandidate("ROOM", row.roomId, {
        ownerName: row.room?.name || `Oda #${row.roomId}`,
        companyId: row.companyId,
        roomId: row.roomId,
        companyName: row.company?.name || null,
        roomName: row.room?.name || null,
        paymentModeHint: row.paymentModeSnapshot,
        settlementStatusHint: row.settlementStatus,
        sourceKey: row.sourceKey,
        sourceType: row.sourceType,
        updatedAt: row.updatedAt,
      });
    }
  }

  return Array.from(items.values())
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, normalizeTake(take, 30, 100))
    .map((item) => {
      const account = item.ownerType === "COMPANY" ? companyAccounts.get(item.ownerId) : roomAccounts.get(item.ownerId);
      const accountStatus = upper(account?.status, "MISSING");
      return {
        ...item,
        account,
        accountStatus,
        accountReady: isPaymentAccountReadyStatus(accountStatus),
      };
    });
}

export async function upsertPaymentAccountMetadata(payload = {}) {
  const ownerType = upper(payload.ownerType, "COMPANY");
  if (!["PLATFORM", "COMPANY", "ROOM"].includes(ownerType)) {
    const error = new Error("INVALID_PAYMENT_ACCOUNT_OWNER_TYPE");
    error.status = 400;
    throw error;
  }

  const companyId = ownerType === "COMPANY" ? Number(payload.companyId || 0) : null;
  const roomId = ownerType === "ROOM" ? Number(payload.roomId || 0) : null;
  if (ownerType === "COMPANY" && companyId <= 0) {
    const error = new Error("INVALID_COMPANY_ID");
    error.status = 400;
    throw error;
  }
  if (ownerType === "ROOM" && roomId <= 0) {
    const error = new Error("INVALID_ROOM_ID");
    error.status = 400;
    throw error;
  }

  const providerKey = String(payload.providerKey || "DORMANT").trim().toUpperCase() || "DORMANT";
  const status = upper(payload.status, "INACTIVE");
  const allowedStatuses = ["INACTIVE", "ACTIVE", "VERIFIED", "ERROR"];
  if (!allowedStatuses.includes(status)) {
    const error = new Error("INVALID_PAYMENT_ACCOUNT_STATUS");
    error.status = 400;
    throw error;
  }

  const where = ownerType === "COMPANY"
    ? { ownerType: "COMPANY", companyId }
    : ownerType === "ROOM"
    ? { ownerType: "ROOM", roomId }
    : { ownerType: "PLATFORM" };

  const existing = await prisma.paymentAccount.findFirst({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] });
  const data = {
    ownerType,
    companyId,
    roomId,
    providerKey,
    status,
    label: String(payload.label || "").trim() || null,
    maskedIban: String(payload.maskedIban || "").trim() || null,
    accountRef: String(payload.accountRef || "").trim() || null,
    metaJson: String(payload.note || "").trim() ? { note: String(payload.note || "").trim() } : null,
  };
  const row = existing
    ? await prisma.paymentAccount.update({ where: { id: existing.id }, data })
    : await prisma.paymentAccount.create({ data });
  return toPaymentAccountSummary(row);
}



function settlementQueueStatusPriority(status) {
  const v = upper(status, "DORMANT");
  if (v === "PLANNED") return 4;
  if (v === "READY") return 3;
  if (v === "EXECUTED") return 2;
  return 1;
}

function parseMaybeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toSettlementQueueItem(row, companyAccounts = new Map(), roomAccounts = new Map()) {
  const source = row?.settlementPlan?.commercialSource || null;
  const companyId = Number(source?.companyId || 0) || null;
  const roomId = Number(source?.roomId || 0) || null;
  const companyAccount = companyId ? companyAccounts.get(companyId) || null : null;
  const roomAccount = roomId ? roomAccounts.get(roomId) || null : null;
  const companyAccountReady = companyId ? isPaymentAccountReadyStatus(companyAccount?.status) : false;
  const roomAccountReady = roomId ? isPaymentAccountReadyStatus(roomAccount?.status) : true;
  return {
    entryId: row.id,
    settlementPlanId: row.settlementPlanId,
    commercialSourceId: source?.id || null,
    sourceType: source?.sourceType || "-",
    sourceKey: source?.sourceKey || "-",
    companyId,
    companyName: source?.company?.name || null,
    roomId,
    roomName: source?.room?.name || null,
    paymentModeSnapshot: clampPaymentMode(source?.paymentModeSnapshot || row?.settlementPlan?.paymentModeSnapshot || "OFF"),
    settlementPlanStatus: row?.settlementPlan?.status || "DORMANT",
    entryKind: row.kind,
    entryStatus: row.status,
    amount: Math.max(0, toInt(row.amount, 0)),
    currencyCode: row.currencyCode || "TRY",
    dueAt: row.dueAt || null,
    providerRef: row.providerRef || "",
    note: row.note || "",
    providerAdapterKey: row?.settlementPlan?.providerAdapterKey || source?.providerAdapterKey || "DORMANT",
    updatedAt: row.updatedAt,
    companyAccount,
    roomAccount,
    companyAccountReady,
    roomAccountReady,
    financeReady: !!companyAccountReady && !!roomAccountReady,
  };
}

export async function listSettlementOperationQueue({ take = 30 } = {}) {
  const rows = await prisma.settlementEntry.findMany({
    where: { status: { in: ["READY", "PLANNED", "EXECUTED"] } },
    include: {
      settlementPlan: {
        include: {
          commercialSource: {
            include: {
              company: { select: { id: true, name: true } },
              room: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: normalizeTake(take, 30, 200),
  });

  const companyIds = Array.from(new Set(rows.map((row) => Number(row?.settlementPlan?.commercialSource?.companyId || 0)).filter((id) => id > 0)));
  const roomIds = Array.from(new Set(rows.map((row) => Number(row?.settlementPlan?.commercialSource?.roomId || 0)).filter((id) => id > 0)));
  const accounts = (companyIds.length || roomIds.length)
    ? await prisma.paymentAccount.findMany({
        where: {
          OR: [
            ...(companyIds.length ? [{ companyId: { in: companyIds } }] : []),
            ...(roomIds.length ? [{ roomId: { in: roomIds } }] : []),
          ],
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      })
    : [];

  const companyAccounts = new Map();
  const roomAccounts = new Map();
  for (const row of accounts) {
    const item = toPaymentAccountSummary(row);
    if (row.ownerType === "COMPANY" && Number(row.companyId || 0) > 0 && !companyAccounts.has(Number(row.companyId))) {
      companyAccounts.set(Number(row.companyId), item);
    } else if (row.ownerType === "ROOM" && Number(row.roomId || 0) > 0 && !roomAccounts.has(Number(row.roomId))) {
      roomAccounts.set(Number(row.roomId), item);
    }
  }

  return rows
    .map((row) => toSettlementQueueItem(row, companyAccounts, roomAccounts))
    .sort((a, b) => {
      const diff = settlementQueueStatusPriority(b.entryStatus) - settlementQueueStatusPriority(a.entryStatus);
      if (diff) return diff;
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
}

export async function buildSettlementOperationsStatus() {
  const items = await listSettlementOperationQueue({ take: 200 });
  const out = {
    activeMilestone: "M88",
    candidateCount: items.length,
    readyCount: 0,
    plannedCount: 0,
    executedCount: 0,
    blockedCount: 0,
    financeReadyCount: 0,
  };
  for (const item of items) {
    const status = upper(item.entryStatus, "DORMANT");
    if (status === "READY") out.readyCount += 1;
    else if (status === "PLANNED") out.plannedCount += 1;
    else if (status === "EXECUTED") out.executedCount += 1;
    if (item.financeReady) out.financeReadyCount += 1;
    else out.blockedCount += 1;
  }
  return {
    ...out,
    summary: out.candidateCount
      ? "Settlement operasyon kuyruğu READY/PLANNED/EXECUTED entry satırlarını Super Admin yüzeyinde görünür kılar. Finans hazır değilse satır bloklu görünür; bu faz gerçek provider entegrasyonundan önce manuel operasyon omurgasıdır."
      : "Settlement operasyon kuyruğunda görünür satır yok. OPTIONAL/REQUIRED ticari kaynak üret ve gerekli rollout/pilot adımlarını aç.",
  };
}

async function setSettlementEntriesState(entryIds = [], targetStatus, options = {}) {
  const ids = normalizeSourceIds(entryIds);
  if (!ids.length) return { changedCount: 0, items: [] };
  const nextStatus = upper(targetStatus, "READY");
  if (!["PLANNED", "EXECUTED", "CANCELLED", "READY"].includes(nextStatus)) {
    const error = new Error("INVALID_SETTLEMENT_ENTRY_STATUS");
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.settlementEntry.findMany({
      where: { id: { in: ids } },
      include: {
        settlementPlan: {
          include: {
            commercialSource: {
              include: {
                company: { select: { id: true, name: true } },
                room: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const companyIds = Array.from(new Set(rows.map((row) => Number(row?.settlementPlan?.commercialSource?.companyId || 0)).filter((id) => id > 0)));
    const roomIds = Array.from(new Set(rows.map((row) => Number(row?.settlementPlan?.commercialSource?.roomId || 0)).filter((id) => id > 0)));
    const accounts = (companyIds.length || roomIds.length)
      ? await tx.paymentAccount.findMany({
          where: {
            OR: [
              ...(companyIds.length ? [{ companyId: { in: companyIds } }] : []),
              ...(roomIds.length ? [{ roomId: { in: roomIds } }] : []),
            ],
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        })
      : [];
    const companyAccounts = new Map();
    const roomAccounts = new Map();
    for (const row of accounts) {
      const item = toPaymentAccountSummary(row);
      if (row.ownerType === "COMPANY" && Number(row.companyId || 0) > 0 && !companyAccounts.has(Number(row.companyId))) companyAccounts.set(Number(row.companyId), item);
      if (row.ownerType === "ROOM" && Number(row.roomId || 0) > 0 && !roomAccounts.has(Number(row.roomId))) roomAccounts.set(Number(row.roomId), item);
    }

    const items = [];
    for (const row of rows) {
      const currentStatus = upper(row.status, "DORMANT");
      if (nextStatus === "PLANNED" && !["READY", "PLANNED"].includes(currentStatus)) continue;
      if (nextStatus === "EXECUTED" && !["READY", "PLANNED", "EXECUTED"].includes(currentStatus)) continue;
      if (nextStatus === "CANCELLED" && !["READY", "PLANNED", "CANCELLED"].includes(currentStatus)) continue;
      if (nextStatus === "READY" && !["PLANNED", "READY", "CANCELLED"].includes(currentStatus)) continue;

      const preview = toSettlementQueueItem(row, companyAccounts, roomAccounts);
      if ((nextStatus === "PLANNED" || nextStatus === "EXECUTED") && !preview.financeReady) {
        const error = new Error("SETTLEMENT_ENTRY_FINANCE_NOT_READY");
        error.status = 409;
        throw error;
      }

      const updateData = { status: nextStatus };
      if (nextStatus === "PLANNED") {
        if (Object.prototype.hasOwnProperty.call(options, "dueAt")) updateData.dueAt = parseMaybeDate(options.dueAt);
        if (Object.prototype.hasOwnProperty.call(options, "note")) updateData.note = String(options.note || "").trim() || null;
      } else if (nextStatus === "EXECUTED") {
        updateData.providerRef = String(options.providerRef || row.providerRef || `MANUAL:${row.id}`).trim();
        if (Object.prototype.hasOwnProperty.call(options, "note")) updateData.note = String(options.note || "").trim() || row.note || null;
      } else if (nextStatus === "CANCELLED") {
        if (Object.prototype.hasOwnProperty.call(options, "note")) updateData.note = String(options.note || "").trim() || row.note || null;
      } else if (nextStatus === "READY") {
        if (Object.prototype.hasOwnProperty.call(options, "dueAt")) updateData.dueAt = parseMaybeDate(options.dueAt);
        if (Object.prototype.hasOwnProperty.call(options, "note")) updateData.note = String(options.note || "").trim() || row.note || null;
      }

      const updated = await tx.settlementEntry.update({ where: { id: row.id }, data: updateData });
      items.push(toSettlementQueueItem({ ...row, ...updated }, companyAccounts, roomAccounts));
    }
    return { changedCount: items.length, items };
  });
}

export async function planSettlementEntries({ entryIds, dueAt, note } = {}) {
  return setSettlementEntriesState(entryIds, "PLANNED", { dueAt, note });
}

export async function executeSettlementEntries({ entryIds, providerRef, note } = {}) {
  return setSettlementEntriesState(entryIds, "EXECUTED", { providerRef, note });
}

export async function cancelSettlementEntries({ entryIds, note } = {}) {
  return setSettlementEntriesState(entryIds, "CANCELLED", { note });
}

export async function readySettlementEntries({ entryIds, dueAt, note } = {}) {
  return setSettlementEntriesState(entryIds, "READY", { dueAt, note });
}

export async function listCommercialSources({ type, take = 20 } = {}) {
  const where = {};
  const typeUp = upper(type, "");
  if (COMMERCIAL_SOURCE_TYPES.includes(typeUp)) where.sourceType = typeUp;
  const rows = await prisma.commercialSource.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: normalizeTake(take, 20, 100),
    include: {
      company: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      settlementPlans: { orderBy: { id: "asc" } },
    },
  });
  return rows.map((row) => toCommercialSourceSummary(row, row.settlementPlans?.[0] || null));
}
