/*
 * Browser-representation faithful, no-browser test fixture.
 *
 * This is test support only.  It deliberately models the runtime details that
 * synthetic object-only tests historically missed: browser-uppercase tagName,
 * wrapping labels, separate tab badge nodes, closed details containment, and
 * a replacement node between semantic resolution and physical binding.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { browserSemanticDescriptorSource } from "./pre_18_browser_semantic_descriptor.mjs";
import * as hybrid from "./pre_18_hybrid_surface_state_executor.mjs";
import * as runtime from "../pre_18_luna_full_hybrid_surface_state_completion.mjs";
import * as profiles from "./pre_18_room_canonical_replay_selection_profile.mjs";

export const BROWSER_REALISTIC_FIXTURE_CAPABILITIES = [
  "PANEL_SEGMENT_TAB_LABEL_AND_BADGE",
  "CLOSED_DETAILS_TARGET_CONTAINMENT",
  "UPPERCASE_BROWSER_DOM_TAGS",
  "WRAPPING_LABEL_ACCESSIBLE_NAME",
  "INPUT_NUMBER_IMPLICIT_SPINBUTTON",
  "DESCRIPTOR_TO_BINDING_LIFECYCLE",
  "RERENDER_REPLACEMENT_BINDING",
  "ACTUAL_RUNTIME_PATH_EVIDENCE",
];

const projectSemanticControl = (0, eval)(browserSemanticDescriptorSource);

class TextNode {
  constructor(text) { this.nodeType = 3; this.textContent = String(text); }
}

class Element {
  constructor({ tagName = "DIV", text = "", attrs = {}, children = [], visible = true, disabled = false } = {}) {
    this.nodeType = 1;
    this.tagName = tagName;
    this.attrs = new Map(Object.entries(attrs));
    this.children = [...children];
    this.visible = visible;
    this.disabled = disabled;
    this.parent = null;
    for (const child of this.children) if (child?.nodeType === 1) child.parent = this;
    if (text) this.children.unshift(new TextNode(text));
  }

  get id() { return this.getAttribute("id") || ""; }
  get childNodes() { return this.children; }
  get textContent() { return this.children.map((child) => child.textContent || "").join(""); }
  get innerText() { return this.textContent; }
  get name() { return this.getAttribute("name") || ""; }
  get placeholder() { return this.getAttribute("placeholder") || ""; }
  get value() { return this.getAttribute("value") || ""; }
  get checked() { return this.getAttribute("checked") === "true"; }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getBoundingClientRect() { return this.visible ? { width: 160, height: 32 } : { width: 0, height: 0 }; }

  matches(selector) {
    return String(selector).split(",").some((entry) => {
      const value = entry.trim();
      if (value === this.tagName.toLowerCase()) return true;
      if (value === "[aria-hidden='true']") return this.getAttribute("aria-hidden") === "true";
      if (value === "button[type='submit']") return this.tagName === "BUTTON" && this.getAttribute("type") === "submit";
      if (value === "input[type='submit']") return this.tagName === "INPUT" && this.getAttribute("type") === "submit";
      return false;
    });
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (String(selector).split(",").some((entry) => {
        const value = entry.trim();
        if (value === "label") return current.tagName === "LABEL";
        if (value === "details") return current.tagName === "DETAILS";
        if (value === ".navAdvanced") return current.classList().includes("navAdvanced");
        if (value === ".navItem" || value === ".navToggle" || value === ".navDockItems") return current.classList().includes(value.slice(1));
        if (value === "[role='dialog']") return current.getAttribute("role") === "dialog";
        if (value === ".modal") return current.classList().includes("modal");
        if (value === "[data-drawer]") return current.getAttribute("data-drawer") !== null;
        if (value === ".copilotDrawer") return current.classList().includes("copilotDrawer");
        return false;
      })) return current;
      current = current.parent;
    }
    return null;
  }

  classList() { return String(this.getAttribute("class") || "").split(/\s+/u).filter(Boolean); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const matched = [];
    const visit = (node) => {
      if (!node || node.nodeType !== 1) return;
      if (String(selector).split(",").some((entry) => {
        const value = entry.trim();
        if (value === ".panelSegmentTabLabel" || value === ".panelSegmentTabBadge") return node.classList().includes(value.slice(1));
        if (value === ".collapsibleSectionTitle" || value === ".collapsibleSectionSubtitle" || value === ".collapsibleSectionBadge") return node.classList().includes(value.slice(1));
        if (value === "svg title") return node.tagName === "TITLE" && node.parent?.tagName === "SVG";
        if (value === "h1" || value === "h2" || value === "h3" || value === "h4" || value === "h5" || value === "h6") return node.tagName === value.toUpperCase();
        if (value === "[role='heading']") return node.getAttribute("role") === "heading";
        return false;
      })) matched.push(node);
      for (const child of node.children) visit(child);
    };
    for (const child of this.children) visit(child);
    return matched;
  }
}

function visible(node) { return node?.visible === true; }
function panelTab(label, badge, { selected = true, visible: tabVisible = true } = {}) {
  return new Element({
    tagName: "BUTTON",
    attrs: { role: "tab", "aria-selected": selected ? "true" : "false" },
    visible: tabVisible,
    children: [
      new Element({ tagName: "SPAN", attrs: { class: "panelSegmentTabLabel" }, text: label }),
      new Element({ tagName: "SPAN", attrs: { class: "panelSegmentTabBadge" }, text: String(badge) }),
    ],
  });
}

function ownerCandidate() {
  return {
    type: "card",
    semanticLabel: "Karşılaştırma, senaryo ve dışa aktarım",
    businessTarget: { type: "SCENARIO", id: "financial-1" },
    businessContext: "Karşılaştırma, senaryo ve dışa aktarım",
    interactiveDescendantCount: 1,
    navigationDescendantCount: 0,
    textLength: 39,
    depth: 1,
  };
}

function createFinancialDom({ replacement = false } = {}) {
  // A rerender may replace the node object, but it must retain its canonical
  // physical identity. A changed test id is correctly a different target and
  // belongs in CAL-02's negative cases.
  const input = new Element({ tagName: "INPUT", attrs: { type: "number", "data-testid": "financial-input" } });
  const labelled = new Element({
    tagName: "LABEL",
    text: "Senaryo için maliyet varsayımı (kuruş)",
    children: [input],
  });
  const tab = panelTab("Bekleyen Talepler", 16);
  return { input, labelled, tab, controls: [input], tabs: [tab] };
}

function createBatch01FinancialActionDom() {
  const action = new Element({ tagName: "BUTTON", text: "Maliyet ve operasyon ayrıntıları" });
  return { action, controls: [action], tabs: [panelTab("Bekleyen Talepler", 16)], ownerCandidates: [] };
}

function withDom(dom, callback) {
  const document = {
    querySelectorAll(selector) {
      const value = String(selector);
      if (value.includes("[role='tab'][aria-selected='true']")) return dom.tabs;
      if (value === "input,select,textarea") return dom.controls;
      return dom.controls;
    },
    querySelector(selector) {
      const value = String(selector);
      if (value.startsWith("label[for=")) return null;
      if (value.includes("[role='tab'][aria-selected='true']")) return dom.tabs[0] || null;
      return null;
    },
    getElementById() { return null; },
  };
  const saved = {
    document: globalThis.document,
    Node: globalThis.Node,
    CSS: globalThis.CSS,
    window: globalThis.window,
    getComputedStyle: globalThis.getComputedStyle,
  };
  globalThis.document = document;
  globalThis.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 };
  globalThis.CSS = { escape: (value) => String(value) };
  globalThis.window = {
    __pre18CollectOwnerCandidates: () => dom.ownerCandidates || [ownerCandidate()],
    __pre18ProjectSemanticControl: projectSemanticControl,
  };
  globalThis.getComputedStyle = () => ({ display: "block", visibility: "visible", opacity: "1" });
  try { return callback(document); } finally {
    globalThis.document = saved.document;
    globalThis.Node = saved.Node;
    globalThis.CSS = saved.CSS;
    globalThis.window = saved.window;
    globalThis.getComputedStyle = saved.getComputedStyle;
  }
}

function runtimePage(currentDom) {
  const page = {
    async evaluate(callback, argument) { return withDom(currentDom(), () => callback(argument)); },
    locator() {
      return {
        async count() { return currentDom().controls.length; },
        nth(index) {
          const node = currentDom().controls[index];
          return {
            async isVisible() { return visible(node); },
            async evaluate(callback, argument) { return withDom(currentDom(), () => callback(node, argument)); },
            async elementHandle() { return { async isVisible() { return visible(node); }, async isDisabled() { return node.disabled; }, async evaluate() { return null; } }; },
          };
        },
      };
    },
  };
  return page;
}

function expectedFinancialMeta() {
  return {
    action: { role: "spinbutton", name: "Senaryo için maliyet varsayımı (kuruş)" },
    owner: { type: "card", label: "Karşılaştırma, senaryo ve dışa aktarım" },
    businessTarget: { type: "SCENARIO", id: "financial-1" },
    businessContext: "Karşılaştırma, senaryo ve dışa aktarım",
    semanticIdentity: { structuralContext: { formControl: "input" } },
  };
}

async function exerciseStateRecipeContainment() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const profile = await profiles.resolveRoomCanonicalReplaySelectionProfile({
    profileId: profiles.ROOM_CANONICAL_REPLAY_PROFILE_IDS.OTHER423_BATCH01_SHARED_CORE_CANARY,
    repositoryRoot,
  });
  const row = profile.contracts.find((item) => item.OTHER423_CLUSTER_ID === "OTHER423-0F18FEA40174");
  assert.ok(row, "Batch01 Harita representative missing");
  const trace = [];
  class DetailsElement { constructor() { this.open = false; } querySelector() { return {}; } }
  const details = new DetailsElement();
  const page = {
    locator(selector) {
      if (selector === "details[data-details='task-workspace']") {
        return {
          async evaluate(callback) {
            const previous = globalThis.HTMLDetailsElement;
            globalThis.HTMLDetailsElement = DetailsElement;
            try { return callback(details); } finally { globalThis.HTMLDetailsElement = previous; }
          },
          async isVisible() { return details.open; },
        };
      }
      if (selector === "details[data-details='task-workspace'] .roleTaskDetailsBody") {
        return { async isVisible() { return details.open; } };
      }
      return { async evaluate() { return null; }, async isVisible() { return false; }, async count() { return 0; }, nth() { return this; } };
    },
  };
  const result = await runtime.applyRoomPrehitStateRecipe(page, row, {
    authReady: true,
    adapters: {
      openRouteWithPositiveReadiness: async () => ({ ready: true }),
      waitForPositiveRouteReadiness: async () => ({ ready: true }),
      openNativeDisclosure: async () => { details.open = true; trace.push("ROOM_TASK_WORKSPACE_OPEN"); return { opened: true }; },
      assertNativeDisclosureExpanded: async () => ({ expanded: true }),
      ensureRoomActiveTab: async (_page, { tab, activate }) => { trace.push(`${activate ? "produce" : "assert"}:ROOM_ACTIVE_TAB:${tab}`); assert.equal(details.open, true); return { tab, selected: true }; },
    },
  });
  assert.equal(result.produced.some((item) => item.type === "ROOM_TASK_WORKSPACE_OPEN"), true);
  assert.equal(trace[0], "ROOM_TASK_WORKSPACE_OPEN");
  return true;
}

async function exerciseBatch01FinancialBinding() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const profile = await profiles.resolveRoomCanonicalReplaySelectionProfile({
    profileId: profiles.ROOM_CANONICAL_REPLAY_PROFILE_IDS.OTHER423_BATCH01_SHARED_CORE_CANARY,
    repositoryRoot,
  });
  const row = profile.contracts.find((item) => item.OTHER423_CLUSTER_ID === "OTHER423-0DAD48B8BCAD");
  assert.ok(row, "Batch01 financial representative missing");
  const historicalMeta = {
    action: {
      role: row.ACTION_ROLE,
      name: row.ACTION_NAME,
      expectedEffectClass: row.EXPECTED_EFFECT_CLASS,
      safetyClass: row.SAFETY_CLASS,
    },
    owner: {
      type: row.CONTEXTUAL_OWNER_TYPE,
      label: row.CONTEXTUAL_OWNER_LABEL,
      boundedOrdinal: row.BOUNDED_OWNER_ORDINAL ?? null,
    },
    semanticIdentity: row.REPLAY_SEMANTIC_IDENTITY || null,
  };
  const page = runtimePage(() => createBatch01FinancialActionDom());
  const candidates = await runtime.enumerate(page, {
    role: row.ROLE,
    route: row.ROUTE,
    viewport: row.VIEWPORT,
    state: "base",
  });
  const resolution = runtime.resolveFreshSemanticActionWithDiagnostics(historicalMeta, candidates);
  assert.ok(resolution.currentMeta, "Batch01 financial semantic resolution failed");
  const binding = await runtime.matchingLocator(page, resolution.currentMeta);
  assert.ok(binding?.loc, "Batch01 financial binder did not consume the authoritative descriptor");
  const diagnostic = runtime.getLocatorBindingDiagnostics(resolution.currentMeta);
  assert.equal(diagnostic?.AUTHORITATIVE_DESCRIPTOR_CONSUMED, true);
  assert.equal(diagnostic?.BINDER_INDEPENDENT_SEMANTIC_TRUTH_CREATED, false);
  assert.equal(diagnostic?.OWNER_MATCH, true);
  assert.equal(diagnostic?.STRUCTURE_MATCH, true);
  return true;
}

export async function exerciseBrowserRealisticRuntimePaths() {
  const firstDom = createFinancialDom();
  const page = runtimePage(() => firstDom);
  const surface = { role: "ROOM", route: "/room/financial-operations", viewport: "desktop", state: "base" };
  const candidates = await runtime.enumerate(page, surface);
  const candidate = candidates[0];
  assert.ok(candidate, "actual enumerate did not yield the financial input");
  const resolution = runtime.resolveFreshSemanticActionWithDiagnostics(expectedFinancialMeta(), candidates);
  assert.ok(resolution.currentMeta, `actual semantic resolver did not resolve the financial input:${JSON.stringify(resolution.resolutionDiagnostics || {})}`);
  const context = resolution.currentMeta;
  const firstBinding = await runtime.matchingLocator(page, context);
  assert.ok(firstBinding?.loc, "actual locator binder did not consume the resolved descriptor");

  const replacementDom = createFinancialDom({ replacement: true });
  const replacementPage = runtimePage(() => replacementDom);
  const replacementBinding = await runtime.matchingLocator(replacementPage, context);
  assert.ok(replacementBinding?.loc, "same-identity replacement node did not rebind");
  assert.equal(runtime.sameBoundSemanticTarget(firstBinding.physicalIdentity, replacementBinding.physicalIdentity), true);

  const detailsContainment = await exerciseStateRecipeContainment();
  const batch01FinancialBinding = await exerciseBatch01FinancialBinding();
  const diagnostic = runtime.getLocatorBindingDiagnostics(context);
  return {
    PANEL_SEGMENT_TAB_LABEL_AND_BADGE: candidate.materialState.activeTab === "Bekleyen Talepler",
    CLOSED_DETAILS_TARGET_CONTAINMENT: detailsContainment,
    UPPERCASE_BROWSER_DOM_TAGS: candidate.control.tag === "INPUT",
    WRAPPING_LABEL_ACCESSIBLE_NAME: candidate.control.accessibleName === "Senaryo için maliyet varsayımı (kuruş)" && candidate.control.nameSource === "wrapping-label",
    INPUT_NUMBER_IMPLICIT_SPINBUTTON: candidate.action.role === "spinbutton" && candidate.control.type === "number",
    DESCRIPTOR_TO_BINDING_LIFECYCLE: Boolean(firstBinding.bindingTelemetry?.AUTHORITATIVE_DESCRIPTOR_CONSUMED) && firstBinding.bindingTelemetry?.BINDER_INDEPENDENT_SEMANTIC_TRUTH_CREATED === false,
    RERENDER_REPLACEMENT_BINDING: replacementBinding.bindingTelemetry?.POST_RERENDER_IDENTITY_REVALIDATED === true,
    ACTUAL_RUNTIME_PATH_EVIDENCE: Boolean(diagnostic?.AUTHORITATIVE_DESCRIPTOR_KEY) && hybrid.deriveImplicitAriaRole({ tag: "INPUT", type: "NUMBER" }) === "spinbutton",
    BATCH01_FINANCIAL_AUTHORITATIVE_BINDING: batch01FinancialBinding,
  };
}
