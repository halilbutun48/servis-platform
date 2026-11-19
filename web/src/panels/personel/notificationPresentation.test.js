import test from "node:test";
import assert from "node:assert/strict";
import { personelNotificationLabel } from "./notificationPresentation.js";

test("personel bildirimleri ham teknik kod yerine Türkçe gösterilir", () => {
  assert.equal(personelNotificationLabel("AGREEMENT_APPROVED"), "Bildirim");
  assert.equal(personelNotificationLabel("MAINT_7D"), "Bildirim");
  assert.equal(personelNotificationLabel("GPS_STALE"), "Konum sinyali güncellenmedi");
});
