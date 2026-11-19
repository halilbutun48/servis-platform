import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const avatarSource = readFileSync(new URL("./SeferAbiAvatar.jsx", import.meta.url), "utf8");
const launcherSource = readFileSync(new URL("./FloatingCopilotDrawer.jsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../../panels/shared/CopilotPanel.jsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../../index.css", import.meta.url), "utf8");

test("avatar sizing contract reserves readable Canvas targets without changing the asset", () => {
  assert.match(launcherSource, /<SeferAbiAvatar state=\{drawerAvatarState\} size=\{80\} frameless \/>/);
  assert.match(launcherSource, /<SeferAbiAvatar state=\{drawerAvatarState\} size=\{112\} frameless \/>/);
  assert.match(workspaceSource, /<SeferAbiAvatar state=\{fullAvatarState\} size=\{80\}/);
  assert.match(avatarSource, /premiumAvatarAsset/);
  assert.match(cssSource, /\.copilotFab--mascot\s*\{[\s\S]*?width:\s*80px;[\s\S]*?height:\s*80px;/);
  assert.match(cssSource, /\.copilotMascotAvatar[\s\S]*?\.copilotFab--mascot \.seferAbiAvatar\s*\{\s*width:\s*64px !important;\s*height:\s*64px !important;/);
  assert.match(cssSource, /@media \(min-width: 721px\) and \(max-width: 1180px\)[\s\S]*?\.copilotFab--mascot[\s\S]*?width:\s*72px;[\s\S]*?height:\s*72px;[\s\S]*?\.copilotMascotAvatar[\s\S]*?width:\s*56px(?:\s*!important)?;[\s\S]*?height:\s*56px(?:\s*!important)?;/);
  assert.match(cssSource, /@media \(max-width: 720px\)[\s\S]*?\.copilotFab--mascot[\s\S]*?width:\s*64px;[\s\S]*?height:\s*64px;[\s\S]*?\.copilotMascotAvatar[\s\S]*?width:\s*48px(?:\s*!important)?;[\s\S]*?height:\s*48px(?:\s*!important)?;/);
  assert.match(cssSource, /\.copilotDrawerIdentity > \.seferAbiAvatar\s*\{[\s\S]*?width:\s*112px !important;[\s\S]*?height:\s*112px !important;/);
  assert.match(cssSource, /\.copilotDrawerTitle \{\n\s+min-width: 0;\n\s+max-width: 100%;\n\s+overflow: hidden;\n\s+text-overflow: ellipsis;/);
});

test("frameless launcher and drawer keep the portrait visible without a circular shell", () => {
  assert.match(avatarSource, /frameless = false/);
  assert.match(avatarSource, /seferAbiAvatar--frameless/);
  assert.match(launcherSource, /copilotFab--frameless/);
  assert.match(cssSource, /\.copilotFab--mascot\.copilotFab--frameless[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none;/);
  assert.match(cssSource, /\.seferAbiAvatar--frameless[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?border-radius:\s*0;/);
  assert.match(cssSource, /\.seferAbiAvatar--frameless::before[\s\S]*?display:\s*none;/);
  assert.match(cssSource, /\.seferAbiAvatar--frameless::after[\s\S]*?display:\s*none;/);
});

test("open drawer placement rechecks async task controls and has a centered mobile fallback", () => {
  assert.match(launcherSource, /MutationObserver/);
  assert.match(launcherSource, /copilotDrawer--task-home-middle/);
  assert.match(launcherSource, /setMobileDrawerPlacement\(.*middle/);
  assert.match(cssSource, /\.copilotDrawer--task-home-middle\s*\{/);
});
