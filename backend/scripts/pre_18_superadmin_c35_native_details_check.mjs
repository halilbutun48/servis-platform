/*
 * Focused C35 native-disclosure contract proof.
 *
 * Production change this catches: a harness producer that either treats
 * a native <details> disclosure as aria-expanded-only, accepts an open
 * disclosure without its successor content, or loses the current summary
 * binding before semantic successor resolution.
 */
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import {
  assertNativeDisclosureExpanded,
  openNativeDisclosure,
} from "./lib/pre_18_native_disclosure_state.mjs";

const controlName = "Ayrıntılı çalışma alanını göster";
const successor = { role: "button", name: "Biniş kayıtları" };
const cases = [];
const test = (name, fn) => cases.push({ name, fn });

async function withFixture(markup, fn) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.setContent(markup);
    return await fn(page);
  } finally {
    await browser.close();
  }
}

const closedFixture = `
  <details class="roleTaskDetails" data-details="task-workspace">
    <summary>${controlName}</summary>
    <div class="roleTaskDetailsBody"><button type="button">Biniş kayıtları</button></div>
  </details>`;

test("RED-C35-1 native details opens and asserts without aria-expanded", async () => {
  await withFixture(closedFixture, async (page) => {
    const before = await page.locator("details").evaluate((node) => ({ open: node.open, ariaExpanded: node.getAttribute("aria-expanded") }));
    assert.deepEqual(before, { open: false, ariaExpanded: null });
    await openNativeDisclosure(page, { name: controlName, expectedControl: successor });
    const asserted = await assertNativeDisclosureExpanded(page, { name: controlName, expectedControl: successor });
    assert.equal(asserted.detailsOpen, true);
    assert.equal(asserted.ariaExpandedPresent, false);
  });
});

test("RED-C35-2 a closed native disclosure cannot satisfy the assertion", async () => {
  await withFixture(closedFixture, async (page) => {
    await assert.rejects(
      () => assertNativeDisclosureExpanded(page, { name: controlName, expectedControl: successor }),
      /STATE_ASSERTION_DISCLOSURE_NOT_OPEN/u,
    );
  });
});

test("RED-C35-3 an open disclosure without Biniş kayıtları cannot satisfy the assertion", async () => {
  await withFixture(`
    <details open class="roleTaskDetails" data-details="task-workspace">
      <summary>${controlName}</summary>
      <div class="roleTaskDetailsBody"><button type="button">Yardımcı</button></div>
    </details>`, async (page) => {
    await assert.rejects(
      () => assertNativeDisclosureExpanded(page, { name: controlName, expectedControl: successor }),
      /STATE_ASSERTION_EXPECTED_CONTROL_NOT_RENDERED:Biniş kayıtları/u,
    );
  });
});

test("RED-C35-4 current expanded details exposes the successor as a semantic candidate", async () => {
  await withFixture(closedFixture, async (page) => {
    const produced = await openNativeDisclosure(page, { name: controlName, expectedControl: successor });
    const asserted = await assertNativeDisclosureExpanded(page, { name: controlName, expectedControl: successor });
    const candidate = page.getByRole(successor.role, { name: successor.name, exact: true });
    assert.equal(produced.controlTag, "SUMMARY");
    assert.equal(asserted.successorRendered, true);
    assert.equal(await candidate.isVisible(), true);
  });
});

test("GREEN-C35-5 an explicitly typed native summary successor uses exact native semantics", async () => {
  const nestedSummary = "Maliyet ve operasyon ayrıntıları";
  await withFixture(`
    <details open class="roleTaskDetails" data-details="task-workspace">
      <summary>${controlName}</summary>
      <details><summary>${nestedSummary}</summary><p>Geçerli maliyet içeriği</p></details>
    </details>`, async (page) => {
    const asserted = await assertNativeDisclosureExpanded(page, {
      name: controlName,
      expectedControl: { role: "button", controlTag: "summary", name: nestedSummary },
    });
    assert.equal(asserted.successorRendered, true);
    assert.equal(asserted.assertionTarget.tag, "summary");
    assert.equal(asserted.assertionTarget.accessibleName, nestedSummary);
  });
});

let failures = 0;
for (const item of cases) {
  try {
    await item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

console.log(JSON.stringify({
  PRE_18_SUPERADMIN_C35_NATIVE_DETAILS_CHECK: failures ? "RED" : "PASS",
  C35_FOCUSED_TEST_TOTAL: cases.length,
  C35_FOCUSED_TEST_PASS: cases.length - failures,
  C35_FOCUSED_TEST_FAIL: failures,
}, null, 2));
if (failures) process.exitCode = 1;
