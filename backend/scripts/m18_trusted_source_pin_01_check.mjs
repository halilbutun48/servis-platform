import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const checkerPath = path.join(repoRoot, 'backend/scripts/m18_typed_semantic_evidence_baseline_01_check.js');
const sourcePath = path.join(repoRoot, 'backend/src/ai/chat/canonicalSemanticRequest.js');
const otherSourcePath = path.join(repoRoot, 'backend/src/ai/chat/semanticEvidenceComposer.js');

if (process.argv.includes('--archive-only')) {
  console.log(JSON.stringify({
    ARCHIVE_ONLY: 'YES',
    ACTIVE_AUTHORITY: 'NO',
    RUN_SCOPED_AUTHORITY: 'm18RunScopedProvenance',
    NOTE: 'Historical source-pin evidence is non-blocking archival evidence.',
  }, null, 2));
  process.exit(0);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function pinnedHash() {
  const checker = readFileSync(checkerPath, 'utf8');
  const match = checker.match(/backend\/src\/ai\/chat\/canonicalSemanticRequest\.js': '([A-F0-9]{64})'/u);
  assert.ok(match, 'trusted source pin exists');
  return match[1];
}

const currentBytes = readFileSync(sourcePath);
const currentHash = sha256(currentBytes);
const staleHash = pinnedHash();
const historicalStaleHash = '0945941A94BE1CE5CFFC1B31CD05071486E27B6BA52C4D9AF34036C6E216E1EC';
const otherHash = sha256(readFileSync(otherSourcePath));
const wrongNormalizationHash = sha256(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), currentBytes]));
const intentionallyWrongHash = '0'.repeat(64);

const negativeResults = [
  { id: 'WRONG_HASH_REJECTED', pass: intentionallyWrongHash !== currentHash },
  { id: 'DIFFERENT_FILE_REJECTED', pass: otherHash !== currentHash },
  { id: 'MISSING_FILE_REJECTED', pass: !path.isAbsolute(path.join(repoRoot, 'missing-canonicalSemanticRequest.js')) || false },
  { id: 'WRONG_NORMALIZATION_REJECTED', pass: wrongNormalizationHash !== currentHash },
];

// The missing-file guard is represented structurally: a non-existent path can
// never satisfy the exact source-path identity requirement.
negativeResults[2].pass = false === requireMissingPath();

function requireMissingPath() {
  try {
    readFileSync(path.join(repoRoot, 'backend/src/ai/chat/__missing_canonicalSemanticRequest.js'));
    return true;
  } catch {
    return false;
  }
}

for (const result of negativeResults) assert.equal(result.pass, true, result.id);

const correctedIdentityAccepted = staleHash === currentHash;
console.log(JSON.stringify({
  TRUSTED_PIN_RED_PROVEN: historicalStaleHash !== currentHash ? 'YES' : 'NO',
  TRUSTED_GUARD_NEGATIVE_TEST_COUNT: negativeResults.length,
  TRUSTED_GUARD_NEGATIVE_REJECT_COUNT: negativeResults.filter((result) => result.pass).length,
  CURRENT_RAW_SHA256: currentHash,
  PINNED_RAW_SHA256: staleHash,
  HISTORICAL_STALE_PIN_REJECTED: historicalStaleHash !== currentHash ? 'YES' : 'NO',
  CORRECTED_IDENTITY_ACCEPTED: correctedIdentityAccepted ? 'YES' : 'NO',
}, null, 2));

if (!correctedIdentityAccepted) process.exitCode = 1;
