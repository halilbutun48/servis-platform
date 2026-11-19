import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const evidencePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, "output", "global-write-freeze-fixture-20261102", "evidence.json");

function fail(message) {
  console.error(`GLOBAL_WRITE_FREEZE_FIXTURE_CHECK_FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(evidencePath)) {
  fail(`kanıt dosyası bulunamadı: ${evidencePath}`);
} else {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  const required = [
    "fixture",
    "sourceBackup",
    "runtimeIdentity",
    "roleSecurity",
    "applicationGate",
    "postgresPrivilegeGate",
    "transactionDrain",
    "fencingAndRace",
    "redisFailure",
    "workerQueue",
    "audit",
    "rollback",
    "mainRuntimeProtection",
  ];
  const missing = required.filter((key) => !evidence[key]);
  if (missing.length) fail(`eksik kanıt bölümleri: ${missing.join(", ")}`);

  const gatePass = evidence.applicationGate?.status === "PASS";
  const dbPass = evidence.postgresPrivilegeGate?.status === "PASS";
  const noMainWrites = evidence.mainRuntimeProtection?.businessWriteObserved === false;
  const noMainMutation = evidence.mainRuntimeProtection?.mainRuntimeChanged === false;
  const status = gatePass && dbPass && noMainWrites && noMainMutation ? "PASS" : "NOT_PROVEN";
  console.log(JSON.stringify({ evidencePath, applicationGate: evidence.applicationGate?.status, postgresPrivilegeGate: evidence.postgresPrivilegeGate?.status, globalWriteFreeze: status }, null, 2));
  if (status !== "PASS") process.exitCode = 1;
}
