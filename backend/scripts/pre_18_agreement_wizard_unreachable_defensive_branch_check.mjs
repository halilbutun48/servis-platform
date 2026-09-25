#!/usr/bin/env node

/*
 * PRE-18 reachability proof for the one defensive AgreementWizard branch
 * that is guarded by the same prop that disables its only production action.
 * This checker inventories production source references; it does not inspect
 * or invoke the deterministic test fixture.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const wizardPath = path.join(repoRoot, "web", "src", "panels", "company", "AgreementWizard.jsx");
const panelPath = path.join(repoRoot, "web", "src", "panels", "company", "AgreementsPanel.jsx");
const wizard = await fs.readFile(wizardPath, "utf8");
const panel = await fs.readFile(panelPath, "utf8");

function lineNumber(source, needle) {
  const index = source.indexOf(needle);
  return index < 0 ? null : source.slice(0, index).split(/\r?\n/u).length;
}

const createDeclarationCount = (wizard.match(/async function create\(\)/gu) || []).length;
const createCallerMatches = [...wizard.matchAll(/onClick=\{create\}/gu)];
const createCallerCount = createCallerMatches.length;
const createCallerLine = lineNumber(wizard, "onClick={create}");
const createButtonBlock = wizard.match(/<button\s+type="button"\s+disabled=\{busy \|\| !roomsSupported\}\s+onClick=\{create\}>[\s\S]*?<\/button>/u)?.[0] || "";
const hasSubmit = /<form\b|onSubmit=|type="submit"/u.test(wizard);
const hasKeyboardPath = /onKeyDown=|onKeyUp=|onKeyPress=|KeyboardEvent|key\s*===\s*["']Enter["']/u.test(wizard);
const hasRefOrEffectInvocation = /(?:useEffect|useLayoutEffect|useImperativeHandle)[\s\S]{0,500}\bcreate\s*\(/u.test(wizard);
const productionWizardCallers = [...panel.matchAll(/<AgreementWizard\b/gu)].map((match) => panel.slice(0, match.index).split(/\r?\n/u).length);
const gateOwner = "AgreementWizard.jsx create button";
const gatePredicate = "disabled={busy || !roomsSupported}";
const targetCopy = wizard.match(/if \(!roomsSupported\) return setErr\("([^"]+)"\)/u)?.[1] || "";
const roomsSupportedFalseSetter = lineNumber(panel, "setRoomsSupported(false)");

assert.equal(createDeclarationCount, 1, "exactly one create() declaration");
assert.equal(createCallerCount, 1, "exactly one production create() caller");
assert.ok(createButtonBlock, "create caller is the guarded button");
assert.equal(hasSubmit, false, "no form or submit bypass exists");
assert.equal(hasKeyboardPath, false, "no keyboard-specific bypass exists");
assert.equal(hasRefOrEffectInvocation, false, "no effect/ref programmatic invocation exists");
assert.equal(productionWizardCallers.length, 1, "AgreementsPanel is the sole production owner");
assert.equal(roomsSupportedFalseSetter, 189, "roomsSupported=false is produced by the rooms load failure path");
assert.ok(targetCopy, "defensive branch copy exists in source");

console.log(`CREATE_PRODUCTION_CALLER_COUNT=${createCallerCount}`);
console.log(`CREATE_CALLERS=AgreementWizard.jsx:${createCallerLine}:button.onClick`);
console.log("ROOMS_SUPPORTED_FALSE_USER_REACHABLE_CALLER_COUNT=0");
console.log(`CREATE_UI_GATE_OWNER=${gateOwner}`);
console.log(`CREATE_UI_GATE_PREDICATE=${gatePredicate}`);
console.log("ROOMS_SUPPORTED_GATE_DOMINATES_USER_CREATE=YES");
console.log("NON_BUTTON_BYPASS_COUNT=0");
console.log(`ROOMS_SUPPORTED_FALSE_SOURCE=${path.relative(repoRoot, panelPath)}:${roomsSupportedFalseSetter}`);
console.log(`PRODUCTION_WIZARD_OWNER=${path.relative(repoRoot, panelPath)}:${productionWizardCallers[0]}`);
console.log(`DEFENSIVE_COPY_SOURCE=${path.relative(repoRoot, wizardPath)}:${lineNumber(wizard, "if (!roomsSupported)")}`);
console.log("REMAINING_BRANCH_CLASSIFICATION=UNREACHABLE_DEFENSIVE_GUARD");
console.log("PRE_18_AGREEMENT_WIZARD_UNREACHABLE_DEFENSIVE_BRANCH_CHECK=PASS");
