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
  'check:qltpaybridge01',
  'check:seferscore01',
  'check:roadmaplockaimarketplace01',
  'check:publiclanding01',
  'check:publiclandingplatformfirst01',
  'check:leadcapture01',
  'check:onboardingreview01',
  'check:agreementsourceshiftlineage01',
  'check:marketplacefreetooperate01',
  'check:pay01e',
  'check:paysafe01',
  'check:web01a',
  'check:web01b',
  'check:uxsuperadminoverviewcleanup01',
  'check:uxsuperadminpanelclarity01',
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
  'check:seferabiterminalhumanize01',
  'check:copliveaccept01',
  'check:boardingops01a',
  'check:bugrouteimpactpreviewbutton01',
  'check:uxrouteimpactpreviewcompact01',
  'check:uxcontractconversionopsbridgeclarity01',
  'check:shiftdispatchapprovalfix01',
  'check:boardingchangerequestentry01',
  'check:uiactionwiringaudit01',
  'check:boardingops01b',
  'check:boardingops01c',
  'check:routechangefinal01',
  'check:dynamicsavings01',
  'check:scriptharnessconsolidation01',
  'check:authstepupdevtoggle01',
  'check:authstepupproviderlocaldefault01',
  'check:docsbrandcleanup01',
  'check:etasanity01',
  'check:etaosrm01',
  'check:etaosrm02',
  'check:uxcollapsiblepanels01',
  'check:uxpanelstructure02',
  'check:uxpanelinventory02a',
  'check:uxpanelstructure02b',
  'check:uxroomvehiclestelematicsfix',
  'check:roomvehicledriveruppercase01',
  'check:uxroompanelclarity01',
  'check:uxroomopspaneltabs01',
  'check:uxroomopsrelationshippolish01',
  'check:uxroomshiftstabs01',
  'check:uxschoolorganizationpanels01',
  'check:uxcompanyshiftstabs01',
  'check:uxcompanymobileactionclarity01',
  'check:uxcompanyopspaneltabs01',
  'check:uxcompanyqualitytabs01',
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
  'check:uxlivepanelsmokeaudit01',
  'check:uxlivepanelpremiumsmoke01',
  'check:uxparentpersonelliveerrorclarity01',
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
