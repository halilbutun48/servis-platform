// backend/scripts/m51_53_backfill_verification_check.js
// M51-M53 backfill verification:
// - M52 import summary + needs review + geo fix
// - M53 stop generation + route preview
// - organization/gezi endpoint reachability or gate presence

import {
  banner,
  step,
  assertOk,
  must,
  reqJson,
  loginFirst,
} from "./_harness.js";

function plusMinutesIso(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function numberFrom(...values) {
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function listFrom(...values) {
  for (const v of values) {
    if (Array.isArray(v)) return v;
  }
  return [];
}

async function main() {
  banner("M51-M53 BACKFILL VERIFICATION CHECK");

  const companyToken = await loginFirst("company");
  must("company login ok", !!companyToken);

  const uniq = String(Date.now()).slice(-6);
  const createShift = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: {
      startAt: plusMinutesIso(30),
      endAt: plusMinutesIso(120),
      status: "DRAFT",
    },
  });
  assertOk(createShift.ok, "draft shift create ok");
  const shiftId = Number(createShift.json?.id || createShift.json?.shift?.id || 0);
  must("draft shiftId present", shiftId > 0);

  try {
    banner("M52: import contract + summary");
    const imp = await reqJson("POST", `/api/shifts/${shiftId}/people/import`, {
      token: companyToken,
      body: {
        fileName: `m51_53_backfill_${uniq}.xlsx`,
        mode: "REPLACE",
        rows: [
          {
            fullName: `M52 OK ${uniq}`,
            phone: `90541${uniq}`,
            address: "Denizli Test Merkez 1",
            lat: 37.7765,
            lng: 29.0864,
          },
          {
            fullName: `M52 Review ${uniq}`,
            phone: `90542${uniq}`,
            address: "Denizli Test Merkez 2",
          },
        ],
      },
    });
    assertOk(imp.ok, "people import ok");
    assertOk(Number(imp.json?.summary?.acceptedRows || 0) >= 2, "import accepted rows >= 2");
    assertOk(Number(imp.json?.summary?.needsReviewRows || 0) >= 1, "import produced needs review row");

    const people = await reqJson("GET", `/api/shifts/${shiftId}/people`, { token: companyToken });
    assertOk(people.ok, "shift people list ok");
    const items = people.json?.items || [];
    assertOk(Array.isArray(items) && items.length >= 2, "shift people count >= 2");
    const reviewPerson = items.find((x) => String(x?.phone || "") === `90542${uniq}`);
    must("review person present", Number(reviewPerson?.id || 0) > 0);
    assertOk(String(reviewPerson?.geoStatus || "") === "NEEDS_REVIEW", "review person is NEEDS_REVIEW");

    banner("M52: Geo Review manual fix");
    const reviewList = await reqJson("GET", "/api/company/personels?geoStatus=NEEDS_REVIEW", { token: companyToken });
    assertOk(reviewList.ok, "company geo review list ok");
    const needsReviewItems = reviewList.json?.items || [];
    assertOk(needsReviewItems.some((x) => Number(x?.id) === Number(reviewPerson.id)), "review person appears in geo review list");

    const fix = await reqJson("PUT", `/api/company/personels/${reviewPerson.id}/location`, {
      token: companyToken,
      body: { lat: 37.7812, lng: 29.0911, geoManualOverride: true, geoStatus: "OK" },
    });
    assertOk(fix.ok, "geo review fix ok");
    assertOk(String(fix.json?.item?.geoStatus || "") === "OK", "geo review fix sets OK");

    banner("M53: stop generation + route preview");
    const gen = await reqJson("POST", `/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=250`, {
      token: companyToken,
      body: {},
    });
    assertOk(gen.ok, "stops generate ok");
    const generatedStopCount = numberFrom(
      gen.json?.stopCount,
      gen.json?.stopsCount,
      gen.json?.summary?.stopCount,
      gen.json?.summary?.stopsCount,
    );
    assertOk(generatedStopCount >= 1, "stops generated >= 1");

    const preview = await reqJson("GET", `/api/shifts/${shiftId}/route-preview`, { token: companyToken });
    assertOk(preview.ok, "route preview ok");
    assertOk(preview.json?.ok === true, "route preview payload ok=true");

    const previewStops = listFrom(preview.json?.stops, preview.json?.summary?.stops);
    const previewPathPoints = listFrom(preview.json?.path?.points, preview.json?.pathPoints);
    const previewSource = String(preview.json?.path?.source || preview.json?.source || "");
    const totalPassengerCount = numberFrom(
      preview.json?.summary?.totalPassengerCount,
      preview.json?.summary?.passengerCount,
    );

    assertOk(previewStops.length >= 1, "route preview stops present");
    assertOk(previewPathPoints.length >= 1, "route preview path points present");
    assertOk(totalPassengerCount >= 2, "route preview passenger summary >= 2");
    assertOk(["ESTIMATED", "LEARNED"].includes(previewSource), "route preview source present");

    banner("M53: organization/gezi endpoint reachability");
    const orgPlans = await reqJson("GET", "/api/organization/plans", { token: companyToken });
    const orgRooms = await reqJson("GET", "/api/organization/rooms", { token: companyToken });
    const orgPlansOk = orgPlans.ok || (orgPlans.status === 403 && String(orgPlans.json?.error || "") === "organizationOnly");
    const orgRoomsOk = orgRooms.ok || (orgRooms.status === 403 && String(orgRooms.json?.error || "") === "organizationOnly");
    assertOk(orgPlansOk, "organization plans endpoint reachable or gated");
    assertOk(orgRoomsOk, "organization rooms endpoint reachable or gated");

    console.log("\nOK M51-M53 BACKFILL VERIFICATION CHECK PASS");
  } finally {
    step(`cleanup guided-temp draft shiftId=${shiftId}`);
    await reqJson("DELETE", `/api/shifts/${shiftId}/guided-temp`, { token: companyToken });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
