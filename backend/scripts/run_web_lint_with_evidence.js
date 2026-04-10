import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const lintDir = path.join(repoRoot, "artifacts", "lint");
const outputPath = path.join(lintDir, "web_lint_latest.txt");

fs.mkdirSync(lintDir, { recursive: true });

const stream = fs.createWriteStream(outputPath, { encoding: "utf8" });
function writeLine(line = "") {
  stream.write(`${line}\n`);
}

writeLine("=== CANONICAL WEB LINT EVIDENCE ===");
writeLine(`generatedAt=${new Date().toISOString()}`);
writeLine("command=npm --prefix web run lint");
writeLine("note=This file is overwritten by the canonical root lint/verify chain.");
writeLine("");

const isWin = process.platform === "win32";
const command = isWin ? "cmd.exe" : "npm";
const args = isWin
  ? ["/d", "/s", "/c", "npm --prefix web run lint"]
  : ["--prefix", "web", "run", "lint"];

const child = spawn(command, args, {
  cwd: repoRoot,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  stream.write(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  stream.write(chunk);
});

child.on("error", (error) => {
  writeLine("");
  writeLine(`spawnError=${error.message}`);
  if (error?.stack) writeLine(error.stack);
  stream.end(() => process.exit(1));
});

child.on("close", (code, signal) => {
  writeLine("");
  writeLine(`exitCode=${code ?? ""}`);
  if (signal) writeLine(`signal=${signal}`);
  stream.end(() => process.exit(code ?? 1));
});
