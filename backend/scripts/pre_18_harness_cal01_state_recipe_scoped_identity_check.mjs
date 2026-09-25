/*
 * CAL-01 RED -> GREEN guard.
 *
 * This no-browser check invokes the real ROOM enumerator and canonical
 * profile resolver against a browser-shaped DOM double. It proves current
 * route and tab projections without changing frozen selections or launching
 * Chromium.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const redMode = process.argv.includes("--red");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const runtime = await import(new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url));
const profiles = await import(new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url));
const browserDescriptor = await import(new URL("./lib/pre_18_browser_semantic_descriptor.mjs", import.meta.url));
const projectSemanticControl = (0, eval)(browserDescriptor.browserSemanticDescriptorSource);

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

class FixtureTextNode {
  constructor(text) {
    this.nodeType = 3;
    this.textContent = text;
  }
}

class FixtureElement {
  constructor({
    tagName = "DIV",
    text = "",
    attrs = {},
    children = [],
    visible = true,
    parent = null,
  } = {}) {
    this.nodeType = 1;
    this.tagName = tagName;
    this.attrs = new Map(Object.entries(attrs));
    this.children = children;
    this.visible = visible;
    this.parent = parent;
    this.disabled = false;
    for (const child of children) {
      if (child?.nodeType === 1) child.parent = this;
    }
    if (text) this.children.unshift(new FixtureTextNode(text));
  }

  get id() { return this.getAttribute("id") || ""; }
  get childNodes() { return this.children; }
  get textContent() { return this.children.map((child) => child.textContent || "").join(""); }
  get innerText() { return this.textContent; }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getBoundingClientRect() { return this.visible ? { width: 160, height: 32 } : { width: 0, height: 0 }; }

  matches(selector) {
    return String(selector).split(",").some((part) => {
      const value = part.trim();
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
      if (String(selector).split(",").some((part) => {
        const value = part.trim();
        if (value === "label") return current.tagName === "LABEL";
        if (value === "details") return current.tagName === "DETAILS";
        if (value === ".navAdvanced") return current.getAttribute("class")?.split(/\s+/u).includes("navAdvanced");
        if (value === ".navItem" || value === ".navToggle" || value === ".navDockItems") return false;
        if (value === "[role='dialog']") return current.getAttribute("role") === "dialog";
        if (value === ".modal" || value === "[data-drawer]" || value === ".copilotDrawer") return false;
        return false;
      })) return current;
      current = current.parent;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      if (!node || node.nodeType !== 1) return;
      if (String(selector).split(",").some((part) => {
        const value = part.trim();
        if (value === ".panelSegmentTabLabel") return node.getAttribute("class")?.split(/\s+/u).includes("panelSegmentTabLabel");
        if (value === ".panelSegmentTabBadge") return node.getAttribute("class")?.split(/\s+/u).includes("panelSegmentTabBadge");
        if (value === ".collapsibleSectionTitle" || value === ".collapsibleSectionSubtitle" || value === ".collapsibleSectionBadge") return false;
        if (value === "svg title") return false;
        return false;
      })) matches.push(node);
      for (const child of node.children) visit(child);
    };
    for (const child of this.children) visit(child);
    return matches;
  }
}

function panelTab({ label, badge, visible = true } = {}) {
  return new FixtureElement({
    tagName: "BUTTON",
    attrs: { role: "tab", "aria-selected": "true" },
    visible,
    children: [
      new FixtureElement({ tagName: "SPAN", attrs: { class: "panelSegmentTabLabel" }, text: label }),
      ...(badge == null ? [] : [new FixtureElement({ tagName: "SPAN", attrs: { class: "panelSegmentTabBadge" }, text: String(badge) })]),
    ],
  });
}

function browserFixture({ activeTabs, action }) {
  const controls = [action];
  const document = {
    querySelectorAll(selector) {
      if (String(selector) === "[role='tab'][aria-selected='true']") return activeTabs;
      return controls;
    },
    querySelector(selector) {
      if (String(selector) === "[role='tab'][aria-selected='true']") return activeTabs[0] || null;
      return null;
    },
    getElementById() { return null; },
  };
  return {
    async evaluate(callback, argument) {
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
        __pre18CollectOwnerCandidates: () => [],
        __pre18ProjectSemanticControl: projectSemanticControl,
      };
      globalThis.getComputedStyle = () => ({ display: "block", visibility: "visible", opacity: "1" });
      try {
        return callback(argument);
      } finally {
        globalThis.document = saved.document;
        globalThis.Node = saved.Node;
        globalThis.CSS = saved.CSS;
        globalThis.window = saved.window;
        globalThis.getComputedStyle = saved.getComputedStyle;
      }
    },
  };
}

async function enumeratedActiveTab({ label = "Bekleyen Talepler", badge = 16, tabs = null } = {}) {
  const action = new FixtureElement({ tagName: "BUTTON", text: "Detayları göster" });
  const currentTabs = tabs || [panelTab({ label, badge })];
  const rows = await runtime.enumerate(browserFixture({ activeTabs: currentTabs, action }), {
    role: "ROOM",
    route: "/room/shifts",
    viewport: "desktop",
    state: "base",
  });
  return rows[0]?.materialState?.activeTab;
}

let batch01Profile = null;
async function batch01() {
  if (!batch01Profile) {
    batch01Profile = await profiles.resolveRoomCanonicalReplaySelectionProfile({
      profileId: profiles.ROOM_CANONICAL_REPLAY_PROFILE_IDS.OTHER423_BATCH01_SHARED_CORE_CANARY,
      repositoryRoot,
    });
  }
  return batch01Profile;
}

async function batchRow(clusterId) {
  const profile = await batch01();
  const row = profile.contracts.find((candidate) => candidate.OTHER423_CLUSTER_ID === clusterId);
  assert.ok(row, `missing Batch01 cluster ${clusterId}`);
  return row;
}

function types(recipe) {
  return recipe.produce.map((step) => step.type);
}

test("CAL01-RED-1 PanelSegmentTabs label excludes a dynamic badge", async () => {
  assert.equal(await enumeratedActiveTab({ badge: 16 }), "Bekleyen Talepler");
});

test("CAL01-RED-2 badge one does not alter tab semantic identity", async () => {
  assert.equal(await enumeratedActiveTab({ badge: 1 }), "Bekleyen Talepler");
});

test("CAL01-RED-3 badge sixteen does not alter tab semantic identity", async () => {
  assert.equal(await enumeratedActiveTab({ badge: 16 }), "Bekleyen Talepler");
});

test("CAL01-RED-4 badge ninety-nine does not alter Turkish tab text", async () => {
  assert.equal(await enumeratedActiveTab({ label: "İşlemler", badge: 99 }), "İşlemler");
});

test("CAL01-RED-5 visible active tab wins over hidden ambient selected tab", async () => {
  assert.equal(await enumeratedActiveTab({
    tabs: [panelTab({ label: "Harita", badge: 0, visible: false }), panelTab({ label: "Bekleyen Talepler", badge: 16, visible: true })],
  }), "Bekleyen Talepler");
});

test("CAL01-RED-6 map contract projects to the canonical map route without a home-workspace tab", async () => {
  const row = await batchRow("OTHER423-0F18FEA40174");
  assert.equal(row.CURRENT_ROUTE, "/room/map");
  assert.deepEqual(types(row.STATE_RECIPE).slice(-2), ["ROUTE_CONTENT_READY", "ROOM_ACTIVE_TAB"]);
});

test("CAL01-RED-7 legacy pending badge suffix becomes exact semantic tab identity", async () => {
  const row = await batchRow("OTHER423-23EB541C61DF");
  const tab = row.STATE_RECIPE.produce.find((step) => step.type === "ROOM_ACTIVE_TAB");
  assert.equal(tab?.tab, "bekleyen talepler");
});

test("CAL01-GREEN financial target uses the current two-step native disclosure contract", async () => {
  const row = await batchRow("OTHER423-0DAD48B8BCAD");
  const open = row.STATE_RECIPE.produce.find((step) => step.type === "NATIVE_DISCLOSURE_OPEN");
  assert.equal(open?.summary, "Karşılaştırma, senaryo ve dışa aktarım");
  assert.equal(open?.expectedControl?.name, "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)");
  assert.equal(row.CURRENT_REPLAY_ACTION?.name, "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)");
  assert.equal(row.CURRENT_SUCCESSOR_ASSERTION?.expectedControl?.name, "Maliyet ve operasyon ayrıntıları");
});

test("CAL01-RED-8 navigation target does not inherit an unrelated hidden Harita tab", async () => {
  const row = await batchRow("OTHER423-402478959056");
  assert.equal(types(row.STATE_RECIPE).includes("ROOM_ACTIVE_TAB"), false);
});

test("CAL01-RED-9 map textbox projects to the canonical map route without inheriting home workspace state", async () => {
  const row = await batchRow("OTHER423-92F21E83F868");
  assert.equal(row.CURRENT_ROUTE, "/room/map");
  assert.deepEqual(types(row.STATE_RECIPE).slice(-3), ["ROUTE_CONTENT_READY", "NATIVE_DISCLOSURE_OPEN", "ROOM_ACTIVE_TAB"]);
  const disclosure = row.STATE_RECIPE.produce.find((step) => step.type === "NATIVE_DISCLOSURE_OPEN");
  assert.equal(disclosure?.summary, "Filtreler ve yenileme");
  assert.equal(row.CURRENT_REPLAY_SEMANTIC_IDENTITY?.primaryDisambiguator, "EXACT_CURRENT_MAP_FILTER_DISCLOSURE");
});

test("CAL01-RED-10 legacy missing tab identity stays a strict failure after scoped projection", async () => {
  const row = await batchRow("OTHER423-23EB541C61DF");
  const active = row.STATE_RECIPE.produce.find((step) => step.type === "ROOM_ACTIVE_TAB");
  assert.equal(active?.tab, "bekleyen talepler");
  assert.equal(active?.postcondition, "ARIA_SELECTED_TRUE");
});

test("CAL01-GREEN wrong current tab remains a strict state-recipe failure", async () => {
  const row = await batchRow("OTHER423-23EB541C61DF");
  await assert.rejects(() => runtime.applyRoomPrehitStateRecipe({}, row, {
    authReady: true,
    adapters: {
      openRouteWithPositiveReadiness: async () => ({ ready: true }),
      waitForPositiveRouteReadiness: async () => ({ ready: true }),
      ensureRoomActiveTab: async () => { throw new Error("STATE_RECIPE_ROOM_TAB_NOT_FOUND:başka sekme"); },
    },
}), /STATE_RECIPE_ROOM_TAB_NOT_FOUND:başka sekme/u);
});

test("CAL01-GREEN semantic tab matching ignores presentation-only badge text", async () => {
  const tab = panelTab({ label: "Bekleyen Talepler", badge: 16 });
  const locator = {
    async isVisible() { return true; },
    async evaluate(callback) { return callback(tab); },
    async getAttribute(name) { return tab.getAttribute(name); },
    async click() { throw new Error("already selected tab must not be clicked"); },
  };
  const page = {
    getByRole(role) {
      assert.equal(role, "tab");
      return { count: async () => 1, nth: () => locator };
    },
  };
  const result = await runtime.ensureRoomActiveTab(page, { tab: "bekleyen talepler", activate: false });
  assert.equal(result.selected, true);
});

let failures = 0;
let passes = 0;
const runnableCases = redMode ? cases.filter((item) => item.name.includes("CAL01-RED")) : cases;
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
  const expectedRed = runnableCases.length;
  console.log(JSON.stringify({
    CAL01_RED_TEST_COUNT: expectedRed,
    CAL01_RED_OBSERVED_COUNT: failures,
    CAL01_RED_UNEXPECTED_PASS_COUNT: passes,
  }));
  if (failures !== expectedRed) process.exitCode = 1;
} else if (failures) {
  console.log(`PRE_18_HARNESS_CAL01_STATE_RECIPE_SCOPED_IDENTITY_CHECK=RED (${failures}/${runnableCases.length})`);
  process.exitCode = 1;
} else {
  console.log("PRE_18_HARNESS_CAL01_STATE_RECIPE_SCOPED_IDENTITY_CHECK=PASS");
}
