import test from "node:test";
import assert from "node:assert/strict";
import { createShiftOffersSchema, routeEvidenceSchema } from "./schemas.js";

test("boş kilometre kanıtı kaynak ve gerekçe ile birlikte kabul edilir", () => {
  const result = routeEvidenceSchema.safeParse({
    emptyDistanceKm: "12,5".replace(",", "."),
    emptyDistanceEvidenceRef: "GARAGE-2026-09-301",
    emptyDistanceReason: "Garajdan alma mesafesi rota kaydında doğrulandı.",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.emptyDistanceKm, 12.5);
});

test("boş kilometre kaynağı olmadan doğrulanmış değer kabul edilmez", () => {
  const result = routeEvidenceSchema.safeParse({ emptyDistanceKm: 12.5 });
  assert.equal(result.success, false);
});

test("boş kilometre boş bırakıldığında rota kaydı gereksiz yere bloke edilmez", () => {
  const result = routeEvidenceSchema.safeParse({ pattern: "ONE_WAY" });
  assert.equal(result.success, true);
});

test("teklif notu boş bırakıldığında null olarak kabul edilir", () => {
  const result = createShiftOffersSchema.safeParse({ roomIds: [1], amountCompany: 900000, noteCompany: null });
  assert.equal(result.success, true);
  assert.equal(result.data.noteCompany, null);
});
