import { getRedis } from "../redis/index.js";

const FAIL_LIMIT = Math.max(3, Number(process.env.DRIVER_PIN_FAIL_LIMIT || 5));
const FAIL_WINDOW_SEC = Math.max(60, Number(process.env.DRIVER_PIN_FAIL_WINDOW_SEC || 15 * 60));
const LOCK_SEC = Math.max(30, Number(process.env.DRIVER_PIN_LOCK_SEC || 15 * 60));

function failKey(driverId) {
  return `driver:pin:fail:${Number(driverId || 0)}`;
}

function lockKey(driverId) {
  return `driver:pin:lock:${Number(driverId || 0)}`;
}

async function send(redis, command, ...args) {
  if (!redis) return null;
  try {
    return await redis.send(command, ...args);
  } catch {
    return null;
  }
}

function parseTimestamp(raw) {
  const n = Number(raw || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function driverPinPolicy() {
  return {
    minLength: 6,
    maxLength: 8,
    digitsOnly: true,
    failLimit: FAIL_LIMIT,
    failWindowSec: FAIL_WINDOW_SEC,
    lockSec: LOCK_SEC,
  };
}

export function validateNewDriverPin(newPin, { currentPin = null } = {}) {
  const pin = String(newPin || "").trim();
  const cur = String(currentPin || "").trim();
  const policy = driverPinPolicy();

  if (!pin) return { ok: false, code: "NEW_PIN_REQUIRED", message: "Yeni PIN gerekli." };
  if (!/^\d+$/.test(pin)) return { ok: false, code: "PIN_FORMAT_INVALID", message: "PIN sadece rakamlardan oluşmalıdır." };
  if (pin.length < policy.minLength) return { ok: false, code: "NEW_PIN_TOO_SHORT", message: "PIN en az 6 haneli olmalıdır." };
  if (pin.length > policy.maxLength) return { ok: false, code: "PIN_FORMAT_INVALID", message: "PIN en fazla 8 haneli olabilir." };
  if (cur && pin === cur) return { ok: false, code: "PIN_REUSE_NOT_ALLOWED", message: "Yeni PIN mevcut PIN ile aynı olamaz." };
  if (/^(\d)\1+$/.test(pin)) return { ok: false, code: "PIN_TOO_WEAK", message: "Bu PIN çok kolay tahmin edilir. Farklı rakamlar kullanın." };
  return { ok: true, code: null, message: null };
}

export async function getDriverPinLockState(driverId) {
  const id = Number(driverId || 0);
  if (!id) return { locked: false, cooldownSec: 0, lockedUntil: null };

  const redis = getRedis();
  if (!redis) return { locked: false, cooldownSec: 0, lockedUntil: null };

  const raw = await send(redis, "GET", lockKey(id));
  const lockedUntilMs = parseTimestamp(raw);
  if (!lockedUntilMs) return { locked: false, cooldownSec: 0, lockedUntil: null };

  const now = Date.now();
  if (lockedUntilMs <= now) {
    await send(redis, "DEL", lockKey(id));
    return { locked: false, cooldownSec: 0, lockedUntil: null };
  }

  const cooldownSec = Math.max(1, Math.ceil((lockedUntilMs - now) / 1000));
  return { locked: true, cooldownSec, lockedUntil: new Date(lockedUntilMs).toISOString() };
}

export async function registerDriverPinFailure(driverId) {
  const id = Number(driverId || 0);
  const policy = driverPinPolicy();
  if (!id) return { count: 1, locked: false, cooldownSec: 0, lockedUntil: null, failLimit: policy.failLimit };

  const redis = getRedis();
  if (!redis) {
    return { count: 1, locked: false, cooldownSec: 0, lockedUntil: null, failLimit: policy.failLimit };
  }

  let count = Number(await send(redis, "INCR", failKey(id)));
  if (!Number.isFinite(count) || count < 1) count = 1;
  if (count === 1) await send(redis, "EXPIRE", failKey(id), String(policy.failWindowSec));

  if (count >= policy.failLimit) {
    const lockedUntilMs = Date.now() + policy.lockSec * 1000;
    await send(redis, "SET", lockKey(id), String(lockedUntilMs), "EX", String(policy.lockSec));
    return {
      count,
      locked: true,
      cooldownSec: policy.lockSec,
      lockedUntil: new Date(lockedUntilMs).toISOString(),
      failLimit: policy.failLimit,
    };
  }

  return { count, locked: false, cooldownSec: 0, lockedUntil: null, failLimit: policy.failLimit };
}

export async function clearDriverPinFailureState(driverId) {
  const id = Number(driverId || 0);
  if (!id) return;
  const redis = getRedis();
  if (!redis) return;
  await send(redis, "DEL", failKey(id));
  await send(redis, "DEL", lockKey(id));
}
