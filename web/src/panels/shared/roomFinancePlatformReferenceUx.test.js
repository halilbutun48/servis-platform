import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const externalReferenceCard = fs.readFileSync(path.join(currentDir, "ExternalReferenceCard.jsx"), "utf8");
const financialOperationsPanel = fs.readFileSync(path.join(currentDir, "FinancialOperationsPanel.jsx"), "utf8");

test("ROOM dış referans kartı yakıt fiyatını ayrı ve doğru adla gösterir", () => {
  assert.match(externalReferenceCard, /Yakıt fiyatı referansı/);
  assert.doesNotMatch(externalReferenceCard, /SeferPakt Bölgesel Referansı/);
  assert.match(externalReferenceCard, /Platform geçmiş anlaşma referansı/);
});

test("ROOM platform referansı NOT_PROVEN iken ortalama veya bant yayımlamaz", () => {
  assert.match(financialOperationsPanel, /platformReference\?\.status === "READY"/);
  assert.match(financialOperationsPanel, /Platform geçmiş anlaşma referansı şu anda kapalı/);
  assert.match(externalReferenceCard, /Platform geçmiş anlaşma bandı kapalı/);
});

test("kontrollü DEMO sonucu ortalama, aralık ve canlıdan ayrımını açıkça etiketler", () => {
  assert.match(financialOperationsPanel, /Kontrollü DEMO platform geçmiş anlaşma referansı/);
  assert.match(financialOperationsPanel, /platformRange/);
  assert.match(externalReferenceCard, /platform-demo-reference-summary/);
  assert.match(externalReferenceCard, /Bu canlı platform ortalaması değildir/);
});

test("platform geçmiş anlaşma referansı teklif ekranının ilk bilgi grubunda yer alır", () => {
  const referenceRenderIndex = financialOperationsPanel.indexOf("<RoomMonthlyPriceReferenceCard reference={preview?.monthlyPriceReference} />");
  const quoteContextIndex = financialOperationsPanel.indexOf('data-testid="quote-profitability-context"');
  assert.notEqual(referenceRenderIndex, -1);
  assert.notEqual(quoteContextIndex, -1);
  assert.ok(referenceRenderIndex < quoteContextIndex, "platform referansı teklif seçim formunun altında olmamalı");
});
