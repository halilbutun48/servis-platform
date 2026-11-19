import test from "node:test";
import assert from "node:assert/strict";

import { humanizeUserFacingText, userFacingStatusLabel } from "./terminology.js";

test("geçerli koordinat durumu kullanıcıya tanımsız gösterilmez", () => {
  assert.equal(userFacingStatusLabel("OK"), "Hazır");
});

test("kullanıcıya görünen teknik finans ve kayıt ifadelerini doğal Türkçeye çevirir", () => {
  const visible = humanizeUserFacingText("Sözleşme ID 9 • APPROVED • Güven: HIGH • NOT_PROVEN • amount • source shift • scn_demo123");

  assert.equal(visible, "Sözleşme #9 • Onaylandı • Güven seviyesi: yüksek • Henüz doğrulanmadı • Tutar • Kaynak vardiya • seçili plan senaryosu");
  assert.doesNotMatch(visible, /Sözleşme ID|APPROVED|Güven:\s*HIGH|NOT_PROVEN|\bamount\b|source shift|scn_/i);
});

test("tahmin etiketi tutardan ayrılır", () => {
  assert.equal(humanizeUserFacingText("3.463,99 ₺Tahmin"), "3.463,99 ₺ · Tahmin");
});

test("araç ve sürücü adlarındaki M kodları kullanıcı verisi olarak korunur", () => {
  const visible = humanizeUserFacingText("M18 DRİVER B • 34 M18 002");

  assert.equal(visible, "M18 DRİVER B • 34 M18 002");
});
