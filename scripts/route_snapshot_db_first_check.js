const fs = require("fs");

function read(p){ return fs.readFileSync(p, "utf8"); }
function ok(msg){ console.log("OK " + msg); }
function fail(msg){ console.error("FAIL " + msg); process.exitCode = 1; }

console.log("=== ROUTE SNAPSHOT DB-FIRST CHECK ===");

const schema = read("backend/prisma/schema.prisma");
const company = read("backend/src/routes/shifts/company.js");
const people = read("backend/src/routes/shifts/people.js");
const osrm = read("backend/src/services/osrmRoute.js");
const modal = read("web/src/components/RoutePreviewModal.jsx");
const migrationPath = "backend/prisma/migrations/20260403150000_m81_route_snapshot_preview/migration.sql";

schema.includes("routeSnapshotPolyline") ? ok("shift schema has routeSnapshotPolyline") : fail("routeSnapshotPolyline missing in schema");
schema.includes("routeSnapshotInputHash") ? ok("shift schema has routeSnapshotInputHash") : fail("routeSnapshotInputHash missing in schema");
company.includes("refreshShiftRouteSnapshot(") ? ok("company reorder refreshes route snapshot") : fail("company reorder snapshot refresh missing");
company.includes("routeSnapshotValidatedAt") ? ok("company writes validatedAt") : fail("company validatedAt missing");
company.includes("osrmRoute(") ? ok("company uses osrmRoute for snapshot") : fail("company osrmRoute missing");
people.includes('source === "SNAPSHOT"') ? ok("route preview supports SNAPSHOT source") : fail("SNAPSHOT source missing in route preview");
people.includes("snapshotHash === routeKey") ? ok("route preview checks snapshot hash") : fail("snapshot hash comparison missing");
people.includes("DB_SNAPSHOT") ? ok("route preview policy includes DB_SNAPSHOT") : fail("DB_SNAPSHOT preview policy missing");
osrm.includes("distanceM") && osrm.includes("durationSec") ? ok("osrmRoute returns distance and duration") : fail("osrmRoute distance/duration missing");
modal.includes("Kaydedilmiş rota snapshot kullanıldı") ? ok("route preview modal explains snapshot source") : fail("route preview modal snapshot note missing");
fs.existsSync(migrationPath) ? ok("migration file present") : fail("migration file missing");

process.exit(process.exitCode || 0);
