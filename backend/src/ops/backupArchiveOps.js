import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const BACKEND_OPS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(BACKEND_OPS_DIR, "../../..");
const CREATE_SCRIPT = path.join(REPO_ROOT, "tools", "backup_create_m45.ps1");
const RESTORE_SCRIPT = path.join(REPO_ROOT, "tools", "backup_restore_m45.ps1");

function toText(value) {
  const s = String(value ?? "").trim();
  return s || null;
}

function findPowerShellCommand() {
  for (const command of ["pwsh", "powershell"]) {
    const probe = spawnSync(command, ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    });
    if (!probe.error && probe.status === 0) return command;
  }
  throw new Error("PowerShell runtime not found");
}

function runPowerShellScript(scriptPath, args) {
  const command = findPowerShellCommand();
  const result = spawnSync(command, ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });

  return {
    command,
    scriptPath,
    status: typeof result.status === "number" ? result.status : null,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function parseCreateOutput(stdout) {
  const backupFile = stdout.match(/^OK Backup file:\s*(.+)$/m)?.[1]?.trim() || null;
  const manifestFile = stdout.match(/^OK Manifest:\s*(.+)$/m)?.[1]?.trim() || null;
  return { backupFile, manifestFile };
}

function parseRestoreOutput(stdout) {
  const backupFile = stdout.match(/^OK Restore completed from:\s*(.+)$/m)?.[1]?.trim() || null;
  return { backupFile };
}

export function createBackupArchive({ outputDir = null, keepDays = null } = {}) {
  const args = ["-RepoRoot", REPO_ROOT];
  const normalizedOutputDir = toText(outputDir);
  if (normalizedOutputDir) args.push("-OutputDir", normalizedOutputDir);

  const normalizedKeepDays = keepDays == null || keepDays === "" ? null : Number(keepDays);
  if (normalizedKeepDays != null && Number.isFinite(normalizedKeepDays) && normalizedKeepDays > 0) {
    args.push("-KeepDays", String(Math.trunc(normalizedKeepDays)));
  }

  const result = runPowerShellScript(CREATE_SCRIPT, args);
  const parsed = parseCreateOutput(result.stdout);
  return {
    ok: result.status === 0,
    ...parsed,
    repoRoot: REPO_ROOT,
    command: result.command,
    scriptPath: result.scriptPath,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
  };
}

export function restoreBackupArchive({ backupFile, manifestFile = null, force = false } = {}) {
  const normalizedBackupFile = toText(backupFile);
  if (!normalizedBackupFile) throw new Error("backupFile is required");
  if (!force) throw new Error("Restore is destructive. Re-run with force=true.");

  const args = ["-RepoRoot", REPO_ROOT, "-BackupFile", normalizedBackupFile, "-Force"];
  const normalizedManifestFile = toText(manifestFile);
  if (normalizedManifestFile) args.push("-ManifestFile", normalizedManifestFile);

  const result = runPowerShellScript(RESTORE_SCRIPT, args);
  const parsed = parseRestoreOutput(result.stdout);
  return {
    ok: result.status === 0,
    ...parsed,
    repoRoot: REPO_ROOT,
    command: result.command,
    scriptPath: result.scriptPath,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
  };
}

export function getBackupArchivePaths() {
  return {
    repoRoot: REPO_ROOT,
    createScript: CREATE_SCRIPT,
    restoreScript: RESTORE_SCRIPT,
  };
}
