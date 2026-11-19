import test from "node:test";
import assert from "node:assert/strict";
import { discoverAutomaticRoutePassage } from "./routePassageDiscovery.js";
import { findRoutePassageCorridor } from "./routePassageCorridorCatalog.js";

const routeContext = {
  status: "PROVEN",
  routeId: "route_8",
  routeSnapshotInputHash: "hash_8",
  direction: "INBOUND",
  serviceDate: "2026-11-08",
  missingReasons: [],
};

const paidRouteSteps = [
  { name: "Gebze 1 Kavşağı", ref: null },
  { name: "Gebze Kavşağı", ref: null },
  { name: "Anadolu Otoyolu", ref: "O-4" },
  { name: "Korutepe Tüneli", ref: "O-4" },
  { name: "Anadolu Otoyolu Bekirdere Viyadüğü", ref: "O-4" },
  { name: "Akyazı Kavşağı", ref: null },
];

test("O-4 Gebze-Akyazı adımlarından HGS sınıfı varsa KGM isteği üretir", () => {
  const result = discoverAutomaticRoutePassage({ routeDetails: { steps: paidRouteSteps }, routeContext, hgsClass: 2 });
  assert.equal(result.status, "READY_TO_PRICE");
  assert.equal(result.discoveryStatus, "PAID_CORRIDOR_DETECTED");
  assert.equal(result.corridor.entryStation, "GEBZE");
  assert.equal(result.corridor.exitStation, "AKYAZI");
  assert.equal(result.request.highwayId, 10);
  assert.equal(result.request.hgsClass, 2);
  assert.equal(result.request.tariffDate, "2026-01-01");
});

test("ücretli koridor bulunduğunda HGS sınıfını araç tipinden çıkarmaz", () => {
  const result = discoverAutomaticRoutePassage({
    routeDetails: { steps: paidRouteSteps },
    routeContext,
    hgsClass: null,
  });
  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.discoveryStatus, "PAID_CORRIDOR_DETECTED");
  assert.equal(result.request, null);
  assert.match(result.missingReasons.join(" "), /HGS sınıfı doğrulanmadı/);
});

test("ücretli işaret bulunmayan rotayı ücretsiz saymaz", () => {
  const result = discoverAutomaticRoutePassage({
    routeDetails: { steps: [{ name: "Şehir içi yol", ref: null }] },
    routeContext,
    hgsClass: 2,
  });
  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.request, null);
  assert.match(result.missingReasons.join(" "), /0 varsayılmadı/);
});

test("rota keşfi O-4 hardcode yerine katalogdaki kanıtlı koridoru kullanır", () => {
  const corridor = findRoutePassageCorridor(paidRouteSteps);
  assert.equal(corridor?.coverageKey, "KGM-05-ANADOLU");
  assert.equal(corridor?.highwayId, 10);
});

test("katalogda olmayan ücretli yol adı yalnızca bilinmeyen bırakılır", () => {
  const result = discoverAutomaticRoutePassage({
    routeDetails: { steps: [{ name: "Yeni Otoyol", ref: "O-99" }] },
    routeContext,
    hgsClass: 2,
  });
  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.request, null);
  assert.match(result.missingReasons.join(" "), /doğrulanmış ücretli kesim/);
});

test("katalogdaki başka bir otoyol kesimi kapı kanıtı yoksa fiyat üretmez", () => {
  const result = discoverAutomaticRoutePassage({
    routeDetails: { steps: [{ name: "İstanbul İzmir Otoyolu", ref: "O-5" }] },
    routeContext,
    hgsClass: 2,
  });
  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.corridor?.coverageKey, "OTOYOL-O5-GEBZE-ORHANGAZI-IZMIR");
  assert.equal(result.request, null);
  assert.match(result.missingReasons.join(" "), /giriş gişesi|çıkış gişesi/);
});
