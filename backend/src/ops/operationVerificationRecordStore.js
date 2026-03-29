import { promises as fs } from "fs";
import path from "path";
import {
  OPERATION_VERIFICATION_PROOF_TYPES,
  OPERATION_VERIFICATION_ROLES,
  OPERATION_VERIFICATION_STATUSES,
} from "./operationVerificationManifest.js";

const STORE_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "operation-verification-records.json");

const ROLE_IDS = new Set(OPERATION_VERIFICATION_ROLES.map((item) => item.id));
const STATUS_IDS = new Set(OPERATION_VERIFICATION_STATUSES.map((item) => item.id));
const PROOF_IDS = new Set(OPERATION_VERIFICATION_PROOF_TYPES.map((item) => item.id));

async function ensureStore() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, "[]", "utf8");
  }
}

function cleanUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function cleanText(value, max = 400) {
  return String(value || "").trim().slice(0, max);
}

function normalizeRoleId(roleId) {
  const normalized = cleanUpper(roleId) || "SUPER_ADMIN";
  return ROLE_IDS.has(normalized) ? normalized : "SUPER_ADMIN";
}

function normalizeStatus(status) {
  const normalized = cleanUpper(status);
  return STATUS_IDS.has(normalized) ? normalized : "TEKRAR_KONTROL";
}

function normalizeProofType(proofType) {
  const normalized = cleanUpper(proofType);
  if (!normalized) return "";
  return PROOF_IDS.has(normalized) ? normalized : "";
}

export async function readOperationVerificationRecords() {
  await ensureStore();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeOperationVerificationRecords(items) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(Array.isArray(items) ? items : [], null, 2), "utf8");
}

function sortNewest(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')));
}

function applyFilters(items, options = {}) {
  const role = normalizeRoleId(options?.roleId || options?.role);
  const status = cleanUpper(options?.status);
  const proofType = cleanUpper(options?.proofType);
  const query = cleanText(options?.query, 120).toLowerCase();
  const savedOnly = options?.savedOnly === true || String(options?.savedOnly || '').trim() === '1' || String(options?.savedOnly || '').toLowerCase() === 'true';
  return sortNewest(items).filter((item) => {
    if (normalizeRoleId(item?.roleId) !== role) return false;
    if (status && status !== 'ALL' && cleanUpper(item?.status) !== status) return false;
    if (proofType && proofType !== 'ALL' && cleanUpper(item?.proofType) !== proofType) return false;
    if (savedOnly && !item?.updatedAt) return false;
    if (query) {
      const hay = `${item?.checkId || ''} ${item?.note || ''} ${item?.evidenceRef || ''} ${item?.updatedByEmail || ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export async function listOperationVerificationRecords(roleId, options = {}) {
  const items = await readOperationVerificationRecords();
  return applyFilters(items, { ...options, roleId });
}

export async function summarizeOperationVerificationRecords(roleId, options = {}) {
  const items = await listOperationVerificationRecords(roleId, options);
  const byStatus = { KABUL: 0, RED: 0, EKSIK: 0, TEKRAR_KONTROL: 0 };
  const byProofType = {};
  for (const item of items) {
    const s = cleanUpper(item?.status);
    if (byStatus[s] != null) byStatus[s] += 1;
    const p = cleanUpper(item?.proofType);
    if (p) byProofType[p] = (byProofType[p] || 0) + 1;
  }
  const latest = items[0] || null;
  return {
    roleId: normalizeRoleId(roleId),
    totalRecords: items.length,
    byStatus,
    byProofType,
    lastUpdatedAt: latest?.updatedAt || null,
    lastUpdatedByEmail: latest?.updatedByEmail || '',
    lastEvidenceRef: latest?.evidenceRef || '',
  };
}

export async function upsertOperationVerificationRecord(input, actor = null) {
  const roleId = normalizeRoleId(input?.roleId);
  const checkId = cleanText(input?.checkId, 120);
  if (!checkId) throw new Error("checkId required");

  const list = await readOperationVerificationRecords();
  const idx = list.findIndex((item) => normalizeRoleId(item?.roleId) === roleId && String(item?.checkId || "") === checkId);
  const now = new Date().toISOString();
  const next = {
    id: idx >= 0 ? list[idx].id : `${roleId}:${checkId}`,
    roleId,
    checkId,
    status: normalizeStatus(input?.status),
    proofType: normalizeProofType(input?.proofType),
    note: cleanText(input?.note, 800),
    evidenceRef: cleanText(input?.evidenceRef, 240),
    updatedByUserId: Number(actor?.id || 0) || null,
    updatedByEmail: cleanText(actor?.email, 160),
    createdAt: idx >= 0 ? list[idx].createdAt : now,
    updatedAt: now,
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  await writeOperationVerificationRecords(list);
  return next;
}
