const fs = require("fs");

const files = ["src/pages/MapView.jsx","src/pages/GpsFollowLayer.jsx"];

function sanitize(s, isMapView=false) {
  s = s.replace(/^\uFEFF/, "");

  // TR -> ASCII
  const tr = [
    ["Ş","S"],["ş","s"],["Ğ","G"],["ğ","g"],["İ","I"],["ı","i"],
    ["Ö","O"],["ö","o"],["Ü","U"],["ü","u"],["Ç","C"],["ç","c"],
  ];
  for (const [a,b] of tr) s = s.split(a).join(b);

  // ok/bullet/dash -> ASCII
  s = s.split("→").join("->");
  s = s.split("•").join("-");
  s = s.split("â—").join("-");
  s = s.split("â†’").join("->");
  s = s.split("Â").join("");

  // kaçmış unicode escape yazıları
  s = s.split("\\u2192").join("->");
  s = s.split("Takip A\\u00E7").join("Takip Ac");
  s = s.split("Ara\\u00E7").join("Arac");

  if (isMapView) {
    // Legend: "gŸ« Okul" gibi bozuk satırı düzelt
    s = s.replace(/<div>\s*[^<]*Okul\s*<\/div>/g, '<div>Okul</div>');

    // Okul ikon içeriğini "OK" yap (emoji/bozuk glyph yok)
    s = s.replace(
      /<div style="font-size:16px;line-height:1">[^<]*<\/div>/,
      '<div style="font-size:11px;font-weight:800;line-height:1">OK</div>'
    );
  }

  // en son: kalan tüm non-ascii karakterleri sök
  s = s.replace(/[^\x00-\x7F]/g, "");
  return s;
}

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const orig = fs.readFileSync(f, "utf8");
  const bak = `${f}.bak_sanitize_${Date.now()}`;
  const fixed = sanitize(orig, f.includes("MapView.jsx"));
  fs.writeFileSync(bak, orig, "utf8");
  fs.writeFileSync(f, fixed, "utf8");
  console.log("SANITIZE OK:", f, "backup:", bak);
}
