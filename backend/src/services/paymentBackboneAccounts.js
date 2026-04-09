import prisma from "../prisma.js";

const providerAdapters = {
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
  return ["OFF", "OPTIONAL", "REQUIRED"].includes(v) ? v : "OFF";
}

function normalizeTake(value, fallback = 20, max = 100) {
  return Math.min(max, Math.max(1, Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback));
}

function normalizeSourceIds(sourceIds = []) {
  const input = Array.isArray(sourceIds) ? sourceIds : [sourceIds];
  const ids = input.map((item) => Number(item || 0)).filter((item) => item > 0);
  return Array.from(new Set(ids));
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

async function findRelevantAccounts(tx, companyIds = [], roomIds = []) {
  if (!(companyIds.length || roomIds.length)) return [];
  return tx.paymentAccount.findMany({
    where: {
      OR: [
        ...(companyIds.length ? [{ companyId: { in: companyIds } }] : []),
        ...(roomIds.length ? [{ roomId: { in: roomIds } }] : []),
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
}

function buildOwnerAccountMaps(accounts = []) {
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
  return { companyAccounts, roomAccounts };
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
  const { companyAccounts, roomAccounts } = buildOwnerAccountMaps(accounts);

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
    platformAccountCount: accounts.filter((row) => row.ownerType === "PLATFORM").length,
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
  const accounts = await findRelevantAccounts(prisma, companyIds, roomIds);
  const { companyAccounts, roomAccounts } = buildOwnerAccountMaps(accounts);

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
  const accounts = await findRelevantAccounts(prisma, companyIds, roomIds);
  const { companyAccounts, roomAccounts } = buildOwnerAccountMaps(accounts);

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
    const accounts = await findRelevantAccounts(tx, companyIds, roomIds);
    const { companyAccounts, roomAccounts } = buildOwnerAccountMaps(accounts);

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
