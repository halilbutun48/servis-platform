import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");

function read(relPath) {
  return fs.readFileSync(path.join(webRoot, relPath), "utf8");
}

function readRepo(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function normalize(text) {
  return String(text || "")
    .replace(/[’']/g, "'")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function must(text, needle, msg) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${msg}`);
  }
  console.log(`OK ${msg}`);
}

console.log("=== WEB MOBILE RESPONSIVE CHECK ===");

const rootPkg = readRepo("package.json");
const webPkg = read("package.json");
const indexCss = read("src/index.css");
const appShell = read("src/layout/AppShell.jsx");
const navDock = read("src/layout/NavDock.jsx");
const panelChrome = read("src/components/PanelChrome.jsx");
const routePreview = read("src/components/RoutePreviewModal.jsx");
const mapView = read("src/components/map/MapView.jsx");
const mapShell = read("src/components/map/mapShell.css");
const reports = read("src/panels/shared/ReportsPanel.jsx");
const notifications = read("src/panels/shared/NotificationsPanel.jsx");

must(rootPkg, "check:web-mobile", "root package exposes check:web-mobile");
must(rootPkg, "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot", "final verify chain includes web mobile check");
must(webPkg, "check:web-mobile", "web package exposes check:web-mobile");

must(appShell, "shellTopBrand", "app shell exposes compact shell top brand block");
must(appShell, "shellTopMeta", "app shell exposes compact shell top meta block");
must(appShell, "shellTopLogout", "app shell exposes logout control class");
must(navDock, "navDockBrand", "nav dock exposes compact brand block");
must(navDock, "navDockRole", "nav dock exposes role label block");
must(navDock, "navDockItems", "nav dock keeps chip strip items");
must(panelChrome, "panelChromeHead", "panel chrome exposes responsive header class");
must(panelChrome, "panelChromeActions", "panel chrome exposes responsive actions class");

must(indexCss, "@media (max-width: 900px)", "global mobile breakpoint keeps tablet/mobile collapse");
must(indexCss, "@media (min-width: 641px) and (max-width: 900px)", "global small tablet breakpoint exists");
must(indexCss, "@media (max-width: 640px)", "global phone breakpoint exists");
must(indexCss, "navDockItems", "global CSS turns nav dock into chip strip");
must(indexCss, "shellTopBrand", "global CSS compacts shell top");
must(indexCss, "panelChromeHead", "global CSS stacks panel chrome on phone");
must(indexCss, "routePreviewBackdrop", "global CSS styles route preview modal sheet");
must(indexCss, "routePreviewLayout", "global CSS stacks route preview content");
must(indexCss, "routePreviewMapFrame", "global CSS limits route preview map height");
must(indexCss, "min-height: 44px", "global CSS keeps touch target minimums");
must(indexCss, "modal-backdrop", "global CSS keeps modal viewport helpers");
must(indexCss, "tbl", "global CSS preserves table scroll behavior");

must(routePreview, "routePreviewBackdrop", "route preview modal uses shared backdrop class");
must(routePreview, "routePreviewModal", "route preview modal uses responsive shell class");
must(routePreview, "routePreviewLayout", "route preview modal uses stacked layout class");
must(routePreview, "routePreviewMapFrame", "route preview modal uses responsive map frame");
must(routePreview, "routePreviewHeader", "route preview modal has compact header");
must(mapView, "mapViewFooter", "map view exposes responsive footer class");
must(mapView, "mapViewPills", "map view exposes responsive pill rail");
must(mapShell, "@media (max-width: 1024px)", "map shell keeps drawer mode");
must(mapShell, "@media (max-width: 640px)", "map shell adds phone refinements");
must(mapShell, "ms-right-backdrop", "map shell keeps right drawer backdrop");
must(mapShell, "ms-right.is-open", "map shell keeps right drawer open state");
must(reports, "reportsTableWrap", "reports panel keeps controlled horizontal scroll");
must(reports, "tableMinWidth", "reports panel still computes wide min width");
must(notifications, "@media (max-width: 640px)", "notifications panel adds phone layout");
must(notifications, "min-height: 44px", "notifications filters keep touch target minimum");
must(notifications, "notifFilters", "notifications panel keeps compact filter bar");

console.log("=== WEB MOBILE RESPONSIVE CHECK PASS ===");
