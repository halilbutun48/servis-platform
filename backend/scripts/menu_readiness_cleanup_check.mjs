
function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
import fs from "fs";
const checks = [
  ["web/src/layout/NavDock.jsx", ["Sistem Standartları", "Ticari Akış"]],
  ["web/src/panels/superadmin/ObservabilityPanel.jsx", ["Canlı Sağlık ve Risk Özeti", "PanelKvkkHint"]],
  ["web/src/panels/superadmin/FieldAcceptanceCenter.jsx", ["Saha Kabul Merkezi", "Checklist özeti"]],
  ["web/src/panels/superadmin/PilotLaunchGatePanel.jsx", ["Sahaya Çıkış Kontrolü", "Son karar"]],
  ["web/src/panels/superadmin/SsotAlignmentPanel.jsx", ["Sistem Standartları", "/api/ssot-alignment/manifest"]],
  ["web/src/panels/superadmin/CommercialCorePanel.jsx", ["Ticari Akış Özeti", "Talep, teklif, pazarlık ve sözleşme geçişini tek akışta özetler."]],
  ["web/src/panels/superadmin/TrustQualityPanel.jsx", ["Güven ve Kalite Özeti", "sağlayıcı kalite sinyalini"]],
  ["web/src/panels/superadmin/NaturalCopilotPanel.jsx", ["Yardımcı Merkezi", "geri bildirim seçeneklerini"]],
];
let ok = true;
for (const [rel, needles] of checks) {
  const txt = fs.readFileSync(rel, "utf8");
  for (const needle of needles) {
    if (!includesText(txt, needle)) {
      console.error(`MISSING ${needle} in ${rel}`);
      ok = false;
    }
  }
}
for (const rel of [
  "web/src/panels/superadmin/SsotAlignmentPanel.jsx",
  "web/src/panels/superadmin/CommercialCorePanel.jsx",
  "web/src/panels/superadmin/TrustQualityPanel.jsx",
  "web/src/panels/superadmin/NaturalCopilotPanel.jsx",
]) {
  const txt = fs.readFileSync(rel, "utf8");
  if (includesText(txt, "useSession")) {
    console.error(`STILL_HAS_useSession ${rel}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log("PASS menu_readiness_cleanup_check");
