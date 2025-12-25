const fs = require("fs");

const files = ["src/pages/MapView.jsx","src/pages/GpsFollowLayer.jsx"];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, "utf8").replace(/^\uFEFF/, "");
  let found = 0;
  const lines = s.split(/\r?\n/);
  for (let i=0;i<lines.length;i++){
    const line = lines[i];
    for (const ch of line) {
      if (ch.charCodeAt(0) > 127) {
        found++;
        console.log(`${f}:${i+1} NONASCII U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0')} '${ch}'  ->  ${line.trim().slice(0,120)}`);
        if (found > 80) break;
      }
    }
    if (found > 80) break;
  }
  if (!found) console.log(`${f}: OK (ascii-only)`);
}
