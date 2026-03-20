import { nowIsoTR } from "./time";

// web/src/utils/offlineQueue.js
// M72.1 patch: enrich queue items with retry + lastError + lastTriedAt.

const KEY = "driver_offline_queue_v1";

function safeParse(v, fallback) {
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x : fallback;
  } catch {
    return fallback;
  }
}

function loadQueue() {
  return safeParse(localStorage.getItem(KEY) || "[]", []);
}

function saveQueue(q) {
  localStorage.setItem(KEY, JSON.stringify(Array.isArray(q) ? q : []));
}

export function isOnline() {
  return typeof navigator !== "undefined" ? !!navigator.onLine : true;
}

export function queueSize() {
  return loadQueue().length;
}

export function getQueue() {
  return loadQueue();
}

export function enqueueRequest({ method = "POST", url, body, label }) {
  const q = loadQueue();
  const item = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    method,
    url,
    body: body ?? null,
    label: label ?? "",
    enqueuedAt: nowIsoTR(),

    // M72.1 meta
    retryCount: 0,
    lastError: null,
    lastTriedAt: null,
  };
  q.push(item);
  saveQueue(q);
  return { ok: true, size: q.length, item };
}

export function clearQueue() {
  saveQueue([]);
}

function extractErrMessage(e) {
  const p = e?.payload;
  return (
    p?.error ||
    p?.message ||
    e?.message ||
    (typeof e === "string" ? e : "") ||
    String(e ?? "Unknown error")
  );
}

// Flush queue sequentially.
// - 4xx: drop (won't succeed later)
// - network/5xx: stop (keep item), but update meta so UI can show retry+lastError.
export async function flushQueue({ token, apiFn }) {
  let q = loadQueue();
  let sent = 0;
  let dropped = 0;

  for (let i = 0; i < q.length; ) {
    const item = q[i];

    // stamp attempt time (so UI shows "Son Deneme" even if request fails fast)
    try {
      item.lastTriedAt = nowIsoTR();
      saveQueue(q);
    } catch {}

    try {
      await apiFn(item.url, { method: item.method, body: item.body ?? undefined, token });
      q.splice(i, 1);
      sent += 1;
      saveQueue(q);
      continue;
    } catch (e) {
      // update meta
      item.retryCount = Number.isFinite(item.retryCount) ? item.retryCount + 1 : 1;
      item.lastError = extractErrMessage(e);
      saveQueue(q);

      const status = e?.status;

      // 4xx => drop to avoid permanent block
      if (typeof status === "number" && status >= 400 && status < 500) {
        q.splice(i, 1);
        dropped += 1;
        saveQueue(q);
        continue;
      }

      // network / 5xx => stop flushing, keep remaining
      break;
    }
  }

  return { sent, dropped, remaining: q.length };
}
