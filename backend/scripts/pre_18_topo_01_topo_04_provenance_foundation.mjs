#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRepositoryRegistry,
  canonicalJson,
  getRegistryPaths,
  validateRegistryBundle,
  writeRegistryBundle,
} from "./lib/pre_18_harness_topology_provenance_registry.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const args = new Set(process.argv.slice(2));

if (args.has("--write")) {
  const result = await writeRegistryBundle(repoRoot);
  console.log(`TOPOLOGY_REGISTRY_PATH=${result.paths.topology}`);
  console.log(`PROVENANCE_REGISTRY_PATH=${result.paths.provenance}`);
  console.log(`SUMMARY_PATH=${result.paths.summary}`);
  console.log(`TOPOLOGY_SHA256=${result.summary.topologySha256}`);
  console.log(`PROVENANCE_SHA256=${result.summary.provenanceSha256}`);
  console.log("TOPOLOGY_PROVENANCE_WRITE_STATUS=GREEN");
} else {
  const bundle = await buildRepositoryRegistry(repoRoot);
  const validation = validateRegistryBundle(bundle);
  const paths = getRegistryPaths(repoRoot);
  const expectedTopology = canonicalJson({
    metadata: bundle.metadata,
    topology: bundle.topology,
    validation: bundle.validation,
  });
  const expectedProvenance = canonicalJson({
    metadata: bundle.metadata,
    provenance: bundle.provenance,
  });
  const topologyCurrent = fs.existsSync(paths.topology) && fs.readFileSync(paths.topology, "utf8") === expectedTopology;
  const provenanceCurrent = fs.existsSync(paths.provenance) && fs.readFileSync(paths.provenance, "utf8") === expectedProvenance;
  console.log(`TOPOLOGY_REGISTRY_CURRENT=${topologyCurrent ? "YES" : "NO"}`);
  console.log(`PROVENANCE_REGISTRY_CURRENT=${provenanceCurrent ? "YES" : "NO"}`);
  console.log(`SCHEMA_VALID=${validation.schemaValid ? "YES" : "NO"}`);
  console.log(`BROKEN_PACKAGE_SCRIPT_TARGET_COUNT=${bundle.validation.brokenPackageScriptTargetCount}`);
  console.log(`CI_ENTRYPOINT_NOT_CANONICAL_COUNT=${bundle.validation.ciEntrypointNotCanonicalCount}`);
  if (!topologyCurrent || !provenanceCurrent || !validation.schemaValid) {
    process.exitCode = 1;
  } else {
    console.log("TOPOLOGY_PROVENANCE_VALIDATE_STATUS=GREEN");
  }
}
