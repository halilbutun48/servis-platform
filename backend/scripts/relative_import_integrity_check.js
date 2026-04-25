#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWebEspree } from "./bootstrap_dependencies.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const espree = loadWebEspree();

const includeEntries = [
  path.join(repoRoot, "mobile", "App.js"),
  path.join(repoRoot, "mobile", "src"),
  path.join(repoRoot, "backend", "src", "routes"),
  path.join(repoRoot, "web", "src"),
];
const exts = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json"];
const skipParts = new Set(["node_modules", "artifacts", "_archive", "_backup"]);

const files = [];
for (const entry of includeEntries) {
  if (fs.existsSync(entry) && fs.statSync(entry).isFile()) {
    files.push(entry);
  } else if (fs.existsSync(entry) && fs.statSync(entry).isDirectory()) {
    walk(entry);
  }
}

const failures = [];
let edgeCount = 0;

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = espree.parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: { jsx: true },
      loc: true,
    });
  } catch (err) {
    failures.push({
      file,
      line: Number(err?.lineNumber || err?.line || 0) || 0,
      column: Number(err?.column || err?.columnNumber || 0) || 0,
      spec: "[parse-error]",
      reason: String(err?.message || err || "Parse failed"),
    });
    continue;
  }

  const importSpecs = [];
  visit(ast, (node) => {
    if (!node || typeof node !== "object") return;

    if (node.type === "ImportDeclaration" && isLiteral(node.source?.value)) {
      importSpecs.push({ spec: String(node.source.value), loc: node.source.loc });
      return;
    }

    if (node.type === "ExportAllDeclaration" && isLiteral(node.source?.value)) {
      importSpecs.push({ spec: String(node.source.value), loc: node.source.loc });
      return;
    }

    if (node.type === "ExportNamedDeclaration" && isLiteral(node.source?.value)) {
      importSpecs.push({ spec: String(node.source.value), loc: node.source.loc });
      return;
    }

    if (node.type === "ImportExpression" && isLiteral(node.source?.value)) {
      importSpecs.push({ spec: String(node.source.value), loc: node.source.loc || node.loc });
      return;
    }

    if (
      node.type === "CallExpression" &&
      node.callee?.type === "Identifier" &&
      node.callee.name === "require" &&
      Array.isArray(node.arguments) &&
      node.arguments.length === 1 &&
      isLiteral(node.arguments[0]?.value)
    ) {
      importSpecs.push({ spec: String(node.arguments[0].value), loc: node.arguments[0].loc || node.loc });
    }
  });

  for (const { spec, loc } of importSpecs) {
    if (!isRelativeImport(spec)) continue;
    edgeCount += 1;
    const resolved = resolveRelativeImport(file, spec);
    if (!resolved) {
      failures.push({
        file,
        line: Number(loc?.start?.line || loc?.line || 0) || 0,
        column: Number(loc?.start?.column || loc?.column || 0) + 1 || 0,
        spec,
        reason: "Relative import target not found",
      });
    }
  }
}

if (failures.length) {
  for (const failure of failures) {
    const relFile = path.relative(repoRoot, failure.file).replace(/\\/g, "/");
    const pos = failure.line > 0 ? `:${failure.line}${failure.column > 0 ? `:${failure.column}` : ""}` : "";
    console.error(`FAIL missing import ${relFile}${pos} -> ${failure.spec}`);
    console.error(`  ${failure.reason}`);
  }
  console.error(`Relative import integrity failed: ${failures.length} issue(s) across ${edgeCount} edge(s)`);
  process.exit(1);
}

console.log(`OK relative import integrity (${files.length} file(s), ${edgeCount} relative edge(s))`);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipParts.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (ext === ".js" || ext === ".jsx") {
      files.push(abs);
    }
  }
}

function visit(node, fn) {
  if (!node || typeof node !== "object") return;
  fn(node);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "range" || key === "start" || key === "end" || key === "tokens" || key === "comments") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) visit(child, fn);
    } else if (value && typeof value === "object" && typeof value.type === "string") {
      visit(value, fn);
    }
  }
}

function isLiteral(value) {
  return typeof value === "string";
}

function isRelativeImport(spec) {
  return spec.startsWith("./") || spec.startsWith("../");
}

function resolveRelativeImport(fromFile, spec) {
  const normalizedSpec = stripImportSuffix(spec);
  const base = path.resolve(path.dirname(fromFile), normalizedSpec);

  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    const indexFile = resolveIndexFile(base);
    if (indexFile) return indexFile;
  }

  if (path.extname(base)) {
    return null;
  }

  for (const ext of exts) {
    const candidate = `${base}${ext}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    return resolveIndexFile(base);
  }

  return null;
}

function resolveIndexFile(dir) {
  for (const ext of exts) {
    const candidate = path.join(dir, `index${ext}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function stripImportSuffix(spec) {
  const value = String(spec || "");
  const question = value.indexOf("?");
  const hash = value.indexOf("#");
  const cut = [question, hash].filter((idx) => idx >= 0).sort((a, b) => a - b)[0];
  return cut == null ? value : value.slice(0, cut);
}
