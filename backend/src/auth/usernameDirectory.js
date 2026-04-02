import { createJsonFileStore } from "../lib/jsonFileStore.js";

const store = createJsonFileStore("username-directory.json", {
  defaultValue: () => ({ version: 1, items: {} }),
});
const INTERNAL_DOMAIN = "vardis.local";

const CHAR_MAP = {
  "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
  "Ç": "c", "Ğ": "g", "İ": "i", "I": "i", "Ö": "o", "Ş": "s", "Ü": "u",
};

function translit(value) {
  return String(value || "").split("").map((ch) => CHAR_MAP[ch] || ch).join("");
}

export function normalizeUsername(raw) {
  return translit(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/[_.]{2,}/g, (m) => m[0])
    .replace(/^[_.]+|[_.]+$/g, "");
}

export function validateUsernameOrThrow(raw) {
  const username = normalizeUsername(raw);
  if (!username || username.length < 4 || username.length > 24 || !/^[a-z0-9_.]+$/.test(username)) {
    throw new Error("Kullanıcı adı 4-24 karakter olmalı; yalnızca küçük harf, rakam, alt çizgi ve nokta kullanılabilir.");
  }
  return username;
}

export function isInternalLoginEmail(email) {
  return /@vardis\.local$/i.test(String(email || "").trim());
}

export function visibleEmail(email) {
  const clean = String(email || "").trim();
  if (!clean) return null;
  return isInternalLoginEmail(clean) ? null : clean;
}

function readStore() {
  const parsed = store.readSync();
  const items = parsed && typeof parsed === "object" && parsed.items && typeof parsed.items === "object" ? parsed.items : {};
  return { version: 1, items };
}

function writeStore(nextStore) {
  const safe = nextStore && typeof nextStore === "object" ? nextStore : { version: 1, items: {} };
  if (!safe.items || typeof safe.items !== "object") safe.items = {};
  store.writeSync({ version: 1, items: safe.items });
}

function emailLocalPart(email) {
  const clean = String(email || "").trim().toLowerCase();
  const idx = clean.indexOf("@");
  return idx >= 0 ? clean.slice(0, idx) : clean;
}

export function buildInternalLoginEmail(username) {
  const safe = validateUsernameOrThrow(username);
  const salt = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `u.${safe}.${salt}@${INTERNAL_DOMAIN}`;
}

export function getStoredLogin(userId) {
  const current = readStore();
  return current.items[String(Number(userId || 0))] || null;
}

export function setStoredLogin({ userId, username, contactEmail = null }) {
  const id = Number(userId || 0);
  if (!id) throw new Error("userId gerekli");
  const safeUsername = validateUsernameOrThrow(username);
  const safeEmail = visibleEmail(contactEmail);
  let saved = null;
  store.updateSync((current) => {
    const safeStore = current && typeof current === "object" ? current : { version: 1, items: {} };
    if (!safeStore.items || typeof safeStore.items !== "object") safeStore.items = {};
    safeStore.items[String(id)] = {
      username: safeUsername,
      contactEmail: safeEmail,
      updatedAt: new Date().toISOString(),
    };
    saved = safeStore.items[String(id)];
    return { version: 1, items: safeStore.items };
  });
  return saved;
}

export function getEffectiveUsername(user, opts = {}) {
  const current = opts.store || readStore();
  const explicit = current.items?.[String(Number(user?.id || 0))]?.username;
  if (explicit) return normalizeUsername(explicit);
  const fallback = normalizeUsername(emailLocalPart(user?.email));
  if (fallback) return fallback;
  return `user_${Number(user?.id || 0)}`;
}

export function getUserLoginMeta(user, opts = {}) {
  const current = opts.store || readStore();
  const item = current.items?.[String(Number(user?.id || 0))] || {};
  return {
    username: getEffectiveUsername(user, { store: current }),
    email: item.contactEmail || visibleEmail(user?.email),
  };
}

export async function isUsernameTaken(prisma, rawUsername, excludeUserId = null) {
  const username = validateUsernameOrThrow(rawUsername);
  const current = readStore();
  const items = await prisma.user.findMany({ select: { id: true, email: true } });
  return items.some((user) => Number(user.id) !== Number(excludeUserId || 0) && getEffectiveUsername(user, { store: current }) === username);
}

export async function resolveUserIdByUsername(prisma, rawUsername) {
  const username = normalizeUsername(rawUsername);
  if (!username) return null;
  const current = readStore();
  const items = await prisma.user.findMany({ select: { id: true, email: true } });
  let found = null;
  for (const user of items) {
    if (getEffectiveUsername(user, { store: current }) !== username) continue;
    if (found && Number(found) !== Number(user.id)) return null;
    found = Number(user.id);
  }
  return found;
}
