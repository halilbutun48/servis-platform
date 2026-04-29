import { banner, must, read } from "./_static_milestone_check.js";

function includesText(text, needle) {
  return String(text || "").includes(needle);
}

function includesAll(text, needles) {
  return needles.every((needle) => includesText(text, needle));
}

function countOccurrences(text, needle) {
  const source = String(text || "");
  const token = String(needle || "");
  if (!token) return 0;
  return source.split(token).length - 1;
}

banner("M94-E QUEUE CHAOS/ALARM PROOF CHECK");

const state = JSON.parse(read("tools/repo_contract_state.json"));
const backendPackage = JSON.parse(read("backend/package.json"));
const adminJs = read("backend/src/routes/admin.js");
const queueJs = read("backend/src/jobs/autoReachedQueue.js");
const alarmJs = read("backend/src/jobs/autoReachedQueueAlarm.js");
const probeJs = read("backend/scripts/m94e_queue_chaos_alarm_probe.js");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const runbook = read("docs/RUNBOOK_M94E_QUEUE_CHAOS_ALARM_PROOF.md");
const runbookLower = String(runbook || "").toLowerCase();

must("backend package exposes m94echeck script", (backendPackage.scripts || {}).m94echeck === "node scripts/m94e_queue_chaos_alarm_check.js");
must("backend package exposes m94eprobe script", (backendPackage.scripts || {}).m94eprobe === "node scripts/m94e_queue_chaos_alarm_probe.js");
must("repo state keeps M94-E visible", (state.activeMilestones || []).includes("M94-E"));

must(
  "queue alarm helper exists",
  includesAll(alarmJs, [
    "AUTO_REACHED_QUEUE_THRESHOLD_WARN",
    "AUTO_REACHED_QUEUE_THRESHOLD_CRITICAL",
    "AUTO_REACHED_QUEUE_RECOVERY",
    "dedupeKey",
    "syncAutoReachedQueueAlarmNotifications",
    "buildAutoReachedQueueAlarmSnapshot",
  ])
);
must(
  "queue proof snapshot carries alarm data",
  includesAll(queueJs, [
    "alarm: buildAutoReachedQueueAlarmSnapshot(health, opts)",
    "syncAutoReachedQueueAlarmNotifications",
    "getAutoReachedQueueProofSnapshot",
  ])
);

must(
  "admin queue chaos routes stay step-up protected",
  includesAll(adminJs, [
    'requireStepUpWrite("SUPER_ADMIN")',
    'r.post("/queues/auto-reached/incident-sync", ...superAdminWrite',
    'r.post("/queues/auto-reached/dead-letter/:taskId/requeue", ...superAdminWrite',
    'r.post("/queues/auto-reached/dead-letter/:taskId/resolve", ...superAdminWrite',
  ])
);
must(
  "admin queue chaos routes use standard audit action names",
  includesAll(adminJs, [
    "AUTO_REACHED_QUEUE_INCIDENT_SYNC",
    "AUTO_REACHED_QUEUE_DEAD_LETTER_REQUEUE",
    "AUTO_REACHED_QUEUE_DEAD_LETTER_RESOLVE",
  ])
);
must(
  "admin queue proof endpoints remain visible",
  includesAll(adminJs, [
    'r.get("/queues/auto-reached/thresholds"',
    'r.get("/queues/auto-reached/proof"',
    'r.get("/queues/auto-reached/health"',
  ])
);

must(
  "probe script is safe and synthetic by default",
  includesAll(probeJs, [
    "simulated: true",
    "redisUnavailableProof",
    "staleClaimProof",
    "poisonDeadLetterProof",
    "deadLetterRequeueResolveProof",
    "thresholdAlarmProof",
    "proofSource",
  ])
);
must("probe script avoids destructive queue control", !includesText(probeJs, "docker compose") && !includesText(probeJs, "redis-cli shutdown"));

must(
  "runbook documents safe runtime probe and alarm flow",
  includesAll(runbookLower, [
    "threshold warn",
    "incident-sync",
    "dead-letter geri alma",
    "dead-letter çözme",
    "probe",
    "destructive değildir",
  ])
);

must("primer mentions M94-E queue chaos/alarm proof", includesText(primer, "M94-E queue chaos/alarm proof"));
must("registry mentions M94-E queue chaos/alarm proof", includesAll(registry, ["M94-E", "queue chaos/alarm proof"]));
must(
  "script guide mentions M94-E queue chaos/alarm proof and probe",
  includesAll(scriptGuide, [
    "M94-E",
    "m94e_queue_chaos_alarm_check.js",
    "m94e_queue_chaos_alarm_probe.js",
  ])
);

must(
  "alarm helper keeps queue health and notification payload markers",
  includesAll(alarmJs, [
    "buildAutoReachedQueueAlarmNotificationPayload",
    "AUTO_REACHED_QUEUE_THRESHOLD_WARN_NOTIFICATION_TYPE",
    "AUTO_REACHED_QUEUE_THRESHOLD_CRITICAL_NOTIFICATION_TYPE",
    "AUTO_REACHED_QUEUE_RECOVERY_NOTIFICATION_TYPE",
  ])
);
must(
  "admin incident-sync audit includes alarm proof fields",
  includesAll(adminJs, [
    "alarmLevel",
    "dedupeKey",
  ])
);
must(
  "queue alarm helper keeps a single dedupe key per snapshot",
  countOccurrences(alarmJs, "dedupeKey =") >= 1 && countOccurrences(alarmJs, "AUTO_REACHED_QUEUE_STATE:") >= 1
);

console.log("M94-E queue chaos/alarm proof check passed");
