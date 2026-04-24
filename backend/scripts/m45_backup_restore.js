import { restoreBackupArchive } from "../src/ops/backupArchiveOps.js";

function readArg(name, fallback = null) {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return fallback;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

async function main() {
  const backupFile = readArg("backup-file");
  const manifestFile = readArg("manifest-file");
  const force = hasFlag("force");
  const result = restoreBackupArchive({
    backupFile,
    manifestFile,
    force,
  });

  if (result.ok) {
    console.log(`OK Restore completed from: ${result.backupFile || backupFile || "n/a"}`);
    return;
  }

  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  throw new Error(result.error || `Backup restore failed with exitCode=${result.exitCode}`);
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
