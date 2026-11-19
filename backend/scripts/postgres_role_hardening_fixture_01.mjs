import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.ROLE_HARDENING_REHEARSAL = "1";
process.env.GWF_EVIDENCE_DIR = path.join(repoRoot, "output", "postgres-role-hardening-fixture-20261102");

await import("./global_write_freeze_fixture_01.mjs");
