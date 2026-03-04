// backend/src/middleware/consentGate.js
// M38 — KVKK Consent Gate (LOCATION) for sensitive endpoints (parent live / driver gps)
import { prisma } from "../prisma.js";

export const CONSENT_DOCS = {
  LOCATION: { docKey: "LOCATION_CONSENT", docVersion: "1" },
};

function clientIp(req) {
  const xfwd = String(req.headers["x-forwarded-for"] || "");
  return xfwd.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || null;
}

export function requireConsent(docKey, docVersion = "1") {
  return async function consentGate(req, res, next) {
    try {
      const role = String(req.user?.role || "");
      // SUPER_ADMIN bypass (still should be audited at higher level)
      if (role === "SUPER_ADMIN") return next();

      const userId = Number(req.user?.id || 0);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const c = await prisma.consent.findFirst({
        where: { userId, docKey: String(docKey), docVersion: String(docVersion), revokedAt: null },
        select: { id: true, acceptedAt: true },
      });

      if (!c) {
        return res.status(403).json({
          error: "KVKK_CONSENT_REQUIRED",
          docKey: String(docKey),
          docVersion: String(docVersion),
          hint: "Open /kvkk consent screen and accept.",
        });
      }

      return next();
    } catch (e) {
      // fail closed
      return res.status(500).json({ error: "consent gate error" });
    }
  };
}

export async function upsertConsent({ userId, role, docKey, docVersion, req }) {
  const now = new Date();
  const ip = clientIp(req);
  const ua = req.headers["user-agent"]?.toString() || null;

  const existing = await prisma.consent.findFirst({
    where: { userId, docKey, docVersion },
    select: { id: true },
  });

  if (existing?.id) {
    return prisma.consent.update({
      where: { id: existing.id },
      data: { role, acceptedAt: now, revokedAt: null, ip, userAgent: ua },
    });
  }

  return prisma.consent.create({
    data: { userId, role, docKey, docVersion, acceptedAt: now, revokedAt: null, ip, userAgent: ua },
  });
}

export async function revokeConsent({ userId, docKey, docVersion = null, req }) {
  const now = new Date();
  const ip = clientIp(req);
  const ua = req.headers["user-agent"]?.toString() || null;

  const where = { userId, docKey };
  if (docVersion) where["docVersion"] = docVersion;

  return prisma.consent.updateMany({
    where,
    data: { revokedAt: now, ip, userAgent: ua },
  });
}
