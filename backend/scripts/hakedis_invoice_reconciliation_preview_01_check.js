import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReconciliationPreview, HAKEDIS_INVOICE_RECONCILIATION_VERSION } from "../src/finance/hakedisInvoiceReconciliation.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

let passed = 0;
let failed = 0;

function must(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
    return;
  }
  passed += 1;
  console.log(`PASS ${message}`);
}

const agreement = {
  id: 301,
  companyId: 1,
  roomId: 1,
  startDate: "2030-01-01",
  endDate: "2030-01-31",
  status: "ACTIVE",
  companyOfferAmount: 120000,
  roomOfferAmount: 100000,
};

const completedOperation = [{ id: 9001, status: "DONE", completed: true, startAt: "2030-01-10T08:00:00.000Z" }];
const hakedis = [{ id: 7001, reference: "HAK-301-01", amountMinor: 100000, currencyCode: "TRY", status: "READY", source: "INTERNAL_ACTUAL", periodStart: "2030-01-01", periodEnd: "2030-01-31" }];
const invoice = [{ id: 8001, reference: "FAT-301-01", amountMinor: 100000, currencyCode: "TRY", status: "ISSUED", source: "INTERNAL_ACTUAL", periodStart: "2030-01-01", periodEnd: "2030-01-31" }];

const matching = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: invoice });
must(matching.data.status === "MATCHED", "eşleşen kayıtlar uyumlu sonucu verir");
must(matching.data.difference.amountMinor === 0 && matching.data.difference.direction === "NONE", "eşleşen kayıt farkı sıfırdır");
must(matching.data.evidence.operations.shiftIds.includes("9001"), "operasyon kanıtı vardiya kimliğiyle izlenir");
must(matching.data.expectedAmount.source === "HAKEDIS_RECORD", "beklenen tutar hakediş kaynağını taşır");
must(matching.data.previewOnly === true && matching.data.calculationVersion === HAKEDIS_INVOICE_RECONCILIATION_VERSION, "sonuç salt önizleme ve sürümlüdür");

const under = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: [{ ...invoice[0], amountMinor: 90000 }] });
must(under.data.status === "UNDER_INVOICED", "düşük fatura eksik faturalandırma olarak sınıflanır");
must(under.data.difference.amountMinor === -10000 && under.data.difference.direction === "INVOICE_UNDER", "düşük fatura fark yönü ve tutarı korunur");

const over = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: [{ ...invoice[0], amountMinor: 110000 }] });
must(over.data.status === "OVER_INVOICED", "yüksek fatura fazla faturalandırma olarak sınıflanır");
must(over.data.difference.amountMinor === 10000 && over.data.difference.direction === "INVOICE_OVER", "yüksek fatura fark yönü ve tutarı korunur");

const noAgreement = buildReconciliationPreview({ periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: invoice });
must(noAgreement.data.status === "NO_AGREEMENT", "sözleşmesiz sonuç kesin mutabakat üretmez");
must(noAgreement.data.expectedAmount === null && noAgreement.data.difference.amountMinor === null, "sözleşme yokken tutar uydurulmaz");

const noOperation = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: [], hakedisRecords: hakedis, invoiceRecords: invoice });
must(noOperation.data.status === "NO_OPERATION", "operasyon kanıtı yokluğu açık sınıflanır");
must(noOperation.data.confidence === "LOW" && noOperation.data.nextAction === "Eksik veriyi tamamla", "eksik operasyon verisi düşük güven ve sonraki adımla gösterilir");

const noHakedis = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: [], invoiceRecords: invoice });
must(noHakedis.data.status === "NO_HAKEDIS" && noHakedis.data.expectedAmount === null, "hakediş yokken beklenen tutar sıfırlanmaz");

const noInvoice = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: [] });
must(noInvoice.data.status === "NO_INVOICE" && noInvoice.data.invoice.amountMinor === null, "fatura yokluğu açık sınıflanır");

const partial = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: [{ id: 9002, status: "ACTIVE", completed: false }], hakedisRecords: hakedis, invoiceRecords: invoice });
must(partial.data.status === "PARTIAL_OPERATION_EVIDENCE", "tamamlanmamış operasyon kanıtı kısmi sınıflanır");
must(partial.data.evidence.operations.partialCount === 1, "kısmi operasyon sayısı kanıta yazılır");

const periodMismatch = buildReconciliationPreview({ agreement, periodStart: "2030-02-01", periodEnd: "2030-02-28", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: invoice, hakedisPeriodMismatch: true });
must(periodMismatch.data.status === "PERIOD_MISMATCH", "dönem uyuşmazlığı mutabakatı durdurur");
must(periodMismatch.data.missingData.some((item) => item.code === "PERIOD_MISMATCH"), "dönem uyuşmazlığı eksik veri kanıtı taşır");

const duplicateHakedis = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: [hakedis[0], { ...hakedis[0], id: 7002, reference: "HAK-301-02" }], invoiceRecords: invoice });
must(duplicateHakedis.data.status === "DUPLICATE_HAKEDIS", "çoğul hakediş kaydı güvenli biçimde durur");
must(duplicateHakedis.data.difference.amountMinor === null, "çoğul hakedişte fark hesaplanmaz");

const duplicateInvoice = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: [invoice[0], { ...invoice[0], id: 8002, reference: "FAT-301-02" }] });
must(duplicateInvoice.data.status === "DUPLICATE_INVOICE", "çoğul fatura kaydı güvenli biçimde durur");

const currencyMismatch = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: [{ ...invoice[0], currencyCode: "EUR" }] });
must(currencyMismatch.data.status === "CURRENCY_MISMATCH", "para birimi uyuşmazlığı açıkça sınıflanır");

const invalidPeriod = buildReconciliationPreview({ agreement, periodStart: "2030-02-30", periodEnd: "2030-01-01", operations: completedOperation, hakedisRecords: hakedis, invoiceRecords: invoice });
must(invalidPeriod.data.status === "INVALID_PERIOD", "geçersiz tarih aralığı kabul edilmez");

const externalInput = buildReconciliationPreview({
  agreement,
  periodStart: "2030-01-01",
  periodEnd: "2030-01-31",
  operations: completedOperation,
  hakedisRecords: hakedis,
  invoiceRecords: invoice,
  externalReference: { dataClass: "EXTERNAL_REFERENCE", valueMinor: 999999999 },
});
must(externalInput.data.expectedAmount.amountMinor === 100000 && externalInput.data.invoice.amountMinor === 100000, "dış referans mevcut tutarları değiştiremez");
must(externalInput.data.externalReferenceUsedForTruth === false, "dış referans mutabakat gerçeğine yükseltilmez");

const demoInput = buildReconciliationPreview({
  agreement,
  periodStart: "2030-01-01",
  periodEnd: "2030-01-31",
  operations: completedOperation,
  hakedisRecords: [{ ...hakedis[0], source: "DEMO_FIXTURE", amountMinor: 777777 }],
  invoiceRecords: [{ ...invoice[0], source: "DEMO_FIXTURE", amountMinor: 777777 }],
});
must(demoInput.data.demoFixtureUsedForTruth === false, "demo fixture provenance mutabakat dışı tutulur");
must(demoInput.data.status === "REVIEW_REQUIRED" && demoInput.data.expectedAmount === null && demoInput.data.difference.amountMinor === null, "demo fixture tutarları mutabakat gerçeği olarak kullanılmaz");
must(demoInput.data.safety.paymentExecution === false && demoInput.data.safety.accountingPosting === false, "önizleme ödeme ve muhasebe yazımı çalıştırmaz");

const externalRecordInput = buildReconciliationPreview({
  agreement,
  periodStart: "2030-01-01",
  periodEnd: "2030-01-31",
  operations: completedOperation,
  hakedisRecords: [{ ...hakedis[0], source: "EXTERNAL_REFERENCE", amountMinor: 888888 }],
  invoiceRecords: invoice,
});
must(externalRecordInput.data.status === "REVIEW_REQUIRED" && externalRecordInput.data.expectedAmount === null && externalRecordInput.data.difference.amountMinor === null, "dış referans kaydı mutabakat gerçeği olamaz");
must(externalRecordInput.data.missingData.some((item) => item.code === "NON_AUTHORITATIVE_DATA"), "dış referans kaydı eksik otorite kanıtıyla işaretlenir");

const zero = buildReconciliationPreview({ agreement, periodStart: "2030-01-01", periodEnd: "2030-01-31", operations: completedOperation, hakedisRecords: [{ ...hakedis[0], amountMinor: 0 }], invoiceRecords: [{ ...invoice[0], amountMinor: 0 }] });
must(zero.data.status === "MATCHED" && zero.data.difference.amountMinor === 0, "sıfır tutar deterministik eşleşir");
must(Array.isArray(matching.data.reasons) && matching.data.reasons.length > 0, "uyum gerekçesi açıklanır");
must(matching.data.evidence.hakedis.reference === "HAK-301-01" && matching.data.evidence.invoice.reference === "FAT-301-01", "hakediş ve fatura referansları izlenir");

const entryCard = readRepoFile("web/src/components/HakedisReconciliationEntryCard.jsx");
const companyCommercialFlow = readRepoFile("web/src/panels/company/CommercialFlowPanel.jsx");
const roomCommercialFlow = readRepoFile("web/src/panels/room/CommercialFlowPanel.jsx");
must(entryCard.includes("ReconciliationPreviewCard"), "mutabakat giriş kartı canonical önizlemeyi yeniden kullanır");
must(entryCard.includes("Henüz mutabakat yapılabilecek sözleşme bulunmuyor."), "mutabakat giriş kartı kanıtsız durumda boş durumu gösterir");
must(entryCard.includes("Sözleşmeleri aç") && entryCard.includes("Mutabakatı incele"), "mutabakat giriş kartı güvenli ana aksiyonu gösterir");
must(!entryCard.includes("amountMinor") && !entryCard.includes("/ 100"), "mutabakat giriş kartı hesaplama çoğaltmaz");
must(companyCommercialFlow.includes("HakedisReconciliationEntryCard") && companyCommercialFlow.includes("getCompanyAgreements"), "COMPANY Ticari Akış mutabakat girişini tenant-scope sözleşmelerle bağlar");
must(roomCommercialFlow.includes("HakedisReconciliationEntryCard") && roomCommercialFlow.includes("loadRoomAgreementRows"), "ROOM Ticari Akış mutabakat girişini tenant-scope sözleşmelerle bağlar");
must(roomCommercialFlow.includes('label: "Ödeme Hazırlığı"') && !roomCommercialFlow.includes('label: "Ödeme & Komisyon"'), "ROOM legacy ödeme/komisyon etiketi hazırlık semantiğiyle netleştirilir");

if (failed > 0) {
  console.error(`HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01 FAIL ${passed}/${passed + failed}`);
  process.exit(1);
}
console.log(`HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01 PASS ${passed}/${passed}`);
