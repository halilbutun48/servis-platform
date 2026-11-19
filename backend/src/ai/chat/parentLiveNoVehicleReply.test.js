import assert from "node:assert/strict";
import test from "node:test";

import {
  buildParentLiveNoVehicleReply,
  parentLiveGpsSourceAllowed,
} from "./helpComposer.js";

const noVehicleContext = {
  path: "/parent/live",
  selectedSummary: "Bugün için aktif servis görünmüyor • Çocuk: Student One • Araç: 0",
  selectedRecordSummary: "Bugün için aktif servis görünmüyor • Çocuk: Student One • Araç: 0",
  selectedRecordStatus: "Çocuk: Student One • Araç: 0 • Aktif servis görünmüyor",
  structuredFacts: {
    noLiveVehicle: true,
    liveVehicleVisible: false,
    vehicleCount: 0,
  },
};

test("PARENT no-service saat sorusu güvenli eksik-veri yanıtına döner", () => {
  const reply = buildParentLiveNoVehicleReply({
    screenContext: noVehicleContext,
    screenPath: "/parent/live",
    message: "Servis saati uygun mu?",
  });

  assert.match(reply, /aktif servis görünmüyor/i);
  assert.match(reply, /servis saat/i);
  assert.doesNotMatch(reply, /İstenen alanı bu ifadeden güvenle çıkaramadım/i);
});

test("PARENT no-service konum yanıtı GPS kaynağı uydurmaz", () => {
  const reply = buildParentLiveNoVehicleReply({
    screenContext: noVehicleContext,
    screenPath: "/parent/live",
    message: "Canlı konum neden yok?",
  });

  assert.match(reply, /canlı konum/i);
  assert.doesNotMatch(reply, /sürücünün telefonundan konum sinyali/i);
});

test("PARENT GPS kaynak cümlesi yalnız canlı araç seçiliyken eklenir", () => {
  assert.equal(parentLiveGpsSourceAllowed({
    screenPath: "/parent/live",
    parentLiveSelectionSignal: true,
    parentLiveNoVehicleVisibleSignal: true,
  }), false);
  assert.equal(parentLiveGpsSourceAllowed({
    screenPath: "/parent/live",
    parentLiveSelectionSignal: true,
    parentLiveNoVehicleVisibleSignal: false,
  }), true);
});
