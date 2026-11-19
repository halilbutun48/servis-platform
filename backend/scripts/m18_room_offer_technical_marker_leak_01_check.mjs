#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sanitizeUserFacingOfferNote } from "../src/services/userFacingOfferNote.js";

const offersRoute = await readFile(new URL("../src/routes/offers.js", import.meta.url), "utf8");
const awareness = await readFile(new URL("../src/services/authorizedProductAwareness.js", import.meta.url), "utf8");

const internalMarker = "M18_DEMO_ROOM_FINANCE_FOUNDATION_V1:M18_DEMO_OFFER_OPEN";
const humanNote = "Demo hizmet teklifi; inceleme için hazırlandı.";

assert.equal(sanitizeUserFacingOfferNote(internalMarker), null, "reserved fixture marker must not reach a user-facing offer note");
assert.equal(sanitizeUserFacingOfferNote(`${internalMarker}:ROOM_RESPONSE`), null, "reserved fixture marker variants must remain hidden");
assert.equal(sanitizeUserFacingOfferNote(humanNote), humanNote, "ordinary user-facing notes must be preserved");
assert.match(offersRoute, /sanitizeUserFacingOfferNote/);
assert.match(awareness, /sanitizeUserFacingOfferNote/);

console.log("M18 ROOM offer technical-marker leak regression: PASS");
