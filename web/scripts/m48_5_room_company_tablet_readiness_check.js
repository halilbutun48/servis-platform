import fs from "fs";

function read(p) {
  return fs.readFileSync(p, "utf8");
}
function ok(msg) {
  console.log(`OK ${msg}`);
}
function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}
function must(txt, needle, msg) {
  if (!txt.includes(needle)) fail(msg);
  ok(msg);
}
function banner(msg) {
  console.log(`\n=== ${msg} ===\n`);
}

banner("M48.5 ROOM / COMPANY TABLET READINESS CHECK");

const appShell = read("src/layout/AppShell.jsx");
const quickBar = read("src/components/TabletOpsQuickBar.jsx");
const css = read("src/index.css");

must(appShell, "TabletOpsQuickBar", "app shell imports tablet quick bar");
must(appShell, "shell--tablet-ops", "app shell enables tablet ops shell");
must(appShell, "isTabletOpsRole", "app shell scopes tablet mode to room/company");
must(quickBar, "Tablet kısa işlemler", "quick bar includes room tablet label");
must(quickBar, "Tablet hızlı işlemler", "quick bar includes company tablet label");
must(quickBar, "/room/map", "quick bar includes room map shortcut");
must(quickBar, "/room/shifts", "quick bar includes room shifts shortcut");
must(quickBar, 'base + "/map"', "quick bar includes company map shortcut");
must(quickBar, 'base + "/checkin"', "quick bar includes company check-in shortcut");
must(css, "M48.5 — Room / Company Tablet Readiness", "css includes tablet readiness marker");
must(css, "@media (min-width: 768px) and (max-width: 1180px)", "css includes tablet breakpoint");
must(css, ".tabletQuickGrid", "css includes tablet quick grid");

banner("M48.5 ROOM / COMPANY TABLET READINESS CHECK PASS");
