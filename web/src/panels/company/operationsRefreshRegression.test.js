import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(currentDir, "OperationsPanel.jsx"), "utf8");

assert.match(
  source,
  /<button className="btn sm" onClick=\{\(\) => load\(\{ force: true \}\)\} disabled=\{busy\}>/
);
assert.match(source, /onClick=\{\(\) => handlePreviewRequestSelect\(row\)\}/);
assert.match(source, /Kabul edilen değişiklikler/);

console.log("COMPANY operations refresh cache bypass regression: PASS");
