#!/usr/bin/env node

/*
 * Bounded PRE-#18 acceptance for the current Sefer Abi / Actionable Events
 * backend-context inputs. This check deliberately consumes the canonical
 * policy owner and real state/read-model functions; it does not recreate
 * authorization or product business logic.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as currentHeadPolicy from "./lib/currentHeadScopePolicy.js";
import {
  canonicalStateKey,
  clearCanonicalConversationState,
  commitCanonicalConversationState,
  getCanonicalConversationState,
} from "../src/ai/chat/canonicalConversationState.js";
import { normalizeVisibleReplyFragment } from "../src/ai/chat/conversationTaskStateShared.js";
import {
  ACTIONABLE_EVENT_SOURCE_ID,
  publishActionableCurrentScreenSnapshot,
  readActionableCurrentScreenSnapshot,
  roleHomePathForUser,
} from "../src/services/actionableEvents.js";
import { buildDashboardBulkBundle, getDashboardBulkBundleNames } from "../src/services/dashboardBulk.js";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const redMode = process.argv.includes("--red");

const ACCEPTED_INPUTS = Object.freeze([
  "backend/src/routes/ai.js",
  "backend/src/services/dashboardBulk.js",
  "backend/src/ai/chat/conversationTaskStateShared.js",
]);

const sourcePath = (relativePath) => path.join(repoRoot, relativePath);
const source = (relativePath) => fs.readFileSync(sourcePath(relativePath), "utf8");
const sha256 = (relativePath) => createHash("sha256").update(fs.readFileSync(sourcePath(relativePath))).digest("hex").toUpperCase();

const cases = [];
function test(name, run, { expectedRed = false } = {}) {
  cases.push({ name, run, expectedRed });
}

function canonicalUser(overrides = {}) {
  return {
    id: 8101,
    role: "COMPANY",
    companyKind: "SCHOOL",
    companyId: 9101,
    roomId: null,
    sessionVersion: 4,
    ...overrides,
  };
}

function snapshot(id) {
  return {
    source: ACTIONABLE_EVENT_SOURCE_ID,
    generatedAt: "2026-09-16T00:00:00.000Z",
    role: "COMPANY",
    tenant: { companyId: 9101, roomId: null },
    events: [{ id }],
    summary: { total: 1 },
  };
}

for (const input of ACCEPTED_INPUTS) {
  test(`RED policy registers ${input} through the single backend-context acceptance family`, () => {
    const entries = currentHeadPolicy.CURRENT_HEAD_APPROVED_SEFER_ABI_BACKEND_CONTEXT_ACCEPTANCE || [];
    const matches = entries.filter((entry) => entry?.path === input);
    assert.equal(matches.length, 1, `${input} must have one canonical current-head acceptance record`);
    assert.equal(matches[0].sha256, sha256(input), `${input} policy identity must match the reviewed current file`);
    assert.equal(matches[0].owner, "PRE_18_SEFER_ABI_ACTIONABLE_EVENTS_BACKEND_CONTEXT_ACCEPTANCE");
  }, { expectedRed: true });
}

test("AI route keeps company kind lookup on the authenticated company and passes a server auth session", () => {
  const aiRoute = source("backend/src/routes/ai.js");
  assert.match(aiRoute, /authRequired\(\),\s*requireStepUp\("SUPER_ADMIN", "ROOM"\)/u);
  assert.match(aiRoute, /where:\s*\{\s*id:\s*Number\(user\.companyId\)\s*\}/u);
  assert.match(aiRoute, /const copilotUser = await buildCopilotUserContext\(req\.user\)/u);
  assert.match(aiRoute, /user:\s*copilotUser/u);
  assert.match(aiRoute, /authSessionId:\s*\[req\.auth\?\.userId, req\.auth\?\.iat, req\.auth\?\.sv/u);
  assert.doesNotMatch(aiRoute, /req\.body\?\.(?:companyId|authSessionId)|parsed\.data\.(?:companyId|authSessionId)/u);
});

test("AI route current diff adds only a caller-scoped read projection and session context", () => {
  const diff = gitDiff("backend/src/routes/ai.js");
  assert.match(diff, /prisma\.company\.findUnique/u);
  assert.match(diff, /user:\s*copilotUser/u);
  assert.match(diff, /authSessionId:/u);
  assert.doesNotMatch(diff, /\.(?:create|createMany|update|updateMany|delete|deleteMany|upsert|executeRaw)\s*\(/u);
});

test("canonical conversation state separates every server-owned authorization dimension", () => {
  const base = canonicalUser();
  const key = canonicalStateKey(base, "server-session-A");
  const variants = [
    canonicalUser({ id: 8102 }),
    canonicalUser({ role: "ROOM", companyKind: "", companyId: null, roomId: 7101 }),
    canonicalUser({ companyKind: "ORGANIZATION" }),
    canonicalUser({ companyId: 9102 }),
    canonicalUser({ roomId: 7102 }),
    canonicalUser({ sessionVersion: 5 }),
  ];
  for (const variant of variants) assert.notEqual(canonicalStateKey(variant, "server-session-A"), key);
  assert.notEqual(canonicalStateKey(base, "server-session-B"), key);
});

test("canonical conversation state drops a prior state when the same server session changes identity", () => {
  const session = "pre18-security-context-reuse";
  const first = canonicalUser({ id: 8201, companyId: 9201 });
  const second = canonicalUser({ id: 8202, companyId: 9202 });
  clearCanonicalConversationState(first, session);
  commitCanonicalConversationState({
    user: first,
    authSessionId: session,
    screenContext: { path: "/company", selectedEntityType: "shift", selectedEntityId: 77 },
    message: "ilk kullanıcı",
    payload: { reply: "yalnız ilk kullanıcı", semanticPlan: { dialogueTopic: "PRODUCT", family: "ENTITY_LOOKUP" } },
  });
  const secondState = getCanonicalConversationState({ user: second, authSessionId: session, screenContext: { path: "/company" } });
  assert.equal(secondState.recentMessages.length, 0);
  assert.equal(secondState.selectedEntityId, null);
  clearCanonicalConversationState(second, session);
});

test("actionable current-screen snapshots stay separate for user, kind, company, room, and role contexts", async () => {
  const company = canonicalUser({ id: 8301, companyId: 9301, companyKind: "COMPANY", roomId: null });
  const school = canonicalUser({ id: 8301, companyId: 9301, companyKind: "SCHOOL", roomId: null });
  const room = canonicalUser({ id: 8301, role: "ROOM", companyKind: "", companyId: null, roomId: 7301 });
  const secondCompany = canonicalUser({ id: 8302, companyId: 9302, companyKind: "COMPANY", roomId: null });
  const contexts = [[company, "company-A"], [school, "school-A"], [room, "room-A"], [secondCompany, "company-B"]];
  for (const [user, id] of contexts) publishActionableCurrentScreenSnapshot({ user, path: roleHomePathForUser(user), snapshot: snapshot(id) });
  for (const [user, id] of contexts) {
    const current = await readActionableCurrentScreenSnapshot({ user, path: roleHomePathForUser(user) });
    assert.equal(current.events[0].id, id);
    assert.equal(current.snapshotOrigin, "SERVER_PUBLISHED_UI_READ_MODEL");
  }
});

test("dashboard bulk exposes actionable events only through its canonical bundle and rejects an unauthorized role before loading", async () => {
  assert.ok(getDashboardBulkBundleNames().includes("actionable-events"));
  await assert.rejects(
    buildDashboardBulkBundle("actionable-events", { id: 8401, role: "UNAUTHORIZED" }),
    (error) => error?.code === "DASHBOARD_BUNDLE_FORBIDDEN" && error?.status === 403,
  );
});

test("dashboard actionable event wiring retains canonical role policy, scoped read model, and no mutation diff", () => {
  const dashboard = source("backend/src/services/dashboardBulk.js");
  const diff = gitDiff("backend/src/services/dashboardBulk.js");
  assert.match(dashboard, /"actionable-events": \["SUPER_ADMIN", "ROOM", "COMPANY", "DRIVER", "PERSONEL", "PARENT"\]/u);
  assert.match(dashboard, /const snapshot = await buildActionableEventsForUser\(user\)/u);
  assert.match(dashboard, /publishActionableCurrentScreenSnapshot\(\{ user, path: roleHomePathForUser\(user\), snapshot \}\)/u);
  assert.match(dashboard, /scope:\s*scopeOf\(user\)/u);
  assert.doesNotMatch(diff, /\.(?:create|createMany|update|updateMany|delete|deleteMany|upsert|executeRaw)\s*\(/u);
});

test("actionable event canonical source retains authenticated ownership queries for company, room, driver, personel, and parent", () => {
  const actionable = source("backend/src/services/actionableEvents.js");
  assert.match(actionable, /where:\s*\{ id: companyId \}/u);
  assert.match(actionable, /where:\s*\{ roomId, status:/u);
  assert.match(actionable, /driver\.findFirst\(\{ where: \{ userId: integer\(user\?\.id\) \|\| -1 \}/u);
  assert.match(actionable, /personel\.findFirst\(\{ where: \{ userId: integer\(user\?\.id\) \|\| -1 \}/u);
  assert.match(actionable, /parentChild\.findMany\(\{ where: \{ parentUserId \}/u);
  assert.match(actionable, /where:\s*\{ personelId: \{ in: childIds \}, status: "OPEN" \}/u);
});

test("visible reply normalization changes only redundant or edge bullet presentation", () => {
  assert.equal(normalizeVisibleReplyFragment("• • Kullanıcı onayı gerekir •"), "Kullanıcı onayı gerekir");
  assert.equal(normalizeVisibleReplyFragment("Kullanıcı onayı gerekir"), "Kullanıcı onayı gerekir");
  assert.match(normalizeVisibleReplyFragment("• Kritik işlem için kullanıcı onayı gerekir •"), /kullanıcı onayı gerekir/iu);
});

function gitDiff(relativePath) {
  return execFileSync("git", ["diff", "--", relativePath], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

let passes = 0;
const failures = [];
for (const item of cases) {
  try {
    await item.run();
    passes += 1;
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures.push({ name: item.name, expectedRed: item.expectedRed, message: error?.message || String(error) });
    console.log(`FAIL ${item.name}: ${error?.message || String(error)}`);
  }
}

const expectedRedFailures = failures.filter((failure) => failure.expectedRed);
const unexpectedFailures = failures.filter((failure) => !failure.expectedRed);
if (redMode) {
  console.log(`RED_TEST_COUNT=${ACCEPTED_INPUTS.length}`);
  console.log(`RED_OBSERVED_COUNT=${expectedRedFailures.length}`);
  console.log(`UNEXPECTED_RED_COUNT=${unexpectedFailures.length}`);
  if (expectedRedFailures.length !== ACCEPTED_INPUTS.length || unexpectedFailures.length) process.exitCode = 1;
} else {
  console.log(`GREEN_TEST_COUNT=${cases.length}`);
  console.log(`GREEN_TEST_PASS=${passes}`);
  console.log(`GREEN_TEST_FAIL=${failures.length}`);
  if (failures.length) process.exitCode = 1;
}
