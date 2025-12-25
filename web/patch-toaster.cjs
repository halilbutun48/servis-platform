const fs = require("fs");
const path = require("path");

function read(p){ return fs.readFileSync(p,"utf8").replace(/^\uFEFF/,""); }
function write(p,s){ fs.writeFileSync(p, s.replace(/^\uFEFF/,""), "utf8"); }

const candidates = ["src/main.jsx","src/main.tsx","src/main.js","src/main.ts"];
const main = candidates.map(p=>path.join(process.cwd(),p)).find(p=>fs.existsSync(p));
if(!main){ console.error("HATA: src/main.* bulunamadı"); process.exit(1); }

let s = read(main);

if(!s.includes("react-hot-toast")){
  s = s.replace(/from\s+['"]react['"];?\s*$/m, (m)=> m + `\nimport { Toaster } from "react-hot-toast";`);
}

if(!s.includes("<Toaster")){
  // App render satırına Toaster ekle (React.StrictMode içine)
  s = s.replace(/(<React\.StrictMode>\s*\r?\n\s*<App\s*\/>\s*\r?\n\s*<\/React\.StrictMode>)/m,
    `<React.StrictMode>\n    <App />\n    <Toaster position="top-right" />\n  </React.StrictMode>`);
}

write(main, s);
console.log("OK: Toaster patched =>", path.relative(process.cwd(), main).replace(/\\/g,"/"));
