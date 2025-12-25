const fs = require("fs");
const p = "src/App.jsx";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

// 1) react-router-dom importuna Link ekle (yoksa)
const rr = /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react-router-dom["'];?/m;
if (rr.test(s)) {
  s = s.replace(rr, (m, inner) => {
    const parts = inner.split(",").map(x => x.trim()).filter(Boolean);
    const set = new Set(parts);
    set.add("Link");
    return `import { ${Array.from(set).join(", ")} } from "react-router-dom";`;
  });
} else {
  // hiç yoksa en üste ekle
  s = `import { Link } from "react-router-dom";\n` + s;
}

// 2) Menude /admin linkini ekle (yoksa)
if (!/to=["']\/admin["']/.test(s)) {
  const lines = s.split(/\r?\n/);

  // Harita link satırını bul (to="/map" veya Harita yazan Link)
  let idx = lines.findIndex(l => l.includes('to="/map"') || l.includes("to='/map'"));
  if (idx < 0) idx = lines.findIndex(l => l.includes("<Link") && l.toLowerCase().includes("harita"));

  const adminLine = `        {(me?.role === "SUPER_ADMIN" || me?.role === "SERVICE_ROOM") && <Link to="/admin">Servis Odası</Link>}`;

  if (idx >= 0) {
    lines.splice(idx + 1, 0, adminLine);
    s = lines.join("\n");
  } else {
    console.log("UYARI: Harita linki bulunamadı. Menü farklıysa manuel yerleştirmek gerekebilir.");
  }
}

fs.writeFileSync(p, s.replace(/^\uFEFF/, ""), "utf8");
console.log("OK: Admin menü linki eklendi");
