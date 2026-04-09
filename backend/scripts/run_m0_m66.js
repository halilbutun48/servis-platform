#!/usr/bin/env node

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
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
/*
  run_m0_m66.js
  Cross-platform milestone check runner for PERSONEL-SERVIS V1.

  What it does:
  - Discovers backend/scripts/m*.js (excluding internal helpers).
  - Classifies each script as:
      * static: file-system / repo-contract checks
      * integration: requires a running API_URL (and typically DB seed)
  - Runs scripts in milestone order (best-effort sorting), printing a summary.

  Usage:
    node backend/scripts/run_m0_m66.js

  Options:
    --static-only            Run only static checks
    --integration-only       Run only integration checks
    --from M0                Lowest milestone number (default 0)
    --to M66                 Highest milestone number (default 66)
    --api http://127.0.0.1:3000   Override API_URL
    --continue               Continue on failures (default: stop on first failure)

  Notes:
  - Integration checks will be auto-skipped if /health is not reachable.
  - Many integration checks assume demo seed accounts (seed.js) and a Postgres DB.
*/

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = {
    staticOnly: false,
    integrationOnly: false,
    from: 0,
    to: 66,
    api: process.env.API_URL ?? 'http://127.0.0.1:3000',
    cont: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--static-only') out.staticOnly = true;
    else if (a === '--integration-only') out.integrationOnly = true;
    else if (a === '--continue') out.cont = true;
    else if (a === '--from') out.from = parseMilestone(argv[++i]);
    else if (a === '--to') out.to = parseMilestone(argv[++i]);
    else if (a === '--api') out.api = String(argv[++i] ?? out.api);
  }

  if (out.staticOnly && out.integrationOnly) {
    console.error('ERROR: --static-only and --integration-only cannot be used together');
    process.exit(2);
  }

  return out;
}

function parseMilestone(v) {
  const s = String(v ?? '').trim();
  const m = s.match(/^(?:M|m)?(\d+)(?:\.(\d+))?$/);
  if (!m) return Number.NaN;
  return Number(m[1]);
}

function discoverScripts(dir) {
  const items = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => f.startsWith('m'))
    .filter((f) => !f.startsWith('m0check') || true) // keep
    .filter((f) => !f.startsWith('_'));

  // keep only milestone-like names: m<digits>...
  return items
    .filter((f) => /^m\d/.test(f))
    .map((f) => path.join(dir, f));
}

function parseMilestoneKey(filename) {
  // Examples:
  //  m0check.js -> [0]
  //  m54_4_driver_route_delivery_check.js -> [54,4]
  //  m46_6_d3_ai_actionable_chat_check.js -> [46,6,3]
  //  m162check.js -> [162]
  const base = path.basename(filename, '.js');
  const m = base.match(/^m(\d+)(.*)$/i);
  if (!m) return null;

  const head = Number(m[1]);
  const rest = String(m[2] ?? '');

  // pull numeric segments from underscores or dots
  const segs = [];
  const re = /[_\.](\d+)/g;
  let mm;
  while ((mm = re.exec(rest))) segs.push(Number(mm[1]));

  return [head, ...segs];
}

function cmpKeys(a, b) {
  const ka = parseMilestoneKey(a) ?? [999999];
  const kb = parseMilestoneKey(b) ?? [999999];
  const n = Math.max(ka.length, kb.length);
  for (let i = 0; i < n; i++) {
    const va = ka[i] ?? 0;
    const vb = kb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return a.localeCompare(b);
}

function classifyScript(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const isIntegration =
    includesText(txt, 'process.env.API_URL') ||
    includesText(txt, 'BASE_URL') ||
    includesText(txt, 'socket.io-client') ||
    includesText(txt, 'from "./_harness.js"') ||
    includesText(txt, "from './_harness.js'") ||
    includesText(txt, 'http') && includesText(txt, 'https');

  // Most repo-contract checks are filesystem-only.
// Heuristics:
// - uses fs (readFileSync/existsSync/accessSync) or explicit required[] listing
// - does not use API_URL/BASE_URL, socket.io, or _harness
const isStatic =
  (includesText(txt, 'from "fs"') || includesText(txt, "from 'fs'") || includesText(txt, 'import fs') ||
   includesText(txt, 'fs.readFileSync') || includesText(txt, 'fs.existsSync') || includesText(txt, 'accessSync') ||
   includesText(txt, 'required =') || includesText(txt, 'requiredFiles')) &&
  !includesText(txt, 'process.env.API_URL') &&
  !includesText(txt, 'BASE_URL') &&
  !includesText(txt, 'socket.io-client') &&
  !includesText(txt, '_harness.js');

if (isStatic) return 'static';
  if (isIntegration) return 'integration';
  // fallback: if it imports http/https, treat as integration.
  if (includesText(txt, 'from "http"') || includesText(txt, "from 'http'")) return 'integration';
  return 'unknown';
}

function reqJsonOnce(method, urlStr) {
  const url = new URL(urlStr);
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = lib.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try { json = data ? JSON.parse(data) : null; } catch {}
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, text: data });
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, status: 0, json: null, text: String(e) }));
    req.end();
  });
}

async function healthOk(api) {
  const r = await reqJsonOnce('GET', new URL('/health', api).toString());
  return !!(r.ok && r.json && r.json.ok);
}

function runNode(file, { cwd, env }) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [file], { cwd, env, stdio: 'inherit' });
    p.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const scriptsDir = path.resolve(__dirname);
  const scripts = discoverScripts(scriptsDir).sort(cmpKeys);

  // Filter by main milestone number
  const filtered = scripts.filter((f) => {
    const key = parseMilestoneKey(f);
    if (!key) return false;
    const head = key[0];
    return head >= args.from && head <= args.to;
  });

  const classified = filtered.map((f) => ({ file: f, kind: classifyScript(f), key: parseMilestoneKey(f) }));

  const wantsStatic = args.staticOnly || !args.integrationOnly;
  const wantsIntegration = args.integrationOnly || !args.staticOnly;

  const api = args.api;
  const okHealth = wantsIntegration ? await healthOk(api) : false;

  console.log('\n=== RUN MILESTONE CHECKS ===');
  console.log(`API_URL: ${api}`);
  console.log(`Range: M${args.from}..M${args.to}`);
  console.log(`Mode: ${args.staticOnly ? 'static-only' : args.integrationOnly ? 'integration-only' : 'all (auto-skip integration if /health down)'}`);
  console.log(`Continue on fail: ${args.cont ? 'YES' : 'NO'}`);
  console.log('');

  if (wantsIntegration && !okHealth) {
    console.log('WARN: /health not reachable or not ok=true; integration checks will be SKIPPED.');
    console.log('      Start backend + DB + seed first, then rerun (or pass --static-only).\n');
  }

  const results = [];

  for (const s of classified) {
    const name = path.basename(s.file);
    const head = s.key?.[0] ?? -1;

    const shouldRun =
      (s.kind === 'static' && wantsStatic) ||
      (s.kind === 'integration' && wantsIntegration && okHealth) ||
      (s.kind === 'unknown' && wantsStatic); // unknown treated as static best-effort

    if (!shouldRun) {
      results.push({ name, kind: s.kind, status: 'SKIP' });
      continue;
    }

    console.log(`\n--- ${name} (${s.kind}) ---`);

    const code = await runNode(s.file, {
      cwd: path.resolve(scriptsDir, '..'), // run from backend/
      env: { ...process.env, API_URL: api },
    });

    if (code === 0) {
      results.push({ name, kind: s.kind, status: 'PASS' });
      continue;
    }

    results.push({ name, kind: s.kind, status: `FAIL(${code})` });
    if (!args.cont) break;
  }

  // Summary
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status.startsWith('FAIL')).length;
  const skip = results.filter((r) => r.status === 'SKIP').length;

  console.log('\n=== SUMMARY ===');
  console.log(`PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}`);

  if (fail > 0) {
    console.log('FAILED SCRIPTS:');
    for (const r of results.filter((x) => x.status.startsWith('FAIL'))) {
      console.log(` - ${r.name} (${r.kind}) -> ${r.status}`);
    }
    process.exit(1);
  }

  console.log('ALL SELECTED CHECKS PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
