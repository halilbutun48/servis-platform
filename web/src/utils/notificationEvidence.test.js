import test from "node:test";
import assert from "node:assert/strict";
import { buildNotificationEvidenceSummary } from "./notificationEvidence.js";

test("bildirim kanıtı kullanıcıya Türkçe özet olarak verilir", () => {
  const result = buildNotificationEvidenceSummary({
    kind: "GPS_STALE",
    status: "STALE",
    vehicleId: 12,
    ageSec: 125,
    message: "Konum sinyali güncellenmedi",
  });

  assert.equal(result.title, "Konum sinyali güncellenmedi");
  assert.equal(result.lines.includes("Durum: Güncel değil"), true);
  assert.equal(result.lines.includes("Araç: 12"), true);
  assert.equal(result.lines.some((line) => line.includes("GPS_STALE") || line.includes("STALE")), false);
  assert.equal(result.lines.some((line) => line.includes("{") || line.includes("\"")), false);
});

test("boş veya bozuk bildirim kanıtı güvenli boş durum verir", () => {
  const result = buildNotificationEvidenceSummary("{bozuk");
  assert.equal(result.title, "Bildirim ayrıntısı");
  assert.deepEqual(result.lines, ["Bu bildirim için ek ayrıntı bulunmuyor."]);
});
