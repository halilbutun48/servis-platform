import fs from "node:fs";
import path from "node:path";

const evidencePath = path.resolve(import.meta.dirname, "../../output/worker-database-role-separation-fixture-20261102/evidence.json");
if (!fs.existsSync(evidencePath)) throw new Error(`kanıt bulunamadı: ${evidencePath}`);
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const expect = (value, message) => { if (!value) throw new Error(message); };

expect(evidence.status === "PASS", `fixture status=${evidence.status}`);
expect(evidence.fixture?.cleaned === true, "fixture cleanup kanıtı eksik");
expect(evidence.runtimeIdentity?.distinct === true, "app/worker current_user ayrımı eksik");
expect(evidence.apiWorkerConfig?.fallbackAllowed === false, "fallback kapısı eksik");
expect(evidence.privileges?.appDdlRejected === true && evidence.privileges?.workerDdlRejected === true, "DDL privilege negatifleri geçmedi");
expect(evidence.privileges?.appTransactionWrite === true && evidence.privileges?.workerTransactionWrite === true, "normal app/worker DML kanıtı eksik");
expect(evidence.privileges?.workerFinancialWriteRejected === true, "worker finansal DML sınırı geçmedi");
expect(evidence.applicationGate?.frozenStatusRejected === true, "freeze login reddi kanıtı eksik");
expect(evidence.freezeGate?.directAppWriteRejected === true && evidence.freezeGate?.directWorkerWriteRejected === true, "DB freeze negatifleri geçmedi");
expect(evidence.freezeGate?.unauthorizedUnfreezeRejected === true, "yetkisiz unfreeze reddi eksik");
expect(evidence.freezeGate?.redisFailureFailClosed === true, "Redis fail-closed kanıtı eksik");
console.log(JSON.stringify({ checker: "PASS", evidencePath, status: evidence.status, app: evidence.runtimeIdentity.appIdentity, worker: evidence.runtimeIdentity.workerIdentity }, null, 2));
