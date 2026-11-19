import test from "node:test";
import assert from "node:assert/strict";
import {
  boardingChangeDecisionOwnerLabel,
  boardingChangeDecisionOwnerNote,
  boardingChangeCopilotSelectionIdentity,
  isOpenBoardingChangeRequest,
  boardingChangePreviewStateLabel,
  boardingChangePreviewStateNote,
} from "./boardingChangeUi.js";

test("açık talep uygulama beklerken kapandı olarak gösterilmez", () => {
  const request = {
    status: "OPEN",
    boardingChangeApplicationStatus: "BLOCKED",
  };

  assert.equal(boardingChangePreviewStateLabel(request), "Kabul bekliyor");
  assert.equal(boardingChangePreviewStateNote(request), "İnsan onayı bekliyor.");
});

test("kabul edilen ama henüz uygulanmayan değişiklik uygulandı diye gösterilmez", () => {
  const request = {
    status: "ACCEPTED",
    decisionState: "COMPANY_ACCEPTED",
    decisionOwnerRole: "COMPANY",
    boardingChangeApplicationStatus: "READY",
  };

  assert.equal(boardingChangeDecisionOwnerLabel(request), "Hizmet alan taraf");
  assert.equal(
    boardingChangeDecisionOwnerNote(request),
    "Kabul edildi; günlük atamaya uygulanmaya hazır. Sürücü rotası henüz yenilenmedi.",
  );
});

test("kabul edilen talebin önizlemesi insan onayı bekliyor diye çelişmez", () => {
  const request = {
    status: "ACCEPTED",
    decisionState: "COMPANY_ACCEPTED",
    boardingChangeApplicationStatus: "READY",
  };

  assert.equal(boardingChangePreviewStateLabel(request), "Kabul edildi • uygulamaya hazır");
  assert.equal(
    boardingChangePreviewStateNote(request),
    "Kabul edildi; günlük atamaya uygulanmaya hazır. Sürücü rotası henüz yenilenmedi.",
  );
});

test("kabul edilmiş kayıt sıfır koordinat nedeniyle açık talep listesine girmez", () => {
  assert.equal(isOpenBoardingChangeRequest({ status: "ACCEPTED", lat: 0, lng: 0 }), false);
  assert.equal(isOpenBoardingChangeRequest({ status: "OPEN", lat: 0, lng: 0 }), true);
});

test("kabul edilen biniş değişikliği Sefer Abi seçimini gerçek servis talebine bağlar", () => {
  assert.deepEqual(boardingChangeCopilotSelectionIdentity(3), {
    entityType: "service_request",
    entityId: 3,
  });
});
