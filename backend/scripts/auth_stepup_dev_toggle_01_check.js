#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

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

function mustTruthy(value, label) {
  if (value) ok(label);
  else fail(label);
}

function mustFalsy(value, label) {
  if (!value) ok(label);
  else fail(label);
}

function runProbe({
  nodeEnv = "development",
  stepUpEnabled,
  stepUpProvider,
  stepUpTotpEnabled,
  greenpackBypassEnabled,
} = {}) {
  const env = { ...process.env, NODE_ENV: nodeEnv };
  const assign = (key, value) => {
    if (value === undefined) delete env[key];
    else env[key] = String(value);
  };

  assign("STEP_UP_ENABLED", stepUpEnabled);
  assign("STEP_UP_PROVIDER", stepUpProvider);
  assign("STEP_UP_TOTP_ENABLED", stepUpTotpEnabled);
  assign("GREENPACK_BYPASS_ENABLED", greenpackBypassEnabled);
  assign("JWT_SECRET", nodeEnv === "production" ? "prod-probe-secret" : "dev-probe-secret");

  const securityPolicyUrl = pathToFileURL(path.join(root, "backend/src/auth/securityPolicy.js")).href;
  const middlewareUrl = pathToFileURL(path.join(root, "backend/src/auth/middleware.js")).href;

  const script = `
    import {
      getStepUpProvider,
      isSmsStepUpEnabled,
      isStepUpEnabled,
      isStepUpRole,
      isTotpStepUpEnabled
    } from ${JSON.stringify(securityPolicyUrl)};
    import { requireStepUp, requireStepUpWrite } from ${JSON.stringify(middlewareUrl)};

    function makeRes() {
      const state = { statusCode: 0, payload: null };
      return {
        state,
        status(code) { state.statusCode = Number(code || 0); return this; },
        json(payload) { state.payload = payload; return this; },
        send(payload) { state.payload = payload; return this; },
      };
    }

    async function runGuard(guard, method) {
      const req = {
        user: {
          role: "ROOM",
          totpSecretBase32: "demo-secret",
          totpEnabledAt: "2026-05-25T00:00:00.000Z",
        },
        auth: { stepUpUntil: 0 },
        headers: {},
        method,
        originalUrl: "/api/drivers",
      };
      const res = makeRes();
      let nextCount = 0;
      await guard(req, res, () => { nextCount += 1; });
      return { nextCount, statusCode: res.state.statusCode, payload: res.state.payload };
    }

    const writeResult = await runGuard(requireStepUpWrite("ROOM", "SUPER_ADMIN", "COMPANY"), "POST");
    const readResult = await runGuard(requireStepUp("ROOM", "SUPER_ADMIN", "COMPANY"), "POST");

    console.log(JSON.stringify({
      provider: getStepUpProvider(),
      enabled: isStepUpEnabled(),
      totpEnabled: isTotpStepUpEnabled(),
      smsEnabled: isSmsStepUpEnabled(),
      roomRole: isStepUpRole("ROOM"),
      driverRole: isStepUpRole("DRIVER"),
      writeResult,
      readResult,
    }));
  `;

  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: root,
    env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`probe failed (${nodeEnv}/${stepUpEnabled ?? "unset"}/${stepUpProvider ?? "unset"}): ${result.stderr || result.stdout || "unknown"}`);
  }

  const stdout = String(result.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop() || "{}";
  try {
    return JSON.parse(stdout);
  } catch (_err) {
    throw new Error(`probe parse failed (${nodeEnv}/${stepUpEnabled ?? "unset"}/${stepUpProvider ?? "unset"}): ${stdout}`);
  }
}

function readStepUpErrorCode(payload) {
  return String(
    payload?.error?.code ||
    payload?.error?.error?.code ||
    payload?.code ||
    payload?.error ||
    ""
  );
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

function main() {
  console.log("=== AUTH-STEPUP-DEV-TOGGLE-01 CHECK ===");

  const pkg = read("package.json");
  const envJs = read("backend/src/env.js");
  const securityPolicy = read("backend/src/auth/securityPolicy.js");
  const middleware = read("backend/src/auth/middleware.js");
  const authRoute = read("backend/src/routes/auth.js");
  const appShell = read("web/src/layout/AppShell.jsx");
  const totpCard = read("web/src/panels/shared/TotpStepUpCard.jsx");
  const stepUpWebUtil = read("web/src/utils/stepUp.js");
  const rootEnv = read(".env.example");
  const webEnv = read("web/.env.example");

  must(pkg, '"check:authstepupdevtoggle01": "node backend/scripts/auth_stepup_dev_toggle_01_check.js"', "package.json exposes check:authstepupdevtoggle01");
  must(envJs, "STEP_UP_PROVIDER: process.env.STEP_UP_PROVIDER ?? \"\"", "backend env exposes STEP_UP_PROVIDER");
  must(envJs, "STEP_UP_TOTP_ENABLED: (process.env.STEP_UP_TOTP_ENABLED ?? (IS_PRODUCTION ? \"1\" : \"0\")) === \"1\"", "backend env defaults TOTP readiness by mode");
  must(securityPolicy, "export function getStepUpProvider()", "central step-up provider helper exists");
  must(securityPolicy, "export function isStepUpEnabled()", "central step-up enabled helper exists");
  must(securityPolicy, "export function isTotpStepUpEnabled()", "central TOTP readiness helper exists");
  must(securityPolicy, "export function isSmsStepUpEnabled()", "central SMS helper exists");
  must(securityPolicy, "export function isStepUpProviderReady()", "central provider readiness helper exists");
  must(securityPolicy, "if (provider === \"none\") return false;", "provider none disables step-up");
  must(securityPolicy, "if (provider === \"sms\") return false;", "sms provider marked unsupported as ready");
  must(securityPolicy, "if (raw === \"0\") return false;", "STEP_UP_ENABLED=0 disables step-up");
  must(securityPolicy, "if (raw === \"1\") return true;", "STEP_UP_ENABLED=1 enables step-up");
  must(middleware, "STEP_UP_PROVIDER_NOT_READY", "middleware emits provider-not-ready fallback");
  must(middleware, "isTotpStepUpEnabled()", "middleware gates on TOTP readiness");
  must(authRoute, "providerReady", "auth totp status exposes provider readiness");
  must(authRoute, "providerMessage", "auth totp status exposes provider message");
  must(authRoute, "STEP_UP_PROVIDER_NOT_READY", "auth routes guard unsupported provider");
  must(authRoute, "isTotpStepUpEnabled()", "auth routes use TOTP readiness helper");
  must(appShell, "getStepUpProvider()", "AppShell uses shared step-up provider helper");
  must(appShell, "isStepUpEnabled()", "AppShell uses shared step-up enabled helper");
  must(totpCard, "getStepUpProvider()", "Totp card uses shared step-up provider helper");
  must(totpCard, "isTotpStepUpEnabled()", "Totp card uses shared TOTP readiness helper");
  must(stepUpWebUtil, "export function getStepUpProvider()", "web step-up util exposes provider helper");
  must(stepUpWebUtil, "export function isStepUpEnabled()", "web step-up util exposes enabled helper");
  must(stepUpWebUtil, "export function isTotpStepUpEnabled()", "web step-up util exposes TOTP helper");
  must(stepUpWebUtil, "export function isSmsStepUpEnabled()", "web step-up util exposes SMS helper");
  must(rootEnv, "STEP_UP_ENABLED=0", ".env.example defaults step-up off");
  must(rootEnv, "STEP_UP_PROVIDER=none", ".env.example defaults provider none");
  must(rootEnv, "STEP_UP_TOTP_ENABLED=0", ".env.example defaults TOTP off");
  must(rootEnv, "# STEP_UP_ENABLED=1", ".env.example shows open example");
  must(rootEnv, "# STEP_UP_PROVIDER=totp", ".env.example shows provider example");
  must(rootEnv, "# STEP_UP_TOTP_ENABLED=1", ".env.example shows TOTP example");
  must(webEnv, "VITE_STEP_UP_ENABLED=0", "web/.env.example defaults step-up off");
  must(webEnv, "VITE_STEP_UP_PROVIDER=none", "web/.env.example defaults provider none");
  must(webEnv, "VITE_STEP_UP_TOTP_ENABLED=0", "web/.env.example defaults TOTP off");
  must(webEnv, "# VITE_STEP_UP_ENABLED=1", "web/.env.example shows open example");
  must(webEnv, "# VITE_STEP_UP_PROVIDER=totp", "web/.env.example shows provider example");
  must(webEnv, "# VITE_STEP_UP_TOTP_ENABLED=1", "web/.env.example shows TOTP example");

  mustNotBeTracked("backend/.env", "backend/.env is not tracked");
  mustNotBeTracked(".env", "root .env is not tracked");
  mustNotBeTracked("web/.env", "web/.env is not tracked");

  const devBlank = runProbe({ nodeEnv: "development" });
  mustTruthy(devBlank.provider === "none", "development blank defaults provider to none");
  mustFalsy(devBlank.enabled, "development blank keeps step-up off");
  mustFalsy(devBlank.roomRole, "development blank clears ROOM step-up role");
  mustTruthy(devBlank.writeResult.nextCount === 1, "development blank bypasses protected write");
  mustTruthy(devBlank.readResult.nextCount === 1, "development blank bypasses read guard");

  const disabledZero = runProbe({ nodeEnv: "development", stepUpEnabled: 0, stepUpProvider: "none", stepUpTotpEnabled: 0 });
  mustFalsy(disabledZero.enabled, "STEP_UP_ENABLED=0 disables step-up");
  mustFalsy(disabledZero.roomRole, "STEP_UP_ENABLED=0 clears ROOM step-up role");
  mustTruthy(disabledZero.writeResult.nextCount === 1, "STEP_UP_ENABLED=0 bypasses protected write");
  mustTruthy(disabledZero.readResult.nextCount === 1, "STEP_UP_ENABLED=0 bypasses read guard");

  const noneProvider = runProbe({ nodeEnv: "development", stepUpEnabled: 1, stepUpProvider: "none", stepUpTotpEnabled: 1 });
  mustFalsy(noneProvider.enabled, "STEP_UP_PROVIDER=none disables step-up");
  mustFalsy(noneProvider.roomRole, "STEP_UP_PROVIDER=none clears ROOM step-up role");
  mustTruthy(noneProvider.writeResult.nextCount === 1, "STEP_UP_PROVIDER=none bypasses protected write");

  const enabledTotp = runProbe({ nodeEnv: "development", stepUpEnabled: 1, stepUpProvider: "totp", stepUpTotpEnabled: 1 });
  mustTruthy(enabledTotp.enabled, "STEP_UP_ENABLED=1 with TOTP enables step-up");
  mustTruthy(enabledTotp.totpEnabled, "TOTP provider ready when enabled");
  mustTruthy(enabledTotp.roomRole, "TOTP provider keeps ROOM step-up role");
  mustTruthy(enabledTotp.smsEnabled === false, "TOTP provider does not mark SMS enabled");
  mustTruthy(enabledTotp.writeResult.statusCode === 403, "TOTP provider keeps protected write guarded");
  mustTruthy(readStepUpErrorCode(enabledTotp.writeResult.payload) === "STEP_UP_REQUIRED", "TOTP provider keeps STEP_UP_REQUIRED payload");

  const enabledSms = runProbe({ nodeEnv: "development", stepUpEnabled: 1, stepUpProvider: "sms", stepUpTotpEnabled: 1 });
  mustTruthy(enabledSms.enabled, "STEP_UP_PROVIDER=sms with enabled flag keeps step-up conceptually on");
  mustTruthy(enabledSms.smsEnabled, "SMS provider is surfaced by helper");
  mustFalsy(enabledSms.totpEnabled, "SMS provider does not pretend to be TOTP ready");
  mustTruthy(enabledSms.writeResult.statusCode === 503, "SMS provider returns provider-not-ready");
  mustTruthy(readStepUpErrorCode(enabledSms.writeResult.payload) === "STEP_UP_PROVIDER_NOT_READY", "SMS provider does not fake SMS");

  const productionDefault = runProbe({ nodeEnv: "production" });
  mustTruthy(productionDefault.provider === "totp", "production blank defaults provider to TOTP");
  mustTruthy(productionDefault.enabled, "production blank keeps step-up open by default");
  mustTruthy(productionDefault.totpEnabled, "production blank keeps TOTP ready by default");
  mustTruthy(productionDefault.writeResult.statusCode === 403, "production blank keeps protected write guarded");
  mustTruthy(readStepUpErrorCode(productionDefault.writeResult.payload) === "STEP_UP_REQUIRED", "production blank keeps STEP_UP_REQUIRED payload");

  console.log("=== AUTH-STEPUP-DEV-TOGGLE-01 CHECK PASS ===");
}

main();
