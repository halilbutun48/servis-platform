// backend/src/middleware/rateLimitRedisStore.js
// express-rate-limit compatible Redis store (distributed). Uses miniRedis client.

const LUA_INCR_EXPIRE = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {c, ttl}
`;

export class RedisRateLimitStore {
  constructor({ redis, windowMs, prefix = "rl:" }) {
    this.redis = redis;
    this.windowMs = Number(windowMs) || 60_000;
    this.prefix = String(prefix || "rl:");
  }

  _k(key) {
    return this.prefix + String(key);
  }

  async increment(key) {
    const k = this._k(key);
    try {
      const resp = await this.redis.send("EVAL", LUA_INCR_EXPIRE, "1", k, String(this.windowMs));
      const totalHits = Number(Array.isArray(resp) ? resp[0] : resp) || 0;
      const ttlMs = Number(Array.isArray(resp) ? resp[1] : this.windowMs) || this.windowMs;
      const resetTime = new Date(Date.now() + Math.max(0, ttlMs));
      return { totalHits, resetTime };
    } catch {
      // Fail-open: avoid breaking API if redis is down.
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key) {
    try {
      await this.redis.send("DECR", this._k(key));
    } catch {}
  }

  async resetKey(key) {
    try {
      await this.redis.send("DEL", this._k(key));
    } catch {}
  }
}
