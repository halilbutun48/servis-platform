import { promises as fs } from "fs";
import path from "path";

const STORE_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "password-change-requirements.json");

async function ensureStore() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, "[]", "utf8");
  }
}

async function readStore() {
  await ensureStore();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(items) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(Array.isArray(items) ? items : [], null, 2), "utf8");
}

export async function getPasswordChangeRequirement(userId) {
  const id = Number(userId || 0);
  if (!id) return null;
  const items = await readStore();
  return items.find((x) => Number(x?.userId || 0) === id) || null;
}

export async function isPasswordChangeRequired(userId) {
  const item = await getPasswordChangeRequirement(userId);
  return !!item?.required;
}

export async function markPasswordChangeRequired(userId, meta = {}) {
  const id = Number(userId || 0);
  if (!id) throw new Error("userId required");
  const items = await readStore();
  const now = new Date().toISOString();
  const next = {
    userId: id,
    required: true,
    reason: String(meta?.reason || "ADMIN_RESET_PASSWORD").trim() || "ADMIN_RESET_PASSWORD",
    temporaryPassword: meta?.temporaryPassword === false ? false : true,
    updatedAt: now,
  };
  const idx = items.findIndex((x) => Number(x?.userId || 0) === id);
  if (idx >= 0) items[idx] = { ...items[idx], ...next };
  else items.push(next);
  await writeStore(items);
  return next;
}

export async function clearPasswordChangeRequired(userId) {
  const id = Number(userId || 0);
  if (!id) return { ok: true, removed: false };
  const items = await readStore();
  const next = items.filter((x) => Number(x?.userId || 0) !== id);
  if (next.length === items.length) return { ok: true, removed: false };
  await writeStore(next);
  return { ok: true, removed: true };
}
