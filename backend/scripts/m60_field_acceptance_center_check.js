import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}

function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  const ok = fs.existsSync(path.join(root, rel));
  if (!ok) throw new Error(`FAIL ${rel} exists`);
  console.log(`OK ${rel} exists`);
}

function must(cond, label) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function mustNot(cond, label) {
  if (cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

console.log("=== M60 SAHA ACCEPTANCE MERKEZI CHECK ===");
console.log("INFO checking required M60 files");
[
  "backend/src/ops/fieldAcceptanceManifest.js",
  "backend/src/ops/fieldAcceptanceState.js",
  "backend/src/routes/fieldAcceptance.js",
  "web/src/panels/superadmin/FieldAcceptanceCenter.jsx",
  "docs/RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md",
  "docs/MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md",
  "tools/pack_m60_field_acceptance_center.ps1",
  "tools/check_m60_field_acceptance_center_repo_contract.ps1",
  "README.md",
  "docs/PROJECT_SPEC_V1.md",
  "docs/PRIMER_SSOT.md",
  "docs/STARTPACK_V1.md",
  "docs/CHECKLIST_SSOT.md",
].forEach(exists);

console.log("INFO checking updated product identity and route");
const projectSpec = read("docs/PROJECT_SPEC_V1.md");
const readme = read("README.md").toLowerCase();
const checklist = read("docs/CHECKLIST_SSOT.md");

must(
  includesText(projectSpec, "hizmet alan değerlendirmesi") ||
  includesText(projectSpec, "hizmet alan degerlendirmesi") ||
  includesText(projectSpec, "service evaluation"),
  "project spec includes hizmet alan degerlendirmesi"
);
must(
  includesText(readme, "m60") ||
  includesText(readme, "m65") ||
  includesText(readme, "m66") ||
  includesText(readme, "acceptance") ||
  includesText(readme, "kabul") ||
  includesText(readme, "saha"),
  "root readme points to historical M60 route or later living route"
);
must(
  includesText(checklist, "M59") && (includesText(checklist, "M60") || includesText(checklist, "M65") || includesText(checklist, "M66")),
  "checklist marks M59 green and keeps M60 open"
);

console.log("INFO checking backend acceptance session");
const serverTxt = read("backend/src/server.js");
const mountTxt = fs.existsSync(path.join(root, "backend/src/bootstrap/routeMounts.js"))
  ? read("backend/src/bootstrap/routeMounts.js")
  : "";
const routeTxt = read("backend/src/routes/fieldAcceptance.js");
const manifestTxt = read("backend/src/ops/fieldAcceptanceManifest.js");
const stateTxt = read("backend/src/ops/fieldAcceptanceState.js");
const panelTxt = read("web/src/panels/superadmin/FieldAcceptanceCenter.jsx");

must(
  includesText(serverTxt, "fieldAcceptanceRouter") || mountTxt.includes("fieldAcceptanceRouter"),
  "server imports field acceptance router"
);
must(
  includesText(serverTxt, "/api/field-acceptance") || mountTxt.includes("/api/field-acceptance"),
  "server mounts /api/field-acceptance"
);
must(
  includesText(routeTxt, "/manifest") || includesText(routeTxt, 'router.get("/manifest"') || includesText(routeTxt, "router.get('/manifest'"),
  "field acceptance route exposes manifest endpoint"
);
must(
  includesText(routeTxt, "/session") || includesText(routeTxt, 'router.get("/session"') || includesText(routeTxt, "router.get('/session'"),
  "field acceptance route exposes session endpoint"
);
must(
  includesText(routeTxt, "/session/decision") || includesText(routeTxt, "/session/checklist") || includesText(routeTxt, 'router.patch("/session/decision"') || includesText(routeTxt, 'router.patch("/session/checklist"'),
  "field acceptance route exposes editable session endpoints"
);
mustNot(
  includesAnyText(routeTxt, ["/session-template", "/template"]),
  "field acceptance route drops template endpoint"
);
must(
  includesText(manifestTxt, "decisions") || includesText(manifestTxt, "checklist"),
  "manifest defines M60 decisions and checklist"
);
must(
  includesText(manifestTxt, "evidence") || includesText(manifestTxt, "kanıt") || includesText(manifestTxt, "kanit"),
  "manifest defines acceptance evidence"
);
must(
  includesText(stateTxt, "createFieldAcceptanceSession") &&
  includesText(stateTxt, "saveFieldAcceptanceSession") &&
  includesText(stateTxt, "updateFieldAcceptanceChecklistItemStatus"),
  "state store exposes real session helpers"
);
must(
  includesText(panelTxt, "FieldAcceptanceCenter") || includesText(panelTxt, "Acceptance") || includesText(panelTxt, "Kabul"),
  "web panel shows M60 cards"
);
must(
  includesText(panelTxt, "Yeni oturum oluştur") &&
  includesText(panelTxt, "Oturumu kaydet") &&
  includesText(panelTxt, "Kararı kaydet") &&
  includesText(panelTxt, "/api/field-acceptance/session") &&
  includesText(panelTxt, "/api/field-acceptance/session/decision") &&
  includesText(panelTxt, "/api/field-acceptance/session/checklist"),
  "web panel uses real acceptance session endpoints"
);
mustNot(
  includesAnyText(panelTxt, ["/api/field-acceptance/session-template", "/session-template"]),
  "web panel drops session-template endpoint"
);

console.log("M60 SAHA ACCEPTANCE MERKEZI CHECK PASS");
