export function resolveDriverMapCopilotTarget(activeShift) {
  const shiftId = Number(activeShift?.id || 0);
  if (Number.isSafeInteger(shiftId) && shiftId > 0) {
    return { entityType: "shift", entityId: shiftId };
  }
  return { entityType: "screen", entityId: 0 };
}
