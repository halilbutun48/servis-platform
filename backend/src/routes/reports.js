import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { getDriverSummary, getShiftSummary, getStopSummary, getVehicleSummary } from "../lib/reports.js";
import { rememberResponse } from "../utils/responseCache.js";

function toCsvRow(cols) {
  const esc = (x) => {
    const s = x == null ? "" : String(x);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return cols.map(esc).join(',');
}
function rowsToCsv(headers, rows, mapper) {
  return [toCsvRow(headers), ...rows.map((row) => toCsvRow(mapper(row)))].join('\n') + '\n';
}

function userScope(user) {
  return { role: user?.role, companyId: user?.companyId, roomId: user?.roomId, userId: user?.id };
}

function reportCacheKey(kind, query, user) {
  const from = String(query?.from || '').slice(0, 10);
  const to = String(query?.to || '').slice(0, 10);
  return `reports:${kind}:${user?.role || '-'}:${user?.companyId || 0}:${user?.roomId || 0}:${from}:${to}`;
}

export function reportsRouter() {
  const r = express.Router();
  r.use(authRequired(), requireRole('ROOM', 'COMPANY', 'SUPER_ADMIN'));

  r.get('/shifts/summary', async (req, res) => res.json(await rememberResponse(reportCacheKey('shifts', req.query, req.user), () => getShiftSummary(req.query, req.user), { ttlMs: 30000, scope: userScope(req.user) })));
  r.get('/drivers/summary', async (req, res) => res.json(await rememberResponse(reportCacheKey('drivers', req.query, req.user), () => getDriverSummary(req.query, req.user), { ttlMs: 30000, scope: userScope(req.user) })));
  r.get('/vehicles/summary', async (req, res) => res.json(await rememberResponse(reportCacheKey('vehicles', req.query, req.user), () => getVehicleSummary(req.query, req.user), { ttlMs: 30000, scope: userScope(req.user) })));
  r.get('/stops/summary', async (req, res) => res.json(await rememberResponse(reportCacheKey('stops', req.query, req.user), () => getStopSummary(req.query, req.user), { ttlMs: 30000, scope: userScope(req.user) })));

  r.get('/shifts/export.csv', async (req, res) => {
    const data = await getShiftSummary(req.query, req.user);
    const csv = rowsToCsv(['id','status','company','room','vehicle','driver','startAt','endAt'], data.rows || [], (x) => [x.id, x.status, x.company?.name || '', x.room?.name || '', x.vehicle?.plate || '', x.driver?.fullName || '', x.startAt?.toISOString?.() || x.startAt, x.endAt?.toISOString?.() || x.endAt]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csv);
  });

  r.get('/drivers/export.csv', async (req, res) => {
    const data = await getDriverSummary(req.query, req.user);
    const csv = rowsToCsv(['driverId','driverName','totalAssigned','totalCompleted','totalCancelled','noShowCount','activePenalty'], data.rows || [], (x) => [x.driverId, x.driverName, x.totalAssigned, x.totalCompleted, x.totalCancelled, x.noShowCount, x.activePenalty ? '1' : '0']);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csv);
  });

  return r;
}

export default reportsRouter;
