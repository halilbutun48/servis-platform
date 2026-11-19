import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const panelSource = fs.readFileSync(path.join(directory, "CompanyInvoicePaymentPanel.jsx"), "utf8");
const apiSource = fs.readFileSync(path.join(directory, "../api.js"), "utf8");
const previewSource = fs.readFileSync(path.join(directory, "../panels/shared/FinancialOperationsCompanyPreview.jsx"), "utf8");
const reconciliationSource = fs.readFileSync(path.join(directory, "ReconciliationPreviewCard.jsx"), "utf8");

test("COMPANY ödeme yüzeyi tek fatura kimliğine bağlı ve ROOM onayını ayrı gösterir", () => {
  assert.match(apiSource, /company\/financial-operations\/invoices/);
  assert.match(panelSource, /getCompanyInvoicePaymentSummary/);
  assert.match(panelSource, /createCompanyPaymentDeclarationDraft/);
  assert.match(panelSource, /PENDING_ROOM_CONFIRMATION/);
  assert.match(panelSource, /ROOM onayı olmadan.*banka doğrulaması değildir/s);
  assert.match(previewSource, /<CompanyInvoicePaymentPanel/);
  assert.match(previewSource, /invoiceId=\{item\?\.invoice\?\.id\}/);
});

test("COMPANY finans önizlemesi seçili sözleşmeye bağlı fatura özetini ekrana taşır", () => {
  assert.match(previewSource, /companyInvoicePayment/);
  assert.match(previewSource, /historicalInvoiceIds/);
  assert.match(previewSource, /CompanyInvoicePaymentPanel/);
});

test("COMPANY kabul edilmiş fatura ekranında ödeme beyanı panelini görür", () => {
  assert.match(reconciliationSource, /CompanyInvoicePaymentPanel/);
  assert.match(reconciliationSource, /role.*COMPANY|COMPANY.*role/s);
  assert.match(reconciliationSource, /invoiceId/);
});

test("COMPANY paneli TEST_SIMULATED kaynağını kullanıcıya ayırt edilebilir gösterir", () => {
  assert.match(panelSource, /company-invoice-source-label/);
  assert.match(panelSource, /sourceLabel/);
});
