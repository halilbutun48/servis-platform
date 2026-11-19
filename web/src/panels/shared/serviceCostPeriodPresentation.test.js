import test from "node:test";
import assert from "node:assert/strict";
import { serviceCostSourcePeriodLabel } from "./serviceCostPeriodPresentation.js";

test("servis maliyeti özeti, kaynak gider dönemini gösterir", () => {
  assert.equal(
    serviceCostSourcePeriodLabel([
      { periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-09-30T00:00:00.000Z" },
    ]),
    "01 Eyl 2026 – 30 Eyl 2026",
  );
});
