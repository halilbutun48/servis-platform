/*
 * Shared, no-browser contract helpers for the bounded ROOM ROUTE99 canary.
 * A future browser entrypoint imports these facts; this module never opens a
 * context, logs in, or executes a product action on its own.
 */
import {
  normalizeRoomRouteSemanticEvidence,
  observeRoomRouteContentMarker,
  resolveRoomRouteReadinessMarker,
} from "./pre_18_room_prehit_246_migration_v1.mjs";
import { evaluateRoomWorkerResetForPoolWorker } from "./pre_18_room_worker_pool.mjs";

export const ROUTE99_COMMERCIAL_FLOW_CONTRACT_HASHES = Object.freeze([
  "f49bb0fafeaa7e63",
  "c3900c883dad9336",
  "db7967f307be2dfd",
]);

export function buildRoute99CommercialFlowDryRun(rows = []) {
  const expected = new Set(ROUTE99_COMMERCIAL_FLOW_CONTRACT_HASHES);
  const selected = (rows || []).filter((row) => expected.has(String(row?.CONTRACT_ID_HASH || "")));
  const marker = resolveRoomRouteReadinessMarker("/room/commercial-flow");
  const semanticEvidence = normalizeRoomRouteSemanticEvidence(marker);
  const ids = new Set(selected.map((row) => String(row?.CONTRACT_ID_HASH || "")));
  return {
    COMMERCIAL_FLOW_DRY_RUN_TARGET_COUNT: selected.length,
    TYPED_HEADING_MARKER_MAPPING_COUNT: semanticEvidence.kind === "ROLE" && semanticEvidence.role === "heading"
      ? selected.length
      : 0,
    BARE_TEXT_MARKER_MAPPING_COUNT: semanticEvidence.kind === "TEXT" ? selected.length : 0,
    GENERIC_MAIN_MAPPING_COUNT: marker?.selector === "main" || marker?.id === "GENERIC_MAIN" ? selected.length : 0,
    UNDEFINED_MARKER_COUNT: marker?.kind === "UNDEFINED" ? selected.length : 0,
    UNIQUE_CONTRACT_ID_COUNT: ids.size,
    MISSING_EXPECTED_CONTRACT_COUNT: [...expected].filter((id) => !ids.has(id)).length,
    MARKER_ID: marker?.id || null,
  };
}

export function evaluateRoute99WorkerReset({ worker, observed } = {}) {
  return evaluateRoomWorkerResetForPoolWorker({ worker, observed });
}

// Browser callers use the exact same multi-match-safe observer as the
// residual runner; this module keeps only the route99 descriptor selection.
export async function observeRoute99CurrentMarker(page, route = "/room/commercial-flow") {
  return observeRoomRouteContentMarker(page, resolveRoomRouteReadinessMarker(route));
}
