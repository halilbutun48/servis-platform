// web/src/live/ws.js
import { invalidate } from "./bus";

let ws = null;
let reconnectTimer = null;
let backoffMs = 500;
let tokenRef = null;
let started = false;

function defaultWsUrl() {
  const fromEnv = import.meta.env.VITE_WS_URL;
  if (fromEnv) return String(fromEnv);

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`; // backend path /ws değilse değiştir
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

function normalizeMsg(rawText) {
  const parsed = safeJsonParse(rawText);

  // ✅ JSON string gelirse: "shift:..." -> { kind: "shift:..." }
  if (typeof parsed === "string") return { kind: parsed };

  // ✅ object gelirse aynen kullan
  if (parsed && typeof parsed === "object") return parsed;

  // ✅ JSON değilse raw text üzerinden çalış
  return { kind: "raw", data: rawText };
}

function guessTopics(msg) {
  const kind = toText(msg?.kind || msg?.type || msg?.event || msg?.name || "");
  const topic = toText(msg?.topic || msg?.channel || "");
  const raw = `${kind} ${topic}`;

  const topics = new Set();

  if (raw.includes("shift")) topics.add("shifts");
  if (raw.includes("vehicle") || raw.includes("gps")) topics.add("vehicles");
  if (raw.includes("driver")) topics.add("drivers");
  if (raw.includes("room")) topics.add("rooms");
  if (raw.includes("notif")) topics.add("notifications");

  if (topic === "shifts" || topic === "vehicles" || topic === "drivers" || topic === "rooms" || topic === "notifications") {
    topics.add(topic);
  }

  return Array.from(topics);
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, backoffMs);

  backoffMs = Math.min(backoffMs * 2, 8000);
}

function closeWs() {
  try {
    ws?.close?.();
  } catch {}
  ws = null;
}

function connect() {
  if (!started) return;

  const base = defaultWsUrl();
  const u = new URL(base, window.location.origin);

  // backend query token destekliyorsa iş görür; desteklemiyorsa ignore eder
  if (tokenRef) u.searchParams.set("token", tokenRef);

  closeWs();

  try {
    ws = new WebSocket(u.toString());
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    backoffMs = 500;
    console.debug("[ws] connected");
  };

  ws.onclose = () => {
    console.debug("[ws] closed -> reconnect");
    scheduleReconnect();
  };

  ws.onmessage = (ev) => {
    const text = String(ev?.data ?? "");
    const msg = normalizeMsg(text);

    const topics = guessTopics(msg);

    for (const t of topics) {
      invalidate(t, { source: "ws", msg });
    }

    if (topics.length) console.debug("[ws] invalidate:", topics, msg);
  };
}

export function startLiveWs(token) {
  started = true;
  tokenRef = token ? String(token) : null;
  connect();
}

export function stopLiveWs() {
  started = false;
  tokenRef = null;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  closeWs();
}