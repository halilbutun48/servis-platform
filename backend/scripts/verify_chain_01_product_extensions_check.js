import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const slice = haystack.slice(last + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = last + 1 + (match.index || 0);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log('=== VERIFY-CHAIN-01 PRODUCT EXTENSIONS CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const backlog = read('docs/NEXT_BACKLOG_V1.md');

  must(pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', 'package.json exposes check:product-extensions');
  must(pkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"', 'package.json exposes check:verifychain01');
  must(pkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', 'package.json keeps verify:final product extension step');
  must(pkg, '"check:web01a"', 'package.json keeps check:web01a');
  must(pkg, '"check:web01b"', 'package.json keeps check:web01b');
  must(pkg, '"check:uxsuperadminoverviewcleanup01"', 'package.json exposes check:uxsuperadminoverviewcleanup01');
  must(pkg, '"check:uxsuperadminlivemonitoring01"', 'package.json exposes check:uxsuperadminlivemonitoring01');
  must(pkg, '"check:uxsuperadminauditpanel01"', 'package.json exposes check:uxsuperadminauditpanel01');
  must(pkg, '"check:uxsuperadminqualitypanel01"', 'package.json exposes check:uxsuperadminqualitypanel01');
  must(pkg, '"check:uxsuperadmincommercialflow01"', 'package.json exposes check:uxsuperadmincommercialflow01');
  must(pkg, '"check:uxsuperadminfielddispatchdiscovery01"', 'package.json exposes check:uxsuperadminfielddispatchdiscovery01');
  must(pkg, '"check:uxsuperadminfieldacceptancecenter01"', 'package.json exposes check:uxsuperadminfieldacceptancecenter01');
  must(pkg, '"check:paysafe01"', 'package.json keeps check:paysafe01');
  must(pkg, '"check:pay01e"', 'package.json keeps check:pay01e');
  must(pkg, '"check:cop02a"', 'package.json keeps check:cop02a');
  must(pkg, '"check:docsstate01"', 'package.json keeps check:docsstate01');
  must(pkg, '"check:op04"', 'package.json keeps check:op04');
  must(pkg, '"check:qlt04b"', 'package.json keeps check:qlt04b');
  must(pkg, '"check:cop01e"', 'package.json keeps check:cop01e');
  must(pkg, '"check:uxkvkk01"', 'package.json keeps check:uxkvkk01');
  must(pkg, '"check:cop02b"', 'package.json keeps check:cop02b');
  must(pkg, '"check:cop03a"', 'package.json keeps check:cop03a');
  must(pkg, '"check:cop03afix01"', 'package.json keeps check:cop03afix01');
  must(pkg, '"check:cop03afix02"', 'package.json keeps check:cop03afix02');
  must(pkg, '"check:cop03b"', 'package.json keeps check:cop03b');
  must(pkg, '"check:cop03c"', 'package.json keeps check:cop03c');
  must(pkg, '"check:cop03cfix01"', 'package.json keeps check:cop03cfix01');
  must(pkg, '"check:cop03cfix02"', 'package.json keeps check:cop03cfix02');
  must(pkg, '"check:cop04afix03"', 'package.json keeps check:cop04afix03');
  must(pkg, '"check:cop04afix04"', 'package.json keeps check:cop04afix04');
  must(pkg, '"check:cop03cfix03"', 'package.json keeps check:cop03cfix03');
  must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');
  must(pkg, '"check:cop04afix02"', 'package.json keeps check:cop04afix02');
  must(pkg, '"check:cop04afix01"', 'package.json keeps check:cop04afix01');
  must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
  must(pkg, '"check:cop04bfix01"', 'package.json keeps check:cop04bfix01');
  must(pkg, '"check:cop04bfix02"', 'package.json keeps check:cop04bfix02');
  must(pkg, '"check:cop04bfix03"', 'package.json keeps check:cop04bfix03');
  must(pkg, '"check:cop04bfix04"', 'package.json keeps check:cop04bfix04');
  must(pkg, '"check:cop04bfix05"', 'package.json keeps check:cop04bfix05');
  must(pkg, '"check:cop04bfix06"', 'package.json keeps check:cop04bfix06');
  must(pkg, '"check:cop04bfix07"', 'package.json keeps check:cop04bfix07');
  must(pkg, '"check:cop04bfix08"', 'package.json keeps check:cop04bfix08');
  must(pkg, '"check:uxcopilotsmartchips01"', 'package.json keeps check:uxcopilotsmartchips01');
  must(pkg, '"check:uxcopilotpersona01"', 'package.json keeps check:uxcopilotpersona01');
  must(pkg, '"check:uxcopilotterminal01"', 'package.json keeps check:uxcopilotterminal01');
  must(pkg, '"check:uxseferabilauncher01"', 'package.json exposes check:uxseferabilauncher01');
  must(pkg, '"check:copliveaccept01": "node backend/scripts/cop_live_accept_01_check.js"', 'package.json exposes check:copliveaccept01');
  must(pkg, '"check:boardingops01a": "node backend/scripts/boarding_ops_01a_route_impact_preview_check.js"', 'package.json exposes check:boardingops01a');
  must(pkg, '"check:boardingops01b": "node backend/scripts/boarding_ops_01b_apply_accepted_change_check.js"', 'package.json exposes check:boardingops01b');
  must(pkg, '"check:boardingops01c": "node backend/scripts/boarding_ops_01c_driver_route_refresh_check.js"', 'package.json exposes check:boardingops01c');
  must(pkg, '"check:routechangefinal01": "node backend/scripts/route_change_final_01_check.js"', 'package.json exposes check:routechangefinal01');
  must(pkg, '"check:scriptharnessconsolidation01": "node backend/scripts/script_harness_consolidation_01_check.js"', 'package.json exposes check:scriptharnessconsolidation01');
  must(pkg, '"check:docsbrandcleanup01": "node backend/scripts/docs_ssot_brand_artifact_cleanup_01_check.js"', 'package.json exposes check:docsbrandcleanup01');
  must(pkg, '"check:etasanity01"', 'package.json keeps check:etasanity01');
  must(pkg, '"check:etaosrm01"', 'package.json keeps check:etaosrm01');
  must(pkg, '"check:etaosrm02"', 'package.json keeps check:etaosrm02');
  must(pkg, '"check:livetrackingfinal01"', 'package.json keeps check:livetrackingfinal01');
  must(pkg, '"check:driverflowfinal01"', 'package.json keeps check:driverflowfinal01');
  must(pkg, '"check:uxcollapsiblepanels01"', 'package.json keeps check:uxcollapsiblepanels01');
  must(pkg, '"check:uxpanelstructure02"', 'package.json keeps check:uxpanelstructure02');
  must(pkg, '"check:uxpanelinventory02a"', 'package.json keeps check:uxpanelinventory02a');
  must(pkg, '"check:uxpanelstructure02b"', 'package.json keeps check:uxpanelstructure02b');
  must(pkg, '"check:uxroomvehiclestelematicsfix"', 'package.json exposes check:uxroomvehiclestelematicsfix');
  must(pkg, '"check:uxroomopspaneltabs01"', 'package.json exposes check:uxroomopspaneltabs01');
  must(pkg, '"check:uxroomopsrelationshippolish01"', 'package.json exposes check:uxroomopsrelationshippolish01');
  must(pkg, '"check:uxroomshiftstabs01"', 'package.json exposes check:uxroomshiftstabs01');
  must(pkg, '"check:uxschoolorganizationpanels01"', 'package.json exposes check:uxschoolorganizationpanels01');
  must(pkg, '"check:uxcompanyshiftstabs01"', 'package.json exposes check:uxcompanyshiftstabs01');
  must(pkg, '"check:uxcompanyopspaneltabs01"', 'package.json exposes check:uxcompanyopspaneltabs01');
  must(pkg, '"check:uxcompanyqualitytabs01"', 'package.json exposes check:uxcompanyqualitytabs01');
  must(pkg, '"check:uxcompanypanelsfinalpolish01"', 'package.json exposes check:uxcompanypanelsfinalpolish01');
  must(pkg, '"check:uxcompanypanelssmoke01"', 'package.json exposes check:uxcompanypanelssmoke01');
  must(pkg, '"check:uxpaneltabsfix01"', 'package.json keeps check:uxpaneltabsfix01');
  must(pkg, '"check:uxlivemaptabsfix01"', 'package.json exposes check:uxlivemaptabsfix01');
  must(pkg, '"check:uxlivemaptabssimplify01"', 'package.json exposes check:uxlivemaptabssimplify01');
  must(pkg, '"check:uxpanelreality02c"', 'package.json keeps check:uxpanelreality02c');
  must(pkg, '"check:uxpanelrealitycleanup02d"', 'package.json exposes check:uxpanelrealitycleanup02d');
  must(pkg, '"check:uxroomagreementstabs01"', 'package.json exposes check:uxroomagreementstabs01');
  must(pkg, '"check:uxpanellayoutwidth02cfix01"', 'package.json exposes check:uxpanellayoutwidth02cfix01');
  must(pkg, '"check:uxpanellayoutwidth02cfix02"', 'package.json exposes check:uxpanellayoutwidth02cfix02');
  must(pkg, '"check:uxpanellayoutwidth02cfix03"', 'package.json exposes check:uxpanellayoutwidth02cfix03');
  must(pkg, '"check:uxnav01"', 'package.json keeps check:uxnav01');
  must(pkg, '"check:uxdensity01"', 'package.json keeps check:uxdensity01');
  must(pkg, '"check:finaluxsmoke01": "node backend/scripts/final_ux_smoke_01_check.js"', 'package.json exposes check:finaluxsmoke01');
  must(pkg, '"check:e2esmoke01"', 'package.json keeps check:e2esmoke01');
  must(pkg, '"check:fieldlaunch01"', 'package.json keeps check:fieldlaunch01');

  ordered(runner, [
    'check:op04',
    'check:qlt04b',
    'check:pay01e',
    'check:paysafe01',
    'check:web01a',
    'check:web01b',
    'check:uxsuperadminoverviewcleanup01',
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
    'check:boardingops01b',
    'check:boardingops01c',
    'check:routechangefinal01',
    'check:scriptharnessconsolidation01',
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
], 'product extensions runner order');

  must(guide, 'check:product-extensions', 'script guide exposes check:product-extensions');
  must(guide, 'check:verifychain01', 'script guide exposes check:verifychain01');
  must(guide, 'check:cop03a', 'script guide exposes check:cop03a');
  must(guide, 'check:cop03afix01', 'script guide exposes check:cop03afix01');
  must(guide, 'check:cop03afix02', 'script guide exposes check:cop03afix02');
  must(guide, 'check:cop03b', 'script guide exposes check:cop03b');
  must(guide, 'check:cop03c', 'script guide exposes check:cop03c');
  must(guide, 'check:cop03cfix01', 'script guide exposes check:cop03cfix01');
  must(guide, 'check:cop03cfix02', 'script guide exposes check:cop03cfix02');
  must(guide, 'check:cop04afix03', 'script guide exposes check:cop04afix03');
  must(guide, 'check:cop04afix04', 'script guide exposes check:cop04afix04');
  must(guide, 'check:cop03cfix03', 'script guide exposes check:cop03cfix03');
  must(guide, 'check:cop04a', 'script guide exposes check:cop04a');
  must(guide, 'check:cop04afix02', 'script guide exposes check:cop04afix02');
  must(guide, 'check:cop04afix01', 'script guide exposes check:cop04afix01');
  must(guide, 'check:cop04b', 'script guide exposes check:cop04b');
  must(guide, 'check:cop04bfix01', 'script guide exposes check:cop04bfix01');
  must(guide, 'check:cop04bfix02', 'script guide exposes check:cop04bfix02');
  must(guide, 'check:cop04bfix03', 'script guide exposes check:cop04bfix03');
  must(guide, 'check:cop04bfix04', 'script guide exposes check:cop04bfix04');
  must(guide, 'check:cop04bfix05', 'script guide exposes check:cop04bfix05');
  must(guide, 'check:cop04bfix06', 'script guide exposes check:cop04bfix06');
  must(guide, 'check:cop04bfix07', 'script guide exposes check:cop04bfix07');
  must(guide, 'check:cop04bfix08', 'script guide exposes check:cop04bfix08');
  must(guide, 'check:uxcopilotsmartchips01', 'script guide exposes check:uxcopilotsmartchips01');
  must(guide, 'check:uxcopilotpersona01', 'script guide exposes check:uxcopilotpersona01');
  must(guide, 'check:uxcopilotterminal01', 'script guide exposes check:uxcopilotterminal01');
  must(guide, 'UX-SEFER-ABI-LAUNCHER-01', 'script guide mentions UX-SEFER-ABI-LAUNCHER-01');
  must(guide, 'check:uxseferabilauncher01', 'script guide exposes check:uxseferabilauncher01');
  must(guide, 'COP-LIVE-ACCEPT-01', 'script guide mentions COP-LIVE-ACCEPT-01');
  must(guide, 'check:copliveaccept01', 'script guide exposes check:copliveaccept01');
  must(guide, 'UX-SUPERADMIN-OVERVIEW-CLEANUP-01', 'script guide mentions UX-SUPERADMIN-OVERVIEW-CLEANUP-01');
  must(guide, 'check:uxsuperadminoverviewcleanup01', 'script guide exposes check:uxsuperadminoverviewcleanup01');
  must(guide, 'UX-SUPERADMIN-LIVE-MONITORING-01', 'script guide mentions UX-SUPERADMIN-LIVE-MONITORING-01');
  must(guide, 'check:uxsuperadminlivemonitoring01', 'script guide exposes check:uxsuperadminlivemonitoring01');
  must(guide, 'UX-SUPERADMIN-AUDIT-PANEL-01', 'script guide mentions UX-SUPERADMIN-AUDIT-PANEL-01');
  must(guide, 'check:uxsuperadminauditpanel01', 'script guide exposes check:uxsuperadminauditpanel01');
  must(guide, 'UX-SUPERADMIN-QUALITY-PANEL-01', 'script guide mentions UX-SUPERADMIN-QUALITY-PANEL-01');
  must(guide, 'check:uxsuperadminqualitypanel01', 'script guide exposes check:uxsuperadminqualitypanel01');
  must(guide, 'UX-SUPERADMIN-COMMERCIAL-FLOW-01', 'script guide mentions UX-SUPERADMIN-COMMERCIAL-FLOW-01');
  must(guide, 'check:uxsuperadmincommercialflow01', 'script guide exposes check:uxsuperadmincommercialflow01');
  must(guide, 'UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01', 'script guide mentions UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01');
  must(guide, 'check:uxsuperadminfielddispatchdiscovery01', 'script guide exposes check:uxsuperadminfielddispatchdiscovery01');
  must(guide, 'UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01', 'script guide mentions UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01');
  must(guide, 'check:uxsuperadminfieldacceptancecenter01', 'script guide exposes check:uxsuperadminfieldacceptancecenter01');
  must(guide, 'check:etasanity01', 'script guide exposes check:etasanity01');
  must(guide, 'check:etaosrm01', 'script guide exposes check:etaosrm01');
  must(guide, 'check:etaosrm02', 'script guide exposes check:etaosrm02');
  must(guide, 'check:livetrackingfinal01', 'script guide exposes check:livetrackingfinal01');
  must(guide, 'check:driverflowfinal01', 'script guide exposes check:driverflowfinal01');
  must(guide, 'check:uxcollapsiblepanels01', 'script guide exposes check:uxcollapsiblepanels01');
  must(guide, 'check:uxpanelstructure02', 'script guide exposes check:uxpanelstructure02');
  must(guide, 'check:uxpanelinventory02a', 'script guide exposes check:uxpanelinventory02a');
  must(guide, 'check:uxpanelstructure02b', 'script guide exposes check:uxpanelstructure02b');
  must(guide, 'check:uxroomvehiclestelematicsfix', 'script guide exposes check:uxroomvehiclestelematicsfix');
  must(guide, 'UX-ROOM-OPS-PANEL-TABS-01', 'script guide mentions UX-ROOM-OPS-PANEL-TABS-01');
  must(guide, 'check:uxroomopspaneltabs01', 'script guide exposes check:uxroomopspaneltabs01');
  must(guide, 'UX-ROOM-OPS-RELATIONSHIP-POLISH-01', 'script guide mentions UX-ROOM-OPS-RELATIONSHIP-POLISH-01');
  must(guide, 'check:uxroomopsrelationshippolish01', 'script guide exposes check:uxroomopsrelationshippolish01');
  must(guide, 'UX-ROOM-SHIFTS-TABS-01', 'script guide mentions UX-ROOM-SHIFTS-TABS-01');
  must(guide, 'check:uxroomshiftstabs01', 'script guide exposes check:uxroomshiftstabs01');
  must(guide, 'UX-SCHOOL-ORGANIZATION-PANELS-01', 'script guide mentions UX-SCHOOL-ORGANIZATION-PANELS-01');
  must(guide, 'check:uxschoolorganizationpanels01', 'script guide exposes check:uxschoolorganizationpanels01');
  must(guide, 'UX-COMPANY-SHIFTS-TABS-01', 'script guide mentions UX-COMPANY-SHIFTS-TABS-01');
  must(guide, 'check:uxcompanyshiftstabs01', 'script guide exposes check:uxcompanyshiftstabs01');
  must(guide, 'UX-COMPANY-OPS-PANEL-TABS-01', 'script guide mentions UX-COMPANY-OPS-PANEL-TABS-01');
  must(guide, 'check:uxcompanyopspaneltabs01', 'script guide exposes check:uxcompanyopspaneltabs01');
  must(guide, 'UX-COMPANY-QUALITY-PANEL-TABS-01', 'script guide mentions UX-COMPANY-QUALITY-PANEL-TABS-01');
  must(guide, 'check:uxcompanyqualitytabs01', 'script guide exposes check:uxcompanyqualitytabs01');
  must(guide, 'UX-COMPANY-PANELS-FINAL-POLISH-01', 'script guide mentions UX-COMPANY-PANELS-FINAL-POLISH-01');
  must(guide, 'check:uxcompanypanelsfinalpolish01', 'script guide exposes check:uxcompanypanelsfinalpolish01');
  must(guide, 'check:uxcompanypanelssmoke01', 'script guide exposes check:uxcompanypanelssmoke01');
  must(guide, 'check:uxpaneltabsfix01', 'script guide exposes check:uxpaneltabsfix01');
  must(guide, 'check:uxlivemaptabsfix01', 'script guide exposes check:uxlivemaptabsfix01');
  must(guide, 'UX-LIVE-MAP-TABS-SIMPLIFY-01', 'script guide mentions UX-LIVE-MAP-TABS-SIMPLIFY-01');
  must(guide, 'check:uxlivemaptabssimplify01', 'script guide exposes check:uxlivemaptabssimplify01');
  must(guide, 'UX-PANEL-REALITY-CLEANUP-02D', 'script guide mentions UX-PANEL-REALITY-CLEANUP-02D');
  must(guide, 'check:uxpanelreality02c', 'script guide exposes check:uxpanelreality02c');
  must(guide, 'check:uxpanelrealitycleanup02d', 'script guide exposes check:uxpanelrealitycleanup02d');
  must(guide, 'check:uxroomagreementstabs01', 'script guide exposes check:uxroomagreementstabs01');
  must(guide, 'check:uxpanellayoutwidth02cfix01', 'script guide exposes check:uxpanellayoutwidth02cfix01');
  must(guide, 'check:uxpanellayoutwidth02cfix02', 'script guide exposes check:uxpanellayoutwidth02cfix02');
  must(guide, 'check:uxpanellayoutwidth02cfix03', 'script guide exposes check:uxpanellayoutwidth02cfix03');
  must(guide, 'check:uxnav01', 'script guide exposes check:uxnav01');
  must(guide, 'check:uxdensity01', 'script guide exposes check:uxdensity01');
  must(guide, 'FINAL-UX-SMOKE-01', 'script guide mentions FINAL-UX-SMOKE-01');
  must(guide, 'check:finaluxsmoke01', 'script guide exposes check:finaluxsmoke01');
  must(guide, 'BOARDING-OPS-01A', 'script guide mentions BOARDING-OPS-01A');
  must(guide, 'check:boardingops01a', 'script guide exposes check:boardingops01a');
  must(guide, 'BOARDING-OPS-01B', 'script guide mentions BOARDING-OPS-01B');
  must(guide, 'check:boardingops01b', 'script guide exposes check:boardingops01b');
  must(guide, 'BOARDING-OPS-01C', 'script guide mentions BOARDING-OPS-01C');
  must(guide, 'check:boardingops01c', 'script guide exposes check:boardingops01c');
  must(guide, 'ROUTE-CHANGE-FINAL-01', 'script guide mentions ROUTE-CHANGE-FINAL-01');
  must(guide, 'check:routechangefinal01', 'script guide exposes check:routechangefinal01');
  must(guide, 'SCRIPT-HARNESS-CONSOLIDATION-01', 'script guide mentions SCRIPT-HARNESS-CONSOLIDATION-01');
  must(guide, 'check:scriptharnessconsolidation01', 'script guide exposes check:scriptharnessconsolidation01');
  must(guide, 'DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01', 'script guide mentions DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01');
  must(guide, 'check:docsbrandcleanup01', 'script guide exposes check:docsbrandcleanup01');
  must(guide, 'UX-COPILOT-TERMINAL-01', 'script guide mentions UX-COPILOT-TERMINAL-01');
  must(guide, 'UX-COPILOT-PERSONA-01', 'script guide mentions UX-COPILOT-PERSONA-01');
  must(guide, 'ETA-SANITY-01', 'script guide mentions ETA-SANITY-01');
  must(guide, 'ETA-OSRM-01', 'script guide mentions ETA-OSRM-01');
  must(guide, 'ETA-OSRM-02', 'script guide mentions ETA-OSRM-02');
  must(guide, 'LIVE-TRACKING-FINAL-01', 'script guide mentions LIVE-TRACKING-FINAL-01');
  must(guide, 'DRIVER-FLOW-FINAL-01', 'script guide mentions DRIVER-FLOW-FINAL-01');
  must(guide, 'UX-COLLAPSIBLE-PANELS-01', 'script guide mentions UX-COLLAPSIBLE-PANELS-01');
  must(guide, 'UX-PANEL-STRUCTURE-02', 'script guide mentions UX-PANEL-STRUCTURE-02');
  must(guide, 'UX-PANEL-INVENTORY-02A', 'script guide mentions UX-PANEL-INVENTORY-02A');
  must(guide, 'UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-01', 'script guide mentions UX-ROOM-VEHICLES-TELEMATICS-COUNTS-FIX-01');
  must(guide, 'UX-NAV-01', 'script guide mentions UX-NAV-01');
  must(guide, 'UX-DENSITY-01', 'script guide mentions UX-DENSITY-01');
  must(guide, 'check:e2esmoke01', 'script guide exposes check:e2esmoke01');
  must(guide, 'check:fieldlaunch01', 'script guide exposes check:fieldlaunch01');
  must(guide, 'VERIFY-CHAIN-01', 'script guide mentions VERIFY-CHAIN-01');
  must(backlog, 'VERIFY-CHAIN-01', 'backlog keeps VERIFY-CHAIN-01 visible');
  must(backlog, 'P0:', 'backlog keeps P0 section');
  must(backlog, 'DOCS-STATE-01 sonrası resmi sonraki ürün sırası', 'backlog keeps next-product wording');

  console.log('=== VERIFY-CHAIN-01 PRODUCT EXTENSIONS CHECK PASS ===');
}

main();


