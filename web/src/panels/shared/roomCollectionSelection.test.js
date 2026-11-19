import test from "node:test";
import assert from "node:assert/strict";
import { invoiceLineageLabel, normalizeRoomCollectionOptions, roomCollectionCustomers, roomCollectionInvoicesForCustomer } from "./roomCollectionSelection.js";

test("room collection selection helper exposes stable customer and invoice keys", () => {
  const options = normalizeRoomCollectionOptions([
    { companyId: 3, customerLabel: "DemoCompany", invoiceId: 4, agreementId: 9, hakedisId: 4 },
    { companyId: 8, customerLabel: "Başka Firma", invoiceId: 11, agreementId: 15, hakedisId: 12 },
  ]);
  assert.deepEqual(roomCollectionCustomers(options), [
    { key: "company:3", label: "DemoCompany" },
    { key: "company:8", label: "Başka Firma" },
  ]);
  assert.deepEqual(roomCollectionInvoicesForCustomer(options, "company:8").map((option) => option.invoiceId), [11]);
});

test("missing offer lineage is explicit rather than fabricated", () => {
  assert.equal(invoiceLineageLabel({ offerLineageStatus: "NOT_PROVEN" }), "Teklif bağlantısı doğrulanamadı; tahsilat seçilen faturaya kaydedilir.");
  assert.equal(invoiceLineageLabel({ offerLineageStatus: "AMBIGUOUS" }), "Birden fazla teklif adayı bulundu; tahsilat seçilen faturaya kaydedilir.");
});
