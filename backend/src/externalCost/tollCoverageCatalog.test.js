import assert from "node:assert/strict";
import test from "node:test";
import { findTurkeyTollCoverage, listTurkeyTollCoverage } from "./tollCoverageCatalog.js";

test("Türkiye resmi ücret kataloğu KGM'nin 20 kesimini ve işletmeci kayıtlarını kapsar", () => {
  const rows = listTurkeyTollCoverage();
  const kgmRows = rows.filter((row) => row.authority === "KGM");

  assert.equal(kgmRows.length, 20);
  assert.equal(new Set(rows.map((row) => row.coverageKey)).size, rows.length);
  assert.ok(rows.some((row) => row.coverageKey === "OTOYOL-O5-GEBZE-ORHANGAZI-IZMIR"));
  assert.ok(rows.some((row) => row.coverageKey === "KMO-ANADOLU"));
  assert.ok(rows.some((row) => row.coverageKey === "1915-CANAKKALE"));
  assert.ok(rows.some((row) => row.coverageKey === "AVRASYA-TUNNEL"));
});

test("KGM kesimi resmi hesaplayıcıya resmi highwayId ve geçerlilik kaynağıyla bağlanır", () => {
  const row = findTurkeyTollCoverage("KGM-05-ANADOLU");

  assert.equal(row.providerKey, "KGM_TOLL");
  assert.equal(row.highwayId, 10);
  assert.equal(row.adapterStatus, "SUPPORTED");
  assert.match(row.tariffSourceUrl, /^https:\/\/www\.kgm\.gov\.tr\//);
  assert.equal(row.tariffEffectiveDatePolicy, "PARSE_OFFICIAL_SOURCE_OR_CURRENT_DOCUMENT_COLLECTION");
  assert.equal(row.tariffDocumentFile, "5-AnadoluOtoyoluCamlica-Akinci.pdf");
  assert.match(row.tariffDocumentUrl, /2026Gecis_Ucret\/5-AnadoluOtoyoluCamlica-Akinci\.pdf$/);
});

test("KGM resmi katalogdaki fakat mevcut hesaplayıcıda açılmayan kesimi ücret sağlayıcısı yapmaz", () => {
  const row = findTurkeyTollCoverage("KGM-12-GEBZE-ORHANGAZI-IZMIR");

  assert.equal(row.highwayId, null);
  assert.equal(row.adapterStatus, "CATALOG_ONLY");
  assert.equal(row.providerKey, null);
});

test("resmi tarife sayfası olup otomatik hesaplayıcısı kanıtlanmayan işletmeci fiyat üretmez", () => {
  const row = findTurkeyTollCoverage("KMO-ANADOLU");

  assert.equal(row.adapterStatus, "CATALOG_ONLY");
  assert.equal(row.providerKey, null);
  assert.equal(row.pricePublication, "NOT_PROVEN");
  assert.match(row.tariffSourceUrl, /^https:\/\//);
});

test("açık ve geçerli tarife kanıtı bulunmayan yeni kesim NOT_PROVEN kalır", () => {
  const row = findTurkeyTollCoverage("CESMELI-KIZKALESI");

  assert.equal(row.adapterStatus, "NOT_OPEN_OR_NO_TARIFF");
  assert.equal(row.pricePublication, "NOT_PROVEN");
});
