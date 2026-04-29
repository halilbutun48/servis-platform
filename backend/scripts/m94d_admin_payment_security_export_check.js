import { banner, must, read } from "./_static_milestone_check.js";

function includesText(text, needle) {
  return String(text || "").includes(needle);
}

function includesAll(text, needles) {
  return needles.every((needle) => includesText(text, needle));
}

banner("M94-D ADMIN PAYMENT SECURITY EXPORT CHECK");

const state = JSON.parse(read("tools/repo_contract_state.json"));
const adminJs = read("backend/src/routes/admin.js");
const adminLogsJs = read("backend/src/routes/admin_logs.js");
const commercialCoreJs = read("backend/src/routes/commercialCore.js");
const backendPackage = JSON.parse(read("backend/package.json"));
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const panelActions = read("web/src/panels/superadmin/commercialCorePanelActions.js");

must("backend package exposes m94dcheck script", (backendPackage.scripts || {}).m94dcheck === "node scripts/m94d_admin_payment_security_export_check.js");
must("state active milestones include M94-D2", (state.activeMilestones || []).includes("M94-D2"));
must("primer mentions M94-D2", includesText(primer, "M94-D2") && includesText(primer, "admin audit + payment export polish"));
must("registry mentions M94-D2", includesText(registry, "M94-D2") && includesText(registry, "admin audit + payment export polish"));

must("admin route imports step-up guard", includesText(adminJs, "requireStepUpWrite"));
must("admin backup routes remain step-up protected", includesAll(adminJs, [
  'r.post("/backup/create", ...superAdminWrite',
  'r.post("/backup/restore", ...superAdminWrite',
  'ADMIN_BACKUP_CREATE',
  'ADMIN_BACKUP_RESTORE',
]));
must("admin region routes remain step-up protected and audited", includesAll(adminJs, [
  'r.post("/regions", ...superAdminWrite',
  'r.put("/regions/:id", ...superAdminWrite',
  'r.delete("/regions/:id", ...superAdminWrite',
  'ADMIN_REGION_CREATE',
  'ADMIN_REGION_UPDATE',
  'ADMIN_REGION_DELETE',
]));
must("admin user and parent-child write routes remain step-up protected", includesAll(adminJs, [
  'r.post("/users", ...superAdminWrite',
  'r.put("/users/:id", ...superAdminWrite',
  'r.post("/users/:id/reset-password", ...superAdminWrite',
  'r.post("/users/:id/disable", ...superAdminWrite',
  'r.post("/users/:id/enable", ...superAdminWrite',
  'r.post("/parent-children", ...superAdminWrite',
  'r.delete("/parent-children/:id", ...superAdminWrite',
  'r.post("/queues/auto-reached/incident-sync", ...superAdminWrite',
  'r.post("/queues/auto-reached/dead-letter/:taskId/requeue", ...superAdminWrite',
  'r.post("/queues/auto-reached/dead-letter/:taskId/resolve", ...superAdminWrite',
]));

must("admin logs export remains step-up protected and audited", includesAll(adminLogsJs, [
  'r.get("/export", authRequired(), requireStepUpWrite("SUPER_ADMIN"), requireRole("SUPER_ADMIN")',
  'LOG_EXPORT',
]));

must("commercial core settlement ledger export exists and uses standardized audit action", includesAll(commercialCoreJs, [
  'r.get("/payment-backbone/settlement/ledger/export.csv", authRequired(), requireStepUpWrite("SUPER_ADMIN"), requireRole("SUPER_ADMIN")',
  'PAYMENT_LEDGER_EXPORT',
  'PAYMENT_BACKBONE_EXPORT',
  'csvEscapeLedger',
  'r.get("/payment-backbone/sources/export.csv", authRequired(), requireStepUpWrite("SUPER_ADMIN"), requireRole("SUPER_ADMIN")',
]));
must("commercial core does not keep the old settlement ledger audit action name in route code", !includesText(commercialCoreJs, 'action: "SETTLEMENT_LEDGER_EXPORT"'));

must("commercial core settlement messages use proper Turkish characters", includesAll(commercialCoreJs, [
  "Zorunlu ödeme rollout kaynakları ACTIVE durumuna alındı",
  "Zorunlu ödeme rollout kaynakları DISABLED durumuna alındı",
  "Ödeme hesabı metadata kaydedildi",
  "Settlement entry satırları PLANNED durumuna alındı",
  "Settlement entry satırları EXECUTED durumuna alındı",
  "Settlement entry satırları CANCELLED durumuna alındı",
  "Settlement entry satırları READY durumuna alındı",
  "Settlement mutabakat kaydı güncellendi",
]));

must("super admin panel exposes detailed ledger export", includesAll(panel, [
  "Detaylı muhasebe CSV indir",
  "exportSettlementLedgerCsv",
]));
must("ledger export action uses settlement ledger endpoint", includesText(panelActions, "/api/commercial-core/payment-backbone/settlement/ledger/export.csv"));

console.log("M94-D ADMIN PAYMENT SECURITY EXPORT CHECK PASS");
