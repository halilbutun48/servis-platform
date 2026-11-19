import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoomHgsExpenseAssistantResponse,
} from "./roomHgsExpenseAssistant.js";

const screenContext = {
  path: "/room/financial-operations",
  structuredFacts: {
    financeView: "service-cost",
    selectedShiftId: 261,
    selectedVehicleId: 1,
    selectedVehicleLabel: "Araç • 34ABC123",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  },
};

function prismaWith(rows) {
  return {
    roomCostEntry: {
      findMany: async () => rows,
    },
  };
}

test("ROOM Servis Maliyeti HGS sorusu seçili vardiyanın server-owned giderini açıklar", async () => {
  const response = await buildRoomHgsExpenseAssistantResponse({
    user: { role: "ROOM", roomId: 1 },
    screenContext,
    message: "Bu sefere yazdığım HGS gideri ne kadar?",
    prisma: prismaWith([{
      id: 345,
      roomId: 1,
      shiftId: 261,
      amountMinor: 45000,
      currencyCode: "TRY",
      allocation: "DIRECT",
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      vatClassification: "UNKNOWN",
      vatDeductibility: "UNKNOWN",
      vatAmountMinor: null,
      category: { key: "HGS_TOLL", label: "HGS / geçiş" },
      vehicle: { plate: "34ABC123" },
      driver: { fullName: "Deniz Sürücü" },
      shift: { id: 261, startAt: "2026-09-04T06:00:00.000Z", endAt: "2026-09-04T17:00:00.000Z" },
      agreement: null,
    }]),
  });

  assert.equal(response.activeTopic, "ROOM_HGS_EXPENSE");
  assert.match(response.reply, /450,00 TL/u);
  assert.match(response.reply, /34ABC123/u);
  assert.match(response.reply, /Vardiya 261/u);
  assert.match(response.reply, /KDV bilgisi.*brüt/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
  assert.equal(response.quickActions[0].actionKind, "OPEN_ROUTE");
  assert.deepEqual(response.quickActions[0].routeParams, {
    view: "expenses",
    focusEntryId: 345,
    focusShiftId: 261,
    focusField: "vat",
    contextSource: "expense-entry",
  });
});

test("HGS finans yanıtı ROOM dışı rol veya yanlış yüzey için devreye girmez", async () => {
  const prisma = prismaWith([]);
  assert.equal(await buildRoomHgsExpenseAssistantResponse({
    user: { role: "COMPANY", roomId: 1 },
    screenContext,
    message: "Bu sefere yazdığım HGS gideri ne kadar?",
    prisma,
  }), null);
  assert.equal(await buildRoomHgsExpenseAssistantResponse({
    user: { role: "ROOM", roomId: 1 },
    screenContext: { ...screenContext, structuredFacts: { ...screenContext.structuredFacts, financeView: "overview" } },
    message: "Bu sefere yazdığım HGS gideri ne kadar?",
    prisma,
  }), null);
});

test("ROOM HGS takip sorusu son kullanıcı konuşmasındaki gider bağlamını korur", async () => {
  const response = await buildRoomHgsExpenseAssistantResponse({
    user: { role: "ROOM", roomId: 1 },
    screenContext,
    message: "Hangi sefere bağlı ve düzeltmek istiyorum?",
    conversationState: {
      recentMessages: [
        { role: "user", text: "Bu sefere yazdığım HGS gideri ne kadar?" },
        { role: "assistant", text: "Bu HGS/geçiş gideri 450,00 TL." },
      ],
    },
    prisma: prismaWith([{
      id: 345,
      roomId: 1,
      shiftId: 261,
      amountMinor: 45000,
      currencyCode: "TRY",
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      vatClassification: "UNKNOWN",
      vatDeductibility: "UNKNOWN",
      vatAmountMinor: null,
      category: { key: "HGS_TOLL", label: "HGS / geçiş" },
      vehicle: { plate: "34ABC123" },
      shift: { id: 261, startAt: "2026-09-04T06:00:00.000Z", endAt: "2026-09-04T17:00:00.000Z" },
    }]),
  });

  assert.match(response.reply, /450,00 TL/u);
  assert.match(response.reply, /Vardiya 261/u);
  assert.match(response.reply, /34ABC123/u);
  assert.equal(response.quickActions[0].routeParams.focusEntryId, 345);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
});
