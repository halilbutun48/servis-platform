import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const require = createRequire(import.meta.url);
const { ESLint } = require(path.join(repoRoot, "web", "node_modules", "eslint"));
const lintDir = path.join(repoRoot, "artifacts", "lint");
const outputPath = path.join(lintDir, "web_lint_latest.txt");

fs.mkdirSync(lintDir, { recursive: true });

const lines = [];
function writeLine(line = "") {
  lines.push(String(line));
}

writeLine("=== CANONICAL WEB LINT EVIDENCE ===");
writeLine(`generatedAt=${new Date().toISOString()}`);
writeLine("command=npm --prefix web run lint");
writeLine("note=This file is overwritten by the canonical root lint/verify chain.");
writeLine("");

const eslint = new ESLint({
  cwd: path.join(repoRoot, "web"),
});

const results = await eslint.lintFiles(["src"]);
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);

if (output.trim()) {
  process.stdout.write(output);
  lines.push(output.trimEnd());
}

const errorCount = results.reduce((sum, result) => sum + Number(result.errorCount || 0), 0);
const warningCount = results.reduce((sum, result) => sum + Number(result.warningCount || 0), 0);

writeLine("");
writeLine(`files=${results.length}`);
writeLine(`errors=${errorCount}`);
writeLine(`warnings=${warningCount}`);

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

process.exit(errorCount > 0 ? 1 : 0);
