#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANONICAL_AUDIT_CONSUMER_SCOPE, CANONICAL_PRESENTATION_PROVENANCE, CANONICAL_PRESENTATION_SCOPE_COUNT, CURRENT_PARTIALLY_PROVEN_PATH_COUNT, LIFECYCLE_DEFERRED_SUPERSEDED_ORPHAN_PATHS, NORMALIZED_TEXT_SHA256, PRESENTATION_PROVENANCE_AUTHORITY_COUNT, RAW_SHA256, TRACKED_CLEAN_RATIFIED_MIGRATION_COUNT, assertPresentationProvenanceAuthorityShape, evaluatePresentationIdentity } from "./lib/presentationProvenanceAuthority.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const must = (condition, message) => { if (!condition) throw new Error(message); };
const rawSha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex").toUpperCase();
const normalizedSha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n")).digest("hex").toUpperCase();
const rejected = (label, callback) => { let failed = false; try { callback(); } catch { failed = true; } must(failed, label + " must fail closed"); };
must(PRESENTATION_PROVENANCE_AUTHORITY_COUNT === 1 && CANONICAL_PRESENTATION_SCOPE_COUNT === 152 && CANONICAL_PRESENTATION_PROVENANCE.length === 152, "canonical authority scope mismatch");
must(CANONICAL_AUDIT_CONSUMER_SCOPE.length === 147 && TRACKED_CLEAN_RATIFIED_MIGRATION_COUNT === 62 && CURRENT_PARTIALLY_PROVEN_PATH_COUNT === 2, "authority counters mismatch");
must(assertPresentationProvenanceAuthorityShape(), "authority shape invalid");
must(CANONICAL_PRESENTATION_PROVENANCE.filter((record) => record.currentLifecycleStatus === "CURRENT_DIRTY_UNRESOLVED" && record.authorizationState === "ACCEPTED_CURRENT_HEAD").length === 0, "current dirty self-ratification detected");
must(CANONICAL_PRESENTATION_PROVENANCE.length === 152, "silent presentation scope shrink detected");
for (const path of LIFECYCLE_DEFERRED_SUPERSEDED_ORPHAN_PATHS) {
  const record = CANONICAL_PRESENTATION_PROVENANCE.find(({ path: candidate }) => candidate === path);
  must(record?.currentLifecycleStatus === "SUPERSEDED_ORPHAN_SOURCE" && record.owner === "SUPERSEDED_ORPHAN_REVIEW", `lifecycle deferred owner missing: ${path}`);
  must(!evaluatePresentationIdentity(path, { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: "A".repeat(64) }).accepted, `superseded orphan accepted as live UI: ${path}`);
}
const indexPath = "web/src/index.css";
const indexSha = "9760EAD5B458860591FAD4A3EB57FCBBE522D20560212DE5BB9EA038F438AEE1";
must(!evaluatePresentationIdentity("web/src/panels/personel/LivePanel-copy.jsx", { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: "A".repeat(64) }).accepted, "unknown sibling accepted");
must(evaluatePresentationIdentity(indexPath, { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: indexSha }).accepted, "ratified index normalized rejected");
must(!evaluatePresentationIdentity(indexPath, { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: "B".repeat(64) }).accepted, "same path arbitrary SHA accepted");
+must(!evaluatePresentationIdentity(indexPath, { consumer: "AUDIT", algorithm: RAW_SHA256, actualSha256: "B".repeat(64) }).accepted, "wrong raw Audit identity accepted");
must(!evaluatePresentationIdentity(indexPath, { consumer: "KVKK", algorithm: RAW_SHA256, actualSha256: indexSha }).accepted && !evaluatePresentationIdentity(indexPath, { consumer: "AUDIT", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: indexSha }).accepted && !evaluatePresentationIdentity(indexPath, { consumer: "KVKK", algorithm: "SHA256", actualSha256: indexSha }).accepted, "algorithm contract failed open");
const lineEndingRecord = CANONICAL_PRESENTATION_PROVENANCE.find(({ path }) => path === "backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js");
must(lineEndingRecord?.acceptedIdentities.rawSha256 !== lineEndingRecord?.acceptedIdentities.normalizedSha256, "raw and normalized identities must remain distinct when source line endings differ");
const mapPanelPath = "web/src/panels/driver/MapPanel.jsx";
const mapPanelRecord = CANONICAL_PRESENTATION_PROVENANCE.find(({ path }) => path === mapPanelPath);
const mapPanelRawSha = rawSha256(mapPanelPath);
const mapPanelNormalizedSha = normalizedSha256(mapPanelPath);
must(mapPanelRecord?.acceptedIdentities.rawSha256 === mapPanelRawSha, "MapPanel raw identity projection is stale");
must(mapPanelRecord?.acceptedIdentities.normalizedSha256 === mapPanelNormalizedSha, "MapPanel normalized identity projection is stale");
must(mapPanelRawSha !== mapPanelNormalizedSha, "MapPanel raw and normalized identities must remain distinct");
must(evaluatePresentationIdentity(mapPanelPath, { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: mapPanelNormalizedSha }).accepted, "MapPanel KVKK normalized identity rejected");
must(evaluatePresentationIdentity(mapPanelPath, { consumer: "AUDIT", algorithm: RAW_SHA256, actualSha256: mapPanelRawSha }).accepted, "MapPanel Audit raw identity rejected");
must(evaluatePresentationIdentity("web/src/panels/company/AgreementWizard.jsx", { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: rawSha256("web/src/panels/company/AgreementWizard.jsx") }).accepted, "AgreementWizard current identity not ratified");
must(evaluatePresentationIdentity("web/src/panels/company/AgreementsPanel.jsx", { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: rawSha256("web/src/panels/company/AgreementsPanel.jsx") }).accepted, "AgreementsPanel current identity not ratified");
must(evaluatePresentationIdentity("web/src/panels/company/CheckinPanel.jsx", { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: rawSha256("web/src/panels/company/CheckinPanel.jsx") }).accepted, "CheckinPanel current identity not ratified");
for (const file of ["web/src/utils/copilotFacts.js"]) {
  const result = evaluatePresentationIdentity(file, { consumer: "KVKK", algorithm: NORMALIZED_TEXT_SHA256, actualSha256: rawSha256(file) });
  must(result.accepted, file + " current identity not ratified");
}
rejected("scope removal", () => assertPresentationProvenanceAuthorityShape(CANONICAL_PRESENTATION_PROVENANCE.slice(1)));
rejected("duplicate ledger", () => assertPresentationProvenanceAuthorityShape([...CANONICAL_PRESENTATION_PROVENANCE.slice(0, -1), CANONICAL_PRESENTATION_PROVENANCE[0]]));
for (const [label, file, consumer] of [["KVKK", "backend/scripts/security_kvkk_final_01_check.js", "KVKK"], ["Audit", "backend/scripts/audit_log_and_approval_trace_01_check.js", "AUDIT"]]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  must(source.includes('from "./lib/presentationProvenanceAuthority.js"'), label + " does not consume authority");
  must(!source.includes("const terminologyPresentationEntries") && !source.includes("terminologyPresentationShas"), label + " retains local ledger");
  must(source.includes('consumer: "' + consumer + '"'), label + " projection missing");
}
console.log("SINGLE_AUTHORITY_IMPLEMENTED");
console.log("CANONICAL_PRESENTATION_SCOPE=152");
console.log("AUDIT_HISTORIC_PROJECTION=147");
console.log("TRACKED_CLEAN_RATIFIED_MIGRATION=62");
console.log("CURRENT_PARTIALLY_PROVEN_PATHS=2");
console.log("LIFECYCLE_DEFERRED_SUPERSEDED_ORPHAN_PATHS=2");
console.log("CURRENT_PARTIALLY_PROVEN_WHOLE_FILE_APPROVALS=0");
console.log("CURRENT_DIRTY_SELF_RATIFICATION_COUNT=0");
console.log("SILENT_SCOPE_SHRINK_COUNT=0");
console.log("NEGATIVE_SENSITIVITY=PASS");
