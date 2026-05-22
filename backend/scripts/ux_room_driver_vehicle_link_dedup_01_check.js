#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
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

function must(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function main() {
  console.log("=== UX-ROOM-DRIVER-VEHICLE-LINK-DEDUP-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxroomdrivervehiclelinkdedup01"', "package.json exposes check:uxroomdrivervehiclelinkdedup01");

  const vehicles = read("web/src/panels/room/VehiclesPanel.jsx");
  const vehicleTabs = read("web/src/panels/room/roomVehiclesPanelUtils.js");
  const vehicleCards = read("web/src/panels/room/roomVehiclesPanelCards.jsx");
  const vehicleSections = read("web/src/panels/room/roomVehiclesPanelSections.jsx");
  mustContains(vehicleTabs, 'label: "Bağlantı"', "VehiclesPanel keeps connection tab");
  mustContains(vehicles, 'title="Araç bağlantısı detayları"', "VehiclesPanel keeps connection details");
  mustContains(vehicleCards, 'Mevcut Bağlı Sürücü', "VehiclesPanel keeps current linked driver card");
  mustContains(vehicleCards, 'Bağlı sürücü', "VehiclesPanel exposes linked driver label");
  mustContains(vehicles, 'selectedDriverId', "VehiclesPanel keeps selected driver state");
  mustContains(vehicles, 'bindDriver(', "VehiclesPanel keeps bind action");
  mustContains(vehicles, 'unbindDriver(', "VehiclesPanel keeps unbind action");
  mustContains(vehicleSections, 'setTab("link")', "VehiclesPanel keeps link tab navigation");
  mustContains(vehicleSections, 'Bağlı sürücüyü yönet', "VehiclesPanel keeps management CTA");

  const drivers = read("web/src/panels/room/DriversPanel.jsx");
  mustContains(drivers, 'label: "Durum"', "DriversPanel keeps status tab");
  mustContains(drivers, 'label: "Yönetim"', "DriversPanel keeps management tab");
  mustContains(drivers, 'label: "Vardiyalar"', "DriversPanel keeps shifts tab");
  mustNotContains(drivers, 'label: "Bağlı Araç"', "DriversPanel removes standalone linked-vehicle tab");
  mustNotContains(drivers, 'setTab("link")', "DriversPanel removes link tab navigation");
  mustNotContains(drivers, 'Bağlı araç özeti', "DriversPanel removes duplicate linked-vehicle panel");
  mustContains(drivers, 'Bağlı araç yok', "DriversPanel exposes linked vehicle readonly fallback");
  mustContains(drivers, 'Bağlı araç:', "DriversPanel exposes linked vehicle readout");
  mustContains(drivers, 'Readonly özet', "DriversPanel keeps readonly summary wording");
  mustContains(drivers, 'Araç bağlantısını Araçlar ekranında yönet', "DriversPanel keeps management CTA");
  mustContains(drivers, 'navigate("/room/vehicles")', "DriversPanel CTA navigates to Vehicles panel");
  mustNotContains(drivers, 'bindDriver(', "DriversPanel removes binding form logic");
  mustNotContains(drivers, 'unbindDriver(', "DriversPanel removes unbind form logic");
  mustNotContains(drivers, 'setBindSel', "DriversPanel removes binding form state");
  mustNotContains(drivers, 'Bağlantı (Sürücü ↔ Araç)', "DriversPanel removes duplicate binding heading");
  mustNotContains(drivers, 'runtime-data', "DriversPanel file avoids runtime-data references");
  mustNotContains(drivers, 'prisma', "DriversPanel file avoids prisma references");
  mustNotContains(drivers, 'migration', "DriversPanel file avoids migration references");

  console.log("=== UX-ROOM-DRIVER-VEHICLE-LINK-DEDUP-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
