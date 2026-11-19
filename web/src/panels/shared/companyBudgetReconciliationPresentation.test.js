import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCompanyReconciliationRiskPresentation } from "./financeRiskPresentation.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

test("COMPANY gerçekleşme kanıtı yoksa gri ve belirsizdir", () => {
  const result = buildCompanyReconciliationRiskPresentation({ status: "EVIDENCE_MISSING" });

  assert.equal(result.status, "GRAY");
  assert.equal(result.label, "Finansal kanıt eksik");
});

test("eşleşen hakediş ve fatura yeşil, doğrulanmamış ödeme turuncudur", () => {
  assert.equal(buildCompanyReconciliationRiskPresentation({ status: "MATCHED" }).status, "GREEN");
  assert.equal(buildCompanyReconciliationRiskPresentation({ status: "PAYMENT_UNPROVEN" }).status, "ORANGE");
});

test("fatura/hakediş uyuşmazlığı kırmızı risk olarak kalır", () => {
  const result = buildCompanyReconciliationRiskPresentation({ status: "UNDER_INVOICED" });

  assert.equal(result.status, "RED");
  assert.equal(result.label, "Finans kayıtları uyuşmuyor");
});

test("COMPANY bütçe ekranı gerçekleşen hizmet kanıt kartını bağlar", () => {
  const source = fs.readFileSync(path.join(currentDir, "FinancialOperationsCompanyPreview.jsx"), "utf8");
  const cardSource = fs.readFileSync(path.join(currentDir, "CompanyBudgetReconciliationCard.jsx"), "utf8");
  assert.match(source, /CompanyBudgetReconciliationCard/);
  assert.match(cardSource, /financialEvidence/);
  assert.match(cardSource, /Gerçekleşen hizmet/);
  assert.match(cardSource, /Hakediş/);
  assert.match(cardSource, /Fatura/);
  assert.match(cardSource, /Ödenen/);
  assert.match(cardSource, /Tahsilat tarihi/);
});
