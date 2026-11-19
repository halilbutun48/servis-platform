import test from "node:test";
import assert from "node:assert/strict";
import { companyScenarioFocusFromPreview, planningPreviewContext } from "./planningPreviewContext.js";

test("automatic planning preview is explicitly separate from the active realized filter", () => {
  assert.deepEqual(
    planningPreviewContext({
      explicitlySelected: false,
      date: "15 Ara 2026",
      vehiclePlate: "34ABC123",
      driverName: "Driver One",
    }),
    {
      heading: "Bağımsız planlama önizlemesi",
      title: "Planlama örneği",
      details: "15 Ara 2026 · 34ABC123 · Driver One",
      note: "Bu tarih, üstteki gerçekleşen dönem filtresinden bağımsızdır; gerçekleşen sonucu göstermez.",
    },
  );
});

test("explicit service focus keeps the planning preview tied to the selected shift", () => {
  assert.deepEqual(
    planningPreviewContext({
      explicitlySelected: true,
      date: "15 Ara 2026",
      vehiclePlate: "34ABC123",
      driverName: "Driver One",
    }),
    {
      heading: "Seçili hizmet için planlama önizlemesi",
      title: "Seçili vardiya",
      details: "15 Ara 2026 · 34ABC123 · Driver One",
      note: "Bu önizleme seçili gerçekleşen hizmetin bağlamını kullanır; sonuç yine planlama önizlemesidir.",
    },
  );
});

test("COMPANY senaryo paneli finans önizlemesinin seçili vardiya ve sözleşme kimliklerini taşır", () => {
  assert.deepEqual(
    companyScenarioFocusFromPreview({ snapshot: { shiftId: 4, agreementId: 2 } }),
    { focusShiftId: 4, focusAgreementId: 2 },
  );
  assert.deepEqual(
    companyScenarioFocusFromPreview({ snapshot: { shiftId: null, agreementId: null }, contextResolution: { selectedShiftId: 7, selectedAgreementId: 9 } }),
    { focusShiftId: 7, focusAgreementId: 9 },
  );
});
