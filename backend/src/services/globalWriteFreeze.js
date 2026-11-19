const DEFAULT_NAMESPACE = "seferpakt:global-write-freeze:v1";
const OPEN = "OPEN";
const FENCING = "FENCING";
const FROZEN = "FROZEN";
const UNFENCING = "UNFENCING";

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

function freezeError(code, message, status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function normalizeHash(raw) {
  if (!raw) return {};
  if (!Array.isArray(raw)) return raw;
  const out = {};
  for (let i = 0; i + 1 < raw.length; i += 2) out[String(raw[i])] = String(raw[i + 1]);
  return out;
}

function normalizeState(hash) {
  const state = String(hash?.state || "").toUpperCase();
  if (![OPEN, FENCING, FROZEN, UNFENCING].includes(state)) {
    throw freezeError("WRITE_FREEZE_STATE_UNAVAILABLE", "Yazma güvenlik durumu doğrulanamıyor.");
  }
  return {
    state,
    token: Math.max(0, Number(hash?.token || 0)),
    owner: hash?.owner ? String(hash.owner) : null,
    reason: hash?.reason ? String(hash.reason) : null,
    changedAt: hash?.changedAt ? String(hash.changedAt) : null,
    changeControlId: hash?.changeControlId ? String(hash.changeControlId) : null,
  };
}

function transitionScript() {
  return `
local current = redis.call('HGET', KEYS[1], 'state')
local expected = ARGV[2]
if current and expected ~= '*' and current ~= expected then
  return redis.error_reply('WRITE_FREEZE_INVALID_STATE')
end
local token = tonumber(redis.call('HGET', KEYS[1], 'token') or '0')
local nextToken = token + 1
redis.call('HSET', KEYS[1],
  'state', ARGV[1],
  'token', nextToken,
  'owner', ARGV[3],
  'reason', ARGV[4],
  'changedAt', ARGV[5],
  'changeControlId', ARGV[6])
return nextToken
`;
}

export function isWriteOperation(operation) {
  return WRITE_OPERATIONS.has(String(operation || ""));
}

export function createWriteFreezeController({
  redis,
  namespace = DEFAULT_NAMESPACE,
  clock = () => new Date(),
  authorizeControl = ({ owner, changeControlId }) => Boolean(String(owner || "").trim() && String(changeControlId || "").trim()),
} = {}) {
  const key = String(namespace || DEFAULT_NAMESPACE);

  async function readState() {
    if (!redis?.send) throw freezeError("WRITE_FREEZE_STATE_UNAVAILABLE", "Yazma güvenlik durumu okunamıyor.");
    try {
      const raw = await redis.send("HGETALL", key);
      const hash = normalizeHash(raw);
      if (!hash || Object.keys(hash).length === 0 || !hash.state) {
        throw freezeError("WRITE_FREEZE_STATE_UNAVAILABLE", "Yazma güvenlik durumu bulunamıyor.");
      }
      return normalizeState(hash);
    } catch {
      throw freezeError("WRITE_FREEZE_STATE_UNAVAILABLE", "Yazma güvenlik durumu okunamıyor.");
    }
  }

  async function transition(nextState, expectedState, { owner, reason = "", changeControlId } = {}) {
    if (!authorizeControl({ owner, changeControlId })) {
      throw freezeError("WRITE_FREEZE_CONTROL_UNAUTHORIZED", "Yazma dondurma işlemi yetkili değil.", 403);
    }
    if (!redis?.send) throw freezeError("WRITE_FREEZE_STATE_UNAVAILABLE", "Yazma güvenlik durumu yazılamıyor.");
    try {
      await redis.send(
        "EVAL",
        transitionScript(),
        "1",
        key,
        nextState,
        expectedState,
        String(owner),
        String(reason),
        nowIso(clock),
        String(changeControlId),
      );
      return readState();
    } catch (error) {
      if (error?.code === "WRITE_FREEZE_CONTROL_UNAUTHORIZED") throw error;
      if (String(error?.message || error).includes("WRITE_FREEZE_INVALID_STATE")) {
        throw freezeError("WRITE_FREEZE_STATE_CONFLICT", "Yazma güvenlik durumu eşzamanlı olarak değişti.", 409);
      }
      const wrapped = freezeError("WRITE_FREEZE_STATE_UNAVAILABLE", "Yazma güvenlik durumu güncellenemedi.");
      wrapped.cause = error;
      throw wrapped;
    }
  }

  async function captureFence() {
    const state = await readState();
    return { state: state.state, token: state.token };
  }

  async function assertWritable({ operation = "WRITE", fenceToken } = {}) {
    const state = await readState();
    if (state.state !== OPEN) {
      throw freezeError(
        state.state === FENCING ? "GLOBAL_WRITE_FENCING" : "GLOBAL_WRITE_FROZEN",
        "Sistem geçiş nedeniyle geçici olarak yazmaya kapalı.",
        423,
      );
    }
    if (fenceToken !== undefined && Number(fenceToken) !== state.token) {
      throw freezeError("GLOBAL_WRITE_FENCE_STALE", `Yazma işlemi geçersiz güvenlik dönemine ait: ${operation}.`, 409);
    }
    return state;
  }

  return {
    key,
    readState,
    captureFence,
    assertWritable,
    beginFencing: (input) => transition(FENCING, OPEN, input),
    markFrozen: (input) => transition(FROZEN, FENCING, input),
    beginUnfreeze: (input) => transition(UNFENCING, FROZEN, input),
    markOpen: (input) => transition(OPEN, UNFENCING, input),
  };
}

export { DEFAULT_NAMESPACE, OPEN, FENCING, FROZEN, UNFENCING };
