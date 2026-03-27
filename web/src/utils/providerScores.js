import { api } from "../api";

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const FAILURE_TTL_MS = 30 * 1000;
const MAX_CONCURRENT = 1;

const cache = new Map();
const inflight = new Map();
const queue = [];
let activeCount = 0;

function tokenScope(token) {
  const t = String(token || "").trim();
  return t ? t.slice(-16) : "anon";
}

function cacheKey(roomId, token) {
  return `${tokenScope(token)}:${Number(roomId || 0)}`;
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
  cache.set(key, {
    value: value ?? null,
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs || 0) || DEFAULT_TTL_MS),
  });
}

function pumpQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length) {
    const task = queue.shift();
    activeCount += 1;
    Promise.resolve()
      .then(task.run)
      .then(task.resolve, task.reject)
      .finally(() => {
        activeCount = Math.max(0, activeCount - 1);
        pumpQueue();
      });
  }
}

function schedule(run) {
  return new Promise((resolve, reject) => {
    queue.push({ run, resolve, reject });
    pumpQueue();
  });
}

export async function fetchProviderScore(roomId, token, { ttlMs = DEFAULT_TTL_MS, force = false } = {}) {
  const rid = Number(roomId || 0);
  if (!rid || !token) return null;
  const key = cacheKey(rid, token);
  if (!force) {
    const cached = readCache(key);
    if (cached !== null) return cached;
    if (inflight.has(key)) return inflight.get(key);
  }
  const promise = schedule(async () => {
    try {
      const score = await api(`/api/trust-quality/provider-score/${rid}`, { token });
      writeCache(key, score || null, ttlMs);
      return score || null;
    } catch {
      writeCache(key, null, FAILURE_TTL_MS);
      return null;
    } finally {
      inflight.delete(key);
    }
  });
  inflight.set(key, promise);
  return promise;
}

export async function fetchProviderScoreMap(roomIds, token, options = {}) {
  const ids = Array.from(new Set((Array.isArray(roomIds) ? roomIds : [])
    .map((id) => Number(id || 0))
    .filter((id) => Number.isFinite(id) && id > 0)));
  if (!token || !ids.length) return {};

  const { ttlMs = DEFAULT_TTL_MS, force = false } = options || {};
  const out = {};
  const missing = [];

  for (const rid of ids) {
    const key = cacheKey(rid, token);
    if (!force) {
      const cached = readCache(key);
      if (cached !== null) {
        out[String(rid)] = cached;
        continue;
      }
    }
    missing.push(rid);
  }

  if (!missing.length) return out;

  try {
    const payload = await api(`/api/trust-quality/provider-scores?roomIds=${missing.join(',')}`, { token });
    const byId = payload?.byId && typeof payload.byId === 'object' ? payload.byId : {};
    for (const rid of missing) {
      const score = byId[String(rid)] ?? byId[rid] ?? null;
      writeCache(cacheKey(rid, token), score, ttlMs);
      out[String(rid)] = score;
    }
    return out;
  } catch {
    const pairs = await Promise.all(missing.map(async (rid) => [String(rid), await fetchProviderScore(rid, token, options)]));
    for (const [key, value] of pairs) out[key] = value;
    return out;
  }
}

export function clearProviderScoreCache() {
  cache.clear();
  inflight.clear();
  queue.length = 0;
  activeCount = 0;
}
