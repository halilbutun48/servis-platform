import crypto from "crypto";

export function hashTelematicsToken(raw) {
  return crypto.createHash("sha256").update(String(raw || "")).digest("hex");
}

export function makeTelematicsToken() {
  return crypto.randomBytes(24).toString("hex");
}
