import http from "http";
import https from "https";
import { banner, step, must, loginFirst, reqJson, BASE_URL } from "./_harness.js";

async function raw(method, path, { token, headers = {}, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const merged = { "x-greenpack": "1", ...headers };
  if (token) merged.Authorization = `Bearer ${token}`;
  if (body !== undefined) merged["Content-Type"] = "application/json";

  return new Promise((resolve) => {
    const req = lib.request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: merged,
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch {}
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, headers: res.headers || {}, text: data || "", json });
      });
    });
    req.on("error", (e) => resolve({ ok: false, status: 0, headers: {}, text: String(e), json: null }));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  banner("M47.3 PRODUCTION RESILIENCE + EDGE SECURITY CHECK");

  step("login super admin");
  const token = await loginFirst("SUPER_ADMIN");
  must("super admin login ok", !!token);

  step("health exposes request id + edge headers");
  const health = await raw("GET", "/health", {});
  must("health ok", health.ok);
  must("health request id header visible", !!health.headers["x-request-id"]);
  must("health nosniff header visible", String(health.headers["x-content-type-options"] || "").toLowerCase() === "nosniff");
  must("health frame deny header visible", String(health.headers["x-frame-options"] || "").toUpperCase() === "DENY");
  must("health edge security block visible", !!health.json?.edgeSecurity);

  step("edge security policy endpoint");
  const policy = await reqJson("GET", "/api/admin/edge-security/policy", { token });
  must("edge security policy ok", policy.ok);
  must("policy request id header name visible", String(policy.json?.requestIdHeader || "") === "x-request-id");
  must("policy trust proxy field visible", Number(policy.json?.trustProxyHops || 0) >= 0);
  must("policy blocked ua list visible", Array.isArray(policy.json?.blockedUserAgentNeedles));

  step("edge security snapshot endpoint");
  const snapshot = await reqJson("GET", "/api/admin/edge-security/snapshot", { token });
  must("edge security snapshot ok", snapshot.ok);
  must("snapshot assessment exists", ["OK", "WARN"].includes(String(snapshot.json?.assessment || "")));
  must("snapshot blocked counters visible", typeof snapshot.json?.runtime?.blocked?.suspiciousUserAgent === "number");
  must("snapshot recent requests total visible", Number(snapshot.json?.recentRequests?.total || 0) >= 0);

  step("suspicious user-agent is blocked");
  const blockedUa = await raw("GET", "/health", { headers: { "User-Agent": "sqlmap/1.7" } });
  must("suspicious user-agent blocked", blockedUa.status === 403);
  must("blocked response keeps request id", !!blockedUa.headers["x-request-id"]);

  step("trace method is blocked");
  const trace = await raw("TRACE", "/health", {});
  must("trace blocked", trace.status === 405);

  banner("M47.3 PRODUCTION RESILIENCE + EDGE SECURITY CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
