import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCompanyFinancialCopilotSelection } from "./financialOperationsCopilot.js";
import { readCompanyFinancialFocusFromHash } from "./companyFinancialFocus.js";
import {
  buyerFinanceSurfaceSubtitle,
  buyerFinanceSurfaceTitle,
  buyerRoleLabel,
} from "./financialOperationsPresentation.js";

const currentFile = fileURLToPath(import.meta.url);
const directory = path.dirname(currentFile);
const previewSource = fs.readFileSync(path.join(directory, "FinancialOperationsCompanyPreview.jsx"), "utf8");
const panelSource = fs.readFileSync(path.join(directory, "FinancialOperationsPanel.jsx"), "utf8");

test("COMPANY bütçe kartı aynı tenant plan listesini Türkçe seçim olarak sunar", () => {
  assert.match(previewSource, /budgetPlan\.items/);
  assert.match(previewSource, /Bütçe planını seç/);
  assert.match(previewSource, /budgetPlanItems\.length\s*>\s*1/);
  assert.match(previewSource, /budgetPlanItems\.map/);
});

test("COMPANY bütçe seçimi plan kimliği ve sürümüyle aynı önizlemeyi yeniler", () => {
  assert.match(panelSource, /onBudgetPlanSelect/);
  assert.match(panelSource, /companyPlanFormFromPlan\(selectedPlan\)/);
  assert.match(panelSource, /budgetPlanId/);
  assert.match(panelSource, /budgetPlanVersion/);
});

test("ROOM dalı COMPANY bütçe planı seçim callback'ini kullanmaz", () => {
  const companyBranchStart = panelSource.indexOf('if (scope === "COMPANY")');
  assert.ok(companyBranchStart >= 0);
  const companyBranch = panelSource.slice(companyBranchStart);
  assert.match(companyBranch, /<FinancialOperationsCompanyPreview/);
  assert.match(companyBranch, /onBudgetPlanSelect=/);
  assert.equal(panelSource.slice(0, companyBranchStart).includes("onBudgetPlanSelect"), false);
});

test("COMPANY Sefer Abi bağlamı seçili bütçe planının taahhüt özetini taşır", () => {
  const selection = buildCompanyFinancialCopilotSelection({
    financeView: "company-budget",
    preview: {
      budgetPlan: {
        current: {
          id: 3,
          version: 9,
          status: "DRAFT",
          budgetAmountMinor: 300000,
          currencyCode: "TRY",
          periodStart: "2026-11-01",
          periodEnd: "2026-11-30",
          agreementIds: [207],
        },
        items: [],
      },
      commitmentSummary: {
        status: "complete",
        committedAmountMinor: 1500000,
        remainingBudgetMinor: -1200000,
        commitmentCount: 1,
      },
    },
  });

  assert.equal(selection.scopeKey, "/company/financial-operations");
  assert.equal(selection.facts.selectedBudgetPlanId, 3);
  assert.equal(selection.facts.selectedAgreementIds[0], 207);
  assert.equal(selection.facts.committedAmountMinor, 1500000);
  assert.equal(selection.facts.remainingBudgetMinor, -1200000);
  assert.match(selection.facts.copilotSummary, /Bütçe #3|Bütçe planı #3/iu);
});

test("finans bağlamı shell seçimi sıfırladıktan sonra Sefer Abi'ye yeniden yayımlanır", () => {
  const publishEffectStart = panelSource.indexOf("const timer = typeof window !== \"undefined\"");
  const publishEffectEnd = panelSource.indexOf("return () => {", publishEffectStart);
  assert.ok(publishEffectStart >= 0);
  assert.ok(publishEffectEnd > publishEffectStart);
  const publishEffect = panelSource.slice(publishEffectStart, publishEffectEnd);
  assert.match(publishEffect, /window\.setTimeout\(\(\) => \{/);
  assert.match(publishEffect, /setCopilotSelection\(/);
  assert.match(publishEffect, /financialCopilotSelection/);
  assert.match(panelSource, /shell-level drawer resets its auth-scoped selection/i);
});

test("COMPANY bütçe değişiminde seçili plan Sefer Abi bağlamına hemen yazılır", () => {
  assert.match(panelSource, /setCopilotSelection\(buildCompanyFinancialCopilotSelection\(/);
  assert.match(panelSource, /selectedPlan/);
  assert.match(panelSource, /commitmentSummary:\s*null/);
});

test("COMPANY seçili bütçe planını yenileme için yetkili URL bağlamında korur", () => {
  assert.match(panelSource, /budgetPlanId/);
  assert.match(panelSource, /readCompanyBudgetPlanQueryInput/);
  assert.match(panelSource, /window\.location\.hash\s*=.*budgetPlanId/s);
});

test("COMPANY finans URL odağı önizleme isteğinde aynı sözleşme ve vardiyayı korur", () => {
  assert.match(panelSource, /readCompanyFinancialFocusFromHash/);
  assert.match(panelSource, /focusAgreementId/);
  assert.match(panelSource, /focusShiftId/);
  assert.match(panelSource, /getCompanyFinancialOperationsPreview\(token, params/);
});

test("COMPANY finans odağı URL'den yalnızca geçerli sözleşme ve vardiya kimliklerini okur", () => {
  assert.deepEqual(
    readCompanyFinancialFocusFromHash("#/company/financial-operations?focusAgreementId=1&focusShiftId=3"),
    { focusAgreementId: "1", focusShiftId: "3" },
  );
  assert.deepEqual(readCompanyFinancialFocusFromHash("#/company/financial-operations?focusAgreementId=-1&focusShiftId=abc"), {});
});

test("COMPANY finans odağı açık seçili faturayı yenileme için korur", () => {
  assert.deepEqual(
    readCompanyFinancialFocusFromHash("#/company/financial-operations?focusInvoiceId=6&focusAgreementId=14"),
    { focusAgreementId: "14", focusInvoiceId: "6" },
  );
  assert.deepEqual(readCompanyFinancialFocusFromHash("#/company/financial-operations?focusInvoiceId=0"), {});
});

test("COMPANY finansı iki kullanıcı sekmesini görünür ve tek seçimle yönetir", () => {
  assert.match(previewSource, /company-finance-tabs/);
  assert.match(previewSource, /Bütçe ve Servis Giderleri/);
  assert.match(previewSource, /Teklif ve Fiyat Rehberi/);
  assert.match(previewSource, /aria-selected/);
  assert.match(previewSource, /company-finance-budget/);
  assert.match(previewSource, /company-finance-price-guide/);
});

test("ortak alıcı finans yüzeyi okul ve organizasyon bağlamını kullanıcıya doğru adlandırır", () => {
  assert.equal(buyerRoleLabel("COMPANY"), "Hizmet Alan Firma");
  assert.equal(buyerRoleLabel("SCHOOL"), "Okul");
  assert.equal(buyerRoleLabel("ORGANIZATION"), "Organizasyon");
  assert.equal(buyerFinanceSurfaceTitle("SCHOOL"), "Okul Bütçe ve Servis Maliyeti");
  assert.equal(buyerFinanceSurfaceTitle("ORGANIZATION"), "Organizasyon Bütçe ve Servis Maliyeti");
  assert.match(buyerFinanceSurfaceSubtitle("SCHOOL"), /öğrenci|eğitim/iu);
  assert.match(buyerFinanceSurfaceSubtitle("ORGANIZATION"), /etkinlik|katılımcı/iu);
});
