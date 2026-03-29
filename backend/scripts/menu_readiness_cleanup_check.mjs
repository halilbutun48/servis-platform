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
    if (!txt.includes(needle)) {
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
  if (txt.includes("useSession")) {
    console.error(`STILL_HAS_useSession ${rel}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log("PASS menu_readiness_cleanup_check");
