import crypto from "node:crypto";
import net from "node:net";

import { getRedis } from "../redis/index.js";
import logger from "../lib/logger.js";

const RELAY_CHANNEL = "ws:relay:v1";
const INSTANCE_ID = `${process.pid}:${crypto.randomBytes(8).toString("hex")}`;

function flattenRooms(values) {
  const out = [];

  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }

    if (value == null) return;
    const room = String(value).trim();
    if (room) out.push(room);
  };

  for (const value of values || []) visit(value);

  return Array.from(new Set(out));
}

function mergeRooms(existing, next) {
  return Array.from(new Set([...(existing || []), ...(next || [])]));
}

function encodeCommand(parts) {
  const arr = parts.map((p) => (p === undefined || p === null ? "" : String(p)));
  let out = `*${arr.length}\r\n`;
  for (const a of arr) {
    const b = Buffer.from(a);
    out += `$${b.length}\r\n`;
    out += a + "\r\n";
  }
  return out;
}

function readLine(buf, start) {
  const idx = buf.indexOf("\r\n", start);
  if (idx === -1) return null;
  const line = buf.slice(start, idx).toString("utf8");
  return { line, next: idx + 2 };
}

function parseResp(buf, start = 0) {
  if (start >= buf.length) return null;
  const prefix = buf[start];

  if (prefix === 43) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    return { value: r.line, next: r.next };
  }

  if (prefix === 45) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    return { value: new Error(r.line), next: r.next };
  }

  if (prefix === 58) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    const n = Number(r.line);
    return { value: Number.isFinite(n) ? n : 0, next: r.next };
  }

  if (prefix === 36) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    const len = Number(r.line);
    if (len === -1) return { value: null, next: r.next };
    if (!Number.isFinite(len) || len < 0) throw new Error(`Bad bulk length: ${r.line}`);
    const end = r.next + len;
    if (buf.length < end + 2) return null;
    const s = buf.slice(r.next, end).toString("utf8");
    if (buf[end] !== 13 || buf[end + 1] !== 10) throw new Error("Bad bulk termination");
    return { value: s, next: end + 2 };
  }

  if (prefix === 42) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    const n = Number(r.line);
    if (n === -1) return { value: null, next: r.next };
    if (!Number.isFinite(n) || n < 0) throw new Error(`Bad array length: ${r.line}`);
    const items = [];
    let cur = r.next;
    for (let i = 0; i < n; i += 1) {
      const it = parseResp(buf, cur);
      if (!it) return null;
      items.push(it.value);
      cur = it.next;
    }
    return { value: items, next: cur };
  }

  throw new Error(`Unknown RESP prefix: ${String.fromCharCode(prefix)} (${prefix})`);
}

function createRedisSubscriber(redisUrl, onMessage) {
  const url = new URL(redisUrl);
  const host = url.hostname || "127.0.0.1";
  const port = Number(url.port || 6379);
  const password = decodeURIComponent(url.password || "");
  const username = decodeURIComponent(url.username || "");
  const db = Number(url.pathname.replace(/^\//, "") || 0);

  let sock = null;
  let buffer = Buffer.alloc(0);
  let connected = false;
  let connecting = false;
  let stopped = false;

  function sendCommand(...parts) {
    const payload = encodeCommand(parts);
    sock?.write(payload);
  }

  function subscribe() {
    sendCommand("SUBSCRIBE", RELAY_CHANNEL);
  }

  function connect() {
    if (stopped || connected || connecting) return;
    connecting = true;

    sock = net.createConnection({ host, port });

    sock.on("connect", () => {
      connected = true;
      connecting = false;

      try {
        if (username || password) {
          sendCommand("AUTH", username || "default", password);
        }
        if (Number.isFinite(db) && db > 0) {
          sendCommand("SELECT", String(db));
        }
        subscribe();
      } catch (e) {
        logger.debug("[ws-relay] subscriber setup failed:", e?.message || e);
      }
    });

    sock.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length > 0) {
        let parsed;
        try {
          parsed = parseResp(buffer, 0);
        } catch (e) {
          logger.debug("[ws-relay] subscriber parse failed:", e?.message || e);
          buffer = Buffer.alloc(0);
          break;
        }

        if (!parsed) break;
        buffer = buffer.slice(parsed.next);

        const value = parsed.value;
        if (!Array.isArray(value) || value.length < 3) continue;
        const kind = String(value[0] || "").toLowerCase();
        if (kind !== "message") continue;

        const channel = String(value[1] || "");
        const payload = String(value[2] || "");
        onMessage?.(channel, payload);
      }
    });

    sock.on("error", (err) => {
      connected = false;
      connecting = false;
      if (!stopped) {
        logger.debug("[ws-relay] subscriber error:", err?.message || err);
        setTimeout(connect, 500);
      }
    });

    sock.on("close", () => {
      connected = false;
      connecting = false;
      if (!stopped) {
        setTimeout(connect, 500);
      }
    });
  }

  connect();

  return () => {
    stopped = true;
    try {
      sock?.end();
    } catch {}
    try {
      sock?.destroy?.();
    } catch {}
    sock = null;
  };
}

export function installSocketRelay(io, { redisUrl = String(process.env.REDIS_URL || "") } = {}) {
  if (!io) return () => {};
  if (!redisUrl) return () => {};

  const redis = getRedis();
  if (!redis?.send) return () => {};

  const baseTo = io.to.bind(io);
  const baseIn = typeof io.in === "function" ? io.in.bind(io) : null;
  const baseEmit = typeof io.emit === "function" ? io.emit.bind(io) : null;

  const publish = (message) => {
    try {
      void redis.send("PUBLISH", RELAY_CHANNEL, JSON.stringify(message)).catch((err) => {
        logger.debug("[ws-relay] publish failed:", err?.message || err);
      });
    } catch (err) {
      logger.debug("[ws-relay] publish exception:", err?.message || err);
    }
  };

  const relayLocal = (event, payload, rooms, isGlobal) => {
    if (isGlobal || !rooms.length) {
      return baseEmit ? baseEmit(event, payload) : undefined;
    }
    return baseTo(rooms).emit(event, payload);
  };

  const handleRelay = (channel, rawPayload) => {
    if (channel !== RELAY_CHANNEL) return;

    let packet = null;
    try {
      packet = JSON.parse(rawPayload);
    } catch {
      return;
    }

    if (!packet || packet.o === INSTANCE_ID) return;

    const event = String(packet.e || "");
    if (!event) return;

    const payload = packet.p;
    const rooms = flattenRooms(packet.r || []);
    const isGlobal = Boolean(packet.g);

    relayLocal(event, payload, rooms, isGlobal);
  };

  const stopSubscriber = createRedisSubscriber(redisUrl, handleRelay);

  function wrapOperator(operator, rooms) {
    const roomList = flattenRooms(rooms);

    return new Proxy(operator, {
      get(target, prop, receiver) {
        if (prop === "emit") {
          return (event, payload) => {
            const result = target.emit(event, payload);
            publish({
              v: 1,
              o: INSTANCE_ID,
              e: String(event || ""),
              p: payload,
              r: roomList,
              g: false,
            });
            return result;
          };
        }

        if ((prop === "to" || prop === "in") && typeof target[prop] === "function") {
          return (...nextRooms) => wrapOperator(target[prop](...nextRooms), mergeRooms(roomList, flattenRooms(nextRooms)));
        }

        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          return (...args) => {
            const out = value.apply(target, args);
            if (out && typeof out === "object" && typeof out.emit === "function") {
              return wrapOperator(out, roomList);
            }
            return out;
          };
        }

        return value;
      },
    });
  }

  io.to = (...rooms) => wrapOperator(baseTo(...rooms), flattenRooms(rooms));
  if (baseIn) io.in = (...rooms) => wrapOperator(baseIn(...rooms), flattenRooms(rooms));
  io.emit = (event, payload) => {
    const result = baseEmit ? baseEmit(event, payload) : undefined;
    publish({
      v: 1,
      o: INSTANCE_ID,
      e: String(event || ""),
      p: payload,
      r: [],
      g: true,
    });
    return result;
  };

  return () => {
    stopSubscriber?.();
    io.to = baseTo;
    if (baseIn) io.in = baseIn;
    if (baseEmit) io.emit = baseEmit;
  };
}

