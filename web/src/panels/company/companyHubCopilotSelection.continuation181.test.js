import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("company hub publishes authorized coordinates as Sefer Abi context", () => {
  const source = fs.readFileSync(new URL("./HubPanel.jsx", import.meta.url), "utf8");
  assert.match(source, /screenType:\s*["']COMPANY_HUB["']/u);
  assert.match(source, /source:\s*["']AUTHORIZED_COMPANY_HUB_READ["']/u);
  assert.match(source, /label:\s*["']Enlem["']/u);
  assert.match(source, /label:\s*["']Boylam["']/u);
  assert.match(source, /setHubRecord\(\{/u);
});
