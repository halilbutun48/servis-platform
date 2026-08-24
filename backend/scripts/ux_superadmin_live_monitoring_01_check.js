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

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
}

function ordered(text, needles, label) {
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^\\p{L}\\p{N}])`, "iu");
    const slice = haystack.slice(last + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = last + 1 + (match.index || 0);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log("=== UX-SUPERADMIN-LIVE-MONITORING-01 CHECK ===");

  const panel = read("web/src/panels/superadmin/ObservabilityPanel.jsx");
  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(panel, "Canlı Sağlık ve Risk Özeti", "title kept");
  must(panel, "PanelKvkkHint panelKey=\"observability\"", "kvkk hint kept");
  must(panel, "KVKK / alarm aktif", "critical band title");
  must(panel, "Canlı durum", "top metric live status");
  must(panel, "GPS güvenli durum", "top metric gps safety");
  must(panel, "QA giriş kaydı", "top metric qa entry");
  must(panel, "Açık alarm / açık sorun", "top metric open issue");
  must(panel, "Son canlı akış", "top metric latest stream");
  must(panel, "Yenile", "refresh action kept");
  must(panel, "Alarmları aç", "alarms action kept");
  must(panel, "PanelSegmentTabs", "functional tabs used");
  must(panel, 'const [activeTab, setActiveTab] = useState("summary")', "default summary tab");
  must(panel, 'activeTab === "summary"', "summary conditional render");
  must(panel, 'activeTab === "live"', "live conditional render");
  must(panel, 'activeTab === "alarms"', "alarms conditional render");
  must(panel, 'activeTab === "events"', "events conditional render");
  must(panel, 'activeTab === "proof"', "proof conditional render");
  must(panel, 'activeTab === "history"', "history conditional render");
  must(panel, "Özet", "summary tab label");
  must(panel, "Canlı Akış", "live tab label");
  must(panel, "Alarmlar & Riskler", "alarms tab label");
  must(panel, "İzlenen Olaylar", "events tab label");
  must(panel, "Sistem Kanıtı", "proof tab label");
  must(panel, "Geçmiş / Log", "history tab label");
  must(panel, "Son canlı akışlar", "live list section");
  must(panel, "İzlenen olay türleri", "event types section");
  must(panel, "Kanıt hedefleri", "proof destinations section");
  must(panel, "Kanıt sinyalleri", "proof signals section");
  must(panel, "Dead-letter geçmişi", "history dead-letter section");
  must(panel, "Geçmiş / Log", "history title");
  must(panel, "Kritik risk özeti", "summary risk card");
  must(panel, "Sıradaki doğru kontrol", "summary next step");
  must(panel, "Canlı yorum", "live commentary card");
  must(panel, "Alarm geçmişi", "alarm history card");
  must(panel, "İzleme kapsamı", "event scope card");
  must(panel, "Sistem kanıtı", "proof card");
  must(panel, "Log özeti", "history summary card");
  must(panel, "Kuyruk:", "queue destination visible in proof");
  must(panel, "İşlemde:", "processing destination visible in proof");
  must(panel, "Kanıt anahtarı:", "claims hash destination rewritten for clarity");
  must(panel, "Kanıt indeksi:", "claims index destination visible in proof");
  must(panel, "Hatalı kayıt hattı:", "dead-letter destination visible in proof");
  must(panel, "Kayıt ayrıştırılamadı", "safe parse error wording visible");
  mustNot(panel, "Claims hash:", "raw claims hash label removed");
  mustNot(panel, "Raw parse error:", "raw parse error label removed");
  must(pkg, '"check:uxsuperadminlivemonitoring01"', "package exposes live monitoring check");
  assertProductExtensionsIncludes("check:uxsuperadminlivemonitoring01", "product extensions registry includes live monitoring check", registryScripts);
  must(guide, 'UX-SUPERADMIN-LIVE-MONITORING-01', "guide mentions live monitoring milestone");
  must(guide, 'check:uxsuperadminlivemonitoring01', "guide exposes live monitoring check");
  ordered(panel, [
    "Canlı Sağlık ve Risk Özeti",
    "PanelKvkkHint",
    "Saha akışının canlı özetidir.",
    "PanelSegmentTabs",
  ], "top band before tabs");

  console.log("=== UX-SUPERADMIN-LIVE-MONITORING-01 CHECK PASS ===");
}

main();
