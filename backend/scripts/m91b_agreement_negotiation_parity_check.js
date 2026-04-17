import fs from "node:fs";
import path from "node:path";

function mustContain(file, needle, label) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    throw new Error(`MISSING ${label} in ${path.relative(process.cwd(), file)}`);
  }
  console.log(`OK ${label}`);
}

console.log("=== M91B agreement negotiation parity check ===");

const root = process.cwd();
mustContain(path.join(root, "src/routes/agreements.js"), '"/:id/company-counter"', "company counter route");
mustContain(path.join(root, "src/routes/agreements.js"), '"/:id/reject"', "room reject route");
mustContain(path.join(root, "src/routes/agreements.js"), "AGREEMENT_COMPANY_COUNTERED", "company counter notification");
mustContain(path.join(root, "src/routes/agreements.js"), "AGREEMENT_REJECTED", "room rejected notification");
mustContain(path.join(root, "../web/src/panels/company/AgreementsPanel.jsx"), "Yeni Teklif Ver", "company counter button");
mustContain(path.join(root, "../web/src/panels/company/AgreementsPanel.jsx"), "/company-counter", "company counter api call");
mustContain(path.join(root, "../web/src/panels/room/AgreementsPanel.jsx"), "Reddet", "room reject button");
mustContain(path.join(root, "../web/src/panels/room/AgreementsPanel.jsx"), "/reject", "room reject api call");

console.log("=== M91B CHECK PASS ===");
