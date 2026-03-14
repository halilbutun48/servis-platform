import fs from "fs";
import path from "path";
import process from "process";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function must(label, cond) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}
function banner(text) {
  console.log(`
=== ${text} ===
`);
}

banner("M47.4 MOBILE READINESS WEB PASS CHECK");
const html = read("index.html");
const css = read("src/index.css");

console.log("INFO viewport + shell guards");
must("viewport-fit cover present", html.includes("viewport-fit=cover"));
must("theme-color meta present", html.includes('name="theme-color"'));
must("body hides horizontal overflow", css.includes("overflow-x: hidden"));
must("safe area bottom padding present", css.includes("env(safe-area-inset-bottom)"));
must("touch target min height present", css.includes("min-height: 44px"));

console.log("INFO mobile nav + table behavior");
must("mobile nav horizontal scroll present", css.includes(".navDockItems") && css.includes("overflow-x: auto"));
must("mobile shell single column present", css.includes(".shell { grid-template-columns: 1fr; }") || css.includes("grid-template-columns: 1fr;"));
must("table min width fallback present", css.includes(".tbl { min-width: 640px; }"));

banner("M47.4 MOBILE READINESS WEB PASS CHECK PASS");
