import assert from "node:assert/strict";
import test from "node:test";
import { routePassageForDisplay, routePassageLabel } from "./routePassagePresentation.js";

test("baseline rota kanıtı ağır senaryo önizlemesi tamamlanmadan gösterilebilir", () => {
  const passage = routePassageForDisplay({
    baseline: { routeEvidence: { baseline: { passage: { status: "NOT_PROVEN", totalMinor: null, passageBasis: "PLANNED_ROUTE_TARIFF" } } } },
    result: null,
  });

  assert.equal(passage.status, "NOT_PROVEN");
  assert.equal(passage.passageBasis, "PLANNED_ROUTE_TARIFF");
});

test("planlanan tarife sonucu gerçekleşen HGS olayı gibi sunulmaz", () => {
  const label = routePassageLabel({
    status: "PROVEN",
    totalMinor: 12000,
    passageBasis: "PLANNED_ROUTE_TARIFF",
    actualHgsEventStatus: "SEPARATE_RECORD_REQUIRED",
  });

  assert.match(label, /Planlanan geçiş ücretleri/);
  assert.match(label, /Gerçekleşen HGS kaydı değildir/);
  assert.doesNotMatch(label, /Gerçekleşen geçiş ücretleri/);
});

test("kanıtsız planlanan tarife sıfır TL'ye çevrilmez ve gerçek kayıt yolu belirtilir", () => {
  const label = routePassageLabel({
    status: "NOT_PROVEN",
    totalMinor: null,
    passageBasis: "PLANNED_ROUTE_TARIFF",
    missingReasons: ["tarife geçerlilik tarihi doğrulanmadı."],
  });

  assert.match(label, /Planlanan geçiş ücretleri doğrulanmadı/);
  assert.match(label, /GPS\/HGS veya gider kaydı/);
  assert.doesNotMatch(label, /0,00/);
});

test("otomatik keşif ücretli koridoru gösterir ama HGS sınıfı yoksa ücreti uydurmaz", () => {
  const label = routePassageLabel({
    status: "NOT_PROVEN",
    totalMinor: null,
    passageBasis: "PLANNED_ROUTE_TARIFF",
    missingReasons: ["Araç HGS sınıfı doğrulanmadı; araç tipinden sınıf çıkarılmadı."],
    automaticDiscovery: {
      discoveryStatus: "PAID_CORRIDOR_DETECTED",
      corridor: { entryStation: "GEBZE", exitStation: "AKYAZI" },
    },
  });

  assert.match(label, /GEBZE → AKYAZI ücretli koridoru tespit edildi/);
  assert.match(label, /HGS sınıfı doğrulanmadı/);
  assert.doesNotMatch(label, /0,00/);
});

test("seçili çoklu araç planının bağımsız toplamı tek rota toplamının yerine gösterilir", () => {
  const passage = routePassageForDisplay({
    result: {
      scenario: { requiredVehicleCount: 2 },
      routePassage: {
        scenario: { status: "NOT_PROVEN", totalMinor: null, passageBasis: "PLANNED_ROUTE_TARIFF" },
        vehicleByCount: {
          "2": {
            status: "PROVEN",
            totalMinor: 30000,
            passageBasis: "PER_VEHICLE_PLANNED_ROUTE_TARIFF",
          },
        },
      },
    },
  });
  assert.equal(passage.totalMinor, 30000);
  assert.match(routePassageLabel(passage), /Seçili araç planının geçiş ücretleri/);
});
