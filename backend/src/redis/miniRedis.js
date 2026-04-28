// backend/src/redis/miniRedis.js
// Minimal Redis client (RESP2) with FIFO request/response queue.
// Purpose: avoid new npm deps; sufficient for rate-limit + gps throttle.

import net from "net";

class RedisProtoError extends Error {
  constructor(message) {
    super(message);
    this.name = "RedisProtoError";
  }
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

  // + simple string
  if (prefix === 43) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    return { value: r.line, next: r.next };
  }

  // - error
  if (prefix === 45) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    return { value: new RedisProtoError(r.line), next: r.next };
  }

  // : integer
  if (prefix === 58) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    const n = Number(r.line);
    return { value: Number.isFinite(n) ? n : 0, next: r.next };
  }

  // $ bulk string
  if (prefix === 36) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    const len = Number(r.line);
    if (len === -1) return { value: null, next: r.next };
    if (!Number.isFinite(len) || len < 0) throw new RedisProtoError(`Bad bulk length: ${r.line}`);
    const end = r.next + len;
    if (buf.length < end + 2) return null;
    const s = buf.slice(r.next, end).toString("utf8");
    if (buf[end] !== 13 || buf[end + 1] !== 10) throw new RedisProtoError("Bad bulk termination");
    return { value: s, next: end + 2 };
  }

  // * array
  if (prefix === 42) {
    const r = readLine(buf, start + 1);
    if (!r) return null;
    const n = Number(r.line);
    if (n === -1) return { value: null, next: r.next };
    if (!Number.isFinite(n) || n < 0) throw new RedisProtoError(`Bad array length: ${r.line}`);
    const items = [];
    let cur = r.next;
    for (let i = 0; i < n; i++) {
      const it = parseResp(buf, cur);
      if (!it) return null;
      items.push(it.value);
      cur = it.next;
    }
    return { value: items, next: cur };
  }

  throw new RedisProtoError(`Unknown RESP prefix: ${String.fromCharCode(prefix)} (${prefix})`);
}

export function createMiniRedisClient(redisUrl) {
  const url = new URL(redisUrl);
  const host = url.hostname || "127.0.0.1";
  const port = Number(url.port || 6379);

  let sock = null;
  let buffer = Buffer.alloc(0);
  let connected = false;
  let connecting = false;
  let closing = false;
  const queue = [];

  function connect() {
    if (connected || connecting) return;
    connecting = true;

    sock = net.createConnection({ host, port });

    sock.on("connect", () => {
      connected = true;
      connecting = false;
    });

    sock.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (queue.length > 0) {
        let parsed;
        try {
          parsed = parseResp(buffer, 0);
        } catch (e) {
          const p = queue.shift();
          p?.reject?.(e);
          buffer = Buffer.alloc(0);
          continue;
        }
        if (!parsed) break;
        const { value, next } = parsed;
        buffer = buffer.slice(next);
        const p = queue.shift();
        if (!p) continue;
        if (value instanceof Error) p.reject(value);
        else p.resolve(value);
      }
    });

    function failAll(err) {
      while (queue.length) {
        const p = queue.shift();
        p?.reject?.(err);
      }
    }

    sock.on("error", (err) => {
      connected = false;
      connecting = false;
      failAll(err);
    });

    sock.on("close", () => {
      connected = false;
      connecting = false;
      if (!closing) {
        // reconnect
        setTimeout(() => connect(), 500);
      }
    });
  }

  connect();

  async function send(command, ...args) {
    const parts = [String(command || "").toUpperCase(), ...args.map((a) => (a === undefined ? "" : String(a)))];
    return new Promise((resolve, reject) => {
      try {
        queue.push({ resolve, reject });
        if (!connected) connect();
        const payload = encodeCommand(parts);
        sock?.write(payload);
      } catch (e) {
        reject(e);
      }
    });
  }

  return {
    send,
    get connected() {
      return connected;
    },
    quit() {
      closing = true;
      try {
        sock?.end();
      } catch {}
    },
  };
}
