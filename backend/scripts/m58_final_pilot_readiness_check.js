import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function banner(title) {
  console.log(`\n=== ${title} ===`);
}

function must(label, ok) {
  if (!ok) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

async function main() {
  banner("M58 FINAL PILOT READINESS CHECK");

  const requiredFiles = [
    "mobile/src/screens/LoginScreen.js",
    "mobile/src/screens/PinChangeScreen.js",
    "mobile/src/screens/TodayScreen.js",
    "mobile/src/lib/gps.js",
    "mobile/src/lib/voice.js",
    "mobile/app.json",
    "mobile/eas.json",
    "backend/scripts/m54_4_driver_route_delivery_check.js",
    "backend/scripts/m55_reports_no_show_check.js",
    "backend/scripts/m56_kvkk_eta_quality_check.js",
    "docs/RUNBOOK_M57_MOBILE_HARDENING.md",
    "docs/RUNBOOK_M58_FINAL_PILOT_READINESS.md",
    "docs/MILESTONE_M58_FINAL_PILOT_READINESS.md",
    "tools/pack_m58_final_pilot_readiness.ps1",
    "tools/check_m58_final_pilot_readiness_repo_contract.ps1",
    "tools/_packs/pack_m42_m58.ps1"
  ];

  console.log("INFO checking required M58 pilot files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const login = read("mobile/src/screens/LoginScreen.js");
  const pin = read("mobile/src/screens/PinChangeScreen.js");
  const today = read("mobile/src/screens/TodayScreen.js");
  const gps = read("mobile/src/lib/gps.js");
  const voice = read("mobile/src/lib/voice.js");
  const appJson = read("mobile/app.json");
  const eas = read("mobile/eas.json");
  const runbook = read("docs/RUNBOOK_M58_FINAL_PILOT_READINESS.md");
  const backlog = read("docs/NEXT_BACKLOG_V1.md");
  const primer = read("tools/PRIMER_SNAPSHOT.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");

  console.log("INFO checking driver mobile acceptance baseline");
  must("login keeps Surucu Kodu + PIN flow", includesAny(login, ["Surucu Kodu + PIN", "Sürücü Kodu + PIN"]));
  must("pin change screen exists for first login", includesAny(pin, ["Yeni PIN belirle", "PIN'i kaydet", "Ilk giriste"]));
  must("today screen exposes route summary", includesAny(today, ["Rota ozeti", "Rota Özeti", "Sonraki durak", "Siradaki durak"]));
  must("today screen exposes voice and ETA actions", includesAny(today, ["Sesli rehber", "ETA oku", "Durak ETA"]));
  must("today screen exposes GPS permission card", includesAny(today, ["Surucunun telefon GPS'i", "GPS iznini yenile", "Ayarlari ac"]));
  must("today screen exposes connection recovery language", includesAny(today, ["Baglanti", "otomatik denemeler devam eder", "Baglanti geri geldi"]));
  must("today screen exposes KVKK blocking card", includesAny(today, ["KVKK", "KVKK onayini tamamla", "KVKK durumunu yenile"]));
  must("gps helper keeps plain Turkish permission text", includesAny(gps, ["Surucunun telefon GPS'i hazir.", "GPS izni kapali.", "izin gerekli"]));
  must("voice helper keeps ETA speech support", includesAny(voice, ["ETA henuz yok", "Durak ETA bilgisi", "dakika"]));

  console.log("INFO checking preview and rollout baseline");
  must("app json keeps m57 release metadata", includesAny(appJson, ["m57-mobile-hardening", "androidPreviewTrack", "productionTrack"]));
  must("eas keeps preview/internal and production profiles", includesAny(eas, ["preview", "production", "internal", "app-bundle"]));

  console.log("INFO checking M58 pilot contract texts");
  must("runbook documents final pilot checklist", includesAny(runbook, ["final pilot checklist", "saha testi", "go / no-go", "go/no-go"]));
  must("runbook documents official green needs field signoff", includesAny(runbook, ["saha kabul", "manuel pilot kabul", "resmi green degildir", "resmi green değildir"]));
  must("backlog points to M58 command", includesAny(backlog, ["pack_m58_final_pilot_readiness.ps1", "Final Pilot Readiness"]));
  must("primer points to M58 command", includesAny(primer, ["pack_m58_final_pilot_readiness.ps1", "Final Pilot Readiness"]));
  must("checklist keeps M58 open", includesAny(checklist, ["[ ] `M58 — Final Pilot Readiness`", "M58 — Final Pilot Readiness"]));

  console.log("\nOK M58 FINAL PILOT READINESS CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
