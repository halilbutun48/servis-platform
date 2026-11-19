import test from "node:test";
import assert from "node:assert/strict";
import { getRoleNavigation, isPostLoginEntryPath } from "./roleNavigation.js";

function labelsFor(items = []) {
  return items.flatMap((section) => (section?.items || []).map((item) => item.label));
}

test("alıcı roller normal menüden ortak iki finans bölümüne erişir", () => {
  for (const me of [
    { role: "COMPANY", companyKind: "COMPANY" },
    { role: "COMPANY", companyKind: "SCHOOL" },
    { role: "COMPANY", companyKind: "ORGANIZATION" },
  ]) {
    const navigation = getRoleNavigation(me);
    const labels = labelsFor(navigation.sections);
    assert.ok(labels.includes("Bütçe ve Servis Maliyeti"));
    assert.ok(labels.includes("Ticari Akış"));
    assert.ok(labels.includes("Hizmet Değerlendirme"));
    assert.ok(navigation.sections.some((section) => section.items.some((item) => item.path.endsWith("/financial-operations"))));
  }
});

test("SCHOOL normal menüsü planlama girişini ortak adıyla gösterir", () => {
  const labels = labelsFor(getRoleNavigation({ role: "COMPANY", companyKind: "SCHOOL" }).sections);
  assert.ok(labels.includes("Planlama Merkezi"));
  assert.ok(!labels.includes("Okul Merkezi"));
});

test("ROOM canlı takip hedefine normal operasyon menüsünden erişir", () => {
  const navigation = getRoleNavigation({ role: "ROOM" });
  const operation = navigation.sections.find((section) => section.title === "OPERASYON");
  assert.ok(operation?.items.some((item) => item.label === "Canlı Takip" && item.path === "/room/map"));
  assert.ok(!navigation.advanced.some((item) => item.label === "Canlı Takip" && item.path === "/room/map"));
});

test("başarılı girişten sonra giriş hash'i rol ana ekranına yönlendirme için geçerli giriş yoludur", () => {
  assert.equal(isPostLoginEntryPath("/login"), true);
  assert.equal(isPostLoginEntryPath("/"), true);
  assert.equal(isPostLoginEntryPath("/room"), false);
});
