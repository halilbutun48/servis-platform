import crypto from "crypto";
import { ENV } from "../env.js";

const VAULT_PREFIX = "vault:v1:";

function resolveVaultKeyMaterial() {
  return String(process.env.TOTP_SECRET_VAULT_KEY || ENV.TOTP_SECRET_VAULT_KEY || ENV.JWT_SECRET || "").trim();
}

function deriveVaultKey() {
  const material = resolveVaultKeyMaterial();
  if (!material) {
    throw new Error("SECRET_VAULT_KEY_REQUIRED");
  }
  return crypto.createHash("sha256").update(material, "utf8").digest();
}

function isWrappedSecret(value) {
  return String(value || "").startsWith(VAULT_PREFIX);
}

export function encryptSecretValue(value) {
  const plain = String(value || "");
  if (!plain) return "";
  if (isWrappedSecret(plain)) return plain;

  const key = deriveVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${VAULT_PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecretValue(storedValue) {
  const raw = String(storedValue || "");
  if (!raw) return "";
  if (!isWrappedSecret(raw)) return raw;

  const payload = raw.slice(VAULT_PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("SECRET_VAULT_PAYLOAD_INVALID");
  }

  const key = deriveVaultKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
