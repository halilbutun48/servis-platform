import test from "node:test";
import assert from "node:assert/strict";
import { getProactiveActionableEventKey, resolveProactiveBubble } from "./seferAbiProactiveBubble.js";

test("proactive bubble projects the server-sorted actionable event without inventing a count", () => {
  const event = {
    id: "room:offers:8",
    group: "OFFER",
    priority: "HIGH",
    title: "4 teklif yanıt bekliyor",
    whatHappened: "Yetkili teklif yanıtları var.",
    actionLabel: "Teklifleri incele",
    actionPath: "/room/offers",
    evidence: { count: 4, source: "canonical" },
    scope: { tenantId: "room-demo" },
  };

  const bubble = resolveProactiveBubble({ events: [event] });

  assert.deepEqual(bubble, {
    event,
    key: getProactiveActionableEventKey(event),
    message: "4 teklif yanıt bekliyor",
    actionLabel: "Teklifleri incele",
    actionPath: "/room/offers",
    avatarState: "attention",
  });
});

test("dismissed event keys fail closed until the canonical event changes", () => {
  const event = { id: "company:agreements:2", title: "2 sözleşme onay bekliyor", actionPath: "/company/agreements" };
  const key = getProactiveActionableEventKey(event);

  assert.equal(resolveProactiveBubble({ events: [event], dismissedKey: key }), null);
  assert.notEqual(resolveProactiveBubble({ events: [{ ...event, title: "1 sözleşme onay bekliyor" }] })?.key, key);
});

test("empty, malformed, or unauthorized-looking events do not create a bubble", () => {
  assert.equal(resolveProactiveBubble({ events: [] }), null);
  assert.equal(resolveProactiveBubble({ events: [{ id: "x", title: "", actionPath: "" }] }), null);
  assert.equal(resolveProactiveBubble({ events: [{ id: "x", title: "Bir uyarı" }] }), null);
});
