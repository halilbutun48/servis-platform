import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "../../..");

export function withSafeDirectoryEnv(baseEnv = process.env, cwd = repoRoot) {
  return {
    ...baseEnv,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: path.resolve(cwd).replace(/\\/g, "/"),
  };
}

export function runNpmScript(scriptName, { cwd = repoRoot } = {}) {
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", scriptName], {
      cwd,
      env: withSafeDirectoryEnv(process.env, cwd),
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => resolve(code ?? 1));
  });
}

export function runCommandStep(command, { cwd = repoRoot } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: withSafeDirectoryEnv(process.env, cwd),
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => resolve(code ?? 1));
  });
}

export async function runStructuredScriptChain(steps, { cwd = repoRoot, label = "GUARD CHAIN" } = {}) {
  execFileSync("git", ["-c", `safe.directory=${cwd}`, "status", "--porcelain=v1", "--untracked-files=all"], {
    cwd,
    env: withSafeDirectoryEnv(process.env, cwd),
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  console.log(`=== ${label} ===`);
  console.log(`Repo root: ${cwd}`);
  console.log(`Steps: ${steps.map((step) => step.script).join(", ")}`);

  for (const [index, step] of steps.entries()) {
    console.log(`\n--- ${String(index + 1).padStart(2, "0")}/${steps.length} ${step.script} ---`);
    const code = await runCommandStep(step.command, { cwd });
    if (code !== 0) {
      console.log(`FAIL ${step.script}`);
      return code;
    }
  }

  console.log(`\n=== ${label} PASS ===`);
  return 0;
}

export async function runScriptChain(scriptNames, { cwd = repoRoot, label = "GUARD CHAIN" } = {}) {
  execFileSync("git", ["-c", `safe.directory=${cwd}`, "status", "--porcelain=v1", "--untracked-files=all"], {
    cwd,
    env: withSafeDirectoryEnv(process.env, cwd),
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  console.log(`=== ${label} ===`);
  console.log(`Repo root: ${cwd}`);
  console.log(`Steps: ${scriptNames.join(", ")}`);

  for (const [index, scriptName] of scriptNames.entries()) {
    console.log(`\n--- ${String(index + 1).padStart(2, "0")}/${scriptNames.length} ${scriptName} ---`);
    const code = await runNpmScript(scriptName, { cwd });
    if (code !== 0) {
      console.log(`FAIL ${scriptName}`);
      return code;
    }
  }

  console.log(`\n=== ${label} PASS ===`);
  return 0;
}
