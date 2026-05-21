import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
  console.log(`OK ${message}`);
}

function indexOfRequired(text, needle, label) {
  const idx = text.indexOf(needle);
  must(idx >= 0, `${label} contains ${needle}`);
  return idx;
}

function main() {
  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const vehicles = read("web/src/panels/room/VehiclesPanel.jsx");

  must(pkg.includes('"check:uxroomvehiclestelematicsfix"'), "package.json exposes check:uxroomvehiclestelematicsfix");
  must(pkg.includes('"check:uxpanelstructure02b"'), "package.json keeps check:uxpanelstructure02b");
  must(pkg.includes('"check:uxpaneltabsfix01"'), "package.json keeps check:uxpaneltabsfix01");

  must(runner.includes("'check:uxroomvehiclestelematicsfix'"), "product extensions runner includes check:uxroomvehiclestelematicsfix");
  must(verify.includes('"check:uxroomvehiclestelematicsfix"'), "verify chain includes check:uxroomvehiclestelematicsfix");
  must(guide.includes("UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-01"), "script guide mentions UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-01");
  must(guide.includes("check:uxroomvehiclestelematicsfix"), "script guide exposes check:uxroomvehiclestelematicsfix");

  must(vehicles.includes("PanelSegmentTabs"), "VehiclesPanel keeps PanelSegmentTabs");
  must(vehicles.includes("hasGpsFix"), "VehiclesPanel keeps hasGpsFix import");
  must(vehicles.includes("telematicsRows = []"), "VehiclesPanel telematicsRows has safe fallback");
  must(vehicles.includes("telematicsCounts = {}"), "VehiclesPanel telematicsCounts has safe fallback");

  const telematicsDeclIdx = indexOfRequired(vehicles, "telematicsCounts = {}", "VehiclesPanel");
  const vehicleSummaryIdx = indexOfRequired(vehicles, "const vehicleSummary = useMemo", "VehiclesPanel");
  must(telematicsDeclIdx < vehicleSummaryIdx, "VehiclesPanel telematicsCounts declaration precedes vehicleSummary");
  must(vehicles.includes("Object.values(telematicsCounts || {})"), "VehiclesPanel vehicleSummary uses safe telematicsCounts fallback");
  must(vehicles.includes("useRoomVehicleTelematics({"), "VehiclesPanel keeps telematics hook");
  must(vehicles.includes("RoomVehicleTelematicsSection"), "VehiclesPanel keeps telematics section");

  must(!vehicles.includes("runtime-data"), "VehiclesPanel avoids runtime-data wording");
  must(!vehicles.includes("prisma"), "VehiclesPanel avoids prisma wording");
  must(!vehicles.includes("migration"), "VehiclesPanel avoids migration wording");

  console.log("=== UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX CHECK PASS ===");
}

main();
