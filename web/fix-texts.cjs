const fs = require("fs");

const files = [
  "src/pages/MapView.jsx",
  "src/pages/GpsFollowLayer.jsx",
];

const reps = [
  // MapView yorum satırı (senin logdaki patlayan kısım)
  ["Seed koordinatlar\u00c3\u201e\u00c2\u00b1", "Seed koordinatları"],
  ["DB ile ayn\u00c3\u201e\u00c2\u00b1", "DB ile aynı"],

  // Genel TR mojibake
  ["Ara\u00c3\u00a7", "Araç"],
  ["Takip a\u00c3\u00a7\u00c4\u00b1ld\u00c4\u00b1", "Takip açıldı"],
  ["\u00c5uraya s\u00c3\u00bcr\u00c3\u00bckledin \u00e2\u2020\u2019 Takip kapand\u00c4\u00b1", "Şuraya sürükledin → Takip kapandı"],

  // Ekranda görünen kaçmış escape yazıları
  ["Takip A\\u00E7", "Takip Aç"],
  ["Ara\\u00E7", "Araç"],
  ["\\u2192", "→"],

  // “â†’” gibi ok bozulmaları
  ["â†’", "→"],

  // Gereksiz Â
  ["Â", ""],
];

let changed = 0;

for (const f of files) {
  if (!fs.existsSync(f)) continue;

  const bak = `${f}.bak_fix_${Date.now()}`;
  const orig = fs.readFileSync(f, "utf8");
  let s = orig.replace(/^\uFEFF/, "");

  for (const [a, b] of reps) {
    if (s.includes(a)) s = s.split(a).join(b);
  }

  if (s !== orig) {
    fs.writeFileSync(bak, orig, "utf8");
    fs.writeFileSync(f, s, "utf8"); // UTF-8 (BOM yok)
    console.log("FIX:", f, "backup:", bak);
    changed++;
  } else {
    console.log("OK :", f, "(no change)");
  }
}

console.log("DONE. patched files:", changed);
