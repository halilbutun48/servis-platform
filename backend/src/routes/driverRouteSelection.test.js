import test from "node:test";
import assert from "node:assert/strict";

const { selectDriverRouteShift } = await import("./driver.js");

const shift = (id, startAt, endAt, status = "APPROVED") => ({
  id,
  status,
  startAt,
  endAt,
});

test("genel DRIVER rotası aktif vardiyayı gelecek vardiyaya tercih eder", () => {
  const now = new Date("2026-11-16T15:00:00.000Z");
  const active = shift(19, "2026-11-16T14:00:00.000Z", "2026-11-16T16:00:00.000Z");
  const future = shift(56, "2026-11-26T04:00:00.000Z", "2026-11-26T06:00:00.000Z");

  assert.equal(selectDriverRouteShift([future, active], now).id, 19);
});

test("aktif vardiya yoksa genel DRIVER rotası en yakın gelecek vardiyayı seçer", () => {
  const now = new Date("2026-11-16T15:00:00.000Z");
  const nearer = shift(25, "2026-11-17T09:00:00.000Z", "2026-11-17T11:00:00.000Z");
  const later = shift(56, "2026-11-26T04:00:00.000Z", "2026-11-26T06:00:00.000Z");

  assert.equal(selectDriverRouteShift([later, nearer], now).id, 25);
});

test("zaman aralığı dışında olsa da ACTIVE durumundaki vardiya önceliklidir", () => {
  const now = new Date("2026-11-16T15:00:00.000Z");
  const active = shift(19, "2026-11-16T14:00:00.000Z", "2026-11-16T16:00:00.000Z", "ACTIVE");
  const future = shift(56, "2026-11-26T04:00:00.000Z", "2026-11-26T06:00:00.000Z");

  assert.equal(selectDriverRouteShift([future, active], new Date("2026-11-30T15:00:00.000Z")).id, 19);
});

test("aktif veya gelecek vardiya yoksa en son geçmiş vardiyaya geri döner", () => {
  const now = new Date("2026-11-16T15:00:00.000Z");
  const older = shift(17, "2026-11-15T09:00:00.000Z", "2026-11-15T11:00:00.000Z");
  const latest = shift(19, "2026-11-16T14:00:00.000Z", "2026-11-16T16:00:00.000Z");

  assert.equal(selectDriverRouteShift([older, latest], new Date("2026-11-16T17:00:00.000Z")).id, 19);
});
