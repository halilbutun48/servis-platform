import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const writeQueues = new Map();
const syncLocks = new Set();
const DEFAULT_LOCK_TIMEOUT_MS = 4000;
const DEFAULT_LOCK_RETRY_MS = 25;
const DEFAULT_STALE_LOCK_MS = 15000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, "..", "..", "artifacts", "runtime-data");

function defaultDataDir() {
  return DEFAULT_DATA_DIR;
}

export function createJsonFileStore(filename, options = {}) {
  const dataDir = path.resolve(options.dataDir || process.env.RUNTIME_DATA_DIR || defaultDataDir());
  const filePath = path.join(dataDir, filename);
  const backupPath = `${filePath}.bak`;
  const defaultValueFactory = typeof options.defaultValue === "function"
    ? options.defaultValue
    : () => structuredCloneValue(options.defaultValue);

  function ensureDefaultValue() {
    return structuredCloneValue(defaultValueFactory());
  }

  async function ensureFileAsync() {
    await fsp.mkdir(dataDir, { recursive: true });
    try {
      await fsp.access(filePath);
    } catch {
      await atomicWriteAsync(serialize(ensureDefaultValue()));
    }
  }

  function ensureFileSync() {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(filePath)) {
      atomicWriteSync(serialize(ensureDefaultValue()));
    }
  }

  async function readAsync() {
    await ensureFileAsync();
    return readCurrentOrBackupAsync();
  }

  function readSync() {
    ensureFileSync();
    return readCurrentOrBackupSync();
  }

  async function writeAsync(value) {
    await ensureFileAsync();
    return enqueueWrite(filePath, async () => {
      return withFileLockAsync(filePath, async () => {
        const normalized = value == null ? ensureDefaultValue() : value;
        await backupCurrentAsync();
        await atomicWriteAsync(serialize(normalized));
        return normalized;
      });
    });
  }

  function writeSync(value) {
    ensureFileSync();
    return withFileLockSync(filePath, () => {
      const normalized = value == null ? ensureDefaultValue() : value;
      backupCurrentSync();
      atomicWriteSync(serialize(normalized));
      return normalized;
    });
  }

  async function updateAsync(mutator) {
    await ensureFileAsync();
    return enqueueWrite(filePath, async () => {
      return withFileLockAsync(filePath, async () => {
        const current = await readCurrentOrBackupAsync();
        const candidate = await mutator(structuredCloneValue(current));
        const next = candidate === undefined ? current : candidate;
        await backupCurrentAsync();
        await atomicWriteAsync(serialize(next));
        return next;
      });
    });
  }

  function updateSync(mutator) {
    ensureFileSync();
    return withFileLockSync(filePath, () => {
      const current = readCurrentOrBackupSync();
      const candidate = mutator(structuredCloneValue(current));
      const next = candidate === undefined ? current : candidate;
      backupCurrentSync();
      atomicWriteSync(serialize(next));
      return next;
    });
  }

  function serialize(value) {
    return JSON.stringify(value, null, 2);
  }

  function parse(raw) {
    const parsed = JSON.parse(raw || "null");
    if (parsed == null) return ensureDefaultValue();
    return parsed;
  }

  async function readCurrentOrBackupAsync() {
    try {
      return parse(await fsp.readFile(filePath, "utf8"));
    } catch {
      try {
        return parse(await fsp.readFile(backupPath, "utf8"));
      } catch {
        return ensureDefaultValue();
      }
    }
  }

  function readCurrentOrBackupSync() {
    try {
      return parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      try {
        return parse(fs.readFileSync(backupPath, "utf8"));
      } catch {
        return ensureDefaultValue();
      }
    }
  }

  async function backupCurrentAsync() {
    try {
      const current = await fsp.readFile(filePath, "utf8");
      await fsp.writeFile(backupPath, current, "utf8");
    } catch {
      // noop
    }
  }

  function backupCurrentSync() {
    try {
      const current = fs.readFileSync(filePath, "utf8");
      fs.writeFileSync(backupPath, current, "utf8");
    } catch {
      // noop
    }
  }

  async function atomicWriteAsync(content) {
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(tmp, content, "utf8");
    await fsp.rename(tmp, filePath);
  }

  function atomicWriteSync(content) {
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, content, "utf8");
    fs.renameSync(tmp, filePath);
  }

  return {
    dataDir,
    filePath,
    backupPath,
    ensureFileAsync,
    ensureFileSync,
    readAsync,
    readSync,
    writeAsync,
    writeSync,
    updateAsync,
    updateSync,
  };
}

function structuredCloneValue(value) {
  if (Array.isArray(value)) return JSON.parse(JSON.stringify(value));
  if (value && typeof value === "object") return JSON.parse(JSON.stringify(value));
  return value;
}

async function enqueueWrite(key, job) {
  const previous = writeQueues.get(key) || Promise.resolve();
  const next = previous.catch(() => null).then(job);
  writeQueues.set(key, next.finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  }));
  return next;
}

async function withFileLockAsync(filePath, job, opts = {}) {
  const lockPath = `${filePath}.lock`;
  const retryMs = Number(opts.retryMs || DEFAULT_LOCK_RETRY_MS);
  const staleMs = Number(opts.staleMs || DEFAULT_STALE_LOCK_MS);
  const timeoutMs = Number(opts.timeoutMs || DEFAULT_LOCK_TIMEOUT_MS);
  const startedAt = Date.now();
  let handle = null;
  while (!handle) {
    try {
      handle = await fsp.open(lockPath, "wx");
      await handle.writeFile(String(process.pid), "utf8");
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const stat = await fsp.stat(lockPath);
        if (Date.now() - stat.mtimeMs > staleMs) {
          await fsp.unlink(lockPath).catch(() => null);
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`json file store lock timeout for ${path.basename(filePath)}`);
      }
      await sleep(retryMs);
    }
  }
  try {
    return await job();
  } finally {
    try { await handle?.close(); } catch {}
    try { await fsp.unlink(lockPath); } catch {}
  }
}

function withFileLockSync(filePath, job) {
  if (syncLocks.has(filePath)) {
    throw new Error(`json file store sync lock already held for ${path.basename(filePath)}`);
  }
  syncLocks.add(filePath);
  try {
    return job();
  } finally {
    syncLocks.delete(filePath);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
