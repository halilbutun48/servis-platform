#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");
const docPath = path.join(root, "docs", "UX_PANEL_STANDARD_ARCHITECTURE_01.md");
const shouldWriteDoc = process.argv.includes("--write-doc");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
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

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stagedNames() {
  return gitLines(["diff", "--cached", "--name-only"]).map((line) => line.replace(/\\/g, "/"));
}

function statusNames() {
  const out = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizePath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((text) => normalizePath(text)))].sort(compareText);
}

function gitStatusEntries(paths) {
  const out = execFileSync("git", ["-c", "safe.directory=D:/servis-platform", "status", "--porcelain=v1", "--untracked-files=all", "--", ...paths], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

function mustExactGitPaths(paths, expectedPaths, label) {
  const actual = sortedUniquePaths(gitStatusEntries(paths).map((entry) => entry.path));
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actual.includes(file));
  if (unexpected.length > 0 || missing.length > 0) {
    fail(`${label}: unexpected=${unexpected.join(", ") || "(none)"} missing=${missing.join(", ") || "(none)"}`);
  }
  ok(label);
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  if (actual !== wanted) {
    fail(`${label}: ${actual} != ${wanted}`);
  }
  ok(label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(typeof repoRoot !== "undefined" ? repoRoot : root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      throw new Error(`FAIL ${relPath}: bare CR`);
    }
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const actual = normalizedTextSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  if (actual !== wanted) {
    fail(`${label}: ${actual} != ${wanted}`);
  }
  ok(label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(`${label}: not an ordinary directory`);
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") {
    fail(`${label}: unexpected contents=${entries.join(", ")}`);
  }
  ok(label);
}

const ACCEPTED_SCHEMA_PATH = "backend/prisma/schema.prisma";
const ACCEPTED_SCHEMA_SHA256 = "7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748";
const ACCEPTED_PRISMA_MIGRATIONS = [
  { path: "backend/prisma/migrations/20260125133000_seed_root_baseline/migration.sql", sha256: "27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD" },
  { path: "backend/prisma/migrations/20260125133100_organization_shift_import_baseline/migration.sql", sha256: "864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD" },
  { path: "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/migration.sql", sha256: "E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5" },
  { path: "backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/migration.sql", sha256: "6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB" },
  { path: "backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/migration.sql", sha256: "CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F" },
  { path: "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/migration.sql", sha256: "B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90" },
  { path: "backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/migration.sql", sha256: "734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005" },
  { path: "backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/migration.sql", sha256: "85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17" },
  { path: "backend/prisma/migrations/20260731120000_financial_operations_persistence_01/migration.sql", sha256: "3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0" },
  { path: "backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/migration.sql", sha256: "24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198" },
  { path: "backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/migration.sql", sha256: "A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202" },
  { path: "backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/migration.sql", sha256: "0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A" },
  { path: "backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/migration.sql", sha256: "D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF" },
  { path: "backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/migration.sql", sha256: "8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A" },
  { path: "backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/migration.sql", sha256: "F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A" },
  { path: "backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/migration.sql", sha256: "025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0" },
  { path: "backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/migration.sql", sha256: "D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E" },
  { path: "backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/migration.sql", sha256: "C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54" },
  { path: "backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/migration.sql", sha256: "FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D" },
  { path: "backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/migration.sql", sha256: "E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90" },
  { path: "backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/migration.sql", sha256: "7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007" },
  { path: "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/migration.sql", sha256: "285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27" },
  { path: "backend/prisma/migrations/20260801211000_room_company_cleanup_01/migration.sql", sha256: "E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5" },
  { path: "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/migration.sql", sha256: "3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36" },
  { path: "backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/migration.sql", sha256: "59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA" },
  { path: "backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/migration.sql", sha256: "F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528" },
  { path: "backend/prisma/migrations/20260801215000_consent_surface_bridge_01/migration.sql", sha256: "423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581" },
  { path: "backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/migration.sql", sha256: "252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79" },
  { path: "backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/migration.sql", sha256: "168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F" },
  { path: "backend/prisma/migrations/20260801217000_personel_credential_bridge_01/migration.sql", sha256: "BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC" },
  { path: "backend/prisma/migrations/20260801218000_operational_fk_bridge_01/migration.sql", sha256: "2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924" },
  { path: "backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/migration.sql", sha256: "939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5" },
];
const ACCEPTED_PRISMA_PATH_SET = new Set(
  ACCEPTED_PRISMA_MIGRATIONS.map((entry) => normalizePath(entry.path)).concat(normalizePath(ACCEPTED_SCHEMA_PATH))
);

function mustAcceptedPrismaManifest() {
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

function matches(file, needle) {
  return normalize(file).includes(normalize(needle));
}

function mustNotList(files, needle, label) {
  if (files.some((file) => matches(file, needle))) fail(label);
  ok(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function roleLabelFromPath(rel) {
  const role = rel.split("/")[3] || "shared";
  if (role === "superadmin") return "Super Admin";
  if (role === "room") return "Room";
  if (role === "company") return "Company";
  if (role === "driver") return "Driver";
  if (role === "personel") return "Personel";
  if (role === "parent") return "Parent/Veli";
  if (role === "public") return "Public";
  if (role === "shared") return "Shared";
  if (role === "organization") return "Organization";
  if (role === "school") return "School";
  return role;
}

function walkPanels(dir = path.join(root, "web", "src", "panels"), out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPanels(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = abs.slice(root.length + 1).replace(/\\/g, "/");
    if (/^web\/src\/panels\/.+(?:Panel|Page)\.jsx$/i.test(rel)) out.push(rel);
  }
  return out;
}

function hasAny(text, needles) {
  const hay = normalize(text);
  return needles.some((needle) => hay.includes(normalize(needle)));
}

function classifyPanel(rel, text) {
  const summaryBand = hasAny(text, [
    "FlowSummaryStrip",
    "SystemModeSummaryBand",
    "PanelChrome",
    "summary-first",
    "özet",
    "durum",
    "risk",
    "bekleyen işlem",
    "kısa açıklama",
  ]);
  const kpiBand = hasAny(text, [
    "repeat(auto-fit",
    "StatTile",
    "panelStatTitle",
    "fontSize: 28",
    "kayıt sayısı",
    "plan sayısı",
    "aktif kullanıcı",
    "görüntülenen",
    "toplam kayıt",
    "kpi",
  ]);
  const actionArea = hasAny(text, [
    "<button",
    "className=\"btn",
    "className=\"btn primary\"",
    "göreve başla",
    "yenile",
    "incele",
    "aç",
    "göster",
    "başla",
    "kabul",
    "reddet",
    "kopyala",
    "sil",
    "düzenle",
    "kaydet",
    "okut",
    "tara",
    "şifreyi sıfırla",
    "pasifleştir",
    "aktifleştir",
    "referansları yenile",
  ]);
  const tabs = hasAny(text, [
    "PanelSegmentTabs",
    "tablist",
    "tab",
    "Sekme",
  ]);
  const detail = hasAny(text, [
    "CollapsibleSection",
    "details",
    "Drawer",
    "drawer",
    "MapView",
    "StopTimeline",
    "payloadPretty",
    "Sistem kanıtı",
    "Kanıt",
    "Geçmiş",
    "Log",
  ]);
  const readonly = hasAny(text, [
    "readonly",
    "önizleme",
    "taslak",
    "bilgilendirme",
    "kanıt",
    "geçmiş",
    "preview",
    "read-only",
  ]);
  const mobileSafe = hasAny(text, [
    "safe-area-inset-bottom",
    "scroll-margin-bottom",
    "z-index",
    "zIndex",
    "sticky",
    "fixed",
    "bottom",
    "floating",
    "dock",
  ]);
    const techRisk = hasAny(text, [
    "String(e?.message || e)",
    "String(error?.message || error)",
    "String(e2?.message || e2)",
    "Link token bulunamadı",
    "psv1 token",
    "QR içinde geçerli psv1 token bulunamadı",
    "Tarayıcı konum desteği vermiyor",
    "ACCESS_REVOKED",
    "ACCESS_EXPIRED",
    "ACCESS_NOT_FOUND",
    "ACCESS_DISABLED",
    "Cannot GET",
    "Raw parse error",
    "Claims hash",
  ]);

  let status = "DEFER";
  if (techRisk) status = "UX-FIX";
  else if (summaryBand && kpiBand && actionArea && (tabs || detail || readonly || mobileSafe)) status = "PASS";
  else if (summaryBand && actionArea && (tabs || detail || readonly || mobileSafe)) status = "PASS-";
  else if (summaryBand || actionArea || tabs || detail || readonly || mobileSafe) status = "PASS-";

  return {
    rel,
    role: roleLabelFromPath(rel),
    summaryBand,
    kpiBand,
    actionArea,
    tabs,
    detail,
    readonly,
    mobileSafe,
    techRisk,
    status,
  };
}

function scoreByRole(rows) {
  const summary = new Map();
  for (const row of rows) {
    const prev = summary.get(row.role) || { total: 0, PASS: 0, "PASS-": 0, "UX-FIX": 0, DEFER: 0 };
    prev.total += 1;
    prev[row.status] = (prev[row.status] || 0) + 1;
    summary.set(row.role, prev);
  }
  return summary;
}

function buildDoc(rows) {
  const sorted = [...rows].sort((a, b) => a.role.localeCompare(b.role) || a.rel.localeCompare(b.rel));
  const roleSummary = scoreByRole(sorted);
  const statusCounts = sorted.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { PASS: 0, "PASS-": 0, "UX-FIX": 0, DEFER: 0 }
  );

  const out = [];
  out.push("# UX-PANEL-STANDARD-ARCHITECTURE-01");
  out.push("");
  out.push("Tarih: 2026-05-31");
  out.push("Repo: `servis-platform`");
  out.push("");
  out.push("## 1) Standard");
  out.push("");
  out.push("1. Üst özet bandı");
  out.push("   - durum");
  out.push("   - risk");
  out.push("   - bekleyen işlem");
  out.push("   - kısa açıklama");
  out.push("2. KPI / mini kartlar");
  out.push("   - sayı");
  out.push("   - durum");
  out.push("   - eksik / uyarı");
  out.push("3. Ana aksiyon alanı");
  out.push("   - en önemli buton");
  out.push("   - ikincil butonlar");
  out.push("   - readonly / execute sınırı");
  out.push("4. İşlevsel sekmeler veya bölümler");
  out.push("   - Özet");
  out.push("   - Bekleyenler");
  out.push("   - Detay");
  out.push("   - Kanıt");
  out.push("   - Geçmiş");
  out.push("5. Detay / sistem kanıtı");
  out.push("   - accordion / drawer altında");
  out.push("   - ana ekranı boğmaz");
  out.push("");
  out.push("## 2) Audit Summary");
  out.push("");
  out.push(`- Panel yüzey sayısı: \`${sorted.length}\``);
  out.push(`- PASS: \`${statusCounts.PASS || 0}\``);
  out.push(`- PASS-: \`${statusCounts["PASS-"] || 0}\``);
  out.push(`- UX-FIX: \`${statusCounts["UX-FIX"] || 0}\``);
  out.push(`- DEFER: \`${statusCounts.DEFER || 0}\``);
  out.push("");
  out.push("### Role Summary");
  out.push("");
  for (const role of ["Super Admin", "Room", "Company", "Driver", "Personel", "Parent/Veli", "Organization", "Public", "Shared", "School"]) {
    const item = roleSummary.get(role);
    if (!item) continue;
    out.push(`- ${role}: total \`${item.total}\`, PASS \`${item.PASS || 0}\`, PASS- \`${item["PASS-"] || 0}\`, UX-FIX \`${item["UX-FIX"] || 0}\`, DEFER \`${item.DEFER || 0}\``);
  }
  out.push("");
  out.push("## 3) Audit Matrix");
  out.push("");
  out.push("| Panel / route | Rol | Üst özet bandı | KPI / mini kart | Ana aksiyon | Readonly / execute | Sekme / bölüm | Detay / kanıt | Mobile CTA | Teknik metin | Durum |");
  out.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const row of sorted) {
    out.push(`| \`${row.rel}\` | ${row.role} | ${row.summaryBand ? "Var" : "Yok"} | ${row.kpiBand ? "Var" : "Yok"} | ${row.actionArea ? "Var" : "Kısmi/Yok"} | ${row.readonly ? "Net" : "Kısmi/Belirsiz"} | ${row.tabs ? "Var" : "Yok"} | ${row.detail ? "Var" : "Yok"} | ${row.mobileSafe ? "Var" : "Yok"} | ${row.techRisk ? "Risk" : "Temiz"} | ${row.status} |`);
  }
  out.push("");
  out.push("## 4) Shared Primitives");
  out.push("");
  out.push("- `web/src/components/FlowSummaryStrip.jsx`");
  out.push("- `web/src/components/PanelChrome.jsx`");
  out.push("- `web/src/components/PanelSegmentTabs.jsx`");
  out.push("- `web/src/components/CollapsibleSection.jsx`");
  out.push("- `web/src/components/SystemModeSummaryBand.jsx`");
  out.push("");
  out.push("## 5) Notes");
  out.push("");
  out.push("- Check alias: `check:uxpanelstandardarchitecture01`");
  out.push("- Check command: `node backend\\scripts\\ux_panel_standard_architecture_01_check.js`");
  out.push("- Doc: `docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md`");
  out.push("- Bu standart ürün/business flow değiştirmez.");
  out.push("- Backend route/write-path değiştirmez.");
  out.push("- Schema/migration açmaz.");
  out.push("- Runtime-data dosyalarına dokunmaz.");
  out.push("- Payment/settlement/contract/invite/supplier execute başlatmaz.");
  out.push("- AI/Copilot yeni capability eklemez.");
  out.push("- Playwright runner policy ve coverage matrix fail policy değişmez.");
  out.push("- Teknik/debug/raw/null/undefined görünür metinler ana ekranda kalmamalıdır.");
  out.push("");
  return `${out.join("\n")}\n`;
}

function verifyDoc(docText, summary) {
  const mustContain = [
    "# UX-PANEL-STANDARD-ARCHITECTURE-01",
    "## 1) Standard",
    "## 2) Audit Summary",
    "## 3) Audit Matrix",
    "## 4) Shared Primitives",
    "## 5) Notes",
    "1. Üst özet bandı",
    "2. KPI / mini kartlar",
    "3. Ana aksiyon alanı",
    "4. İşlevsel sekmeler veya bölümler",
    "5. Detay / sistem kanıtı",
    "Super Admin",
    "Room",
    "Company",
    "Driver",
    "Personel",
    "Parent/Veli",
    "Organization",
    "Public",
    "Shared",
    "UX-PANEL-STANDARD-ARCHITECTURE-01",
    "check:uxpanelstandardarchitecture01",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
  ];

  for (const needle of mustContain) {
    if (!normalize(docText).includes(normalize(needle))) {
      throw new Error(`FAIL doc missing: ${needle}`);
    }
  }

  if (!normalize(docText).includes(normalize(String(summary.total)) || "")) {
    throw new Error("FAIL doc summary panel count mismatch");
  }
  if (!normalize(docText).includes(normalize(String(summary.statusCounts.PASS || 0)))) {
    throw new Error("FAIL doc summary PASS count mismatch");
  }
}

function main() {
  console.log("=== UX-PANEL-STANDARD-ARCHITECTURE-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  let doc = exists("docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md") ? read("docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md") : "";
  const cleanupScopeFiles = [
    "backend/src/kvkk/matrix.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
    "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
    "backend/scripts/copilot_role_task_matrix_01_check.js",
    "backend/scripts/copilot_ai_action_roadmap_01_check.js",
    "backend/src/ai/chat/copilotRoleTaskMatrix.js",
    "backend/src/ai/chat/copilotAiActionRoadmap.js",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
    "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "backend/scripts/sefer_abi_terminal_humanize_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
    "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "package.json",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/RoutePreviewModal.jsx",
    "web/src/components/geo/GeoLocationPicker.jsx",
    "web/src/components/geo/HubMapPicker.jsx",
    "web/src/components/map/MapView.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/components/map/mapTileAssets.js",
    "web/src/components/checkin/CameraQrScannerCard.jsx",
    "web/src/index.css",
    "web/src/layout/AppShell.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "backend/scripts/bug_route_impact_preview_button_01_check.js",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/OperationHealthPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelWorkflow.js",
    "web/src/panels/room/roomShiftsPanelActions.js",
    "web/src/panels/room/roomVehiclesPanelActions.js",
    "web/src/panels/shared/KvkkConsentGate.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/utils/regionOwnership.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
  ];

  mustTrue(exists("backend/scripts/ux_panel_standard_architecture_01_check.js"), "panel standard architecture check exists");
  if (!shouldWriteDoc) {
    mustTrue(exists("docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md"), "panel standard architecture doc exists");
  }

  must(pkg, '"check:uxpanelstandardarchitecture01": "node backend/scripts/ux_panel_standard_architecture_01_check.js"', "package.json exposes panel standard architecture check");
  ordered(runner, ["check:uxdensity01", "check:uxpanelstandardarchitecture01", "check:finaluxsmoke01"], "product extensions runner keeps panel standard architecture before final smoke");
  ordered(verify, ["check:uxdensity01", "check:uxpanelstandardarchitecture01", "check:finaluxsmoke01"], "verify chain keeps panel standard architecture before final smoke");

  must(harnessCheck, "UX-PANEL-STANDARD-ARCHITECTURE-01", "script harness check knows panel standard architecture milestone");
  must(harnessCheck, "check:uxpanelstandardarchitecture01", "script harness check knows panel standard architecture alias");
  must(harnessCheck, "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md", "script harness check knows panel standard architecture doc");
  must(harnessDoc, "UX-PANEL-STANDARD-ARCHITECTURE-01", "script harness doc lists panel standard architecture milestone");
  must(harnessDoc, "check:uxpanelstandardarchitecture01", "script harness doc lists panel standard architecture alias");
  must(harnessDoc, "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md", "script harness doc lists panel standard architecture doc");
  must(guide, "UX-PANEL-STANDARD-ARCHITECTURE-01", "milestone guide mentions panel standard architecture milestone");
  must(guide, "check:uxpanelstandardarchitecture01", "milestone guide exposes panel standard architecture check");
  must(guide, "node backend\\scripts\\ux_panel_standard_architecture_01_check.js", "milestone guide includes panel standard architecture command");
  must(guide, "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md", "milestone guide includes panel standard architecture doc");

  const panelRows = walkPanels().map((rel) => classifyPanel(rel, read(rel)));
  mustTrue(panelRows.length > 0, "panel scanner finds panel surfaces");

  const statusCounts = panelRows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { PASS: 0, "PASS-": 0, "UX-FIX": 0, DEFER: 0 }
  );
  const generatedDoc = buildDoc(panelRows);
  if (shouldWriteDoc) {
    fs.writeFileSync(docPath, `${generatedDoc}\n`, "utf8");
    console.log(`WROTE ${path.relative(root, docPath).replace(/\\/g, "/")}`);
  }
  doc = exists(path.relative(root, docPath)) ? read(path.relative(root, docPath)) : generatedDoc;

  must(doc, "UX-PANEL-STANDARD-ARCHITECTURE-01", "panel standard architecture doc title present");
  must(doc, "1. Üst özet bandı", "panel standard architecture doc includes standard point 1");
  must(doc, "2. KPI / mini kartlar", "panel standard architecture doc includes standard point 2");
  must(doc, "3. Ana aksiyon alanı", "panel standard architecture doc includes standard point 3");
  must(doc, "4. İşlevsel sekmeler veya bölümler", "panel standard architecture doc includes standard point 4");
  must(doc, "5. Detay / sistem kanıtı", "panel standard architecture doc includes standard point 5");
  must(doc, "Audit Matrix", "panel standard architecture doc includes audit matrix");
  must(doc, "Super Admin", "panel standard architecture doc audits super admin");
  must(doc, "Room", "panel standard architecture doc audits room");
  must(doc, "Company", "panel standard architecture doc audits company");
  must(doc, "Driver", "panel standard architecture doc audits driver");
  must(doc, "Personel", "panel standard architecture doc audits personel");
  must(doc, "Parent/Veli", "panel standard architecture doc audits parent");
  must(doc, "Public", "panel standard architecture doc audits public");
  must(doc, "Shared", "panel standard architecture doc audits shared");

  const criticalFiles = new Map([
    ["web/src/panels/driver/TodayPanel.jsx", "driver today"],
    ["web/src/panels/organization/CenterPanel.jsx", "organization center"],
    ["web/src/panels/public/PassengerLivePanel.jsx", "public passenger live"],
    ["web/src/panels/shared/NotificationsPanel.jsx", "notifications panel"],
    ["web/src/panels/shared/ReportsPanel.jsx", "reports panel"],
    ["web/src/panels/superadmin/UsersPanel.jsx", "users panel"],
  ]);
  for (const [rel, label] of criticalFiles.entries()) {
    const row = panelRows.find((item) => item.rel === rel);
    mustTrue(Boolean(row), `${label} exists in panel scan`);
    mustTrue(row.status !== "UX-FIX", `${label} is not UX-FIX`);
  }

  verifyDoc(doc, { total: panelRows.length, statusCounts });

  const staged = stagedNames().filter((file) => !cleanupScopeFiles.includes(file));
  mustTrue(staged.length === 0, "stage remains empty");
  const stagedAllowed = new Set([
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyAgreementsBridgeSection.jsx",
    "web/src/panels/company/companyAgreementsPanelHelpers.js",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/room/roomAgreementsBridgeSection.jsx",
    "web/src/panels/room/roomAgreementsPanelHelpers.js",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "tools/repo_contract_state.json",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/bug_route_impact_preview_button_01_check.js",
    "web/src/index.css",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/OperationHealthPanel.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelActions.js",
    "web/src/panels/shared/KvkkConsentGate.jsx",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "backend/scripts/mobile_web_final_01_check.js",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "web/src/panels/driver/TodayPanel.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/public/PassengerLivePanel.jsx",
    "web/src/panels/shared/NotificationsPanel.jsx",
    "web/src/panels/shared/ReportsPanel.jsx",
    "web/src/panels/superadmin/UsersPanel.jsx",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "web/src/App.jsx",
    "web/src/copilot/screenRegistry.js",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "backend/scripts/ux_panel_inventory_02a_check.js",
  ]);
  allWithin(staged, stagedAllowed, [], "staged files stay within panel standard architecture validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  mustAcceptedPrismaManifest();
  const status = statusNames().filter(
    (file) => !cleanupScopeFiles.includes(file) && !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file))
  );
  const exactAllowed = new Set([
    "backend/scripts/ai03b_semantic_visible_audit_01_check.js",
    "backend/scripts/copilot_context_memory_task_state_01_check.js",
    "backend/src/ai/chat/conversationTaskState.js",
    "backend/src/ai/chat/conversationTaskStateResponses.js",
    "backend/src/ai/chat/conversationTaskStateShared.js",
    "backend/src/ai/chat/conversationTaskStateClarifiers.js",
    "backend/src/ai/chat/conversationTaskStateSelectedRecord.js",
    "backend/src/ai/chat/conversationTaskStateFollowUps.js",
    "backend/src/ai/chat/conversationTaskStateBuilders.js",
    "backend/src/ai/chat/conversationTaskStateCompanyReplies.js",
    "backend/src/ai/chat/conversationTaskStateRoomReplies.js",
    "backend/src/ai/chat/screenStateAnalyzer.js",
    "backend/src/ai/jobGuide/screenCatalog.roomCompany.js",
    "backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js",
    "docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "web/src/panels/company/companyAgreementsBridgeSection.jsx",
    "web/src/panels/company/companyAgreementsPanelHelpers.js",
    "web/src/panels/room/roomAgreementsBridgeSection.jsx",
    "web/src/panels/room/roomAgreementsPanelHelpers.js",
    ".gitignore",
    "backend/scripts/load_test_2000_users_01_check.js",
    "backend/scripts/load_test_2000_users_01_harness.js",
    "docs/LOAD_TEST_2000_USERS_01.md",
    "backend/scripts/copilot_dynamic_question_engine_01_check.js",
    "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
    "backend/scripts/copilot_reasoning_answer_composer_01_check.js",
    "backend/src/ai/chat/copilotReasoningAnswerComposer.js",
    "backend/src/ai/schemas.js",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/plan_center_guided_flow_persistence_01_check.js",
    "web/src/components/copilot/FloatingCopilotDrawer.jsx",
    "web/src/components/copilot/uiSurface.js",
    "web/src/panels/company/GuidedPlanModal.jsx",
    "web/src/panels/company/ShiftPeopleTab.jsx",
    "web/src/panels/company/guidedPlanModalActions.js",
    "web/src/panels/company/guidedPlanModalCards.jsx",
    "web/src/panels/company/guidedPlanModalDestinationCards.jsx",
    "web/src/panels/company/guidedPlanModalPeopleStep.jsx",
    "web/src/panels/company/guidedPlanModalPlanCards.jsx",
    "web/src/panels/company/guidedPlanModalSections.jsx",
    "web/src/panels/company/guidedPlanModalShell.jsx",
    "web/src/panels/company/guidedPlanModalUtils.js",
    "web/src/panels/company/shiftPeopleTabActions.js",
    "web/src/panels/company/shiftPeopleTabSections.jsx",
    "web/src/utils/planCenterOverlayLayer.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "web/src/App.jsx",
    "web/src/copilot/screenRegistry.js",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "backend/scripts/copilot_stop_route_draft_01_check.js",
    "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
    "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js",
    "docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md",
    "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
    "backend/src/ai/chat/excelToRouteReadinessRedteamPack.js",
    "docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md",
    "backend/scripts/copilot_clarifying_question_engine_01_check.js",
    "docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/SAFE_DRIVE_01.md",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/panels/driver/MapPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/shared/SafeDriveSummaryCard.jsx",
    "web/src/utils/safeDriveSummary.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md",
    "docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md",
    "tools/PRIMER_SNAPSHOT.md",
    "backend/scripts/sefer_abi_reasoning_assistant_01_check.js",
    "backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js",
    "backend/src/ai/chat/seferAbiReasoningAssistant.js",
    "docs/SEFER_ABI_REASONING_ASSISTANT_01.md",
    "docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md",
    "backend/src/ai/chat/conversationTaskStateDynamicQuestions.js",
    "docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md",
    "backend/scripts/copilot_smart_diagnostic_engine_01_check.js",
    "backend/src/ai/chat/conversationSmartDiagnostics.js",
    "docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md",
    "backend/scripts/copilot_risk_scoring_engine_01_check.js",
    "backend/src/ai/chat/conversationRiskScoringEngine.js",
    "docs/COPILOT_RISK_SCORING_ENGINE_01.md",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_shifts_responsive_layout_fix_01_check.js",
    "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/onboarding_review_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "web/src/App.jsx",
    "web/src/copilot/screenRegistry.js",
    "web/src/components/BrandMark.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/shared/OfferQualityRankingCard.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/OFFER_RANKING_QUALITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
    "docs/ONBOARDING_REVIEW_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "web/src/index.css",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/WorkflowPanel.jsx",
    "web/src/panels/company/companyShiftsPanelCards.jsx",
    "web/src/panels/company/PersonelAccessPanel.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/company/companyShiftsPanelFilters.jsx",
    "web/src/panels/company/companyShiftsPanelMobileCards.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/OffersPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelMobileCards.jsx",
    "web/src/panels/driver/TodayPanel.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/public/PassengerLivePanel.jsx",
    "web/src/panels/shared/NotificationsPanel.jsx",
    "web/src/panels/shared/ReportsPanel.jsx",
    "web/src/panels/superadmin/UsersPanel.jsx",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
    "backend/scripts/ux_smoke_pass_minus_zero_01_check.js",
    "docs/UX_SMOKE_PASS_MINUS_ZERO_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
    "backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js",
    "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js",
    "backend/src/ai/chat/answerQualityPolicy.js",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/intentRouter.js",
    "backend/src/ai/chat/intentRouterCore.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "web/src/state/sessionProvider.jsx",
    "web/src/components/brand/SeferPaktLogo.jsx",
    "web/public/vardis-logo.svg",
    "web/public/vardis-favicon.svg",
    "web/public/seferpakt-lockup.png",
    "web/public/seferpakt-app-icon.png",
    "web/public/seferpakt-favicon.png",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "web/src/utils/offerQualityRanking.js",
    "backend/src/ai/chat/conversationRootCauseEngine.js",
    "backend/src/ai/chat/copilotGuidedTaskEngine.js",
    "backend/src/ai/chat/goldenQuestionPack.js",
    "backend/src/ai/chat/qualityScorer.js",
    "backend/scripts/copilot_guided_task_engine_01_check.js",
    "backend/scripts/copilot_root_cause_engine_01_check.js",
    "docs/COPILOT_GUIDED_TASK_ENGINE_01.md",
    "docs/COPILOT_ROOT_CAUSE_ENGINE_01.md",
    "web/src/utils/uiDataCache.js",
    "backend/src/utils/responseCache.js",
    "backend/src/bootstrap/routeMounts.js",
    "backend/src/server.js",
    "backend/src/routes/dashboardBulk.js",
    "backend/src/routes/companyOverview.js",
    "backend/src/services/dashboardBulk.js",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/room/OperationHealthPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/shared/FinancialOperationsPanel.jsx",
  ]);
  allWithin(
    status,
    exactAllowed,
    ["backend/artifacts/runtime-data/", "tools/repo_contract_state.json", "web/public/seferpakt-", "web/public/vardis-", "web/src/components/brand/", "backend/scripts/", "backend/src/ai/chat/", "backend/src/finance/", "web/src/utils/", "docs/"],
    "working tree stays within panel standard architecture scope",
  );

  mustNotList(status.filter((file) => file !== "backend/src/routes/dashboardBulk.js" && file !== "backend/src/routes/companyOverview.js" && file !== "backend/src/services/dashboardBulk.js"), "backend/src/routes/", "backend routes are untouched");
  mustNotList(status.filter((file) => file !== "backend/src/routes/dashboardBulk.js" && file !== "backend/src/services/dashboardBulk.js"), "backend/src/services/", "backend services are untouched");
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  console.log("=== UX-PANEL-STANDARD-ARCHITECTURE-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
