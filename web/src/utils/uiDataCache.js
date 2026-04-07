import { api } from "../api";

const cache = new Map();
const inflight = new Map();
const failures = new Map();
const queue = [];
let active = 0;
const DEFAULT_TTL_MS = 8000;
const FAILURE_TTL_MS = 2000;
const MAX_CONCURRENT = 3;

function tokenScope(token) {
  const t = String(token || "").trim();
  return t ? t.slice(-16) : "anon";
}

function keyOf(url, token) {
  return `${tokenScope(token)}:${String(url || "")}`;
}

function splitKey(key) {
  const idx = String(key || "").indexOf(":");
  if (idx < 0) return { scope: "", url: String(key || "") };
  return { scope: key.slice(0, idx), url: key.slice(idx + 1) };
}

function readCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + Math.max(500, Number(ttlMs || 0) || DEFAULT_TTL_MS) });
}

function readFailure(key) {
  const hit = failures.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    failures.delete(key);
    return null;
  }
  return hit.error;
}

function writeFailure(key, error, ttlMs = FAILURE_TTL_MS) {
  failures.set(key, {
    error,
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
  if (!force) {
    const cached = readCache(key);
    if (cached !== null) return cached;
    const failed = readFailure(key);
    if (failed) throw failed;
    if (inflight.has(key)) return inflight.get(key);
  } else {
    failures.delete(key);
  }
  const promise = schedule(async () => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (Number(delayMs || 0) > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, Number(delayMs || 0));
        const onAbort = () => {
          clearTimeout(timer);
          signal?.removeEventListener?.("abort", onAbort);
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener?.("abort", onAbort, { once: true });
      });
    }
    try {
      failures.delete(key);
      const json = await api(url, { token, signal });
      writeCache(key, json ?? null, ttlMs);
      return json ?? null;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      writeFailure(key, error, FAILURE_TTL_MS);
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
}

export function clearUiDataCacheExact(url, token) {
  const key = keyOf(url, token);
  cache.delete(key);
  inflight.delete(key);
  failures.delete(key);
}
