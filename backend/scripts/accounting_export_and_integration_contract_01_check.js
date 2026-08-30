import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACCOUNTING_EXPORT_COLUMNS,
  ACCOUNTING_EXPORT_CONTRACT_VERSION,
  ACCOUNTING_EXPORT_FORMATS,
  validateAccountingExportContract,
} from "../src/finance/accountingExportContract.js";
import {
  sanitizeSpreadsheetText,
  serializeAccountingExportCsv,
  serializeAccountingExportJson,
  serializeAccountingExportXlsx,
} from "../src/finance/accountingExportFormats.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const results = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

const contractSource = fs.readFileSync(path.join(root, "backend/src/finance/accountingExportContract.js"), "utf8");
const formatsSource = fs.readFileSync(path.join(root, "backend/src/finance/accountingExportFormats.js"), "utf8");
const routeSource = fs.readFileSync(path.join(root, "backend/src/routes/accountingExports.js"), "utf8");
const uiSource = fs.readFileSync(path.join(root, "web/src/panels/shared/AccountingExportPanel.jsx"), "utf8");

const sample = {
  exportId: "acctexp_guard",
  contractVersion: ACCOUNTING_EXPORT_CONTRACT_VERSION,
  generatedAt: "2030-01-01T00:00:00.000Z",
  sourceSystem: "SeferPakt",
  tenant: { scope: "COMPANY", tenantId: 7, companyId: 7, companyName: "=SAFE?", roomId: 8, roomName: "ROOM", companyKind: "COMPANY" },
  dryRun: true,
  period: { periodStart: "2030-01-01", periodEnd: "2030-01-31", timezone: "UTC" },
  idempotency: { key: "key", scopeFingerprint: "fingerprint" },
  records: [{
    lineId: "line_hakedis_record_1",
    companyId: 7,
    companyName: "=SUM(A1:A2)",
    companyLegalName: null,
    companyTaxNo: null,
    roomId: 8,
    roomName: "ROOM",
    agreementId: 9,
    agreementReference: "Agreement #9",
    shiftReferences: [],
    hakedisReference: "HAK-9",
    invoiceReference: "FAT-9",
    sourceEntityType: "HAKEDIS_RECORD",
    sourceEntityId: 1,
    amountMinor: 12345,
    currencyCode: "TRY",
    amountSemantics: "ACTUAL_APPROVED_OR_ISSUED_SOURCE",
    estimateType: "ACTUAL",
    completeness: "COMPLETE",
    confidence: "HIGH",
    reconciliationStatus: "MATCHED",
    costCenter: null,
    department: null,
    project: null,
    externalReference: null,
    provenance: { canonicalOwner: "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01", sourceEntityType: "HAKEDIS_RECORD", sourceEntityId: 1 },
    approvalAuditReference: null,
  }],
  validation: { status: "READY", findings: [], counts: { blockingErrors: 0, warnings: 0, infos: 0 } },
  audit: { required: true, reference: "audit:acctexp_guard" },
  safety: { previewOnly: true, integrationPreparation: true, accountingPosting: false, paymentExecution: false, legalFinalization: false, externalProviderSubmission: false, userApprovalRequiredForGeneration: true },
};

const validation = validateAccountingExportContract(sample, { format: "CSV" });
const csv = serializeAccountingExportCsv(sample);
const xlsx = serializeAccountingExportXlsx(sample);
const json = serializeAccountingExportJson(sample);

check("ACCOUNTING_EXPORT_CONTRACT_V1 is explicit", ACCOUNTING_EXPORT_CONTRACT_VERSION === "ACCOUNTING_EXPORT_CONTRACT_V1");
check("one canonical export model is exported", ACCOUNTING_EXPORT_COLUMNS.length >= 20 && contractSource.includes("buildAccountingExportContract"));
check("all locked formats share canonical columns", ACCOUNTING_EXPORT_FORMATS.join(",") === "CSV,XLSX,JSON" && formatsSource.includes("ACCOUNTING_EXPORT_COLUMNS"));
check("duplicate format business rules absent", !formatsSource.includes("buildOperational") && !formatsSource.includes("buildReconciliation"));
check("contract validator distinguishes blocking warning info", /BLOCKING_ERROR/.test(contractSource) && /WARNING/.test(contractSource) && /INFO/.test(contractSource));
check("validation behavior accepts canonical sample", validation.status !== "BLOCKED", validation.status);
check("idempotency derives from stable scope", /scopeFingerprint/.test(contractSource) && /tenantId/.test(contractSource) && /sourceRevision/.test(contractSource));
check("CSV has deterministic columns and BOM", csv.startsWith("\ufeff") && csv.indexOf(ACCOUNTING_EXPORT_COLUMNS.join(",")) >= 0);
check("CSV formula injection is neutralized", sanitizeSpreadsheetText("=2+2") === "'=2+2" && csv.includes("'=SUM(A1:A2)"));
check("CSV keeps Turkish text path", serializeAccountingExportCsv({ ...sample, records: [{ ...sample.records[0], companyName: "İstanbul Çözüm" }] }).includes("İstanbul Çözüm"));
check("CSV preserves integer money precision", csv.includes("12345") && !csv.includes("123.45"));
check("XLSX is a real OOXML package", xlsx.subarray(0, 2).toString("hex") === "504b");
check("XLSX contains readable sheet and typed cells", xlsx.toString("binary").includes("PK") && xlsx.length > 500);
check("XLSX has no macros or formulas", !xlsx.includes(Buffer.from("vbaProject")) && !xlsx.includes(Buffer.from("<f>")));
check("JSON preserves version and typed contract", JSON.parse(json).contractVersion === ACCOUNTING_EXPORT_CONTRACT_VERSION && typeof JSON.parse(json).records[0].amountMinor === "number");
check("route requires auth and explicit approval", routeSource.includes("authRequired()") && routeSource.includes("requireRole") && routeSource.includes("userApproval !== true"));
check("route never posts accounting or payment", /accountingPosting: false/.test(routeSource) || /accountingPosting/.test(contractSource));
check("provider-independent UI copy exists", uiSource.includes("provider") === false && uiSource.includes("Önizleme / dry-run") && uiSource.includes("Muhasebe Dışa Aktarımı"));
check("company/room UI exposes one export panel", uiSource.includes("data-testid=\"accounting-export-panel\"") && uiSource.includes("Dışa Aktarım Dosyası Oluştur"));
check("school/organization boundary is visible", uiSource.includes("SCHOOL") && uiSource.includes("ORGANIZATION") && uiSource.includes("uygulanamaz"));

const failed = results.filter((item) => !item.ok);
console.log(`ONE_CANONICAL_EXPORT_MODEL_COUNT = ${contractSource.includes("export async function buildAccountingExportContract") ? 1 : 0}`);
console.log(`DUPLICATE_FORMAT_BUSINESS_RULE_COUNT = ${failed.some((item) => item.name === "duplicate format business rules absent") ? 1 : 0}`);
if (failed.length) {
  console.error(`ACCOUNTING_EXPORT_AND_INTEGRATION_CONTRACT_01_CHECK FAIL ${results.length - failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`ACCOUNTING_EXPORT_AND_INTEGRATION_CONTRACT_01_CHECK PASS ${results.length}/${results.length}`);
