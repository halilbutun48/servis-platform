#!/usr/bin/env node

import assert from "node:assert/strict";

import { clusterMatrixFailures } from "./lib/pre_18_matrix_root_cluster_report.mjs";

const rows = [
  {
    pass: false,
    role: "ROOM",
    screen: "ROOM /room/map",
    question: "Riskleri sırala",
    expectedIntentFamily: "RISK_LIST",
    actualIntentFamily: "SERVICE_SUMMARY",
    failReason: "expected RISK_LIST but got SERVICE_SUMMARY | risk-list reply does not read like a risk list",
  },
  {
    pass: false,
    role: "COMPANY",
    screen: "COMPANY /company/operations",
    question: "Riskleri sırala",
    expectedIntentFamily: "RISK_LIST",
    actualIntentFamily: "SERVICE_SUMMARY",
    failReason: "expected RISK_LIST but got SERVICE_SUMMARY | risk-list reply does not read like a risk list",
  },
  {
    pass: false,
    role: "PERSONEL",
    screen: "PERSONEL /personel/my",
    question: "Sıradaki doğru işlem ne?",
    expectedIntentFamily: "NEXT_ACTION",
    actualIntentFamily: "NEXT_ACTION",
    failReason: "next-action reply does not sound action-oriented",
  },
  {
    pass: true,
    role: "ROOM",
    screen: "ROOM /room/shifts",
    question: "Bu ekran ne için?",
    expectedIntentFamily: "SCREEN_PURPOSE",
    actualIntentFamily: "SCREEN_PURPOSE",
    failReason: "",
  },
];

const report = clusterMatrixFailures(rows, {
  owner: "AI03B_SEMANTIC_VISIBLE_LIVE_MATRIX",
  failureClass: "PRODUCT_QUALITY",
  blockingLevel: "CLASS_2_PRE18_FINAL",
});

assert.equal(report.totalFailures, 3, "only failed matrix rows enter clusters");
assert.equal(report.rootClusterCount, 2, "identical failure signatures form one deterministic root cluster");
assert.equal(report.clusterMemberTotal, 3, "all failures are retained in clusters");
assert.equal(report.rawFailureCount, 3, "raw failures remain visible");
assert.equal(report.rawFailures.every((row) => row.pass === false), true, "clustering never changes failure terminal state");
assert.equal(report.clusters.some((cluster) => cluster.failCount === 2), true, "the repeated risk failure remains a two-member cluster");
assert.equal(report.clusters.every((cluster) => cluster.owner === "AI03B_SEMANTIC_VISIBLE_LIVE_MATRIX"), true, "cluster owner is explicit");

console.log(JSON.stringify({
  MATRIX_ROOT_CLUSTER_REPORTING_CASES: 7,
  MATRIX_ROOT_CLUSTER_REPORTING_PASS: 7,
  MATRIX_ROOT_CLUSTER_REPORTING_FAIL: 0,
  ROOT_CLUSTER_COUNT: report.rootClusterCount,
  RAW_FAILURE_COUNT: report.rawFailureCount,
}, null, 2));
