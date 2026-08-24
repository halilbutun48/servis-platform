#!/usr/bin/env node

import { runStructuredScriptChain } from "./lib/guardRunnerContracts.js";
import { productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

async function main() {
  const code = await runStructuredScriptChain(productExtensionsChecks, {
    label: "PRODUCT EXTENSIONS CHECK CHAIN",
  });
  process.exit(code);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
