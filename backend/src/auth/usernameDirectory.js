import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const STORE_DIR = path.resolve(MODULE_DIR, "../../data");
const STORE_PATH = path.join(STORE_DIR, "username-directory.json");
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

function ensureStore() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ version: 1, items: {} }, null, 2), "utf8");
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw || "{}");
    const items = parsed && typeof parsed === "object" && parsed.items && typeof parsed.items === "object" ? parsed.items : {};
    return { version: 1, items };
  } catch {
    return { version: 1, items: {} };
  }
}

function writeStore(store) {
  ensureStore();
  const safe = store && typeof store === "object" ? store : { version: 1, items: {} };
  if (!safe.items || typeof safe.items !== "object") safe.items = {};
  fs.writeFileSync(STORE_PATH, JSON.stringify({ version: 1, items: safe.items }, null, 2), "utf8");
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
  const store = readStore();
  return store.items[String(Number(userId || 0))] || null;
}

export function setStoredLogin({ userId, username, contactEmail = null }) {
  const id = Number(userId || 0);
  if (!id) throw new Error("userId gerekli");
  const safeUsername = validateUsernameOrThrow(username);
  const safeEmail = visibleEmail(contactEmail);
  const store = readStore();
  store.items[String(id)] = {
    username: safeUsername,
    contactEmail: safeEmail,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store.items[String(id)];
}

export function getEffectiveUsername(user, opts = {}) {
  const store = opts.store || readStore();
  const explicit = store.items?.[String(Number(user?.id || 0))]?.username;
  if (explicit) return normalizeUsername(explicit);
  const fallback = normalizeUsername(emailLocalPart(user?.email));
  if (fallback) return fallback;
  return `user_${Number(user?.id || 0)}`;
}

export function getUserLoginMeta(user, opts = {}) {
  const store = opts.store || readStore();
  const item = store.items?.[String(Number(user?.id || 0))] || {};
  return {
    username: getEffectiveUsername(user, { store }),
    email: item.contactEmail || visibleEmail(user?.email),
  };
}

export async function isUsernameTaken(prisma, rawUsername, excludeUserId = null) {
  const username = validateUsernameOrThrow(rawUsername);
  const store = readStore();
  const items = await prisma.user.findMany({ select: { id: true, email: true } });
  return items.some((user) => Number(user.id) !== Number(excludeUserId || 0) && getEffectiveUsername(user, { store }) === username);
}

export async function resolveUserIdByUsername(prisma, rawUsername) {
  const username = normalizeUsername(rawUsername);
  if (!username) return null;
  const store = readStore();
  const items = await prisma.user.findMany({ select: { id: true, email: true } });
  let found = null;
  for (const user of items) {
    if (getEffectiveUsername(user, { store }) !== username) continue;
    if (found && Number(found) != Number(user.id)) return null;
    found = Number(user.id);
  }
  return found;
}
