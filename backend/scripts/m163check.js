// backend/scripts/m163check.js
// M16.3: geocode review + manual override contract testleri
// Guncel geoState mantigina gore:
// - adres yok + koordinat yok => FAILED
// - adres var + koordinat yok => NEEDS_REVIEW
// - manual override + coords => OK

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

  banner("M16.3: create personel");
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

  banner("M16.3: seed address-only geo state (NEEDS_REVIEW)");
  const prep = await reqJson("PUT", `/api/company/personels/${personelId}/location`, {
    token: companyToken,
    body: {
      homeAddress: `Test Address ${uniq}`,
      lat: null,
      lng: null,
      geoManualOverride: false,
      geoStatus: "NEEDS_REVIEW",
    },
  });
  assertOk(prep.ok, "PUT location address-only ok");
  step(`prepared geoStatus=${prep.json?.item?.geoStatus ?? "?"}`);
  assertOk(String(prep.json?.item?.geoStatus) === "NEEDS_REVIEW", "address-only state is NEEDS_REVIEW");

  banner("M16.3: list NEEDS_REVIEW");
  const list1 = await reqJson("GET", "/api/company/personels?geoStatus=NEEDS_REVIEW", {
    token: companyToken,
  });
  assertOk(list1.ok, "GET company/personels ok");
  const items1 = list1.json?.items ?? [];
  assertOk(Array.isArray(items1), "items array");
  const found1 = items1.some((p) => Number(p?.id) === Number(personelId));
  assertOk(found1, "created personel is in NEEDS_REVIEW list");

  banner("M16.3: manual override PUT location");
  const put = await reqJson("PUT", `/api/company/personels/${personelId}/location`, {
    token: companyToken,
    body: { lat: 41.035, lng: 28.99, geoManualOverride: true, geoStatus: "OK" },
  });
  assertOk(put.ok, "PUT location ok");
  step(`updated geoStatus=${put.json?.item?.geoStatus ?? "?"}`);
  assertOk(String(put.json?.item?.geoStatus) === "OK", "geoStatus is OK");

  banner("M16.3: list NEEDS_REVIEW after fix");
  const list2 = await reqJson("GET", "/api/company/personels?geoStatus=NEEDS_REVIEW", {
    token: companyToken,
  });
  assertOk(list2.ok, "GET company/personels ok (after)");
  const items2 = list2.json?.items ?? [];
  const found2 = items2.some((p) => Number(p?.id) === Number(personelId));
  assertOk(!found2, "personel removed from NEEDS_REVIEW list");

  console.log("\nOK M163CHECK PASS");
}

main().catch((e) => {
  console.error(`FAIL M163CHECK FAIL: ${e?.message ?? e}`);
  process.exit(1);
});
