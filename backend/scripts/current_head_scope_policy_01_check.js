#!/usr/bin/env node

import { mustCurrentHeadCommittedState } from "./lib/guardValidationEnvironment.js";

function main() {
  console.log("=== CURRENT-HEAD-SCOPE-POLICY-01 CHECK ===");
  mustCurrentHeadCommittedState({ label: "current head scope policy" });
  console.log("=== CURRENT-HEAD-SCOPE-POLICY-01 CHECK PASS ===");
}

main();
