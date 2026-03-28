// backend/scripts/m163check.js
// M16.3: personel konum secici + KVKK veri minimizasyonu contract testleri
// Guncel mantik:
// - gecici adres + koordinat yok => NEEDS_REVIEW
// - haritada secilen/gecirilen koordinat + manual override => OK
// - Step ilerlerken adres/telefon temizlenebilir; kalici esas veri lat/lon'dur

import {
  banner,
  step,
  assertOk,
  reqJson,
  loginFirst,
} from "./_harness.js";

async function main() {
  banner("M16.3 CHECK: Personel Konum Secici + KVKK Veri Minimizasyonu");

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

  banner("M16.3: seed temporary address-only state");
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
  assertOk(prep.ok, "PUT location temporary address ok");
  step(`prepared geoStatus=${prep.json?.item?.geoStatus ?? "?"}`);
  assertOk(String(prep.json?.item?.geoStatus) === "NEEDS_REVIEW", "temporary address state is NEEDS_REVIEW");

  banner("M16.3: list NEEDS_REVIEW");
  const list1 = await reqJson("GET", "/api/company/personels?geoStatus=NEEDS_REVIEW", {
    token: companyToken,
  });
  assertOk(list1.ok, "GET company/personels ok");
  const items1 = list1.json?.items ?? [];
  assertOk(Array.isArray(items1), "items array");
  const found1 = items1.some((p) => Number(p?.id) === Number(personelId));
  assertOk(found1, "created personel is in NEEDS_REVIEW list");

  banner("M16.3: pick coordinates and mark OK");
  const put = await reqJson("PUT", `/api/company/personels/${personelId}/location`, {
    token: companyToken,
    body: { lat: 41.035, lng: 28.99, geoManualOverride: true, geoStatus: "OK" },
  });
  assertOk(put.ok, "PUT location ok");
  step(`updated geoStatus=${put.json?.item?.geoStatus ?? "?"}`);
  assertOk(String(put.json?.item?.geoStatus) === "OK", "geoStatus is OK");

  banner("M16.3: list NEEDS_REVIEW after coordinates");
  const list2 = await reqJson("GET", "/api/company/personels?geoStatus=NEEDS_REVIEW", {
    token: companyToken,
  });
  assertOk(list2.ok, "GET company/personels ok (after coords)");
  const items2 = list2.json?.items ?? [];
  const found2 = items2.some((p) => Number(p?.id) === Number(personelId));
  assertOk(!found2, "personel removed from NEEDS_REVIEW list after coordinates");

  banner("M16.3: clear temporary phone + address");
  const cleared = await reqJson("POST", "/api/company/personels/bulk-clear", {
    token: companyToken,
    body: { ids: [personelId], fields: ["phone", "address"] },
  });
  assertOk(cleared.ok, "bulk clear phone+address ok");

  banner("M16.3: verify lat/lon kept and temporary fields cleared");
  const list3 = await reqJson("GET", `/api/company/personels?q=${encodeURIComponent(fullName)}&take=20`, {
    token: companyToken,
  });
  assertOk(list3.ok, "GET company/personels ok (final)");
  const items3 = list3.json?.items ?? [];
  const item3 = items3.find((p) => Number(p?.id) === Number(personelId));
  assertOk(!!item3, "created personel is present in final list");
  assertOk(String(item3?.homeAddress || "") === "", "temporary address cleared");
  assertOk(String(item3?.phone || "") === "", "temporary phone cleared");
  assertOk(Number.isFinite(Number(item3?.homeLat)) && Number.isFinite(Number(item3?.homeLng)), "lat/lon kept after cleanup");
  assertOk(String(item3?.geoStatus) === "OK", "geoStatus stays OK after cleanup");

  banner("M16.3: final NEEDS_REVIEW list remains clean");
  const list4 = await reqJson("GET", "/api/company/personels?geoStatus=NEEDS_REVIEW", {
    token: companyToken,
  });
  assertOk(list4.ok, "GET company/personels ok (final review)");
  const items4 = list4.json?.items ?? [];
  const found4 = items4.some((p) => Number(p?.id) === Number(personelId));
  assertOk(!found4, "personel stays out of NEEDS_REVIEW after KVKK cleanup");

  console.log("\nOK M163CHECK PASS");
}

main().catch((e) => {
  console.error(`FAIL M163CHECK FAIL: ${e?.message ?? e}`);
  process.exit(1);
});
