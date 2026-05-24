#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(cond, label) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function has(text, needle) {
  return String(text || "").includes(String(needle));
}

function main() {
  console.log("=== DOCS SSOT BRAND ARTIFACT CLEANUP 01 CHECK ===");

  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const cleanupDoc = read("docs/DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md");
  const readme = read("README.md");
  const docsReadme = read("docs/README.md");
  const agents = read("docs/AGENTS.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
  const webIndex = read("web/index.html");
  const favicon = read("web/public/vardis-favicon.svg");
  const logo = read("web/public/vardis-logo.svg");
  const brandMark = read("web/src/components/BrandMark.jsx");
  const brandConfig = read("web/src/config/brand.js");
  const bubble = read("web/src/components/copilot/ChatMessageBubble.jsx");
  const quality = read("web/src/components/copilot/ChatQualitySummary.jsx");

  must(has(pkg, '"check:docsbrandcleanup01": "node backend/scripts/docs_ssot_brand_artifact_cleanup_01_check.js"'), "package.json exposes check:docsbrandcleanup01");
  must(has(runner, "check:docsbrandcleanup01"), "product extensions runner includes docs brand cleanup");
  must(has(verifyChain, "check:docsbrandcleanup01"), "verify chain includes docs brand cleanup");
  must(has(guide, "DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01"), "milestone guide mentions cleanup milestone");
  must(has(guide, "check:docsbrandcleanup01"), "milestone guide exposes cleanup check");

  must(has(cleanupDoc, "# DOCS / SSOT / Brand / Artifact Cleanup 01"), "cleanup doc title exists");
  must(has(cleanupDoc, "## 1) Özet"), "cleanup doc has summary section");
  must(has(cleanupDoc, "## 2) Docs Registry"), "cleanup doc has docs registry section");
  must(has(cleanupDoc, "## 3) Brand Registry"), "cleanup doc has brand registry section");
  must(has(cleanupDoc, "## 4) Script Reference Registry"), "cleanup doc has script reference section");
  must(has(cleanupDoc, "## 5) Overlay / Artifact Registry"), "cleanup doc has overlay/artifact section");
  must(has(cleanupDoc, "## 6) Removed Items"), "cleanup doc has removed items section");
  must(has(cleanupDoc, "## 7) Needs Review"), "cleanup doc has needs review section");
  must(has(cleanupDoc, "## 8) Final SSOT Recommendation"), "cleanup doc has final recommendation section");
  must(has(cleanupDoc, "docs/overlays/"), "cleanup doc mentions overlay history");
  must(has(cleanupDoc, "docs/_archive/"), "cleanup doc mentions archive history");
  must(has(cleanupDoc, "cop_04b_fix_06_live_drawer_context_bridge_check.js"), "cleanup doc keeps removed alias history");
  must(has(cleanupDoc, "ux_company_panel_smoke_01_check.js"), "cleanup doc keeps removed alias history 2");
  must(has(cleanupDoc, "ux_live_map_tabs_fix_01_check.js"), "cleanup doc keeps removed alias history 3");

  must(has(readme, "SeferPakt, servis tedarikini buluşturan"), "README has SeferPakt product definition");
  must(has(readme, "[KABUL_KRITERLERI_10_10.md](docs/KABUL_KRITERLERI_10_10_VARDIS.md)"), "README uses generic historical label");
  must(has(readme, "Docs/brand cleanup audit: `docs/DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md`"), "README links cleanup audit");

  must(has(docsReadme, "**[KABUL_KRITERLERI_10_10.md](./KABUL_KRITERLERI_10_10_VARDIS.md)**"), "docs index uses generic historical label");
  must(has(docsReadme, "DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md"), "docs index links cleanup audit");

  must(has(agents, "Ürün adı: `SeferPakt`"), "AGENTS brand is SeferPakt");
  must(has(primer, "Marka dili: **SeferPakt**"), "PRIMER brand is SeferPakt");
  must(has(primer, "Workflow: `.github/workflows/vardis_verification_visibility.yml` (historical/internal identifier)."), "PRIMER keeps historical/internal workflow note");
  must(has(toolsPrimer, "SeferPakt, okul/öğrenci/veli"), "tools primer has SeferPakt product framing");
  must(has(toolsPrimer, "Konumlama: servis tedariki + sözleşme + operasyon."), "tools primer has updated positioning");
  must(has(brandConfig, 'export const BRAND_NAME = "SeferPakt";'), "brand config keeps SeferPakt");

  must(has(webIndex, "<title>SeferPakt</title>"), "browser title is SeferPakt");
  must(has(favicon, 'aria-label="SeferPakt"'), "favicon aria label is SeferPakt");
  must(has(favicon, "<title>SeferPakt</title>"), "favicon title is SeferPakt");
  must(has(logo, 'aria-label="SeferPakt"'), "logo aria label is SeferPakt");
  must(has(logo, "<title>SeferPakt</title>"), "logo title is SeferPakt");
  must(has(brandMark, 'alt={BRAND_NAME}'), "brand mark uses config alt text");

  must(has(bubble, 'const FEEDBACK_KEY = "vardis:copilot:chat-feedback";'), "copilot feedback key stays historical/internal");
  must(has(bubble, 'const FEEDBACK_LOG_KEY = "vardis:copilot:chat-feedback-log";'), "copilot feedback log key stays historical/internal");
  must(has(quality, "const FEEDBACK_LOG_KEY = 'vardis:copilot:chat-feedback-log';"), "quality summary feedback key stays historical/internal");

  console.log("=== DOCS SSOT BRAND ARTIFACT CLEANUP 01 CHECK PASS ===");
}

main();
