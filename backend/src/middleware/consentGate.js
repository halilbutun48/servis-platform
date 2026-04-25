// backend/src/middleware/consentGate.js
// M38+M47 — KVKK consent gate helpers

import { prisma } from "../prisma.js";
import { getKvkkDocument } from "../kvkk/documents.js";
import { isGreenpackBypassAllowed } from "../auth/securityPolicy.js";

export const CONSENT_DOCS = {
  LOCATION: (() => {
    const doc = getKvkkDocument("LOCATION_CONSENT");
    return { docKey: doc?.docKey || "LOCATION_CONSENT", docVersion: doc?.docVersion || "1" };
  })(),
};

function getConsentDelegate() {
  return prisma.consent || prisma.kvkkConsent || null;
}

function kvkk403(res, { docKey, docVersion, detail }) {
  return res.status(403).json({
    error: "KVKK_CONSENT_REQUIRED",
    docKey: String(docKey),
    docVersion: String(docVersion),
    hint: "KVKK ekranını açıp onay verin.",
    ...(detail ? { detail } : {}),
  });
}

function normalizeArgs(a, b, c) {
  if (a && typeof a === "object" && !Array.isArray(a)) {
    return {
      docKey: String(a.docKey || CONSENT_DOCS.LOCATION.docKey),
      docVersion: String(a.docVersion || CONSENT_DOCS.LOCATION.docVersion),
      roles: Array.isArray(a.roles) ? a.roles : null,
      bypassEnv: String(a.bypassEnv || "BYPASS_CONSENT_GATE"),
    };
  }
  return {
    docKey: String(a || CONSENT_DOCS.LOCATION.docKey),
    docVersion: String(b || CONSENT_DOCS.LOCATION.docVersion),
    roles: Array.isArray(c) ? c : null,
    bypassEnv: "BYPASS_CONSENT_GATE",
  };
}

export function consentGate(a, b, c) {
  const { docKey, docVersion, roles, bypassEnv } = normalizeArgs(a, b, c);

  return async function consentGateMiddleware(req, res, next) {
    try {
      if (process.env[bypassEnv] === "1") return next();

      if (roles && roles.length) {
        const role = String(req.user?.role || "");
        if (!roles.includes(role)) return next();
      }

      const userId = Number(req.user?.id || 0);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const Consent = getConsentDelegate();
      if (!Consent) {
        console.error("consentGate: Prisma delegate missing (expected prisma.consent)");
        return res.status(500).json({ error: "consent model missing" });
      }

      const row = await Consent.findFirst({
        where: { userId, docKey, docVersion, revokedAt: null },
        select: { id: true },
      });

      if (!row) return kvkk403(res, { docKey, docVersion });
      return next();
    } catch (e) {
      const detail = isGreenpackBypassAllowed(req) ? String(e?.message || e) : undefined;
      console.error("consentGate error:", e);
      return kvkk403(res, { docKey, docVersion, detail });
    }
  };
}

export function requireConsent(docKey, docVersion) {
  return consentGate({ docKey, docVersion });
}

export async function upsertConsent({ userId, role, docKey, docVersion, req }) {
  const Consent = getConsentDelegate();
  if (!Consent) throw new Error("consent model missing");

  const ip = req?.ip ? String(req.ip) : null;
  const ua = req?.get ? String(req.get("user-agent") || "") : null;

  await Consent.upsert({
    where: { userId_docKey_docVersion: { userId: Number(userId), docKey: String(docKey), docVersion: String(docVersion) } },
    update: {
      role: role ? role : undefined,
      revokedAt: null,
      acceptedAt: new Date(),
      ip: ip || undefined,
      userAgent: ua || undefined,
    },
    create: {
      userId: Number(userId),
      role: role ? role : undefined,
      docKey: String(docKey),
      docVersion: String(docVersion),
      acceptedAt: new Date(),
      ip: ip || undefined,
      userAgent: ua || undefined,
    },
  });

  return true;
}

export async function revokeConsent({ userId, docKey, docVersion }) {
  const Consent = getConsentDelegate();
  if (!Consent) throw new Error("consent model missing");

  const where = {
    userId: Number(userId),
    docKey: String(docKey),
    ...(docVersion ? { docVersion: String(docVersion) } : {}),
    revokedAt: null,
  };

  const out = await Consent.updateMany({
    where,
    data: { revokedAt: new Date() },
  });

  return out;
}

export default consentGate;
