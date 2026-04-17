function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampMin(v) {
  const n = toInt(v);
  if (n == null || n < 0 || n > 1439) return null;
  return n;
}

function normDirection(v) {
  const s = String(v || "INBOUND").trim().toUpperCase();
  return s === "INBOUND" || s === "OUTBOUND" ? s : null;
}

function normPattern(v) {
  const s = String(v || "ONE_WAY").trim().toUpperCase();
  return s === "ONE_WAY" || s === "LOOP" ? s : null;
}

function slotParts(slot) {
  const startMin = clampMin(slot?.startMin);
  const endMin = clampMin(slot?.endMin);
  const direction = normDirection(slot?.direction);
  const pattern = normPattern(slot?.pattern);
  const label = String(slot?.label || "").trim() || null;
  return { startMin, endMin, direction, pattern, label };
}

function expandIntervals(startMin, endMin) {
  if (startMin == null || endMin == null) return [];
  if (endMin >= startMin) return [[startMin, endMin]];
  return [[startMin, 1440], [1440, 1440 + endMin]];
}

function overlaps(a, b) {
  const ai = expandIntervals(a.startMin, a.endMin);
  const bi = expandIntervals(b.startMin, b.endMin);
  for (const [as, ae] of ai) {
    for (const [bs, be] of bi) {
      if (Math.max(as, bs) < Math.min(ae, be)) return true;
    }
  }
  return false;
}

export function validateAgreementSlotItems(items) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return { ok: false, message: 'En az 1 slot gerekli.' };
  if (rows.length > 3) return { ok: false, message: 'Sözleşme tarafı günlük en fazla 3 slot destekler.' };

  const slots = [];
  for (const raw of rows) {
    const slot = slotParts(raw);
    if (slot.startMin == null || slot.endMin == null) {
      return { ok: false, message: 'Her slot için startMin/endMin gerekli (0..1439).' };
    }
    if (!slot.direction) return { ok: false, message: 'direction invalid (INBOUND|OUTBOUND).' };
    if (!slot.pattern) return { ok: false, message: 'pattern invalid (ONE_WAY|LOOP).' };
    slots.push(slot);
  }

  const seen = new Set();
  for (const slot of slots) {
    const key = `${slot.startMin}:${slot.endMin}`;
    if (seen.has(key)) return { ok: false, message: 'Duplicate slot olamaz.' };
    seen.add(key);
  }

  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      if (overlaps(slots[i], slots[j])) {
        return { ok: false, message: 'Slot saatleri çakışamaz.' };
      }
    }
  }

  return { ok: true, slots };
}

export function findAgreementSlotValidationError(items) {
  const result = validateAgreementSlotItems(items);
  return result?.ok ? null : String(result?.message || 'SLOT_VALIDATION_FAILED');
}
