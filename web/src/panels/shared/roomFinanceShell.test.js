import test from "node:test";
import assert from "node:assert/strict";
import { isRealizedRoomFinanceView, roomFinanceShellCopy } from "./roomFinanceShell.js";

test("realized ROOM finance tabs share one control-center shell", () => {
  for (const financeView of ["overview", "expenses", "service-cost"]) {
    assert.equal(isRealizedRoomFinanceView(financeView), true);
    assert.deepEqual(roomFinanceShellCopy({ financeView, roomName: "DemoRoom" }), {
      eyebrow: "ROOM FİNANS",
      title: "Finans Kontrol Merkezi",
      subtitle: "DemoRoom · Dönem ve araç kapsamı tek finans görünümünden yönetilir",
    });
  }
  assert.equal(isRealizedRoomFinanceView("quote-profitability"), false);
});
