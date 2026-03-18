import { prisma } from "../prisma.js";

function toDateStart(v, fallbackDays = 7) {
  const s = String(v || "").trim();
  if (s) { const d = new Date(s); if (!Number.isNaN(d.getTime())) return d; }
  return new Date(Date.now() - fallbackDays * 24 * 60 * 60 * 1000);
}
function toDateEnd(v) {
  const s = String(v || "").trim();
  if (s) { const d = new Date(s); if (!Number.isNaN(d.getTime())) return d; }
  return new Date();
}
export function buildReportWhere(query, user) {
  const where = { startAt: { gte: toDateStart(query?.from), lte: toDateEnd(query?.to) } };
  const role = String(user?.role || "");
  if (role === "ROOM") where.roomId = Number(user?.roomId || 0);
  if (role === "COMPANY") where.companyId = Number(user?.companyId || 0);
  if (role === "SUPER_ADMIN") {
    if (Number(query?.roomId || 0)) where.roomId = Number(query.roomId);
    if (Number(query?.companyId || 0)) where.companyId = Number(query.companyId);
  }
  if (Number(query?.driverId || 0)) where.driverId = Number(query.driverId);
  if (Number(query?.vehicleId || 0)) where.vehicleId = Number(query.vehicleId);
  if (String(query?.status || "").trim()) where.status = String(query.status).trim().toUpperCase();
  return where;
}
export async function getShiftSummary(query, user) {
  const where = buildReportWhere(query, user);
  const rows = await prisma.shift.findMany({ where, include: { company: true, room: true, vehicle: true, driver: true, stops: true, people: true } });
  const byStatus = {};
  const byDirection = {};
  const byPattern = {};
  for (const row of rows) {
    const s = String(row.status || "UNKNOWN"); byStatus[s] = (byStatus[s] || 0) + 1;
    const d = String(row.direction || "UNKNOWN"); byDirection[d] = (byDirection[d] || 0) + 1;
    const p = String(row.pattern || "UNKNOWN"); byPattern[p] = (byPattern[p] || 0) + 1;
  }
  return { from: where.startAt.gte, to: where.startAt.lte, total: rows.length, byStatus, byDirection, byPattern, assignedCount: rows.filter(x => !!x.driverId && !!x.vehicleId).length, completedCount: rows.filter(x => x.status === "DONE").length, cancelledCount: rows.filter(x => x.status === "REJECTED").length, rows };
}
export async function getDriverSummary(query, user) {
  const where = buildReportWhere(query, user);
  const rows = await prisma.shift.findMany({ where, include: { driver: true } });
  const penalties = await prisma.driverPenalty.findMany({ where: { type: "NO_SHOW" }, include: { driver: true } });
  const map = new Map();
  for (const row of rows) {
    const did = Number(row.driverId || 0);
    if (!did) continue;
    if (!map.has(did)) map.set(did, { driverId: did, driverName: row.driver?.fullName || `#${did}`, totalAssigned: 0, totalCompleted: 0, totalCancelled: 0, noShowCount: 0, activePenalty: false });
    const item = map.get(did);
    item.totalAssigned += 1;
    if (row.status === "DONE") item.totalCompleted += 1;
    if (row.status === "REJECTED") item.totalCancelled += 1;
  }
  const now = Date.now();
  for (const p of penalties) {
    const did = Number(p.driverId || 0);
    if (!did) continue;
    if (!map.has(did)) map.set(did, { driverId: did, driverName: p.driver?.fullName || `#${did}`, totalAssigned: 0, totalCompleted: 0, totalCancelled: 0, noShowCount: 0, activePenalty: false });
    const item = map.get(did);
    item.noShowCount += 1;
    if (String(p.status) === "ACTIVE" && new Date(p.endsAt).getTime() >= now) item.activePenalty = true;
  }
  return { from: where.startAt.gte, to: where.startAt.lte, total: map.size, rows: [...map.values()].sort((a,b)=>a.driverName.localeCompare(b.driverName,'tr')) };
}
export async function getVehicleSummary(query, user) {
  const where = buildReportWhere(query, user);
  const rows = await prisma.shift.findMany({ where, include: { vehicle: true, people: true } });
  const map = new Map();
  for (const row of rows) {
    const vid = Number(row.vehicleId || 0);
    if (!vid) continue;
    if (!map.has(vid)) map.set(vid, { vehicleId: vid, plate: row.vehicle?.plate || `#${vid}`, shiftCount: 0, personelCount: 0, avgRequiredPax: 0, maxRequiredPax: 0 });
    const item = map.get(vid);
    item.shiftCount += 1;
    const pax = Math.max(Number(row.requiredPaxOverride || 0), Array.isArray(row.people) ? row.people.length : 0, 0);
    item.personelCount += pax;
    item.maxRequiredPax = Math.max(item.maxRequiredPax, pax);
  }
  for (const item of map.values()) item.avgRequiredPax = item.shiftCount ? Math.round((item.personelCount / item.shiftCount) * 100) / 100 : 0;
  return { from: where.startAt.gte, to: where.startAt.lte, total: map.size, rows: [...map.values()].sort((a,b)=>String(a.plate).localeCompare(String(b.plate),'tr')) };
}
export async function getStopSummary(query, user) {
  const where = buildReportWhere(query, user);
  const rows = await prisma.shift.findMany({ where, include: { stops: true, people: true } });
  const map = new Map();
  for (const row of rows) {
    const passengerCount = Array.isArray(row.people) ? row.people.length : 0;
    for (const stop of row.stops || []) {
      const key = `${stop.name}|${Number(stop.lat).toFixed(5)}|${Number(stop.lng).toFixed(5)}`;
      if (!map.has(key)) map.set(key, { stopId: key, stopName: stop.name || 'Durak', shiftCount: 0, passengerCount: 0 });
      const item = map.get(key);
      item.shiftCount += 1;
      item.passengerCount += passengerCount;
    }
  }
  return { from: where.startAt.gte, to: where.startAt.lte, total: map.size, rows: [...map.values()].sort((a,b)=>b.shiftCount-a.shiftCount || a.stopName.localeCompare(b.stopName,'tr')) };
}
