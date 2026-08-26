#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
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

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function main() {
  console.log("=== UX-ROOM-OPS-RELATIONSHIP-POLISH-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxroomopsrelationshippolish01"', "package.json exposes check:uxroomopsrelationshippolish01");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  assertProductExtensionsIncludes(
    "check:uxroomopsrelationshippolish01",
    "product extensions registry includes room ops relationship polish check",
    registryScripts
  );

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-ROOM-OPS-RELATIONSHIP-POLISH-01", "script guide mentions UX-ROOM-OPS-RELATIONSHIP-POLISH-01");
  mustContains(guide, "check:uxroomopsrelationshippolish01", "script guide exposes check:uxroomopsrelationshippolish01");

  const structureAudit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(structureAudit, "UX-ROOM-OPS-RELATIONSHIP-POLISH-01", "structure audit includes room relationship polish note");
  must(!normalize(structureAudit).includes("runtime-data"), "structure audit avoids runtime-data");
  must(!normalize(structureAudit).includes("prisma"), "structure audit avoids prisma");
  must(!normalize(structureAudit).includes("migration"), "structure audit avoids migration");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-ROOM-OPS-RELATIONSHIP-POLISH-01", "copilot audit mentions UX-ROOM-OPS-RELATIONSHIP-POLISH-01");

  const opHealth = read("web/src/panels/room/OperationHealthPanel.jsx");
  mustContains(opHealth, 'PanelSegmentTabs', "OperationHealthPanel keeps segmented tabs");
  mustContains(opHealth, 'label: "Sürücü & Sorunlar"', "OperationHealthPanel exposes combined problems tab");
  mustContains(opHealth, 'key: "problems"', "OperationHealthPanel keeps problems tab key");
  mustContains(opHealth, 'Sorunlu Sürücüler / Canlılık Listesi', "OperationHealthPanel keeps driver live list surface");
  mustContains(opHealth, 'Açık Sorunlar', "OperationHealthPanel keeps open issues surface inside the same view");
  mustNotContains(opHealth, 'key: "issues"', "OperationHealthPanel removes standalone issues tab");
  mustNotContains(opHealth, 'label: "Açık Sorunlar"', "OperationHealthPanel does not expose open issues as a tab label");
  must(countMatches(opHealth, /activeTab === "/g) === 3, "OperationHealthPanel keeps exactly three tab branches");
  must(countMatches(opHealth, /role="tabpanel"/g) === 3, "OperationHealthPanel keeps exactly three tabpanel surfaces");

  const vehicles = read("web/src/panels/room/VehiclesPanel.jsx");
  const vehicleCards = read("web/src/panels/room/roomVehiclesPanelCards.jsx");
  const vehicleSections = read("web/src/panels/room/roomVehiclesPanelSections.jsx");
  mustContains(vehicles, 'const currentVehicle = items.find((x) => Number(x?.id) === Number(focusVehicleId)) || null;', "VehiclesPanel precomputes currentVehicle before link fill");
  mustContains(vehicles, 'const nextDriverId = Number(currentVehicle?.driver?.id || currentVehicle?.driverId || 0);', "VehiclesPanel fills link tab from current vehicle binding");
  mustContains(vehicles, 'const selectedDriverId = Number(bindSel?.[focusVehicleId] || focusDriverId || 0);', "VehiclesPanel keeps safe selectedDriverId fallback");
  mustContains(vehicles, 'Araç bağlantısı detayları', "VehiclesPanel shows vehicle link section title");
  mustNotContains(vehicles, 'Bağlantı detayları', "VehiclesPanel removes generic connection wording");
  mustContains(vehicleCards, 'Mevcut Bağlı Sürücü', "Vehicle cards keep current linked driver card");
  mustContains(vehicleCards, 'Bağlı sürücü', "Vehicle cards expose linked driver label");
  mustContains(vehicleCards, 'Araç bağlantısı (Araç ↔ Sürücü)', "Vehicle cards keep Turkish link heading");
  mustContains(vehicleSections, 'Bağlı sürücüyü yönet', "Vehicle list rows route connection management to vehicles");

  const drivers = read("web/src/panels/room/DriversPanel.jsx");
  mustContains(drivers, 'label: "Durum"', "DriversPanel keeps status tab label");
  mustContains(drivers, 'label: "Yönetim"', "DriversPanel keeps management tab label");
  mustContains(drivers, 'label: "Vardiyalar"', "DriversPanel keeps shifts tab label");
  mustNotContains(drivers, 'label: "Bağlı Araç"', "DriversPanel removes standalone linked-vehicle tab");
  mustContains(drivers, 'Bağlı araç yok', "DriversPanel shows readonly linked vehicle summary");
  mustContains(drivers, 'Bağlı araç:', "DriversPanel exposes linked vehicle readout");
  mustContains(drivers, 'Araç bağlantısını Araçlar ekranında yönet', "DriversPanel routes management CTA to VehiclesPanel");
  mustContains(drivers, 'navigate("/room/vehicles")', "DriversPanel CTA navigates to Vehicles panel");
  mustNotContains(drivers, 'bindDriver(', "DriversPanel removes binding form logic");
  mustNotContains(drivers, 'unbindDriver(', "DriversPanel removes unbind form logic");
  mustNotContains(drivers, 'setBindSel', "DriversPanel removes binding form state");
  mustNotContains(drivers, 'setTab("link")', "DriversPanel removes standalone linked-vehicle tab navigation");
  mustNotContains(drivers, 'Bağlı araç özeti', "DriversPanel removes duplicate linked-vehicle panel");
  mustNotContains(drivers, 'Bağlantı detayları', "DriversPanel removes generic connection wording");
  mustNotContains(drivers, 'Bağlantı (Sürücü ↔ Araç)', "DriversPanel removes duplicate binding heading");

  const hubVisible = [
    read("web/src/panels/room/HubPanel.jsx"),
    read("web/src/components/geo/HubMapPicker.jsx"),
    read("web/src/components/AgreementOpsBridgeCard.jsx"),
    read("web/src/components/RoutePreviewModal.jsx"),
    read("web/src/panels/company/guidedPlanModalCards.jsx"),
    read("web/src/panels/company/guidedPlanModalDestinationCards.jsx"),
    read("web/src/panels/company/guidedPlanModalSections.jsx"),
    read("web/src/panels/company/GuidedPlanModal.jsx"),
    read("web/src/panels/company/companyShiftsPanelCards.jsx"),
    read("web/src/panels/company/shiftPeopleTabSections.jsx"),
    read("web/src/panels/company/ShiftPeopleTab.jsx"),
    read("web/src/panels/company/AgreementWizard.jsx"),
  ].join("\n\n");
  mustContains(read("web/src/components/geo/HubMapPicker.jsx"), 'subjectLabel = "Toplanma Konumu"', "HubMapPicker defaults to Toplanma Konumu");
  mustContains(read("web/src/components/AgreementOpsBridgeCard.jsx"), "Toplanma Konumu", "AgreementOpsBridgeCard shows Toplanma Konumu label");
  mustContains(hubVisible, "Taşımacılık Firması Konumu", "Hub UI shows room-specific Konum label");
  mustContains(hubVisible, "Firma Konumu", "Hub UI shows company-specific Konum label");
  mustContains(hubVisible, "Toplanma Konumu", "Hub UI shows generic Konum label");
  mustContains(hubVisible, "Gidilecek konumlar", "Hub UI shows organization destination Konum wording");
  mustContains(hubVisible, "Her konum ayrı satır olsun.", "Hub UI shows organization row Konum wording");
  mustContains(hubVisible, "Organizasyon planı markete gönderime hazır", "Hub UI shows organization readiness headline");
  mustContains(hubVisible, "Organizasyon planı henüz tam değil", "Hub UI shows organization blocking headline");
  mustContains(hubVisible, "Tüm konumlar koordinatlı", "Hub UI shows organization Konum readiness copy");
  mustContains(hubVisible, "Organizasyon işlerinde plan tam oluşmadan markete düşmez.", "Hub UI shows organization readiness note");
  mustContains(hubVisible, "Firma konumu koordinat olarak hazır", "Hub UI shows company readiness headline");
  mustContains(hubVisible, "Firma konumu henüz tam değil", "Hub UI shows company blocking headline");
  mustContains(hubVisible, "Toplanma konumu kaydedildi.", "Hub UI shows translated save feedback");
  mustContains(hubVisible, "Firma konumu kaydedildi.", "Hub UI shows translated company save feedback");
  mustContains(hubVisible, "Toplanma Konumu eksik • teklif engeli değil", "Hub UI shows translated room fallback copy");
  mustContains(hubVisible, "Toplanma Konumu eksik; rota tahmini durak sırasına göre gösteriliyor.", "Route preview keeps translated hub fallback");
  mustNotContains(hubVisible, "Room Hub", "Hub UI removes room hub copy");
  mustNotContains(hubVisible, "Company Hub", "Hub UI removes company hub copy");
  mustNotContains(hubVisible, "Hub:", "Hub UI removes raw colon label");
  mustNotContains(hubVisible, "Hub Lat", "Hub UI removes raw lat label");
  mustNotContains(hubVisible, "Hub Lng", "Hub UI removes raw lng label");
  mustNotContains(hubVisible, "Hub konumu", "Hub UI removes raw hub location copy");
  mustNotContains(hubVisible, "Mevcut Hub", "Hub UI removes raw current hub label");
  mustNotContains(hubVisible, "Hub eksik", "Hub UI removes raw hub fallback copy");
  mustNotContains(hubVisible, "Sadece hub", "Hub UI removes raw hub-only copy");
  mustNotContains(hubVisible, "Hub uygulandı", "Hub UI removes raw applied hub copy");
  mustNotContains(hubVisible, "Toplanma Yeri", "Hub UI removes old yer wording");
  mustNotContains(hubVisible, "Oda Yeri", "Hub UI removes old room yer wording");
  mustNotContains(hubVisible, "Şirket Yeri", "Hub UI removes old company yer wording");
  mustNotContains(hubVisible, "Buluşma Yeri", "Hub UI removes old meeting yer wording");

  must(!normalize(hubVisible).includes("runtime-data"), "Hub UI files avoid runtime-data");
  must(!normalize(hubVisible).includes("prisma"), "Hub UI files avoid prisma");
  must(!normalize(hubVisible).includes("migration"), "Hub UI files avoid migration");

  console.log("=== UX-ROOM-OPS-RELATIONSHIP-POLISH-01 CHECK PASS ===");
}

main();
