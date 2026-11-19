import assert from "node:assert/strict";
import test from "node:test";

import { guidedDraftInfoText, guidedRoomText } from "./guidedPlanUserCopy.js";

test("sunucudan devam edilen taslağı yeni oluşturulmuş gibi göstermiyor", () => {
  assert.equal(
    guidedDraftInfoText({ resumed: true, createdIds: [24] }),
    "Taslak #24 korundu; aynı kayıt üzerinden 3. adıma geçildi.",
  );
});

test("kimliği olmayan taşımacılık firması teknik null yerine doğal metin gösteriyor", () => {
  assert.equal(guidedRoomText({ roomId: null }, new Map()), "Henüz taşımacılık firması seçilmedi");
});

test("bilinen taşımacılık firması adını teknik kimlik yerine gösteriyor", () => {
  assert.equal(
    guidedRoomText({ roomId: 7 }, new Map([[7, { id: 7, name: "Mavi Servis" }]])),
    "Mavi Servis",
  );
});
