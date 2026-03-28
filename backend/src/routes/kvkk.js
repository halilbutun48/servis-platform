// backend/src/routes/kvkk.js
// M47 — KVKK notice/consent framework
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth/middleware.js";
import { upsertConsent, revokeConsent } from "../middleware/consentGate.js";
import { audit } from "../audit.js";
import { getKvkkDocument, getKvkkRequiredDocs, getKvkkSummaryForUser } from "../kvkk/documents.js";
import { getKvkkMatrix } from "../kvkk/matrix.js";
import { buildKvkkEnforcementSummary } from "../kvkk/enforcement.js";
import { buildKvkkRetentionEnforcementSummary } from "../kvkk/retention.js";

function canRoleUseDoc(role, doc) {
  const r = String(role || "");
  return !!doc && Array.isArray(doc.roles) && doc.roles.includes(r);
}

function publicDocView(x) {
  return {
    docKey: x.docKey,
    docVersion: x.docVersion,
    docKind: x.docKind,
    title: x.title,
    summary: x.summary,
    blocks: Array.isArray(x.blocks) ? x.blocks : [],
    required: x.required !== false,
  };
}

export function kvkkRouter() {
  const r = express.Router();

  r.get("/required", authRequired(), async (req, res) => {
    const role = req.user?.role || "";
    return res.json({ items: getKvkkRequiredDocs(role).map(publicDocView) });
  });

  r.get("/documents/current", authRequired(), async (req, res) => {
    const userId = Number(req.user?.id || 0);
    const role = String(req.user?.role || "");
    const summary = await getKvkkSummaryForUser({ userId, role, prismaClient: prisma });
    return res.json(summary);
  });

  r.get("/matrix", authRequired(), async (req, res) => {
    const matrix = getKvkkMatrix();
    return res.json({ ...matrix, enforcement: buildKvkkEnforcementSummary(), retention: buildKvkkRetentionEnforcementSummary() });
  });

  r.get("/retention", authRequired(), async (_req, res) => {
    return res.json(buildKvkkRetentionEnforcementSummary());
  });

  r.get("/summary", authRequired(), async (req, res) => {
    const userId = Number(req.user?.id || 0);
    const role = String(req.user?.role || "");
    const summary = await getKvkkSummaryForUser({ userId, role, prismaClient: prisma });
    return res.json({
      requiredCount: summary.requiredCount,
      acceptedCount: summary.acceptedCount,
      blocking: summary.blocking,
      pendingDocKeys: summary.pendingDocKeys,
    });
  });

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

  r.post("/consents/accept", authRequired(), async (req, res) => {
    const userId = Number(req.user?.id || 0);
    const role = String(req.user?.role || "");
    const docKey = String(req.body?.docKey || "").trim();
    const docVersion = String(req.body?.docVersion || "").trim();

    if (!docKey) return res.status(400).json({ error: "docKey required" });

    const doc = getKvkkDocument(docKey);
    if (!doc) return res.status(400).json({ error: "KVKK_DOC_UNKNOWN" });
    if (!canRoleUseDoc(role, doc)) return res.status(403).json({ error: "KVKK_DOC_NOT_ALLOWED_FOR_ROLE" });
    if (String(docVersion || doc.docVersion) !== String(doc.docVersion)) {
      return res.status(400).json({ error: "KVKK_DOC_VERSION_MISMATCH", currentVersion: doc.docVersion });
    }

    await upsertConsent({ userId, role, docKey: doc.docKey, docVersion: doc.docVersion, req });
    await audit(req, {
      action: "KVKK_DOC_ACCEPT",
      entity: "Consent",
      entityId: userId,
      meta: { userId, docKey: doc.docKey, docVersion: doc.docVersion, docKind: doc.docKind },
    });

    return res.json({ ok: true, item: publicDocView(doc) });
  });

  r.post("/consents/accept-many", authRequired(), async (req, res) => {
    const userId = Number(req.user?.id || 0);
    const role = String(req.user?.role || "");
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const docs = rawItems.length
      ? rawItems.map((x) => getKvkkDocument(x?.docKey)).filter(Boolean)
      : getKvkkRequiredDocs(role);

    const allowed = docs.filter((doc) => canRoleUseDoc(role, doc));
    if (!allowed.length) return res.json({ ok: true, count: 0, items: [] });

    for (const doc of allowed) {
      await upsertConsent({ userId, role, docKey: doc.docKey, docVersion: doc.docVersion, req });
      await audit(req, {
        action: "KVKK_DOC_ACCEPT",
        entity: "Consent",
        entityId: userId,
        meta: { userId, docKey: doc.docKey, docVersion: doc.docVersion, docKind: doc.docKind, bulk: true },
      });
    }

    return res.json({ ok: true, count: allowed.length, items: allowed.map(publicDocView) });
  });

  r.post("/consents/revoke", authRequired(), async (req, res) => {
    const userId = Number(req.user?.id || 0);
    const role = String(req.user?.role || "");
    const docKey = String(req.body?.docKey || "").trim();
    const docVersionRaw = String(req.body?.docVersion || "").trim();

    if (!docKey) return res.status(400).json({ error: "docKey required" });

    const doc = getKvkkDocument(docKey);
    if (!doc) return res.status(400).json({ error: "KVKK_DOC_UNKNOWN" });
    if (!canRoleUseDoc(role, doc)) return res.status(403).json({ error: "KVKK_DOC_NOT_ALLOWED_FOR_ROLE" });

    const docVersion = docVersionRaw ? docVersionRaw : null;
    const out = await revokeConsent({ userId, docKey: doc.docKey, docVersion, req });
    await audit(req, {
      action: "KVKK_DOC_REVOKE",
      entity: "Consent",
      entityId: userId,
      meta: { userId, docKey: doc.docKey, docVersion: docVersion || "ALL" },
    });

    return res.json({ ok: true, count: out.count });
  });

  return r;
}
