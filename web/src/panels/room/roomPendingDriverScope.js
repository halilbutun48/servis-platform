export function listDriversForPendingShift(drivers, shift, marketOffer = null) {
  const roomId = Number(shift?.roomId || marketOffer?.roomId || 0);
  return (Array.isArray(drivers) ? drivers : [])
    .filter((driver) => !driver?.roomId || Number(driver.roomId) === roomId)
    .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
}
