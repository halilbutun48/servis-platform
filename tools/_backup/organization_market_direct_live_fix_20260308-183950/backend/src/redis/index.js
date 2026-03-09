// backend/src/redis/index.js

import { ENV } from "../env.js";
import { createMiniRedisClient } from "./miniRedis.js";

let _client = null;

export function getRedis() {
  const url = String(process.env.REDIS_URL || ENV.REDIS_URL || "").trim();
  if (!url) return null;
  if (_client) return _client;
  _client = createMiniRedisClient(url);
  return _client;
}
