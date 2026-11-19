import test from "node:test";
import assert from "node:assert/strict";
import { buildSchoolParentAccessHistoryReply, isSchoolParentAccessHistoryQuestion } from "./schoolParentAccessContext.js";

test("recognizes selected-student access history questions", () => {
  assert.equal(isSchoolParentAccessHistoryQuestion("Seçili öğrencinin erişim geçmişinde iptal edilmiş kayıt var mı?"), true);
  assert.equal(isSchoolParentAccessHistoryQuestion("Peki bu erişimin güncel durumu nedir?"), true);
  assert.equal(isSchoolParentAccessHistoryQuestion("Bu öğrencinin telefonu nedir?"), false);
});

test("builds a tenant-safe read-only reply without secrets", () => {
  const result = buildSchoolParentAccessHistoryReply({
    student: { id: 2, fullName: "Student One #2" },
    invites: [
      { id: 11, revokedAt: new Date("2026-11-01T00:00:00Z") },
      { id: 12, expiresAt: new Date("2026-11-12T00:00:00Z") },
      { id: 13, expiresAt: new Date("2026-12-01T00:00:00Z") },
    ],
    now: new Date("2026-11-13T00:00:00Z").getTime(),
  });
  assert.match(result.reply, /Student One #2/u);
  assert.match(result.reply, /1 iptal edilmiş/u);
  assert.match(result.reply, /1 aktif/u);
  assert.match(result.reply, /1 süresi dolmuş/u);
  assert.doesNotMatch(result.reply, /https?:\/\//iu);
  assert.equal(result.readOnly, true);
  assert.equal(result.writeAction, false);
});
