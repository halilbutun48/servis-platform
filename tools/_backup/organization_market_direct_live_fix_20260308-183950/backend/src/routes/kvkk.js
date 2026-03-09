// backend/src/routes/kvkk.js
// M38 — KVKK consent endpoints (minimal)
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth/middleware.js";
import { upsertConsent, revokeConsent, CONSENT_DOCS } from "../middleware/consentGate.js";

function pickRequiredForRole(role) {
  const r = String(role || "");
  // For MVP: parent + driver must accept location tracking consent
  if (r === "PARENT" || r === "DRIVER") {
    return [
      {
        ...CONSENT_DOCS.LOCATION,
        title: "Konum Takibi Açık Rıza",
        required: true,
      },
    ];
  }
  return [];
}

export function kvkkRouter() {
  const r = express.Router();

  // Required consents for current user role
  r.get("/required", authRequired(), async (req, res) => {
    const role = req.user?.role || "";
    return res.json({ items: pickRequiredForRole(role) });
  });

  // My consents
  r.get("/consents/my", authRequired(), async (req, res) => {
    const userId = Number(req.user?.id || 0);
    const items = await prisma.consent.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 2000,
    });

    return res.json({
      items: items.map((x) => ({
        id: x.id,
        docKey: x.docKey,
        docVersion: x.docVersion,
        acceptedAt: x.acceptedAt,
        revokedAt: x.revokedAt,
      })),
    });
  });

  // Accept consent
  r.post("/consents/accept", authRequired(), async (req, res) => {
    const userId = Number(req.user?.id || 0);
    const role = String(req.user?.role || "");
    const docKey = String(req.body?.docKey || "").trim();
    const docVersion = String(req.body?.docVersion || "1").trim();

    if (!docKey) return res.status(400).json({ error: "docKey required" });

    await upsertConsent({ userId, role, docKey, docVersion, req });

    return res.json({ ok: true });
  });

  // Revoke consent (docVersion optional)
  r.post("/consents/revoke", authRequired(), async (req, res) => {
    const userId = Number(req.user?.id || 0);
    const docKey = String(req.body?.docKey || "").trim();
    const docVersionRaw = String(req.body?.docVersion || "").trim();

    if (!docKey) return res.status(400).json({ error: "docKey required" });

    const docVersion = docVersionRaw ? docVersionRaw : null;
    const out = await revokeConsent({ userId, docKey, docVersion, req });

    return res.json({ ok: true, count: out.count });
  });

  return r;
}
