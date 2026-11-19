import test from "node:test";
import assert from "node:assert/strict";
import { buildSchoolParentCopilotSelection } from "./parentInviteCopilotSelection.js";

test("school parents binds the selected student and safe access history to Sefer Abi", () => {
  const selection = buildSchoolParentCopilotSelection({
    selectedStudent: { id: 2, fullName: "Student One #2" },
    companyId: 2,
    items: [
      { id: 81, childPersonelId: 2, status: "REVOKED", createdAt: "2026-11-12T10:00:00Z", expiresAt: "2026-11-19T10:00:00Z" },
      { id: 82, childPersonelId: 2, status: "ACTIVE", createdAt: "2026-11-13T10:00:00Z", expiresAt: "2026-11-20T10:00:00Z" },
      { id: 83, childPersonelId: 9, status: "ACTIVE" },
    ],
  });

  assert.equal(selection.scopeKey, "/school/parents");
  assert.equal(selection.entityType, "student");
  assert.equal(selection.entityId, 2);
  assert.equal(selection.facts.accessHistoryCount, 2);
  assert.equal(selection.facts.revokedAccessCount, 1);
  assert.equal(selection.facts.activeAccessCount, 1);
  assert.equal(selection.facts.tenantScope, 2);
  assert.equal(Object.hasOwn(selection.facts, "token"), false);
  assert.equal(Object.hasOwn(selection.facts, "pin"), false);
  assert.equal(Object.hasOwn(selection.facts, "link"), false);
  assert.equal(Object.hasOwn(selection.facts, "phone"), false);
  assert.equal(Object.hasOwn(selection.facts, "email"), false);
});

test("school parents exposes a safe empty history for an authorized selected student", () => {
  const selection = buildSchoolParentCopilotSelection({
    selectedStudent: { id: 7, fullName: "Demo Öğrenci İki" },
    items: [],
  });

  assert.equal(selection.facts.selectedRecordStatus, "NO_ACCESS_HISTORY");
  assert.equal(selection.facts.accessHistoryCount, 0);
  assert.match(selection.selectedRecordSummary, /Erişim geçmişi boş/);
});
