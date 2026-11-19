import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  BOARDING_CHANGE_PERSONEL_SELECT,
  BOARDING_CHANGE_DRIVER_SELECT,
  BOARDING_CHANGE_STOP_SELECT,
  BOARDING_CHANGE_REQUEST_AUDIT_ACTIONS,
  BOARDING_CHANGE_DECISION_AUDIT_ACTIONS,
  resolveBoardingChangeEffectiveDate,
} from "./boardingChangeApplication.js";

function modelFields(name) {
  const model = Prisma.dmmf.datamodel.models.find((item) => item.name === name);
  assert.ok(model, `Prisma model ${name} bulunamadı`);
  return new Set(model.fields.map((field) => field.name));
}

test("boarding change apply seçimleri canonical Personel ve Driver şemasıyla uyumludur", () => {
  const personelFields = modelFields("Personel");
  const driverFields = modelFields("Driver");
  const stopFields = modelFields("Stop");

  for (const field of Object.keys(BOARDING_CHANGE_PERSONEL_SELECT)) {
    assert.ok(personelFields.has(field), `Personel.${field} canonical şemada yok`);
  }
  for (const field of Object.keys(BOARDING_CHANGE_DRIVER_SELECT)) {
    assert.ok(driverFields.has(field), `Driver.${field} canonical şemada yok`);
  }
  for (const field of Object.keys(BOARDING_CHANGE_STOP_SELECT)) {
    assert.ok(stopFields.has(field), `Stop.${field} canonical şemada yok`);
  }
});

test("boarding change apply istek türünü karar audit'inden değil oluşturma audit'inden korur", () => {
  const audits = [
    { action: "BOARDING_CHANGE_REQUEST_CLOSE_ACCEPT", meta: { decisionState: "COMPANY_ACCEPTED" } },
    { action: "BOARDING_CHANGE_REQUEST_CREATE", meta: { requestKind: "NO_SHOW", nearestStopId: 47 } },
  ];
  const requestAudit = audits.find((row) => BOARDING_CHANGE_REQUEST_AUDIT_ACTIONS.includes(row.action));
  const decisionAudit = audits.find((row) => BOARDING_CHANGE_DECISION_AUDIT_ACTIONS.includes(row.action));
  const requestMeta = { ...(requestAudit?.meta || {}), ...(decisionAudit?.meta || {}) };

  assert.equal(requestMeta.requestKind, "NO_SHOW");
  assert.equal(requestMeta.nearestStopId, 47);
  assert.equal(requestMeta.decisionState, "COMPANY_ACCEPTED");
});

test("boarding change apply oluşturma audit'indeki geçerli requestDate'i korur", () => {
  const now = new Date("2026-11-11T14:30:00.000Z");

  assert.equal(
    resolveBoardingChangeEffectiveDate({ requestMeta: { requestDate: "2026-11-17" }, now }),
    "2026-11-17",
  );
  assert.equal(
    resolveBoardingChangeEffectiveDate({ requestMeta: { requestDate: "not-a-date" }, now }),
    "2026-11-11",
  );
});
