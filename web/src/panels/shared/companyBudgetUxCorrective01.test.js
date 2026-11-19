import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const componentPath = path.resolve(path.dirname(currentFile), "CostScenarioWorkspacePanel.jsx");
const source = fs.readFileSync(componentPath, "utf8");

test("COMPANY senaryo maliyeti gerçekleşmiş gider değil, tahmini yakıt/operasyon maliyeti olarak ayrılır", () => {
  assert.match(source, /Tahmini yakıt gideri/);
  assert.match(source, /Tahmini operasyon maliyeti/);
  assert.match(source, /amountMinor !== 0/);
  assert.match(source, /includedInBaseline !== false/);
  assert.match(source, /scope === ["']ROOM["']\s*&&[\s\S]*?Gerçekleşmiş gider/);
  assert.match(source, /gerçekleşmiş gider, sözleşme taahhüdü veya ödeme değildir/);
});

test("ROOM-only eksik gider formu aksiyonu COMPANY ekranında görünmez", () => {
  assert.match(source, /scope === ["']ROOM["']\s*&&\s*\(missingData\.length \|\| planningMissingOptional\)/);
  assert.match(source, /<VehiclePlanAlternatives[^>]*scope=\{scope\}/);
});

test("COMPANY bütçe gerçek harcama kanıtı ile planlama senaryosunu ayrı tutar", () => {
  const companyPreviewPath = path.resolve(path.dirname(currentFile), "FinancialOperationsCompanyPreview.jsx");
  const companyPreview = fs.readFileSync(companyPreviewPath, "utf8");
  assert.match(companyPreview, /actualServiceSpendMinor/);
  assert.match(companyPreview, /Tamamlanmış hizmet ve eşleşmiş fatura kanıtı yok.*Hakediş\/fatura\/ödeme ayrı tutulur/);
  assert.match(source, /PLANLAMA VARSAYIMI/);
});

test("COMPANY bütçe ilk görünümü temel karar bilgilerini öne çıkarır", () => {
  const companyPreviewPath = path.resolve(path.dirname(currentFile), "FinancialOperationsCompanyPreview.jsx");
  const companyPreview = fs.readFileSync(companyPreviewPath, "utf8");
  for (const label of [
    "Planlanan bütçe",
    "Sözleşmelerle taahhüt edilen",
    "Kullanılabilir bütçe",
    "Doğrulanmış gerçekleşen harcama",
    "Sıradaki işlem",
    "Doğrulanmış finans kanıtı",
  ]) {
    assert.match(companyPreview, new RegExp(label));
  }
  assert.match(companyPreview, /data-testid="company-budget-next-action"/);
  const evidenceHeadingIndex = companyPreview.indexOf("Doğrulanmış finans kanıtı");
  const reconciliationIndex = companyPreview.indexOf("<CompanyBudgetReconciliationCard");
  assert.ok(evidenceHeadingIndex >= 0 && evidenceHeadingIndex < reconciliationIndex);
});

test("COMPANY finans ekranı kanıt tutarlarını kuruştan TL'ye çevirir ve ilk görünümde özetler", () => {
  const companyPreviewPath = path.resolve(path.dirname(currentFile), "FinancialOperationsCompanyPreview.jsx");
  const companyPreview = fs.readFileSync(companyPreviewPath, "utf8");
  assert.match(companyPreview, /data-testid="company-financial-evidence-summary"/);
  assert.match(companyPreview, /Hakediş/);
  assert.match(companyPreview, /Fatura/);
  assert.match(companyPreview, /Ödenen/);
  assert.match(companyPreview, /formatMoneyMinor\(component\.amountMinor/);
  assert.match(companyPreview, /formatMoneyMinor\(unitCosts\.costPerShiftMinor/);
  assert.match(companyPreview, /Kaynak sözleşme ve kanıt kayıtlarını aç/);
  assert.doesNotMatch(companyPreview, /formatMoney\(component\.amountMinor/);
  assert.doesNotMatch(companyPreview, /formatMoney\(unitCosts\.costPerShiftMinor/);
});

test("COMPANY tedarikçi karşılaştırması eksik veriyi gelecek özellik gibi sunmaz", () => {
  const companyPreviewPath = path.resolve(path.dirname(currentFile), "FinancialOperationsCompanyPreview.jsx");
  const companyPreview = fs.readFileSync(companyPreviewPath, "utf8");
  assert.match(companyPreview, /Geçmiş tedarikçi kalite karşılaştırması/);
  assert.match(companyPreview, /geçmiş kalite ve güvenilirlik kaydı bulunmuyor/);
  assert.doesNotMatch(companyPreview, /sonraki aşamasında tamamlanacak/);
});

test("COMPANY hazır ROOM teklifleri üst özette eksik karşılaştırma gibi gösterilmez", () => {
  const companyPreviewPath = path.resolve(path.dirname(currentFile), "FinancialOperationsCompanyPreview.jsx");
  const companyPreview = fs.readFileSync(companyPreviewPath, "utf8");
  assert.match(companyPreview, /offerComparisonReady/);
  assert.match(companyPreview, /Aynı hizmet dönemindeki taşımacılık firması teklifleri hazırlandı/);
});

test("COMPANY mobil finans ekranı Sefer Abi için görünür ve ayrılmış bir üst şerit kullanır", () => {
  const css = fs.readFileSync(path.resolve(path.dirname(currentFile), "../../index.css"), "utf8");
  assert.match(css, /body:has\(\.pre18-finance-company\) \.copilotFab--mascot/);
  assert.match(css, /body:has\(\.pre18-finance-company\) \.shell--has-copilot-fab \.shellContent/);
  assert.match(css, /padding-top:\s*calc\(86px/);
});

test("COMPANY finansında Sefer Abi uzun araç kartlarının üstüne sabitlenmez", () => {
  const css = fs.readFileSync(path.resolve(path.dirname(currentFile), "../../index.css"), "utf8");
  assert.match(css, /body:has\(\.pre18-finance-company\) \.copilotLauncherStack[\s\S]*?position:\s*absolute/);
  assert.match(css, /body:has\(\.pre18-finance-company\) \.copilotFab--mascot[\s\S]*?position:\s*relative/);
});

test("okul ve organizasyon finansı kaynak sözleşme bağlantısını kendi menüsünde tutar", () => {
  const companyPreviewPath = path.resolve(path.dirname(currentFile), "FinancialOperationsCompanyPreview.jsx");
  const reconciliationPath = path.resolve(path.dirname(currentFile), "CompanyBudgetReconciliationCard.jsx");
  const companyPreview = fs.readFileSync(companyPreviewPath, "utf8");
  const reconciliation = fs.readFileSync(reconciliationPath, "utf8");
  assert.match(companyPreview, /agreementPathForBuyerKind/);
  assert.match(companyPreview, /buyer-service-context/);
  assert.match(companyPreview, /agreementPath={agreementPath}/);
  assert.match(reconciliation, /agreementPath = "\/company\/agreements"/);
  assert.match(reconciliation, /#\$\{agreementPath\}\?focusAgreementId/);
});

test("okul ve organizasyon tamamlanmış dönemi güncel önizlemeden ayrı gösterir", () => {
  const companyPreviewPath = path.resolve(path.dirname(currentFile), "FinancialOperationsCompanyPreview.jsx");
  const companyPreview = fs.readFileSync(companyPreviewPath, "utf8");
  assert.match(companyPreview, /historicalFinancialEvidence/);
  assert.match(companyPreview, /Tamamlanmış finans dönemi/);
  assert.match(companyPreview, /Gerçekleşen hizmet kanıtı/);
  assert.match(companyPreview, /company-historical-financial-evidence/);
  assert.match(companyPreview, /agreementPathForBuyerKind/);
});

test("buyer finans mobilinde açık Sefer Abi kartların üzerine binmez", () => {
  const css = fs.readFileSync(path.resolve(path.dirname(currentFile), "../../index.css"), "utf8");
  assert.match(css, /body:has\(\.pre18-finance-company\) \.copilotDrawer[\s\S]*?position:\s*static/);
});

test("buyer finans tabletinde ve masaüstünde Sefer Abi için gerçek yer ayrılır", () => {
  const css = fs.readFileSync(path.resolve(path.dirname(currentFile), "../../index.css"), "utf8");
  assert.match(css, /@media \(min-width: 721px\) and \(max-width: 1180px\)[\s\S]*?body:has\(\.pre18-finance-company\) \.copilotDrawer[\s\S]*?position:\s*static/);
  assert.match(css, /@media \(min-width: 1181px\)[\s\S]*?body:has\(\.pre18-finance-company\) \.shellContent[\s\S]*?padding-right:/);
});

test("COMPANY dönemleri kullanıcı dilinde gösterir ve ham ISO tarihi dışarı sızdırmaz", () => {
  const companyPreviewPath = path.resolve(path.dirname(currentFile), "FinancialOperationsCompanyPreview.jsx");
  const companyPreview = fs.readFileSync(companyPreviewPath, "utf8");
  assert.match(companyPreview, /formatPeriodForUser/);
  assert.match(companyPreview, /Intl\.DateTimeFormat\("tr-TR"/);
  assert.match(companyPreview, /day: "2-digit", month: "2-digit", year: "numeric"/);
});
