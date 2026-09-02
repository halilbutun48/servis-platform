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
const widgetState = read("web/src/components/copilot/SeferAbiWidgetState.js");
const avatarAssetPath = path.join(root, "web/src/assets/sefer-abi-premium-avatar.png");
const drawer = read("web/src/components/copilot/FloatingCopilotDrawer.jsx");
const full = read("web/src/panels/shared/CopilotPanel.jsx");
const css = read("web/src/index.css");
const doc = read("docs/SEFER_ABI_PREMIUM_CHARACTER_CORRECTIVE_01.md");

console.log("=== SEFER ABI PREMIUM CHARACTER CORRECTIVE-01 CHECK ===");
must(pkg.scripts["check:seferabipremiumcharactercorrective01"] === "node backend/scripts/sefer_abi_premium_character_corrective_01_check.js", "package exposes the static corrective guard");
must(pkg.scripts["smoke:seferabipremiumcharactercorrective01"] === "node backend/scripts/sefer_abi_premium_character_corrective_01_browser.mjs", "package exposes the real browser corrective smoke");
assertProductExtensionsIncludes("check:seferabipremiumcharactercorrective01", "product extensions registry includes premium character corrective", productExtensionsChecks.map((step) => step.script));

must(fs.existsSync(avatarAssetPath), "premium character asset exists in the product workspace");
const avatarAssetBytes = fs.readFileSync(avatarAssetPath);
must(avatarAssetBytes.length > 0 && avatarAssetBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "premium character asset is a valid PNG");
must(avatarAssetBytes[25] === 6, "premium character asset preserves an RGBA alpha channel");
must(avatar.includes("premiumAvatarAsset") && avatar.includes("seferAbiAvatar__image"), "character uses the canonical premium raster asset");
must(!/from ["'](?:lottie|rive|@rive|@lottiefiles)/i.test(avatar), "no new mascot runtime dependency is introduced");
for (const state of ["idle", "hover-focus", "listening", "thinking", "responding", "result-ready", "attention", "approval-required"]) {
  must(widgetState.includes(`\"${state}\"`), `controlled avatar state exists: ${state}`);
}
must(widgetState.includes("SEFER_ABI_WIDGET_STATES") && widgetState.includes("resolveSeferAbiWidgetState"), "avatar owns the canonical visual state model");
must(avatar.includes("normalizeSeferAbiWidgetState") && avatar.includes("mature-human") && avatar.includes("data-sefer-abi-state"), "avatar exposes stable persona and internal state hooks");

must(drawer.includes("SeferAbiAvatar") && drawer.includes("launcherInteraction"), "floating launcher uses the canonical premium character");
must(drawer.includes("drawerAvatarState") && drawer.includes("resolveSeferAbiWidgetState") && drawer.includes("responsePhase") && drawer.includes("selectionNeedsApproval"), "existing interaction and assistant lifecycle drive visual state");
must(drawer.includes("map-grid-") && drawer.includes("leaflet-marker-icon") && drawer.includes("data-primary-cta"), "map-safe placement searches live obstacles");
must(drawer.includes("Tam ekranda aç") && drawer.includes("writeCopilotSharedState"), "quick/full shared context architecture remains intact");
must(!drawer.includes("copilotMascotHair") && !drawer.includes("copilotMascotFace"), "legacy generic CSS mascot is removed from the launcher");
must(full.includes("SeferAbiAvatar") && full.includes("copilotWorkspaceIdentity") && full.includes("fullAvatarState") && full.includes("resolveSeferAbiWidgetState"), "full workspace uses the same lifecycle-aware character identity");

must(css.includes(".seferAbiAvatar--hover-focus") && css.includes(".seferAbiAvatar--thinking") && css.includes(".seferAbiAvatar--responding") && css.includes(".seferAbiAvatar--result-ready") && css.includes(".seferAbiAvatar--approval-required") && css.includes("seferAbiAvatar__stateMark"), "premium live-widget state styling is present");
must(css.includes("@media (prefers-reduced-motion: reduce)") && css.includes("animation: none !important"), "reduced-motion styling disables non-essential motion");
must(!/animation\s*:[^;]*(?:bounce|pulse)/i.test(css), "no intrusive bounce/pulse animation is present");
must(css.includes(".copilotFab--map-safe") && css.includes("env(safe-area-inset-bottom)"), "launcher retains safe-area and map positioning hooks");
must(doc.includes("REAL_PLAYWRIGHT_RENDERED_BROWSER") && doc.includes("PENDING_HUMAN_REVIEW") && doc.includes("ephemeral"), "owner document records live state evidence and pending human review");

console.log("=== SEFER ABI PREMIUM CHARACTER CORRECTIVE-01 CHECK PASS ===");
