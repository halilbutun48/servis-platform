#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

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

function must(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function stagedFiles() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.replace(/\\/g, "/"));
}

function mustNotStagedPrefix(prefix, label) {
  const files = stagedFiles();
  must(!files.some((file) => file.startsWith(prefix)), label);
}

function mustNotStagedPrefixUnless(prefix, allowed, label) {
  const files = stagedFiles();
  must(
    !files.some((file) => file.startsWith(prefix) && !allowed.has(file.replace(/\\/g, "/"))),
    label,
  );
}

function main() {
  console.log("=== ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01 CHECK ===");

  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/ROOM_VEHICLE_DRIVER_UPPERCASE_NORMALIZATION_01.md");
  const drivers = read("web/src/panels/room/DriversPanel.jsx");
  const vehicles = read("web/src/panels/room/VehiclesPanel.jsx");
  const vehicleCards = read("web/src/panels/room/roomVehiclesPanelCards.jsx");
  const vehicleSections = read("web/src/panels/room/roomVehiclesPanelSections.jsx");
  const driverRoute = read("backend/src/routes/drivers.js");
  const vehicleRoute = read("backend/src/routes/vehicles.js");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  mustContains(pkg, '"check:roomvehicledriveruppercase01"', "package.json exposes check:roomvehicledriveruppercase01");
  mustContains(pkg, '"check:uxsuperadminpanelclarity01"', "package.json keeps check:uxsuperadminpanelclarity01");
  mustContains(pkg, '"check:uxlivepanelpremiumsmoke01"', "package.json keeps check:uxlivepanelpremiumsmoke01");

  assertProductExtensionsIncludes(
    "check:roomvehicledriveruppercase01",
    "product extensions registry includes room uppercase normalization check",
    registryScripts
  );
  mustContains(guide, "ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01", "script guide mentions room uppercase normalization milestone");
  mustContains(guide, "check:roomvehicledriveruppercase01", "script guide exposes room uppercase normalization check");
  mustContains(doc, "Plaka", "room normalization doc mentions plate normalization");
  mustContains(doc, "Ad Soyad", "room normalization doc mentions driver name normalization");
  mustContains(doc, "Cihaz Bilgisi", "room normalization doc mentions device info normalization");

  mustContains(drivers, "upperTr(", "DriversPanel keeps uppercase helper");
  mustContains(drivers, "upperTrOrNull(", "DriversPanel keeps null-safe uppercase helper");
  mustContains(drivers, "fullName: upperTr(fullName)", "DriversPanel normalizes create fullName");
  mustContains(drivers, "deviceInfo: upperTr(deviceInfo)", "DriversPanel normalizes create deviceInfo");
  mustContains(drivers, "fullName: upperTr(editForm.fullName)", "DriversPanel normalizes edit fullName");
  mustContains(drivers, "deviceInfo: upperTrOrNull(editForm.deviceInfo)", "DriversPanel normalizes edit deviceInfo");
  mustContains(drivers, "phone: phone.trim()", "DriversPanel keeps phone trim-only");

  mustContains(vehicles, "upperTr(", "VehiclesPanel keeps uppercase helper");
  mustContains(vehicles, "upperTrOrNull(", "VehiclesPanel keeps null-safe uppercase helper");
  mustContains(vehicles, "plate: upperTr(plate)", "VehiclesPanel normalizes create plate");
  mustContains(vehicles, "body.brand = upperTr(brand)", "VehiclesPanel normalizes create brand");
  mustContains(vehicles, "body.model = upperTr(model)", "VehiclesPanel normalizes create model");
  mustContains(vehicles, "body.color = upperTr(color)", "VehiclesPanel normalizes create color");
  mustContains(vehicles, "body.vin = upperTr(vin)", "VehiclesPanel normalizes create vin");
  mustContains(vehicles, "body.note = upperTr(note)", "VehiclesPanel normalizes create note");
  mustContains(vehicles, "plate: upperTr(editForm.plate)", "VehiclesPanel normalizes edit plate");
  mustContains(vehicles, "brand: upperTrOrNull(editForm.brand)", "VehiclesPanel normalizes edit brand");
  mustContains(vehicles, "model: upperTrOrNull(editForm.model)", "VehiclesPanel normalizes edit model");
  mustContains(vehicles, "color: upperTrOrNull(editForm.color)", "VehiclesPanel normalizes edit color");
  mustContains(vehicles, "vin: upperTrOrNull(editForm.vin)", "VehiclesPanel normalizes edit vin");
  mustContains(vehicles, "note: upperTrOrNull(editForm.note)", "VehiclesPanel normalizes edit note");

  mustContains(vehicleCards, 'toLocaleUpperCase("tr-TR")', "room vehicle cards plate input uppercases");
  mustContains(vehicleSections, 'toLocaleUpperCase("tr-TR")', "room vehicle sections plate input uppercases");

  mustContains(driverRoute, "const upperTr = (value)", "drivers route keeps uppercase helper");
  mustContains(driverRoute, "const upperTrOrNull = (value)", "drivers route keeps null-safe uppercase helper");
  mustContains(driverRoute, "fullName: normalizedFullName", "drivers route normalizes create fullName");
  mustContains(driverRoute, "deviceInfo: normalizedDeviceInfo", "drivers route normalizes create deviceInfo");
  mustContains(driverRoute, "const v = upperTr(b.fullName)", "drivers route normalizes update fullName");
  mustContains(driverRoute, "data.fullName = v", "drivers route writes normalized fullName");
  mustContains(driverRoute, "const v = upperTr(b.deviceInfo)", "drivers route normalizes update deviceInfo");
  mustContains(driverRoute, "data.deviceInfo = v ? v : null", "drivers route writes normalized deviceInfo");
  mustContains(driverRoute, 'r.post("/"', "drivers route keeps existing create endpoint");
  mustContains(driverRoute, 'r.put("/:id"', "drivers route keeps existing update endpoint");

  mustContains(vehicleRoute, "const upperTr = (value)", "vehicles route keeps uppercase helper");
  mustContains(vehicleRoute, "const upperTrOrNull = (value)", "vehicles route keeps null-safe uppercase helper");
  mustContains(vehicleRoute, "plate: normalizedPlate", "vehicles route normalizes create plate");
  mustContains(vehicleRoute, "brand: normalizedBrand", "vehicles route normalizes create brand");
  mustContains(vehicleRoute, "model: normalizedModel", "vehicles route normalizes create model");
  mustContains(vehicleRoute, "color: normalizedColor", "vehicles route normalizes create color");
  mustContains(vehicleRoute, "vin: normalizedVin", "vehicles route normalizes create vin");
  mustContains(vehicleRoute, "note: normalizedNote", "vehicles route normalizes create note");
  mustContains(vehicleRoute, "const p = upperTr(b.plate)", "vehicles route normalizes update plate");
  mustContains(vehicleRoute, "data.plate = p", "vehicles route writes normalized plate");
  mustContains(vehicleRoute, "data.brand = upperTrOrNull(b.brand)", "vehicles route normalizes update brand");
  mustContains(vehicleRoute, "data.model = upperTrOrNull(b.model)", "vehicles route normalizes update model");
  mustContains(vehicleRoute, "data.color = upperTrOrNull(b.color)", "vehicles route normalizes update color");
  mustContains(vehicleRoute, "data.vin = upperTrOrNull(b.vin)", "vehicles route normalizes update vin");
  mustContains(vehicleRoute, "data.note = upperTrOrNull(b.note)", "vehicles route normalizes update note");
  mustContains(vehicleRoute, 'r.post("/"', "vehicles route keeps existing create endpoint");
  mustContains(vehicleRoute, 'r.put("/:id"', "vehicles route keeps existing update endpoint");

  mustNotStagedPrefix("backend/artifacts/runtime-data/", "runtime-data not staged");
  mustNotStagedPrefix("backend/artifacts/browser-smoke/", "browser-smoke artifacts not staged");
  mustNotStagedPrefix("debug.log", "debug.log not staged");
  mustNotStagedPrefixUnless(
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    new Set(["backend/scripts/ux_live_panel_smoke_audit_01_check.js"]),
    "smoke audit check not staged",
  );
  mustNotStagedPrefix("docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "smoke audit doc not staged");
  mustNotStagedPrefix("backend/scripts/sefer_abi_terminal_humanize_01_check.js", "old Sefer Abi audit check not staged");
  mustNotStagedPrefix("backend/scripts/ux_density_01_panel_card_density_check.js", "old density audit check not staged");
  mustNotStagedPrefixUnless(
    "backend/scripts/ux_panel_inventory_02a_check.js",
    new Set(["backend/scripts/ux_panel_inventory_02a_check.js"]),
    "old inventory audit check not staged",
  );
  mustNotStagedPrefixUnless(
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    new Set(["docs/UX_PANEL_INVENTORY_02A_AUDIT.md"]),
    "old inventory audit doc not staged",
  );
  mustNotStagedPrefixUnless(
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    new Set(["docs/UX_PANEL_REALITY_AUDIT_02C.md"]),
    "old reality audit doc not staged",
  );
  mustNotStagedPrefix("docs/UX_PANEL_STRUCTURE_02_AUDIT.md", "general panel structure audit doc not staged");
  mustNotStagedPrefix("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md", "copilot context audit doc not staged");
  mustNotStagedPrefix("backend/src/services/agreementSourceLineageService.js", "agreementSourceLineageService.js not staged");
  mustNotStagedPrefix("backend/artifacts/runtime-data/public-leads.json", "public-leads runtime-data not staged");
  mustNotStagedPrefix("backend/artifacts/runtime-data/agreement-route-refresh-requests.json", "agreement-route-refresh runtime-data not staged");
  mustNotStagedPrefix("backend/artifacts/runtime-data/quality-review-decisions.json", "quality-review runtime-data not staged");

  console.log("=== ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
