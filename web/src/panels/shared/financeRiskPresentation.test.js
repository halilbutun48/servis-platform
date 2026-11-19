import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCompanyBudgetRiskPresentation,
  buildRoomQuoteFloorPresentation,
  buildRoomQuoteRiskPresentation,
} from "./financeRiskPresentation.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

test("COMPANY taslak bütçeyi ayrı ve gri gösterir", () => {
  const result = buildCompanyBudgetRiskPresentation({ budgetUsageBps: 0, isDraft: true, comparisonReady: true });

  assert.deepEqual(result, {
    tone: "muted",
    status: "GRAY",
    icon: "○",
    label: "Taslak bütçe",
    description: "Bütçe henüz aktifleştirilmedi.",
  });
});

test("COMPANY bütçe kullanım eşikleri 80 ve 100 sınırlarında korunur", () => {
  assert.equal(buildCompanyBudgetRiskPresentation({ budgetUsageBps: 7999, comparisonReady: true }).status, "GREEN");
  assert.equal(buildCompanyBudgetRiskPresentation({ budgetUsageBps: 8000, comparisonReady: true }).status, "ORANGE");
  assert.equal(buildCompanyBudgetRiskPresentation({ budgetUsageBps: 9999, comparisonReady: true }).status, "ORANGE");
  assert.equal(buildCompanyBudgetRiskPresentation({ budgetUsageBps: 10000, comparisonReady: true }).status, "RED");
});

test("COMPANY eksik karşılaştırma verisini gri gösterir ve geçerli sıfırı korur", () => {
  assert.equal(buildCompanyBudgetRiskPresentation({ budgetUsageBps: null, comparisonReady: true }).status, "GRAY");
  assert.equal(buildCompanyBudgetRiskPresentation({ budgetUsageBps: 0, comparisonReady: true }).status, "GREEN");
  assert.equal(buildCompanyBudgetRiskPresentation({ budgetUsageBps: 8000, comparisonReady: false }).status, "GRAY");
});

test("ROOM teklif tahmini maliyetin altındaysa kırmızıdır", () => {
  const result = buildRoomQuoteRiskPresentation({
    offerMinor: 9000,
    estimatedCostMinor: 10000,
    quoteFloorMinor: 12000,
    evidenceReady: true,
  });

  assert.equal(result.status, "RED");
  assert.equal(result.label, "Maliyet karşılanmıyor");
});

test("ROOM teklif maliyeti karşılayıp hedef tabanın altında kalırsa turuncudur", () => {
  const result = buildRoomQuoteRiskPresentation({
    offerMinor: 11000,
    estimatedCostMinor: 10000,
    quoteFloorMinor: 12000,
    evidenceReady: true,
  });

  assert.equal(result.status, "ORANGE");
  assert.equal(result.label, "Hedef teklif tabanının altında");
});

test("ROOM hedef teklif tabanı ve planlama kanıtı varsa yeşildir", () => {
  const result = buildRoomQuoteRiskPresentation({
    offerMinor: 12000,
    estimatedCostMinor: 10000,
    quoteFloorMinor: 12000,
    evidenceReady: true,
  });

  assert.equal(result.status, "GREEN");
  assert.equal(result.label, "Ekonomik hedef uygun");
});

test("ROOM ekonomik kanıt yoksa tutarlar olumlu olsa bile gridir", () => {
  const result = buildRoomQuoteRiskPresentation({
    offerMinor: 12000,
    estimatedCostMinor: null,
    quoteFloorMinor: 12000,
    evidenceReady: false,
  });

  assert.deepEqual(result, {
    tone: "muted",
    status: "GRAY",
    icon: "○",
    label: "Ekonomik kanıt eksik",
    description: "Karşılaştırma için yeterli maliyet veya planlama kanıtı yok.",
  });
});

test("ROOM eksik maliyet kaynağındaki teklif tabanını kesin sonuç olarak etiketlemez", () => {
  const result = buildRoomQuoteFloorPresentation({
    quoteFloor: {
      computed: true,
      baselineSource: "incomplete",
      missingFields: [],
      baselineOperationalCostMinor: 5741,
      quoteFloorMinor: 7537,
    },
  });

  assert.equal(result.definitive, false);
  assert.equal(result.costLabel, "Kısmi planlama maliyeti");
  assert.equal(result.quoteLabel, "Kısmi planlama teklif önizlemesi");
  assert.match(result.quoteNote, /kesin teklif tabanı değildir/);
});

test("ROOM tam dönem planı hazırsa teklif etiketi kesinleşebilir", () => {
  const result = buildRoomQuoteFloorPresentation({
    quoteFloor: {
      computed: true,
      baselineSource: "CANONICAL_PERIOD_PLAN",
      missingFields: [],
      baselineOperationalCostMinor: 10000,
      quoteFloorMinor: 13000,
    },
    periodScopeActive: true,
    periodPlanning: { periodCostReady: true, comparisonAllowed: true },
  });

  assert.equal(result.definitive, true);
  assert.equal(result.costLabel, "Tahmini hizmet dönemi maliyeti");
  assert.equal(result.quoteLabel, "Önerilen en düşük teklif");
});

test("COMPANY bütçe yüzeyi ortak risk rozetini ve taslak ayrımını kullanır", () => {
  const source = fs.readFileSync(path.join(currentDir, "FinancialOperationsCompanyPreview.jsx"), "utf8");
  assert.match(source, /buildCompanyBudgetRiskPresentation/);
  assert.match(source, /company-budget-risk-status/);
  assert.match(source, /isDraft: budgetPlanIsDraft/);
});

test("ROOM teklif yüzeyi ortak risk rozetini ve gri eksik kanıt durumunu kullanır", () => {
  const source = fs.readFileSync(path.join(currentDir, "FinancialOperationsPanel.jsx"), "utf8");
  assert.match(source, /buildRoomQuoteRiskPresentation/);
  assert.match(source, /room-quote-risk-status/);
  assert.match(source, /quoteFloorMinor: displayQuoteFloor\?\.quoteFloorMinor \?\? costedQuoteFloorMinor/);
  assert.match(source, /muted: \{ border:/);
  assert.match(source, /quoteFloorPresentation\.definitive/);
  assert.match(source, /Kanıtlanmış gerçekleşmiş gider/);
});

test("Ortak risk rozeti dört rengi metin ve ikonla erişilebilir sunar", () => {
  const source = fs.readFileSync(path.join(currentDir, "FinanceRiskBadge.jsx"), "utf8");
  assert.match(source, /finance-risk-badge/);
  assert.match(source, /aria-label/);
  assert.match(source, /risk\.icon/);
  const css = fs.readFileSync(path.resolve(currentDir, "../../index.css"), "utf8");
  for (const risk of ["green", "orange", "red", "gray"]) {
    assert.match(css, new RegExp(`finance-risk-badge\\[data-risk=\\"${risk}\\"\\]`));
  }
});
