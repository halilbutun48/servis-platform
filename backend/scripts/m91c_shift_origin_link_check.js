import fs from "fs";
import path from "path";

function must(cond, msg) {
  if (!cond) throw new Error(`ASSERT_FAIL: ${msg}`);
  console.log(`OK ${msg}`);
}

const root = path.resolve(process.cwd(), "..");
const utilFile = path.join(root, "web/src/utils/agreementOriginLink.js");
const wizardFile = path.join(root, "web/src/panels/company/AgreementWizard.jsx");
const panelFile = path.join(root, "web/src/panels/company/AgreementsPanel.jsx");

const util = fs.readFileSync(utilFile, "utf8");
const wizard = fs.readFileSync(wizardFile, "utf8");
const panel = fs.readFileSync(panelFile, "utf8");

console.log("=== M91C shift origin link check ===");
must(util.includes("linkAgreementsToOrigin"), "agreement origin link util");
must(util.includes("getAgreementOrigins"), "agreement origin read util");
must(wizard.includes("linkAgreementsToOrigin(createdIds, launchPrefill)"), "wizard links created agreements to shift origin");
must(wizard.includes("createdFromShift"), "wizard returns created from shift detail");
must(panel.includes("handleWizardCreated"), "agreements panel handles wizard created detail");
must(panel.includes("Kaynak vardiya bağlantısı"), "agreements panel source shift card");
must(panel.includes("Kaynak Vardiyaya Git") || panel.includes("Kaynak vardiyaya Git"), "agreements panel source shift action");
must(panel.includes("Kaynak vardiya #"), "agreements panel source shift badge in list");
console.log("=== M91C SHIFT ORIGIN LINK CHECK PASS ===");
