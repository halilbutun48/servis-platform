/*
 * CAL-04 RED -> GREEN guard.
 *
 * The RED mode is intentionally a coverage gate: before CAL-04 there is no
 * browser-shaped fixture authority for these seven production representations.
 * GREEN imports that fixture and executes the real runtime paths without
 * starting Chromium.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const redMode = process.argv.includes("--red");
const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, "lib", "pre_18_browser_realistic_fixture.mjs");
const requiredCapabilities = [
  "PANEL_SEGMENT_TAB_LABEL_AND_BADGE",
  "CLOSED_DETAILS_TARGET_CONTAINMENT",
  "UPPERCASE_BROWSER_DOM_TAGS",
  "WRAPPING_LABEL_ACCESSIBLE_NAME",
  "INPUT_NUMBER_IMPLICIT_SPINBUTTON",
  "DESCRIPTOR_TO_BINDING_LIFECYCLE",
  "RERENDER_REPLACEMENT_BINDING",
  "ACTUAL_RUNTIME_PATH_EVIDENCE",
];
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

async function coverageBeforeFixture(capability) {
  try {
    const source = await fs.readFile(fixturePath, "utf8");
    return source.includes(`\"${capability}\"`);
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

for (const [index, capability] of requiredCapabilities.entries()) {
  test(`CAL04-RED-${index + 1} browser-realistic fixture covers ${capability}`, async () => {
    if (redMode) {
      assert.equal(await coverageBeforeFixture(capability), true, `CAL04_BROWSER_REALISTIC_FIXTURE_GAP:${capability}`);
      return;
    }
    const fixture = await import(pathToFileURL(fixturePath).href);
    const evidence = await fixture.exerciseBrowserRealisticRuntimePaths();
    assert.ok(evidence[capability], `runtime proof missing: ${capability}:${JSON.stringify(evidence)}`);
  });
}

test("CAL04-GREEN Batch01 financial representative consumes one authoritative descriptor", async () => {
  if (redMode) return;
  const fixture = await import(pathToFileURL(fixturePath).href);
  const evidence = await fixture.exerciseBrowserRealisticRuntimePaths();
  assert.equal(evidence.BATCH01_FINANCIAL_AUTHORITATIVE_BINDING, true);
});

let failures = 0;
let passes = 0;
const runnableCases = redMode ? cases.filter((item) => item.name.includes("CAL04-RED")) : cases;
for (const item of runnableCases) {
  try {
    await item.fn();
    passes += 1;
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

if (redMode) {
  console.log(JSON.stringify({ CAL04_RED_TEST_COUNT: runnableCases.length, CAL04_RED_OBSERVED_COUNT: failures, CAL04_RED_UNEXPECTED_PASS_COUNT: passes }));
  if (failures !== runnableCases.length) process.exitCode = 1;
} else if (failures) {
  console.log(`PRE_18_HARNESS_CAL04_BROWSER_REALISTIC_FIXTURE_CHECK=RED (${failures}/${runnableCases.length})`);
  process.exitCode = 1;
} else {
  console.log("PRE_18_HARNESS_CAL04_BROWSER_REALISTIC_FIXTURE_CHECK=PASS");
}
