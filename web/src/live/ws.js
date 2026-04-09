// web/src/live/ws.js
import { io } from "socket.io-client";
import { invalidate } from "./bus";

let socket = null;
let reconnectTimer = null;
let backoffMs = 500;

let tokenRef = null;
let started = false;
let connecting = false; // ✅ aynı anda 2 connect olmasın

// Dedupe cache: key -> lastTimestampMs
const lastSig = new Map();
const DEDUPE_TTL_MS = 10_000; // aynı status 10 sn içinde tekrar gelirse invalidate etme
const MAX_SIG_SIZE = 400;

function nowMs() {
  return Date.now();
}

function normalizeBaseUrl(u) {
  const s = String(u || "").trim();
  if (!s) return null;

  // socket.io için http(s) base ister; ws/wss gelirse dönüştür
  if (s.startsWith("ws://")) return "http://" + s.slice("ws://".length);
  if (s.startsWith("wss://")) return "https://" + s.slice("wss://".length);

  return s;
}

function defaultSocketBase() {
  // Öncelik: VITE_WS_URL -> VITE_API_URL -> window.origin
  const fromWs = normalizeBaseUrl(import.meta.env.VITE_WS_URL);
  if (fromWs) return fromWs;

  const fromApi = normalizeBaseUrl(import.meta.env.VITE_API_URL);
  if (fromApi) return fromApi;

  return window.location.origin;
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function toText(x) {
  return String(x ?? "").toLowerCase();
}

/**
 * payload’ı normalize eder ve her zaman event adını taşır.
 * - msg._event: gerçek WS event adı (örn: "agreement:update")
 * - msg.kind: payload’da yoksa eventName set edilir
 */
function normalizeEvent(eventName, payload) {
  // String payload
  if (typeof payload === "string") {
    const parsed = safeJsonParse(payload);
    if (parsed && typeof parsed === "object") {
      return { ...parsed, kind: parsed.kind ?? eventName, _event: eventName };
    }
    if (typeof parsed === "string") {
      return { kind: parsed, _event: eventName };
    }
    return { kind: eventName, data: payload, _event: eventName };
  }

  // Object payload
  if (payload && typeof payload === "object") {
    const hasAnyKind =
      !!payload.kind || !!payload.type || !!payload.event || !!payload.name;

    if (!hasAnyKind) {
      // payload’da belirleyici yoksa kind=eventName yap
      return { ...payload, kind: eventName, _event: eventName };
    }

    // payload kind farklı olsa bile eventName’i sakla (M23 fix)
    return { ...payload, _event: eventName };
  }

  // Primitive / null
  return { kind: eventName, data: payload, _event: eventName };
}

function guessTopics(msg) {
  // ✅ M23: event adını da dahil et (payload.kind "created" olsa bile agreement:update yakalansın)
  const kind = toText(msg?.kind || msg?.type || msg?.event || msg?.name || "");
  const topic = toText(msg?.topic || msg?.channel || "");
  const ev = toText(msg?._event || "");

  const raw = `${kind} ${topic} ${ev}`;

  const topics = new Set();

  if (raw.includes("shift")) topics.add("shifts");
  if (raw.includes("vehicle")) topics.add("vehicles");
  if (raw.includes("gps")) topics.add("gps");
  if (raw.includes("driver")) topics.add("drivers");
  if (raw.includes("room")) topics.add("rooms");
  if (raw.includes("notif")) topics.add("notifications");

  // ✅ eta auto-refresh
  if (raw.includes("eta")) topics.add("eta");

  // ✅ agreements auto-refresh
  if (raw.includes("agreement")) topics.add("agreements");

  // ✅ M24: offers
  if (raw.includes("offer")) topics.add("offers");
  if (raw.includes("checkin")) topics.add("checkin");

  // explicit topic override (backend msg.topic kullanırsa)
  if (
    topic === "shifts" ||
    topic === "vehicles" ||
    topic === "gps" ||
    topic === "drivers" ||
    topic === "rooms" ||
    topic === "notifications" ||
    topic === "agreements"
    || topic === "offers"
    || topic === "eta"
  ) {
    topics.add(topic);
  }

  return Array.from(topics);
}

function pruneSigMap() {
  if (lastSig.size <= MAX_SIG_SIZE) return;

  const entries = Array.from(lastSig.entries()).sort((a, b) => a[1] - b[1]);
  const removeCount = Math.max(50, Math.floor(entries.length * 0.25));
  for (let i = 0; i < removeCount; i++) lastSig.delete(entries[i][0]);
}

function shouldInvalidate(msg, topics) {
  if (!topics || topics.length === 0) return false;

  // ✅ M23: kind yoksa _event’e bak (eventName kaynaklı topic dedupe/guard)
  const kind = String(
    msg?.kind || msg?._event || msg?.type || msg?.event || msg?.name || ""
  );

  if (!kind) return true;

  // ⚠️ En kritik spam: vehicle:status (ageSec artıyor ama status aynı)
  if (kind === "vehicle:status") {
    const vid = Number(msg?.vehicleId);
    const st = String(msg?.status || "");
    if (Number.isFinite(vid) && st) {
      const key = `vehicle:status:${vid}:${st}`;
      const t = nowMs();
      const prev = lastSig.get(key) || 0;
      if (t - prev < DEDUPE_TTL_MS) return false;
      lastSig.set(key, t);
      pruneSigMap();
      return true;
    }
  }

  return true;
}

function scheduleReconnect() {
  if (!started) return;
  if (reconnectTimer) return;

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, backoffMs);

  backoffMs = Math.min(backoffMs * 2, 8000);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function closeSocket() {
  try {
    socket?.offAny?.();
    socket?.removeAllListeners?.();
    socket?.disconnect?.();
  } catch {
    // best effort: socket teardown should never block reconnect flow
  }
  socket = null;
}

function connect() {
  if (!started) return;
  if (!tokenRef) return;
  if (connecting) return; // ✅ ikinci kez connect çalışmasın

  connecting = true;

  const base = defaultSocketBase();

  clearReconnectTimer();
  closeSocket();

  try {
    socket = io(base, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: false,
      auth: { token: tokenRef },
      query: { token: tokenRef },
    });
  } catch (e) {
    connecting = false;
    console.debug("[ws] create failed:", e);
    scheduleReconnect();
    return;
  }

  socket.on("connect", () => {
    connecting = false;
    backoffMs = 500;
    console.debug("[ws] connected", socket.id);
  });

  socket.on("disconnect", (reason) => {
    connecting = false;
    console.debug("[ws] disconnected:", reason, "-> reconnect");
    scheduleReconnect();
  });

  socket.on("connect_error", (err) => {
    connecting = false;
    console.debug("[ws] connect_error:", err?.message || err, "-> reconnect");
    scheduleReconnect();
  });

  socket.onAny((eventName, payload) => {
    // ✅ "message" hem onAny’e hem aşağıdaki on("message")’a düşebilir → çift invalidate
    if (eventName === "message") return;

    const msg = normalizeEvent(eventName, payload);
    const topics = guessTopics(msg);

    if (!shouldInvalidate(msg, topics)) return;

    for (const t of topics) {
      invalidate(t, { source: "ws", msg });
    }

    if (topics.length) console.debug("[ws] invalidate:", topics, msg);
  });

  socket.on("message", (payload) => {
    const msg = normalizeEvent("message", payload);
    const topics = guessTopics(msg);

    if (!shouldInvalidate(msg, topics)) return;

    for (const t of topics) {
      invalidate(t, { source: "ws", msg });
    }

    if (topics.length) console.debug("[ws] invalidate(message):", topics, msg);
  });
}

export function startLiveWs(token) {
  const t = token ? String(token) : null;
  if (!t) return;

  // ✅ aynı token ve bağlanma sürecindeyken tekrar bağlanma
  if (started && tokenRef === t && (socket?.connected || connecting)) return;

  started = true;
  tokenRef = t;
  connect();
}

export function stopLiveWs() {
  started = false;
  tokenRef = null;
  connecting = false;

  clearReconnectTimer();
  closeSocket();

  // temiz restart için
  lastSig.clear();
}