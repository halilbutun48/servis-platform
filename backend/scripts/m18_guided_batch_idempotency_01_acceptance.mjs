const baseUrl = String(process.env.GUIDED_BATCH_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const email = String(process.env.GUIDED_BATCH_EMAIL || "").trim();
const password = String(process.env.GUIDED_BATCH_PASSWORD || "");
const companyId = Number(process.env.GUIDED_BATCH_COMPANY_ID || 1);
const key = String(process.env.GUIDED_BATCH_TEST_KEY || "").trim();

if (!email || !password || !key) {
  throw new Error("GUIDED_BATCH_EMAIL, GUIDED_BATCH_PASSWORD and GUIDED_BATCH_TEST_KEY are required");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { status: response.status, body };
}

function assertStatus(result, expected, label) {
  if (result.status !== expected) throw new Error(`${label}: expected ${expected}, got ${result.status} ${JSON.stringify(result.body)}`);
}

const login = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
assertStatus(login, 200, "normal login");
const token = String(login.body?.token || "");
if (!token) throw new Error("normal login did not return a token");
const headers = { authorization: `Bearer ${token}` };

const item = {
  roomId: 1,
  startAt: "2026-11-20T06:00:00.000Z",
  endAt: "2026-11-20T08:00:00.000Z",
  hubLat: 41.02,
  hubLng: 28.99,
  direction: "INBOUND",
  pattern: "ONE_WAY",
  requiredPax: 1,
  stops: [],
};
const payload = { companyId, idempotencyKey: key, items: [item] };

const first = await request("/api/shifts/guided-batch", {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
});
assertStatus(first, 200, "first guided batch");
const firstIds = first.body?.createdIds || [];
if (firstIds.length !== 1 || first.body?.idempotentReplay === true) throw new Error(`first response was not a new one-item batch: ${JSON.stringify(first.body)}`);

const replay = await request("/api/shifts/guided-batch", {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
});
assertStatus(replay, 200, "same-key replay");
if (replay.body?.idempotentReplay !== true || JSON.stringify(replay.body?.createdIds) !== JSON.stringify(firstIds)) {
  throw new Error(`same-key replay did not return the original result: ${JSON.stringify(replay.body)}`);
}

const concurrentKey = `${key}-concurrent`;
const concurrentPayload = { ...payload, idempotencyKey: concurrentKey, items: [{ ...item, startAt: "2026-11-21T06:00:00.000Z", endAt: "2026-11-21T08:00:00.000Z" }] };
const concurrent = await Promise.all([
  request("/api/shifts/guided-batch", { method: "POST", headers, body: JSON.stringify(concurrentPayload) }),
  request("/api/shifts/guided-batch", { method: "POST", headers, body: JSON.stringify(concurrentPayload) }),
]);
if (!concurrent.every((result) => result.status === 200)) throw new Error(`concurrent replay statuses were not safe: ${JSON.stringify(concurrent)}`);
const concurrentIds = concurrent.flatMap((result) => result.body?.createdIds || []);
if (new Set(concurrentIds).size !== 1) throw new Error(`concurrent replay created duplicate shifts: ${JSON.stringify(concurrent)}`);

const mismatch = await request("/api/shifts/guided-batch", {
  method: "POST",
  headers,
  body: JSON.stringify({ ...payload, items: [{ ...item, startAt: "2026-11-22T06:00:00.000Z", endAt: "2026-11-22T08:00:00.000Z" }] }),
});
assertStatus(mismatch, 409, "same-key payload mismatch");

const roomLogin = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "room@demo.com", password }),
});
assertStatus(roomLogin, 200, "room normal login");
const foreignRole = await request("/api/shifts/guided-batch", {
  method: "POST",
  headers: { authorization: `Bearer ${roomLogin.body.token}` },
  body: JSON.stringify(payload),
});
assertStatus(foreignRole, 403, "room cannot replay company batch");

const failureKey = `${key}-failure-retry`;
const invalid = await request("/api/shifts/guided-batch", {
  method: "POST",
  headers,
  body: JSON.stringify({ ...payload, idempotencyKey: failureKey, items: [{ ...item, hubLat: null }] }),
});
if (invalid.status < 400 || invalid.status >= 500) throw new Error(`invalid batch did not fail safely: ${JSON.stringify(invalid)}`);
const retry = await request("/api/shifts/guided-batch", {
  method: "POST",
  headers,
  body: JSON.stringify({ ...payload, idempotencyKey: failureKey }),
});
assertStatus(retry, 200, "failed validation retry");

console.log(JSON.stringify({
  status: "PASS",
  first: { status: first.status, createdIds: firstIds },
  replay: { status: replay.status, idempotentReplay: replay.body.idempotentReplay, createdIds: replay.body.createdIds },
  concurrent: { statuses: concurrent.map((result) => result.status), uniqueCreatedIds: Array.from(new Set(concurrentIds)) },
  payloadMismatch: { status: mismatch.status, code: mismatch.body?.code || mismatch.body?.error?.code || null },
  tenantRoleNegative: { status: foreignRole.status },
  failureRetry: { firstStatus: invalid.status, retryStatus: retry.status, retryCreatedIds: retry.body?.createdIds || [] },
}, null, 2));
