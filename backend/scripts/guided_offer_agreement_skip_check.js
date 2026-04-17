import fs from "fs";
import path from "path";

function mustInclude(file, needle, label) {
  const txt = fs.readFileSync(file, "utf8");
  if (!txt.includes(needle)) {
    throw new Error(`MISSING:${label}`);
  }
  console.log(`OK ${label}`);
}

const root = process.cwd();
const actions = path.join(root, "..", "web", "src", "panels", "company", "guidedPlanModalActions.js");
const modal = path.join(root, "..", "web", "src", "panels", "company", "GuidedPlanModal.jsx");
const sections = path.join(root, "..", "web", "src", "panels", "company", "guidedPlanModalSections.jsx");
const cards = path.join(root, "..", "web", "src", "panels", "company", "guidedPlanModalCards.jsx");

console.log("=== Guided offer agreement skip check ===");
mustInclude(actions, 'info.code === "AGREEMENT_BLOCKED_ROOMS"', 'action catches agreement-blocked error');
mustInclude(actions, 'allBlocked:', 'action returns allBlocked flag');
mustInclude(modal, 'setOfferOutcome("agreement_covered")', 'modal sets agreement-covered outcome');
mustInclude(modal, "aktif sözleşme kapsamında", 'modal info message');
mustInclude(sections, 'offerOutcome={offerOutcome}', 'sections pass offer outcome');
mustInclude(cards, 'offerOutcome === "agreement_covered"', 'cards render agreement-covered completion');
console.log("=== GUIDED OFFER AGREEMENT SKIP CHECK PASS ===");
