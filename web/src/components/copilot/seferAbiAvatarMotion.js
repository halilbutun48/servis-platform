const BLINK_CYCLE_MS = 4_800;
const BLINK_START_MS = 2_550;
const BLINK_DURATION_MS = 200;

const STATE_ALIASES = Object.freeze({
  success: "result-ready",
  speaking: "responding",
  warning: "attention",
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const finiteMs = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
};

const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

const smoothStep = (value) => {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

const normalizeState = (state) => {
  const rawState = String(state || "idle").trim().toLowerCase();
  return STATE_ALIASES[rawState] || rawState || "idle";
};

/**
 * Returns a single deterministic blink envelope for the recurring IDLE cycle.
 * The value is deliberately separate from rendering so browser tests can
 * validate the character motion without a timer or a random source.
 */
export function getSeferAbiBlinkProgress(elapsedMs = 0) {
  const cycleTime = modulo(finiteMs(elapsedMs), BLINK_CYCLE_MS);
  const blinkTime = cycleTime - BLINK_START_MS;

  if (blinkTime < 0 || blinkTime > BLINK_DURATION_MS) return 0;

  const close = smoothStep(blinkTime / (BLINK_DURATION_MS / 2));
  const reopen = smoothStep((blinkTime - BLINK_DURATION_MS / 2) / (BLINK_DURATION_MS / 2));
  return clamp(blinkTime <= BLINK_DURATION_MS / 2 ? close : 1 - reopen, 0, 1);
}

/**
 * Produces small, bounded portrait-safe transforms for the existing avatar.
 * It contains no timers, side effects, audio assumptions or generated data.
 */
export function getSeferAbiMotionFrame({ state = "idle", elapsedMs = 0, reducedMotion = false } = {}) {
  const normalizedState = normalizeState(state);

  if (reducedMotion) {
    return {
      state: normalizedState,
      audioSync: null,
      head: { x: 0, y: 0, rotate: 0, scale: 1 },
      eyes: { gazeX: 0, gazeY: 0, lid: 0 },
      brows: { lift: 0, tilt: 0 },
      mouth: { open: 0, smile: 0 },
    };
  }

  const time = finiteMs(elapsedMs);
  const breath = Math.sin((time / 2_300) * Math.PI * 2);
  const slowHead = Math.sin((time / 4_600) * Math.PI * 2);
  const blink = getSeferAbiBlinkProgress(time);

  const frame = {
    state: normalizedState,
    audioSync: null,
    head: {
      x: slowHead * 0.55,
      y: breath * 0.42,
      rotate: slowHead * 0.12,
      scale: 1 + breath * 0.002,
    },
    eyes: {
      gazeX: Math.sin((time / 3_700) * Math.PI * 2) * 0.08,
      gazeY: Math.sin((time / 2_900) * Math.PI * 2) * 0.05,
      lid: blink,
    },
    brows: { lift: 0, tilt: slowHead * 0.03 },
    mouth: { open: 0, smile: 0 },
  };

  switch (normalizedState) {
    case "listening":
      frame.head.rotate += 0.08;
      frame.eyes.gazeX = 0.2;
      frame.eyes.gazeY = -0.02;
      frame.brows.lift = 0.04;
      break;
    case "thinking":
      frame.head.rotate -= 0.07;
      frame.eyes.gazeX = -0.15;
      frame.eyes.gazeY = -0.2;
      frame.brows.lift = 0.06;
      break;
    case "responding":
      frame.eyes.gazeY = -0.02;
      frame.mouth.open = 0.12 + (Math.sin((time / 260) * Math.PI * 2) * 0.5 + 0.5) * 0.2;
      frame.mouth.smile = 0.04;
      break;
    case "result-ready":
      frame.head.y -= 0.28;
      frame.head.rotate += 0.05;
      frame.brows.lift = 0.05;
      frame.mouth.smile = 0.22;
      break;
    case "attention":
    case "approval-required":
      frame.head.rotate -= 0.06;
      frame.brows.lift = -0.14;
      frame.brows.tilt = -0.06;
      frame.mouth.smile = -0.03;
      break;
    default:
      break;
  }

  frame.head.x = clamp(frame.head.x, -1, 1);
  frame.head.y = clamp(frame.head.y, -1, 1);
  frame.head.rotate = clamp(frame.head.rotate, -0.5, 0.5);
  frame.head.scale = clamp(frame.head.scale, 0.995, 1.005);
  frame.eyes.gazeX = clamp(frame.eyes.gazeX, -1, 1);
  frame.eyes.gazeY = clamp(frame.eyes.gazeY, -1, 1);
  frame.eyes.lid = clamp(frame.eyes.lid, 0, 1);
  frame.brows.lift = clamp(frame.brows.lift, -1, 1);
  frame.brows.tilt = clamp(frame.brows.tilt, -1, 1);
  frame.mouth.open = clamp(frame.mouth.open, 0, 1);
  frame.mouth.smile = clamp(frame.mouth.smile, -1, 1);

  return frame;
}
