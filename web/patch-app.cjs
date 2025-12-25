const fs = require("fs");

const p = "src/App.jsx";
let s = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

// 1) react-router-dom import'unda Routes/Route yoksa ekle
const rr = /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react-router-dom["'];?/m;
if (rr.test(s)) {
  s = s.replace(rr, (m, inner) => {
    const parts = inner.split(",").map(x => x.trim()).filter(Boolean);
    const set = new Set(parts);
    set.add("Routes");
    set.add("Route");
    return `import { ${Array.from(set).join(", ")} } from "react-router-dom";`;
  });
} else {
  // hiç yoksa en üste ekle
  s = `import { Routes, Route } from "react-router-dom";\n` + s;
}

// 2) AdminPanel import'u yoksa ekle
if (!/from\s*["']\.\/pages\/AdminPanel\.jsx["']/.test(s) && !/AdminPanel/.test(s)) {
  const lines = s.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) lastImport = i;
  }
  const ins = `import AdminPanel from "./pages/AdminPanel.jsx";`;
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, ins);
  else lines.unshift(ins);
  s = lines.join("\n");
}

// 3) /admin route yoksa <Routes> içine ekle
if (!/path=["']\/admin["']/.test(s)) {
  const lines = s.split(/\r?\n/);
  let idx = lines.findIndex(l => l.includes("<Routes"));
  if (idx >= 0) {
    lines.splice(idx + 1, 0, `        <Route path="/admin" element={<AdminPanel />} />`);
    s = lines.join("\n");
  } else {
    console.log("UYARI: <Routes> bulunamadı. App.jsx içinde router yapısı farklı olabilir.");
  }
}

fs.writeFileSync(p, s.replace(/^\uFEFF/, ""), "utf8");
console.log("OK: App.jsx patched");
