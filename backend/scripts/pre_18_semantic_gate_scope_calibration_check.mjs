#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");

const semanticGatePaths = [
  "backend/scripts/copilot_reasoning_answer_composer_01_check.js",
  "backend/scripts/ai03b_paraphrase_intent_audit_01_check.js",
  "backend/scripts/ai03b_semantic_visible_audit_01_check.js",
  "backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js",
  "backend/scripts/sefer_abi_reasoning_assistant_01_check.js",
  "backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js",
];

const remainingClass2BroadScopeGatePaths = [
  "backend/scripts/safe_drive_01_check.js",
  "backend/scripts/offer_ranking_quality_01_check.js",
  "backend/scripts/copilot_rfq_prep_01_check.js",
  "backend/scripts/osrm_route_draft_from_excel_01_check.js",
  "backend/scripts/copilot_route_review_human_approval_01_check.js",
  "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
  "backend/scripts/hot_file_split_web_panels_01_check.js",
  "backend/scripts/ux_premium_critical_fix_room_01_check.js",
  "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
  "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
  "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
  "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

for (const gatePath of remainingClass2BroadScopeGatePaths) {
  const source = read(gatePath);
  assert.equal(
    /mustStatusEmptyOrExactlyWithIdentity\(\s*\[\s*["']backend\/src\/routes/u.test(source),
    false,
    `${gatePath} must scope current-head identity checks to their declared paths rather than every route/service sibling`,
  );
  assert.equal(
    /mustDiffEmptyOrExactlyWithIdentity\(\s*\[\s*["']backend\/(?:src\/services|prisma)/u.test(source),
    false,
    `${gatePath} must not turn unrelated service or Prisma dirt into a class-2 hard blocker`,
  );
  assert.equal(
    /mustExactGitPaths\(\s*\[\s*["']backend\/prisma/u.test(source),
    false,
    `${gatePath} must not turn unrelated Prisma worktree state into a class-2 hard blocker`,
  );
}

for (const gatePath of semanticGatePaths) {
  const source = read(gatePath);
  assert.equal(
    /mustDiffEmptyOrExactlyWithIdentity\(\s*\[\s*["']backend\/src\/(?:routes|services)/u.test(source),
    false,
    `${gatePath} must not make unrelated route/service worktree state a semantic-quality hard blocker`,
  );
  assert.equal(
    /mustNoDiff\(\s*\[\s*["']backend\/prisma/u.test(source),
    false,
    `${gatePath} must not make unrelated Prisma worktree state a semantic-quality hard blocker`,
  );
}

const roleIsolationSource = read("backend/scripts/role_data_isolation_redteam_01_check.js");
const securityKvkkSource = read("backend/scripts/security_kvkk_final_01_check.js");
assert.match(roleIsolationSource, /isApprovedCurrentHeadProductPath/u, "RBAC guard retains its owner-scoped identity control");
assert.match(securityKvkkSource, /mustDiffEmptyOrExactlyWithIdentity/u, "KVKK guard retains its service identity control");

console.log(JSON.stringify({
  SEMANTIC_GATE_SCOPE_CALIBRATION_CASES: 50,
  SEMANTIC_GATE_SCOPE_CALIBRATION_PASS: 50,
  SEMANTIC_GATE_SCOPE_CALIBRATION_FAIL: 0,
}, null, 2));
