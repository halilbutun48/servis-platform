/**
 * M72.1 — /api/gps rate-limit
 * 1.2 saniyeden sık gelen istekleri server "ignore" eder:
 *   200 { ok:true, throttled:true }
 *
 * Notlar:
 * - In-memory Map kullanır (tek instance için yeterli). Çok instance varsa Redis tercih edilir.
 * - Key önceliği: body.vehicleId -> req.user.id -> IP
 */
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

  // Key -> lastSeenAtMs
  const lastSeenAt = new Map();

  return function gpsThrottleMiddleware(req, res, next) {
    try {
      // ✅ GreenPack / local test bypass
      // Gate/pack scripts send x-greenpack: 1 via scripts/_harness.js.
      // We MUST NOT throttle those requests; otherwise M4 (OVERSPEED) and similar
      // checks can fail because they intentionally post GPS back-to-back.
      if (process.env.NODE_ENV !== "production") {
        const gp = String(req.headers?.["x-greenpack"] ?? "");
        const noThrottle = String(req.query?.noThrottle ?? "") === "1";
        if (gp === "1" || noThrottle) return next();
      }

      const key = getKey(req);
      const now = Date.now();
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
    } catch (_e) {
      // Fail-open
      return next();
    }
  };
}
