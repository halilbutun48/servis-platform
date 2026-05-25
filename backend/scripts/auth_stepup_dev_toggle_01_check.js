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

function runProbe(stepUpEnabledValue) {
  const env = { ...process.env };
  if (stepUpEnabledValue === undefined) delete env.STEP_UP_ENABLED;
  else env.STEP_UP_ENABLED = String(stepUpEnabledValue);
  env.NODE_ENV = env.NODE_ENV || "development";

  const securityPolicyUrl = pathToFileURL(path.join(root, "backend/src/auth/securityPolicy.js")).href;
  const middlewareUrl = pathToFileURL(path.join(root, "backend/src/auth/middleware.js")).href;

  const script = `
    import { isStepUpEnabled, isStepUpRole } from ${JSON.stringify(securityPolicyUrl)};
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
      enabled: isStepUpEnabled(),
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
    throw new Error(`probe failed (${stepUpEnabledValue ?? "unset"}): ${result.stderr || result.stdout || "unknown"}`);
  }

  const stdout = String(result.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop() || "{}";
  try {
    return JSON.parse(stdout);
  } catch (_err) {
    throw new Error(`probe parse failed (${stepUpEnabledValue ?? "unset"}): ${stdout}`);
  }
}

function main() {
  console.log("=== AUTH-STEPUP-DEV-TOGGLE-01 CHECK ===");

  function readStepUpErrorCode(payload) {
    return String(
      payload?.error?.code ||
      payload?.error?.error?.code ||
      payload?.code ||
      payload?.error ||
      ""
    );
  }

  const pkg = read("package.json");
  const envJs = read("backend/src/env.js");
  const securityPolicy = read("backend/src/auth/securityPolicy.js");
  const middleware = read("backend/src/auth/middleware.js");
  const authRoute = read("backend/src/routes/auth.js");
  const appShell = read("web/src/layout/AppShell.jsx");
  const totpCard = read("web/src/panels/shared/TotpStepUpCard.jsx");
  const rootEnv = read(".env.example");
  const webEnv = read("web/.env.example");

  must(pkg, '"check:authstepupdevtoggle01": "node backend/scripts/auth_stepup_dev_toggle_01_check.js"', "package.json exposes check:authstepupdevtoggle01");
  must(envJs, "STEP_UP_ENABLED: process.env.STEP_UP_ENABLED ?? \"\"", "backend env exposes STEP_UP_ENABLED");
  must(securityPolicy, "export function isStepUpEnabled()", "central step-up helper exists");
  must(securityPolicy, "const raw = String(ENV.STEP_UP_ENABLED ?? \"\").trim();", "step-up helper reads STEP_UP_ENABLED");
  must(securityPolicy, "if (!raw) return true;", "step-up helper defaults open when undefined");
  must(securityPolicy, "return raw !== \"0\";", "step-up helper disables on STEP_UP_ENABLED=0");
  must(securityPolicy, "export function getStepUpRequiredRoles()", "step-up required roles helper exists");
  must(securityPolicy, "export function isStepUpRole(role)", "step-up role helper exists");
  must(middleware, "if (!stepUpRequiredForRole(role)) return next();", "middleware bypasses when step-up disabled");
  must(middleware, "return guard(req, res, next);", "write guard routes through central step-up guard");
  must(authRoute, "const required = isStepUpRole(user.role);", "auth totp status uses central role helper");
  must(appShell, 'import.meta.env.VITE_STEP_UP_ENABLED', "AppShell uses VITE_STEP_UP_ENABLED");
  must(totpCard, 'import.meta.env.VITE_STEP_UP_ENABLED', "TotpStepUpCard uses VITE_STEP_UP_ENABLED");
  must(rootEnv, "STEP_UP_ENABLED=1", ".env.example documents STEP_UP_ENABLED");
  must(webEnv, "VITE_STEP_UP_ENABLED=1", "web/.env.example documents VITE_STEP_UP_ENABLED");

  const unsetProbe = runProbe(undefined);
  mustTruthy(unsetProbe.enabled === true, "STEP_UP_ENABLED unset defaults open");
  mustTruthy(unsetProbe.roomRole === true, "STEP_UP_ENABLED unset keeps ROOM step-up active");
  mustTruthy(unsetProbe.writeResult.nextCount === 0, "STEP_UP_ENABLED unset blocks protected write");
  mustTruthy(unsetProbe.writeResult.statusCode === 403, "STEP_UP_ENABLED unset returns STEP_UP_REQUIRED on protected write");
  mustTruthy(readStepUpErrorCode(unsetProbe.writeResult.payload) === "STEP_UP_REQUIRED", "STEP_UP_ENABLED unset keeps STEP_UP_REQUIRED payload");

  const disabledProbe = runProbe("0");
  mustFalsy(disabledProbe.enabled, "STEP_UP_ENABLED=0 disables step-up");
  mustFalsy(disabledProbe.roomRole, "STEP_UP_ENABLED=0 clears ROOM step-up role");
  mustTruthy(disabledProbe.writeResult.nextCount === 1, "STEP_UP_ENABLED=0 bypasses protected write");
  mustTruthy(disabledProbe.writeResult.statusCode === 0, "STEP_UP_ENABLED=0 does not send step-up response");
  mustTruthy(disabledProbe.readResult.nextCount === 1, "STEP_UP_ENABLED=0 bypasses read guard for guarded role");

  const enabledProbe = runProbe("1");
  mustTruthy(enabledProbe.enabled, "STEP_UP_ENABLED=1 enables step-up");
  mustTruthy(enabledProbe.roomRole, "STEP_UP_ENABLED=1 keeps ROOM step-up role");
  mustTruthy(enabledProbe.driverRole === false, "DRIVER stays outside step-up roles");
  mustTruthy(enabledProbe.writeResult.nextCount === 0, "STEP_UP_ENABLED=1 keeps protected write guarded");
  mustTruthy(enabledProbe.writeResult.statusCode === 403, "STEP_UP_ENABLED=1 keeps protected write blocked");
  mustTruthy(readStepUpErrorCode(enabledProbe.writeResult.payload) === "STEP_UP_REQUIRED", "STEP_UP_ENABLED=1 keeps STEP_UP_REQUIRED payload");

  console.log("=== AUTH-STEPUP-DEV-TOGGLE-01 CHECK PASS ===");
}

main();
