import { createJsonFileStore } from "../lib/jsonFileStore.js";

const store = createJsonFileStore("password-change-requirements.json", { defaultValue: [] });

async function readStore() {
  const parsed = await store.readAsync();
  return Array.isArray(parsed) ? parsed : [];
}

async function writeStore(items) {
  return store.writeAsync(Array.isArray(items) ? items : []);
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
  let saved = null;
  await store.updateAsync((current) => {
    const items = Array.isArray(current) ? current : [];
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
    saved = idx >= 0 ? items[idx] : next;
    return items;
  });
  return saved;
}

export async function clearPasswordChangeRequired(userId) {
  const id = Number(userId || 0);
  if (!id) return { ok: true, removed: false };
  let removed = false;
  await store.updateAsync((current) => {
    const items = Array.isArray(current) ? current : [];
    const next = items.filter((x) => Number(x?.userId || 0) !== id);
    removed = next.length !== items.length;
    return next;
  });
  return { ok: true, removed };
}
