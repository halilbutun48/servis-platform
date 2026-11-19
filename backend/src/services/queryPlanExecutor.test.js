import test from "node:test";
import assert from "node:assert/strict";

import { executeSemanticQueryPlan } from "./queryPlanExecutor.js";

test("driver to shift relation uses authorized shift ids from the selected driver fact", async () => {
  const result = await executeSemanticQueryPlan({
    plan: {
      family: "RELATION_LOOKUP",
      planStatus: "READY",
      requestedDomains: ["DRIVERS", "SHIFTS"],
      entities: [{ type: "driver", id: 1 }],
      relationshipIntent: {
        kind: "DRIVER_TO_SHIFT",
        fromEntity: { type: "driver", id: 1 },
        toEntity: { type: "shift", id: null },
      },
    },
    readDomain: async (domain) => domain === "DRIVERS"
      ? { facts: [{ id: 1, driverId: 1, driverName: "Driver One", shiftIds: [35] }] }
      : { facts: [{ id: 35, shiftId: 35, statusText: "Onaylandı" }] },
  });

  assert.match(result.reply, /Driver One.*vardiya.*35/iu);
  assert.doesNotMatch(result.reply, /Sürücü #1/iu);
});

test("selected shift check-in count preserves an authorized zero from the native shift fact", async () => {
  const result = await executeSemanticQueryPlan({
    plan: {
      family: "ENTITY_LOOKUP",
      planStatus: "READY",
      requestedDomains: ["SHIFTS", "OPERATIONS"],
      entity: { type: "shift", id: 29 },
      entities: [{ type: "shift", id: 29 }],
      requestedFields: [
        { key: "STATUS" },
        { key: "BOARDING_COUNT", domain: "OPERATIONS" },
      ],
    },
    readDomain: async (domain) => domain === "SHIFTS"
      ? { facts: [{ id: 29, shiftId: 29, statusText: "Aktif", boardingCount: 0 }] }
      : { facts: [{ id: 29, shiftId: 29, statusText: "Aktif", gpsStatus: "Canlı" }] },
  });

  assert.match(result.reply, /biniş sayısı: 0/iu);
  assert.equal(result.outputContract.slotResults.find((slot) => slot.key === "BOARDING_COUNT")?.status, "RESOLVED");
});

test("selected shift relation resolves its authorized vehicle fact", async () => {
  const result = await executeSemanticQueryPlan({
    plan: {
      family: "RELATION_LOOKUP",
      planStatus: "READY",
      requestedDomains: ["SHIFTS", "VEHICLES"],
      entities: [{ type: "shift", id: 27 }],
      entity: { type: "shift", id: 27 },
      relationshipTraversal: [{ from: "shift", to: "vehicle", key: "shift->vehicle" }],
    },
    readDomain: async (domain) => domain === "SHIFTS"
      ? { facts: [{ id: 27, shiftId: 27, vehicle: "34ABC126", vehicleId: 2, statusText: "Onaylandı" }] }
      : { facts: [{ id: 2, vehicleId: 2, plate: "34ABC126", gpsStatus: "OFFLINE" }] },
  });

  assert.match(result.reply, /bağlı araç.*34ABC126/iu);
});

test("selected shift route lookup reports planned stops and distance without claiming live GPS", async () => {
  const result = await executeSemanticQueryPlan({
    plan: {
      family: "ENTITY_LOOKUP",
      planStatus: "READY",
      requestedDomains: ["SHIFTS", "OPERATIONS"],
      entity: { type: "shift", id: 47 },
      entities: [{ type: "shift", id: 47 }],
      requestedFields: [{ key: "ROUTE", domain: "OPERATIONS" }],
    },
    readDomain: async (domain) => domain === "SHIFTS"
      ? {
        facts: [{
          id: 47,
          shiftId: 47,
          routeText: "2 planlanan durak: TEST_SIMULATED DemoOrganizasyon Durak 2, TEST_SIMULATED DemoOrganizasyon Durak 1 • 6,44 km planlanan yol ağı mesafesi • gerçek GPS/sürüş kanıtı değil",
        }],
      }
      : { facts: [{ id: 47, shiftId: 47, nextStop: "TEST_SIMULATED DemoOrganizasyon Durak 2" }] },
  });

  assert.match(result.reply, /planlanan durak.*Durak 2.*Durak 1.*6,44 km/iu);
  assert.match(result.reply, /gerçek GPS\/sürüş kanıtı değil/iu);
  assert.doesNotMatch(result.reply, /konum: yetkili kayıtta yok/iu);
});

test("authorized selected shift access credentials are summarized without exposing token values", async () => {
  const result = await executeSemanticQueryPlan({
    plan: {
      family: "ENTITY_LOOKUP",
      planStatus: "READY",
      role: "ORGANIZATION",
      requestedDomains: ["SHIFTS", "PERSONNEL"],
      entity: { type: "shift", id: 34 },
      entities: [{ type: "shift", id: 34 }],
      requestedFields: [{ key: "ACCESS_CREDENTIALS", domain: "PERSONNEL" }],
    },
    readDomain: async (domain) => domain === "SHIFTS"
      ? {
        facts: [{
          id: 34,
          shiftId: 34,
          accessCredentialActiveCount: 2,
          accessCredentialTypes: ["QR", "NFC"],
          accessCredentialPersonelCount: 1,
        }],
      }
      : { facts: [{ id: 53, personelId: 53, fullName: "CONT-275 DEMO Katılımcı #53" }] },
  });

  assert.match(result.reply, /Vardiya #34.*2 aktif erişim kodu.*1 kişiyle ilişkili/iu);
  assert.match(result.reply, /QR.*NFC/iu);
  assert.match(result.reply, /kodların kendisini.*göstermiyorum/iu);
  assert.doesNotMatch(result.reply, /tokenHash|access_credentıals|[a-f0-9]{32,}/iu);
  assert.equal(result.outputContract.slotResults.find((slot) => slot.key === "ACCESS_CREDENTIALS")?.status, "RESOLVED");
});
