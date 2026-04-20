
import fs from "fs";
import path from "path";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
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
if (includesText(nav, "Genel Bakış") && includesText(nav, "Operasyon Odaları") && includesText(nav, "İşlem Kayıtları")) ok("super admin nav Turkish labels visible"); else fail("super admin nav Turkish labels missing");
if (includesText(nav, "Sahaya Çıkış Kontrolü") && includesText(nav, "Log Dışa Aktarımı")) ok("super admin nav Turkish advanced labels visible"); else fail("super admin nav Turkish advanced labels missing");
if (includesText(panel, "Bölüm rehberi") && includesText(panel, "Operasyon Doğrulama") && includesText(panel, "Tek Doğru Kaynak")) ok("super admin guide card visible"); else fail("super admin guide card missing");
if (includesText(panel, "Süper Yönetici") && includesText(panel, "İşlem Kayıtları") && includesText(panel, "Log Dışa Aktarımı")) ok("super admin quick access Turkish labels visible"); else fail("super admin quick access Turkish labels missing");
if (process.exitCode) process.exit(1);
