import { getBackupManifestSummary, getBackupPolicySummary } from "./retentionBackupPolicy.js";
import { getRegionCapacitySnapshot } from "./regionCapacity.js";
import { getRegionCellDeploymentBlueprint } from "./regionCellDeploymentBlueprint.js";
import { getRegionFailoverDrillPack } from "./regionFailoverDrill.js";

function normalizeRegionCount(snapshot) {
  return Array.isArray(snapshot?.items) ? snapshot.items.length : 0;
}

export async function getRegionNextPhasePack() {
  const [capacity, backupPolicy, backupManifest, deploymentBlueprint, failoverDrill] = await Promise.all([
    getRegionCapacitySnapshot(),
    Promise.resolve(getBackupPolicySummary()),
    Promise.resolve(getBackupManifestSummary()),
    getRegionCellDeploymentBlueprint(),
    getRegionFailoverDrillPack(),
  ]);

  const items = [
    {
      key: "physical-region-cell",
      title: "Fiziksel region cell dağıtımı",
      status: "READY",
      note: "Region cell blueprint ve kontrol düzeyi repo içinde hazır.",
    },
    {
      key: "zone-alt-shard",
      title: "Büyük şehir ilçe / zone alt-shard",
      status: "READY",
      note: "District/zone görünürlüğü ve alt-kırılım repo içinde hazır.",
    },
    {
      key: "archive-export-manifest-restore",
      title: "Archive export / manifest / restore",
      status: "READY",
      note: "Backup scripts, manifest ve restore doğrulama hattı repo içinde hazır.",
    },
    {
      key: "failover-rebalancing-drill",
      title: "Failover / rebalancing drill",
      status: "READY",
      note: "Failover dry-run pack ve kayıt yüzeyi repo içinde hazır.",
    },
  ];

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    regionCount: normalizeRegionCount(capacity),
    items,
    references: {
      capacity,
      backupPolicy,
      backupManifest,
      deploymentBlueprint,
      failoverDrill,
    },
  };
}
