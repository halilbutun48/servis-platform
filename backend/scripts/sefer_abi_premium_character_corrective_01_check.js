#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`FAIL ${message}`);
  console.log(`PASS ${message}`);
};

const pkg = JSON.parse(read("package.json"));
const avatar = read("web/src/components/copilot/SeferAbiAvatar.jsx");
const drawer = read("web/src/components/copilot/FloatingCopilotDrawer.jsx");
const full = read("web/src/panels/shared/CopilotPanel.jsx");
const css = read("web/src/index.css");
const doc = read("docs/SEFER_ABI_PREMIUM_CHARACTER_CORRECTIVE_01.md");

console.log("=== SEFER ABI PREMIUM CHARACTER CORRECTIVE-01 CHECK ===");
must(pkg.scripts["check:seferabipremiumcharactercorrective01"] === "node backend/scripts/sefer_abi_premium_character_corrective_01_check.js", "package exposes the static corrective guard");
must(pkg.scripts["smoke:seferabipremiumcharactercorrective01"] === "node backend/scripts/sefer_abi_premium_character_corrective_01_browser.mjs", "package exposes the real browser corrective smoke");
assertProductExtensionsIncludes("check:seferabipremiumcharactercorrective01", "product extensions registry includes premium character corrective", productExtensionsChecks.map((step) => step.script));

must(avatar.includes("<svg viewBox=\"0 0 64 64\""), "character is a scalable inline SVG");
must(avatar.includes("useId") && avatar.includes("backdropId"), "inline SVG gradient identifiers are unique per character instance");
must(!/from ["'](?:lottie|rive|@rive|@lottiefiles)/i.test(avatar), "no new mascot runtime dependency is introduced");
for (const state of ["idle", "hover", "listening", "thinking", "responding", "attention", "success", "approval-required"]) {
  must(avatar.includes(`\"${state}\"`), `controlled avatar state exists: ${state}`);
}
must(avatar.includes("mature-human") && avatar.includes("data-sefer-abi-state"), "avatar exposes stable persona and internal state hooks");

must(drawer.includes("SeferAbiAvatar") && drawer.includes("launcherInteraction"), "floating launcher uses the canonical premium character");
must(drawer.includes("drawerAvatarState") && drawer.includes("selectionNeedsApproval"), "existing interaction and approval context drive visual state");
must(drawer.includes("map-grid-") && drawer.includes("leaflet-marker-icon") && drawer.includes("data-primary-cta"), "map-safe placement searches live obstacles");
must(drawer.includes("Tam ekranda aç") && drawer.includes("writeCopilotSharedState"), "quick/full shared context architecture remains intact");
must(!drawer.includes("copilotMascotHair") && !drawer.includes("copilotMascotFace"), "legacy generic CSS mascot is removed from the launcher");
must(full.includes("SeferAbiAvatar") && full.includes("copilotWorkspaceIdentity"), "full workspace uses the same decorative character identity");

must(css.includes(".seferAbiAvatar--thinking") && css.includes(".seferAbiAvatar--responding") && css.includes(".seferAbiAvatar--approval-required"), "premium state styling is present");
must(css.includes("@media (prefers-reduced-motion: reduce)") && css.includes("animation: none !important"), "reduced-motion styling disables non-essential motion");
must(!/animation\s*:[^;]*(?:bounce|pulse)/i.test(css), "no intrusive bounce/pulse animation is present");
must(css.includes(".copilotFab--map-safe") && css.includes("env(safe-area-inset-bottom)"), "launcher retains safe-area and map positioning hooks");
must(doc.includes("REAL_PLAYWRIGHT_RENDERED_BROWSER") && doc.includes("PENDING_HUMAN_REVIEW"), "owner document records real evidence and pending human review");

console.log("=== SEFER ABI PREMIUM CHARACTER CORRECTIVE-01 CHECK PASS ===");
