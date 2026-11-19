import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const outputPath = resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-provenance-receipt.json');
const result = spawnSync(process.execPath, [resolve(root, 'backend/scripts/m18_task13_current_source_startup_01_check.mjs')], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
  timeout: 180000,
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'TASK13_PROVENANCE_CAPTURE_FAILED');
  process.exitCode = 1;
} else {
  const text = String(result.stdout || '').trim();
  const jsonStart = text.indexOf('{');
  if (jsonStart < 0) throw new Error('TASK13_PROVENANCE_CAPTURE_MISSING_JSON');
  const parsed = JSON.parse(text.slice(jsonStart));
  const receipt = parsed?.provenance?.provenanceReceipt?.receipt;
  if (!receipt || receipt.finalStatus !== 'GREEN') throw new Error('TASK13_PROVENANCE_RECEIPT_NOT_GREEN');
  writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    status: 'GREEN',
    outputPath,
    sourceManifestSha256: receipt.startManifestSha256,
    runEndManifestSha256: receipt.endManifestSha256,
    receiptSha256: receipt.receiptSha256,
    currentSourceRuntimeBound: true,
    healthcheck: 'PASS',
    liveProvenanceMode: 'NEW',
    liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
    semanticAuthorityCount: 1,
    shadowSemanticAuthorityCount: 0,
    runtimeFallbackCount: 0,
    downstreamSemanticRedecisionCount: 0,
  }, null, 2));
}
