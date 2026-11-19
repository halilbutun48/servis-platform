import test from "node:test";
import assert from "node:assert/strict";
import { buildNotificationCopilotSelection, clearCopilotSelection, copilotSelectionContextChanged, copilotSelectionContextKey, mergeCopilotSelection, readCopilotRouteSelection, readCopilotSelection, resolveRouteBoundFinancialSelection, setCopilotSelection } from "./copilotSelection.js";

test("copilot selection has a page-memory mirror when the browser window is not extensible", () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const root = {};
  const windowStub = {
    location: { hash: "#/room/financial-operations" },
    dispatchEvent() {},
  };
  Object.preventExtensions(windowStub);
  globalThis.window = windowStub;
  globalThis.document = { documentElement: root };

  const selection = {
    scopeKey: "/room/financial-operations",
    facts: { selectedShiftId: 19, targetContributionBps: 2000 },
  };

  try {
    setCopilotSelection(selection);
    assert.equal(Object.values(root).includes(selection), true);
    assert.deepEqual(readCopilotSelection(), selection);
    clearCopilotSelection("/room/financial-operations");
    assert.equal(readCopilotSelection(), null);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("room finance route focus becomes a bounded copilot selection hint", () => {
  assert.deepEqual(
    resolveRouteBoundFinancialSelection({
      path: "/room/financial-operations",
      hash: "#/room/financial-operations?view=quote-profitability&focusVehicleId=1&focusShiftId=19&focusPeriodStart=2026-11-02&focusPeriodEnd=2026-11-02",
    }),
    {
      selectedEntityType: "shift",
      selectedEntityId: 19,
      selectedShiftId: 19,
      selectedVehicleId: 1,
      periodStart: "2026-11-02",
      periodEnd: "2026-11-02",
      financeView: "quote-profitability",
      activeTab: "quote-profitability",
      screenType: "ROOM_FINANCIAL_OPERATIONS",
    },
  );
  assert.equal(resolveRouteBoundFinancialSelection({ path: "/company/financial-operations", hash: "#/company/financial-operations?focusShiftId=19" }), null);
});

test("dedicated copilot route reads only a minimal authenticated record handoff", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: {
      hash: "#/company/copilot?copilotScope=%2Fcompany%2Fagreements&copilotEntityType=agreement&copilotEntityId=9&copilotLabel=S%C3%B6zle%C5%9Fme%20%239",
    },
  };
  try {
    assert.deepEqual(readCopilotRouteSelection(), {
      scopeKey: "/company/agreements",
      entityType: "agreement",
      entityId: 9,
      label: "Sözleşme #9",
    });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("full-screen copilot restores rich same-record panel facts without merging another route", () => {
  const routeSelection = {
    scopeKey: "/driver/route",
    entityType: "shift",
    entityId: 29,
    label: "Vardiya #29 • Rota",
  };
  const storedSelection = {
    ...routeSelection,
    selectedRecordStatus: "GPS durumu: Çevrim dışı",
    fields: [{ label: "GPS durumu", value: "Çevrim dışı" }],
    facts: { gpsOffline: true, etaUnavailable: true },
  };
  assert.deepEqual(mergeCopilotSelection(routeSelection, storedSelection), {
    ...storedSelection,
  });
  assert.deepEqual(
    mergeCopilotSelection(routeSelection, { ...storedSelection, scopeKey: "/room/map" }),
    routeSelection,
  );
});

test("copilot selection context key changes when the authorized parent child changes", () => {
  const firstChild = {
    scopeKey: "/parent/live",
    entityType: "personnel",
    entityId: 2,
    selectedRecordType: "studentService",
    selectedRecordId: 2,
    selectedRecordLabel: "Student One",
  };
  const secondChild = {
    ...firstChild,
    entityId: 31,
    selectedRecordId: 31,
    selectedRecordLabel: "Öğrenci Testi",
  };

  assert.notEqual(copilotSelectionContextKey(firstChild), copilotSelectionContextKey(secondChild));
  assert.equal(
    copilotSelectionContextKey(firstChild),
    copilotSelectionContextKey({ ...firstChild, summary: "Canlı durum güncellendi" }),
  );
});

test("copilot selection context reset survives the intermediate clear event", () => {
  const previousChild = {
    scopeKey: "/parent/live",
    entityType: "personnel",
    entityId: 31,
    selectedRecordType: "personnel",
    selectedRecordId: 31,
  };

  assert.equal(copilotSelectionContextChanged(previousChild, null), true);
  assert.equal(copilotSelectionContextChanged(null, previousChild), false);
});

test("notification detail creates a route-bound copilot selection without exposing raw payload", () => {
  const selection = buildNotificationCopilotSelection({
    id: 41,
    typeLabel: "Sözleşme",
    status: "Bekliyor",
    scope: "ROOM",
    title: "Sözleşme yanıtı bekliyor",
    message: "Teklif #20 için yanıt bekleniyor.",
    regionLabel: "İstanbul",
    evidenceSummary: { lines: ["Teklif #20"] },
    payload: { secret: "must-not-cross-context-boundary" },
  });

  assert.deepEqual(selection, {
    scopeKey: "/shared/notifications",
    entityType: "notification",
    entityId: 41,
    selectedRecordType: "notification",
    selectedRecordId: 41,
    label: "Bildirim #41",
    selectedRecordLabel: "Bildirim #41",
    selectedRecordStatus: "Bekliyor",
    selectedRecordSummary: "Sözleşme yanıtı bekliyor • Teklif #20 için yanıt bekleniyor. • İstanbul",
    facts: {
      screenType: "SHARED_NOTIFICATIONS",
      selectedRecordType: "notification",
      selectedRecordId: 41,
      selectedRecordLabel: "Bildirim #41",
      selectedRecordStatus: "Bekliyor",
      selectedRecordSummary: "Sözleşme yanıtı bekliyor • Teklif #20 için yanıt bekleniyor. • İstanbul",
    },
  });
  assert.equal("secret" in selection, false);
});
