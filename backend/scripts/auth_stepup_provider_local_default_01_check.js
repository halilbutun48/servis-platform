#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNotBeTracked(relPath, label) {
  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", relPath], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (tracked.status === 0) fail(label);
  ok(label);
}

function runCanonicalAuthToggleCheck() {
  const result = spawnSync(process.execPath, [path.join(root, "backend/scripts/auth_stepup_dev_toggle_01_check.js")], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`canonical auth step-up check failed: ${result.stderr || result.stdout || "unknown"}`);
  }
}

function main() {
  console.log("=== AUTH-STEPUP-PROVIDER-LOCAL-DEFAULT-01 CHECK ===");

  const compose = read("infra/docker-compose.yml");
  const rootEnv = read(".env.example");
  const webEnv = read("web/.env.example");

  must(compose, "STEP_UP_ENABLED: ${STEP_UP_ENABLED:-0}", "docker compose passes STEP_UP_ENABLED into api");
  must(compose, "STEP_UP_PROVIDER: ${STEP_UP_PROVIDER:-none}", "docker compose passes STEP_UP_PROVIDER into api");
  must(compose, "STEP_UP_TOTP_ENABLED: ${STEP_UP_TOTP_ENABLED:-0}", "docker compose passes STEP_UP_TOTP_ENABLED into api");

  must(rootEnv, "STEP_UP_ENABLED=0", "root .env.example keeps step-up off by default");
  must(rootEnv, "STEP_UP_PROVIDER=none", "root .env.example keeps provider none by default");
  must(rootEnv, "STEP_UP_TOTP_ENABLED=0", "root .env.example keeps TOTP off by default");
  must(rootEnv, "# STEP_UP_ENABLED=1", "root .env.example shows open example");
  must(rootEnv, "# STEP_UP_PROVIDER=totp", "root .env.example shows totp example");
  must(rootEnv, "# STEP_UP_TOTP_ENABLED=1", "root .env.example shows TOTP example");

  must(webEnv, "VITE_STEP_UP_ENABLED=0", "web .env.example keeps step-up off by default");
  must(webEnv, "VITE_STEP_UP_PROVIDER=none", "web .env.example keeps provider none by default");
  must(webEnv, "VITE_STEP_UP_TOTP_ENABLED=0", "web .env.example keeps TOTP off by default");
  must(webEnv, "# VITE_STEP_UP_ENABLED=1", "web .env.example shows open example");
  must(webEnv, "# VITE_STEP_UP_PROVIDER=totp", "web .env.example shows totp example");
  must(webEnv, "# VITE_STEP_UP_TOTP_ENABLED=1", "web .env.example shows TOTP example");

  mustNotBeTracked("backend/.env", "backend/.env is not tracked");
  mustNotBeTracked(".env", "root .env is not tracked");
  mustNotBeTracked("web/.env", "web/.env is not tracked");

  runCanonicalAuthToggleCheck();

  console.log("=== AUTH-STEPUP-PROVIDER-LOCAL-DEFAULT-01 CHECK PASS ===");
}

main();
