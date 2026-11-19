import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const boardSource = fs.readFileSync(path.join(here, "roomOperationsBoard.jsx"), "utf8");

test("ROOM boarding preview publishes its explicit record to Sefer Abi", () => {
  assert.match(boardSource, /setCopilotSelection/);
  assert.match(boardSource, /selectedPreviewRequest/);
  assert.match(boardSource, /selectedRecordType/);
  assert.match(boardSource, /selectedRecordId/);
});

test("ROOM accepted boarding records remain explicitly selectable for Sefer Abi", () => {
  assert.match(boardSource, /acceptedRequestCards\.map[\s\S]*handlePreviewRequestSelect\(item\)/);
});
