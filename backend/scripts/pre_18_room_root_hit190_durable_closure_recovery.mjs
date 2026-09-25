import { readDurableRootHit190ClosureRecovery } from "./lib/pre_18_room_root_hit190_durable_closure_recovery.mjs";

const args = new Set(process.argv.slice(2));
if (args.size > 1 || (args.size === 1 && !args.has("--read-only"))) {
  throw new Error("ROOT_HIT190_DURABLE_CLOSURE_RECOVERY_ARGUMENTS_INVALID");
}

const result = await readDurableRootHit190ClosureRecovery({ repositoryRoot: process.cwd() });
console.log(JSON.stringify({
  ROOM_ROOT_HIT190_DURABLE_CLOSURE_RECOVERY_STATUS: result.status,
  ROOT_CAUSE: result.rootCause,
  REMAINING4_HISTORICAL_RESULT: result.remaining4HistoricalResult,
  REMAINING4_INTERMEDIATE_FAILURE_SUPERSEDED: result.remaining4IntermediateFailureSuperseded,
  SUPERSEDED_BY_EXACT1: result.supersededByExact1,
  SUPERSEDED_BY_FINAL190: result.supersededByFinal190,
  FINAL190_AUTHORITATIVE: result.final190Authoritative,
  ROOT_HIT190_CLOSED_GREEN: result.rootHit190ClosedGreen,
  OTHER423_CLUSTERING_STATUS: result.other423ClusteringStatus,
  OTHER423_NEXT_PHASE_AUTHORIZED: result.other423NextPhaseAuthorized,
  GENERATE_ANALYSIS_REQUIRED_FOR_ROOT_HIT_CLOSURE: result.generateAnalysisRequiredForRootHitClosure,
  REAL_BROWSER_RUN_STARTED: result.realBrowserRunStarted,
  FINAL190_RESULTS_PATH: result.final190?.artifactPaths?.results || null,
  FINAL190_SUMMARY_PATH: result.final190?.artifactPaths?.summary || null,
  FINAL190_REQUEST_LIFECYCLE_PATH: result.final190?.artifactPaths?.requestLifecycle || null,
}, null, 2));
