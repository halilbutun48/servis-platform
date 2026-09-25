/*
 * Test-first guard for the two proven ROOT-HIT190 remaining-four harness roots.
 * --red runs desired behavior against the pre-corrective runtime and must fail.
 * Normal mode verifies the actual shared no-browser runtime paths.
 */
import assert from "node:assert/strict";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const redMode = process.argv.includes("--red");
const [profiles, runtime, hybrid, nativeDisclosure, browserDescriptor] = await Promise.all([
  import(new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url)),
  import(new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url)),
  import(new URL("./lib/pre_18_hybrid_surface_state_executor.mjs", import.meta.url)),
  import(new URL("./lib/pre_18_native_disclosure_state.mjs", import.meta.url)),
  import(new URL("./lib/pre_18_browser_semantic_descriptor.mjs", import.meta.url)),
]);

function required(owner, name) {
  if (typeof owner[name] !== "function") throw new Error(`REMAINING4_FINAL_CORRECTIVE_REQUIRED:${name}`);
  return owner[name];
}

function domNode({ tag, type = "", label = "", text = "", disabled = false } = {}) {
  const attributes = new Map([
    ["type", type],
    ["aria-label", label],
  ]);
  return {
    nodeType: 1,
    tagName: String(tag || "BUTTON").toUpperCase(),
    disabled,
    id: "",
    innerText: text || label,
    textContent: text || label,
    childNodes: [],
    getAttribute(name) { return attributes.get(name) || null; },
    hasAttribute(name) { return attributes.has(name); },
    matches() { return false; },
    closest() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 120, height: 32 }; },
  };
}

function serializationPage(nodes) {
  const browserRealm = vm.createContext({
    args: null,
    document: {
      querySelectorAll(selector) { return String(selector) === "[role='tab'][aria-selected='true']" ? [] : nodes; },
      querySelector() { return null; },
      getElementById() { return null; },
    },
    window: {},
    CSS: { escape(value) { return String(value); } },
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    getComputedStyle() { return { display: "block", visibility: "visible", opacity: "1" }; },
  });
  vm.runInContext(`window.__pre18CollectOwnerCandidates = () => []; window.__pre18ProjectSemanticControl = ${browserDescriptor.browserSemanticDescriptorSource};`, browserRealm);
  return {
    callbackCount: 0,
    async evaluate(callback, argument) {
      this.callbackCount += 1;
      browserRealm.args = structuredClone(argument);
      return vm.runInContext(`(${callback.toString()})(args)`, browserRealm);
    },
  };
}

function disclosureSequencePage(sequence = []) {
  let read = 0;
  let clicks = 0;
  const stateAt = () => sequence[Math.min(read++, Math.max(sequence.length - 1, 0))] || {};
  return {
    get clicks() { return clicks; },
    locator(selector) {
      if (selector !== "summary") throw new Error(`UNEXPECTED_DISCLOSURE_SELECTOR:${selector}`);
      return {
        async count() { return 1; },
        nth() {
          return {
            async isVisible() { return true; },
            async click() { clicks += 1; },
            async evaluate() {
              const state = stateAt();
              return state.present === false ? null : {
                controlTag: "SUMMARY",
                controlRole: "summary",
                accessibleName: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)",
                containingDetails: state.native !== false,
                detailsOpen: state.open === true,
                ariaExpandedPresent: false,
                ariaExpandedValue: null,
              };
            },
            locator() {
              return {
                getByRole(role, options) {
                  return {
                    async count() { return role === "spinbutton" && options?.name === "Senaryo için maliyet varsayımı (kuruş)" ? 1 : 0; },
                    nth() { return { async isVisible() { return stateAt().controlVisible === true; } }; },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

function stableFinancialObservation(overrides = {}) {
  return {
    routeReadiness: { ready: true, reason: "READY" },
    financialSurfacePresent: true,
    workspacePresent: true,
    loadingPresentationPresent: false,
    baselineResolved: true,
    terminalNoBaselinePresent: false,
    ...overrides,
  };
}

async function remaining4Profile() {
  return profiles.resolveRoomCanonicalReplaySelectionProfile({
    profileId: "ROOM_ROOT_HIT190_REMAINING4_CANARY",
    repositoryRoot,
  });
}

function financialContract(profile) {
  const row = profile.contracts.find((item) => item.REPLAY_SEMANTIC_IDENTITY?.accessibleName === "Senaryo için maliyet varsayımı (kuruş)");
  if (!row) throw new Error("REMAINING4_FINANCIAL_CONTRACT_NOT_FOUND");
  return structuredClone(row);
}

async function applyFinancialRecipeWithAdapters(row, { financialReady = true } = {}) {
  let routeReadyCalls = 0;
  let financialReadyCalls = 0;
  const output = await runtime.applyRoomPrehitStateRecipe({}, row, {
    authReady: true,
    adapters: {
      openRouteWithPositiveReadiness: async () => ({ ready: true, reason: "ROUTE_READY" }),
      waitForPositiveRouteReadiness: async () => {
        routeReadyCalls += 1;
        if (routeReadyCalls > 1) throw new Error("GENERIC_ROUTE_READINESS_USED_FOR_FINANCIAL_STEP");
        return { ready: true, reason: "ROUTE_READY" };
      },
      waitForFinancialOperationsContentSettled: async () => {
        financialReadyCalls += 1;
        if (!financialReady) throw new Error("FINANCIAL_LOADING_PRESENT");
        return { ready: true, reason: "FINANCIAL_CONTENT_STABLE" };
      },
      openNativeDisclosure: async () => ({ detailsOpen: true, successorRendered: true }),
      assertNativeDisclosureExpanded: async () => ({ detailsOpen: true, successorRendered: true }),
    },
  });
  return { output, routeReadyCalls, financialReadyCalls };
}

const surface = { role: "ROOM", route: "/room/financial-operations", viewport: "desktop", state: "base" };
const desiredNumber = () => runtime.enumerate(serializationPage([
  domNode({ tag: "input", type: "number", label: "Yolcu sayısı (kişi)" }),
]), surface);
const desiredButton = () => runtime.enumerate(serializationPage([
  domNode({ tag: "input", type: "number", label: "Ön koşul sayı alanı" }),
  domNode({ tag: "button", label: "+10 yolcu" }),
]), surface);
const desiredText = () => runtime.enumerate(serializationPage([
  domNode({ tag: "input", type: "text", label: "Not" }),
]), surface);

const redChecks = [
  ["RED-1 serialized page.evaluate binds the browser role projection", async () => {
    const actions = await desiredNumber();
    assert.equal(actions[0].action.role, "spinbutton");
  }],
  ["RED-2 actual enumerate reaches browser realm without implicitInputRoles ReferenceError", async () => {
    const page = serializationPage([
      domNode({ tag: "input", type: "number", label: "Ön koşul sayı alanı" }),
      domNode({ tag: "button", label: "+10 yolcu" }),
    ]);
    const actions = await runtime.enumerate(page, surface);
    assert.equal(page.callbackCount, 1);
    assert.equal(actions.find((item) => item.action.name === "+10 yolcu")?.action.name, "+10 yolcu");
  }],
  ["RED-3 number input browser enumeration uses spinbutton", async () => {
    const actions = await desiredNumber();
    assert.equal(actions[0].action.role, "spinbutton");
  }],
  ["RED-4 button browser enumeration remains button", async () => {
    const actions = await desiredButton();
    assert.equal(actions.find((item) => item.action.name === "+10 yolcu")?.action.role, "button");
  }],
  ["RED-5 text input browser enumeration remains textbox", async () => {
    const actions = await desiredText();
    assert.equal(actions[0].action.role, "textbox");
  }],
  ["RED-6 enumeration has no browser-global implicit role dependency", async () => {
    const actions = await desiredNumber();
    assert.equal(actions.length, 1);
  }],
  ["RED-7 browser enumeration preserves shared role parity", async () => {
    const actions = await runtime.enumerate(serializationPage([
      domNode({ tag: "input", type: "number", label: "Maliyet" }),
      domNode({ tag: "input", type: "text", label: "Açıklama" }),
      domNode({ tag: "button", label: "Kaydetme" }),
    ]), surface);
    assert.deepEqual(Array.from(actions, (item) => item.action.role), ["spinbutton", "textbox", "button"]);
  }],
  ["RED-8 route marker plus financial loading is not settled", () => {
    const verdict = required(runtime, "evaluateFinancialOperationsContentSettled")(stableFinancialObservation({ loadingPresentationPresent: true, baselineResolved: false }));
    assert.equal(verdict.ready, false);
    assert.equal(verdict.reason, "FINANCIAL_LOADING_PRESENT");
  }],
  ["RED-9 stable financial content is settled", () => {
    const verdict = required(runtime, "evaluateFinancialOperationsContentSettled")(stableFinancialObservation());
    assert.equal(verdict.ready, true);
  }],
  ["RED-10 producer then transient rerender is re-resolved by assertion", async () => {
    const page = disclosureSequencePage([
      { open: false, controlVisible: false },
      { open: true, controlVisible: true },
      { present: false, open: false, controlVisible: false },
      { open: true, controlVisible: true },
    ]);
    await nativeDisclosure.openNativeDisclosure(page, { name: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)" });
    const result = await nativeDisclosure.assertNativeDisclosureExpanded(page, {
      name: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)",
      expectedControl: { role: "spinbutton", controlTag: "input", inputType: "number", name: "Senaryo için maliyet varsayımı (kuruş)" },
      timeout: 160,
    });
    assert.equal(result.detailsOpen, true);
  }],
  ["RED-11 one-shot disclosure observation is not accepted after transient rerender", async () => {
    const page = disclosureSequencePage([{ present: false, open: false }, { open: true, controlVisible: true }]);
    const result = await nativeDisclosure.assertNativeDisclosureExpanded(page, {
      name: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)",
      expectedControl: { role: "spinbutton", controlTag: "input", inputType: "number", name: "Senaryo için maliyet varsayımı (kuruş)" },
      timeout: 160,
    });
    assert.equal(result.successorRendered, true);
  }],
  ["RED-12 expected spinbutton appears after final stable disclosure", async () => {
    const page = disclosureSequencePage([{ open: false, controlVisible: false }, { open: true, controlVisible: true }]);
    const result = await nativeDisclosure.assertNativeDisclosureExpanded(page, {
      name: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)",
      expectedControl: { role: "spinbutton", controlTag: "input", inputType: "number", name: "Senaryo için maliyet varsayımı (kuruş)" },
      timeout: 160,
    });
    assert.equal(result.successorRendered, true);
  }],
  ["RED-13 unstable disclosure ends in bounded stable-state diagnostic", async () => {
    const page = disclosureSequencePage([{ open: false, controlVisible: false }]);
    await assert.rejects(
      () => nativeDisclosure.assertNativeDisclosureExpanded(page, { name: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)", timeout: 80 }),
      /STATE_ASSERTION_DISCLOSURE_NOT_STABLE/u,
    );
  }],
  ["RED-14 financial state recipe calls specialized readiness before disclosure assertion", async () => {
    const profile = await remaining4Profile();
    const result = await applyFinancialRecipeWithAdapters(financialContract(profile));
    assert.ok(result.financialReadyCalls >= 2);
  }],
  ["RED-15 financial loading prevents the actual state recipe from reaching assertion", async () => {
    const profile = await remaining4Profile();
    await assert.rejects(
      () => applyFinancialRecipeWithAdapters(financialContract(profile), { financialReady: false }),
      /FINANCIAL_LOADING_PRESENT/u,
    );
  }],
  ["RED-16 state recipe preserves the advanced expected control after financial readiness", async () => {
    const profile = await remaining4Profile();
    const result = await applyFinancialRecipeWithAdapters(financialContract(profile));
    const step = result.output.asserted.find((item) => item.type === "NATIVE_DISCLOSURE_OPEN" && item.summary.startsWith("Gelişmiş varsayımlar"));
    assert.equal(step.disclosure.successorRendered, true);
  }],
  ["RED-17 remaining4 parent contract uses the specialized financial readiness path", async () => {
    const profile = await remaining4Profile();
    const result = await applyFinancialRecipeWithAdapters(financialContract(profile));
    assert.equal(result.routeReadyCalls, 1);
    assert.equal(result.financialReadyCalls, 2);
  }],
  ["RED-18 actual enumerate keeps callback-local role projection across a second browser-realm execution", async () => {
    const first = await desiredNumber();
    const second = await desiredButton();
    assert.equal(first[0].action.role, "spinbutton");
    assert.equal(second.find((item) => item.action.name === "+10 yolcu")?.action.role, "button");
  }],
];

const greenGuards = [
  ["preserves the authoritative number role", () => assert.equal(hybrid.deriveImplicitAriaRole({ tag: "input", type: "number" }), "spinbutton")],
  ["preserves remaining4 metadata and frozen selection cardinality", async () => {
    const profile = await remaining4Profile();
    const contract = financialContract(profile);
    assert.equal(profile.FINAL_REPLAY_TARGET_COUNT, 4);
    assert.ok(contract.STATE_RECIPE.produce.some((step) => step.type === "FINANCIAL_OPERATIONS_CONTENT_SETTLED"));
    assert.ok(contract.STATE_RECIPE.assert.some((step) => step.expectedControl?.name === "Senaryo için maliyet varsayımı (kuruş)"));
  }],
];

if (redMode) {
  let observed = 0;
  let unexpectedPass = 0;
  for (const [name, check] of redChecks) {
    try {
      await check();
      unexpectedPass += 1;
      console.error(`RED_UNEXPECTED_PASS ${name}`);
    } catch (error) {
      observed += 1;
      console.log(`RED_OBSERVED ${name}: ${error.message}`);
    }
  }
  console.log(JSON.stringify({
    CORRECTIVE_RED_TEST_COUNT: redChecks.length,
    CORRECTIVE_RED_OBSERVED_COUNT: observed,
    CORRECTIVE_RED_UNEXPECTED_PASS_COUNT: unexpectedPass,
    ACTUAL_PAGE_EVALUATE_CALLBACK_EXECUTED_IN_TEST: "YES",
    BROWSER_REALM_SERIALIZATION_PATH_EXECUTED_IN_TEST: "YES",
    REAL_BROWSER_RUN_STARTED: "NO",
    CHROMIUM_PROCESS_STARTED: "NO",
    PLAYWRIGHT_BROWSER_CONNECTED: "NO",
  }, null, 2));
  process.exitCode = observed === redChecks.length && unexpectedPass === 0 ? 1 : 2;
} else {
  let passed = 0;
  for (const [name, check] of [...redChecks, ...greenGuards]) {
    await check();
    passed += 1;
    console.log(`PASS ${name}`);
  }
  console.log(JSON.stringify({
    FOCUSED_TEST_TOTAL: passed,
    FOCUSED_TEST_PASS: passed,
    FOCUSED_TEST_FAIL: 0,
    ACTUAL_REMAINING4_ENTRYPOINT_EXECUTED_IN_TEST: "YES",
    ACTUAL_ENUMERATE_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_PAGE_EVALUATE_CALLBACK_EXECUTED_IN_TEST: "YES",
    ACTUAL_BROWSER_CALLBACK_SERIALIZATION_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_FINANCIAL_READINESS_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_STATE_RECIPE_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_NATIVE_DISCLOSURE_ASSERTION_PATH_EXECUTED_IN_TEST: "YES",
    REAL_BROWSER_RUN_STARTED: "NO",
    CHROMIUM_PROCESS_STARTED: "NO",
    PLAYWRIGHT_BROWSER_CONNECTED: "NO",
  }, null, 2));
}
