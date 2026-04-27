#!/usr/bin/env node
/**
 * M93 optional runtime probe.
 * Safe by default: reads queue health/proof endpoints only. It does not stop Redis or kill workers.
 * Use manual runbook steps for Redis down/up and worker restart drills.
 */
const API_URL = String(process.env.API_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const TOKEN = String(process.env.SUPER_ADMIN_TOKEN || process.env.ADMIN_TOKEN || "").trim();

async function get(path) {
  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
  const res = await fetch(`${API_URL}${path}`, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

console.log("=== M93 QUEUE DURABILITY RUNTIME PROBE ===");
console.log(`API_URL=${API_URL}`);
if (!TOKEN) console.log("WARN SUPER_ADMIN_TOKEN/ADMIN_TOKEN not set; protected endpoints may return 401.");

const paths = [
  "/api/admin/queues/auto-reached",
  "/api/admin/queues/auto-reached/thresholds",
  "/api/admin/queues/auto-reached/dead-letter",
  "/api/admin/queues/auto-reached/proof",
];

let failed = false;
for (const p of paths) {
  const r = await get(p);
  if (!r.ok) {
    failed = true;
    console.error(`FAIL ${p} -> ${r.status} ${String(r.text || "").slice(0, 300)}`);
  } else {
    console.log(`OK ${p}`);
    if (p.endsWith("/thresholds")) {
      console.log(`INFO threshold status=${r.json?.threshold?.status || "UNKNOWN"} warnings=${r.json?.threshold?.warnings?.length ?? "?"}`);
    }
  }
}

if (failed) process.exit(1);
console.log("M93 QUEUE DURABILITY RUNTIME PROBE PASS");
