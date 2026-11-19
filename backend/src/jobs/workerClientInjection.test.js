import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const jobsDir = path.dirname(fileURLToPath(import.meta.url));
const workerModules = [
  "agreementMonitor.js",
  "agreementShiftGenerator.js",
  "gpsStaleMonitor.js",
  "maintenanceMonitor.js",
  "retentionCleanup.js",
  "routeLearnMonitor.js",
  "shiftCompletionMonitor.js",
];

test("background monitorlar API Prisma istemcisini gizli fallback olarak import etmez", () => {
  for (const name of workerModules) {
    const source = fs.readFileSync(path.join(jobsDir, name), "utf8");
    assert.doesNotMatch(source, /import\s*\{\s*prisma\s*\}/, name);
    assert.match(source, /opts\.prismaClient\s*\|\|\s*workerPrisma/, name);
  }
});

test("worker scheduler başlatıcısı worker istemcisini tüm monitorlara geçirir", () => {
  const source = fs.readFileSync(path.join(jobsDir, "index.js"), "utf8");
  for (const monitor of [
    "startAgreementMonitor",
    "startAutoReachedQueueWorker",
    "startRouteLearnMonitor",
    "startShiftCompletionMonitor",
    "startAgreementShiftGenerator",
    "startGpsStaleMonitor",
    "startMaintenanceMonitor",
    "startRetentionCleanup",
  ]) {
    assert.match(source, new RegExp(`${monitor}\\([\\s\\S]*?prismaClient: opts\\.workerPrisma`), monitor);
  }
});

test("clean-demo Compose worker URL'sini zorunlu ve ayrı tutar", () => {
  const composePath = path.resolve(jobsDir, "../../../infra/docker-compose.clean-demo.yml");
  const source = fs.readFileSync(composePath, "utf8");
  assert.match(source, /SEFERPAKT_DATABASE_MODE:\s*canonical_demo/);
  assert.match(source, /DATABASE_URL:\s*\$\{CLEAN_DEMO_APP_DATABASE_URL:\?CLEAN_DEMO_APP_DATABASE_URL is required\}/);
  assert.match(source, /WORKER_DATABASE_URL:\s*\$\{CLEAN_DEMO_WORKER_DATABASE_URL:\?CLEAN_DEMO_WORKER_DATABASE_URL is required\}/);
  assert.doesNotMatch(source, /DATABASE_URL:\s*postgresql:\/\//);
});
