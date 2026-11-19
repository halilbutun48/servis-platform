import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import {
  buildInvoiceCollectionSummary,
  cancelCollectionDraft,
  confirmCollectionDraft,
  createCompanyPaymentDeclarationDraft,
  createCollectionDraft,
  reverseConfirmedCollection,
} from "../services/invoiceCollectionLedger.js";
import { prisma } from "../prisma.js";

const draftSchema = z.object({
  amountMinor: z.number().int().positive(),
  currencyCode: z.string().trim().length(3),
  collectedAt: z.string().trim().min(10),
  paymentMethod: z.enum(["BANK_TRANSFER", "CASH", "CARD", "OTHER"]),
  sourceRef: z.string().trim().max(240).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  idempotencyKey: z.string().trim().min(1).max(160),
});

const reverseSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(160),
  reason: z.string().trim().max(500).optional().nullable(),
});

function invoiceIdFrom(req) {
  const value = Number(req.params.invoiceId || 0);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function collectionIdFrom(req) {
  const value = Number(req.params.collectionId || 0);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

export function attachInvoiceCollectionRoutes(r) {
  const roomRead = [authRequired(), requireRole("ROOM")];
  const roomWrite = [authRequired(), requireRole("ROOM")];
  const companyRead = [authRequired(), requireRole("COMPANY")];
  const companyWrite = [authRequired(), requireRole("COMPANY"), requireStepUpWrite("COMPANY")];

  r.get(
    "/room/financial-operations/invoices/:invoiceId/collections",
    ...roomRead,
    asyncHandler(async (req, res) => {
      const invoiceId = invoiceIdFrom(req);
      if (!invoiceId) return res.status(404).json({ ok: false, error: "INVOICE_NOT_FOUND" });
      const summary = await buildInvoiceCollectionSummary({
        prisma,
        actor: req.user,
        invoiceId,
      });
      return res.json({ ok: true, ...summary });
    }),
  );

  r.get(
    "/company/financial-operations/invoices/:invoiceId/collections",
    ...companyRead,
    asyncHandler(async (req, res) => {
      const invoiceId = invoiceIdFrom(req);
      if (!invoiceId) return res.status(404).json({ ok: false, error: "INVOICE_NOT_FOUND" });
      const summary = await buildInvoiceCollectionSummary({
        prisma,
        actor: req.user,
        invoiceId,
      });
      return res.json({ ok: true, ...summary });
    }),
  );

  r.post(
    "/room/financial-operations/invoices/:invoiceId/collections/drafts",
    ...roomWrite,
    asyncHandler(async (req, res) => {
      const invoiceId = invoiceIdFrom(req);
      const parsed = draftSchema.safeParse(req.body || {});
      if (!invoiceId) return res.status(404).json({ ok: false, error: "INVOICE_NOT_FOUND" });
      if (!parsed.success) return res.status(400).json({ ok: false, error: "INVALID_COLLECTION_DRAFT", issues: parsed.error.issues });
      const item = await createCollectionDraft({
        prisma,
        actor: req.user,
        invoiceId,
        ...parsed.data,
      });
      return res.status(item.idempotentReplay ? 200 : 201).json({ ok: true, item });
    }),
  );

  r.post(
    "/company/financial-operations/invoices/:invoiceId/collections/drafts",
    ...companyWrite,
    asyncHandler(async (req, res) => {
      const invoiceId = invoiceIdFrom(req);
      const parsed = draftSchema.safeParse(req.body || {});
      if (!invoiceId) return res.status(404).json({ ok: false, error: "INVOICE_NOT_FOUND" });
      if (!parsed.success) return res.status(400).json({ ok: false, error: "INVALID_PAYMENT_DECLARATION", issues: parsed.error.issues });
      const item = await createCompanyPaymentDeclarationDraft({
        prisma,
        actor: req.user,
        invoiceId,
        ...parsed.data,
      });
      return res.status(item.idempotentReplay ? 200 : 201).json({ ok: true, item });
    }),
  );

  r.post(
    "/room/financial-operations/collections/:collectionId/confirm",
    ...roomWrite,
    asyncHandler(async (req, res) => {
      const item = await confirmCollectionDraft({
        prisma,
        actor: req.user,
        collectionId: collectionIdFrom(req),
      });
      return res.json({ ok: true, item });
    }),
  );

  r.post(
    "/room/financial-operations/collections/:collectionId/cancel",
    ...roomWrite,
    asyncHandler(async (req, res) => {
      const item = await cancelCollectionDraft({
        prisma,
        actor: req.user,
        collectionId: collectionIdFrom(req),
        reason: req.body?.reason,
      });
      return res.json({ ok: true, item });
    }),
  );

  r.post(
    "/room/financial-operations/collections/:collectionId/reverse",
    ...roomWrite,
    asyncHandler(async (req, res) => {
      const parsed = reverseSchema.safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json({ ok: false, error: "INVALID_COLLECTION_REVERSAL", issues: parsed.error.issues });
      const item = await reverseConfirmedCollection({
        prisma,
        actor: req.user,
        collectionId: collectionIdFrom(req),
        ...parsed.data,
      });
      return res.json({ ok: true, item });
    }),
  );

  return r;
}
