import { createBackupArchive } from "../src/ops/backupArchiveOps.js";

function readArg(name, fallback = null) {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return fallback;
}

async function main() {
  const outputDir = readArg("output-dir");
  const keepDays = readArg("keep-days");
  const result = createBackupArchive({
    outputDir,
    keepDays: keepDays == null ? null : Number(keepDays),
  });

  if (result.ok) {
    console.log(`OK Backup file: ${result.backupFile || "n/a"}`);
    console.log(`OK Manifest: ${result.manifestFile || "n/a"}`);
    return;
  }

  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  throw new Error(result.error || `Backup create failed with exitCode=${result.exitCode}`);
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
