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
  'check:uxsuperadminoverviewcleanup01',
  'check:uxsuperadminlabelpolish01',
  'check:uxsuperadminlivemonitoring01',
  'check:uxsuperadminauditpanel01',
  'check:uxsuperadminqualitypanel01',
  'check:uxsuperadmincommercialflow01',
  'check:uxsuperadminfielddispatchdiscovery01',
  'check:uxsuperadminfieldacceptancecenter01',
  'check:cop01e',
  'check:cop02a',
  'check:cop02b',
  'check:cop03a',
  'check:cop03afix01',
  'check:cop03afix02',
  'check:cop03b',
  'check:cop03c',
  'check:cop03cfix01',
  'check:uxkvkk01',
  'check:docsstate01',
  'check:e2esmoke01',
  'check:fieldlaunch01',
  'check:cop03cfix02',
  'check:cop04afix03',
  'check:cop04afix04',
  'check:cop03cfix03',
  'check:cop04a',
  'check:cop04afix02',
  'check:cop04afix01',
  'check:cop04b',
  'check:cop04bfix01',
  'check:cop04bfix02',
  'check:cop04bfix03',
  'check:cop04bfix04',
  'check:cop04bfix05',
  'check:cop04bfix06',
  'check:cop04bfix07',
  'check:cop04bfix08',
  'check:uxcopilotsmartchips01',
  'check:uxcopilotpersona01',
  'check:uxcopilotterminal01',
  'check:uxseferabilauncher01',
  'check:copliveaccept01',
  'check:boardingops01a',
  'check:etasanity01',
  'check:etaosrm01',
  'check:etaosrm02',
  'check:uxcollapsiblepanels01',
  'check:uxpanelstructure02',
  'check:uxpanelinventory02a',
  'check:uxpanelstructure02b',
  'check:uxroomvehiclestelematicsfix',
  'check:uxroomopspaneltabs01',
  'check:uxroomopsrelationshippolish01',
  'check:uxroomshiftstabs01',
  'check:uxschoolorganizationpanels01',
  'check:uxcompanyshiftstabs01',
  'check:uxcompanyopspaneltabs01',
  'check:uxcompanyqualitytabs01',
  'check:uxcompanypanelsfinalpolish01',
  'check:uxcompanypanelssmoke01',
  'check:uxpaneltabsfix01',
  'check:uxlivemaptabsfix01',
    'check:uxlivemaptabssimplify01',
    'check:uxpanelreality02c',
    'check:uxpanelrealitycleanup02d',
  'check:uxpanellayoutwidth02cfix01',
  'check:uxpanellayoutwidth02cfix02',
  'check:uxpanellayoutwidth02cfix03',
  'check:uxnav01',
  'check:uxdensity01',
  'check:finaluxsmoke01',
  'check:livetrackingfinal01',
  'check:driverflowfinal01',
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


