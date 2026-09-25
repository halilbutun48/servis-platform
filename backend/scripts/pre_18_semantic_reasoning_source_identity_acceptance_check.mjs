#!/usr/bin/env node

/*
 * Exact source-identity acceptance for the bounded PRE-#18 semantic-priority
 * corrective. This consumes the single current-head policy owner; it does not
 * create a separate source-identity registry.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CURRENT_HEAD_APPROVED_SEFER_ABI_SEMANTIC_REASONING_ACCEPTANCE } from "./lib/currentHeadScopePolicy.js";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "../..");
const requiredPaths = [
  "backend/src/ai/service.js",
  "backend/src/ai/chat/canonicalSemanticRequest.js",
  "backend/src/ai/chat/conversationRouting.js",
  "backend/src/ai/chat/semanticIntentPlanner.js",
  "backend/src/ai/chat/intentRouter.js",
  "backend/src/ai/chat/helpComposer.js",
  "backend/src/ai/chat/conversationTaskStateClarifiers.js",
  "backend/src/ai/chat/conversationTaskStateBuilders.js",
  "backend/src/ai/chat/seferAbiReasoningAssistant.js",
  "backend/src/ai/chat/conversationOperationHealthEngine.js",
];
const expectedOwnerFor = (relPath) => (
  relPath === "backend/src/ai/chat/semanticIntentPlanner.js"
    ? "PRE_18_PERSONEL_LOCATION_SIGNAL_SEMANTIC_VOCABULARY_REGRESSION_CORRECTIVE_01"
    : "PRE_18_SEFER_ABI_SEMANTIC_PRIORITY_ACCEPTANCE"
);
const failures = [];
let cases = 0;

function sourceSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function check(condition, label) {
  cases += 1;
  if (condition) {
    process.stdout.write(`PASS ${label}\n`);
    return;
  }
  failures.push(label);
  process.stdout.write(`FAIL ${label}\n`);
}

const entries = CURRENT_HEAD_APPROVED_SEFER_ABI_SEMANTIC_REASONING_ACCEPTANCE;
check(Array.isArray(entries), "single policy owner exports semantic-reasoning identity family");
check(entries.length === requiredPaths.length, "semantic-reasoning acceptance has the exact bounded source count");

const byPath = new Map(entries.map((entry) => [entry.path, entry]));
for (const relPath of requiredPaths) {
  const entry = byPath.get(relPath);
  check(Boolean(entry), `semantic-reasoning acceptance includes ${relPath}`);
  check(entry?.owner === expectedOwnerFor(relPath), `semantic-reasoning acceptance has bounded owner for ${relPath}`);
  check(entry?.sha256 === sourceSha256(relPath), `semantic-reasoning acceptance exact identity matches ${relPath}`);
}

check(entries.every((entry) => requiredPaths.includes(entry.path)), "semantic-reasoning acceptance contains no unrelated source");
process.stdout.write(`SEMANTIC_REASONING_SOURCE_IDENTITY_CASES=${cases}\n`);
process.stdout.write(`SEMANTIC_REASONING_SOURCE_IDENTITY_PASS=${cases - failures.length}\n`);
process.stdout.write(`SEMANTIC_REASONING_SOURCE_IDENTITY_FAIL=${failures.length}\n`);
if (failures.length > 0) process.exitCode = 1;
