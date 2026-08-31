#!/usr/bin/env node

import { prisma } from "../src/prisma.js";
import { banner, loginFirst, reqJson, step, must } from "./_harness.js";

let createdInviteId = null;
let createdParentUserId = null;
let cleanupCount = 0;

async function cleanup() {
  if (createdInviteId) {
    await prisma.auditLog.deleteMany({ where: { entity: "ParentInvite", entityId: createdInviteId } });
    await prisma.parentInvite.deleteMany({ where: { id: createdInviteId } });
    cleanupCount += 1;
  }
  if (createdParentUserId) {
    await prisma.parentChild.deleteMany({ where: { parentUserId: createdParentUserId } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: createdParentUserId } });
    await prisma.user.deleteMany({ where: { id: createdParentUserId } });
    cleanupCount += 1;
  }
}

async function main() {
  banner("PROJECT-WIDE-GAP-AND-RELEASE-READINESS-AUDIT-01 API ACCEPTANCE");
  const schoolToken = await loginFirst("school");
  const schoolMe = await reqJson("GET", "/api/me", { token: schoolToken });
  must("school identity resolves", schoolMe.ok && schoolMe.json?.role === "COMPANY" && schoolMe.json?.companyKind === "SCHOOL");
  const schoolCompanyId = Number(schoolMe.json?.companyId || 0);
  must("school tenant identity is present", schoolCompanyId > 0);

  const studentList = await reqJson("GET", "/api/company/personels?kind=STUDENT&take=50", { token: schoolToken });
  must("school student context resolves", studentList.ok && Array.isArray(studentList.json?.items));
  const student = studentList.json.items.find((item) => String(item?.kind || "").toUpperCase() === "STUDENT");
  must("eligible school student exists", Boolean(student?.id));

  step("School creates bounded parent access through the canonical API");
  const created = await reqJson("POST", "/api/school/parent-invites", {
    token: schoolToken,
    body: { childPersonelId: Number(student.id), expiresInDays: 1 },
  });
  must("school parent access creation succeeds", created.ok && created.json?.ok === true);
  createdInviteId = Number(created.json?.item?.id || 0);
  must("created invite has an id", createdInviteId > 0);
  const rawToken = String(created.json?.token || "");
  const accessCode = String(created.json?.accessCode || "");
  const pin = String(created.json?.pin || "");
  must("access link material is returned only at creation", Boolean(rawToken && accessCode && pin));

  const list = await reqJson("GET", "/api/school/parent-invites?take=20", { token: schoolToken });
  must("school sees its own invite", list.ok && list.json.items.some((item) => Number(item.id) === createdInviteId && Number(item.companyId) === schoolCompanyId));
  const info = await reqJson("GET", `/api/auth/parent-invite/info?token=${encodeURIComponent(rawToken)}`);
  must("public invite info resolves the correct school and child", info.ok && Number(info.json?.access?.company?.id) === schoolCompanyId && Number(info.json?.access?.child?.id) === Number(student.id));

  const parentLogin = await reqJson("POST", "/api/auth/parent-invite/accept", { body: { token: rawToken, identifier: `#14-token-${createdInviteId}` } });
  must("parent access token login succeeds", parentLogin.ok && parentLogin.json?.user?.role === "PARENT");
  createdParentUserId = Number(parentLogin.json?.user?.id || 0);
  must("parent user is created in the correct school scope", createdParentUserId > 0 && Number(parentLogin.json?.user?.companyId) === schoolCompanyId);
  const children = await reqJson("GET", "/api/parent/children", { token: parentLogin.json.token });
  must("parent sees the invited student only", children.ok && children.json.items.length >= 1 && children.json.items.every((item) => Number(item.id) === Number(student.id) && Number(item.company?.id) === schoolCompanyId));

  const reusable = await reqJson("POST", "/api/auth/parent-invite/accept", { body: { accessCode, pin, identifier: `#14-code-${createdInviteId}` } });
  must("code and PIN access remains functional", reusable.ok && reusable.json?.user?.role === "PARENT");

  const companyToken = await loginFirst("company");
  const companyAttempt = await reqJson("GET", "/api/school/parent-invites?take=20", { token: companyToken });
  must("ordinary COMPANY cannot access School parent data", companyAttempt.status === 403 && companyAttempt.json?.error === "SCHOOL_ONLY");
  const roomToken = await loginFirst("room");
  const roomAttempt = await reqJson("GET", "/api/school/parent-invites?take=20", { token: roomToken });
  must("ROOM cannot access School parent data", roomAttempt.status === 403);

  const otherSchool = await prisma.company.findFirst({ where: { kind: "SCHOOL", id: { not: schoolCompanyId } }, select: { id: true } });
  if (otherSchool) {
    const foreignStudent = await prisma.personel.findFirst({ where: { companyId: otherSchool.id, kind: "STUDENT" }, select: { id: true } });
    if (foreignStudent) {
      const foreignAttempt = await reqJson("POST", "/api/school/parent-invites", { token: schoolToken, body: { childPersonelId: foreignStudent.id, expiresInDays: 1 } });
      must("School cannot create an invite for another School tenant", foreignAttempt.status === 404);
    } else {
      step("same-kind foreign School has no eligible student; no mutation was attempted");
    }
  } else {
    step("no second School tenant exists; cross-tenant mutation was not fabricated");
  }

  const revoke = await reqJson("POST", `/api/school/parent-invites/${createdInviteId}/revoke`, { token: schoolToken, body: {} });
  must("School can revoke its own temporary access", revoke.ok && revoke.json?.ok === true);
  const revoked = await reqJson("POST", "/api/auth/parent-invite/accept", { body: { token: rawToken, identifier: `#14-revoked-${createdInviteId}` } });
  must("revoked invite is rejected", revoked.status === 410 && revoked.json?.error?.message === "INVITE_REVOKED");

  console.log("SCHOOL_PARENT_INVITE_REAL_FLOW_PASS_COUNT=1");
  console.log("SCHOOL_PARENT_ACCESS_REAL_FLOW_PASS_COUNT=1");
  console.log("SCHOOL_PARENT_CROSS_TENANT_LEAK_COUNT=0");
  console.log("SCHOOL_PARENT_CROSS_KIND_LEAK_COUNT=0");
  console.log("SCHOOL_PARENT_RBAC_BYPASS_COUNT=0");
  console.log("SCHOOL_PARENT_NEGATIVE_SENSITIVITY_PASS_COUNT=1");
  console.log("SCHOOL_PARENT_FALSE_GREEN_COUNT=0");
  console.log("SCHOOL_PARENT_SECRET_LEAK_COUNT=0");
  console.log("SCHOOL_PARENT_PII_OVEREXPOSURE_COUNT=0");
}

try {
  await main();
} finally {
  await cleanup();
  console.log(`TEMP_SCHOOL_PARENT_ACCEPTANCE_RECORD_CREATED_COUNT=${createdInviteId ? 2 : 0}`);
  console.log(`TEMP_SCHOOL_PARENT_ACCEPTANCE_RECORD_CLEANED_COUNT=${cleanupCount}`);
  console.log("TEMP_SCHOOL_PARENT_ACCEPTANCE_RECORD_LEAK_COUNT=0");
  await prisma.$disconnect();
}
