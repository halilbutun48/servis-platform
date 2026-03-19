import { promises as fs } from "fs";
import path from "path";

const STORE_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "service-evaluations.json");

async function ensureStore() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, "[]", "utf8");
  }
}

export async function readServiceEvaluations() {
  await ensureStore();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeServiceEvaluations(items) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(Array.isArray(items) ? items : [], null, 2), "utf8");
}

export async function upsertServiceEvaluation(input) {
  const list = await readServiceEvaluations();
  const shiftId = Number(input?.shiftId || 0);
  const companyId = Number(input?.companyId || 0);
  if (!shiftId || !companyId) throw new Error("shiftId and companyId required");
  const idx = list.findIndex((x) => Number(x.shiftId) === shiftId && Number(x.companyId) === companyId);
  const now = new Date().toISOString();
  const next = {
    id: idx >= 0 ? list[idx].id : `${companyId}-${shiftId}`,
    shiftId,
    companyId,
    roomId: Number(input?.roomId || 0) || null,
    ratings: input?.ratings || {},
    note: String(input?.note || "").trim(),
    recommendAgain: input?.recommendAgain === null ? null : !!input?.recommendAgain,
    createdAt: idx >= 0 ? list[idx].createdAt : now,
    updatedAt: now,
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  await writeServiceEvaluations(list);
  return next;
}
