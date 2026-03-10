// backend/scripts/_harness.js
import http from "http";
import https from "https";

export const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

const GREENPACK_HEADER = process.env.GREENPACK_HEADER ?? "1";
const MIN_GAP_MS = Number(process.env.HTTP_THROTTLE_MS ?? 120);
const MAX_WAIT_MS = Number(process.env.HTTP_429_MAXWAIT_MS ?? 4 * 60_000);
const USE_EMOJI = !(String(process.env.NO_EMOJI ?? "").trim() === "1");

const I_OK = USE_EMOJI ? "OK" : "[OK]";
const I_FAIL = USE_EMOJI ? "FAIL" : "[FAIL]";
const I_INFO = USE_EMOJI ? "INFO" : "[i]";

let _lastHttpAt = 0;

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function throttle() {
  const now = Date.now();
  const dt = now - _lastHttpAt;
  if (dt < MIN_GAP_MS) await sleep(MIN_GAP_MS - dt);
  _lastHttpAt = Date.now();
}

export function ok(msg, cond = true) {
  if (cond) { console.log(`${I_OK} ${msg}`); return true; }
  console.log(`${I_FAIL} ${msg}`); return false;
}
export function must(msg, cond) {
  if (cond) { console.log(`${I_OK} ${msg}`); return true; }
  throw new Error(`${I_FAIL} ${msg}`);
}
export function banner(title = "") {
  const t = String(title || "").trim();
  console.log("");
  console.log(t ? `=== ${t} ===` : "===");
}
export function step(msg) { console.log(`${I_INFO} ${msg}`); }
export function assertOk(cond, label = "ok") {
  if (!cond) throw new Error(`ASSERT_FAIL: ${label}`);
  console.log(`${I_OK} ${label}`);
  return true;
}
function parseRetryAfterMs(headers) {
  const ra = headers?.["retry-after"];
  if (!ra) return null;
  const s = Number(ra);
  if (Number.isFinite(s) && s > 0) return Math.min(10 * 60_000, Math.max(250, Math.round(s * 1000)));
  const t = Date.parse(String(ra));
  if (Number.isFinite(t)) {
    const ms = t - Date.now();
    if (ms > 0) return Math.min(10 * 60_000, ms);
  }
  return null;
}
function parseRateLimitResetMs(headers) {
  const raw = headers?.["ratelimit-reset"];
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 1_000_000_000) {
    const ms = n * 1000 - Date.now();
    return ms > 0 ? Math.min(10 * 60_000, ms) : 0;
  }
  return Math.min(10 * 60_000, Math.round(n * 1000));
}
async function reqJsonOnce(method, path, { token, body, includeGreenpack = true } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const headers = { "Content-Type": "application/json" };
  if (includeGreenpack) headers["x-greenpack"] = GREENPACK_HEADER;
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Promise((resolve) => {
    const req = lib.request({ method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        const text = data || "";
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch {}
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, headers: res.headers ?? {}, json, text });
      });
    });
    req.on("error", (e) => resolve({ ok: false, status: 0, headers: {}, json: null, text: String(e) }));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}
export async function reqJson(method, path, { token, body, maxWaitMs = MAX_WAIT_MS, includeGreenpack = true } = {}) {
  const t0 = Date.now();
  let attempt = 0;
  while (true) {
    await throttle();
    const r = await reqJsonOnce(method, path, { token, body, includeGreenpack });
    if (r.ok) return r;
    if (r.status === 429) {
      const raMs = parseRetryAfterMs(r.headers);
      const rlMs = parseRateLimitResetMs(r.headers);
      const backoff = Math.min(10_000, 400 + attempt * 400);
      const waitMs = Math.max(raMs ?? 0, rlMs ?? 0, backoff);
      if (Date.now() - t0 + waitMs > maxWaitMs) {
        const msg = `${method} ${path} -> 429 (rate limited; maxWait exceeded)\n${String(r.text || "").slice(0, 800)}`;
        return { ok: false, status: 429, headers: r.headers, json: r.json, text: msg };
      }
      console.log(`${I_INFO} 429 on ${method} ${path} -> wait ${waitMs}ms (attempt=${attempt + 1})`);
      await sleep(waitMs + 100);
      attempt++;
      continue;
    }
    return r;
  }
}
export async function callAny(method, paths, { token, body, includeGreenpack = true } = {}) {
  let last = null;
  for (const p of paths) {
    last = await reqJson(method, p, { token, body, includeGreenpack });
    if (last.ok) return { ok: true, path: p, r: last };
    if (last.status === 404) continue;
  }
  return { ok: false, path: paths[0], r: last };
}
export function itemsOf(resp) {
  const j = resp?.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.suggestions)) return j.suggestions;
  return [];
}
