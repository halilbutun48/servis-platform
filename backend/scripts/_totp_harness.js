import { totpToken } from "../src/auth/totp.js";
import { reqJson } from "./_harness.js";

export async function ensureTotpStepUp(token, label) {
  const setup = await reqJson("POST", "/api/auth/totp/setup", {
    token,
    includeGreenpack: false,
    body: {},
  });
  if (!setup.ok || !setup.json?.secretBase32) {
    throw new Error(`FAIL TOTP setup (${label}) -> ${setup.status}\n${String(setup.text || "").slice(0, 400)}`);
  }

  const code = totpToken(setup.json.secretBase32);
  const enable = await reqJson("POST", "/api/auth/totp/enable", {
    token,
    includeGreenpack: false,
    body: { code },
  });
  if (!enable.ok || enable.json?.enabled !== true) {
    throw new Error(`FAIL TOTP enable (${label}) -> ${enable.status}\n${String(enable.text || "").slice(0, 400)}`);
  }

  const verify = await reqJson("POST", "/api/auth/totp/verify", {
    token,
    includeGreenpack: false,
    body: { code },
  });
  if (!verify.ok || !verify.json?.token) {
    throw new Error(`FAIL TOTP verify (${label}) -> ${verify.status}\n${String(verify.text || "").slice(0, 400)}`);
  }

  return verify.json.token;
}
