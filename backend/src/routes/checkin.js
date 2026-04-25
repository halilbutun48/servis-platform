// backend/src/routes/checkin.js
// OPTIONAL — QR/NFC İndi/Bindi (Check-in) Modülü
// M42 standardı: panel ve API sürekli açık, kullanım opsiyonel.

import express from "express";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { consentGate, CONSENT_DOCS } from "../middleware/consentGate.js";

function isEnabled() {
  return true;
}

function dedupeSec() {
  const n = Number(process.env.CHECKIN_DEDUPE_SEC || 60);
  if (!Number.isFinite(n) || n < 0) return 60;
  return Math.min(3600, Math.floor(n));
}

function toInt(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function normEnum(v, allowed, def = null) {
  const s = String(v || "").trim().toUpperCase();
  return allowed.includes(s) ? s : def;
}

function stripPsv1(token) {
  const t = String(token || "").trim();
  if (!t) return "";
  return t.startsWith("psv1:") ? t.slice(5) : t;
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function newToken() {
  // 32-ish chars, URL-safe
  return crypto.randomBytes(24).toString("base64url");
}

async function recordAudit({ req, action, entity, entityId, meta }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.id ?? null,
        actorRole: req.user?.role ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ?? null,
      },
    });
  } catch {
    // swallow
  }
}

async function resolveDriverId(userId) {
  const d = await prisma.driver.findFirst({ where: { userId: Number(userId) }, select: { id: true } });
  return d?.id ?? null;
}

function emitUpdate(io, shift, payload) {
  if (!io) return;
  try {
    io.to(`company:${shift.companyId}`).emit("shift:checkin:update", payload);
    if (shift.roomId) io.to(`room:${shift.roomId}`).emit("shift:checkin:update", payload);
    if (shift.driverId) {
      // driver user room join is user:<id>; we don't have it here reliably.
      // still, driver UI also listens on room/company channels.
    }
  } catch {
    // swallow
  }
}

async function buildShiftCounts(shiftId) {
  // take limited events and compute counts
  const items = await prisma.checkinEvent.findMany({
    where: { shiftId: Number(shiftId) },
    select: { eventType: true },
    orderBy: { at: "desc" },
    take: 1000,
  });

  const counts = { BOARD: 0, ALIGHT: 0 };
  for (const it of items) {
    if (it.eventType === "BOARD") counts.BOARD++;
    else if (it.eventType === "ALIGHT") counts.ALIGHT++;
  }
  return counts;
}

export function checkinRouter(io) {
  const r = express.Router();

  // Always-on optional gate: modül açık, kullanım kurala göre opsiyonel.
  r.use((req, res, next) => {
    if (!isEnabled()) return res.status(404).json({ error: "FEATURE_DISABLED" });
    return next();
  });

  r.use("/company", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), requireStepUpWrite("COMPANY", "SUPER_ADMIN"));

  // --- COMPANY: credential issue/revoke/list ---
  r.post(
    "/company/personels/:id/credentials/issue",
    async (req, res) => {
      const personelId = toInt(req.params.id, null);
      if (!personelId) return res.status(400).json({ error: "personelId required" });

      const type = normEnum(req.body?.type, ["QR", "NFC"], null);
      if (!type) return res.status(400).json({ error: "invalid type" });

      const p = await prisma.personel.findUnique({ where: { id: Number(personelId) }, select: { id: true, companyId: true } });
      if (!p) return res.status(404).json({ error: "personel not found" });

      if (req.user.role === "COMPANY") {
        const cid = req.user.companyId ?? null;
        if (!cid || p.companyId !== cid) return res.status(403).json({ error: "Forbidden" });
      }

      // retry on unique hash collision
      let created = null;
      let token = null;
      for (let i = 0; i < 3; i++) {
        token = newToken();
        const tokenHash = sha256Hex(token);
        try {
          created = await prisma.personelCredential.create({
            data: {
              personelId: p.id,
              type,
              tokenHash,
              status: "ACTIVE",
              issuedAt: new Date(),
            },
            select: { id: true, personelId: true, type: true, status: true, issuedAt: true, revokedAt: true, lastUsedAt: true },
          });
          break;
        } catch (e) {
          // P2002 unique constraint (tokenHash)
          const msg = String(e?.code || e?.message || "");
          if (!msg.includes("P2002")) throw e;
        }
      }

      if (!created || !token) return res.status(500).json({ error: "token issue failed" });

      await recordAudit({
        req,
        action: "CREDENTIAL_ISSUE",
        entity: "Personel",
        entityId: p.id,
        meta: { personelId: p.id, type },
      });

      return res.json({ ok: true, credential: created, token: `psv1:${token}` });
    }
  );

  r.post(
    "/company/personels/:id/credentials/revoke",
    async (req, res) => {
      const personelId = toInt(req.params.id, null);
      if (!personelId) return res.status(400).json({ error: "personelId required" });

      const type = req.body?.type ? normEnum(req.body?.type, ["QR", "NFC"], null) : null;

      const p = await prisma.personel.findUnique({ where: { id: Number(personelId) }, select: { id: true, companyId: true } });
      if (!p) return res.status(404).json({ error: "personel not found" });

      if (req.user.role === "COMPANY") {
        const cid = req.user.companyId ?? null;
        if (!cid || p.companyId !== cid) return res.status(403).json({ error: "Forbidden" });
      }

      const where = {
        personelId: p.id,
        status: "ACTIVE",
        ...(type ? { type } : {}),
      };

      const out = await prisma.personelCredential.updateMany({
        where,
        data: { status: "REVOKED", revokedAt: new Date() },
      });

      await recordAudit({
        req,
        action: "CREDENTIAL_REVOKE",
        entity: "Personel",
        entityId: p.id,
        meta: { personelId: p.id, type: type || "*", revokedCount: out.count },
      });

      return res.json({ ok: true, revokedCount: out.count });
    }
  );

  r.get(
    "/company/personels/:id/credentials",
    async (req, res) => {
      const personelId = toInt(req.params.id, null);
      if (!personelId) return res.status(400).json({ error: "personelId required" });

      const p = await prisma.personel.findUnique({ where: { id: Number(personelId) }, select: { id: true, companyId: true } });
      if (!p) return res.status(404).json({ error: "personel not found" });

      if (req.user.role === "COMPANY") {
        const cid = req.user.companyId ?? null;
        if (!cid || p.companyId !== cid) return res.status(403).json({ error: "Forbidden" });
      }

      const items = await prisma.personelCredential.findMany({
        where: { personelId: p.id },
        orderBy: { id: "desc" },
        take: 10,
        select: { id: true, personelId: true, type: true, status: true, issuedAt: true, revokedAt: true, lastUsedAt: true },
      });

      return res.json({ ok: true, items });
    }
  );

  // --- DRIVER: scan ---
  r.post(
    "/scan",
    authRequired(),
    requireRole("DRIVER"),
    consentGate(CONSENT_DOCS.LOCATION.docKey, CONSENT_DOCS.LOCATION.docVersion, ["DRIVER"]),
    async (req, res) => {
      const shiftId = toInt(req.body?.shiftId, null);
      if (!shiftId) return res.status(400).json({ error: "shiftId required" });

      const eventType = normEnum(req.body?.eventType, ["BOARD", "ALIGHT"], null);
      const source = normEnum(req.body?.source, ["QR", "NFC", "MANUAL"], null);
      if (!eventType || !source) return res.status(400).json({ error: "eventType/source required" });

      const tokenRaw = String(req.body?.token || "").trim();
      const token = stripPsv1(tokenRaw);
      if (!token) return res.status(400).json({ error: "token required" });

      const driverId = await resolveDriverId(req.user.id);
      if (!driverId) return res.status(400).json({ error: "driver profile missing" });

      const shift = await prisma.shift.findUnique({
        where: { id: Number(shiftId) },
        select: { id: true, companyId: true, roomId: true, driverId: true, status: true },
      });
      if (!shift) return res.status(404).json({ error: "shift not found" });
      if (shift.driverId !== driverId) return res.status(403).json({ error: "Forbidden" });
      if (shift.status !== "ACTIVE") return res.status(409).json({ error: "shift not ACTIVE" });

      const tokenHash = sha256Hex(token);
      const cred = await prisma.personelCredential.findFirst({
        where: { tokenHash, status: "ACTIVE" },
        select: { id: true, personelId: true, type: true },
      });
      if (!cred) return res.status(404).json({ error: "invalid token" });

      // personel scope + membership
      const p = await prisma.personel.findUnique({
        where: { id: Number(cred.personelId) },
        select: { id: true, companyId: true, fullName: true },
      });
      if (!p) return res.status(404).json({ error: "personel not found" });
      if (p.companyId !== shift.companyId) return res.status(403).json({ error: "Forbidden" });

      const inShift = await prisma.shiftPersonel.findUnique({
        where: { shiftId_personelId: { shiftId: shift.id, personelId: p.id } },
        select: { id: true },
      });
      if (!inShift) return res.status(400).json({ error: "personelNotInShift" });

      const now = new Date();
      const windowMs = dedupeSec() * 1000;

      const prev = await prisma.checkinEvent.findFirst({
        where: { shiftId: shift.id, personelId: p.id, eventType },
        orderBy: { at: "desc" },
        select: { id: true, shiftId: true, personelId: true, eventType: true, source: true, at: true, deviceId: true },
      });

      if (prev && now.getTime() - new Date(prev.at).getTime() <= windowMs) {
        const counts = await buildShiftCounts(shift.id);
        const payload = { shiftId: shift.id, deduped: true, counts, lastEvent: prev };
        emitUpdate(io, shift, payload);
        return res.json({ ok: true, shiftId: shift.id, deduped: true, counts, lastEvent: prev });
      }

      // create event
      const deviceId = req.body?.deviceId ? String(req.body.deviceId).trim() : null;
      const at = req.body?.at ? new Date(String(req.body.at)) : now;

      const created = await prisma.checkinEvent.create({
        data: {
          shiftId: shift.id,
          personelId: p.id,
          eventType,
          source,
          at,
          deviceId: deviceId || undefined,
        },
        select: { id: true, shiftId: true, personelId: true, eventType: true, source: true, at: true, deviceId: true },
      });

      await prisma.personelCredential.update({
        where: { id: cred.id },
        data: { lastUsedAt: now },
      });

      const counts = await buildShiftCounts(shift.id);

      await recordAudit({
        req,
        action: "CHECKIN_SCAN",
        entity: "Shift",
        entityId: shift.id,
        meta: {
          shiftId: shift.id,
          personelId: p.id,
          eventType,
          source,
          deviceId: deviceId || null,
          deduped: false,
        },
      });

      const payload = { shiftId: shift.id, deduped: false, counts, lastEvent: created };
      emitUpdate(io, shift, payload);
      return res.json({ ok: true, shiftId: shift.id, deduped: false, counts, lastEvent: created });
    }
  );

  // --- SHIFT events list (ROOM/COMPANY/DRIVER) ---
  r.get(
    "/shifts/:id/events",
    authRequired(),
    requireRole("COMPANY", "ROOM", "DRIVER", "SUPER_ADMIN"),
    async (req, res) => {
      const shiftId = toInt(req.params.id, null);
      if (!shiftId) return res.status(400).json({ error: "shiftId required" });

      const shift = await prisma.shift.findUnique({
        where: { id: Number(shiftId) },
        select: { id: true, companyId: true, roomId: true, driverId: true },
      });
      if (!shift) return res.status(404).json({ error: "shift not found" });

      if (req.user.role === "COMPANY") {
        const cid = req.user.companyId ?? null;
        if (!cid || shift.companyId !== cid) return res.status(403).json({ error: "Forbidden" });
      }
      if (req.user.role === "ROOM") {
        const rid = req.user.roomId ?? null;
        if (!rid || shift.roomId !== rid) return res.status(403).json({ error: "Forbidden" });
      }
      if (req.user.role === "DRIVER") {
        const driverId = await resolveDriverId(req.user.id);
        if (!driverId || shift.driverId !== driverId) return res.status(403).json({ error: "Forbidden" });
      }

      const items = await prisma.checkinEvent.findMany({
        where: { shiftId: shift.id },
        orderBy: { at: "desc" },
        take: 200,
        select: {
          id: true,
          shiftId: true,
          personelId: true,
          eventType: true,
          source: true,
          at: true,
          deviceId: true,
          meta: true,
          personel: { select: { fullName: true } },
        },
      });

      const counts = { BOARD: 0, ALIGHT: 0 };
      for (const it of items) {
        if (it.eventType === "BOARD") counts.BOARD++;
        else if (it.eventType === "ALIGHT") counts.ALIGHT++;
      }

      return res.json({ ok: true, shiftId: shift.id, counts, items });
    }
  );

  return r;
}

export default checkinRouter;
