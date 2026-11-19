import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentSituationDiagnosticQuestion } from "./chat/intentRouter.js";
import { buildVisibleContextDiagnosticResponse } from "./service.js";

test("driver map empty-state question is treated as a current situation diagnostic", () => {
  assert.equal(isCurrentSituationDiagnosticQuestion("Bu harita ekranı neden boş görünüyor?"), true);
  assert.equal(isCurrentSituationDiagnosticQuestion("Peki GPS ve ETA şu an neden gösterilmiyor?"), true);
  assert.equal(isCurrentSituationDiagnosticQuestion("Peki canlı konum ve ETA durumu nedir?"), true);
  assert.equal(isCurrentSituationDiagnosticQuestion("Canlı GPS durumu ne durumda?"), true);
});

test("driver route live-position follow-up stays grounded in visible GPS and ETA facts", () => {
  const response = buildVisibleContextDiagnosticResponse({
    user: { role: "DRIVER" },
    entityType: "screen",
    entityId: 3104,
    message: "Peki canlı konum ve ETA durumu nedir?",
    screenContext: {
      path: "/driver/route",
      label: "Rota",
      selectedRecordLabel: "Vardiya #29",
      selectedFields: [
        { label: "GPS", value: "Çevrim dışı" },
        { label: "Tahmini süre", value: "hesaplanamıyor" },
      ],
      structuredFacts: {
        selectedRecordSummary: "GPS: Çevrim dışı • Tahmini süre: hesaplanamıyor",
      },
    },
  });
  assert.ok(response);
  assert.match(response.reply, /çevrim dışı|cevrim disi|offline/iu);
  assert.match(response.reply, /hesaplanamıyor|hesaplanamiyor/iu);
});

test("driver route diagnostic also accepts the compact ETA label emitted by the live surface", () => {
  const response = buildVisibleContextDiagnosticResponse({
    user: { role: "DRIVER" },
    entityType: "screen",
    entityId: 3102,
    message: "Peki canlı konum ve ETA durumu nedir?",
    screenContext: {
      path: "/driver/route",
      label: "Rota",
      selectedLabel: "Vardiya #29 • Rota",
      selectedEntityType: "shift",
      selectedEntityId: 29,
      selectedFields: [
        { label: "GPS durumu", value: "Çevrim dışı" },
        { label: "Tahmini süre", value: "hesaplanamıyor" },
      ],
      structuredFacts: {
        selectedRecordStatus: "Araç: 34 ABC 125 • GPS: Çevrim dışı • ETA: hesaplanamıyor",
      },
    },
  });
  assert.ok(response);
  assert.match(response.reply, /çevrim dışı|cevrim disi|offline/iu);
  assert.match(response.reply, /hesaplanamıyor|hesaplanamiyor/iu);
});

test("driver map empty-state diagnostic stays grounded in visible authorized facts", () => {
  const response = buildVisibleContextDiagnosticResponse({
    user: { role: "DRIVER" },
    entityType: "screen",
    entityId: 3103,
    message: "Bu harita ekranı neden boş görünüyor?",
    screenContext: {
      path: "/driver/map",
      label: "Harita",
      selectedRecordLabel: "Canlı rota",
      selectedFields: [
        { label: "Araç", value: "-" },
        { label: "GPS durumu", value: "Bekleniyor" },
        { label: "Tahmini süre", value: "hesaplanamıyor" },
      ],
      structuredFacts: {
        selectedRecordSummary: "Araç: - • GPS: Bekleniyor • Tahmini süre: hesaplanamıyor",
      },
    },
  });
  assert.ok(response);
  assert.match(response.reply, /konum|gps/iu);
  assert.match(response.reply, /hesaplanamıyor|hesaplanamiyor/iu);
});
