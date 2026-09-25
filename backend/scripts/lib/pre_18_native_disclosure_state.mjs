/* Native <details>/<summary> state proof for bounded browser harnesses. */

import { deriveImplicitAriaRole } from "./pre_18_hybrid_surface_state_executor.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value) => String(value || "").replace(/\s+/gu, " ").trim();

async function findNativeDisclosure(page, name) {
  const summaries = page.locator("summary");
  for (let index = 0; index < await summaries.count().catch(() => 0); index += 1) {
    const summary = summaries.nth(index);
    if (!(await summary.isVisible().catch(() => false))) continue;
    const metadata = await summary.evaluate((node) => {
      const details = node.closest("details");
      return {
        controlTag: node.tagName,
        controlRole: node.getAttribute("role") || "summary",
        accessibleName: node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.textContent || "",
        containingDetails: details instanceof HTMLDetailsElement,
        detailsOpen: details instanceof HTMLDetailsElement ? details.open : false,
        ariaExpandedPresent: node.hasAttribute("aria-expanded"),
        ariaExpandedValue: node.getAttribute("aria-expanded"),
      };
    }).catch(() => null);
    if (metadata && normalize(metadata.accessibleName) === normalize(name)) {
      return { summary, details: summary.locator("xpath=ancestor::details[1]"), ...metadata };
    }
  }
  return null;
}

async function expectedControlIsVisible(disclosure, expectedControl) {
  if (!expectedControl?.role || !expectedControl?.name) return { visible: true, assertionTarget: null };
  const role = expectedControl.controlTag
    ? deriveImplicitAriaRole({ tag: expectedControl.controlTag, type: expectedControl.inputType, explicitRole: expectedControl.role })
    : expectedControl.role;
  /*
   * A native <summary> is an explicitly typed control in our state recipe,
   * but Playwright does not expose it through getByRole("button") in every
   * browser build.  Resolve only that declared native tag directly and retain
   * the exact accessible-name assertion below.  All ordinary controls still
   * use their ARIA role locator.
   */
  const candidates = String(expectedControl.controlTag || "").toLowerCase() === "summary"
    ? disclosure.details.locator("summary")
    : disclosure.details.getByRole(role, { name: expectedControl.name, exact: true });
  for (let index = 0; index < await candidates.count().catch(() => 0); index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    if (String(expectedControl.controlTag || "").toLowerCase() === "summary") {
      const accessibleName = normalize(await candidate.evaluate((node) => (
        node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.textContent || ""
      )).catch(() => ""));
      if (accessibleName !== normalize(expectedControl.name)) continue;
    }
    const assertionTarget = typeof candidate.evaluate === "function" ? await candidate.evaluate((node, { assertedRole, assertedName }) => {
      const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
      const labelledBy = compact(String(node.getAttribute("aria-labelledby") || "").split(/\s+/u).map((id) => document.getElementById?.(id)?.textContent || "").join(" "));
      const labelText = (label) => compact([...label?.childNodes || []].map((child) => {
        if (child.nodeType === Node.TEXT_NODE) return child.textContent || "";
        if (child.nodeType !== Node.ELEMENT_NODE || child.matches("input,select,textarea,button,option,[aria-hidden='true']")) return "";
        return child.textContent || "";
      }).join(" "));
      const linked = node.id ? document.querySelector(`label[for="${CSS.escape(node.id)}"]`) : null;
      const ariaLabel = compact(node.getAttribute("aria-label") || "");
      const label = labelText(linked) || labelText(node.closest("label"));
      const target = {
        role: assertedRole,
        accessibleName: assertedName,
        tag: node.tagName.toLowerCase(),
        inputType: compact(node.getAttribute("type") || ""),
        dataTestId: compact(node.getAttribute("data-testid") || "") || null,
        ariaLabel: ariaLabel || null,
        ariaLabelledBy: labelledBy || null,
        labelText: label || null,
        visible: true,
      };
      return { ...target, signature: JSON.stringify(target) };
    }, { assertedRole: role, assertedName: expectedControl.name }).catch(() => null) : null;
    return { visible: true, assertionTarget };
  }
  return { visible: false, assertionTarget: null };
}

async function waitForNativeDisclosure(page, { name, expectedControl = null, timeout = 2000 } = {}) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    const disclosure = await findNativeDisclosure(page, name);
    if (disclosure) {
      const expectedControlProof = disclosure.detailsOpen ? await expectedControlIsVisible(disclosure, expectedControl) : { visible: false, assertionTarget: null };
      const successorRendered = expectedControlProof.visible;
      last = { ...disclosure, successorRendered, expectedControlProof, assertionTarget: expectedControlProof.assertionTarget || null };
      if (disclosure.detailsOpen && successorRendered) return last;
    }
    await sleep(40);
  }
  return last;
}

export async function openNativeDisclosure(page, { name, expectedControl = null } = {}) {
  const before = await findNativeDisclosure(page, name);
  if (!before) throw new Error(`STATE_RECIPE_SUMMARY_NOT_FOUND:${name || "DETAILS_EXPANDED"}`);
  if (!before.containingDetails) throw new Error(`STATE_RECIPE_DISCLOSURE_NOT_NATIVE:${name || "DETAILS_EXPANDED"}`);
  let activationAttempted = false;
  if (!before.detailsOpen) {
    activationAttempted = true;
    await before.summary.click({ timeout: 3000, noWaitAfter: true, force: false });
  }
  const after = await waitForNativeDisclosure(page, { name, expectedControl });
  if (!after?.detailsOpen) throw new Error(`STATE_RECIPE_DISCLOSURE_OPEN_NOT_STABLE:${name || "DETAILS_EXPANDED"}`);
  if (expectedControl && !after.successorRendered) throw new Error(`STATE_RECIPE_EXPECTED_CONTROL_NOT_RENDERED:${expectedControl.name}`);
  return { ...after, activationAttempted, activationSucceeded: Boolean(after.detailsOpen) };
}

export async function assertNativeDisclosureExpanded(page, { name, expectedControl = null, timeout = 2000 } = {}) {
  const disclosure = await waitForNativeDisclosure(page, { name, expectedControl, timeout });
  if (!disclosure || !disclosure.containingDetails) {
    throw new Error(`STATE_ASSERTION_DISCLOSURE_NOT_STABLE:${name || "DETAILS_EXPANDED"}`);
  }
  if (!disclosure.detailsOpen) throw new Error(`STATE_ASSERTION_DISCLOSURE_NOT_STABLE:${name || "DETAILS_EXPANDED"}:STATE_ASSERTION_DISCLOSURE_NOT_OPEN`);
  const successorRendered = disclosure.successorRendered;
  if (expectedControl && !successorRendered) throw new Error(`STATE_ASSERTION_EXPECTED_CONTROL_NOT_RENDERED:${expectedControl.name}`);
  return { ...disclosure, successorRendered };
}
