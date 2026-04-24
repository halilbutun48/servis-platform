import { getRegionCapacitySnapshot } from "./regionCapacity.js";

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function slugifyRegionName(name, fallbackId) {
  const raw = String(name || "").trim().toLowerCase();
  const slug = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `region-${fallbackId}`;
}

function computeCellCount(region) {
  const activeVehicles = toInt(region?.activeVehicleCount) ?? 0;
  const activeShifts = toInt(region?.activeShiftCount) ?? 0;
  const openShifts = toInt(region?.openShiftCount) ?? 0;
  const zoneCount = toInt(region?.zoneCount) ?? 0;
  const loadScore = activeVehicles + activeShifts * 4 + openShifts * 2 + zoneCount * 150;

  if (loadScore >= 1800) return 4;
  if (loadScore >= 900) return 2;
  return 1;
}

function buildCellIds(region, cellCount) {
  const slug = slugifyRegionName(region?.name, region?.id);
  return Array.from({ length: Math.max(1, cellCount) }, (_item, index) => `${slug}-cell-${index + 1}`);
}

function buildServiceSet(region) {
  const zoneCount = toInt(region?.zoneCount) ?? 0;
  const multiCell = zoneCount > 1;
  return {
    regionalApi: true,
    regionalRedis: true,
    regionalPostgresHotStore: true,
    regionalWsRelay: true,
    regionalWorkers: true,
    regionalSolver: multiCell,
    regionalOsrm: multiCell,
  };
}

function buildRegionCell(region) {
  const cellCount = computeCellCount(region);
  const cellIds = buildCellIds(region, cellCount);
  const zoneCount = toInt(region?.zoneCount) ?? 0;
  const activeVehicles = toInt(region?.activeVehicleCount) ?? 0;
  const activeShifts = toInt(region?.activeShiftCount) ?? 0;
  const openShifts = toInt(region?.openShiftCount) ?? 0;
  const loadScore = activeVehicles + activeShifts * 4 + openShifts * 2 + zoneCount * 150;
  const multiCell = cellCount > 1;

  return {
    regionId: region?.id ?? null,
    regionName: region?.name ?? "",
    zoneCount,
    zoneSamples: Array.isArray(region?.zoneSamples) ? region.zoneSamples : [],
    cellCount,
    cellIds,
    primaryCellId: cellIds[0] || null,
    routingMode: multiCell ? "ZONE_MULTI_CELL" : "SINGLE_CELL",
    loadScore,
    loadBand: loadScore >= 1800 ? "CEILING" : loadScore >= 900 ? "STRESS" : "STABLE",
    services: buildServiceSet(region),
    readiness: "READY",
    note: multiCell
      ? "Büyük şehir/zone ağırlığı için birden fazla hücre öneriliyor."
      : "Tek hücreli bölgesel operasyon modeli yeterli görünüyor.",
  };
}

export async function getRegionCellDeploymentBlueprint() {
  const snapshot = await getRegionCapacitySnapshot();
  const regions = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const cells = regions.map(buildRegionCell);
  const multiCellRegions = cells.filter((item) => item.cellCount > 1).length;
  const totalCells = cells.reduce((sum, item) => sum + Number(item.cellCount || 0), 0);

  return {
    ok: true,
    activeMilestone: "M93",
    capturedAt: new Date().toISOString(),
    title: "Region cell deployment blueprint",
    controlPlane: {
      services: [
        "auth",
        "super-admin",
        "policy",
        "global-reporting",
        "archive-control",
      ],
      responsibilities: [
        "Kimlik ve politika yüzeyleri merkezde kalır.",
        "Bölgesel hücreler canlı operasyonu taşır.",
        "Raporlama ve archive kontrol yüzeyi control plane'de kalır.",
      ],
    },
    summary: {
      regionCount: cells.length,
      multiCellRegions,
      singleCellRegions: Math.max(0, cells.length - multiCellRegions),
      totalCells,
    },
    regionCells: cells,
    routingRules: [
      "vehicle -> homeRegionId",
      "shift -> regionId",
      "region -> primaryCellId",
      "district/zone -> cell alt kırılımı",
    ],
    notes: [
      "Bu blueprint logical region modelinin fiziksel hücre okumasıdır.",
      "Control plane bölünmez; hücreler canlı trafiği ve worker yükünü taşır.",
    ],
  };
}
