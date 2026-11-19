import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const evidenceDir = path.resolve(process.env.ROLE_HARDENING_EVIDENCE_DIR || path.join(repoRoot, "output", "postgres-role-hardening-fixture-20261102"));
const evidencePath = path.join(evidenceDir, "evidence.json");

function fail(message) {
  throw new Error(`[ROLE_HARDENING_FIXTURE_CHECK] ${message}`);
}

if (!fs.existsSync(evidencePath)) fail(`evidence bulunamadı: ${evidencePath}`);
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const expect = (condition, message) => { if (!condition) fail(message); };

expect(evidence.roleHardening === "PASS", `roleHardening=${evidence.roleHardening}`);
expect(evidence.globalWriteFreeze === "PASS", `globalWriteFreeze=${evidence.globalWriteFreeze}`);
expect(evidence.fixture?.status === "PASS" && evidence.fixture.cleaned === true, "fixture PASS/cleanup kanıtı eksik");
expect(evidence.sourceBackup?.verified === true && evidence.sourceBackup?.migrationRun === false, "backup provenance eksik");
expect(evidence.mainRuntimeProtection?.mainRuntimeUntouched === true, "ana runtime değişmiş görünüyor");

const roles = evidence.roleSecurity?.targetRoles || {};
for (const name of ["owner", "app", "worker", "freezeAdmin", "migration"]) expect(roles[name], `hedef rol eksik: ${name}`);
expect(roles.owner === "seferpakt_5273_owner", "owner rolü beklenen ad değil");
expect(roles.app === "seferpakt_5273_app", "app rolü beklenen ad değil");
expect(roles.worker === "seferpakt_5273_worker", "worker rolü beklenen ad değil");
expect(roles.freezeAdmin === "seferpakt_5273_freeze_admin", "freeze-admin rolü beklenen ad değil");
expect(roles.migration === "seferpakt_5273_migration", "migration rolü beklenen ad değil");
expect(evidence.roleSecurity.status === "PASS", "roleSecurity PASS değil");
expect(evidence.roleSecurity.appAndWorkerSuperuser === false, "app/worker superuser");
expect(evidence.roleSecurity.appAndWorkerBypassRls === false, "app/worker bypassrls");
expect(evidence.roleSecurity.appAndWorkerOwner === false, "app/worker tablo sahibi");
expect(evidence.roleSecurity.freezeAdminLogin === false && evidence.roleSecurity.migrationLogin === false, "kontrol rolleri login olabilir");

const privilege = evidence.roleSecurity.privilegeSnapshot?.privileges || {};
for (const key of ["appSchemaCreate", "workerSchemaCreate", "appMigrationUpdate", "workerMigrationUpdate", "appSequenceUpdate", "appCanSetOwner", "workerCanSetOwner"]) expect(privilege[key] === false, `güvenlik negatif geçmedi: ${key}`);
expect(privilege.appSchemaUsage === true && privilege.appCompanySelect === true && privilege.appCompanyInsert === true, "app temel DML kanıtı eksik");
expect(privilege.freezeAdminCanSetOwner === true && privilege.migrationCanSetOwner === true, "kontrol rolü ownership zinciri eksik");
expect(Number(evidence.roleSecurity.privilegeSnapshot.tableOwnerCount) === 60, "60 tablo owner'a aktarılmadı");
expect(Number(evidence.roleSecurity.privilegeSnapshot.sequenceOwnerCount) === 56, "56 sequence owner'a aktarılmadı");
expect(evidence.roleSecurity.privilegeSnapshot.securityDefinerCount === 0, "public SECURITY DEFINER fonksiyonu bulundu");
expect(evidence.roleSecurity.privilegeSnapshot.defaultPublicAclCount === 0, "PUBLIC default ACL bulundu");

const probes = evidence.roleSecurity.negativeProbes || {};
for (const key of ["appCreateRole", "workerCreateSchema", "appCreateTable", "appSetRoleOwner", "workerSetRoleOwner", "appMigrationUpdate", "workerMigrationUpdate", "appSequenceSetval", "workerCompanyWrite"]) expect(probes[key]?.rejected === true, `privilege probe reddedilmedi: ${key}`);
expect(probes.workerAllowedWrite?.rejected === false, "worker allowlist yazısı çalışmıyor");

expect(evidence.runtimeIdentity?.appRole === "seferpakt_5273_app" && evidence.runtimeIdentity?.workerRole === "seferpakt_5273_worker", "runtime role provenance eksik");
expect(evidence.runtimeIdentity?.appUrlDistinctFromWorker === true, "app/worker URL ayrımı kanıtlanmadı");
expect(evidence.financialRegression?.status === "PASS", "finans regresyonu PASS değil");
expect(evidence.financialRegression?.before?.migrations?.total === 66 && evidence.financialRegression?.before?.migrations?.finished === 66, "restore edilmiş migration durumu 66/66 değil");
expect(evidence.financialRegression?.before?.financial140k?.invoiceAmountMinor === 14000000, "140.000 TL fatura kanıtı eksik");
expect(evidence.financialRegression?.before?.financial140k?.confirmedCollectionMinor === 8000000, "80.000 TL onaylı tahsilat kanıtı eksik");
expect(evidence.financialRegression?.before?.financial140k?.receivableMinor === 6000000, "60.000 TL kalan borç kanıtı eksik");
expect(evidence.financialRegression?.freezeSnapshotUnchanged === true, "freeze altında finans snapshot değişmiş");
expect(evidence.financialRegression?.mainDemoPaymentWrite === false, "ana DEMO'ya ödeme yazılmış");
expect(evidence.rollback?.status === "PASS", "rollback rehearsal PASS değil");
expect(evidence.dataBoundary?.status === "BLOCKED", "data boundary yanlışlıkla kapatılmış");

console.log(JSON.stringify({ checker: "PASS", evidencePath, roleHardening: evidence.roleHardening, globalWriteFreeze: evidence.globalWriteFreeze }, null, 2));
