#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const checkerPath = path.join(repoRoot, 'backend/scripts/m18_typed_semantic_evidence_baseline_01_check.js');
const checkerSource = readFileSync(checkerPath, 'utf8');

if (process.argv.includes('--archive-only')) {
  console.log(JSON.stringify({
    ARCHIVE_ONLY: 'YES',
    ACTIVE_AUTHORITY: 'NO',
    RUN_SCOPED_AUTHORITY: 'm18RunScopedProvenance',
    NOTE: 'Historical source-pin table checks are non-blocking archival evidence.',
  }, null, 2));
  process.exit(0);
}

const tableMatch = checkerSource.match(/const APPROVED_RUNTIME_FILES = Object\.freeze\(\{(?<body>[\s\S]*?)\}\);/u);
assert.ok(tableMatch, 'APPROVED_RUNTIME_FILES table is present');

const pinnedEntries = [...tableMatch.groups.body.matchAll(/'(?<file>[^']+)': '(?<sha>[A-F0-9]{64})'/gu)]
  .map(({ groups }) => ({ file: groups.file, sha: groups.sha }));
assert.equal(pinnedEntries.length, 19, 'complete table has 19 entries');

function rawSha(file) {
  return createHash('sha256').update(readFileSync(path.join(repoRoot, file))).digest('hex').toUpperCase();
}

const currentHashes = Object.fromEntries(pinnedEntries.map(({ file }) => [file, rawSha(file)]));
const pinnedMap = Object.fromEntries(pinnedEntries.map(({ file, sha }) => [file, sha]));

function validatePinMap(candidateMap, files = currentHashes) {
  const candidateFiles = Object.keys(candidateMap).sort();
  const approvedFiles = Object.keys(pinnedMap).sort();
  if (candidateFiles.join('\n') !== approvedFiles.join('\n')) return false;
  return approvedFiles.every((file) => {
    const sha = candidateMap[file];
    return existsSync(path.join(repoRoot, file)) && files[file] === sha && /^[A-F0-9]{64}$/u.test(sha);
  });
}

function clone(value) {
  return { ...value };
}

const firstFile = pinnedEntries[0].file;
const secondFile = pinnedEntries[1].file;
const wrongHash = '0'.repeat(64);
const historicalStaleMap = {
  ...currentHashes,
  'backend/src/ai/chat/canonicalSemanticContext.js': '91C13AE54C0CB82D2FD72A7C489A2C8ABCB003E1C64246C791FF0E664AF06450',
  'backend/src/ai/chat/conversationRouting.js': '68F5426E47A311C43A4965466BC5E6AD806D1CCD7209100A5CA3A4685BE69E46',
  'backend/src/ai/chat/intentRouter.js': 'CB7A43A97BEFF4146324B6722AE502484433D61D8779110FBCC754FF719A0363',
  'backend/src/ai/chat/semanticIntentPlanner.js': '9A06629BC3146B0975D06F55F341BDB66BAA94F9FA3F753457134A3A682A373D',
  'backend/src/ai/service.js': '585367E2E582F4764E9E61ECE678A3C1D41FBA1299EDEA2D4BEA323BCDD0CFBC',
  'backend/src/ai/chat/helpComposer.js': 'D719292192240821B31C52536B36E304F837330DF0C4D0A247B4B3995438C1AE',
};
const swapped = clone(currentHashes);
[swapped[firstFile], swapped[secondFile]] = [swapped[secondFile], swapped[firstFile]];
const missingFile = clone(currentHashes);
delete missingFile[firstFile];
const unknownFile = clone(currentHashes);
unknownFile['backend/src/ai/__unapproved__.js'] = currentHashes[firstFile];
const missingSource = clone(currentHashes);
missingSource['backend/src/ai/__missing__.js'] = wrongHash;
const mutated = clone(currentHashes);
mutated[firstFile] = `${currentHashes[firstFile].slice(0, -1)}${currentHashes[firstFile].endsWith('0') ? '1' : '0'}`;

const negativeResults = [
  ['historical stale table rejected', validatePinMap(historicalStaleMap)],
  ['wrong hash rejected', validatePinMap({ ...currentHashes, [firstFile]: wrongHash })],
  ['swapped paths rejected', validatePinMap(swapped)],
  ['missing table entry rejected', validatePinMap(missingFile)],
  ['unknown file rejected', validatePinMap(unknownFile)],
  ['missing source rejected', validatePinMap(missingSource)],
  ['mutated file rejected', validatePinMap(mutated)],
];

const rejected = negativeResults.filter(([, accepted]) => accepted === false).length;
const currentMatchCount = pinnedEntries.filter(({ file, sha }) => sha === currentHashes[file]).length;
const currentMismatchCount = pinnedEntries.length - currentMatchCount;
const mode = process.argv.includes('--red') ? 'RED' : 'GREEN';

console.log(JSON.stringify({
  status: mode === 'RED' ? (currentMismatchCount > 0 && rejected === negativeResults.length ? 'EXPECTED_RED' : 'FAIL')
    : (currentMismatchCount === 0 && rejected === negativeResults.length ? 'PASS' : 'FAIL'),
  TRUSTED_TABLE_RED_PROVEN: currentMismatchCount > 0 && rejected === negativeResults.length ? 'YES' : 'NO',
  TRUSTED_TABLE_NEGATIVE_TEST_COUNT: negativeResults.length,
  TRUSTED_TABLE_NEGATIVE_REJECT_COUNT: rejected,
  TRUSTED_PIN_TABLE_ENTRY_COUNT: pinnedEntries.length,
  TRUSTED_PIN_MATCH_COUNT: currentMatchCount,
  TRUSTED_PIN_MISMATCH_COUNT: currentMismatchCount,
}, null, 2));

if (mode === 'RED') {
  assert.ok(currentMismatchCount > 0, 'the pre-reconciliation table must fail closed');
  process.exitCode = 1;
} else {
  assert.equal(currentMismatchCount, 0, 'the reconciled table must match every current file');
}
assert.equal(rejected, negativeResults.length, 'all negative controls reject');
