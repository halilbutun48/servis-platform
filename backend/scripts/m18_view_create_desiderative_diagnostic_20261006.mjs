import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { createCanonicalHttpTransport, createDemoSessionFactory, extractCanonicalActual } from './lib/m18HoldoutExecutionAdapter.mjs';

const root = resolve(process.cwd());
const backendRoot = resolve(root, 'backend');
const users = {
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  ROOM: { role: 'ROOM', roomId: 1 },
};
const screenFor = (role) => ({ ...listScreensForUser(users[role])[0], role });
const cases = [
  ['VIEW_DESIDERATIVE_EXPOSED', 'COMPANY', 'Planlama Merkezi alanında bugünkü vardiyaları görüntülemek istiyorum.', 'VIEW'],
  ['VIEW_DESIDERATIVE_SYNONYM', 'COMPANY', 'Vardiyaları görmek istiyorum.', 'VIEW'],
  ['VIEW_POLITE', 'COMPANY', 'Bugünkü vardiyaları gösterir misin?', 'VIEW'],
  ['VIEW_DIRECT', 'COMPANY', 'Bugünkü vardiyaları görüntüle.', 'VIEW'],
  ['CREATE_DESIDERATIVE', 'COMPANY', 'Vardiya oluşturmak istiyorum.', 'CREATE'],
  ['CREATE_DESIDERATIVE_SYNONYM', 'COMPANY', 'Yeni vardiya açmak istiyorum.', 'CREATE'],
  ['CREATE_POLITE', 'COMPANY', 'Yeni vardiya oluşturur musun?', 'CREATE'],
  ['CREATE_DIRECT', 'COMPANY', 'Yeni vardiya oluştur.', 'CREATE'],
  ['NAVIGATE_DESIDERATIVE', 'COMPANY', 'Planlama Merkezi ekranına geçmek istiyorum.', 'NAVIGATE'],
  ['EXPLAIN_DESIDERATIVE', 'COMPANY', 'Bu ekranın nasıl çalıştığını öğrenmek istiyorum.', 'EXPLAIN'],
  ['UPDATE_DESIDERATIVE', 'COMPANY', 'Şu vardiyayı güncellemek istiyorum.', 'UPDATE'],
  ['NEGATED_CREATE', 'COMPANY', 'Vardiya oluşturmak istemiyorum.', 'NONE'],
  ['NEGATED_VIEW', 'COMPANY', 'Vardiyaları görüntülemek istemiyorum.', 'NONE'],
  ['HYPOTHETICAL_CREATE', 'COMPANY', 'Vardiya oluşturmak istesem nereden başlarım?', 'EXPLAIN'],
  ['PERMISSION_META', 'COMPANY', 'Vardiya oluşturmak isteyebilir miyim?', 'EXPLAIN'],
  ['ROOM_CREATE_BOUNDARY', 'ROOM', 'Yeni vardiya oluşturmak istiyorum.', 'CREATE'],
  ['GENUINE_OOS', 'COMPANY', 'Hafta sonu için film seçmeme yardım eder misin?', 'NONE'],
];

function pickEvidence(body) {
  const plan = body?.semanticPlan || {};
  const envelope = plan.canonicalRequestEnvelope || body?.canonicalRequestEnvelope || {};
  const request = envelope.request || plan.canonicalRequest?.request || plan.canonicalRequest || {};
  return {
    typedEvidence: request.typedEvidence || plan.typedEvidence || null,
    semanticAction: request.semanticAction || null,
    semanticScope: request.semanticScope || null,
    diagnostics: envelope.diagnostics || plan.diagnostics || null,
    operation: request.operation || plan.operation || null,
    authorizationDecision: plan.authorizationDecision || null,
    responseFamily: body?.responseFamily || plan.responseFamily || null,
  };
}

async function waitForHealth() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:3400/health', { signal: AbortSignal.timeout(1000) });
      if (response.status === 200) return true;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  return false;
}

const backend = spawn(process.execPath, ['src/server.js'], {
  cwd: backendRoot,
  env: { ...process.env, PORT: '3400', SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW', AUTH_RATE_LIMIT_MAX: '1000' },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let stdout = '';
let stderr = '';
backend.stdout.on('data', (chunk) => { stdout += chunk; });
backend.stderr.on('data', (chunk) => { stderr += chunk; });
try {
  if (!await waitForHealth()) {
    console.log(JSON.stringify({ status: 'HEALTHCHECK_FAILED', backendStdout: stdout, backendStderr: stderr }, null, 2));
    process.exitCode = 1;
  } else {
  const sessionFactory = createDemoSessionFactory();
  const transport = createCanonicalHttpTransport();
  const sessions = new Map();
  const rows = [];
  for (const [id, role, message, expectedMode] of cases) {
    const session = sessions.get(role) || await sessionFactory(role, `diagnostic-${role}`);
    sessions.set(role, session);
    const item = { role, screenContext: screenFor(role) };
    const result = await transport({ endpoint: '/api/ai/copilot', session, item, message });
    const actual = extractCanonicalActual(result.body);
    rows.push({
      id,
      role,
      message,
      expectedMode,
      status: result.status,
      actual: {
        semanticScope: actual.semanticScope,
        requestMode: actual.requestMode,
        semanticAction: actual.semanticAction,
        action: actual.action,
        object: actual.object,
        reference: actual.reference,
        resolutionStatus: actual.resolutionStatus,
        task: actual.task,
        operation: actual.operation,
        authorizationClass: actual.authorizationClass,
        authorizationNativeStatus: actual.authorizationNativeStatus,
      },
      trace: pickEvidence(result.body),
      expectedMatches: actual.requestMode === expectedMode,
    });
  }
  const output = { status: 'PASS', caseCount: rows.length, rows, backendStdout: stdout, backendStderr: stderr };
  const outputPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-view-create-desiderative-diagnostic-20261006.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ status: 'PASS', caseCount: rows.length, outputPath, summary: rows.map(({ id, role, expectedMode, actual, expectedMatches }) => ({ id, role, expectedMode, actual, expectedMatches })) }, null, 2));
  }
} finally {
  backend.kill('SIGTERM');
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  if (backend.exitCode === null) backend.kill('SIGKILL');
}
