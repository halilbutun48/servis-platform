import crypto from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function normalizeTotpToken(v) {
  return String(v || "").replace(/\s+/g, "").trim();
}

export function generateSecretBase32(numBytes = 20) {
  return base32Encode(crypto.randomBytes(numBytes));
}

export function base32Encode(buf) {
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || []);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = String(str || "").toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("INVALID_BASE32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secretBase32, counter, digits = 6) {
  const key = base32Decode(secretBase32);
  const msg = Buffer.alloc(8);
  const c = BigInt(counter);
  msg.writeBigUInt64BE(c);
  const hmac = crypto.createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return String(code % mod).padStart(digits, "0");
}

export function totpToken(secretBase32, { ts = Date.now(), stepSec = 30, digits = 6 } = {}) {
  const counter = Math.floor(Number(ts) / 1000 / stepSec);
  return hotp(secretBase32, counter, digits);
}

export function verifyTotp(secretBase32, token, { ts = Date.now(), stepSec = 30, digits = 6, window = 1 } = {}) {
  const want = normalizeTotpToken(token);
  if (!/^\d{6}$/.test(want)) return false;
  const baseCounter = Math.floor(Number(ts) / 1000 / stepSec);
  for (let diff = -window; diff <= window; diff++) {
    if (hotp(secretBase32, baseCounter + diff, digits) === want) return true;
  }
  return false;
}

export function buildOtpauthUrl({ issuer, label, secretBase32 }) {
  const iss = encodeURIComponent(String(issuer || "Personel-Servis V1"));
  const lab = encodeURIComponent(String(label || "user"));
  return `otpauth://totp/${iss}:${lab}?secret=${encodeURIComponent(secretBase32)}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`;
}
