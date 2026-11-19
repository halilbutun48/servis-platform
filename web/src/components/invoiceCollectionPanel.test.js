import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(directory, "InvoiceCollectionPanel.jsx"), "utf8");
const overviewSource = fs.readFileSync(path.join(directory, "../panels/shared/FinancialOverviewSummaryView.jsx"), "utf8");

test("ROOM tahsilat paneli müşteri ve fatura seçimini aynı mevcut motorla yönetir", () => {
  assert.match(source, /invoiceOptions/);
  assert.match(source, /invoice-collection-company/);
  assert.match(source, /invoice-collection-invoice/);
  assert.match(source, /invoice-collection-financial-summary/);
  assert.match(source, /invoiceLineageLabel/);
  assert.match(overviewSource, /invoiceOptions=\{collectionInvoiceLinks\}/);
  assert.match(source, /onSelectionChange/);
  assert.match(overviewSource, /selectedInvoiceId: selectedCollectionInvoice/);
});

test("fatura seçimi sözleşme ve hakediş bilgisini kullanıcıya yeniden yazdırmaz", () => {
  assert.match(source, /Sözleşme/);
  assert.match(source, /Hakediş/);
  assert.match(source, /invoiceLineageLabel/);
  assert.doesNotMatch(source, /name="agreementId"/);
  assert.doesNotMatch(source, /name="hakedisId"/);
});

test("tahsilat paneli mevcut taslak ve açık onay güvenliğini korur", () => {
  assert.match(source, /createInvoiceCollectionDraft/);
  assert.match(source, /confirmInvoiceCollectionDraft/);
  assert.match(source, /Açık ONAYLA/);
  assert.match(source, /Manuel tahsilat kaydı · banka tarafından doğrulanmış ödeme bağlantısı yok/);
});

test("tahsilat paneli kalan alacağı aşan tutarı taslak oluşturmadan reddeder", () => {
  assert.match(source, /Tahsilat tutarı kalan alacaktan fazla olamaz/);
  assert.match(source, /pendingDraftMinor/);
  assert.match(source, /receivableAmountMinor/);
});
