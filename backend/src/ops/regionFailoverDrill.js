import { createJsonFileStore } from "../lib/jsonFileStore.js";
import { getRegionCellDeploymentBlueprint } from "./regionCellDeploymentBlueprint.js";

const store = createJsonFileStore("region-failover-drill-state.json", {
  defaultValue: () => ({
    latestRun: null,
    runs: [],
  }),
});

const DRILL_SCENARIOS = [
  {
    id: "primary-cell-down",
    title: "Primary cell down",
    severity: "HIGH",
    expectedAction: "Region routing secondary cell'e kayar ve control plane etkilenmez.",
  },
  {
    id: "regional-redis-down",
    title: "Regional Redis down",
    severity: "HIGH",
    expectedAction: "Bölgesel cache/queue fallback davranışı devreye girer.",
  },
  {
    id: "hot-db-degradation",
    title: "Hot DB degradation",
    severity: "CRITICAL",
    expectedAction: "Write path backpressure korunur ve bölgesel cell health düşürülür.",
  },
  {
    id: "zone-rebalance",
    title: "Zone rebalancing",
    severity: "MEDIUM",
    expectedAction: "İlçe/zone yükü yeni hücreye taşınabilir ve drill kaydedilir.",
  },
];

function cleanText(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function cleanUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeScenarioId(value) {
  const id = cleanText(value, 80);
  if (!id) return DRILL_SCENARIOS[0].id;
  return DRILL_SCENARIOS.some((item) => item.id === id) ? id : DRILL_SCENARIOS[0].id;
}

function selectRegionCell(blueprint, regionId = null) {
  const cells = Array.isArray(blueprint?.regionCells) ? blueprint.regionCells : [];
  if (!cells.length) return null;
  const id = Number(regionId || 0);
  if (id > 0) {
    const byId = cells.find((item) => Number(item.regionId || 0) === id);
    if (byId) return byId;
  }
  return cells[0];
}

async function readState() {
  const parsed = await store.readAsync();
  return {
    latestRun: parsed?.latestRun || null,
    runs: Array.isArray(parsed?.runs) ? parsed.runs : [],
  };
}

export function getRegionFailoverDrillManifest() {
  return {
    activeMilestone: "M93",
    title: "Region failover / rebalancing drill",
    scenarios: DRILL_SCENARIOS.map((item) => ({ ...item })),
    steps: [
      "Blueprint'ten bir region cell seç.",
      "Primary cell outage veya degrade senaryosunu dry-run olarak kaydet.",
      "Routing fallback, worker sevki ve rollback notunu iliştir.",
      "Sonucu record store'a yaz ve son run'u admin panelde göster.",
    ],
    rules: [
      "Dry-run gerçek kesinti değildir; canlı trafik kesilmez.",
      "Failover kararı control plane'de gözlemlenir, hücreler region bazında yorumlanır.",
      "Rebalancing notu olmadan drill kapanmaz.",
    ],
  };
}

export async function getRegionFailoverDrillPack() {
  const blueprint = await getRegionCellDeploymentBlueprint();
  const state = await readState();
  const scenarios = getRegionFailoverDrillManifest().scenarios;
  const latestRun = state.latestRun;

  return {
    ok: true,
    activeMilestone: "M93",
    capturedAt: new Date().toISOString(),
    manifest: getRegionFailoverDrillManifest(),
    blueprintSummary: blueprint?.summary || null,
    latestRun,
    recentRuns: state.runs.slice(0, 10),
    readiness: "READY",
    scenarioCount: scenarios.length,
    runCount: state.runs.length,
    statusCounts: state.runs.reduce(
      (acc, item) => {
        const key = cleanUpper(item?.status || "DRY_RUN_OK");
        if (acc[key] != null) acc[key] += 1;
        return acc;
      },
      { DRY_RUN_OK: 0, DRY_RUN_WARN: 0, DRY_RUN_BLOCK: 0 }
    ),
  };
}

export async function recordRegionFailoverDrillRun(input = {}, actor = null) {
  const scenarioId = normalizeScenarioId(input?.scenarioId);
  const scenario = DRILL_SCENARIOS.find((item) => item.id === scenarioId) || DRILL_SCENARIOS[0];
  const blueprint = await getRegionCellDeploymentBlueprint();
  const selectedCell = selectRegionCell(blueprint, input?.regionId);
  const now = new Date().toISOString();
  const result = {
    id: `drill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    regionId: selectedCell?.regionId ?? null,
    regionName: selectedCell?.regionName ?? null,
    primaryCellId: selectedCell?.primaryCellId ?? null,
    fallbackCellIds: Array.isArray(selectedCell?.cellIds) ? selectedCell.cellIds.slice(1) : [],
    status: "DRY_RUN_OK",
    note: cleanText(input?.note, 800) || scenario.expectedAction,
    createdAt: now,
    createdByEmail: cleanText(actor?.email, 160),
    blueprintSnapshot: {
      regionCount: blueprint?.summary?.regionCount || 0,
      totalCells: blueprint?.summary?.totalCells || 0,
    },
  };

  await store.updateAsync((current) => {
    const runs = Array.isArray(current?.runs) ? [...current.runs] : [];
    runs.unshift(result);
    return {
      latestRun: result,
      runs: runs.slice(0, 25),
    };
  });

  return result;
}
