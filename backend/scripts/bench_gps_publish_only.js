import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { io } from "socket.io-client";
import { prisma } from "../src/prisma.js";
import { CONSENT_DOCS } from "../src/middleware/consentGate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_VEHICLES = 100;
const DEFAULT_CYCLES = 2;
const DEFAULT_INTERVAL_MS = 20_000;
const DEFAULT_OUTPUT_DIR = path.join(repoRoot, "artifacts", "benchmarks");
const DEFAULT_BENCH_TAG = "__BENCH_GPS_ONLY_V1__";
const DEFAULT_SCENARIO = "publish-only";
const DEFAULT_PANEL_PROFILE = "none";
const DEFAULT_PANEL_DRAIN_MS = 2500;
const DEFAULT_PANEL_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_PANEL_DEBOUNCE_MS = 180;
const DEFAULT_BASE_URL = process.env.API_URL || "http://127.0.0.1:3000";
const DEFAULT_PASSWORD = "demo123";
const DEFAULT_TIMEOUT_MS = 15_000;

function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const body = raw.slice(2);
    if (!body) continue;
    const eq = body.indexOf("=");
    if (eq === -1) {
      out[body] = true;
      continue;
    }
    const key = body.slice(0, eq);
    const value = body.slice(eq + 1);
    out[key] = value;
  }
  return out;
}

function pickInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

function roundMs(n) {
  return Math.round(Number(n) * 100) / 100;
}

function percentile(sortedValues, pct) {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const idx = (sortedValues.length - 1) * pct;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  const weight = idx - lo;
  return sortedValues[lo] * (1 - weight) + sortedValues[hi] * weight;
}

function summarizeLatencies(samples) {
  const latencies = samples
    .map((s) => Number(s.latencyMs))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const total = latencies.reduce((sum, n) => sum + n, 0);
  return {
    min: latencies[0] ?? 0,
    max: latencies.at(-1) ?? 0,
    avg: latencies.length ? total / latencies.length : 0,
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    p99: percentile(latencies, 0.99),
  };
}

async function requestJson(method, pathName, { token, body, timeoutMs = DEFAULT_TIMEOUT_MS, greenpackBypass = false } = {}) {
  const url = new URL(pathName, DEFAULT_BASE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request timeout")), timeoutMs);

  try {
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (greenpackBypass) headers["x-greenpack"] = "1";

    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      ok: res.ok,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      json,
      text,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      headers: {},
      json: null,
      text: String(err?.message || err || "request failed"),
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSocketBaseUrl(u) {
  const s = String(u || "").trim();
  if (!s) return null;

  if (s.startsWith("ws://")) return `http://${s.slice("ws://".length)}`;
  if (s.startsWith("wss://")) return `https://${s.slice("wss://".length)}`;

  return s;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeSocketEvent(eventName, payload) {
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

  if (payload && typeof payload === "object") {
    const hasAnyKind = !!payload.kind || !!payload.type || !!payload.event || !!payload.name;
    if (!hasAnyKind) {
      return { ...payload, kind: eventName, _event: eventName };
    }
    return { ...payload, _event: eventName };
  }

  return { kind: eventName, data: payload, _event: eventName };
}

const PANEL_SIG_CACHE = new Map();
const PANEL_SIG_TTL_MS = 10_000;
const PANEL_SIG_MAX_SIZE = 400;

function prunePanelSigCache() {
  if (PANEL_SIG_CACHE.size <= PANEL_SIG_MAX_SIZE) return;
  const entries = Array.from(PANEL_SIG_CACHE.entries()).sort((a, b) => a[1] - b[1]);
  const removeCount = Math.max(50, Math.floor(entries.length * 0.25));
  for (let i = 0; i < removeCount; i += 1) {
    PANEL_SIG_CACHE.delete(entries[i][0]);
  }
}

function shouldCountPanelEvent(msg, topics) {
  if (!topics || !topics.length) return false;

  const kind = String(msg?.kind || msg?._event || msg?.type || msg?.event || msg?.name || "");
  if (!kind) return true;

  if (kind === "vehicle:status") {
    const vid = Number(msg?.vehicleId);
    const st = String(msg?.status || "");
    if (Number.isFinite(vid) && st) {
      const key = `vehicle:status:${vid}:${st}`;
      const now = Date.now();
      const prev = PANEL_SIG_CACHE.get(key) || 0;
      if (now - prev < PANEL_SIG_TTL_MS) return false;
      PANEL_SIG_CACHE.set(key, now);
      prunePanelSigCache();
      return true;
    }
  }

  return true;
}

function guessPanelTopics(msg) {
  const kind = String(msg?.kind || msg?.type || msg?.event || msg?.name || "").toLowerCase();
  const topic = String(msg?.topic || msg?.channel || "").toLowerCase();
  const ev = String(msg?._event || "").toLowerCase();
  const raw = `${kind} ${topic} ${ev}`;

  const topics = new Set();
  if (raw.includes("shift")) topics.add("shifts");
  if (raw.includes("vehicle")) topics.add("vehicles");
  if (raw.includes("gps")) topics.add("gps");
  if (raw.includes("driver")) topics.add("drivers");
  if (raw.includes("room")) topics.add("rooms");
  if (raw.includes("notif")) topics.add("notifications");
  if (raw.includes("eta")) topics.add("eta");
  if (raw.includes("agreement")) topics.add("agreements");
  if (raw.includes("offer")) topics.add("offers");
  if (raw.includes("checkin")) topics.add("checkin");
  if (ev === "route:progress" || ev === "route:plan") topics.add("shifts");

  if (
    topic === "shifts" ||
    topic === "vehicles" ||
    topic === "gps" ||
    topic === "drivers" ||
    topic === "rooms" ||
    topic === "notifications" ||
    topic === "agreements" ||
    topic === "offers" ||
    topic === "eta"
  ) {
    topics.add(topic);
  }

  return Array.from(topics);
}

function createPanelRequestRunner(metrics, panelName, sessionName, token) {
  return async function request(method, pathName, { body, timeoutMs = DEFAULT_TIMEOUT_MS, force = false, ttlMs = 0, cacheKey = null, cacheStore = null } = {}, source = "reload") {
    if (cacheStore && cacheKey && !force) {
      const hit = cacheStore.get(cacheKey);
      if (hit && hit.expiresAt > Date.now()) {
        metrics.cacheHits = (metrics.cacheHits || 0) + 1;
        return hit.value;
      }
    }

    const t0 = performance.now();
    const resp = await requestJson(method, pathName, {
      token,
      body,
      timeoutMs,
    });
    const latencyMs = roundMs(performance.now() - t0);

    metrics.requestCount += 1;
    metrics.latencies.push(latencyMs);
    metrics.sourceCounts[source] = (metrics.sourceCounts[source] || 0) + 1;
    if (!resp.ok) {
      metrics.errorCount += 1;
      if (metrics.errors.length < 10) {
        metrics.errors.push({
          panel: panelName,
          session: sessionName,
          source,
          method,
          path: pathName,
          status: resp.status,
          text: String(resp.text || "").slice(0, 240),
        });
      }
    }

    if (cacheStore && cacheKey && resp.ok && ttlMs > 0) {
      cacheStore.set(cacheKey, { value: resp, expiresAt: Date.now() + Math.max(500, Number(ttlMs) || 0) });
    }

    return resp;
  };
}

function createPanelProbe({
  name,
  sessionName,
  token,
  topicModes,
  debounceMs = DEFAULT_PANEL_DEBOUNCE_MS,
  pollMs = 0,
  load,
}) {
  const metrics = {
    name,
    sessionName,
    invalidateCount: 0,
    reloadCount: 0,
    requestCount: 0,
    errorCount: 0,
    cacheHits: 0,
    sourceCounts: {},
    topicCounts: {},
    latencies: [],
    errors: [],
  };

  const request = createPanelRequestRunner(metrics, name, sessionName, token);
  let debounceTimer = null;
  let pollTimer = null;
  let inFlight = false;
  let pending = false;

  async function runLoad(source) {
    metrics.reloadCount += 1;
    try {
      await load({ request, source, metrics, token, panelName: name, sessionName });
    } catch (err) {
      metrics.errorCount += 1;
      if (metrics.errors.length < 10) {
        metrics.errors.push({
          panel: name,
          session: sessionName,
          source,
          error: String(err?.message || err || "panel load failed"),
        });
      }
    }
  }

  function flushQueued() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (inFlight || !pending) return;
      inFlight = true;
      (async () => {
        try {
          while (pending) {
            pending = false;
            await runLoad("ws");
          }
        } finally {
          inFlight = false;
          if (pending) flushQueued();
        }
      })();
    }, Math.max(0, Number(debounceMs || 0)));
  }

  function handleEvent(topic, msg) {
    const modeSpec = topicModes?.[topic];
    if (!modeSpec) return;
    const mode = typeof modeSpec === "function" ? modeSpec(msg, topic) : modeSpec;
    if (!mode) return;

    metrics.invalidateCount += 1;
    metrics.topicCounts[topic] = (metrics.topicCounts[topic] || 0) + 1;

    if (mode === "reload") {
      pending = true;
      flushQueued();
    }
  }

  async function start() {
    await runLoad("initial");
    if (pollMs > 0) {
      pollTimer = setInterval(() => {
        void runLoad("poll");
      }, Math.max(500, Number(pollMs) || 0));
    }
  }

  async function stop() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function summary() {
    return {
      name,
      sessionName,
      invalidateCount: metrics.invalidateCount,
      reloadCount: metrics.reloadCount,
      requestCount: metrics.requestCount,
      errorCount: metrics.errorCount,
      cacheHits: metrics.cacheHits,
      sourceCounts: metrics.sourceCounts,
      topicCounts: metrics.topicCounts,
      latencyMs: summarizeLatencies(metrics.latencies),
      errors: metrics.errors.slice(0, 5),
    };
  }

  return {
    name,
    sessionName,
    token,
    handleEvent,
    start,
    stop,
    summary,
    metrics,
  };
}

function createPanelSession({ name, token, panels }) {
  const base = normalizeSocketBaseUrl(DEFAULT_BASE_URL);
  if (!base) {
    throw new Error("panel websocket base url missing");
  }

  let socket = null;
  let connectTimeout = null;

  async function connect() {
    if (!token) throw new Error(`panel session ${name} token missing`);

    socket = io(base, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 250,
      reconnectionDelayMax: 5000,
      forceNew: true,
      auth: { token },
      query: { token },
    });

    return new Promise((resolve, reject) => {
      connectTimeout = setTimeout(() => {
        try {
          socket?.disconnect?.();
        } catch {
          // no-op
        }
        reject(new Error(`panel socket connect timeout: ${name}`));
      }, DEFAULT_PANEL_CONNECT_TIMEOUT_MS);

      socket.once("connect", () => {
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        resolve(socket);
      });

      socket.once("connect_error", (err) => {
        console.debug(`[bench:panel:${name}] connect_error:`, err?.message || err);
      });

      socket.onAny((eventName, payload) => {
        const msg = normalizeSocketEvent(eventName, payload);
        const topics = guessPanelTopics(msg);
        if (!shouldCountPanelEvent(msg, topics)) return;
        for (const topic of topics) {
          for (const panel of panels) {
            panel.handleEvent(topic, msg);
          }
        }
      });
    });
  }

  async function start() {
    await connect();
    await Promise.all(panels.map((panel) => panel.start()));
  }

  async function stop() {
    await Promise.allSettled(panels.map((panel) => panel.stop()));
    if (connectTimeout) {
      clearTimeout(connectTimeout);
      connectTimeout = null;
    }
    try {
      socket?.offAny?.();
      socket?.removeAllListeners?.();
      socket?.disconnect?.();
    } catch {
      // best effort
    }
    socket = null;
  }

  function summary() {
    const panelSummaries = panels.map((panel) => panel.summary());
    const totals = panelSummaries.reduce(
      (acc, panel) => {
        acc.invalidateCount += Number(panel.invalidateCount || 0);
        acc.reloadCount += Number(panel.reloadCount || 0);
        acc.requestCount += Number(panel.requestCount || 0);
        acc.errorCount += Number(panel.errorCount || 0);
        acc.cacheHits += Number(panel.cacheHits || 0);
        return acc;
      },
      { invalidateCount: 0, reloadCount: 0, requestCount: 0, errorCount: 0, cacheHits: 0 }
    );

    const latencies = [];
    for (const panel of panels) {
      for (const n of panel.metrics.latencies) latencies.push(n);
    }

    return {
      profile: "readstorm",
      session: name,
      panelCount: panels.length,
      totals,
      latencyMs: summarizeLatencies(latencies),
      panels: panelSummaries,
    };
  }

  return {
    name,
    token,
    panels,
    start,
    stop,
    summary,
  };
}

async function clearBenchmarkPasswordChangeRequirement(...targets) {
  const flatTargets = targets.flat ? targets.flat(Infinity) : targets.reduce((acc, item) => acc.concat(item), []);
  const emails = new Set();
  const ids = new Set();

  for (const item of flatTargets) {
    if (item == null) continue;

    if (typeof item === "string" || typeof item === "number") {
      const value = String(item).trim();
      if (!value) continue;
      if (value.includes("@")) emails.add(value.toLowerCase());
      else ids.add(value);
      continue;
    }

    if (typeof item === "object") {
      for (const key of ["email", "identifier", "username"]) {
        const value = String(item?.[key] || "").trim();
        if (value && value.includes("@")) emails.add(value.toLowerCase());
      }
      for (const key of ["id", "userId", "driverId"]) {
        const value = item?.[key];
        if (value != null && String(value).trim()) ids.add(String(value).trim());
      }
    }
  }

  const lowerEmails = Array.from(emails);
  const stringIds = Array.from(ids);
  const shouldMatch = (value, key = "") => {
    const text = `${String(key || "")} ${JSON.stringify(value || "")}`.toLowerCase();
    if (text.includes("bench-")) return true;
    if (lowerEmails.some((email) => text.includes(email))) return true;
    return stringIds.some((id) => {
      const safe = String(id).toLowerCase();
      return text.includes(`"${safe}"`) || text.includes(`:${safe}`) || text.includes(` ${safe} `);
    });
  };

  const possibleDelegates = [
    prisma?.passwordChangeRequirement,
    prisma?.passwordChangeRequirements,
    prisma?.userPasswordChangeRequirement,
    prisma?.userPasswordChangeRequirements,
  ].filter((delegate) => delegate && typeof delegate.deleteMany === "function");

  for (const delegate of possibleDelegates) {
    const attempts = [];
    if (lowerEmails.length) {
      attempts.push({ email: { in: lowerEmails } });
      attempts.push({ identifier: { in: lowerEmails } });
      attempts.push({ user: { email: { in: lowerEmails } } });
    }
    if (stringIds.length) {
      const numericIds = stringIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      attempts.push({ userId: { in: numericIds.length ? numericIds : stringIds } });
      attempts.push({ id: { in: numericIds.length ? numericIds : stringIds } });
    }

    for (const where of attempts) {
      try {
        await delegate.deleteMany({ where });
      } catch {
        // Delegate shape can differ by project version; JSON store cleanup below is the canonical fallback.
      }
    }
  }

  const runtimeFiles = [
    path.join(repoRoot, "backend", "artifacts", "runtime-data", "password-change-requirements.json"),
    path.join(repoRoot, "artifacts", "runtime-data", "password-change-requirements.json"),
    path.join(repoRoot, "backend", "data", "password-change-requirements.json"),
    path.join(repoRoot, "data", "password-change-requirements.json"),
  ];

  for (const file of runtimeFiles) {
    if (!fs.existsSync(file)) continue;

    try {
      const raw = fs.readFileSync(file, "utf8").trim();
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      let next = parsed;
      let changed = false;

      if (Array.isArray(parsed)) {
        next = parsed.filter((item) => !shouldMatch(item));
        changed = next.length !== parsed.length;
      } else if (parsed && typeof parsed === "object") {
        next = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (shouldMatch(value, key)) {
            changed = true;
            continue;
          }
          next[key] = value;
        }
      }

      if (changed) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      }
    } catch (err) {
      console.warn(`WARN could not clean password-change runtime file ${file}: ${err.message}`);
    }
  }
}

async function loginBenchmarkUser(identifier, password, deviceId = null) {
  const body = {
    identifier,
    password,
    greenpackBypass: true,
  };
  if (deviceId) body.deviceId = deviceId;

  const resp = await requestJson("POST", "/api/auth/login", {
    body,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    greenpackBypass: true,
  });

  if (!resp.ok || !resp.json?.token) {
    throw new Error(`benchmark login failed for ${identifier}: ${resp.status}\n${String(resp.text || "").slice(0, 400)}`);
  }

  return {
    token: String(resp.json.token || "").trim(),
    refreshToken: resp.json.refreshToken ? String(resp.json.refreshToken).trim() : null,
    deviceId: resp.json.deviceId || deviceId || null,
  };
}

function createPanelBench({ panelProfile, seed }) {
  const profile = String(panelProfile || DEFAULT_PANEL_PROFILE).trim().toLowerCase();
  if (profile === DEFAULT_PANEL_PROFILE) return null;

  if (!seed?.items?.length) {
    throw new Error("panel benchmark requires seeded vehicles");
  }

  const first = seed.items[0];
  const driverToken = String(first?.token || "").trim();
  const companyToken = String(seed?.company?.token || seed?.companyUser?.token || "").trim();
  const roomToken = String(seed?.room?.token || seed?.roomUser?.token || "").trim();
  const driverShiftId = Number(first?.shiftId || 0);
  const companyCache = new Map();

  const driverToday = createPanelProbe({
    name: "driverToday",
    sessionName: "driver",
    token: driverToken,
    topicModes: { shifts: "reload" },
    debounceMs: DEFAULT_PANEL_DEBOUNCE_MS,
    pollMs: 5000,
    load: async ({ request }) => {
      await request("GET", "/api/driver/shifts/today", {}, "initial");
    },
  });

  const driverRoute = createPanelProbe({
    name: "driverRoute",
    sessionName: "driver",
    token: driverToken,
    topicModes: { shifts: "reload" },
    debounceMs: DEFAULT_PANEL_DEBOUNCE_MS,
    pollMs: 5000,
    load: async ({ request }) => {
      const routePath = driverShiftId ? `/api/driver/shifts/${driverShiftId}/route` : "/api/driver/route/active";
      await request("GET", routePath, {}, "initial");
    },
  });

  const driverMap = createPanelProbe({
    name: "driverMap",
    sessionName: "driver",
    token: driverToken,
    topicModes: {
      gps: "patch",
      vehicles: (msg) => (String(msg?._event || "") === "vehicle:status" ? "patch" : "reload"),
      shifts: "reload",
    },
    debounceMs: DEFAULT_PANEL_DEBOUNCE_MS,
    pollMs: 15_000,
    load: async ({ request }) => {
      await request("GET", "/api/live/vehicles", {}, "initial");
      await request("GET", "/api/shifts/my", {}, "initial");
    },
  });

  const companyShifts = createPanelProbe({
    name: "companyShifts",
    sessionName: "company",
    token: companyToken,
    topicModes: {
      shifts: "reload",
      rooms: "noop",
    },
    debounceMs: 650,
    pollMs: 0,
    load: async ({ request, source }) => {
      await Promise.all([
        request("GET", "/api/shifts?take=32", { ttlMs: 25_000, cacheKey: "company:shifts", cacheStore: companyCache }, source),
        request("GET", "/api/agreements?take=200", { ttlMs: 8_000, cacheKey: "company:agreements", cacheStore: companyCache }, source),
      ]);
      await request("GET", "/api/company/overview/commercial-flow-summary", {
        ttlMs: 20_000,
        cacheKey: "company:commercial-flow-summary",
        cacheStore: companyCache,
      }, source);
    },
  });

  const roomShifts = createPanelProbe({
    name: "roomShifts",
    sessionName: "room",
    token: roomToken,
    topicModes: {
      shifts: "reload",
      drivers: "reload",
      rooms: "reload",
    },
    debounceMs: DEFAULT_PANEL_DEBOUNCE_MS,
    pollMs: 0,
    load: async ({ request }) => {
      await Promise.all([
        request("GET", "/api/shifts?take=200&includeOffered=1", {}, "initial"),
        request("GET", "/api/vehicles", {}, "initial"),
        request("GET", "/api/drivers", {}, "initial"),
        request("GET", "/api/rooms", {}, "initial"),
        request("GET", "/api/offers/inbox?status=OPEN,COUNTERED,ACCEPTED&take=300", {}, "initial"),
      ]);
    },
  });

  const notifications = createPanelProbe({
    name: "notifications",
    sessionName: "company",
    token: companyToken,
    topicModes: { notifications: "reload" },
    debounceMs: DEFAULT_PANEL_DEBOUNCE_MS,
    pollMs: 0,
    load: async ({ request }) => {
      await request("GET", "/api/notifications/my", {}, "initial");
    },
  });

  const sessions = [
    createPanelSession({ name: "driver", token: driverToken, panels: [driverToday, driverRoute, driverMap] }),
    createPanelSession({ name: "company", token: companyToken, panels: [companyShifts, notifications] }),
    createPanelSession({ name: "room", token: roomToken, panels: [roomShifts] }),
  ];

  function summary() {
    const sessionSummaries = sessions.map((session) => session.summary());
    const totals = sessionSummaries.reduce(
      (acc, session) => {
        acc.invalidateCount += Number(session?.totals?.invalidateCount || 0);
        acc.reloadCount += Number(session?.totals?.reloadCount || 0);
        acc.requestCount += Number(session?.totals?.requestCount || 0);
        acc.errorCount += Number(session?.totals?.errorCount || 0);
        acc.cacheHits += Number(session?.totals?.cacheHits || 0);
        return acc;
      },
      { invalidateCount: 0, reloadCount: 0, requestCount: 0, errorCount: 0, cacheHits: 0 }
    );

    const allLatencies = [];
    for (const session of sessions) {
      for (const panel of session.panels || []) {
        for (const n of panel?.metrics?.latencies || []) {
          if (Number.isFinite(Number(n))) allLatencies.push(Number(n));
        }
      }
    }

    return {
      enabled: true,
      profile,
      sessionCount: sessions.length,
      panelCount: sessions.reduce((sum, session) => sum + Number(session.panels.length || 0), 0),
      websocketConsumers: sessions.length,
      totals,
      latencyMs: summarizeLatencies(allLatencies),
      sessions: sessionSummaries,
    };
  }

  return {
    enabled: true,
    profile,
    driverToken,
    companyToken,
    roomToken,
    driverShiftId,
    sessions,
    start: async () => {
      await Promise.all(sessions.map((session) => session.start()));
    },
    stop: async () => {
      await Promise.allSettled(sessions.map((session) => session.stop()));
    },
    summary,
  };
}

function buildSamplePayload({ vehicleId, baseLat, baseLng, cycle, scenario }) {
  const isAutoReached = scenario === "auto-reached";
  const drift = cycle * (isAutoReached ? 0.00002 : 0.00015);
  return {
    vehicleId,
    lat: Number((baseLat + drift).toFixed(6)),
    lng: Number((baseLng + drift).toFixed(6)),
    speed: isAutoReached ? 10 : 28,
    ts: new Date().toISOString(),
  };
}

async function ensureBenchmarkFleet(vehicleCount, benchTag, { scenario, cycles }) {
  const companyName = `${benchTag} COMPANY`;
  const roomName = `${benchTag} ROOM`;
  const safeTag = String(benchTag || "bench")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "bench";
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const stopCount = scenario === "auto-reached" ? Math.max(1, cycles) : 0;

  let company = await prisma.company.findFirst({
    where: { name: companyName },
    select: { id: true, name: true },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: companyName,
        status: "ACTIVE",
        notes: benchTag,
      },
      select: { id: true, name: true },
    });
  }

  let room = await prisma.room.findFirst({
    where: { name: roomName },
    select: { id: true, name: true },
  });
  if (!room) {
    room = await prisma.room.create({
      data: {
        name: roomName,
        status: "ACTIVE",
        notes: benchTag,
      },
      select: { id: true, name: true },
    });
  }

  const companyUserEmail = `bench-company-${safeTag}@company.local`;
  const roomUserEmail = `bench-room-${safeTag}@room.local`;

  const companyUser = await prisma.user.upsert({
    where: { email: companyUserEmail },
    update: {
      role: "COMPANY",
      fullName: `${benchTag} Company User`,
      roomId: null,
      companyId: company.id,
      passwordHash,
      deviceId: `bench-company-${safeTag}`,
      deviceBoundAt: new Date(),
      deviceLastSeenAt: new Date(),
    },
    create: {
      email: companyUserEmail,
      role: "COMPANY",
      fullName: `${benchTag} Company User`,
      companyId: company.id,
      passwordHash,
      deviceId: `bench-company-${safeTag}`,
      deviceBoundAt: new Date(),
      deviceLastSeenAt: new Date(),
    },
  });

  const roomUser = await prisma.user.upsert({
    where: { email: roomUserEmail },
    update: {
      role: "ROOM",
      fullName: `${benchTag} Room User`,
      roomId: room.id,
      companyId: company.id,
      passwordHash,
      deviceId: `bench-room-${safeTag}`,
      deviceBoundAt: new Date(),
      deviceLastSeenAt: new Date(),
    },
    create: {
      email: roomUserEmail,
      role: "ROOM",
      fullName: `${benchTag} Room User`,
      companyId: company.id,
      roomId: room.id,
      passwordHash,
      deviceId: `bench-room-${safeTag}`,
      deviceBoundAt: new Date(),
      deviceLastSeenAt: new Date(),
    },
  });

  const docKey = CONSENT_DOCS.LOCATION.docKey;
  const docVersion = String(CONSENT_DOCS.LOCATION.docVersion || "1");
  const seedItems = [];

  for (let i = 1; i <= vehicleCount; i += 1) {
    const seq = String(i).padStart(3, "0");
    const email = `bench-driver-${seq}@driver.local`;
    const driverCode = `BENCH-DRV-${seq}`;
    const plate = `BENCH-${seq}`;
    const deviceId = `bench-device-${seq}`;
    const fullName = `Bench Driver ${seq}`;
    const phone = `+90 555 900 ${seq}`;
    const baseLat = 41.0 + i * 0.0005;
    const baseLng = 29.0 + i * 0.0005;
    const seedLat = baseLat - 0.0015;
    const seedLng = baseLng - 0.0015;
    const startAt = new Date(Date.now() - 2 * 60_000);
    const endAt = new Date(Date.now() + 70 * 60_000);

    const row = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: {
          role: "DRIVER",
          fullName,
          phone,
          roomId: room.id,
          passwordHash,
          deviceId,
          deviceBoundAt: new Date(),
          deviceLastSeenAt: new Date(),
        },
        create: {
          email,
          role: "DRIVER",
          fullName,
          phone,
          roomId: room.id,
          passwordHash,
          deviceId,
          deviceBoundAt: new Date(),
          deviceLastSeenAt: new Date(),
        },
      });

      const driver = await tx.driver.upsert({
        where: { driverCode },
        update: {
          roomId: room.id,
          fullName,
          phone,
          deviceInfo: "Benchmark GPS Device",
          userId: user.id,
          pinTemporary: false,
          pinUpdatedAt: new Date(),
        },
        create: {
          roomId: room.id,
          fullName,
          phone,
          deviceInfo: "Benchmark GPS Device",
          driverCode,
          userId: user.id,
          pinTemporary: false,
          pinUpdatedAt: new Date(),
        },
      });

      const vehicle = await tx.vehicle.upsert({
        where: { plate },
        update: {
          roomId: room.id,
          capacity: 16,
          status: "ACTIVE",
          speedLimitKmh: 80,
          driverId: driver.id,
          nextMaintenanceAt: null,
        },
        create: {
          roomId: room.id,
          plate,
          capacity: 16,
          status: "ACTIVE",
          speedLimitKmh: 80,
          driverId: driver.id,
        },
      });

      await tx.consent.upsert({
        where: {
          userId_docKey_docVersion: {
            userId: user.id,
            docKey,
            docVersion,
          },
        },
        update: {
          role: "DRIVER",
          revokedAt: null,
          acceptedAt: new Date(),
          ip: "127.0.0.1",
          userAgent: benchTag,
        },
        create: {
          userId: user.id,
          role: "DRIVER",
          docKey,
          docVersion,
          acceptedAt: new Date(),
          ip: "127.0.0.1",
          userAgent: benchTag,
        },
      });

      await tx.gpsLast.upsert({
        where: { vehicleId: vehicle.id },
        update: {
          lat: seedLat,
          lng: seedLng,
          speed: 0,
          at: new Date(Date.now() - 10 * 60_000),
          status: "OK",
        },
        create: {
          vehicleId: vehicle.id,
          lat: seedLat,
          lng: seedLng,
          speed: 0,
          at: new Date(Date.now() - 10 * 60_000),
          status: "OK",
        },
      });

      let shift = await tx.shift.findFirst({
        where: {
          companyId: company.id,
          roomId: room.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
        },
        select: { id: true },
      });

      if (shift) {
        await tx.shift.update({
          where: { id: shift.id },
          data: {
            companyId: company.id,
            roomId: room.id,
            vehicleId: vehicle.id,
            driverId: driver.id,
            startAt,
            endAt,
            status: "APPROVED",
          },
        });
      } else {
        shift = await tx.shift.create({
          data: {
            companyId: company.id,
            roomId: room.id,
            vehicleId: vehicle.id,
            driverId: driver.id,
            startAt,
            endAt,
            status: "APPROVED",
          },
          select: { id: true },
        });
      }

      await tx.stop.deleteMany({ where: { shiftId: shift.id } });

      if (stopCount > 0) {
        const stopData = Array.from({ length: stopCount }, (_, idx) => ({
          shiftId: shift.id,
          name: `Bench Stop ${seq}-${String(idx + 1).padStart(2, "0")}`,
          lat: baseLat,
          lng: baseLng,
          order: idx + 1,
          type: "COMMON",
        }));
        await tx.stop.createMany({ data: stopData });
      }

      await tx.shiftProgress.upsert({
        where: { shiftId: shift.id },
        update: {
          lastReachedOrder: 0,
          startedAt: null,
          pausedAt: null,
          completedAt: null,
        },
        create: {
          shiftId: shift.id,
          lastReachedOrder: 0,
        },
      });

      return {
        benchIndex: i - 1,
        userId: user.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        shiftId: shift.id,
        email,
        token: null,
        baseLat,
        baseLng,
        seedLat,
        seedLng,
        stopCount,
        driverCode,
        plate,
        deviceId,
      };
    });

    seedItems.push(row);
  }

  await clearBenchmarkPasswordChangeRequirement(companyUser.id);


  await clearBenchmarkPasswordChangeRequirement(roomUser.id);


  const companyLogin = await loginBenchmarkUser(companyUserEmail, DEFAULT_PASSWORD, `bench-company-${safeTag}`);
  const roomLogin = await loginBenchmarkUser(roomUserEmail, DEFAULT_PASSWORD, `bench-room-${safeTag}`);
  company.token = companyLogin.token;
  company.refreshToken = companyLogin.refreshToken;
  company.deviceId = companyLogin.deviceId;
  room.token = roomLogin.token;
  room.refreshToken = roomLogin.refreshToken;
  room.deviceId = roomLogin.deviceId;

  for (const item of seedItems) {
    await clearBenchmarkPasswordChangeRequirement(item.userId);

    const login = await loginBenchmarkUser(item.email, DEFAULT_PASSWORD, item.deviceId);
    item.token = login.token;
    item.refreshToken = login.refreshToken;
  }

  return {
    company,
    room,
    companyUser,
    roomUser,
    items: seedItems,
  };
}

function buildReport({ benchTag, scenario, vehicles, cycles, intervalMs, baseUrl, seed, samples, startedAt, finishedAt, panels = null }) {
  const latencies = summarizeLatencies(samples);
  const statusCounts = new Map();
  let okCount = 0;
  let throttledCount = 0;
  let errorCount = 0;

  for (const sample of samples) {
    statusCounts.set(sample.status, (statusCounts.get(sample.status) || 0) + 1);
    if (sample.ok) okCount += 1;
    if (sample.throttled) throttledCount += 1;
    if (!sample.ok) errorCount += 1;
  }

  const panelSummary = panels?.summary?.() || null;
  const panelCounts = panelSummary?.totals || {
    invalidateCount: 0,
    reloadCount: 0,
    requestCount: 0,
    errorCount: 0,
    cacheHits: 0,
  };

  return {
    benchmark: {
      name: `${scenario === "auto-reached" ? "gps_auto_reached" : "gps_publish_only"}${panelSummary ? "_readstorm" : ""}`,
      scenario,
      benchTag,
      baseUrl,
      vehicles,
      cycles,
      intervalMs,
      throttle: "server throttle on",
      websocketConsumers: panelSummary?.sessionCount || 0,
      panelProfile: panelSummary?.profile || "none",
      panels: panelSummary?.panelCount || 0,
    },
    seed,
    timing: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    },
    counts: {
      requestCount: samples.length,
      okCount,
      throttledCount,
      errorCount,
      panelRequestCount: panelCounts.requestCount || 0,
      panelReloadCount: panelCounts.reloadCount || 0,
      panelInvalidateCount: panelCounts.invalidateCount || 0,
      totalRequestCount: samples.length + Number(panelCounts.requestCount || 0),
      totalErrorCount: errorCount + Number(panelCounts.errorCount || 0),
    },
    latencyMs: {
      min: roundMs(latencies.min),
      avg: roundMs(latencies.avg),
      p50: roundMs(latencies.p50),
      p95: roundMs(latencies.p95),
      p99: roundMs(latencies.p99),
      max: roundMs(latencies.max),
    },
    statusCounts: Object.fromEntries(statusCounts.entries()),
    panels: panelSummary,
    samples,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const benchTag = String(args.tag || process.env.BENCH_TAG || DEFAULT_BENCH_TAG).trim();
  const scenario = String(args.scenario || process.env.BENCH_SCENARIO || DEFAULT_SCENARIO).trim().toLowerCase();
  const panelProfile = String(args.panelProfile || args.panels || process.env.BENCH_PANEL_PROFILE || DEFAULT_PANEL_PROFILE).trim().toLowerCase();
  const vehicles = pickInt(args.vehicles || process.env.BENCH_VEHICLES, DEFAULT_VEHICLES);
  const cycles = pickInt(args.cycles || process.env.BENCH_CYCLES, DEFAULT_CYCLES);
  const intervalMs = pickInt(args.intervalMs || process.env.BENCH_INTERVAL_MS, DEFAULT_INTERVAL_MS);
  const outputDir = String(args.outputDir || process.env.BENCH_OUTPUT_DIR || DEFAULT_OUTPUT_DIR).trim();
  const outputFile = String(args.output || process.env.BENCH_OUTPUT || "").trim();
  const skipSeed = String(args.skipSeed || process.env.BENCH_SKIP_SEED || "").trim() === "1";

  console.log("");
  console.log("=== GPS BENCH ===");
  console.log(`benchmark: ${benchTag}`);
  console.log(`scenario: ${scenario}`);
  console.log(`panelProfile: ${panelProfile}`);
  console.log(`baseUrl: ${DEFAULT_BASE_URL}`);
  console.log(`vehicles: ${vehicles}`);
  console.log(`cycles: ${cycles}`);
  console.log(`intervalMs: ${intervalMs}`);
  console.log(`seed: ${skipSeed ? "reuse-or-seed" : "enabled"}`);

  if (!["publish-only", "auto-reached"].includes(scenario)) {
    throw new Error(`unsupported scenario: ${scenario}`);
  }

  const health = await requestJson("GET", "/health", {});
  if (!health.ok) {
    throw new Error(`health check failed: ${health.status}\n${String(health.text || "").slice(0, 400)}`);
  }

  const startedAt = new Date();

  console.log("seeding benchmark fleet...");
  const seed = await ensureBenchmarkFleet(vehicles, benchTag, { scenario, cycles });
  console.log(`seed ready: company=${seed.company.id} room=${seed.room.id} vehicles=${seed.items.length}`);

  const panelBench = createPanelBench({ panelProfile, seed });
  if (panelBench) {
    console.log(`panel benchmark: enabled (${panelBench.profile}, sessions=${panelBench.sessions.length})`);
    await panelBench.start();
    console.log(`panel sessions ready: ${panelBench.sessions.map((s) => s.name).join(", ")}`);
  } else {
    console.log("panel benchmark: disabled");
  }

  const samples = [];
  const errors = [];
  const promises = [];
  const spacingMs = Math.max(1, Math.floor(intervalMs / vehicles));

  for (const item of seed.items) {
    for (let cycle = 0; cycle < cycles; cycle += 1) {
      const offsetMs = cycle * intervalMs + item.benchIndex * spacingMs;
      promises.push((async () => {
        await sleep(offsetMs);
        const payload = buildSamplePayload({
          vehicleId: item.vehicleId,
          baseLat: item.baseLat,
          baseLng: item.baseLng,
          cycle,
          scenario,
        });

        const t0 = performance.now();
        const resp = await requestJson("POST", "/api/gps", {
          token: item.token,
          body: payload,
          timeoutMs: DEFAULT_TIMEOUT_MS,
        });
        const latencyMs = performance.now() - t0;
        const throttled = Boolean(resp.ok && resp.json && resp.json.throttled);
        const sample = {
          vehicleId: item.vehicleId,
          driverId: item.driverId,
          shiftId: item.shiftId,
          cycle,
          status: resp.status,
          ok: resp.ok,
          throttled,
          latencyMs: roundMs(latencyMs),
        };
        samples.push(sample);
        if (!resp.ok || throttled) {
          errors.push({
            vehicleId: item.vehicleId,
            driverId: item.driverId,
            shiftId: item.shiftId,
            cycle,
            status: resp.status,
            throttled,
            text: String(resp.text || "").slice(0, 240),
          });
        }
      })());
    }
  }

  await Promise.all(promises);

  if (panelBench) {
    await sleep(DEFAULT_PANEL_DRAIN_MS);
    await panelBench.stop();
  }

  const finishedAt = new Date();
  const report = buildReport({
    benchTag,
    scenario,
    vehicles,
    cycles,
    intervalMs,
    baseUrl: DEFAULT_BASE_URL,
    seed: {
      companyId: seed.company.id,
      roomId: seed.room.id,
      drivers: seed.items.length,
      vehicles: seed.items.length,
      shifts: seed.items.length,
      consents: seed.items.length,
      companyUsers: 1,
      roomUsers: 1,
      stopCount: seed.items.reduce((sum, item) => sum + Number(item.stopCount || 0), 0),
      docKey: CONSENT_DOCS.LOCATION.docKey,
      docVersion: String(CONSENT_DOCS.LOCATION.docVersion || "1"),
      scenario,
    },
    samples,
    startedAt,
    finishedAt,
    panels: panelBench,
  });

  report.errors = errors;

  const summaryLine = [
    `requests=${report.counts.requestCount}`,
    `ok=${report.counts.okCount}`,
    `throttled=${report.counts.throttledCount}`,
    `errors=${report.counts.errorCount}`,
    `p50=${report.latencyMs.p50}ms`,
    `p95=${report.latencyMs.p95}ms`,
    `p99=${report.latencyMs.p99}ms`,
    `duration=${report.timing.durationMs}ms`,
    `panelRequests=${report.counts.panelRequestCount || 0}`,
    `panelReloads=${report.counts.panelReloadCount || 0}`,
    `panelInvalidations=${report.counts.panelInvalidateCount || 0}`,
  ].join(" ");

  console.log(`bench summary: ${summaryLine}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resolvedOutput = outputFile || path.join(outputDir, `gps_${scenario}_${vehicles}veh_${cycles}cycles_${stamp}.json`);
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`report written: ${resolvedOutput}`);

  if (report.counts.errorCount > 0) {
    console.log(`errors (first 5): ${JSON.stringify(errors.slice(0, 5), null, 2)}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});


