// backend/scripts/m163check.js
// M16.3: geocode review + manual override contract testleri
// - GET /api/company/personels?geoStatus=NEEDS_REVIEW
// - PUT /api/company/personels/:id/location -> geoStatus OK

import {
  banner,
  step,
  assertOk,
  reqJson,
  loginFirst,
} from "./_harness.js";

async function main() {
  banner("M16.3 CHECK: Geo Review + Manual Override");

  const companyToken = await loginFirst("company");
  const uniq = String(Date.now()).slice(-6);

  // 1) create a personel (geoStatus NEEDS_REVIEW by default)
  banner("M16.3: create personel (NEEDS_REVIEW)");
  const email = `m163.personel.${uniq}@demo.local`;
  const fullName = `M163 Personel ${uniq}`;
  const phone = `9055${uniq}77`;

  const created = await reqJson("POST", "/api/personels", {
    token: companyToken,
    body: { email, password: "demo123", fullName, phone },
  });
  assertOk(created.ok, "personel created");
  const personelId = created.json?.id ?? created.json?.personel?.id;
  assertOk(!!personelId, "personelId present");

  // 2) list NEEDS_REVIEW
  banner("M16.3: list NEEDS_REVIEW");
  const list1 = await reqJson("GET", "/api/company/personels?geoStatus=NEEDS_REVIEW", {
    token: companyToken,
  });
  assertOk(list1.ok, "GET company/personels ok");
  const items1 = list1.json?.items ?? [];
  assertOk(Array.isArray(items1), "items array");
  const found1 = items1.some((p) => Number(p?.id) === Number(personelId));
  assertOk(found1, "created personel is in NEEDS_REVIEW list");

  // 3) manual override -> OK
  banner("M16.3: manual override PUT location");
  const put = await reqJson("PUT", `/api/company/personels/${personelId}/location`, {
    token: companyToken,
    body: { lat: 41.035, lng: 28.99, geoManualOverride: true, geoStatus: "OK" },
  });
  assertOk(put.ok, "PUT location ok");
  step(`updated geoStatus=${put.json?.item?.geoStatus ?? "?"}`);
  assertOk(String(put.json?.item?.geoStatus) === "OK", "geoStatus is OK");

  // 4) list NEEDS_REVIEW again -> should NOT include this personel
  banner("M16.3: list NEEDS_REVIEW after fix");
  const list2 = await reqJson("GET", "/api/company/personels?geoStatus=NEEDS_REVIEW", {
    token: companyToken,
  });
  assertOk(list2.ok, "GET company/personels ok (after)");
  const items2 = list2.json?.items ?? [];
  const found2 = (items2 || []).some((p) => Number(p?.id) === Number(personelId));
  assertOk(!found2, "personel removed from NEEDS_REVIEW list");

  console.log("\nOK M163CHECK PASS");
}

main().catch((e) => {
  console.error(`FAIL M163CHECK FAIL: ${e?.message ?? e}`);
  process.exit(1);
});

