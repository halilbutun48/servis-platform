import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./PersonelAccessPanel.jsx", import.meta.url), "utf8");

test("personel access clears stale copilot record context", () => {
  assert.match(source, /import \{ clearCopilotSelection \} from ["']\.\.\/\.\.\/utils\/copilotSelection["']/);
  assert.match(source, /clearCopilotSelection\("\/company\/personel-access",\s*\{\s*resetConversation:\s*true\s*\}\)/);
  assert.match(source, /return \(\) => clearCopilotSelection\("\/company\/personel-access"\)/);
});
