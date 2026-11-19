import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSuperAdminOnboardingReviewQueueResponse,
  buildSuperAdminOnboardingReviewSelectedLeadResponse,
} from "./service.js";

test("SUPER_ADMIN onboarding-review queue sorusu yalnız yetkili yüzeyde salt-okunur özet üretir", async () => {
  const response = await buildSuperAdminOnboardingReviewQueueResponse({
    user: { role: "SUPER_ADMIN" },
    screenContext: { path: "/superadmin/onboarding-review", label: "Başvuru İncelemesi" },
    message: "Başvuru kuyruğunda kayıt var mı?",
    semanticPlan: { family: "ROLE_EXPLANATION_HELP" },
  });

  assert.equal(response?.readOnly, true);
  assert.equal(response?.questionType, "PUBLIC_LEAD_REVIEW_QUEUE_SUMMARY");
  assert.match(response?.reply || "", /başvuru/i);
  assert.deepEqual(response?.authorizedRecords, []);
});

test("onboarding-review kuyruk özeti yetkisiz role veya başka yüzeye taşmaz", async () => {
  const unauthorized = await buildSuperAdminOnboardingReviewQueueResponse({
    user: { role: "ROOM" },
    screenContext: { path: "/superadmin/onboarding-review" },
    message: "Başvuru kuyruğunda kayıt var mı?",
  });
  const wrongSurface = await buildSuperAdminOnboardingReviewQueueResponse({
    user: { role: "SUPER_ADMIN" },
    screenContext: { path: "/superadmin" },
    message: "Başvuru kuyruğunda kayıt var mı?",
  });

  assert.equal(unauthorized, null);
  assert.equal(wrongSurface, null);
});

test("seçili public lead takip sorusu kuyruk özeti yerine seçili kaydın durumunu açıklar", () => {
  const response = buildSuperAdminOnboardingReviewSelectedLeadResponse({
    user: { role: "SUPER_ADMIN" },
    screenContext: {
      path: "/superadmin/public-leads",
      label: "Başvuru İncelemesi",
    },
    message: "Peki seçili DEMO başvurunun durumu nedir?",
    selectedRecord: {
      id: "lead-000001",
      type: "DEMO_REQUEST",
      typeLabel: "Demo talebi",
      status: "IN_REVIEW",
      statusLabel: "İnceleniyor",
      source: "PUBLIC_LANDING",
      sourceLabel: "Public landing",
    },
  });

  assert.equal(response?.readOnly, true);
  assert.equal(response?.questionType, "PUBLIC_LEAD_REVIEW_SELECTED_RECORD_STATUS");
  assert.match(response?.reply || "", /İnceleniyor/iu);
  assert.match(response?.reply || "", /Demo talebi/iu);
  assert.doesNotMatch(response?.reply || "", /toplam 1 kayıt/iu);
  assert.deepEqual(response?.authorizedRecords, [{ id: "lead-000001", type: "public-lead", status: "IN_REVIEW" }]);
});
