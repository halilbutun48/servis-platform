import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function normalize(text) {
  return String(text || "")
    .replace(/[’']/g, "'")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function must(text, needle, message) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${message}`);
  }
  console.log(`OK ${message}`);
}

console.log("=== M95-E23B BACKEND GPS SOURCE VISIBILITY CHECK ===");

const rootPkg = read("package.json");
const helper = read("backend/src/gps/sourceVisibility.js");
const driver = read("backend/src/routes/driver.js");
const chain = read("backend/scripts/run_repo_check_chain.js");

must(rootPkg, "check:m95e23b", "root package exposes check:m95e23b");
must(chain, "m95e23b-gps-source-visibility", "repo check chain references m95e23b");
must(helper, "export function resolveGpsSourceVisibility", "helper exports resolver");
must(helper, 'officialSourceKey = "BACKEND_VEHICLE_GPS"', "helper defaults to backend vehicle gps");
must(helper, "Sürücünün telefon GPS’i", "helper keeps driver phone product language");
must(helper, 'const mode = isDriverPhone ? "official" : "vehicle_official";', "helper distinguishes official modes");
must(helper, 'isDriverPhone ? `${label} devrede` : `${label} canlı`', "helper keeps live text rules");
must(helper, "Telefon GPS’i beklemede — görev yok", "helper keeps no-task standby text");
must(helper, "GPS bekleniyor", "helper keeps waiting text");
must(helper, "GPS eski", "helper keeps stale text");
must(driver, "resolveGpsSourceVisibility", "driver route imports source visibility helper");
must(driver, "sourceVisibility", "driver route emits source visibility");
must(driver, "officialSource: vehicleGpsSource", "driver route preserves officialSource");
must(driver, 'sourcePriority: ["BACKEND_VEHICLE_GPS", "DRIVER_PHONE", "LOCAL_DEVICE_PREVIEW", "CACHED_BACKEND_VEHICLE_GPS"]', "driver route preserves source priority");
must(driver, "backendVehicleGps: backendGpsMeta", "driver route preserves backend vehicle gps payload");
must(driver, "backendGpsLabel = sourceVisibility.label", "driver route keeps compatibility label alias");
must(driver, "label: backendGpsLabel", "driver route labels via helper");
must(driver, "sourceLabel: backendGpsLabel", "driver route sourceLabel stays aligned");
must(driver, "sourceVisibility,", "driver route includes sourceVisibility in liveLocation");

console.log("=== M95-E23B BACKEND GPS SOURCE VISIBILITY CHECK PASS ===");
