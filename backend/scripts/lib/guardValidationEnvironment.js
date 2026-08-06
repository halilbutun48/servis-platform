import { gitCachedNames, gitStatusNames, mustNoDiff } from "./guardGitScope.js";

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
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
