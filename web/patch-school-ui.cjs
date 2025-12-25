const fs = require("fs");
const p = "src/App.jsx";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

// react-router-dom importuna Link/Routes/Route ekle
const rr = /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react-router-dom["'];?/m;
if (rr.test(s)) {
  s = s.replace(rr, (m, inner) => {
    const parts = inner.split(",").map(x => x.trim()).filter(Boolean);
    const set = new Set(parts);
    set.add("Link"); set.add("Routes"); set.add("Route");
    return `import { ${Array.from(set).join(", ")} } from "react-router-dom";`;
  });
}

// SchoolPanel import
if (!/from\s*["']\.\/pages\/SchoolPanel\.jsx["']/.test(s)) {
  const lines = s.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) if (/^\s*import\s+/.test(lines[i])) lastImport = i;
  const ins = `import SchoolPanel from "./pages/SchoolPanel.jsx";`;
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, ins);
  else lines.unshift(ins);
  s = lines.join("\n");
}

// /school route
if (!/path=["']\/school["']/.test(s)) {
  const lines = s.split(/\r?\n/);
  const idx = lines.findIndex(l => l.includes("<Routes"));
  if (idx >= 0) lines.splice(idx + 1, 0, `        <Route path="/school" element={<SchoolPanel />} />`);
  s = lines.join("\n");
}

// Menü linki: SCHOOL_ADMIN -> /school
if (!/to=["']\/school["']/.test(s)) {
  const lines = s.split(/\r?\n/);
  let idx = lines.findIndex(l => l.includes('to="/admin"') || l.includes("to='/admin'"));
  if (idx < 0) idx = lines.findIndex(l => l.includes('to="/map"') || l.includes("to='/map'"));
  const line = `        {me?.role === "SCHOOL_ADMIN" && <Link to="/school">Okul Yönetimi</Link>}`;
  if (idx >= 0) lines.splice(idx + 1, 0, line);
  s = lines.join("\n");
}

fs.writeFileSync(p, s.replace(/^\uFEFF/, ""), "utf8");
console.log("OK: /school route + menu link eklendi");
