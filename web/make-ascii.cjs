const fs = require("fs");

const map = [
  // TR -> ASCII
  ["Ş","S"],["ş","s"],["Ğ","G"],["ğ","g"],["İ","I"],["ı","i"],["Ö","O"],["ö","o"],["Ü","U"],["ü","u"],["Ç","C"],["ç","c"],
  // ok/bullet bozulmaları -> ASCII
  ["→","->"],["•","-"],["â—","-"],["â†’","->"],["Â",""],
];

const files = ["src/pages/MapView.jsx","src/pages/GpsFollowLayer.jsx"];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const bak = `${f}.bak_ascii_${Date.now()}`;
  const orig = fs.readFileSync(f, "utf8");
  let s = orig.replace(/^\uFEFF/, "");

  // önce kalan mojibake parçalarını temizle
  s = s.replace(/Ã.|Ä.|Å.|â.|Â/g, "");

  for (const [a,b] of map) s = s.split(a).join(b);

  fs.writeFileSync(bak, orig, "utf8");
  fs.writeFileSync(f, s, "utf8");
  console.log("ASCII OK:", f, "backup:", bak);
}
