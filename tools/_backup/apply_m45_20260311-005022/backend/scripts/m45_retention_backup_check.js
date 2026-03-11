import { banner, step, must, login, reqJson, itemsOf } from "./_harness.js";

async function main() {
  banner("M45 RETENTION + BACKUP CHECK");

  step("login superadmin@demo.com");
  const token = await login("superadmin@demo.com", "demo123");
  must("super admin login ok", !!token);

  step("GET /api/admin/retention/policy");
  const retention = await reqJson("GET", "/api/admin/retention/policy", { token });
  must("retention policy ok", retention.ok && retention.json?.ok === true);
  must("api request retention = 730", Number(retention.json?.apiRequestRetentionDays) === 730);
  must("audit log retention = 730", Number(retention.json?.auditLogRetentionDays) === 730);
  must("gps retention field visible", Object.prototype.hasOwnProperty.call(retention.json || {}, "gpsPointRetentionDays"));
  must("telematics uses gpsPoint", retention.json?.telematicsUsesGpsPoint === true);

  step("GET /api/admin/backup/policy");
  const backupPolicy = await reqJson("GET", "/api/admin/backup/policy", { token });
  must("backup policy ok", backupPolicy.ok && backupPolicy.json?.ok === true);
  must("backup local dir set", typeof backupPolicy.json?.backupLocalDir === "string" && backupPolicy.json.backupLocalDir.length > 0);
  must("backup local retention > 0", Number(backupPolicy.json?.backupLocalRetentionDays) > 0);
  must("backup format visible", typeof backupPolicy.json?.backupDumpFormat === "string" && backupPolicy.json.backupDumpFormat.length > 0);

  step("GET /api/admin/backup/manifest");
  const manifest = await reqJson("GET", "/api/admin/backup/manifest", { token });
  must("backup manifest ok", manifest.ok && manifest.json?.ok === true);
  must("backup manifest has exists flag", typeof manifest.json?.exists === "boolean");

  step("POST /api/admin/retention/run dryRun");
  const dryRun = await reqJson("POST", "/api/admin/retention/run", { token, body: { dryRun: true } });
  must("retention dryRun ok", dryRun.ok && dryRun.json?.ok === true);
  must("retention dryRun returns gpsPoint bucket", !!dryRun.json?.gpsPoint);

  step("GET /api/admin/audit-logs?action=RETENTION_RUN");
  const auditLogs = await reqJson("GET", "/api/admin/audit-logs?action=RETENTION_RUN&take=5", { token });
  must("audit logs endpoint ok", auditLogs.ok);
  const items = itemsOf(auditLogs);
  must("retention run audit visible", items.some((x) => String(x?.action || "") === "RETENTION_RUN"));

  banner("M45 RETENTION + BACKUP CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
