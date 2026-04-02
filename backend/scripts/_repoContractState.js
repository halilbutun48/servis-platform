import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

export function readRepoContractState() {
  const file = path.join(repoRoot, "tools", "repo_contract_state.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
