const fs = require("fs");
const p = "web/src/components/RoutePreviewModal.jsx";
const t = fs.readFileSync(p, "utf8");
const useSessionIdx = t.indexOf("const { token } = useSession();");
const earlyGuardIdx = t.indexOf("if (!open) return null;");
const firstStateIdx = t.indexOf("const [remote, setRemote] = useState(");
const finalReturnIdx = t.lastIndexOf("return (");
function ok(m){ console.log("OK", m); }
function fail(m){ console.error("FAIL", m); process.exitCode = 1; }
console.log("=== ROUTE PREVIEW MODAL HOOK ORDER CHECK V2 ===");
if (useSessionIdx >= 0) ok("useSession present"); else fail("useSession missing");
if (firstStateIdx > useSessionIdx) ok("useState follows useSession"); else fail("useState placement wrong");
if (earlyGuardIdx > firstStateIdx) ok("open guard moved after hooks"); else fail("open guard still before hooks");
if (earlyGuardIdx < finalReturnIdx) ok("open guard remains before JSX return"); else fail("open guard missing near final return");
if ((t.match(/if \(!open\) return null;/g)||[]).length===1) ok("single open guard present"); else fail("unexpected open guard count");
