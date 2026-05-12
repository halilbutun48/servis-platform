#!/usr/bin/env node

import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const steps = [
  'check:op04',
  'check:qlt04b',
  'check:pay01e',
  'check:paysafe01',
  'check:web01a',
  'check:web01b',
  'check:cop01e',
  'check:cop02a',
  'check:cop02b',
  'check:cop03a',
  'check:cop03afix01',
  'check:cop03afix02',
  'check:uxkvkk01',
  'check:docsstate01',
];

function runStep(scriptName) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', scriptName], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  console.log('=== PRODUCT EXTENSIONS CHECK CHAIN ===');
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Steps: ${steps.join(', ')}`);

  for (const [index, scriptName] of steps.entries()) {
    console.log(`\n--- ${String(index + 1).padStart(2, '0')}/${steps.length} ${scriptName} ---`);
    const code = await runStep(scriptName);
    if (code !== 0) {
      console.log(`FAIL ${scriptName}`);
      process.exit(code ?? 1);
    }
  }

  console.log('\n=== PRODUCT EXTENSIONS CHECK CHAIN PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
