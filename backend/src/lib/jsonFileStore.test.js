import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createJsonFileStore } from "./jsonFileStore.js";

test("concurrent first reads do not race on the initial file", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "seferpakt-json-store-"));
  try {
    const store = createJsonFileStore("service-evaluations.json", { dataDir, defaultValue: [] });
    const values = await Promise.all(Array.from({ length: 8 }, () => store.readAsync()));
    assert.equal(values.length, 8);
    assert.ok(values.every((value) => Array.isArray(value) && value.length === 0));
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
