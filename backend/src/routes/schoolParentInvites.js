import express from "express";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { sanitizeAuditMeta, sanitizeInviteItem } from "../kvkk/enforcement.js";

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}

const ACCESS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomAccessCode(len = 8) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i += 1) out += ACCESS_ALPHABET[bytes[i] % ACCESS_ALPHABET.length];
  return out;
}

function randomPin(len = 6) {
  let out = "";
  while (out.length < len) out += String(crypto.randomInt(0, 10));
  return out.slice(0, len);
}

function buildParentAccess() {
  const accessCode = randomAccessCode(8);
  const pin = randomPin(6);
  const rawToken = `${accessCode}${pin}`;
  return { accessCode, pin, rawToken };
}

function toInt(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

function inviteStatus(it) {
  if (it?.revokedAt) return "REVOKED";
  if (it?.expiresAt && new Date(it.expiresAt).getTime() <= Date.now()) return "EXPIRED";
  return "ACTIVE";
}

async function recordAudit(req, action, entity, entityId, meta) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.id ?? null,
        actorRole: req.user?.role ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: sanitizeAuditMeta(meta ?? null),
      },
    });
  } catch {}
}

async function assertSchoolScope(req, res) {
  const companyId = req.user?.companyId ?? null;
  if (!companyId) {
    res.status(400).json({ error: "company scope missing" });
    return null;
  }
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, kind: true } });
  if (!company) {
    res.status(404).json({ error: "company not found" });
    return null;
  }
  if (company.kind !== "SCHOOL") {
    res.status(403).json({ error: "SCHOOL_ONLY" });
    return null;
  }
  return company;
}

function mapInvite(it, role = "COMPANY") {
  return sanitizeInviteItem({
    id: it.id,
    companyId: it.companyId,
    childPersonelId: it.childPersonelId,
    createdAt: it.createdAt,
    expiresAt: it.expiresAt,
    revokedAt: it.revokedAt,
    createdByUserId: it.createdByUserId ?? null,
    status: inviteStatus(it),
    child: it.child ? { id: it.child.id, fullName: it.child.fullName, kind: it.child.kind } : null,
  }, { role });
}

export function schoolParentInvitesRouter() {
  const r = express.Router();
  r.use(authRequired(), requireRole("COMPANY", "SUPER_ADMIN"));

  r.get("/", async (req, res) => {
    const company = await assertSchoolScope(req, res);
    if (!company) return;

    const childPersonelId = toInt(req.query.childPersonelId, null);
    const status = String(req.query.status || "").trim().toUpperCase();
    const take = Math.min(200, Math.max(1, toInt(req.query.take, 50)));

    const items = await prisma.parentInvite.findMany({
      where: {
        companyId: company.id,
        ...(childPersonelId ? { childPersonelId } : {}),
      },
      include: {
        child: { select: { id: true, fullName: true, kind: true } },
      },
      orderBy: { id: "desc" },
      take,
    });

    let out = items.map((item) => mapInvite(item, req.user?.role));
    if (status) out = out.filter((x) => x.status === status);
    res.json({ ok: true, items: out });
  });

  r.post("/", async (req, res) => {
    const company = await assertSchoolScope(req, res);
    if (!company) return;

    const childPersonelId = toInt(req.body?.childPersonelId, null);
    const expiresInDays = Math.min(365, Math.max(1, toInt(req.body?.expiresInDays, 7)));
    if (!childPersonelId) return res.status(400).json({ error: "childPersonelId required" });

    const child = await prisma.personel.findFirst({
      where: { id: childPersonelId, companyId: company.id },
      select: { id: true, fullName: true, kind: true },
    });
    if (!child) return res.status(404).json({ error: "child not found" });

    const { rawToken, accessCode, pin } = buildParentAccess();
    const tokenHash = sha256Hex(rawToken);
    const created = await prisma.parentInvite.create({
      data: {
        companyId: company.id,
        childPersonelId: child.id,
        tokenHash,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 3600 * 1000),
        createdByUserId: req.user?.id ?? null,
      },
      include: { child: { select: { id: true, fullName: true, kind: true } } },
    });

    await recordAudit(req, "PARENT_INVITE_CREATE", "ParentInvite", created.id, {
      companyId: company.id,
      childPersonelId: child.id,
      accessCodeMasked: `${accessCode.slice(0, 4)}****`,
    });

    res.json({
      ok: true,
      item: mapInvite(created, req.user?.role),
      token: rawToken,
      accessCode,
      pin,
    });
  });

  r.post("/:id/revoke", async (req, res) => {
    const company = await assertSchoolScope(req, res);
    if (!company) return;

    const id = toInt(req.params.id, null);
    if (!id) return res.status(400).json({ error: "id required" });

    const existing = await prisma.parentInvite.findFirst({
      where: { id, companyId: company.id },
      include: { child: { select: { id: true, fullName: true, kind: true } } },
    });
    if (!existing) return res.status(404).json({ error: "invite not found" });
    if (existing.revokedAt) return res.json({ ok: true, item: mapInvite(existing, req.user?.role) });

    const updated = await prisma.parentInvite.update({
      where: { id },
      data: { revokedAt: new Date() },
      include: { child: { select: { id: true, fullName: true, kind: true } } },
    });

    await recordAudit(req, "PARENT_INVITE_REVOKE", "ParentInvite", id, { companyId: company.id, childPersonelId: updated.childPersonelId });

    res.json({ ok: true, item: mapInvite(updated, req.user?.role) });
  });

  return r;
}
