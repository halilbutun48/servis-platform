import { api } from "../api";

const cache = new Map();
const inflight = new Map();
const failures = new Map();
const queue = [];
let active = 0;
let cacheVersion = 0;
let nextNetworkAt = 0;
const DEFAULT_TTL_MS = 8000;
const FAILURE_TTL_MS = 2000;
const MAX_CONCURRENT = 1;
const AUTH_REQUEST_GAP_MS = 500;
const STORAGE_PREFIX = "ui-data-cache:v1:";
const FETCH_PATCH_FLAG = "__uiDataCacheFetchProxyInstalled__";

function requestPathFromInput(input) {
  const raw = typeof input === "string" ? input : input?.url || "";
  if (!raw) return "";
  try {
    return new URL(raw, globalThis.location?.href || "http://localhost").pathname;
  } catch {
    return raw;
  }
}

function isDriverRoutePath(path) {
  const p = String(path || "");
  return p === "/api/driver/route/active" || /^\/api\/driver\/shifts\/[^/]+\/route$/.test(p);
}

function ageSecondsFromIso(iso) {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.round((Date.now() - at) / 1000));
}

function driverRouteUiStatusFromPayload(payload) {
  const explicit = String(
    payload?.vehicle?.gpsState?.lastUiStatus ||
      payload?.last?.status ||
      payload?.last?.state ||
      payload?.vehicle?.gpsLast?.status ||
      payload?.vehicle?.gpsLast?.state ||
      "",
  ).trim().toUpperCase();

  if (explicit === "LIVE") return "LIVE";
  if (explicit === "OFFLINE") return "OFFLINE";
  if (explicit === "STALE") return "OFFLINE";

  const atIso =
    payload?.vehicle?.gpsLast?.at ||
    payload?.vehicle?.gpsLast?.ts ||
    payload?.last?.at ||
    payload?.last?.ts ||
    null;

  const ageSeconds = ageSecondsFromIso(atIso);
  if (ageSeconds == null) return null;
  if (ageSeconds >= 20) return "OFFLINE";
  return "LIVE";
}

function normalizeDriverRoutePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if (!payload.vehicle || typeof payload.vehicle !== "object") return payload;

  const status = driverRouteUiStatusFromPayload(payload);
  if (!status) return payload;

  const vehicle = { ...payload.vehicle };
  const gpsState = vehicle.gpsState && typeof vehicle.gpsState === "object" ? { ...vehicle.gpsState } : {};
  gpsState.lastUiStatus = status;
  vehicle.gpsState = gpsState;

  return { ...payload, vehicle };
}

if (typeof globalThis.fetch === "function" && !globalThis[FETCH_PATCH_FLAG]) {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const path = requestPathFromInput(args[0]);
    if (!isDriverRoutePath(path) || !response?.ok) return response;

    const contentType = String(response.headers?.get?.("content-type") || "");
    if (!contentType.includes("application/json")) return response;

    try {
      const payload = await response.clone().json();
      const normalized = normalizeDriverRoutePayload(payload);
      if (normalized === payload) return response;
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(JSON.stringify(normalized), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return response;
    }
  };
  globalThis[FETCH_PATCH_FLAG] = true;
}

function bumpCacheVersion() {
  cacheVersion += 1;
  return cacheVersion;
}

function decodeJwtClaims(token) {
  const t = String(token || "").trim();
  if (!t) return null;
  try {
    const parts = t.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const parsed = JSON.parse(globalThis.atob(padded));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeScopePart(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/[:\s|]/g, "_");
}

function tokenScope(token) {
  const t = String(token || "").trim();
  if (!t) return "anon";
  const claims = decodeJwtClaims(t) || {};
  const role = normalizeScopePart(claims.role || claims.roles || "", "role");
  const userId = normalizeScopePart(claims.userId || claims.uid || claims.sub || "", "user");
  const companyId = normalizeScopePart(claims.companyId || claims.company_id || claims.company || "", "company");
  const tenantId = normalizeScopePart(claims.tenantId || claims.tenant_id || claims.tenant || "", "tenant");
  const sv = normalizeScopePart(claims.sv || "", "sv");
  const tail = normalizeScopePart(t.slice(-12), "tail");
  return [role, userId, companyId, tenantId, sv, tail].join("|");
}

function keyOf(url, token) {
  return `${tokenScope(token)}:${String(url || "")}`;
}

function splitKey(key) {
  const idx = String(key || "").indexOf(":");
  if (idx < 0) return { scope: "", url: String(key || "") };
  return { scope: key.slice(0, idx), url: key.slice(idx + 1) };
}

function getStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

function readStoredRecord(key) {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (Number(parsed.expiresAt || 0) <= Date.now()) {
      storage.removeItem(storageKey(key));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredRecord(key, record) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey(key), JSON.stringify(record));
  } catch {
    // storage quota / serialisation issues are best-effort only
  }
}

function removeStoredRecord(key) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(storageKey(key));
  } catch {
    // best effort
  }
}

function serializeError(error) {
  return {
    name: String(error?.name || "Error"),
    message: String(error?.message || error || ""),
    status: Number(error?.status || 0) || 0,
    code: String(error?.code || ""),
    text: String(error?.text || ""),
    payload: error?.payload ?? null,
  };
}

function hydrateError(record) {
  const err = new Error(String(record?.message || "HTTP error"));
  err.name = String(record?.name || "Error");
  if (Number(record?.status || 0)) err.status = Number(record.status || 0);
  if (String(record?.code || "").trim()) err.code = String(record.code);
  if (record?.text) err.text = String(record.text);
  if (record?.payload !== undefined) err.payload = record.payload;
  return err;
}

function waitMs(ms, signal) {
  const timeoutMs = Math.max(0, Number(ms || 0) || 0);
  if (!timeoutMs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, timeoutMs);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

async function waitForRequestGap(token, signal) {
  const scope = String(token || "").trim();
  if (!scope) return;
  const now = Date.now();
  const waitFor = Math.max(0, nextNetworkAt - now);
  if (waitFor > 0) {
    await waitMs(waitFor, signal);
  }
  nextNetworkAt = Date.now() + AUTH_REQUEST_GAP_MS;
}

function readCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    removeStoredRecord(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value, ttlMs) {
  const entry = { value, expiresAt: Date.now() + Math.max(500, Number(ttlMs || 0) || DEFAULT_TTL_MS) };
  cache.set(key, entry);
  writeStoredRecord(key, { type: "value", ...entry });
}

function readFailure(key) {
  const hit = failures.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    failures.delete(key);
    removeStoredRecord(key);
    return null;
  }
  return hit.error;
}

function readStoredValue(key) {
  const record = readStoredRecord(key);
  if (!record || record.type !== "value") return null;
  const entry = { value: record.value ?? null, expiresAt: Number(record.expiresAt || 0) || 0 };
  if (entry.expiresAt <= Date.now()) {
    removeStoredRecord(key);
    return null;
  }
  cache.set(key, entry);
  return entry.value;
}

function readStoredFailure(key) {
  const record = readStoredRecord(key);
  if (!record || record.type !== "error") return null;
  const expiresAt = Number(record.expiresAt || 0) || 0;
  if (expiresAt <= Date.now()) {
    removeStoredRecord(key);
    return null;
  }
  const error = hydrateError(record.error || {});
  failures.set(key, { error, expiresAt });
  return error;
}

function removeStoredEntries(prefix = "") {
  const storage = getStorage();
  if (!storage) return;
  const target = String(prefix || "");
  try {
    for (let idx = storage.length - 1; idx >= 0; idx -= 1) {
      const key = storage.key(idx);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const inner = key.slice(STORAGE_PREFIX.length);
      if (!matchesCacheTarget(inner, target, "prefix")) continue;
      storage.removeItem(key);
    }
  } catch {
    // best effort
  }
}

function removeStoredExact(url, token) {
  const key = keyOf(url, token);
  removeStoredRecord(key);
}

function writeFailure(key, error, ttlMs = FAILURE_TTL_MS) {
  failures.set(key, {
    error: error?.name === "AbortError" ? error : hydrateError(serializeError(error)),
    expiresAt: Date.now() + Math.max(500, Number(ttlMs || 0) || FAILURE_TTL_MS),
  });
  writeStoredRecord(key, {
    type: "error",
    error: serializeError(error),
    expiresAt: Date.now() + Math.max(500, Number(ttlMs || 0) || FAILURE_TTL_MS),
  });
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const next = queue.shift();
    active += 1;
    Promise.resolve()
      .then(next.run)
      .then(next.resolve, next.reject)
      .finally(() => {
        active = Math.max(0, active - 1);
        pump();
      });
  }
}

function schedule(run) {
  return new Promise((resolve, reject) => {
    queue.push({ run, resolve, reject });
    pump();
  });
}

export async function cachedGet(url, { token, ttlMs = DEFAULT_TTL_MS, force = false, signal, delayMs = 0 } = {}) {
  if (!url) return null;
  const key = keyOf(url, token);
  const requestVersion = force ? bumpCacheVersion() : cacheVersion;
  if (!force) {
    const cached = readCache(key);
    if (cached !== null) return cached;
    const stored = readStoredValue(key);
    if (stored !== null) return stored;
    const failed = readFailure(key);
    if (failed) throw failed;
    const storedFailure = readStoredFailure(key);
    if (storedFailure) throw storedFailure;
    if (inflight.has(key)) return inflight.get(key);
  } else {
    failures.delete(key);
    cache.delete(key);
    removeStoredRecord(key);
  }
  const promise = schedule(async () => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await waitForRequestGap(token, signal);
    if (Number(delayMs || 0) > 0) {
      await waitMs(delayMs, signal);
    }
    try {
      failures.delete(key);
      const json = await api(url, { token, signal });
      if (requestVersion === cacheVersion) {
        writeCache(key, json ?? null, ttlMs);
      }
      return json ?? null;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      const retryAfterSec = Number(error?.payload?.retryAfterSec || error?.retryAfterSec || 0) || 0;
      if (Number(error?.status || 0) === 429 && retryAfterSec > 0) {
        nextNetworkAt = Math.max(nextNetworkAt, Date.now() + (retryAfterSec * 1000));
      }
      if (requestVersion === cacheVersion) {
        writeFailure(key, error, FAILURE_TTL_MS);
      }
      throw error;
    } finally {
      inflight.delete(key);
    }
  });
  inflight.set(key, promise);
  return promise;
}

function matchesCacheTarget(key, target, mode = "prefix") {
  if (!target) return true;
  const { url } = splitKey(key);
  if (!url) return false;
  return mode === "exact" ? url === target : url.startsWith(target);
}

export function clearUiDataCache(prefix = "") {
  const target = String(prefix || "");
  for (const key of Array.from(cache.keys())) {
    if (matchesCacheTarget(key, target, "prefix")) cache.delete(key);
  }
  for (const key of Array.from(inflight.keys())) {
    if (matchesCacheTarget(key, target, "prefix")) inflight.delete(key);
  }
  for (const key of Array.from(failures.keys())) {
    if (matchesCacheTarget(key, target, "prefix")) failures.delete(key);
  }
  removeStoredEntries(target);
  bumpCacheVersion();
}

export function clearUiDataCacheExact(url, token) {
  const key = keyOf(url, token);
  cache.delete(key);
  inflight.delete(key);
  failures.delete(key);
  removeStoredExact(url, token);
  bumpCacheVersion();
}
