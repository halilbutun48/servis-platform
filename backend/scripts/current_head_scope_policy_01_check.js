#!/usr/bin/env node

import { mustCurrentHeadCommittedState } from "./lib/guardValidationEnvironment.js";
import { assertGatePolicyProjectionV1 } from "./lib/checkOwnershipRegistryV1.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";
import { assertActiveMilestoneCurrentHeadIdentities, assertMilestoneOwnershipAuthorityIntegrity } from "./lib/milestoneOwnershipAuthority.js";

function main() {
  console.log("=== CURRENT-HEAD-SCOPE-POLICY-01 CHECK ===");
  const authority = assertMilestoneOwnershipAuthorityIntegrity();
  const activeIdentity = assertActiveMilestoneCurrentHeadIdentities();
  const policyOwnedPaths = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.map(({ path }) => path);
  mustCurrentHeadCommittedState({
    routeServicePaths: policyOwnedPaths,
    label: "current head scope policy",
  });
  assertGatePolicyProjectionV1();
  console.log(`ACTIVE_MILESTONE_ID=${authority.activeMilestoneId}`);
  console.log(`ACTIVE_CURRENT_HEAD_IDENTITY_COUNT=${activeIdentity.count}`);
  console.log("=== CURRENT-HEAD-SCOPE-POLICY-01 CHECK PASS ===");
}

main();
