import assert from "node:assert/strict";
import test from "node:test";

import { resolveSeferAbiContextCue, resolveShiftActionPath } from "./seferAbiContextCue.js";

test("context cue explains a verified missing driver and points to the authorized shift screen", () => {
  const cue = resolveSeferAbiContextCue({
    path: "/room/shifts",
    selection: {
      entityType: "shift",
      entityId: 19,
      label: "Seçili vardiya",
      selectedRecordStatus: "Durum: APPROVED • Araç: 34ABC126 • Sürücü: Yok • Durak: 3",
      facts: { screenType: "SHIFTS", stage: "APPROVED" },
    },
  });

  assert.equal(cue?.kind, "missing-assignment");
  assert.equal(cue?.text, "Bu vardiyanın sürücüsü henüz atanmadı.");
  assert.equal(cue?.action?.path, "/room/shifts");
});

test("missing-assignment action follows the current user's authorized shift route", () => {
  assert.equal(resolveShiftActionPath("/school"), "/school/shifts");
  assert.equal(resolveShiftActionPath("/organization"), "/organization/shifts");
  assert.equal(resolveShiftActionPath("/company"), "/company/shifts");
  assert.equal(resolveShiftActionPath("/room"), "/room/shifts");
});

test("context cue shows missing cost only when canonical facts contain an actual gap", () => {
  const cue = resolveSeferAbiContextCue({
    path: "/room/financial-operations",
    selection: {
      entityType: "shift",
      entityId: 19,
      selectedRecordStatus: "Teklif maliyeti inceleniyor",
      facts: {
        screenType: "ROOM_FINANCIAL_OPERATIONS",
        missing: [{ key: "maintenance", label: "Bakım" }],
      },
    },
  });

  assert.equal(cue?.kind, "missing-cost");
  assert.equal(cue?.text, "Bu teklifin bazı maliyet bilgileri eksik.");
});

test("context cue does not invent a warning or success without verified facts", () => {
  assert.equal(resolveSeferAbiContextCue({ path: "/room", selection: { label: "Bir kayıt" } }), null);
  assert.equal(resolveSeferAbiContextCue({
    path: "/room/shifts",
    selection: { selectedRecordStatus: "Durum: APPROVED • Araç: Var • Sürücü: Var" },
  }), null);
  assert.equal(resolveSeferAbiContextCue({
    path: "/room/shifts",
    selection: { operationStatus: "APPROVED", selectedRecordStatus: "Durum: APPROVED" },
  }), null);
});

test("driver binding fact suppresses a stale missing-assignment cue", () => {
  const cue = resolveSeferAbiContextCue({
    path: "/driver/today",
    selection: {
      entityType: "shift",
      entityId: 27,
      selectedRecordStatus: "Durum: APPROVED • Araç: 34ABC126 • Sürücü: Yok",
      facts: {
        screenType: "SHIFTS",
        driverId: 1,
      },
    },
  });

  assert.equal(cue, null);
});

test("driver shift gaps do not become a financial missing-cost cue", () => {
  const cue = resolveSeferAbiContextCue({
    path: "/driver/today",
    selection: {
      entityType: "shift",
      entityId: 27,
      selectedRecordStatus: "Durum: APPROVED • Araç: 34ABC126 • Sürücü: #1 • Durak: 0",
      facts: {
        screenType: "SHIFTS",
        driverId: 1,
        missing: ["Durak yok"],
      },
    },
  });

  assert.equal(cue, null);
});
