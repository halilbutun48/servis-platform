import { OAuth2Client } from "google-auth-library";
import { ENV } from "../env.js";
import { isGreenpackBypassAllowed } from "./securityPolicy.js";

const _clients = new Map();

function allowedClientIds() {
  return String(ENV.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}

function clientFor(audienceKey) {
  if (_clients.has(audienceKey)) return _clients.get(audienceKey);
  const c = new OAuth2Client();
  _clients.set(audienceKey, c);
  return c;
}

export async function verifyGoogleCredential({ credential, req }) {
  if (isGreenpackBypassAllowed(req) && req.body?.testProfile && typeof req.body.testProfile === "object") {
    const p = req.body.testProfile;
    const email = String(p.email || "").trim().toLowerCase();
    const sub = String(p.sub || "").trim();
    if (!email || !sub) {
      throw Object.assign(new Error("TEST_PROFILE_INVALID"), { status: 400, code: "TEST_PROFILE_INVALID" });
    }
    return {
      sub,
      email,
      emailVerified: p.emailVerified !== false,
      name: String(p.name || p.fullName || email.split("@")[0] || "").trim(),
      givenName: String(p.givenName || "").trim() || null,
      familyName: String(p.familyName || "").trim() || null,
      picture: String(p.picture || "").trim() || null,
      testMode: true,
    };
  }

  if (!ENV.GOOGLE_AUTH_ENABLED) {
    throw Object.assign(new Error("GOOGLE_AUTH_DISABLED"), { status: 503, code: "GOOGLE_AUTH_DISABLED" });
  }

  const audiences = allowedClientIds();
  if (!audiences.length) {
    throw Object.assign(new Error("GOOGLE_CLIENT_ID_MISSING"), { status: 500, code: "GOOGLE_CLIENT_ID_MISSING" });
  }

  const idToken = String(credential || "").trim();
  if (!idToken) {
    throw Object.assign(new Error("GOOGLE_CREDENTIAL_REQUIRED"), { status: 400, code: "GOOGLE_CREDENTIAL_REQUIRED" });
  }

  const client = clientFor(audiences.join(","));
  const ticket = await client.verifyIdToken({ idToken, audience: audiences });
  const payload = ticket.getPayload?.() || {};
  const email = String(payload.email || "").trim().toLowerCase();
  const sub = String(payload.sub || "").trim();
  if (!email || !sub) {
    throw Object.assign(new Error("GOOGLE_PROFILE_INVALID"), { status: 401, code: "GOOGLE_PROFILE_INVALID" });
  }
  return {
    sub,
    email,
    emailVerified: payload.email_verified === true,
    name: String(payload.name || "").trim() || email.split("@")[0],
    givenName: String(payload.given_name || "").trim() || null,
    familyName: String(payload.family_name || "").trim() || null,
    picture: String(payload.picture || "").trim() || null,
    hd: String(payload.hd || "").trim() || null,
    testMode: false,
  };
}
