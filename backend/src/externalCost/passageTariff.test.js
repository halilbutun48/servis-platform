import assert from "node:assert/strict";
import test from "node:test";
import { createKgmTollProvider } from "./kgmTollProvider.js";
import { createOtoyolTollProvider } from "./otoyolTollProvider.js";
import { normalizePassageRequest, resolvePassageEvidence } from "./passageTariffContract.js";
import { createConfiguredExternalReferenceRegistry } from "./providerFactory.js";

const basePassage = {
  routeId: "route_demo_1",
  segmentId: "segment_demo_1",
  paidSegment: "KGM-05-ANADOLU",
  entryStation: "GEBZE",
  exitStation: "AKYAZI",
  direction: "OUTBOUND",
  hgsClass: 2,
  serviceDate: "2026-10-31",
  tariffDate: "2026-01-01",
  currencyCode: "TRY",
};

function response(body, { status = 200, headers = {} } = {}) {
  return new Response(body, { status, headers });
}

test("geçiş isteği rota, kesim, yön, HGS sınıfı ve tarih bağlamını zorunlu tutar", () => {
  assert.deepEqual(normalizePassageRequest(basePassage), {
    ...basePassage,
    providerKey: "KGM_TOLL",
    family: "TOLL",
  });
  assert.throws(
    () => normalizePassageRequest({ ...basePassage, direction: "" }),
    (error) => error.code === "INVALID_PASSAGE_CONTEXT",
  );
  assert.throws(
    () => normalizePassageRequest({ ...basePassage, hgsClass: 7 }),
    (error) => error.code === "INVALID_PASSAGE_CONTEXT",
  );
  assert.equal(normalizePassageRequest({ ...basePassage, providerKey: "KMO_OFFICIAL" }).providerKey, "KMO_OFFICIAL");
});

test("KGM resmi hesaplayıcı çıktısı canonical tutar ve kaynak kanıtı olarak normalize edilir", async () => {
  const calls = [];
  const provider = createKgmTollProvider({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith("/") && !options.method) return response('<input name="__RequestVerificationToken" value="csrf-demo" />');
      if (String(url).toLocaleLowerCase("tr-TR").includes("ucretleryeni.aspx")) return response('<a href="/SiteCollectionDocuments/KGMdocuments/Otoyollar/OtoyolKopruUcret/2026Gecis_Ucret/5-AnadoluOtoyoluCamlica-Akinci.pdf">5-Anadolu</a>');
      if (String(url).endsWith("/Toll/GetTolls")) return response(JSON.stringify(["GEBZE", "AKYAZI"]), { headers: { "content-type": "application/json" } });
      return response("GEBZE ile AKYAZI arasındaki ücret 2. sınıf araçlar için 120 TL'dir. Bu iki gişe arası mesafe 103,35 km'dir.");
    },
  });
  const result = await provider.fetch({ ...basePassage, providerKey: "KGM_TOLL", highwayId: 10 });
  assert.equal(result.valueMinor, 12000);
  assert.equal(result.family, "TOLL");
  assert.equal(result.unit, "CURRENCY_PER_TRIP");
  assert.equal(result.sourceMetadata.routeId, basePassage.routeId);
  assert.equal(result.sourceMetadata.tariffEffectiveDateStatus, "VERIFIED_OFFICIAL_DOCUMENT_COLLECTION");
  assert.equal(result.sourceMetadata.tariffEffectiveDate, "2026-01-01");
  assert.match(result.sourceMetadata.officialTariffDocument, /5-AnadoluOtoyoluCamlica-Akinci\.pdf$/);
  assert.equal(result.sourceMetadata.passageContextStatus, "OFFICIAL_VERIFIED");
  assert.equal(result.sourceMetadata.coverageKey, "KGM-05-ANADOLU");
  assert.equal(result.rawPayloadHash.length, 64);
  assert.equal(calls.length, 4);
  assert.match(String(calls[3].options.body), /SinifId=2/);
});

test("KGM güncel resmi belge koleksiyonu istenen tarife tarihinden farklıysa kanıt üretmez", async () => {
  const provider = createKgmTollProvider({
    fetchImpl: async (url, options = {}) => {
      if (String(url).endsWith("/") && !options.method) return response('<input name="__RequestVerificationToken" value="csrf-demo" />');
      if (String(url).toLocaleLowerCase("tr-TR").includes("ucretleryeni.aspx")) return response('<a href="/SiteCollectionDocuments/KGMdocuments/Otoyollar/OtoyolKopruUcret/2026Gecis_Ucret/5-AnadoluOtoyoluCamlica-Akinci.pdf">5-Anadolu</a>');
      if (String(url).endsWith("/Toll/GetTolls")) return response(JSON.stringify(["GEBZE", "AKYAZI"]), { headers: { "content-type": "application/json" } });
      return response("GEBZE ile AKYAZI arasındaki ücret 2. sınıf araçlar için 120 TL'dir.");
    },
  });
  const result = await provider.fetch({ ...basePassage, tariffDate: "2026-02-01", highwayId: 10 });
  assert.equal(result.sourceMetadata.tariffEffectiveDate, null);
  assert.equal(result.sourceMetadata.tariffEffectiveDateStatus, "NOT_RETURNED_BY_OFFICIAL_SOURCE");
});

test("KGM katalog dışı veya henüz tarifesi kanıtlanmayan kesim için ücret üretmez", async () => {
  const provider = createKgmTollProvider({
    fetchImpl: async () => response('<input name="__RequestVerificationToken" value="csrf-demo" />'),
  });

  await assert.rejects(
    provider.fetch({ ...basePassage, highwayId: 999 }),
    (error) => error.code === "NO_DATA",
  );
});

test("katalogda bulunan fakat adapteri olmayan işletmeci registry'de fiyat sağlayıcısı olarak görünmez", () => {
  const registry = createConfiguredExternalReferenceRegistry({ providerKey: "KMO_OFFICIAL" });

  assert.deepEqual(registry.keys(), []);
  assert.equal(registry.get("KMO_OFFICIAL"), null);
});

test("Otoyol resmi hesaplayıcı sınıf ve istasyon bağlamıyla fiyat döndürür", async () => {
  const provider = createOtoyolTollProvider({
    fetchImpl: async () => response(JSON.stringify({ price: "2.895,00", ptype: "1" }), { headers: { "content-type": "application/json" } }),
  });
  const result = await provider.fetch({
    ...basePassage,
    providerKey: "OTOYOL_A5",
    family: "BRIDGE",
    entryStation: "Osmangazi Köprüsü(İzmir Yönü)",
    exitStation: "İzmir",
    hgsClass: 1,
  });
  assert.equal(result.valueMinor, 289500);
  assert.equal(result.family, "BRIDGE");
  assert.equal(result.sourceMetadata.pricingType, "1");
  assert.equal(result.sourceMetadata.tariffEffectiveDateStatus, "NOT_RETURNED_BY_OFFICIAL_CALCULATOR");
  assert.equal(result.rawPayloadHash.length, 64);
});

test("resmi hesaplayıcı tarife geçerlilik tarihini döndürmüyorsa rota geçiş maliyeti yayımlanmaz", () => {
  const result = resolvePassageEvidence({
    requests: [normalizePassageRequest(basePassage)],
    references: [{
      marketReference: {
        valueMinor: 12000,
        currencyCode: "TRY",
        sourceMetadata: {
          routeId: basePassage.routeId,
          segmentId: basePassage.segmentId,
          paidSegment: basePassage.paidSegment,
          entryStation: basePassage.entryStation,
          exitStation: basePassage.exitStation,
          direction: basePassage.direction,
          hgsClass: basePassage.hgsClass,
          serviceDate: basePassage.serviceDate,
          tariffRequestedDate: basePassage.tariffDate,
          tariffEffectiveDateStatus: "NOT_RETURNED_BY_OFFICIAL_CALCULATOR",
        },
      },
    }],
  });
  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.totalMinor, null);
  assert.match(result.missingReasons.join(" "), /tarife/i);
});

test("resmi belge koleksiyonu ile doğrulanan tarih canonical geçiş kanıtına yükselir", () => {
  const result = resolvePassageEvidence({
    requests: [normalizePassageRequest(basePassage)],
    references: [{
      state: "FRESH",
      marketReference: {
        valueMinor: 12000,
        currencyCode: "TRY",
        sourceMetadata: {
          routeId: basePassage.routeId,
          segmentId: basePassage.segmentId,
          paidSegment: basePassage.paidSegment,
          entryStation: basePassage.entryStation,
          exitStation: basePassage.exitStation,
          direction: basePassage.direction,
          hgsClass: basePassage.hgsClass,
          serviceDate: basePassage.serviceDate,
          tariffRequestedDate: basePassage.tariffDate,
          tariffEffectiveDateStatus: "VERIFIED_OFFICIAL_DOCUMENT_COLLECTION",
          passageContextStatus: "OFFICIAL_VERIFIED",
        },
      },
    }],
  });
  assert.equal(result.status, "PROVEN");
  assert.equal(result.totalMinor, 12000);
});

test("eksik resmi eşleşme sıfır TL olarak saklanmaz", () => {
  const result = resolvePassageEvidence({
    requests: [normalizePassageRequest(basePassage)],
    references: [{ marketReference: null, reason: "SOURCE_UNAVAILABLE" }],
  });
  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.totalMinor, null);
  assert.notEqual(result.totalMinor, 0);
});

test("aynı canonical passage isteği iki kez gelse de ücret bir kez eklenir", () => {
  const sourceMetadata = {
    routeId: basePassage.routeId,
    segmentId: basePassage.segmentId,
    paidSegment: basePassage.paidSegment,
    entryStation: basePassage.entryStation,
    exitStation: basePassage.exitStation,
    direction: basePassage.direction,
    hgsClass: basePassage.hgsClass,
    serviceDate: basePassage.serviceDate,
    tariffRequestedDate: basePassage.tariffDate,
    tariffEffectiveDateStatus: "VERIFIED",
    passageContextStatus: "OFFICIAL_VERIFIED",
  };
  const reference = {
    state: "FRESH",
    marketReference: { valueMinor: 12000, currencyCode: "TRY", sourceMetadata },
  };
  const result = resolvePassageEvidence({
    requests: [basePassage, { ...basePassage }],
    references: [reference, reference],
  });
  assert.equal(result.status, "PROVEN");
  assert.equal(result.totalMinor, 12000);
  assert.equal(result.items.length, 1);
});
