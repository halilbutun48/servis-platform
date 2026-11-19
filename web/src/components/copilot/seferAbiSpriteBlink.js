// The sprite trial is deliberately separate from the rejected flattened-PNG
// facial animation gate. The approved canonical DEMO build enables it by
// default; `?seferAbiSpriteBlink=0` is the reversible static fallback.
export const SPRITE_BLINK_EXPERIMENT_ENABLED = true;
export const SPRITE_BLINK_DEFAULT_ENABLED = true;

export const SPRITE_BLINK_SEQUENCE = Object.freeze([
  Object.freeze({ key: "open", durationMs: 5_200 }),
  Object.freeze({ key: "halfClose", durationMs: 90 }),
  Object.freeze({ key: "closed", durationMs: 180 }),
  Object.freeze({ key: "halfOpen", durationMs: 90 }),
  Object.freeze({ key: "open", durationMs: 6_000 }),
]);

const BLINK_PATTERNS = Object.freeze([
  Object.freeze({ openHoldMs: 5_200, openReturnHoldMs: 6_000 }),
  Object.freeze({ openHoldMs: 6_800, openReturnHoldMs: 7_200 }),
  Object.freeze({ openHoldMs: 4_600, openReturnHoldMs: 5_700 }),
]);

function readQuery(locationLike) {
  const search = typeof locationLike?.search === "string" ? locationLike.search : "";
  const hash = typeof locationLike?.hash === "string" ? locationLike.hash : "";
  const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hashQuery);
  return { params, hashParams };
}

export function isSpriteBlinkTrialEnabled(locationLike = typeof window !== "undefined" ? window.location : undefined) {
  if (!SPRITE_BLINK_EXPERIMENT_ENABLED) return false;
  const { params, hashParams } = readQuery(locationLike);
  const override = params.get("seferAbiSpriteBlink") || hashParams.get("seferAbiSpriteBlink");
  if (override === "0") return false;
  if (override === "1") return true;
  return SPRITE_BLINK_DEFAULT_ENABLED;
}

function getCyclePlan(cycleIndex) {
  const pattern = BLINK_PATTERNS[cycleIndex % BLINK_PATTERNS.length];
  return [
    { key: "open", durationMs: pattern.openHoldMs },
    { key: "halfClose", durationMs: 90 },
    { key: "closed", durationMs: 180 },
    { key: "halfOpen", durationMs: 90 },
    { key: "open", durationMs: pattern.openReturnHoldMs },
  ];
}

function getCycleDuration(cycleIndex) {
  return getCyclePlan(cycleIndex).reduce((total, frame) => total + frame.durationMs, 0);
}

function normalizeElapsed(elapsedMs) {
  return Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0;
}

export function getSeferAbiSpriteFrame({ elapsedMs = 0, state = "idle", reducedMotion = false } = {}) {
  if (state !== "idle" || reducedMotion) return { key: "open", index: 0 };

  let remaining = normalizeElapsed(elapsedMs);
  let cycleIndex = 0;
  let plan = getCyclePlan(cycleIndex);
  let cycleDuration = getCycleDuration(cycleIndex);
  while (remaining >= cycleDuration) {
    remaining -= cycleDuration;
    cycleIndex += 1;
    plan = getCyclePlan(cycleIndex);
    cycleDuration = getCycleDuration(cycleIndex);
  }

  let frameOffset = 0;
  for (let index = 0; index < plan.length; index += 1) {
    const frame = plan[index];
    if (remaining < frameOffset + frame.durationMs) {
      return { key: frame.key, index };
    }
    frameOffset += frame.durationMs;
  }

  return { key: "open", index: 0 };
}

export function getSeferAbiSpriteFrameBoundary(elapsedMs = 0) {
  let target = normalizeElapsed(elapsedMs);
  let cycleIndex = 0;
  let cycleStart = 0;
  let plan = getCyclePlan(cycleIndex);
  let cycleDuration = getCycleDuration(cycleIndex);
  while (target >= cycleDuration) {
    target -= cycleDuration;
    cycleStart += cycleDuration;
    cycleIndex += 1;
    plan = getCyclePlan(cycleIndex);
    cycleDuration = getCycleDuration(cycleIndex);
  }

  let frameBoundary = cycleStart;
  for (const frame of plan) {
    frameBoundary += frame.durationMs;
    if (target < frameBoundary - cycleStart) return frameBoundary;
  }
  return cycleStart + cycleDuration;
}
