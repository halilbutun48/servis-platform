import assert from "node:assert/strict";
import test from "node:test";

import { shouldIgnoreGlobalEnterShortcut } from "./keyboardShortcutGuard.js";

test("metin alanındaki Enter global rota kısayolunu engeller", () => {
  assert.equal(shouldIgnoreGlobalEnterShortcut({ key: "Enter", target: { tagName: "TEXTAREA" } }), true);
  assert.equal(shouldIgnoreGlobalEnterShortcut({ key: "Enter", target: { tagName: "INPUT" } }), true);
  assert.equal(shouldIgnoreGlobalEnterShortcut({ key: "Enter", target: { isContentEditable: true } }), true);
});

test("metin alanı dışındaki Enter global rota kısayolunu korur", () => {
  assert.equal(shouldIgnoreGlobalEnterShortcut({ key: "Enter", target: { tagName: "BUTTON" } }), false);
  assert.equal(shouldIgnoreGlobalEnterShortcut({ key: "Enter", target: { tagName: "DIV" } }), false);
});

test("başka tuşlar ve zaten engellenmiş olaylar rota kısayolunu çalıştırmaz", () => {
  assert.equal(shouldIgnoreGlobalEnterShortcut({ key: "Escape", target: { tagName: "DIV" } }), true);
  assert.equal(shouldIgnoreGlobalEnterShortcut({ key: "Enter", defaultPrevented: true, target: { tagName: "DIV" } }), true);
});
