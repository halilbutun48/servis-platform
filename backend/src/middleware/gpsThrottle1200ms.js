/**
 * M72.1 — /api/gps throttle
 * 1.2 saniyeden sık gelen istekleri server "ignore" eder:
 *   200 { ok:true, throttled:true }
 *
 * ✅ M41: distributed mode (Redis)
 * - When RATE_LIMIT_STORE=redis OR GPS_THROTTLE_STORE=redis, uses Redis SET NX PX.
 * - Fallback: in-memory Map.
 *
 * Notlar:
 * - GreenPack (x-greenpack: 1) ve ?noThrottle=1 -> bypass (gate/check determinism).
 */

import { getRedis } from "../redis/index.js";
import { isGreenpackBypassAllowed } from "../auth/securityPolicy.js";

const DEFAULT_MIN_INTERVAL_MS = 1200;

export function gpsThrottle1200ms(opts = {}) {
  const minIntervalMs = Number.isFinite(opts.minIntervalMs) ? opts.minIntervalMs : DEFAULT_MIN_INTERVAL_MS;

  const getKey =
    typeof opts.getKey === "function"
      ? opts.getKey
      : (req) => {
          const v = req?.body?.vehicleId ?? req?.body?.vehicle?.id ?? req?.body?.vehicle?.vehicleId;
          if (v) return `vehicle:${v}`;

          const uid = req?.user?.id ?? req?.user?.userId ?? req?.auth?.sub ?? req?.user?.sub;
          if (uid) return `user:${uid}`;

          return `ip:${req.ip}`;
        };

  // Key -> lastSeenAtMs (fallback)
  const lastSeenAt = new Map();

  const storePref = String(process.env.GPS_THROTTLE_STORE || process.env.RATE_LIMIT_STORE || "").toLowerCase();
  const useRedis = storePref === "redis";

  return async function gpsThrottleMiddleware(req, res, next) {
    try {
      // ✅ GreenPack / local test bypass
      if (isGreenpackBypassAllowed(req) || String(req.query?.noThrottle ?? "") === "1") return next();

      const key = getKey(req);
      const now = Date.now();

      if (useRedis) {
        const redis = getRedis();
        if (redis) {
          const rkey = `gps:throttle:${key}`;
          // SET key 1 PX <ms> NX  -> OK if first in window, null if throttled
          const resp = await redis.send("SET", rkey, "1", "PX", String(minIntervalMs), "NX");
          if (resp !== "OK") {
            return res.status(200).json({ ok: true, throttled: true });
          }
          return next();
        }
        // if redis requested but unavailable -> fallback
      }

      const prev = lastSeenAt.get(key) || 0;
      if (now - prev < minIntervalMs) {
        return res.status(200).json({ ok: true, throttled: true });
      }

      lastSeenAt.set(key, now);

      // Opportunistic cleanup
      if (lastSeenAt.size > 5000) {
        const cutoff = now - 10 * 60 * 1000; // 10 min
        for (const [k, t] of lastSeenAt.entries()) {
          if (t < cutoff) lastSeenAt.delete(k);
        }
      }

      return next();
    } catch {
      // Fail-open
      return next();
    }
  };
}
