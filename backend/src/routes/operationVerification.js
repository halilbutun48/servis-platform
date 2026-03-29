import express from "express";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import {
  buildOperationVerificationRoleSurface,
  getOperationVerificationManifest,
  getOperationVerificationCheckMeta,
  OPERATION_VERIFICATION_STATUSES,
  OPERATION_VERIFICATION_PROOF_TYPES,
} from "../ops/operationVerificationManifest.js";
import {
  listOperationVerificationRecords,
  readOperationVerificationRecords,
  summarizeOperationVerificationRecords,
  upsertOperationVerificationRecord,
} from "../ops/operationVerificationRecordStore.js";

export function operationVerificationRouter() {
  const r = express.Router();

  r.use(authRequired(), requireRole("SUPER_ADMIN"));

  r.get("/manifest", async (_req, res) => {
    return res.json(getOperationVerificationManifest());
  });

  r.get("/role-surface", async (req, res) => {
    const role = String(req.query?.role || "SUPER_ADMIN");
    const records = await readOperationVerificationRecords();
    return res.json(buildOperationVerificationRoleSurface(role, records));
  });

  r.get("/records", async (req, res) => {
    const role = String(req.query?.role || "SUPER_ADMIN");
    const items = await listOperationVerificationRecords(role);
    return res.json({ items, count: items.length });
  });


  r.get("/summary", async (req, res) => {
    const role = String(req.query?.role || "SUPER_ADMIN");
    const status = String(req.query?.status || "ALL");
    const proofType = String(req.query?.proofType || "ALL");
    const summary = await summarizeOperationVerificationRecords(role, { status, proofType });
    return res.json(summary);
  });

  r.get("/export-preview", async (req, res) => {
    const role = String(req.query?.role || "SUPER_ADMIN");
    const status = String(req.query?.status || "ALL");
    const proofType = String(req.query?.proofType || "ALL");
    const limit = Math.max(1, Math.min(50, Number(req.query?.limit || 12) || 12));
    const items = await listOperationVerificationRecords(role, { status, proofType });
    const rows = items.slice(0, limit).map((item) => {
      const meta = getOperationVerificationCheckMeta(item.roleId, item.checkId);
      return {
        roleId: item.roleId,
        checkId: item.checkId,
        checkTitle: meta?.title || item.checkId,
        status: item.status,
        proofType: item.proofType,
        note: item.note,
        evidenceRef: item.evidenceRef,
        updatedAt: item.updatedAt,
        updatedByEmail: item.updatedByEmail,
      };
    });
    return res.json({ items: rows, count: rows.length, roleId: role, exportKey: `operation-verification:${role}` });
  });

  r.get("/status-options", async (_req, res) => {
    return res.json({ items: OPERATION_VERIFICATION_STATUSES });
  });

  r.get("/proof-options", async (_req, res) => {
    return res.json({ items: OPERATION_VERIFICATION_PROOF_TYPES });
  });

  r.post("/records/upsert", requireStepUpWrite("SUPER_ADMIN"), async (req, res) => {
    try {
      const item = await upsertOperationVerificationRecord(req.body || {}, req.user || null);
      const records = await readOperationVerificationRecords();
      const surface = buildOperationVerificationRoleSurface(item.roleId, records);
      return res.json({ ok: true, item, surface });
    } catch (error) {
      return res.status(400).json({ ok: false, message: error?.message || "Kayıt kaydedilemedi" });
    }
  });

  return r;
}
