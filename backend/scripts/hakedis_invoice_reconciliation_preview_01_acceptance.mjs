import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma.js";

const BASE_URL = process.env.ACCEPTANCE_BASE_URL || "http://127.0.0.1:3000";
const marker = `#3-live-${process.pid}-${Date.now()}`;
const password = "demo123";
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` :: ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name} :: ${detail}`);
}

async function login(identifier) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password, deviceId: `${marker}-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`login ${identifier} ${response.status}`);
  return body.token;
}

async function request(path, { token, method = "GET" } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function previewPath(agreementId, extra = "") {
  return `/api/reconciliation/preview?agreementId=${agreementId}${extra}`;
}

async function cleanupMarker() {
  const agreements = await prisma.agreement.findMany({ where: { companyOfferNote: { startsWith: marker } }, select: { id: true } });
  const agreementIds = agreements.map((item) => item.id);
  const shifts = agreementIds.length ? await prisma.shift.findMany({ where: { agreementId: { in: agreementIds } }, select: { id: true } }) : [];
  const shiftIds = shifts.map((item) => item.id);
  await prisma.invoiceRecord.deleteMany({ where: { reference: { startsWith: marker } } });
  await prisma.hakedisRecord.deleteMany({ where: { reference: { startsWith: marker } } });
  if (shiftIds.length) await prisma.shiftProgress.deleteMany({ where: { shiftId: { in: shiftIds } } });
  if (agreementIds.length) await prisma.shift.deleteMany({ where: { agreementId: { in: agreementIds } } });
  if (agreementIds.length) await prisma.agreement.deleteMany({ where: { id: { in: agreementIds } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: marker } } });
  await prisma.room.deleteMany({ where: { name: marker } });
  await prisma.company.deleteMany({ where: { name: marker } });
}

async function createFixture({ start, end, hakedisAmount = 100000, invoiceAmount = 100000, includeHakedis = true, includeInvoice = true, source = "INTERNAL_ACTUAL", operationDate = null }) {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: 1 } });
  const room = await prisma.room.findUniqueOrThrow({ where: { id: 1 } });
  const agreement = await prisma.agreement.create({
    data: {
      companyId: company.id,
      roomId: room.id,
      startDate: new Date(`${start}T00:00:00.000Z`),
      endDate: new Date(`${end}T00:00:00.000Z`),
      weekMask: 127,
      startMin: 480,
      endMin: 1080,
      status: "ACTIVE",
      companyOfferAmount: 120000,
      roomOfferAmount: 100000,
      companyOfferNote: marker,
    },
  });
  const operationDay = operationDate || `${start.slice(0, 4)}-${start.slice(5, 7)}-${String(Number(start.slice(8, 10)) + 4).padStart(2, "0")}`;
  const shift = await prisma.shift.create({
    data: {
      companyId: company.id,
      roomId: room.id,
      agreementId: agreement.id,
      startAt: new Date(`${operationDay}T08:00:00.000Z`),
      endAt: new Date(`${operationDay}T09:00:00.000Z`),
      status: "DONE",
      progress: { create: { completedAt: new Date(`${operationDay}T12:00:00.000Z`) } },
    },
  });
  if (includeHakedis) {
    await prisma.hakedisRecord.create({
      data: {
        reference: `${marker}-HAK-${agreement.id}`,
        agreementId: agreement.id,
        companyId: company.id,
        roomId: room.id,
        periodStart: new Date(`${start}T00:00:00.000Z`),
        periodEnd: new Date(`${end}T00:00:00.000Z`),
        amountMinor: hakedisAmount,
        source,
      },
    });
  }
  if (includeInvoice) {
    await prisma.invoiceRecord.create({
      data: {
        reference: `${marker}-FAT-${agreement.id}`,
        agreementId: agreement.id,
        companyId: company.id,
        roomId: room.id,
        periodStart: new Date(`${start}T00:00:00.000Z`),
        periodEnd: new Date(`${end}T00:00:00.000Z`),
        amountMinor: invoiceAmount,
        source,
        issuedAt: new Date(`${end}T12:00:00.000Z`),
      },
    });
  }
  return { agreement, shift };
}

async function main() {
  await cleanupMarker();
  const companyToken = await login("company@demo.com");
  const roomToken = await login("room@demo.com");
  const adminToken = await login("superadmin@demo.com");
  const schoolToken = await login("school@demo.com");
  const organizationToken = await login("organization@demo.com");
  pass("canonical identities login");

  const matching = await createFixture({ start: "2030-01-01", end: "2030-01-31", hakedisAmount: 100000, invoiceAmount: 100000 });
  const under = await createFixture({ start: "2030-02-01", end: "2030-02-28", hakedisAmount: 100000, invoiceAmount: 90000 });
  const over = await createFixture({ start: "2030-03-01", end: "2030-03-31", hakedisAmount: 100000, invoiceAmount: 110000 });
  const noHakedis = await createFixture({ start: "2030-05-01", end: "2030-05-31", includeHakedis: false });
  const noInvoice = await createFixture({ start: "2030-06-01", end: "2030-06-30", includeInvoice: false });
  const demoFixture = await createFixture({ start: "2030-07-01", end: "2030-07-31", source: "DEMO_FIXTURE" });
  const externalFixture = await createFixture({ start: "2030-08-01", end: "2030-08-31", source: "EXTERNAL_REFERENCE" });
  const endBoundaryFixture = await createFixture({ start: "2030-09-01", end: "2030-09-30", operationDate: "2030-09-30" });
  const afterBoundaryFixture = await createFixture({ start: "2030-10-01", end: "2030-10-31", operationDate: "2030-11-01" });

  for (const [name, token, fixture, expectedStatus] of [
    ["company matching", companyToken, matching, "MATCHED"],
    ["room matching", roomToken, matching, "MATCHED"],
    ["super admin matching", adminToken, matching, "MATCHED"],
    ["company under", companyToken, under, "UNDER_INVOICED"],
    ["company over", companyToken, over, "OVER_INVOICED"],
  ]) {
    const response = await request(previewPath(fixture.agreement.id), { token });
    if (response.status === 200 && response.body?.data?.status === expectedStatus) pass(name, `${response.status}/${expectedStatus}`);
    else fail(name, `${response.status}/${response.body?.data?.status || response.body?.error?.code}`);
  }

  const invalidPeriod = await request(previewPath(matching.agreement.id, "&periodStart=2030-02-30&periodEnd=2030-01-01"), { token: companyToken });
  if (invalidPeriod.status === 400 && invalidPeriod.body?.error?.code === "INVALID_PERIOD") pass("invalid period rejection", `${invalidPeriod.status}/${invalidPeriod.body.error.code}`);
  else fail("invalid period rejection", `${invalidPeriod.status}/${invalidPeriod.body?.error?.code}`);

  const postAttempt = await request(previewPath(matching.agreement.id), { token: companyToken, method: "POST" });
  if ([404, 405].includes(postAttempt.status)) pass("read-only route rejects writes", String(postAttempt.status));
  else fail("read-only route rejects writes", String(postAttempt.status));

  const periodMismatch = await request(previewPath(matching.agreement.id, "&periodStart=2030-02-01&periodEnd=2030-02-28"), { token: companyToken });
  if (periodMismatch.status === 200 && periodMismatch.body?.data?.status === "PERIOD_MISMATCH") pass("period mismatch is fail-safe", periodMismatch.body.data.status);
  else fail("period mismatch is fail-safe", `${periodMismatch.status}/${periodMismatch.body?.data?.status}`);

  const noAgreement = await request("/api/reconciliation/preview?periodStart=2030-01-01&periodEnd=2030-01-31", { token: companyToken });
  if (noAgreement.status === 200 && noAgreement.body?.data?.status === "NO_AGREEMENT" && noAgreement.body?.data?.difference?.amountMinor == null) pass("no agreement is fail-safe", `${noAgreement.status}/${noAgreement.body.data.status}`);
  else fail("no agreement is fail-safe", `${noAgreement.status}/${noAgreement.body?.data?.status}`);
  for (const [name, fixture, expectedStatus] of [["no hakedis is fail-safe", noHakedis, "NO_HAKEDIS"], ["no invoice is fail-safe", noInvoice, "NO_INVOICE"]]) {
    const response = await request(previewPath(fixture.agreement.id), { token: companyToken });
    if (response.status === 200 && response.body?.data?.status === expectedStatus && response.body?.data?.difference?.amountMinor == null) pass(name, `${response.status}/${expectedStatus}`);
    else fail(name, `${response.status}/${response.body?.data?.status}`);
  }
  const duplicateHakedis = await prisma.hakedisRecord.create({
    data: {
      reference: `${marker}-HAK-DUP-${matching.agreement.id}`,
      agreementId: matching.agreement.id,
      companyId: matching.agreement.companyId,
      roomId: matching.agreement.roomId,
      periodStart: new Date("2030-01-01T00:00:00.000Z"),
      periodEnd: new Date("2030-01-31T00:00:00.000Z"),
      amountMinor: 100000,
      source: "INTERNAL_ACTUAL",
    },
  });
  const duplicateResponse = await request(previewPath(matching.agreement.id), { token: companyToken });
  if (duplicateResponse.status === 200 && duplicateResponse.body?.data?.status === "DUPLICATE_HAKEDIS" && duplicateResponse.body?.data?.difference?.amountMinor == null) pass("duplicate hakedis is fail-safe", `${duplicateResponse.status}/${duplicateResponse.body.data.status}`);
  else fail("duplicate hakedis is fail-safe", `${duplicateResponse.status}/${duplicateResponse.body?.data?.status}`);
  await prisma.hakedisRecord.delete({ where: { id: duplicateHakedis.id } });
  const demoResponse = await request(previewPath(demoFixture.agreement.id), { token: companyToken });
  if (demoResponse.status === 200 && demoResponse.body?.data?.status === "REVIEW_REQUIRED" && demoResponse.body?.data?.demoFixtureUsedForTruth === false && demoResponse.body?.data?.difference?.amountMinor == null) pass("demo fixture is not reconciliation truth", `${demoResponse.status}/${demoResponse.body.data.status}`);
  else fail("demo fixture is not reconciliation truth", `${demoResponse.status}/${demoResponse.body?.data?.status}`);
  const externalResponse = await request(previewPath(externalFixture.agreement.id), { token: companyToken });
  if (externalResponse.status === 200 && externalResponse.body?.data?.status === "REVIEW_REQUIRED" && externalResponse.body?.data?.externalReferenceUsedForTruth === false && externalResponse.body?.data?.difference?.amountMinor == null) pass("external reference is not reconciliation truth", `${externalResponse.status}/${externalResponse.body.data.status}`);
  else fail("external reference is not reconciliation truth", `${externalResponse.status}/${externalResponse.body?.data?.status}`);
  const endBoundaryResponse = await request(previewPath(endBoundaryFixture.agreement.id), { token: companyToken });
  if (endBoundaryResponse.status === 200 && endBoundaryResponse.body?.data?.status === "MATCHED" && endBoundaryResponse.body?.data?.evidence?.operations?.eligibleCount === 1) pass("period end boundary is inclusive", `${endBoundaryResponse.status}/${endBoundaryResponse.body.data.status}`);
  else fail("period end boundary is inclusive", `${endBoundaryResponse.status}/${endBoundaryResponse.body?.data?.status}`);
  const afterBoundaryResponse = await request(previewPath(afterBoundaryFixture.agreement.id), { token: companyToken });
  if (afterBoundaryResponse.status === 200 && afterBoundaryResponse.body?.data?.status === "NO_OPERATION" && afterBoundaryResponse.body?.data?.evidence?.operations?.eligibleCount === 0) pass("after-period operation is excluded", `${afterBoundaryResponse.status}/${afterBoundaryResponse.body.data.status}`);
  else fail("after-period operation is excluded", `${afterBoundaryResponse.status}/${afterBoundaryResponse.body?.data?.status}`);

  const company = await prisma.company.create({ data: { name: marker, status: "ACTIVE" } });
  const room = await prisma.room.create({ data: { name: marker, status: "ACTIVE" } });
  const tempUser = await prisma.user.create({ data: { email: marker, passwordHash: await bcrypt.hash(password, 10), role: "COMPANY", fullName: "#3 Acceptance", companyId: company.id } });
  const isolatedAgreement = await prisma.agreement.create({
    data: { companyId: company.id, roomId: room.id, startDate: new Date("2030-04-01T00:00:00.000Z"), endDate: new Date("2030-04-30T00:00:00.000Z"), weekMask: 127, startMin: 480, endMin: 1080, status: "ACTIVE", companyOfferNote: marker },
  });
  const isolatedToken = await login(marker);
  const wrongCompany = await request(previewPath(isolatedAgreement.id), { token: companyToken });
  const wrongRoom = await request(previewPath(isolatedAgreement.id), { token: roomToken });
  const ownIsolated = await request(previewPath(isolatedAgreement.id), { token: isolatedToken });
  if (wrongCompany.status === 403) pass("wrong company is denied", String(wrongCompany.status)); else fail("wrong company is denied", String(wrongCompany.status));
  if (wrongRoom.status === 403) pass("wrong room is denied", String(wrongRoom.status)); else fail("wrong room is denied", String(wrongRoom.status));
  if (ownIsolated.status === 200 && ownIsolated.body?.data?.status === "NO_OPERATION") pass("isolated tenant sees own preview", `${ownIsolated.status}/${ownIsolated.body.data.status}`); else fail("isolated tenant sees own preview", `${ownIsolated.status}/${ownIsolated.body?.data?.status}`);

  for (const [name, token] of [["school finance boundary", schoolToken], ["organization finance boundary", organizationToken]]) {
    const response = await request("/api/reconciliation/preview", { token });
    if (response.status === 403 && response.body?.error?.code === "RECONCILIATION_NOT_APPLICABLE") pass(name, `${response.status}/${response.body.error.code}`);
    else fail(name, `${response.status}/${response.body?.error?.code}`);
  }

  const counts = {
    agreements: await prisma.agreement.count({ where: { companyOfferNote: { startsWith: marker } } }),
    shifts: await prisma.shift.count({ where: { agreement: { companyOfferNote: { startsWith: marker } } } }),
    hakedis: await prisma.hakedisRecord.count({ where: { reference: { startsWith: marker } } }),
    invoices: await prisma.invoiceRecord.count({ where: { reference: { startsWith: marker } } }),
  };
  if (Object.values(counts).every((value) => value > 0)) pass("fixture rows persisted in real DB", JSON.stringify(counts)); else fail("fixture rows persisted in real DB", JSON.stringify(counts));
}

try {
  await main();
} finally {
  await cleanupMarker();
  const remaining = {
    agreements: await prisma.agreement.count({ where: { companyOfferNote: { startsWith: marker } } }),
    shifts: await prisma.shift.count({ where: { agreement: { companyOfferNote: { startsWith: marker } } } }),
    hakedis: await prisma.hakedisRecord.count({ where: { reference: { startsWith: marker } } }),
    invoices: await prisma.invoiceRecord.count({ where: { reference: { startsWith: marker } } }),
  };
  if (Object.values(remaining).every((value) => value === 0)) pass("fixture cleanup leaves no marker rows", JSON.stringify(remaining)); else fail("fixture cleanup leaves no marker rows", JSON.stringify(remaining));
  await prisma.$disconnect();
}

if (results.some((result) => !result.ok)) {
  console.error(`HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01_ACCEPTANCE FAIL ${results.filter((result) => result.ok).length}/${results.length}`);
  process.exit(1);
}
console.log(`HAKEDIS_INVOICE_RECONCILIATION_PREVIEW_01_ACCEPTANCE PASS ${results.length}/${results.length}`);
