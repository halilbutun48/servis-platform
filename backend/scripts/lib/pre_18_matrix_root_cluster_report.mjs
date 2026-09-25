import crypto from "node:crypto";

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function failureDimensions(row) {
  const reasons = normalize(row.failReason)
    .split(" | ")
    .map((reason) => normalize(reason))
    .filter(Boolean)
    .map((reason) => {
      if (/^expected\s+.+\s+but got\s+.+$/iu.test(reason)) {
        return "INTENT_FAMILY_MISMATCH";
      }
      if (/reply does not|reply drifts|reply leaks|reply should/iu.test(reason)) {
        return "RESPONSE_CONTRACT_MISMATCH";
      }
      if (/error|exception|stack/iu.test(reason)) {
        return "RUNTIME_ERROR";
      }
      return `OTHER:${reason.toLocaleLowerCase("en-US")}`;
    })
    .sort();

  return Object.freeze({
    expectedIntentFamily: normalize(row.expectedIntentFamily),
    actualIntentFamily: normalize(row.actualIntentFamily),
    failureDimensions: Object.freeze(reasons),
  });
}

function rootId(signature) {
  const stable = JSON.stringify(signature);
  return `ROOT-${crypto.createHash("sha256").update(stable).digest("hex").slice(0, 12).toUpperCase()}`;
}

/**
 * Groups already-failed matrix rows for diagnosis only. It never mutates a
 * terminal result and callers must continue to fail the matrix when the raw
 * failure count is nonzero.
 */
export function clusterMatrixFailures(rows, {
  owner,
  failureClass,
  blockingLevel,
} = {}) {
  if (!Array.isArray(rows)) {
    throw new Error("matrix root clustering requires rows array");
  }
  if (!normalize(owner) || !normalize(failureClass) || !normalize(blockingLevel)) {
    throw new Error("matrix root clustering requires owner, failureClass and blockingLevel");
  }

  const rawFailures = rows.filter((row) => row && row.pass === false);
  const groups = new Map();

  for (const row of rawFailures) {
    const signature = failureDimensions(row);
    const key = JSON.stringify(signature);
    const group = groups.get(key) || { signature, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  const clusters = [...groups.values()]
    .map(({ signature, rows: members }) => ({
      rootId: rootId(signature),
      failCount: members.length,
      representativeCases: members.slice(0, 3).map((row) => ({
        role: row.role,
        screen: row.screen,
        question: row.question,
        expectedIntentFamily: row.expectedIntentFamily,
        actualIntentFamily: row.actualIntentFamily,
        failReason: row.failReason,
      })),
      owner: normalize(owner),
      failureClass: normalize(failureClass),
      blockingLevel: normalize(blockingLevel),
      signature,
    }))
    .sort((left, right) => left.rootId.localeCompare(right.rootId, "en"));

  return Object.freeze({
    totalFailures: rawFailures.length,
    rawFailureCount: rawFailures.length,
    clusterMemberTotal: clusters.reduce((total, cluster) => total + cluster.failCount, 0),
    rootClusterCount: clusters.length,
    rawFailures: Object.freeze([...rawFailures]),
    clusters: Object.freeze(clusters.map((cluster) => Object.freeze(cluster))),
  });
}
