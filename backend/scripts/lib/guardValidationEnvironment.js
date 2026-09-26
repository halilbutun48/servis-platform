import {
  gitCachedNames,
  gitStatusNames,
  mustStatusSubsetWithIdentity,
  mustDiffEmptyOrExactlyWithIdentity,
  mustNoDiff,
} from "./guardGitScope.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./currentHeadScopePolicy.js";

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function isWithinScope(relPath, scopePaths) {
  const normalizedPath = String(relPath || "").replace(/\\/g, "/").replace(/^\.\//, "");
  return scopePaths.some((scopePath) => {
    const normalizedScope = String(scopePath || "").replace(/\\/g, "/").replace(/\/$/, "");
    return normalizedPath === normalizedScope || normalizedPath.startsWith(`${normalizedScope}/`);
  });
}

export function mustCleanCommittedState({
  routePaths = ["backend/src/routes"],
  servicePaths = ["backend/src/services"],
  prismaPaths = ["backend/prisma"],
  allowedDirtyPaths = [],
  allowedUntrackedPaths = [],
  label = "clean committed state",
} = {}) {
  mustNoDiff(routePaths, `${label} route diff empty`);
  mustNoDiff(servicePaths, `${label} service diff empty`);
  mustNoDiff(prismaPaths, `${label} prisma diff empty`);

  const staged = gitCachedNames();
  must(staged.length === 0, "stage stays empty");

  const residual = gitStatusNames().filter(
    (name) => !allowedDirtyPaths.includes(name) && !allowedUntrackedPaths.includes(name)
  );
  must(residual.length === 0, `${label} working tree hygiene`);
  return { staged, residual };
}

export function mustCurrentHeadCommittedState({
  routeServicePaths = ["backend/src/routes", "backend/src/services", "backend/src/ai"],
  prismaPaths = ["backend/prisma", "prisma"],
  approvedConcurrentBackendDiff = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
  label = "current head committed state",
} = {}) {
  const scopedApprovedConcurrentBackendDiff = approvedConcurrentBackendDiff.filter(({ path }) =>
    isWithinScope(path, routeServicePaths),
  );
  // Historical PRE-#18 identities stay available to legacy consumers, but
  // they are not required to remain as a dirty worktree snapshot. A live
  // numbered milestone may contain only a subset of the current scope; every
  // observed path still requires its exact registered identity.
  mustStatusSubsetWithIdentity(
    routeServicePaths,
    scopedApprovedConcurrentBackendDiff,
    `${label} route/service status exact current head policy`
  );
  mustNoDiff(prismaPaths, `${label} prisma diff empty`);

  const staged = gitCachedNames();
  must(staged.length === 0, "stage stays empty");
  return { staged };
}
