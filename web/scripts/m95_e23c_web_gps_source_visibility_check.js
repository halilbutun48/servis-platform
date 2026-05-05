import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");

function read(relPath) {
  return fs.readFileSync(path.join(webRoot, relPath), "utf8");
}

function readRepo(relPath) {
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

function must(text, needle, msg) {
  if (!normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log("=== M95-E23C WEB GPS SOURCE VISIBILITY CHECK ===");

const rootPkg = readRepo("package.json");
const webPkg = read("package.json");
const helper = read("src/utils/gpsSourceVisibility.js");
const mapView = read("src/components/map/MapView.jsx");
const routePanel = read("src/panels/driver/RoutePanel.jsx");

must(rootPkg, "check:m95e23c", "root package exposes check:m95e23c");
must(rootPkg, "npm run check:m95e23c && npm run check:web-mobile && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot", "root final verify chain includes web source visibility check");
must(webPkg, "check:m95e23c", "web package exposes m95e23c");
must(helper, "gpsSourceVisibilityTextFromVehicle", "web helper exports source visibility resolver");
must(helper, "sourceVisibility?.text", "web helper prefers source visibility text");
must(helper, "sourceVisibility?.label", "web helper keeps source visibility label");
must(helper, "gpsSourceLabelFromKey", "web helper keeps fallback source label");
must(helper, "officialSource", "web helper resolves official source key");
must(mapView, "gpsSourceVisibilityTextFromVehicle", "map view imports source visibility helper");
must(mapView, "gpsSourceFallbackLabel", "map view keeps fallback label path");
must(mapView, "selectedVehicle?.gpsState?.lastSource", "map view keeps legacy source fallback");
must(mapView, "GPS kaynağı:", "map view shows gps source badge");
must(mapView, "sourceVisibility?.label", "map view can expose source visibility label");
must(mapView, "gpsSourceVisibility.text || gpsSourceFallbackLabel", "map view prefers source visibility text");
must(routePanel, "liveLocation: data?.liveLocation || null", "route panel forwards live location payload");
must(routePanel, "gpsState: { lastSource:", "route panel keeps legacy source fallback");

console.log("=== M95-E23C WEB GPS SOURCE VISIBILITY CHECK PASS ===");
