import { createJsonFileStore } from "../lib/jsonFileStore.js";
import prisma from "../prisma.js";
import { listSettlementOperationQueue } from "../services/paymentBackbone.js";

const store = createJsonFileStore("settlement-reconciliation-records.json", { defaultValue: [] });

export const SETTLEMENT_RECONCILIATION_STATUSES = [
  { id: "BEKLIYOR", label: "Bekliyor", bucket: "OPEN" },
  { id: "ESLESTI", label: "Eşleşti", bucket: "MATCHED" },
  { id: "INCELEME_GEREKLI", label: "İnceleme gerekli", bucket: "REVIEW" },
  { id: "UYUSMAZLIK", label: "Uyuşmazlık", bucket: "MISMATCH" },
  { id: "KAPANDI", label: "Kapandı", bucket: "CLOSED" },
];

const STATUS_IDS = new Set(SETTLEMENT_RECONCILIATION_STATUSES.map((item) => item.id));

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function cleanUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeStatus(value, fallback = "BEKLIYOR") {
  const normalized = cleanUpper(value);
  if (!normalized) return fallback;
  return STATUS_IDS.has(normalized) ? normalized : fallback;
}

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function isPast(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export async function readSettlementReconciliationRecords() {
  const parsed = await store.readAsync();
  return Array.isArray(parsed) ? parsed : [];
}

function defaultStatusForItem(item) {
  const entryStatus = cleanUpper(item?.entryStatus || "");
  if (entryStatus === "EXECUTED" && cleanText(item?.providerRef, 120)) return "BEKLIYOR";
  if (entryStatus === "PLANNED" && isPast(item?.dueAt)) return "INCELEME_GEREKLI";
  return "BEKLIYOR";
}

function buildHistoryEntry(status, note, actor, at) {
  return {
    at,
    status,
    byUserId: Number(actor?.id || 0) || null,
    byEmail: cleanText(actor?.email, 160),
    note: cleanText(note, 400),
  };
}

function toQueueItem(item, record) {
  const currentRecord = record || null;
  const reconciliationStatus = normalizeStatus(currentRecord?.status, defaultStatusForItem(item));
  const providerRef = cleanText(currentRecord?.providerRef, 120) || cleanText(item?.providerRef, 120);
  const expectedAmount = toNumber(item?.amount);
  const receivedAmount = currentRecord?.receivedAmount == null || currentRecord?.receivedAmount === ""
    ? expectedAmount
    : toNumber(currentRecord?.receivedAmount);
  return {
    ...item,
    reconciliationStatus,
    reconciliationNote: cleanText(currentRecord?.note, 500),
    reconciliationExternalRef: cleanText(currentRecord?.externalRef, 120),
    reconciliationExpectedAmount: expectedAmount,
    reconciliationReceivedAmount: receivedAmount,
    reconciliationDeltaAmount: Number((receivedAmount - expectedAmount).toFixed(2)),
    reconciliationLastUpdatedAt: currentRecord?.updatedAt || null,
    reconciliationLastUpdatedByEmail: cleanText(currentRecord?.lastUpdatedByEmail, 160),
    reconciliationHistory: Array.isArray(currentRecord?.history) ? currentRecord.history : [],
    providerRef,
    overduePlanned: cleanUpper(item?.entryStatus || "") === "PLANNED" && isPast(item?.dueAt),
    missingProviderRef: cleanUpper(item?.entryStatus || "") === "EXECUTED" && !providerRef,
  };
}

export async function listSettlementReconciliationQueue({ take = 40 } = {}) {
  const items = await listSettlementOperationQueue({ take: Math.max(20, Math.min(Number(take || 40), 200)) });
  const records = await readSettlementReconciliationRecords();
  const recordMap = new Map();
  for (const row of records) {
    const entryId = Number(row?.entryId || 0);
    if (entryId > 0 && !recordMap.has(entryId)) recordMap.set(entryId, row);
  }
  return items
    .filter((item) => ["PLANNED", "EXECUTED"].includes(cleanUpper(item?.entryStatus || "")))
    .map((item) => toQueueItem(item, recordMap.get(Number(item?.entryId || 0))))
    .sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));
}

export async function buildSettlementReconciliationStatus() {
  const items = await listSettlementReconciliationQueue({ take: 200 });
  const out = {
    activeMilestone: "M89",
    candidateCount: items.length,
    pendingCount: 0,
    matchedCount: 0,
    reviewCount: 0,
    mismatchCount: 0,
    closedCount: 0,
    overduePlannedCount: 0,
    missingProviderRefCount: 0,
  };
  for (const item of items) {
    const status = normalizeStatus(item?.reconciliationStatus);
    if (status === "BEKLIYOR") out.pendingCount += 1;
    if (status === "ESLESTI") out.matchedCount += 1;
    if (status === "INCELEME_GEREKLI") out.reviewCount += 1;
    if (status === "UYUSMAZLIK") out.mismatchCount += 1;
    if (status === "KAPANDI") out.closedCount += 1;
    if (item?.overduePlanned) out.overduePlannedCount += 1;
    if (item?.missingProviderRef) out.missingProviderRefCount += 1;
  }
  return {
    ...out,
    summary: out.candidateCount
      ? "Mutabakat masası, planlanan veya tamamlanan kayıtlarda bekliyor-eşleşti-inceleme-uyuşmazlık-kapandı döngüsünü görünür kılar. Gerçek veri sağlayıcısı bildirimi olmadan manuel mutabakat izi tutar."
      : "Mutabakat kuyruğunda görünür satır yok. Önce mutabakat operasyon kuyruğunda planlanan veya tamamlanan bir kayıt oluştur.",
    statuses: SETTLEMENT_RECONCILIATION_STATUSES,
  };
}

export async function upsertSettlementReconciliationRecord(input, actor = null) {
  const entryId = Number(input?.entryId || 0);
  if (!(entryId > 0)) throw new Error("entryId required");

  const queue = await listSettlementOperationQueue({ take: 400 });
  const item = queue.find((row) => Number(row?.entryId || 0) === entryId);
  if (!item) {
    const error = new Error("SETTLEMENT_ENTRY_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  const nextStatus = normalizeStatus(input?.status, defaultStatusForItem(item));
  const note = cleanText(input?.note, 500);
  const providerRef = cleanText(input?.providerRef, 120);
  const externalRef = cleanText(input?.externalRef, 120);
  const expectedAmount = input?.expectedAmount == null || input?.expectedAmount === "" ? toNumber(item?.amount) : toNumber(input.expectedAmount);
  const receivedAmount = input?.receivedAmount == null || input?.receivedAmount === "" ? expectedAmount : toNumber(input.receivedAmount);

  let saved = null;
  await store.updateAsync((current) => {
    const list = Array.isArray(current) ? current : [];
    const idx = list.findIndex((row) => Number(row?.entryId || 0) === entryId);
    const prev = idx >= 0 ? list[idx] : null;
    const next = {
      id: prev?.id || `sr-${entryId}`,
      entryId,
      status: nextStatus,
      note,
      providerRef: providerRef || cleanText(prev?.providerRef, 120) || cleanText(item?.providerRef, 120),
      externalRef: externalRef || cleanText(prev?.externalRef, 120),
      expectedAmount,
      receivedAmount,
      createdAt: prev?.createdAt || now,
      createdByUserId: prev?.createdByUserId || Number(actor?.id || 0) || null,
      createdByEmail: prev?.createdByEmail || cleanText(actor?.email, 160),
      updatedAt: now,
      lastUpdatedByUserId: Number(actor?.id || 0) || prev?.lastUpdatedByUserId || null,
      lastUpdatedByEmail: cleanText(actor?.email, 160) || prev?.lastUpdatedByEmail || "",
      history: Array.isArray(prev?.history) ? [...prev.history] : [],
    };
    next.history.push(buildHistoryEntry(nextStatus, note || `${nextStatus} guncellendi`, actor, now));
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    saved = next;
    return list;
  });

  if (providerRef && cleanUpper(item?.entryStatus || "") === "EXECUTED") {
    await prisma.settlementEntry.update({ where: { id: entryId }, data: { providerRef } });
  }

  return saved;
}
