import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

for (const envPath of [path.join(repoRoot, ".env"), path.join(repoRoot, "backend", ".env")]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

if (!process.env.DATABASE_URL && String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
  const user = process.env.POSTGRES_USER || "servis";
  const password = process.env.POSTGRES_PASSWORD || "servispass";
  const db = process.env.POSTGRES_DB || "servisdb";
  const port = process.env.POSTGRES_PORT || "5433";
  process.env.DATABASE_URL = `postgresql://${user}:${password}@127.0.0.1:${port}/${db}?schema=public`;
}

export const prisma = new PrismaClient();

export default prisma;

