import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(currentDir, "OperationsPanel.jsx"), "utf8");

assert.match(source, /userFacingStatusLabel/);
assert.match(source, /readableAuditStatus\(surface\?\.defaultStatus\)/);
assert.match(source, /readableAuditStatus\(role\.defaultStatus\)/);
assert.match(source, /readableAuditAction\(row\.key\)/);
assert.match(source, /readableAuditAction\(row\.action \|\| row\.entity\)/);

console.log("OperationsPanel kullanıcı dili regresyonu: PASS");
