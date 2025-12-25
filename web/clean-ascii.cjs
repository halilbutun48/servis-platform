const fs = require("fs");

const files = [
  "src/pages/MapView.jsx",
  "src/pages/GpsFollowLayer.jsx",
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;

  const orig = fs.readFileSync(f, "utf8");
  const bak = `${f}.bak_clean_${Date.now()}`;
  fs.writeFileSync(bak, orig, "utf8");

  let s = orig.replace(/^\uFEFF/, "");

  // JSX icinde '>' gecen plain text'i yumusat (oxc parse)
  s = s.replace(/->/g, ":");

  // Garip kalan ikon/yazi kirintilari
  s = s.replace(/g??/g, "OK");

  // FULL ASCII: tab/newline + printable ASCII disindakileri sil
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

  fs.writeFileSync(f, s, "utf8");
  console.log("CLEAN OK:", f, "backup:", bak);
}
