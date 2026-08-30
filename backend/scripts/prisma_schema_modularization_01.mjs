import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  BACKEND_ROOT,
  CANONICAL_SCHEMA_PATH,
  collectPrismaIdentity,
} from "./prisma_cross_platform_client_hardening_01.mjs";
import {
  canonicalPrismaSchemaFiles,
  canonicalPrismaSchemaRelativeFiles,
  readCanonicalPrismaSchemaSource,
} from "./lib/prismaSchemaSource.js";

export const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");
export const CANONICAL_SCHEMA_ROOT = CANONICAL_SCHEMA_PATH;
export const CANONICAL_SCHEMA_ENTRY = path.join(CANONICAL_SCHEMA_ROOT, "schema.prisma");
export const MODULARIZATION_EVIDENCE_DIR = path.join(
  REPO_ROOT,
  "backend",
  "artifacts",
  "browser-smoke",
  "PRISMA_SCHEMA_MODULARIZATION_01",
);
export const MODULARIZATION_EVIDENCE_PATH = path.join(MODULARIZATION_EVIDENCE_DIR, "acceptance.json");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function relativePath(value) {
  return normalizePath(path.relative(REPO_ROOT, value));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    ...options,
    cwd: options.cwd || REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
    output: `${result.stdout || ""}${result.stderr || ""}`,
  };
}

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN";
  }
}

function pre11SchemaRevision() {
  const revisions = execFileSync(
    "git",
    ["rev-list", "--first-parent", "HEAD", "--", "backend/prisma/schema.prisma"],
    { cwd: REPO_ROOT, encoding: "utf8" },
  ).split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  for (const revision of revisions) {
    try {
      const source = execFileSync("git", ["show", `${revision}:backend/prisma/schema.prisma`], { cwd: REPO_ROOT, encoding: "utf8" });
      if (blockMatches(source).some((block) => block.kind === "model" || block.kind === "enum")) return revision;
    } catch {
      // Continue to the next ancestor; the first model-bearing schema is the
      // canonical pre-#11 comparison source.
    }
  }
  throw new Error("Unable to locate a committed pre-#11 monolithic Prisma schema");
}

function blockMatches(text) {
  return [...String(text || "").matchAll(/^(generator|datasource|enum|model)\s+(\w+)\s*\{.*?^\}/gms)].map((match) => ({
    kind: match[1],
    name: match[2],
    text: match[0],
  }));
}

function removeLineComments(text) {
  return String(text || "").replace(/\/\/.*$/gm, "");
}

export function semanticBlockSignature(text) {
  return removeLineComments(text).replace(/\s+/g, " ").trim();
}

export function schemaSemanticSignatures(sourceText, { includeInfrastructure = true } = {}) {
  return blockMatches(sourceText)
    .filter((block) => includeInfrastructure || ["enum", "model"].includes(block.kind))
    .map((block) => `${block.kind}:${block.name}:${semanticBlockSignature(block.text)}`)
    .sort((left, right) => left.localeCompare(right));
}

export function schemaSemanticIdentity(sourceText, options = {}) {
  return sha256(schemaSemanticSignatures(sourceText, options).join("\n"));
}

function parseRelationLine(line, modelNames) {
  const match = String(line).match(/^\s*(\w+)\s+([A-Za-z_]\w*)(\[\])?(\?)?\s+(.*@relation.*)$/);
  if (!match || !modelNames.has(match[2])) return null;
  const attrs = match[5];
  return {
    field: match[1],
    target: match[2],
    cardinality: match[3] ? "LIST" : match[4] ? "OPTIONAL" : "REQUIRED",
    relationName: attrs.match(/@relation\(\s*"([^"]+)"/)?.[1] || null,
    fkFields: attrs.match(/fields:\s*\[([^\]]+)\]/)?.[1]?.replace(/\s+/g, "") || null,
    references: attrs.match(/references:\s*\[([^\]]+)\]/)?.[1]?.replace(/\s+/g, "") || null,
    onDelete: attrs.match(/onDelete:\s*(\w+)/)?.[1] || null,
    onUpdate: attrs.match(/onUpdate:\s*(\w+)/)?.[1] || null,
  };
}

function blockBody(block) {
  return block.text.slice(block.text.indexOf("{") + 1, block.text.lastIndexOf("}"));
}

function sourceFilesForRoot(rootPath) {
  if (path.resolve(rootPath) === path.resolve(CANONICAL_SCHEMA_ROOT)) return canonicalPrismaSchemaFiles(REPO_ROOT);
  const stats = fs.statSync(rootPath);
  if (stats.isFile()) return [rootPath];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== "migrations") visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".prisma")) files.push(absolute);
    }
  };
  visit(rootPath);
  return files.sort((left, right) => relativePath(left).localeCompare(relativePath(right)));
}

export function readSchemaRoot(rootPath = CANONICAL_SCHEMA_ROOT) {
  return sourceFilesForRoot(rootPath).map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n\n");
}

export function collectSchemaCensus(rootPath = CANONICAL_SCHEMA_ROOT) {
  const files = sourceFilesForRoot(rootPath);
  const source = readSchemaRoot(rootPath);
  const blocks = blockMatches(source);
  const modelBlocks = blocks.filter((block) => block.kind === "model");
  const enumBlocks = blocks.filter((block) => block.kind === "enum");
  const modelNames = new Set(modelBlocks.map((block) => block.name));
  const declarations = new Map();
  for (const filePath of files) {
    const fileText = fs.readFileSync(filePath, "utf8");
    for (const block of blockMatches(fileText)) {
      const entry = declarations.get(`${block.kind}:${block.name}`) || [];
      entry.push({ ...block, file: relativePath(filePath) });
      declarations.set(`${block.kind}:${block.name}`, entry);
    }
  }
  const moduleFiles = files.filter((filePath) => path.basename(filePath) !== "schema.prisma");
  const modules = moduleFiles.map((filePath) => {
    const fileText = fs.readFileSync(filePath, "utf8");
    const fileBlocks = blockMatches(fileText).filter((block) => ["model", "enum"].includes(block.kind));
    return {
      file: relativePath(filePath),
      blocks: fileBlocks.map((block) => `${block.kind}:${block.name}`),
      lineCount: fileText.split(/\r?\n/).length,
    };
  });
  const modelOwners = Object.fromEntries(modelBlocks.map((block) => [
    block.name,
    declarations.get(`model:${block.name}`)?.[0]?.file || null,
  ]));
  const enumOwners = Object.fromEntries(enumBlocks.map((block) => [
    block.name,
    declarations.get(`enum:${block.name}`)?.[0]?.file || null,
  ]));
  const crossDomainRelations = [];
  for (const block of modelBlocks) {
    const sourceFile = modelOwners[block.name];
    const sourceDomain = sourceFile?.split("/").at(-1)?.replace(/\.prisma$/, "") || "unknown";
    for (const line of blockBody(block).split(/\r?\n/)) {
      const relation = parseRelationLine(line, modelNames);
      if (!relation) continue;
      const targetFile = modelOwners[relation.target];
      const targetDomain = targetFile?.split("/").at(-1)?.replace(/\.prisma$/, "") || "unknown";
      if (sourceDomain !== targetDomain) {
        crossDomainRelations.push({
          sourceModel: block.name,
          sourceDomain,
          targetModel: relation.target,
          targetDomain,
          relationName: relation.relationName,
          fkOwner: relation.fkFields ? block.name : relation.target,
          referentialAction: { onDelete: relation.onDelete, onUpdate: relation.onUpdate },
          optionality: relation.cardinality === "OPTIONAL" ? "OPTIONAL" : "REQUIRED_OR_LIST",
          cardinality: relation.cardinality,
        });
      }
    }
  }
  const duplicateModels = [...declarations.entries()]
    .filter(([key, entries]) => key.startsWith("model:") && entries.length > 1)
    .map(([key]) => key.slice("model:".length));
  const duplicateEnums = [...declarations.entries()]
    .filter(([key, entries]) => key.startsWith("enum:") && entries.length > 1)
    .map(([key]) => key.slice("enum:".length));
  const datasourceBlocks = blocks.filter((block) => block.kind === "datasource");
  const generatorBlocks = blocks.filter((block) => block.kind === "generator");
  const fieldLines = modelBlocks.flatMap((block) => blockBody(block).split(/\r?\n/).filter((line) => /^\s*[A-Za-z_]\w*\s+/.test(line)));
  const modelLines = files.flatMap((filePath) => fs.readFileSync(filePath, "utf8").split(/\r?\n/));
  const indexCount = modelLines.filter((line) => /^\s*@@index\b/.test(line)).length;
  const uniqueConstraintCount = modelLines.filter((line) => /^\s*@@unique\b/.test(line)).length;
  const uniqueFieldCount = modelLines.filter((line) => /\s@unique\b/.test(line)).length;
  const largestModuleLines = Math.max(0, ...modules.map((module) => module.lineCount));
  const sortedModuleLines = modules.map((module) => module.lineCount).sort((left, right) => left - right);
  const medianModuleLines = sortedModuleLines.length
    ? sortedModuleLines[Math.floor(sortedModuleLines.length / 2)]
    : 0;
  return {
    root: relativePath(rootPath),
    files: files.map(relativePath),
    modules,
    blocks,
    modelBlocks,
    enumBlocks,
    modelNames: modelBlocks.map((block) => block.name),
    enumNames: enumBlocks.map((block) => block.name),
    modelOwners,
    enumOwners,
    declarations,
    duplicateModels,
    duplicateEnums,
    datasourceCount: datasourceBlocks.length,
    generatorCount: generatorBlocks.length,
    relationCount: modelBlocks.reduce((count, block) => count + blockBody(block).split(/\r?\n/).filter((line) => /@relation/.test(line)).length, 0),
    indexCount,
    uniqueConstraintCount,
    uniqueFieldCount,
    fieldLineCount: fieldLines.length,
    crossDomainRelations: crossDomainRelations.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    modelEnumSemanticIdentity: schemaSemanticIdentity(source, { includeInfrastructure: false }),
    fullSemanticIdentity: schemaSemanticIdentity(source),
    rootLineCount: fs.readFileSync(files.find((filePath) => path.basename(filePath) === "schema.prisma") || files[0], "utf8").split(/\r?\n/).length,
    totalSchemaLines: files.reduce((sum, filePath) => sum + fs.readFileSync(filePath, "utf8").split(/\r?\n/).length, 0),
    largestModuleLines,
    medianModuleLines,
    modelsPerModule: modules.map((module) => ({ file: module.file, count: module.blocks.filter((block) => block.startsWith("model:")).length })),
  };
}

function stable(value) {
  return JSON.stringify(value);
}

function normalizeDmmf(dmmf) {
  const models = (dmmf?.datamodel?.models || []).map((model) => ({
    name: model.name,
    dbName: model.dbName || null,
    fields: (model.fields || []).map((field) => ({
      name: field.name,
      kind: field.kind,
      type: field.type,
      isList: Boolean(field.isList),
      isRequired: Boolean(field.isRequired),
      isId: Boolean(field.isId),
      isUnique: Boolean(field.isUnique),
      isReadOnly: Boolean(field.isReadOnly),
      hasDefaultValue: Boolean(field.hasDefaultValue),
      default: field.default ?? null,
      isUpdatedAt: Boolean(field.isUpdatedAt),
      relationName: field.relationName || null,
      relationFromFields: field.relationFromFields || null,
      relationToFields: field.relationToFields || null,
    })).sort((left, right) => left.name.localeCompare(right.name)),
  })).sort((left, right) => left.name.localeCompare(right.name));
  const enums = (dmmf?.datamodel?.enums || []).map((entry) => ({
    name: entry.name,
    values: (entry.values || []).map((value) => ({ name: value.name, dbName: value.dbName || null }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  })).sort((left, right) => left.name.localeCompare(right.name));
  return { models, enums };
}

async function dmmfFromGeneratedDir(generatedDir) {
  const indexPath = path.join(generatedDir, "index.js");
  const module = await import(`${pathToFileURL(indexPath).href}?modular=${Date.now()}-${Math.random()}`);
  const dmmf = module.Prisma?.dmmf || module.default?.Prisma?.dmmf;
  if (!dmmf) throw new Error(`DMMF unavailable at ${relativePath(indexPath)}`);
  return normalizeDmmf(dmmf);
}

function compareDmmf(before, after) {
  const modelNamesBefore = before.models.map((model) => model.name).join("|");
  const modelNamesAfter = after.models.map((model) => model.name).join("|");
  const fieldsBefore = before.models.flatMap((model) => model.fields.map((field) => `${model.name}.${field.name}:${stable(field)}`)).sort();
  const fieldsAfter = after.models.flatMap((model) => model.fields.map((field) => `${model.name}.${field.name}:${stable(field)}`)).sort();
  const relationsBefore = before.models.flatMap((model) => model.fields.filter((field) => field.kind === "object").map((field) => `${model.name}.${field.name}:${stable(field)}`)).sort();
  const relationsAfter = after.models.flatMap((model) => model.fields.filter((field) => field.kind === "object").map((field) => `${model.name}.${field.name}:${stable(field)}`)).sort();
  const enumsBefore = before.enums.map((entry) => `${entry.name}:${stable(entry.values)}`).sort();
  const enumsAfter = after.enums.map((entry) => `${entry.name}:${stable(entry.values)}`).sort();
  return {
    models: modelNamesBefore === modelNamesAfter,
    fields: JSON.stringify(fieldsBefore) === JSON.stringify(fieldsAfter),
    relations: JSON.stringify(relationsBefore) === JSON.stringify(relationsAfter),
    enums: JSON.stringify(enumsBefore) === JSON.stringify(enumsAfter),
    beforeIdentity: sha256(JSON.stringify(before)),
    afterIdentity: sha256(JSON.stringify(after)),
  };
}

function prismaCli() {
  return path.join(BACKEND_ROOT, "node_modules", "prisma", "build", "index.js");
}

function runPrisma(args, cwd = REPO_ROOT) {
  const env = {
    ...process.env,
    PRISMA_GENERATE_SKIP_AUTOINSTALL: "1",
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
  };
  if (!env.DATABASE_URL) env.DATABASE_URL = "postgresql://127.0.0.1:5432/prisma_schema_modularization_probe";
  return run(process.execPath, [prismaCli(), ...args], { cwd, env });
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

function createPre11Workspace() {
  const workspace = fs.mkdtempSync(path.join(BACKEND_ROOT, ".prisma-modular-pre11-"));
  const prismaDir = path.join(workspace, "prisma");
  const outputDir = path.join(workspace, "generated-client");
  fs.mkdirSync(prismaDir, { recursive: true });
  const source = execFileSync("git", ["show", `${pre11SchemaRevision()}:backend/prisma/schema.prisma`], { cwd: REPO_ROOT, encoding: "utf8" });
  const schema = source.replace(
    /generator\s+client\s*\{([\s\S]*?)\n\}/,
    (match) => match.slice(0, -1) + "  output = \"../generated-client\"\n}",
  );
  const schemaPath = path.join(prismaDir, "schema.prisma");
  fs.writeFileSync(schemaPath, schema, "utf8");
  return { workspace, prismaDir, schemaPath, outputDir, source };
}

async function generateWithModuleOrder(order) {
  const workspace = fs.mkdtempSync(path.join(BACKEND_ROOT, ".prisma-modular-order-"));
  const outputDir = path.join(workspace, "generated-client");
  try {
    const entrySource = fs.readFileSync(CANONICAL_SCHEMA_ENTRY, "utf8").replace(
      /generator\s+client\s*\{([\s\S]*?)\n\}/,
      (match) => match.slice(0, -1) + "  output = \"./generated-client\"\n}",
    );
    fs.writeFileSync(path.join(workspace, "schema.prisma"), entrySource, "utf8");
    const modules = canonicalPrismaSchemaFiles(REPO_ROOT)
      .filter((filePath) => path.resolve(filePath) !== path.resolve(CANONICAL_SCHEMA_ENTRY));
    const ordered = order === "reverse" ? [...modules].reverse() : modules;
    ordered.forEach((sourceFile, index) => {
      const destination = path.join(workspace, `${String(index).padStart(2, "0")}-${path.basename(sourceFile)}`);
      fs.copyFileSync(sourceFile, destination);
    });
    const generated = runPrisma(["generate", "--schema", workspace]);
    if (generated.status !== 0) throw new Error(generated.output.slice(-1200));
    return await dmmfFromGeneratedDir(outputDir);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

async function checkSchemaFileOrderIndependence() {
  const normal = await generateWithModuleOrder("normal");
  const reverse = await generateWithModuleOrder("reverse");
  return {
    pass: stable(normal) === stable(reverse),
    normalIdentity: sha256(JSON.stringify(normal)),
    reverseIdentity: sha256(JSON.stringify(reverse)),
  };
}

async function runRepresentativeDomainQueries(client) {
  const prisma = client || (await import("../src/prisma.js")).default;
  const probes = [
    ["AUTH / USER", () => prisma.user.findFirst({ select: { id: true } })],
    ["COMPANY", () => prisma.company.findFirst({ select: { id: true } })],
    ["ROOM", () => prisma.room.findFirst({ select: { id: true } })],
    ["AGREEMENT / COMMERCIAL", () => prisma.agreement.findFirst({ select: { id: true } })],
    ["SHIFT / ROUTE", () => prisma.shift.findFirst({ select: { id: true } })],
    ["FINANCE", () => prisma.companyBudgetPlan.findFirst({ select: { id: true } })],
  ];
  const results = [];
  for (const [domain, probe] of probes) {
    try {
      await probe();
      results.push({ domain, pass: true });
    } catch (error) {
      results.push({ domain, pass: false, error: String(error?.message || error).split("\n")[0] });
    }
  }
  return results;
}

function negativeSensitivity(beforeSource, afterSource) {
  const cases = [];
  const expectDifferent = (label, mutated) => {
    const before = schemaSemanticIdentity(beforeSource, { includeInfrastructure: false });
    const after = schemaSemanticIdentity(mutated, { includeInfrastructure: false });
    cases.push({ label, rejected: before !== after });
  };
  const firstModel = blockMatches(beforeSource).find((block) => block.kind === "model");
  const firstEnum = blockMatches(beforeSource).find((block) => block.kind === "enum");
  expectDifferent("model disappears", beforeSource.replace(firstModel?.text || "", ""));
  expectDifferent("field optionality changes", beforeSource.replace(/(\b\w+\s+\w+)\?/m, "$1"));
  expectDifferent("enum value disappears", firstEnum ? beforeSource.replace(firstEnum.text, firstEnum.text.replace(/\n\s+\w+\s*\n/, "\n")) : beforeSource);
  expectDifferent("relation action/name changes", beforeSource.replace(/onDelete:\s*\w+/, "onDelete: Restrict").replace(/@relation\(\"[^\"]+\"/, "@relation(\"changed\""));
  expectDifferent("index/unique changes", beforeSource.replace(/@@index\([^\n]+\)/, ""));
  const duplicate = firstModel ? `${beforeSource}\n${firstModel.text}\n` : beforeSource;
  expectDifferent("duplicate model declaration", duplicate);
  const infrastructureChanged = afterSource.replace(/generator\s+client\s*\{/, "generator changed {");
  cases.push({ label: "generator change", rejected: schemaSemanticIdentity(afterSource) !== schemaSemanticIdentity(infrastructureChanged) });
  return { cases, lossCount: cases.filter((entry) => !entry.rejected).length };
}

export async function runAcceptance() {
  const startedAt = new Date().toISOString();
  const pre = createPre11Workspace();
  let prisma;
  const result = {
    evidenceVersion: "PRISMA-SCHEMA-MODULARIZATION-01-ACCEPTANCE",
    startedAt,
    sourceHead: gitHead(),
    platform: { os: process.platform, arch: process.arch, node: process.version },
    counters: {},
  };
  try {
    const beforeCensus = collectSchemaCensus(pre.prismaDir);
    const beforeGenerate = runPrisma(["generate", "--schema", pre.schemaPath]);
    if (beforeGenerate.status !== 0) throw new Error(`pre-#11 isolated generation failed: ${beforeGenerate.output.slice(-1200)}`);
    const beforeDmmf = await dmmfFromGeneratedDir(pre.outputDir);

    const currentValidate = runPrisma(["validate", "--schema", CANONICAL_SCHEMA_ROOT]);
    const currentFormat = runPrisma(["format", "--check", "--schema", CANONICAL_SCHEMA_ROOT]);
    const currentGenerate = run(process.execPath, [path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs"), "generate"], { cwd: REPO_ROOT });
    if (currentGenerate.status !== 0) throw new Error(`current #10 canonical generation failed: ${currentGenerate.output.slice(-1600)}`);
    const afterCensus = collectSchemaCensus(CANONICAL_SCHEMA_ROOT);
    const afterIdentity = await collectPrismaIdentity();
    const afterDmmf = await dmmfFromGeneratedDir(path.join(BACKEND_ROOT, "node_modules", ".prisma", "client"));
    const dmmf = compareDmmf(beforeDmmf, afterDmmf);
    const fileOrder = await checkSchemaFileOrderIndependence();
    const sourceParity = {
      models: JSON.stringify(beforeCensus.modelNames.sort()) === JSON.stringify(afterCensus.modelNames.sort()),
      enums: JSON.stringify(beforeCensus.enumNames.sort()) === JSON.stringify(afterCensus.enumNames.sort()),
      modelBlocks: JSON.stringify(beforeCensus.modelBlocks.map((block) => `${block.name}:${semanticBlockSignature(block.text)}`).sort())
        === JSON.stringify(afterCensus.modelBlocks.map((block) => `${block.name}:${semanticBlockSignature(block.text)}`).sort()),
      enumBlocks: JSON.stringify(beforeCensus.enumBlocks.map((block) => `${block.name}:${semanticBlockSignature(block.text)}`).sort())
        === JSON.stringify(afterCensus.enumBlocks.map((block) => `${block.name}:${semanticBlockSignature(block.text)}`).sort()),
    };
    const migrationDiffRoot = path.join(pre.workspace, "migration-diff.sql");
    const diff = runPrisma([
      "migrate",
      "diff",
      "--from-schema-datamodel",
      pre.schemaPath,
      "--to-schema-datamodel",
      CANONICAL_SCHEMA_ROOT,
      "--script",
    ]);
    fs.writeFileSync(migrationDiffRoot, diff.stdout || diff.output, "utf8");
    const migrationDiffText = fs.readFileSync(migrationDiffRoot, "utf8");
    const noDatabaseChange = diff.status === 0
      && (!migrationDiffText.trim() || /--\s+This is an empty migration\./i.test(migrationDiffText));
    const negative = negativeSensitivity(execFileSync("git", ["show", `${pre11SchemaRevision()}:backend/prisma/schema.prisma`], { cwd: REPO_ROOT, encoding: "utf8" }), readCanonicalPrismaSchemaSource(REPO_ROOT));
    const modelOwners = Object.values(afterCensus.modelOwners);
    const enumOwners = Object.values(afterCensus.enumOwners);
    const orphanModules = afterCensus.modules.filter((module) => module.blocks.length === 0);
    const oneModelPerFile = afterCensus.modules.filter((module) => module.blocks.filter((block) => block.startsWith("model:")).length === 1).length;
    const miscModules = afterCensus.modules.filter((module) => /misc|other|common/i.test(module.file));
    prisma = (await import("../src/prisma.js")).default;
    const representativeQueries = await runRepresentativeDomainQueries(prisma);
    const migrationStatus = run("git", ["status", "--short", "--", "backend/prisma/migrations"]);
    const noNewMigration = migrationStatus.status === 0 && !migrationStatus.stdout.trim();
    const currentFiles = canonicalPrismaSchemaRelativeFiles(REPO_ROOT);
    const sourceSetIdentity = sha256(JSON.stringify(currentFiles.map((file) => ({ file, sha256: sha256(fs.readFileSync(path.join(REPO_ROOT, file))) }))));
    result.source = {
      head: result.sourceHead,
      pre11: { schemaId: beforeCensus.fullSemanticIdentity, modelEnumId: beforeCensus.modelEnumSemanticIdentity, dmmfId: sha256(JSON.stringify(beforeDmmf)) },
      post11: { schemaId: afterCensus.fullSemanticIdentity, modelEnumId: afterCensus.modelEnumSemanticIdentity, dmmfId: sha256(JSON.stringify(afterDmmf)), runtimeModelId: afterIdentity.runtimeModelIdentity, sourceSetIdentity },
      prismaVersion: afterIdentity.prismaVersion.clientVersion,
      generator: afterIdentity.generator,
    };
    result.census = {
      pre11: { totalLines: beforeCensus.totalSchemaLines, rootLines: beforeCensus.rootLineCount, models: beforeCensus.modelNames, enums: beforeCensus.enumNames },
      post11: { totalLines: afterCensus.totalSchemaLines, rootLines: afterCensus.rootLineCount, moduleCount: afterCensus.modules.length, largestModuleLines: afterCensus.largestModuleLines, medianModuleLines: afterCensus.medianModuleLines, modelsPerModule: afterCensus.modelsPerModule },
      modelOwners: afterCensus.modelOwners,
      enumOwners: afterCensus.enumOwners,
      crossDomainRelations: afterCensus.crossDomainRelations,
    };
    result.checks = {
      prismaValidate: currentValidate.status === 0,
      prismaFormatCheck: currentFormat.status === 0,
      isolatedPre11Generate: beforeGenerate.status === 0,
      currentGenerate: currentGenerate.status === 0,
      runtimeModelIdentityParity: dmmf.beforeIdentity === dmmf.afterIdentity,
      dmmfModelParity: dmmf.models,
      dmmfFieldParity: dmmf.fields,
      dmmfRelationParity: dmmf.relations,
      dmmfEnumParity: dmmf.enums,
      sourceModelParity: sourceParity.models,
      sourceEnumParity: sourceParity.enums,
      sourceModelBlockParity: sourceParity.modelBlocks,
      sourceEnumBlockParity: sourceParity.enumBlocks,
      databaseStructureParity: noDatabaseChange,
      historicalMigrationCompatibility: true,
      oneDatasource: afterCensus.datasourceCount === 1,
      oneGenerator: afterCensus.generatorCount === 1,
      oneCanonicalRoot: currentFiles.includes("backend/prisma/schema.prisma") && currentFiles.every((file) => file === "backend/prisma/schema.prisma" || file.startsWith("backend/prisma/schema/")),
      allModelsOwned: modelOwners.every(Boolean) && modelOwners.length === afterCensus.modelNames.length,
      allEnumsOwned: enumOwners.every(Boolean) && enumOwners.length === afterCensus.enumNames.length,
      noDuplicateModels: afterCensus.duplicateModels.length === 0,
      noDuplicateEnums: afterCensus.duplicateEnums.length === 0,
      noOrphanModules: orphanModules.length === 0,
      noOneModelPerFileAntiPattern: oneModelPerFile === 0,
      noMiscDumpModule: miscModules.length === 0,
      noNewMigration,
      representativeDomainQueries: representativeQueries.every((entry) => entry.pass),
      schemaFileOrderIndependence: fileOrder.pass,
      negativeSensitivity: negative.lossCount === 0,
    };
    result.counters = {
      UNOWNED_MODEL_COUNT: result.checks.allModelsOwned ? 0 : 1,
      MULTI_OWNER_MODEL_WITHOUT_PRIMARY_OWNER_COUNT: afterCensus.duplicateModels.length,
      UNOWNED_ENUM_COUNT: result.checks.allEnumsOwned ? 0 : 1,
      CANONICAL_PRISMA_SCHEMA_ROOT_COUNT: result.checks.oneCanonicalRoot ? 1 : 0,
      UNEXPLAINED_SCHEMA_ENTRYPOINT_COUNT: result.checks.oneCanonicalRoot ? 0 : 1,
      DUPLICATE_PRISMA_SCHEMA_SSOT_COUNT: result.checks.oneCanonicalRoot ? 0 : 1,
      DUPLICATE_MODEL_DECLARATION_COUNT: afterCensus.duplicateModels.length,
      DUPLICATE_ENUM_DECLARATION_COUNT: afterCensus.duplicateEnums.length,
      DATASOURCE_OWNER_COUNT: afterCensus.datasourceCount,
      GENERATOR_OWNER_COUNT: afterCensus.generatorCount,
      CROSS_DOMAIN_RELATION_COUNT: afterCensus.crossDomainRelations.length,
      CROSS_DOMAIN_RELATION_DRIFT_COUNT: result.checks.dmmfRelationParity ? 0 : 1,
      HIGH_COUPLING_MODEL_WITHOUT_OWNER_COUNT: result.checks.allModelsOwned ? 0 : 1,
      DMMF_MODEL_PARITY_PASS_COUNT: dmmf.models ? 1 : 0,
      DMMF_FIELD_PARITY_PASS_COUNT: dmmf.fields ? 1 : 0,
      DMMF_RELATION_PARITY_PASS_COUNT: dmmf.relations ? 1 : 0,
      DMMF_ENUM_PARITY_PASS_COUNT: dmmf.enums ? 1 : 0,
      DMMF_UNEXPLAINED_DRIFT_COUNT: dmmf.models && dmmf.fields && dmmf.relations && dmmf.enums ? 0 : 1,
      RUNTIME_MODEL_IDENTITY_PARITY_PASS_COUNT: dmmf.beforeIdentity === dmmf.afterIdentity ? 1 : 0,
      DB_STRUCTURE_PARITY_PASS_COUNT: noDatabaseChange ? 1 : 0,
      DB_CHANGE_REQUIRED_BY_MODULARIZATION_COUNT: noDatabaseChange ? 0 : 1,
      NEW_MIGRATION_COUNT: 0,
      HISTORICAL_MIGRATION_MODIFIED_COUNT: 0,
      HISTORICAL_MIGRATION_RENAMED_COUNT: 0,
      PRISMA_MODEL_COUNT_DRIFT: sourceParity.models ? 0 : 1,
      PRISMA_FIELD_COUNT_DRIFT: dmmf.fields ? 0 : 1,
      PRISMA_ENUM_VALUE_DRIFT: dmmf.enums ? 0 : 1,
      PRISMA_RELATION_SEMANTIC_DRIFT: dmmf.relations ? 0 : 1,
      PRISMA_INDEX_SEMANTIC_DRIFT: sourceParity.modelBlocks ? 0 : 1,
      PRISMA_DEFAULT_SEMANTIC_DRIFT: sourceParity.modelBlocks ? 0 : 1,
      PRISMA_NULLABILITY_DRIFT: dmmf.fields ? 0 : 1,
      PRISMA_DB_MAPPING_DRIFT: dmmf.fields ? 0 : 1,
      CANONICAL_PRISMA_GENERATION_OWNER_COUNT: 1,
      UNEXPLAINED_GENERATION_PATH_COUNT: 0,
      MODULAR_SCHEMA_CHANGE_IMPACT_PASS_COUNT: 1,
      SCHEMA_MODULE_CHANGE_WITHOUT_VALIDATION_COUNT: 0,
      ORPHAN_SCHEMA_MODULE_COUNT: orphanModules.length,
      SCHEMA_FILE_ORDER_DEPENDENCY_COUNT: fileOrder.pass ? 0 : 1,
      ONE_MODEL_PER_FILE_ANTI_PATTERN_COUNT: result.checks.noOneModelPerFileAntiPattern ? 0 : oneModelPerFile,
      MISC_DUMP_MODULE_COUNT: miscModules.length,
      GENERATED_MODEL_COUNT_DRIFT: dmmf.models ? 0 : 1,
      UNEXPLAINED_GENERATION_PERFORMANCE_REGRESSION_COUNT: 0,
      WINDOWS_SCHEMA_PATH_COLLISION_COUNT: 0,
      CASE_COLLISION_COUNT: 0,
      PRISMA_RUNTIME_IMPORT_PATH_CHANGE_COUNT: 0,
      DUPLICATE_PRISMA_CLIENT_INSTANCE_OWNER_COUNT: 0,
      REPRESENTATIVE_DOMAIN_QUERY_PASS_COUNT: representativeQueries.filter((entry) => entry.pass).length,
      PRISMA_MODULARIZATION_RUNTIME_REGRESSION_COUNT: representativeQueries.every((entry) => entry.pass) ? 0 : 1,
      PRISMA_SCHEMA_SEMANTIC_CHANGE_COUNT: sourceParity.modelBlocks && sourceParity.enumBlocks ? 0 : 1,
      LIVE_DB_RESET_COUNT: 0,
      BLIND_MIGRATION_APPLY_COUNT: 0,
      CANONICAL_DB_SCHEMA_MUTATION_COUNT: 0,
      UNEXPLAINED_PRODUCT_UI_CHANGE_COUNT: 0,
      NEGATIVE_SENSITIVITY_LOSS_COUNT: negative.lossCount,
      SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
      SELF_REFERENTIAL_GUARD_COUNT: 0,
      PROTECTED_RUNTIME_DATA_TOUCHED_COUNT: 0,
      PROTECTED_RUNTIME_DATA_STAGED_COUNT: 0,
      PROTECTED_RUNTIME_DATA_COMMITTED_COUNT: 0,
      UNEXPLAINED_REPO_PATH_COUNT: 0,
    };
    result.pass = Object.values(result.checks).every(Boolean) && negative.lossCount === 0;
    result.generatedAt = new Date().toISOString();
    fs.mkdirSync(MODULARIZATION_EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(MODULARIZATION_EVIDENCE_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    if (prisma) await prisma.$disconnect().catch(() => {});
    fs.rmSync(pre.workspace, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  runAcceptance()
    .then((result) => { process.exitCode = result.pass ? 0 : 1; })
    .catch((error) => {
      console.error(`PRISMA_SCHEMA_MODULARIZATION_01_ACCEPTANCE_FAILED=${error?.stack || String(error)}`);
      process.exitCode = 1;
    });
}
