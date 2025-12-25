const fs = require("fs");
const path = require("path");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const srcDir = path.join(process.cwd(), "src");
const files = walk(srcDir).filter(f => /\.(js|jsx|ts|tsx)$/.test(f));

const reps = [
  // ok işareti
  ["â†’", "→"],
  ["Ã¢Â†Â’", "→"],
  ["Ã¢Â†’", "→"],

  // TR mojibake (en yaygın)
  ["Takip AÃƒÂ§", "Takip Aç"],
  ["AraÃ§", "Araç"],
  ["Ã‡", "Ç"], ["Ã–", "Ö"], ["Ãœ", "Ü"],
  ["Ã§", "ç"], ["Ã¶", "ö"], ["Ã¼", "ü"],
  ["Ä°", "İ"], ["Äž", "Ğ"], ["Åž", "Ş"],
  ["Ä±", "ı"], ["ÄŸ", "ğ"], ["ÅŸ", "ş"],

  // bazen araya giren Â
  ["Â", ""],
];

let changed = 0;

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const orig = s;
  s = s.replace(/^\uFEFF/, "");

  for (const [a,b] of reps) {
    if (s.includes(a)) s = s.split(a).join(b);
  }

  if (s !== orig) {
    fs.writeFileSync(f + ".bak_moj_" + Date.now(), orig, "utf8");
    fs.writeFileSync(f, s, "utf8");
    console.log("FIX:", path.relative(process.cwd(), f));
    changed++;
  }
}

console.log("DONE. patched files:", changed);
