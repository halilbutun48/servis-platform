export function isParentConsentBlocked(me) {
  if (me?.role !== "PARENT") return false;
  const requiredCount = Number(me?.kvkk?.requiredCount || 0);
  const acceptedCount = Number(me?.kvkk?.acceptedCount || 0);
  const blocking = me?.kvkk?.blocking === true;
  return blocking || acceptedCount < requiredCount;
}
