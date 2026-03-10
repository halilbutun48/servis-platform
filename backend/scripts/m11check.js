// backend/scripts/m11check.js
// M11: Security hardening + /health detayları smoke

import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function req(method, path) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    const r = lib.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: data }));
      }
    );
    r.on("error", () => resolve({ status: 0, headers: {}, body: "" }));
    r.end();
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const res = await req("GET", "/health");
  assert(res.status === 200, `Expected 200, got ${res.status}`);

  // Helmet/x-powered-by kontrolü
  assert(!res.headers["x-powered-by"], "x-powered-by header should be disabled (M11)");

  let json;
  try {
    json = JSON.parse(res.body || "{}");
  } catch {
    throw new Error("/health must return JSON");
  }

  for (const k of ["ok", "ts", "uptimeSec", "dbOk", "dbLatencyMs", "version"]) {
    assert(k in json, `/health missing field: ${k}`);
  }
  assert(typeof json.dbOk === "boolean", "dbOk must be boolean");
  assert(typeof json.dbLatencyMs === "number", "dbLatencyMs must be number");

  console.log("OK M11 check OK");
}

main().catch((e) => {
  console.error("FAIL M11 check FAIL:", e.message);
  process.exit(1);
});

