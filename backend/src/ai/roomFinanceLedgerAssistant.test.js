import test from "node:test";
import assert from "node:assert/strict";
import { independentLedgerQuestion } from "./service.js";

test("natural vehicle expense question enters the independent ROOM ledger owner", () => {
  assert.equal(independentLedgerQuestion("Bu araç bu ay ne kadar masraf yaptı?"), "VEHICLE_PERIOD_TOTAL");
  assert.equal(independentLedgerQuestion("Bu araç bu dönem ne kadar gider yaptı?"), "VEHICLE_PERIOD_TOTAL");
  assert.equal(independentLedgerQuestion("Bu aracın giderleri hangi servislere dağıldı?"), "VEHICLE_ALLOCATIONS");
  assert.equal(independentLedgerQuestion("Dağıtım bekleyen giderlerim neler?"), "UNALLOCATED");
  assert.equal(independentLedgerQuestion("Bu araç bana ne kadar kazandırdı?"), "VEHICLE_EARNINGS");
  assert.equal(independentLedgerQuestion("Hangi servis zarar ettirdi?"), "SERVICE_PROFITABILITY");
  assert.equal(independentLedgerQuestion("Bu ay ne kadar giderim var?"), "MONTH_TOTAL");
  assert.equal(independentLedgerQuestion("Bu araç bu ay ne kadar masraf yaptı? Bir de kâr?"), null);
});
