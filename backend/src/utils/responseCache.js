const store = new Map();
const inflight = new Map();
let cacheVersion = 0;

function now() {
  return Date.now();
}

function getScopeKey(scope = {}) {
  const role = String(scope?.role || 'anon');
  const companyId = Number(scope?.companyId || 0) || 0;
  const roomId = Number(scope?.roomId || 0) || 0;
  const userId = Number(scope?.userId || 0) || 0;
  return `${role}:${companyId}:${roomId}:${userId}`;
}

function makeKey(key, scope) {
  return `${getScopeKey(scope)}:${String(key || '')}`;
}

function getUnscopedKey(compositeKey) {
  return String(compositeKey || '').split(':').slice(4).join(':');
}

function bumpCacheVersion() {
  cacheVersion += 1;
  return cacheVersion;
}

function matchesTarget(compositeKey, needle = '', scope = null, exact = false) {
  const target = String(needle || '');
  if (!target) return true;

  const key = String(compositeKey || '');
  const scopedPrefix = scope ? `${getScopeKey(scope)}:` : '';
  const unscopedKey = scope
    ? (key.startsWith(scopedPrefix) ? key.slice(scopedPrefix.length) : '')
    : getUnscopedKey(key);

  if (!unscopedKey) return false;
  return exact ? unscopedKey === target : unscopedKey.startsWith(target);
}

export function readResponseCache(key, scope = {}) {
  const entry = store.get(makeKey(key, scope));
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    store.delete(makeKey(key, scope));
    return null;
  }
  return entry.value;
}

export function writeResponseCache(key, value, ttlMs = 5000, scope = {}) {
  const safeTtl = Math.max(250, Number(ttlMs || 0) || 5000);
  store.set(makeKey(key, scope), { value, expiresAt: now() + safeTtl });
  return value;
}

export function rememberResponse(key, producer, { ttlMs = 5000, scope = {} } = {}) {
  const compositeKey = makeKey(key, scope);
  const cached = readResponseCache(key, scope);
  if (cached !== null) return Promise.resolve(cached);

  const existing = inflight.get(compositeKey);
  if (existing?.promise) return existing.promise;

  const versionAtStart = cacheVersion;
  const entry = { promise: null };
  const promise = Promise.resolve()
    .then(producer)
    .then((value) => {
      if (versionAtStart === cacheVersion) {
        writeResponseCache(key, value, ttlMs, scope);
      }
      return value;
    })
    .finally(() => {
      const current = inflight.get(compositeKey);
      if (current === entry) inflight.delete(compositeKey);
    });

  entry.promise = promise;
  inflight.set(compositeKey, entry);
  return promise;
}

export function clearResponseCache(prefix = '', scope = null) {
  const needle = String(prefix || '');
  for (const key of Array.from(store.keys())) {
    if (matchesTarget(key, needle, scope, false)) store.delete(key);
  }
  for (const key of Array.from(inflight.keys())) {
    if (matchesTarget(key, needle, scope, false)) inflight.delete(key);
  }
  bumpCacheVersion();
}

export function clearResponseCacheExact(keyToClear = '', scope = null) {
  const needle = String(keyToClear || '');
  if (!needle) return;
  for (const key of Array.from(store.keys())) {
    if (matchesTarget(key, needle, scope, true)) store.delete(key);
  }
  for (const key of Array.from(inflight.keys())) {
    if (matchesTarget(key, needle, scope, true)) inflight.delete(key);
  }
  bumpCacheVersion();
}
