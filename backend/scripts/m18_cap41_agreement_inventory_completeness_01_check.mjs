#!/usr/bin/env node

import assert from 'node:assert/strict';
import prisma from '../src/prisma.js';
import { buildAuthorizedProductAwarenessAnswer } from '../src/services/authorizedProductAwareness.js';

const user = { id: 4, role: 'ROOM', roomId: 1, companyKind: 'DEMO' };
const screenContext = {
  id: 1106,
  path: '/room/agreements',
  label: 'Sözleşmeler',
  role: 'ROOM',
  uiHints: { activeTabs: ['bridge'], visibleButtons: ['Detayı aç'], semanticBlocks: [] },
};
const reviewStatuses = new Set(['REQUESTED', 'COUNTERED']);

function answerCount(reply) {
  const match = String(reply || '').match(/(\d+)\s+(?:yetkili\s+)?sözleşme(?:\s+kaydı)?/i);
  return match ? Number(match[1]) : null;
}

async function answer(message, context = screenContext) {
  return buildAuthorizedProductAwarenessAnswer({ user, message, screenContext: context });
}

try {
  const rows = await prisma.agreement.findMany({
    where: { roomId: user.roomId },
    orderBy: { id: 'asc' },
    select: { id: true, status: true },
  });
  const expected = {
    total: rows.length,
    pending: rows.filter((row) => reviewStatuses.has(row.status)).length,
    active: rows.filter((row) => row.status === 'ACTIVE').length,
    statuses: rows.map((row) => ({ id: row.id, status: row.status })),
  };

  const messages = {
    total: 'Toplam kaç sözleşmem var?',
    pending: 'Hangi sözleşmeler inceleme bekliyor?',
    active: 'Aktif sözleşmelerim kaç tane?',
  };
  const replies = {};
  for (const [key, message] of Object.entries(messages)) {
    const result = await answer(message);
    replies[key] = { message, reply: result?.reply || '', count: answerCount(result?.reply) };
  }

  assert.equal(replies.total.count, expected.total, 'total inventory must include every authorized agreement');
  assert.equal(replies.pending.count, expected.pending, 'pending subset must preserve review status scope');
  assert.equal(replies.active.count, expected.active, 'active subset must use the active status scope');

  const selectedScreenContext = {
    ...screenContext,
    selectedEntity: { type: 'agreement', id: rows[0]?.id || null },
    selectedEntityType: 'agreement',
    selectedEntityId: rows[0]?.id || null,
  };
  const selectedContextReply = await answer(messages.total, selectedScreenContext);
  const selectedContextCount = answerCount(selectedContextReply?.reply);
  assert.equal(selectedContextCount, expected.total, 'inventory count must not collapse to the selected agreement');

  console.log(JSON.stringify({ status: 'PASS', expected, replies, selectedContext: { reply: selectedContextReply?.reply || '', count: selectedContextCount } }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'FAIL', error: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
