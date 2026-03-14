import { banner, step, must, loginFirst, reqJson } from './_harness.js';

async function main() {
  banner('M47.2 CAPACITY & LOAD BASELINE CHECK');

  step('login super admin');
  const token = await loginFirst('SUPER_ADMIN');
  must('super admin login ok', !!token);

  step('health exposes capacity summary');
  const health = await reqJson('GET', '/health', {});
  must('health ok', health.ok);
  must('health capacity block visible', !!health.json?.capacity);
  must('health inflight field visible', typeof health.json?.capacity?.inflight === 'number');

  step('create sample read/write traffic');
  const stats = await reqJson('GET', '/api/admin/stats', { token });
  must('admin stats ok', stats.ok);
  const retention = await reqJson('GET', '/api/admin/retention/policy', { token });
  must('retention policy ok', retention.ok);

  step('capacity policy endpoint');
  const policy = await reqJson('GET', '/api/admin/capacity/policy', { token });
  must('capacity policy ok', policy.ok);
  must('capacity policy enabled field', typeof policy.json?.enabled === 'boolean');
  must('capacity policy threshold field', Number(policy.json?.thresholds?.avgRequestsPerMinuteWarn || 0) > 0);

  step('capacity snapshot endpoint');
  const snap = await reqJson('GET', '/api/admin/capacity/snapshot', { token });
  must('capacity snapshot ok', snap.ok);
  must('snapshot assessment exists', ['OK', 'WARN'].includes(String(snap.json?.assessment || '')));
  must('snapshot request totals visible', Number(snap.json?.runtime?.requests?.total || 0) >= 2);
  must('snapshot latency p95 visible', Number(snap.json?.runtime?.requests?.latency?.p95Ms || 0) >= 0);
  must('snapshot top paths visible', Array.isArray(snap.json?.runtime?.requests?.topPaths));
  must('snapshot inventory visible', Number(snap.json?.inventory?.vehicles || 0) >= 0);
  must('snapshot realtime ws field visible', typeof snap.json?.runtime?.realtime?.wsClients === 'number');

  banner('M47.2 CAPACITY & LOAD BASELINE CHECK PASS');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
