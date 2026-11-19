import test from "node:test";
import assert from "node:assert/strict";

import { buildCompanyHubContextReply } from "./helpComposer.js";

const authorizedHub = {
  path: "/company/hub",
  label: "Hub",
  selectedFields: [
    { label: "Enlem", value: "41.01" },
    { label: "Boylam", value: "29.01" },
  ],
  structuredFacts: {
    screenType: "COMPANY_HUB",
    hubLat: 41.01,
    hubLng: 29.01,
    hasHubCoordinates: true,
    source: "AUTHORIZED_COMPANY_HUB_READ",
  },
};

test("company hub location question reads the authorized current coordinates", () => {
  const result = buildCompanyHubContextReply({
    message: "Bu firmanın merkez konumu nedir?",
    screenContext: authorizedHub,
  });

  assert.equal(result?.questionType, "FIELD_LOOKUP");
  assert.match(result.reply, /enlem 41\.01/iu);
  assert.match(result.reply, /boylam 29\.01/iu);
  assert.match(result.reply, /yeni konum veya işlem oluşturulmadı/iu);
});

test("room hub location question uses the same authorized read-only projection", () => {
  const result = buildCompanyHubContextReply({
    message: "Bu taşımacılık firmasının kayıtlı konumu nedir?",
    screenContext: {
      ...authorizedHub,
      path: "/room/hub",
      label: "Taşımacılık Firması Konumu",
      structuredFacts: {
        ...authorizedHub.structuredFacts,
        screenType: "ROOM_HUB",
      },
    },
  });

  assert.equal(result?.questionType, "FIELD_LOOKUP");
  assert.match(result.reply, /kayıtlı yetkili merkez konumu/iu);
  assert.match(result.reply, /enlem 41\.01/iu);
  assert.match(result.reply, /boylam 29\.01/iu);
});

test("company hub without coordinates refuses to invent a location", () => {
  const result = buildCompanyHubContextReply({
    message: "Bu firmanın merkez konumu nedir?",
    screenContext: {
      ...authorizedHub,
      selectedFields: [
        { label: "Enlem", value: "-" },
        { label: "Boylam", value: "-" },
      ],
      structuredFacts: {
        screenType: "COMPANY_HUB",
        hubLat: null,
        hubLng: null,
        hasHubCoordinates: false,
      },
    },
  });

  assert.match(result.reply, /kaydı bulunamadı/iu);
  assert.match(result.reply, /koordinat uyduramam/iu);
});

test("company hub helper stays route-scoped", () => {
  assert.equal(buildCompanyHubContextReply({
    message: "Bu firmanın merkez konumu nedir?",
    screenContext: { ...authorizedHub, path: "/company/shifts" },
  }), null);
});

test("company hub update follow-up keeps the prior location context", () => {
  const result = buildCompanyHubContextReply({
    message: "Peki bunu nasıl güncellerim?",
    screenContext: authorizedHub,
    conversationState: {
      recentMessages: [
        { role: "user", text: "Bu firmanın merkez konumu nedir?" },
      ],
    },
  });

  assert.equal(result?.questionType, "FIELD_LOOKUP");
  assert.match(result.reply, /enlem ve boylam alanlarını düzenleyip Kaydet/iu);
  assert.match(result.reply, /yazma işlemi başlatmıyorum/iu);
});
