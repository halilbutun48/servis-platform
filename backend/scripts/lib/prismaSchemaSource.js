import fs from "node:fs";
import path from "node:path";

export const CANONICAL_PRISMA_SCHEMA_ENTRY_PATH = "backend/prisma/schema.prisma";
export const CANONICAL_PRISMA_SCHEMA_ROOT_PATH = "backend/prisma";
export const CANONICAL_PRISMA_SCHEMA_MODULE_PATH = "backend/prisma/schema";

function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function walkPrismaFiles(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "migrations") walkPrismaFiles(absolutePath, result);
    } else if (entry.isFile() && entry.name.endsWith(".prisma")) {
      result.push(absolutePath);
    }
  }
  return result;
}

export function canonicalPrismaSchemaFiles(repoRoot = process.cwd()) {
  const root = path.join(repoRoot, CANONICAL_PRISMA_SCHEMA_ROOT_PATH.replace(/\//g, path.sep));
  const entry = path.join(repoRoot, CANONICAL_PRISMA_SCHEMA_ENTRY_PATH.replace(/\//g, path.sep));
  const files = walkPrismaFiles(root)
    .sort((left, right) => normalizeRelativePath(path.relative(repoRoot, left)).localeCompare(normalizeRelativePath(path.relative(repoRoot, right))));
  if (!files.some((file) => path.resolve(file) === path.resolve(entry))) {
    throw new Error(`Canonical Prisma schema entry is missing: ${CANONICAL_PRISMA_SCHEMA_ENTRY_PATH}`);
  }
  return [entry, ...files.filter((file) => path.resolve(file) !== path.resolve(entry))];
}

export function canonicalPrismaSchemaRelativeFiles(repoRoot = process.cwd()) {
  return canonicalPrismaSchemaFiles(repoRoot).map((file) => normalizeRelativePath(path.relative(repoRoot, file)));
}

// This is an inspection view for identity/checker consumers only. Prisma CLI remains
// the sole schema loader/compiler; this helper never feeds generated schema output.
export function readCanonicalPrismaSchemaSource(repoRoot = process.cwd()) {
  return canonicalPrismaSchemaFiles(repoRoot)
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n\n");
}

export function readCanonicalPrismaSchemaEntry(repoRoot = process.cwd()) {
  return fs.readFileSync(path.join(repoRoot, CANONICAL_PRISMA_SCHEMA_ENTRY_PATH.replace(/\//g, path.sep)), "utf8");
}
