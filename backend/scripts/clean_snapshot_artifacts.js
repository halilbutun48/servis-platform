import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const pathsToRemove = [
  path.join(repoRoot, "web", "dist"),
  path.join(repoRoot, "mobile", "dist"),
  path.join(repoRoot, "backend", "dist"),
];

for (const target of pathsToRemove) {
  try {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`OK removed ${path.relative(repoRoot, target).replace(/\\/g, "/")}`);
    }
  } catch (error) {
    console.warn(`WARN failed to remove ${path.relative(repoRoot, target).replace(/\\/g, "/")}: ${String(error?.message || error)}`);
  }
}

