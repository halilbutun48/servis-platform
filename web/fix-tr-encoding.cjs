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

const src = path.join(process.cwd(), "src");
const files = walk(src).filter(f => /\.(jsx|tsx)$/.test(f));

const reps = [
  // sık görülen TR mojibake
  ["Takip AÃƒÂ§", "Takip Aç"],
  ["AraÃ§", "Araç"],
  ["Ã§", "ç"],
  ["Ã¶", "ö"],
  ["Ã¼", "ü"],
  ["Ä±", "ı"],
  ["ÄŸ", "ğ"],
  ["ÅŸ", "ş"],
  ["Ä°", "İ"],
  ["Ã‡", "Ç"],
  ["Ã–", "Ö"],
  ["Ãœ", "Ü"],
  ["Äž", "Ğ"],
  ["Åž", "Ş"],

  // ok işareti bozulmaları
  ["â†’", "→"],
  ["Ã¢Â†Â’", "→"],
  ["Ã¢Â†’", "→"],
];

let changed = 0;

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const orig = s;
  s = s.replace(/^\uFEFF/, ""); // BOM kaldır

  for (const [a,b] of reps) {
    if (s.includes(a)) s = s.split(a).join(b);
  }

  if (s !== orig) {
    const bak = f + ".bak_trfix_" + Date.now();
    fs.writeFileSync(bak, orig, "utf8");
    fs.writeFileSync(f, s, "utf8");
    console.log("FIX:", path.relative(process.cwd(), f));
    changed++;
  }
}

console.log("DONE. patched files:", changed);
