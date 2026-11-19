import assert from "node:assert/strict";
import test from "node:test";
import { buildWalkNavigationUrl, formatParentRegionLabel } from "./parentLiveNavigation.js";

test("parent region label does not expose an internal region id", () => {
  assert.equal(formatParentRegionLabel({ regionId: 1 }), "Bölge bilgisi mevcut");
  assert.equal(formatParentRegionLabel({ regionName: "İstanbul", regionId: 1 }), "İstanbul");
});

test("parent navigation URL rejects unknown zero coordinates", () => {
  assert.equal(buildWalkNavigationUrl({ lat: 0, lng: 0 }, { lat: 41, lng: 29 }), "");
  assert.equal(buildWalkNavigationUrl({ lat: 41, lng: 29 }, { lat: 0, lng: 0 }), "https://www.google.com/maps/dir/?api=1&destination=41,29&travelmode=walking");
});

test("parent navigation URL keeps valid stop and origin coordinates", () => {
  assert.equal(
    buildWalkNavigationUrl({ lat: "41.015", lng: "28.979" }, { lat: 41.01, lng: 28.98 }),
    "https://www.google.com/maps/dir/?api=1&origin=41.01,28.98&destination=41.015,28.979&travelmode=walking",
  );
});

test("parent navigation URL rejects out-of-range coordinates", () => {
  assert.equal(buildWalkNavigationUrl({ lat: 91, lng: 29 }, null), "");
  assert.equal(buildWalkNavigationUrl({ lat: 41, lng: 181 }, null), "");
});
