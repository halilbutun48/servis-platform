#!/usr/bin/env node

import assert from "node:assert/strict";
import { runCopilotFoundation } from "../src/ai/service.js";

const baseUrl = String(process.env.API_URL || "http://127.0.0.1:3000").replace(/\/$/u, "");
const identifier = process.env.ROOM_EMAIL || "room@demo.com";
const password = process.env.ROOM_PASSWORD || "demo123";

function istanbulDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

const dateText = istanbulDateKey();

function fail(message) {
  throw new Error(`FAIL ${message}`);
}

async function jsonRequest(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function main() {
  const login = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: { identifier, password, deviceId: `m18-cap38-${Date.now()}` },
  });
  if (login.status !== 200 || !login.payload?.token) fail(`ROOM login status=${login.status}`);

  const token = login.payload.token;
  const [direct, bulk] = await Promise.all([
    jsonRequest("/api/requests", { token }),
    jsonRequest(`/api/dashboard/bulk?bundle=room-operation-health&from=${dateText}&to=${dateText}`, { token }),
  ]);
  if (direct.status !== 200 || !Array.isArray(direct.payload)) fail(`direct ROOM requests status=${direct.status}`);
  if (bulk.status !== 200 || !Array.isArray(bulk.payload?.roomOperations?.requests)) {
    fail(`room-operation-health requests shape status=${bulk.status}`);
  }

  const directIds = direct.payload.map((item) => Number(item?.id || 0)).filter((id) => id > 0);
  const bulkIds = bulk.payload.roomOperations.requests.map((item) => Number(item?.id || 0)).filter((id) => id > 0);
  const directTodayCount = direct.payload.filter((item) => istanbulDateKey(item?.createdAt) === dateText).length;
  const missingIds = directIds.filter((id) => !bulkIds.includes(id));
  const unexpectedIds = bulkIds.filter((id) => !directIds.includes(id));

  if (directIds.length !== bulkIds.length || missingIds.length || unexpectedIds.length) {
    fail(`ROOM request projection mismatch direct=${directIds.length} bulk=${bulkIds.length} missing=${missingIds.join(",") || "-"} unexpected=${unexpectedIds.join(",") || "-"}`);
  }

  const roomUser = { id: 995001, role: "ROOM", roomId: 1, companyId: null, sessionVersion: 1 };
  const roomDashboard = {
    id: 1100,
    path: "/room",
    label: "Taşımacılık Firması Merkezi",
    role: "ROOM",
    uiHints: { activeTabs: [], visibleButtons: [] },
  };
  const semanticCases = [
    {
      id: "room-boarding-change-inventory",
      message: "Biniş değişikliği taleplerim var mı?",
      expectedToday: false,
      expectedEvidenceCount: directIds.length,
    },
    {
      id: "room-boarding-change-today",
      message: "Bugün kaç biniş değişikliği talebi geldi?",
      expectedToday: true,
      expectedEvidenceCount: directTodayCount,
    },
    {
      id: "room-generic-dashboard-request",
      message: "Ana sayfada görünen bir talep neyle ilgili?",
      expectedToday: false,
      expectedEvidenceCount: directIds.length,
    },
  ];
  const semanticResults = [];
  for (const testCase of semanticCases) {
    const payload = await runCopilotFoundation({
      intent: "CHAT_HELP",
      entityType: "screen",
      entityId: roomDashboard.id,
      user: roomUser,
      message: testCase.message,
      screenContext: roomDashboard,
      authSessionId: `m18-cap38-semantic-red-${testCase.id}`,
    });
    const plan = payload?.semanticPlan || {};
    assert.ok(
      plan.requestedDomains?.includes("SERVICE_REQUESTS"),
      `${testCase.id} must resolve to the existing request evidence domain`,
    );
    assert.notEqual(plan.family, "ROLE_EXPLANATION_HELP", `${testCase.id} must not fall back to role help`);
    assert.notEqual(plan.family, "GENERIC_PRODUCT_HELP", `${testCase.id} must not fall back to generic help`);
    assert.equal(plan.authorizationDecision?.status, "ALLOW", `${testCase.id} must remain within ROOM authorization`);
    if (testCase.expectedToday) assert.equal(plan.temporalMode, "ACTIVE_TODAY", `${testCase.id} must preserve today scope`);
    const evidenceItem = payload?.queryPlanExecution?.items?.find((item) => item?.domain === "SERVICE_REQUESTS");
    assert.ok(evidenceItem, `${testCase.id} must execute the authorized SERVICE_REQUESTS evidence reader`);
    assert.equal(
      Number(evidenceItem.count),
      testCase.expectedEvidenceCount,
      `${testCase.id} must return the authorized count for its scope`,
    );
    semanticResults.push({
      id: testCase.id,
      family: plan.family || null,
      requestedDomains: plan.requestedDomains || [],
      temporalMode: plan.temporalMode || null,
      authorization: plan.authorizationDecision?.status || null,
      evidenceCount: Number(evidenceItem.count),
      evidenceStatus: evidenceItem.status || null,
      reply: payload?.reply || null,
    });
  }

  const procurement = await runCopilotFoundation({
    intent: "CHAT_HELP",
    entityType: "screen",
    entityId: roomDashboard.id,
    user: roomUser,
    message: "Servis tedarik taleplerini görebilir miyim?",
    screenContext: roomDashboard,
    authSessionId: "m18-cap38-semantic-red-procurement-negative",
  });
  const procurementPlan = procurement?.semanticPlan || {};
  assert.ok(
    procurementPlan.family === "AUTHORIZATION_BOUNDARY"
      || procurementPlan.family === "UNCLEAR_OR_AMBIGUOUS"
      || procurementPlan.authorizationDecision?.status === "DENY",
    "ROOM procurement/service-demand request must not be treated as an authorized boarding-change request",
  );

  console.log(JSON.stringify({
    status: "PASS",
    role: "ROOM",
    tenant: bulk.payload?.room?.id ?? null,
    directCount: directIds.length,
    bulkCount: bulkIds.length,
    directTodayCount,
    directIds,
    bulkIds,
    dateWindow: {
      from: bulk.payload?.roomOperations?.shiftSummary?.from ?? null,
      to: bulk.payload?.roomOperations?.shiftSummary?.to ?? null,
    },
    semanticResults,
    procurementNegative: {
      family: procurementPlan.family || null,
      requestedDomains: procurementPlan.requestedDomains || [],
      authorization: procurementPlan.authorizationDecision?.status || null,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
