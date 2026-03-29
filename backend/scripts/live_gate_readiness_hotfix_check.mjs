import fs from "fs";
import path from "path";

const root = process.argv[2] || process.cwd();

function must(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(needle)) {
    throw new Error(`${label} missing: ${needle}`);
  }
  console.log(`OK ${label}`);
}

function mustNot(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (text.includes(needle)) {
    throw new Error(`${label} should not include: ${needle}`);
  }
  console.log(`OK ${label}`);
}

must("web/src/panels/superadmin/ObservabilityPanel.jsx", "Canlı İzleme", "observability title");
must("web/src/panels/superadmin/ObservabilityPanel.jsx", "İzlenen olay türleri", "observability list section");
must("web/src/panels/superadmin/ObservabilityPanel.jsx", "/api/observability/event-types", "observability event types api");
mustNot("web/src/panels/superadmin/ObservabilityPanel.jsx", "M59 Gözlemleme Merkezi", "observability old title");

must("web/src/panels/superadmin/PilotLaunchGatePanel.jsx", "Sahaya Çıkış Kontrolü", "pilot gate title");
must("web/src/panels/superadmin/PilotLaunchGatePanel.jsx", "/api/pilot-launch-gate/decision-template", "pilot gate decision api");
must("web/src/panels/superadmin/PilotLaunchGatePanel.jsx", "/api/field-acceptance/session-template", "pilot gate acceptance api");
must("web/src/panels/superadmin/PilotLaunchGatePanel.jsx", "Karar özeti", "pilot gate decision summary");
mustNot("web/src/panels/superadmin/PilotLaunchGatePanel.jsx", "M65 Pilot Launch Gate", "pilot gate old title");

console.log("PASS live_gate_readiness_hotfix_check");
