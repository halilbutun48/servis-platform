import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTurkishComposition } from "./userFacingLanguageNormalizer.js";

test("TEST_SIMULATED route provenance is visible as DEMO without leaking the enum", () => {
  const rendered = normalizeTurkishComposition(
    "2 planlanan durak: TEST_SIMULATED DemoOrganizasyon Durak 2 • 6,44 km planlanan yol ağı mesafesi • gerçek GPS/sürüş kanıtı değil",
  );

  assert.match(rendered, /DEMO DemoOrganizasyon Durak 2/iu);
  assert.doesNotMatch(rendered, /TEST_SIMULATED|Bu durum için güvenli bir açıklama veremiyorum/iu);
  assert.match(rendered, /gerçek GPS\/konum\/sürüş kanıtı değil/iu);
});
