import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "../..");
const webRequire = createRequire(path.join(repoRoot, "web", "package.json"));

export function resolveWebEspreeCjsPath() {
  try {
    return webRequire.resolve("espree");
  } catch (error) {
    const err = new Error(
      "MISSING_BOOTSTRAP: web syntax scan dependency 'espree' could not be resolved. Run `npm --prefix web ci` and rerun `npm run verify:repo`."
    );
    err.code = "MISSING_BOOTSTRAP";
    err.cause = error;
    throw err;
  }
}

export function loadWebEspree() {
  const resolved = resolveWebEspreeCjsPath();
  return webRequire(resolved);
}
