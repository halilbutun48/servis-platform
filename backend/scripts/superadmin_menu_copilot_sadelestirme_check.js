const fs = require("fs");
const path = require("path");
function ok(x){ console.log("OK " + x); }
function fail(x){ console.error("FAIL " + x); process.exitCode = 1; }
function read(p){ return fs.readFileSync(p, "utf8"); }
const repo = process.argv[2] || process.cwd();
const navPath = path.join(repo, "web", "src", "layout", "NavDock.jsx");
const panelPath = path.join(repo, "web", "src", "panels", "superadmin", "SuperAdminPanel.jsx");
if (fs.existsSync(navPath)) ok("NavDock exists"); else fail("NavDock missing");
if (fs.existsSync(panelPath)) ok("SuperAdminPanel exists"); else fail("SuperAdminPanel missing");
const nav = read(navPath);
const panel = read(panelPath);
if (nav.includes('label: "Yardımcı", path: "/superadmin/copilot"')) ok("super admin nav shows Yardımcı"); else fail("super admin nav does not show Yardımcı");
if (!nav.includes('label: "Doğal Yardımcı", path: "/superadmin/natural-copilot"')) ok("super admin nav hides Doğal Yardımcı"); else fail("super admin nav still shows Doğal Yardımcı");
if (panel.includes('>Yardımcı</button>')) ok("super admin quick access shows Yardımcı"); else fail("super admin quick access does not show Yardımcı");
if (!panel.includes('>Doğal Yardımcı</button>')) ok("super admin quick access hides Doğal Yardımcı"); else fail("super admin quick access still shows Doğal Yardımcı");
if (panel.includes('{ title: "Yardımcı", desc: "Soruları adım adım yanıtlayan ve yönlendiren yardımcı ekranı." }')) ok("guide explains Yardımcı"); else fail("guide does not explain Yardımcı");
if (!panel.includes('{ title: "Doğal Yardımcı"')) ok("guide hides Doğal Yardımcı"); else fail("guide still shows Doğal Yardımcı");
if (process.exitCode) process.exit(1);
