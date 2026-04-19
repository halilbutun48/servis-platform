// backend/scripts/_agreement_source_shift_harness.js
// Legacy agreement checks now need a source shift.
// This helper creates a minimal non-draft source shift that matches the target room.
// It accepts both response styles used in the repo scripts:
//  - { ok: true, status, json, text }
//  - { status, json, text }

export function isoAtLocal(dayOffset = 1, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + Number(dayOffset || 0));
  d.setHours(Number(hour || 0), Number(minute || 0), 0, 0);
  return d.toISOString();
}

function isResponseOk(r) {
  if (typeof r?.ok === "boolean") return r.ok;
  const st = Number(r?.status || 0);
  return st >= 200 && st < 300;
}

export async function createAgreementSourceShift({
  reqJson,
  token,
  roomId,
  tag = "AGSRC",
  dayOffset = 1,
  startHour = 9,
  endHour = 11,
}) {
  const startAt = isoAtLocal(dayOffset, startHour, 0);
  const endAt = isoAtLocal(dayOffset, endHour, 0);
  const r = await reqJson("POST", "/api/shifts", {
    token,
    body: {
      roomId: Number(roomId || 0),
      startAt,
      endAt,
      status: "REQUESTED",
      direction: "INBOUND",
      pattern: "ONE_WAY",
    },
  });
  if (!isResponseOk(r) || !r?.json?.id) {
    const st = Number(r?.status || 0);
    const txt = String(r?.text ?? "").slice(0, 1200);
    throw new Error(`${tag} source shift create -> status=${st}\n${txt}`);
  }
  return {
    shiftId: Number(r.json.id),
    startAt,
    endAt,
  };
}
