// backend/scripts/_agreement_source_shift_harness.js
// Legacy agreement checks now need a source shift.
// This helper creates a minimal non-draft source shift that matches the target room.

export function isoAtLocal(dayOffset = 1, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + Number(dayOffset || 0));
  d.setHours(Number(hour || 0), Number(minute || 0), 0, 0);
  return d.toISOString();
}

export async function createAgreementSourceShift({
  reqJson,
  token,
  roomId,
  tag = "AGSRC",
  dayOffset = 1,
  startHour = 9,
  startMinute = 0,
  endHour = 11,
  endMinute = 0,
  startAt,
  endAt,
}) {
  const startIso = startAt || isoAtLocal(dayOffset, startHour, startMinute);
  const endIso = endAt || isoAtLocal(dayOffset, endHour, endMinute);
  const r = await reqJson("POST", "/api/shifts", {
    token,
    body: {
      roomId: Number(roomId || 0),
      startAt: startIso,
      endAt: endIso,
      status: "REQUESTED",
      direction: "INBOUND",
      pattern: "ONE_WAY",
    },
  });
  if (!r?.ok || !r.json?.id) {
    const st = r?.status ?? 0;
    const txt = String(r?.text ?? "").slice(0, 1200);
    throw new Error(`${tag} source shift create -> status=${st}\n${txt}`);
  }
  return {
    shiftId: Number(r.json.id),
    startAt: startIso,
    endAt: endIso,
  };
}
