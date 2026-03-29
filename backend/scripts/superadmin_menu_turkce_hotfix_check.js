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
if (nav.includes("Genel Bakış") && nav.includes("Operasyon Odaları") && nav.includes("İşlem Kayıtları")) ok("super admin nav Turkish labels visible"); else fail("super admin nav Turkish labels missing");
if (nav.includes("Sahaya Çıkış Kontrolü") && nav.includes("Log Dışa Aktarımı")) ok("super admin nav Turkish advanced labels visible"); else fail("super admin nav Turkish advanced labels missing");
if (panel.includes("Bölüm rehberi") && panel.includes("Operasyon Doğrulama") && panel.includes("Tek Doğru Kaynak")) ok("super admin guide card visible"); else fail("super admin guide card missing");
if (panel.includes("Süper Yönetici") && panel.includes("İşlem Kayıtları") && panel.includes("Log Dışa Aktarımı")) ok("super admin quick access Turkish labels visible"); else fail("super admin quick access Turkish labels missing");
if (process.exitCode) process.exit(1);
