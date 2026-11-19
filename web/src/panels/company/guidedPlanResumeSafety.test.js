import assert from "node:assert/strict";
import test from "node:test";

import { shouldPreserveResumedGuidedDraft } from "./guidedPlanResumeSafety.js";

test("serverden devam edilen rehber taslağı silme/yeniden oluşturma yoluna girmez", () => {
  assert.equal(
    shouldPreserveResumedGuidedDraft({ resumedFromServer: true, draftShiftIds: [24] }),
    true,
  );
});

test("yeni veya yalnızca yerel taslak akışı mevcut temizlik davranışını korur", () => {
  assert.equal(
    shouldPreserveResumedGuidedDraft({ resumedFromServer: false, draftShiftIds: [24] }),
    false,
  );
  assert.equal(
    shouldPreserveResumedGuidedDraft({ resumedFromServer: true, draftShiftIds: [] }),
    false,
  );
});

test("kalıcı form durumundan dönen organization taslağını korur", () => {
  assert.equal(
    shouldPreserveResumedGuidedDraft({ organization: true, draftShiftIds: [53] }),
    true,
  );
  assert.equal(
    shouldPreserveResumedGuidedDraft({ organization: false, draftShiftIds: [53] }),
    false,
  );
});
