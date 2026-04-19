#!/usr/bin/env node

/*
  Cross-platform milestone check runner for the current repo.

  Usage:
    node backend/scripts/run_m0_latest.js --static-only --to latest --continue

  Notes:
  - Discovers backend/scripts/m*.{js,cjs,mjs}.
  - Runs child checks from the repository root and also passes repoRoot as argv[2].
  - Integration checks are skipped when /health is not reachable unless --static-only is used.
*/

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const scriptsDir = __dirname;
const HIGH_SEGMENT = Number.MAX_SAFE_INTEGER;

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}

function tokenValue(token) {
  if (/^\d+$/.test(token)) return Number(token);
  return token
    .toLowerCase()
    .split("")
    .reduce((acc, ch) => acc * 32 + (ch.charCodeAt(0) - 96), 0);
}

function parseMilestoneKey(filename) {
  const base = path.basename(filename).replace(/\.(?:js|cjs|mjs)$/i, "");
  const match = base.match(/^m(\d+)(.*)$/i);
  if (!match) return null;

  const head = Number(match[1]);
  const rest = String(match[2] || "");

  // Legacy files are named m162check/m163check, but they represent M16.2/M16.3.
  if ((head === 162 || head === 163) && rest.toLowerCase() === "check") {
    return [16, head === 162 ? 2 : 3];
  }

  const key = [head];
  const suffixBeforeCheck = rest.replace(/check.*$/i, "");
  const tokens = suffixBeforeCheck.match(/[a-z]+|\d+/gi) || [];
  for (const token of tokens) key.push(tokenValue(token));
  return key;
}

function cmpKeys(a, b) {
  const ka = Array.isArray(a) ? a : parseMilestoneKey(a) || [HIGH_SEGMENT];
  const kb = Array.isArray(b) ? b : parseMilestoneKey(b) || [HIGH_SEGMENT];
  const length = Math.max(ka.length, kb.length);
  for (let i = 0; i < length; i += 1) {
    const va = ka[i] ?? 0;
    const vb = kb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return String(a).localeCompare(String(b));
}

function parseBoundary(value, kind) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.toLowerCase() === "latest") return null;

  const match = raw.match(/^m?(\d+)(.*)$/i);
  if (!match) return null;

  const head = Number(match[1]);
  const rest = String(match[2] || "");
  if (!rest) return kind === "to" ? [head, HIGH_SEGMENT] : [head];

  const fakeName = `m${head}${rest}_check.js`;
  const key = parseMilestoneKey(fakeName);
  return key || (kind === "to" ? [head, HIGH_SEGMENT] : [head]);
}

function discoverScripts() {
  return fs
    .readdirSync(scriptsDir)
    .filter((name) => /^m\d/i.test(name))
    .filter((name) => /\.(?:js|cjs|mjs)$/i.test(name))
    .filter((name) => !name.startsWith("_"))
    .map((name) => path.join(scriptsDir, name))
    .sort((a, b) => cmpKeys(a, b) || path.basename(a).localeCompare(path.basename(b)));
}

function classifyScript(file) {
  const text = fs.readFileSync(file, "utf8");
  const integration =
    includesText(text, "process.env.API_URL") ||
    includesText(text, "BASE_URL") ||
    includesText(text, "socket.io-client") ||
    includesText(text, "_harness.js") ||
    (includesText(text, "http") && includesText(text, "https") && includesText(text, "request"));

  return integration ? "integration" : "static";
}

function parseArgs(argv) {
  const out = {
    staticOnly: false,
    integrationOnly: false,
    from: [0],
    to: null,
    api: process.env.API_URL || "http://127.0.0.1:3000",
    cont: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--static-only") out.staticOnly = true;
    else if (arg === "--integration-only") out.integrationOnly = true;
    else if (arg === "--continue") out.cont = true;
    else if (arg === "--from") out.from = parseBoundary(argv[++i], "from") || out.from;
    else if (arg === "--to") out.to = parseBoundary(argv[++i], "to");
    else if (arg === "--api") out.api = String(argv[++i] || out.api);
  }

  if (out.staticOnly && out.integrationOnly) {
    console.error("ERROR: --static-only and --integration-only cannot be used together");
    process.exit(2);
  }

  return out;
}

function reqJsonOnce(method, urlStr) {
  const url = new URL(urlStr);
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve) => {
    const req = lib.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch {}
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, json, text: data });
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, json: null, text: String(err) }));
    req.end();
  });
}

async function healthOk(api) {
  const result = await reqJsonOnce("GET", new URL("/health", api).toString());
  return Boolean(result.ok && result.json && result.json.ok);
}

function runNode(file, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file, repoRoot], {
      cwd: repoRoot,
      env,
      stdio: "inherit",
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scripts = discoverScripts();
  const latest = scripts
    .map((file) => parseMilestoneKey(file))
    .filter(Boolean)
    .sort(cmpKeys)
    .at(-1) || [0];
  const to = args.to || [latest[0], HIGH_SEGMENT];

  const selected = scripts
    .map((file) => ({ file, key: parseMilestoneKey(file), kind: classifyScript(file) }))
    .filter((item) => item.key && cmpKeys(item.key, args.from) >= 0 && cmpKeys(item.key, to) <= 0);

  const wantsStatic = args.staticOnly || !args.integrationOnly;
  const wantsIntegration = args.integrationOnly || !args.staticOnly;
  const okHealth = wantsIntegration ? await healthOk(args.api) : false;

  console.log("\n=== RUN MILESTONE CHECKS ===");
  console.log(`Repo root: ${repoRoot}`);
  console.log(`API_URL: ${args.api}`);
  console.log(`Range: M${args.from.join(".")}..M${to[0] === latest[0] && !args.to ? `${latest[0]} latest` : to.join(".")}`);
  console.log(`Mode: ${args.staticOnly ? "static-only" : args.integrationOnly ? "integration-only" : "all"}`);
  console.log(`Continue on fail: ${args.cont ? "YES" : "NO"}`);

  if (wantsIntegration && !okHealth) {
    console.log("WARN: /health is not reachable or not ok=true; integration checks will be skipped.");
  }

  const results = [];
  for (const item of selected) {
    const name = path.basename(item.file);
    const shouldRun =
      (item.kind === "static" && wantsStatic) ||
      (item.kind === "integration" && wantsIntegration && okHealth);

    if (!shouldRun) {
      results.push({ name, kind: item.kind, status: "SKIP" });
      continue;
    }

    console.log(`\n--- ${name} (${item.kind}) ---`);
    const code = await runNode(item.file, {
      ...process.env,
      API_URL: args.api,
      REPO_ROOT: repoRoot,
      PROJECT_ROOT: repoRoot,
    });

    if (code === 0) {
      results.push({ name, kind: item.kind, status: "PASS" });
      continue;
    }

    results.push({ name, kind: item.kind, status: `FAIL(${code})` });
    if (!args.cont) break;
  }

  const pass = results.filter((result) => result.status === "PASS").length;
  const fail = results.filter((result) => result.status.startsWith("FAIL")).length;
  const skip = results.filter((result) => result.status === "SKIP").length;

  console.log("\n=== SUMMARY ===");
  console.log(`PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}`);

  if (fail > 0) {
    console.log("FAILED SCRIPTS:");
    for (const result of results.filter((item) => item.status.startsWith("FAIL"))) {
      console.log(` - ${result.name} (${result.kind}) -> ${result.status}`);
    }
    process.exit(1);
  }

  console.log("ALL SELECTED CHECKS PASS");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
