import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function runStep(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`FAIL ${label}: ${result.error.message}`);
    process.exit(result.status || 1);
  }

  if (result.status !== 0) {
    console.error(`FAIL ${label}: exit ${result.status}`);
    process.exit(result.status || 1);
  }
}

runStep("backend syntax scan", process.execPath, ["backend/scripts/repo_js_syntax_scan.js"]);

const eslintBin = path.join(
  repoRoot,
  "web",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "eslint.cmd" : "eslint"
);

if (!fs.existsSync(eslintBin)) {
  console.error("FAIL backend ESLint: web/node_modules/.bin/eslint was not found.");
  console.error("Run npm --prefix web ci before npm --prefix backend run lint.");
  process.exit(1);
}

const eslintArgs = ["--config", "backend/eslint.config.js", "backend/src"];
const eslintCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : eslintBin;
const platformArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", eslintBin, ...eslintArgs]
  : eslintArgs;

runStep("backend ESLint", eslintCommand, platformArgs);
