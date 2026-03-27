import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function banner(title) { console.log(`\n=== ${title} ===`); }
function info(msg) { console.log(`INFO ${msg}`); }
function ok(msg) { console.log(`OK ${msg}`); }
function warn(msg) { console.log(`WARN ${msg}`); }

function toInt(v, def, min = null, max = null) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  let out = Math.trunc(n);
  if (min != null) out = Math.max(min, out);
  if (max != null) out = Math.min(max, out);
  return out;
}

function uniq(arr) {
  return Array.from(new Set((Array.isArray(arr) ? arr : []).filter(Boolean)));
}

function normalizePath(p) {
  return String(p || "").replace(/\/\d+(?=\/|$)/g, "/{id}");
}

async function reqJsonOnce(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve) => {
    const req = lib.request({ method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch {}
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode || 0, json, text: data || "" });
      });
    });
    req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: String(e) }));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function loginCompany() {
  const email = process.env.COMPANY_EMAIL || "company@demo.com";
  const password = process.env.COMPANY_PASSWORD || process.env.DEMO_PASS || "demo123";
  const r = await reqJsonOnce("POST", "/api/auth/login", { body: { email, password } });
  if (!r.ok || !r.json?.token) throw new Error(`company login failed -> ${r.status}\n${String(r.text || "").slice(0, 400)}`);
  return r.json.token;
}

function itemsOf(resp) {
  const j = resp?.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.data)) return j.data;
  return [];
}

function buildScenario({ shiftId = null, roomIds = [] } = {}) {
  const endpoints = [
    { panel: "workflow", path: "/api/company/overview/workflow-summary" },
    { panel: "shifts", path: "/api/shifts?take=32" },
    { panel: "agreements", path: "/api/agreements?take=24" },
    { panel: "commercial-flow", path: "/api/company/overview/commercial-flow-summary" },
    { panel: "service-evaluation", path: "/api/trust-quality/company/summary" },
    { panel: "service-evaluation", path: "/api/trust-quality/company/items?pendingOnly=1&take=20" },
    { panel: "geo-review", path: "/api/company/personels?geoStatus=NEEDS_REVIEW&kind=PERSONEL&take=10" },
    { panel: "map", path: "/api/vehicles?onlyActive=1&take=20" },
    { panel: "map", path: "/api/shifts?status=APPROVED,ACTIVE&onlyNow=1&take=20" },
    { panel: "reports", path: "/api/reports/shifts/summary?from=2026-03-01&to=2026-03-26" },
    { panel: "market-modal", path: "/api/offers/company?status=OPEN,COUNTERED&take=30" },
    { panel: "guided-room-modal", path: "/api/rooms?take=30" },
  ];
  if (shiftId) endpoints.push({ panel: "map", path: `/api/shifts/${shiftId}/route-preview` });
  return endpoints;
}

async function timedGet(token, path) {
  const startedAt = Date.now();
  const resp = await reqJsonOnce("GET", path, { token });
  const elapsedMs = Date.now() - startedAt;
  return { path, normalizedPath: normalizePath(path), status: Number(resp?.status || 0), ok: !!resp?.ok, elapsedMs, text: String(resp?.text || "").slice(0, 200) };
}

async function runBurst(token, entries, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < entries.length) {
      const current = entries[idx++];
      const res = await timedGet(token, current.path);
      results.push({ ...current, ...res });
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

function summarize(results) {
  const byPath = new Map();
  const byStatus = new Map();
  for (const row of results) {
    const rec = byPath.get(row.path) || { path: row.path, normalizedPath: row.normalizedPath, count: 0, status429: 0, status5xx: 0, ok2xx: 0, totalMs: 0 };
    rec.count += 1;
    rec.totalMs += Number(row.elapsedMs || 0);
    if (row.status === 429) rec.status429 += 1;
    else if (row.status >= 500) rec.status5xx += 1;
    else if (row.status >= 200 && row.status < 300) rec.ok2xx += 1;
    byPath.set(row.path, rec);
    byStatus.set(String(row.status), Number(byStatus.get(String(row.status)) || 0) + 1);
  }
  const hottest = Array.from(byPath.values())
    .map((row) => ({ ...row, avgMs: row.count ? Math.round(row.totalMs / row.count) : 0 }))
    .sort((a, b) => b.status429 - a.status429 || b.count - a.count || a.path.localeCompare(b.path));
  return {
    totalRequests: results.length,
    statusBuckets: Object.fromEntries(Array.from(byStatus.entries()).sort((a, b) => Number(a[0]) - Number(b[0]))),
    hottest,
    total429: results.filter((x) => x.status === 429).length,
    total5xx: results.filter((x) => x.status >= 500).length,
  };
}

async function main() {
  banner("COMPANY FETCH STORM CHECK");
  info(`API_URL ${BASE_URL}`);
  const rounds = toInt(process.env.STORM_ROUNDS, 3, 1, 8);
  const concurrency = toInt(process.env.STORM_CONCURRENCY, 6, 1, 24);
  const virtualUsers = toInt(process.env.STORM_VIRTUAL_USERS, 3, 1, 8);
  info(`rounds=${rounds} concurrency=${concurrency} virtualUsers=${virtualUsers}`);

  const token = await loginCompany();
  ok("company login ok");

  let shiftId = null;
  let roomIds = [];
  const discoverShifts = await reqJsonOnce("GET", "/api/shifts?take=20", { token });
  if (discoverShifts.ok) {
    const items = itemsOf(discoverShifts);
    shiftId = Number(items?.[0]?.id || 0) || null;
    roomIds = uniq(items.map((x) => Number(x?.roomId || x?.room?.id || 0)).filter((x) => Number.isFinite(x) && x > 0));
    ok(`shift discovery ok (shiftId=${shiftId || 0}, roomIds=${roomIds.length})`);
  } else {
    warn(`shift discovery skipped (${discoverShifts.status})`);
  }

  const scenario = buildScenario({ shiftId, roomIds });
  info(`scenario endpoint count=${scenario.length}`);
  info('M75 profile uses lighter first-load takes + offer/people/live-shift read buckets + lazy provider scores');

  const allRuns = [];
  for (let round = 1; round <= rounds; round += 1) {
    info(`round ${round}/${rounds} start`);
    const expanded = [];
    for (let userNo = 1; userNo <= virtualUsers; userNo += 1) expanded.push(...scenario.map((row) => ({ ...row, round, userNo })));
    const burst = await runBurst(token, expanded, concurrency);
    const round429 = burst.filter((x) => x.status === 429).length;
    const round5xx = burst.filter((x) => x.status >= 500).length;
    const roundOk = burst.filter((x) => x.status >= 200 && x.status < 300).length;
    ok(`round ${round} -> ok=${roundOk} 429=${round429} 5xx=${round5xx}`);
    allRuns.push(...burst);
  }

  const summary = summarize(allRuns);
  info("status buckets");
  Object.entries(summary.statusBuckets).forEach(([status, count]) => console.log(`OK status ${status} -> ${count}`));

  info("top hot endpoints");
  summary.hottest.slice(0, 12).forEach((row) => {
    const tone = row.status429 > 0 || row.status5xx > 0 ? "WARN" : "OK";
    console.log(`${tone} ${row.path} -> count=${row.count} ok=${row.ok2xx} 429=${row.status429} 5xx=${row.status5xx} avgMs=${row.avgMs}`);
  });

  if (summary.totalRequests > 120) warn(`yük profili ${summary.totalRequests} GET üretti; read limiter baskısı gerçekçi şekilde ölçülür`);
  else ok(`yük profili ${summary.totalRequests} GET; limiter altı`);

  if (summary.total429 > 0) warn(`429 detected -> total429=${summary.total429}`);
  else ok("429 not detected in this run");

  if (summary.total5xx > 0) warn(`5xx detected -> total5xx=${summary.total5xx}`);
  else ok("5xx not detected in this run");

  console.log("\nOK COMPANY FETCH STORM CHECK PASS");
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
