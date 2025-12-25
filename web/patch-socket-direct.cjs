const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.cwd(), "src");
const TARGET = "http://localhost:3000";

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let touched = 0;

for (const f of files) {
  let s = fs.readFileSync(f, "utf8").replace(/^\uFEFF/, "");
  if (!s.includes("socket.io-client")) continue;
  if (s.includes(TARGET)) continue;

  let before = s;

  // io() -> io("http://localhost:3000")
  s = s.replace(/\bio\(\s*\)/g, `io("${TARGET}")`);

  // io({ ... }) -> io("http://localhost:3000", { ... })
  s = s.replace(/\bio\(\s*\{/g, `io("${TARGET}", {`);

  // io("/", ...) / io("", ...) -> io("http://localhost:3000", ...)
  s = s.replace(/\bio\(\s*["'`]\s*\/\s*["'`]\s*,/g, `io("${TARGET}",`);
  s = s.replace(/\bio\(\s*["'`]\s*["'`]\s*,/g, `io("${TARGET}",`);

  if (s !== before) {
    fs.writeFileSync(f, s, "utf8");
    console.log("patched:", path.relative(process.cwd(), f));
    touched++;
  }
}

console.log("DONE. files patched:", touched);
