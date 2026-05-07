import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
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

function mustNot(text, needle, message) {
  if (normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${message}`);
  }
  console.log(`OK ${message}`);
}

console.log("=== OP-01 OPERATION PROOF / SERVICE PROOF CHECK ===");

const rootPkg = read("package.json");
const server = read("backend/src/server.js");
const routeMounts = read("backend/src/bootstrap/routeMounts.js");
const service = read("backend/src/ops/operationProof.js");
const route = read("backend/src/routes/operationProof.js");
const docs = read("docs/OP_01_OPERATION_PROOF_SERVICE_PROOF_OMURGA.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, "check:op01", "root package exposes check:op01");
must(rootPkg, "check:m99kvkk01", "root package keeps check:m99kvkk01");
must(rootPkg, "check:m99ux01", "root package keeps check:m99ux01");
must(rootPkg, "verify:final", "root package keeps verify:final");

must(server, 'import * as operationProofMod from "./routes/operationProof.js";', "server imports operation proof namespace");
must(server, 'pickExport(operationProofMod, "operationProofRouter")', "server picks operation proof export");
must(server, "operationProofRouter", "server wires operation proof router");
must(routeMounts, "operationProofRouter", "route mounts operation proof router");
must(routeMounts, "/api/operation-proof", "route mounts operation proof endpoint");
must(routeMounts, 'app.use("/api/operation-proof", operationProofRouter());', "route mounts readonly operation proof summary");

must(service, "OPERATION_PROOF_VERSION", "service exposes version");
must(service, "buildOperationProofSummary", "service exposes summary builder");
must(service, "buildServiceProofStatus", "service exposes status builder");
must(service, "normalizeProofSignal", "service exposes signal normalizer");
must(service, "buildProofChecklist", "service exposes checklist builder");
must(service, "OPERATION_PROOF_STATUSES", "service exposes proof statuses");
must(service, "NOT_STARTED", "service keeps NOT_STARTED status");
must(service, "IN_PROGRESS", "service keeps IN_PROGRESS status");
must(service, "EVIDENCE_PARTIAL", "service keeps EVIDENCE_PARTIAL status");
must(service, "EVIDENCE_READY", "service keeps EVIDENCE_READY status");
must(service, "NEEDS_REVIEW", "service keeps NEEDS_REVIEW status");
must(service, "COMPLETED", "service keeps COMPLETED status");
must(service, "OPERATION_PROOF_SIGNAL_TYPES", "service exposes proof signal types");
must(service, "SHIFT_STARTED", "service keeps SHIFT_STARTED signal");
must(service, "SHIFT_COMPLETED", "service keeps SHIFT_COMPLETED signal");
must(service, "GPS_SEEN", "service keeps GPS_SEEN signal");
must(service, "DRIVER_PHONE_GPS_SEEN", "service keeps DRIVER_PHONE_GPS_SEEN signal");
must(service, "VEHICLE_GPS_SEEN", "service keeps VEHICLE_GPS_SEEN signal");
must(service, "BOARDING_RECORDED", "service keeps BOARDING_RECORDED signal");
must(service, "NO_BOARD_RECORDED", "service keeps NO_BOARD_RECORDED signal");
must(service, "ETA_AVAILABLE", "service keeps ETA_AVAILABLE signal");
must(service, "MANUAL_OPERATOR_NOTE", "service keeps MANUAL_OPERATOR_NOTE signal");
must(service, "COMPANY_VISIBLE", "service keeps COMPANY_VISIBLE signal");
must(service, "ROOM_VISIBLE", "service keeps ROOM_VISIBLE signal");
must(service, "SCHOOL_VISIBLE", "service keeps SCHOOL_VISIBLE signal");
must(service, "PARENT_PERSONEL_VISIBLE", "service keeps PARENT_PERSONEL_VISIBLE signal");
must(service, "Sürücünün telefon GPS’i", "service keeps Turkish driver-phone GPS text");
must(service, "Araç GPS’i görüldü", "service keeps vehicle GPS visible text");
must(service, "Biniş kaydı var", "service keeps boarding record text");
must(service, "Operatör notu var", "service keeps operator note text");
must(service, "Servis kanıtı hazırlanıyor", "service keeps service proof prepared text");
must(service, "Kanıt kısmi", "service keeps partial proof text");
must(service, "Kanıt denetime hazır", "service keeps ready-for-audit proof text");
must(service, "Operatör notu bekleniyor", "service keeps operator note pending text");
must(service, "Bu özet hakediş için nihai karar değildir", "service keeps non-final payout note");
must(service, "KVKK görünürlük sınırı korunur", "service keeps KVKK visibility boundary note");
must(service, "Hakediş için nihai karar değildir", "service keeps payment non-final wording");

must(route, "operationProofRouter", "route export exists");
must(route, "r.get(", "route summary endpoint exists");
must(route, '"/summary"', "route summary endpoint path exists");
must(route, "GET /api/operation-proof/summary", "route marker comment exists");
must(route, "buildOperationProofSummary", "route uses operation proof summary builder");
must(route, "resolveGpsSourceVisibility", "route uses GPS visibility helper");
must(route, "gpsStatusFromAt", "route uses GPS freshness helper");
must(route, "rememberResponse", "route caches readonly summary");
must(route, 'requireRole("SUPER_ADMIN", "ROOM", "COMPANY")', "route gates SUPER_ADMIN ROOM COMPANY scopes");
must(route, "SCHOOL / ORGANIZATION", "route scope comment mentions school and organization kinds");
must(route, 'role: "ROOM"', "route supports room scope");
must(route, 'role: "COMPANY"', "route supports company scope");
must(route, 'role: "SUPER_ADMIN"', "route supports super admin scope");
must(route, "companyKind", "route carries company kind in scope");
must(route, "cacheKey: \"global\"", "route keeps global admin cache key");
mustNot(route, "r.post(", "route has no write endpoints");
mustNot(route, "r.put(", "route has no write endpoints");
mustNot(route, "r.delete(", "route has no write endpoints");
mustNot(route, 'requireRole("DRIVER"', "driver is not allowed on operation proof endpoint");
mustNot(route, 'requireRole("PERSONEL"', "personel is not allowed on operation proof endpoint");
mustNot(route, 'requireRole("PARENT"', "parent is not allowed on operation proof endpoint");

must(docs, "Servis kanıtı", "docs mention service proof");
must(docs, "Hizmet kanıtı", "docs mention service evidence");
must(docs, "Sürücünün telefon GPS’i", "docs mention driver-phone GPS");
must(docs, "Araç GPS’i", "docs mention vehicle GPS");
must(docs, "Biniş kaydı", "docs mention boarding record");
must(docs, "Operatör notu", "docs mention operator note");
must(docs, "Hakediş için nihai karar değildir", "docs mention non-final payout note");
must(docs, "KVKK görünürlük sınırı", "docs mention KVKK visibility boundary");
must(docs, "Sözleşme", "docs mention contract");
must(docs, "Kalite puanı", "docs mention quality score");
must(docs, "Copilot operasyon rehberi", "docs mention copilot operations guide");
must(docs, "Kabul edildi / Eksik / Tekrar kontrol", "docs mention acceptance outcome text");
must(docs, "M99-KVKK-01 ve M99-UX-01 kararları korunur", "docs keep M99 decisions note");
must(docs, "Kabul komutları", "docs keep acceptance commands section");
must(docs, "npm run check:op01", "docs include OP-01 acceptance command");

must(primer, "OP-01", "primer shows OP-01 visibility");
must(primer, "M99-KVKK-01", "primer keeps M99-KVKK-01 note");
must(primer, "M99-UX-01", "primer keeps M99-UX-01 note");
must(primer, "kararları korunur", "primer keeps M99 decisions note");
must(registry, "OP-01 - operation proof / service proof merkezi kanıt omurgası - active-readonly", "registry shows OP-01 visibility");
must(registry, "M99-KVKK-01", "registry keeps M99-KVKK-01 visibility");
must(registry, "M99-UX-01", "registry keeps M99-UX-01 visibility");
must(scriptGuide, "node backend\\scripts\\op_01_operation_proof_service_proof_check.js", "script guide exposes check:op01 command");
must(scriptGuide, "node backend\\scripts\\m99_kvkk_01_mobile_web_plain_text_check.js", "script guide keeps M99 KVKK command");
must(scriptGuide, "node backend\\scripts\\m99_ux_01_visible_text_hygiene_check.js", "script guide keeps M99 UX command");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model OperationProof", "schema does not add OperationProof model");
mustNot(schema, "model ServiceProof", "schema does not add ServiceProof model");

if (!exists("backend/scripts/m77_kvkk_uyum_katmani_check.js")) {
  throw new Error("FAIL existing KVKK check script missing");
}
console.log("OK existing KVKK check script remains");

console.log("=== OP-01 OPERATION PROOF / SERVICE PROOF CHECK PASS ===");
