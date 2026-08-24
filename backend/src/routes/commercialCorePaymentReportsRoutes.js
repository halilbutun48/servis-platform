import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { buildKvkkExportAuditMeta } from "../kvkk/retention.js";
import {
  listCommercialSources,
  listSettlementOperationQueue,
} from "../services/paymentBackbone.js";
import {
  buildPaymentPreviewSummary,
  buildPaymentPreviewCsvRows,
  normalizePaymentPreviewBucket,
} from "../ops/paymentPreview.js";
import {
  paymentPreviewTake,
  toCommercialSourceCsvRow,
  parseCommercialSourceQuery,
  parseSettlementLedgerExportQuery,
  settlementLedgerExportColumns,
  buildSettlementLedgerCsvRow,
  listSettlementLedgerExportRows,
} from "./commercialCoreRouteData.js";

async function auditCommercialCoreWrite(req, action, entity, entityId, meta = {}) {
  return audit(req, { action, entity, entityId: entityId ?? null, meta });
}

export function attachCommercialCorePaymentSourceReportRoutes(r) {
  r.get(
    "/payment-backbone/sources",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const query = parseCommercialSourceQuery(req.query, {
        take: req.query?.take ?? 20,
      });

      const items = await listCommercialSources(query);

      return res.json({
        ok: true,
        items,
        summary: {
          total: items.length,
          sourceType: query.sourceType || query.type || "ALL",
          paymentMode: query.paymentMode || "ALL",
          settlementStatus: query.settlementStatus || "ALL",
        },
      });
    }
  );

  r.get(
    "/payment-backbone/sources/export.csv",
    authRequired(),
    requireStepUpWrite("SUPER_ADMIN"),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const query = parseCommercialSourceQuery(req.query, {
        take: 1000,
      });

      const items = await listCommercialSources(query);

      await audit(req, {
        action: "PAYMENT_BACKBONE_EXPORT",
        entity: "CommercialSource",
        meta: buildKvkkExportAuditMeta({
          endpoint:
            "/api/commercial-core/payment-backbone/sources/export.csv",
          kind: "payment_backbone_sources",
          format: "csv",
          take: query.take,
          rowCount: items.length,
          reason: "Commercial source / settlement export",
          filters: {
            type: query.type || null,
            sourceType: query.sourceType || null,
            companyId: query.companyId || null,
            roomId: query.roomId || null,
            paymentMode: query.paymentMode || null,
            settlementStatus: query.settlementStatus || null,
            q: query.q || null,
            from: query.from || null,
            to: query.to || null,
          },
        }),
      });

      const stamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="payment_sources_${stamp}.csv"`
      );
      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      const header = [
        "id",
        "sourceType",
        "sourceKey",
        "companyId",
        "companyName",
        "roomId",
        "roomName",
        "agreementId",
        "shiftRootId",
        "shiftGroupKey",
        "paymentMode",
        "commissionBps",
        "settlementStatus",
        "providerAdapterKey",
        "amountCompany",
        "amountProvider",
        "currencyCode",
        "createdAt",
        "updatedAt",
      ].join(",");

      const body = items
        .map((item) => toCommercialSourceCsvRow(item))
        .join("\n");

      return res.send(`${header}\n${body}\n`);
    }
  );

  r.get(
    "/payment-backbone/settlement/ledger/export.csv",
    authRequired(),
    requireStepUpWrite("SUPER_ADMIN"),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const query = parseSettlementLedgerExportQuery(req.query, {
        take: 1000,
      });

      const items = await listSettlementLedgerExportRows(query);

      await auditCommercialCoreWrite(
        req,
        "PAYMENT_LEDGER_EXPORT",
        "SettlementEntry",
        null,
        {
          endpoint:
            "/api/commercial-core/payment-backbone/settlement/ledger/export.csv",
          kind: "settlement_ledger",
          format: "csv",
          take: query.take,
          rowCount: items.length,
          reason: "Settlement ledger export",
          filters: {
            type: query.type || null,
            sourceType: query.sourceType || null,
            companyId: query.companyId || null,
            roomId: query.roomId || null,
            paymentMode: query.paymentMode || null,
            settlementStatus: query.settlementStatus || null,
            entryStatus: query.entryStatus || null,
            entryType: query.entryType || null,
            reconciliationStatus:
              query.reconciliationStatus || null,
            q: query.q || null,
            from: query.from || null,
            to: query.to || null,
          },
        }
      );

      const stamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="settlement_ledger_${stamp}.csv"`
      );

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      const header = settlementLedgerExportColumns.join(",");

      const body = items
        .map((item) => buildSettlementLedgerCsvRow(item))
        .join("\n");

      return res.send(`${header}\n${body}\n`);
    }
  );

  return r;
}

export function attachCommercialCorePaymentReadinessPreviewRoutes(r) {
  r.get("/payment-backbone/readiness/preview",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (_req, res) => {
      const queueRows = await listSettlementOperationQueue({
        take: paymentPreviewTake,
      });

      const sourceRows = queueRows.length
        ? queueRows
        : await listCommercialSources({
            take: paymentPreviewTake,
          });

      const sourceLabel = queueRows.length
        ? "hakediş kuyruğu"
        : "ticari omurga";

      return res.json(
        buildPaymentPreviewSummary(sourceRows, sourceLabel)
      );
    }
  );

  r.get("/payment-backbone/readiness/preview.csv",
    authRequired(),
    requireRole("SUPER_ADMIN"),
    async (req, res) => {
      const bucket = normalizePaymentPreviewBucket(
        req.query?.bucket
      );

      const queueRows = await listSettlementOperationQueue({
        take: paymentPreviewTake,
      });

      const sourceRows = queueRows.length
        ? queueRows
        : await listCommercialSources({
            take: paymentPreviewTake,
          });

      const sourceLabel = queueRows.length
        ? "hakediş kuyruğu"
        : "ticari omurga";

      const summary = buildPaymentPreviewSummary(
        sourceRows,
        sourceLabel
      );

      const visibleItems =
        bucket === "ALL"
          ? summary.items
          : summary.items.filter(
              (item) =>
                String(item?.status || "").toUpperCase() ===
                bucket
            );

      const csvRows = buildPaymentPreviewCsvRows(
        visibleItems
      );

      await audit(req, {
        action: "PAYMENT_PREVIEW_EXPORT",
        entity: "PaymentPreview",
        meta: buildKvkkExportAuditMeta({
          endpoint:
            "/api/commercial-core/payment-backbone/readiness/preview.csv",
          kind: "payment_backbone_preview_csv",
          format: "csv",
          rowCount: csvRows.length,
          reason: "Readonly payment preview export",
          filters: {
            bucket,
          },
        }),
      });

      const stamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="payment_preview_${stamp}.csv"`
      );

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      const header = [
        "durum",
        "ilgili_kayit",
        "sozlesme_veya_vardiya",
        "komisyon_durumu",
        "odeme_hesabi_durumu",
        "kontrol_notu",
        "taslak_tutar",
      ].join(",");

      return res.send(
        `\ufeff${header}\n${csvRows.join("\n")}\n`
      );
    }
  );

  return r;
}
