import assert from "node:assert/strict";
import test from "node:test";

import { attachFallbackUnitsToStops } from "../src/routes/shifts/roomShared.js";

test("organization fallback passengers retain canonical shift stops in route preview", () => {
  const units = [
    { kind: "generic", personelId: null, stopMeta: null },
    { kind: "generic", personelId: null, stopMeta: null },
    { kind: "generic", personelId: null, stopMeta: null },
    { kind: "generic", personelId: null, stopMeta: null },
  ];
  const rootStops = [
    { id: 101, name: "Etkinlik noktası 1", lat: 41.03, lng: 28.99, order: 1, type: "MANUAL" },
    { id: 102, name: "Etkinlik noktası 2", lat: 41.035, lng: 28.995, order: 2, type: "MANUAL" },
  ];

  const result = attachFallbackUnitsToStops(units, rootStops);

  assert.deepEqual(
    result.map((unit) => unit.stopMeta?.name),
    ["Etkinlik noktası 1", "Etkinlik noktası 2", "Etkinlik noktası 1", "Etkinlik noktası 2"],
  );
  assert.deepEqual(result.map((unit) => unit.originalStopKey), ["stop:101", "stop:102", "stop:101", "stop:102"]);
});
