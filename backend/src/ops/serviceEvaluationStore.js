import { createJsonFileStore } from "../lib/jsonFileStore.js";

const store = createJsonFileStore("service-evaluations.json", { defaultValue: [] });

export async function readServiceEvaluations() {
  const parsed = await store.readAsync();
  return Array.isArray(parsed) ? parsed : [];
}

export async function writeServiceEvaluations(items) {
  return store.writeAsync(Array.isArray(items) ? items : []);
}

export async function upsertServiceEvaluation(input) {
  const shiftId = Number(input?.shiftId || 0);
  const companyId = Number(input?.companyId || 0);
  if (!shiftId || !companyId) throw new Error("shiftId and companyId required");

  let saved = null;
  await store.updateAsync((current) => {
    const list = Array.isArray(current) ? current : [];
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
    saved = next;
    return list;
  });
  return saved;
}
