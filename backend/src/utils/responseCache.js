const store = new Map();

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
  const cached = readResponseCache(key, scope);
  if (cached !== null) return Promise.resolve(cached);
  return Promise.resolve()
    .then(producer)
    .then((value) => writeResponseCache(key, value, ttlMs, scope));
}

export function clearResponseCache(prefix = '', scope = null) {
  const needle = String(prefix || '');
  const scopedPrefix = scope ? `${getScopeKey(scope)}:` : '';
  for (const key of Array.from(store.keys())) {
    if (scope && !key.startsWith(scopedPrefix)) continue;
    if (!needle || key.includes(needle)) store.delete(key);
  }
}
