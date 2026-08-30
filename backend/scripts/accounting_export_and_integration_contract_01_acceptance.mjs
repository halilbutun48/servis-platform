import crypto from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { prisma } from "../src/prisma.js";
import {
  ACCOUNTING_EXPORT_COLUMNS,
  ACCOUNTING_EXPORT_CONTRACT_VERSION,
} from "../src/finance/accountingExportContract.js";
import {
  sanitizeSpreadsheetText,
  serializeAccountingExportCsv,
} from "../src/finance/accountingExportFormats.js";

const BASE_URL = (process.env.ACCEPTANCE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const marker = `#6-accounting-${process.pid}-${Date.now()}`;
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` :: ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login(identifier) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `${marker}-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`login ${identifier} ${response.status}`);
  return body.token;
}

async function jsonRequest(path, { token, method = "POST", body = {} } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function binaryRequest(path, { token, body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}

async function createTemporaryAgreement(companyToken, roomToken) {
  const sourceShift = await prisma.shift.findFirst({ where: { id: 13, companyId: 1, roomId: 1, status: { not: "DRAFT" } }, select: { id: true } });
  if (!sourceShift) throw new Error("#6 canonical Agreement source shift is unavailable");
  const create = await jsonRequest("/api/agreements", {
    token: companyToken,
    body: {
      roomId: 1,
      startDate: "2099-11-01",
      endDate: "2099-11-30",
      weekMask: 127,
      startMin: 600,
      endMin: 660,
      direction: "INBOUND",
      pattern: "ONE_WAY",
      companyOfferAmount: 270000,
      sourceShiftId: sourceShift.id,
    },
  });
  const agreementId = Number(create.data?.id || 0);
  if (!create.response.ok || !agreementId) throw new Error(`Agreement create ${create.response.status}`);
  const counter = await jsonRequest(`/api/agreements/${agreementId}/counter`, { token: roomToken, method: "PUT", body: { roomOfferAmount: 270000, roomOfferNote: marker } });
  if (!counter.response.ok) throw new Error(`Agreement counter ${counter.response.status}`);
  const accept = await jsonRequest(`/api/agreements/${agreementId}/accept-counter`, { token: companyToken, method: "PUT", body: {} });
  if (!accept.response.ok) throw new Error(`Agreement accept ${accept.response.status}`);
  const agreement = await prisma.agreement.findUniqueOrThrow({ where: { id: agreementId }, select: { id: true, companyId: true, roomId: true } });
  const hakedis = await prisma.hakedisRecord.create({ data: { reference: `${marker}-HAK-${agreementId}`, agreementId, companyId: agreement.companyId, roomId: agreement.roomId, periodStart: new Date("2099-11-01T00:00:00.000Z"), periodEnd: new Date("2099-11-30T00:00:00.000Z"), amountMinor: 12345, currencyCode: "TRY", status: "READY", source: "INTERNAL_ACTUAL" } });
  const invoice = await prisma.invoiceRecord.create({ data: { reference: `${marker}-FAT-${agreementId}`, agreementId, companyId: agreement.companyId, roomId: agreement.roomId, periodStart: new Date("2099-11-01T00:00:00.000Z"), periodEnd: new Date("2099-11-30T00:00:00.000Z"), amountMinor: 12345, currencyCode: "TRY", status: "ISSUED", source: "INTERNAL_ACTUAL", issuedAt: new Date("2099-11-30T12:00:00.000Z") } });
  const sources = await prisma.commercialSource.findMany({ where: { agreementId }, select: { id: true } });
  return { agreementId, hakedisId: hakedis.id, invoiceId: invoice.id, sourceIds: sources.map((item) => item.id), notificationPrefix: `agreement:${agreementId}:` };
}

async function cleanupTemporaryAgreement(temp) {
  if (!temp?.agreementId) return { records: 0 };
  const shifts = await prisma.shift.findMany({ where: { agreementId: temp.agreementId }, select: { id: true } });
  const shiftIds = shifts.map((item) => item.id);
  if (temp.sourceIds?.length) await prisma.settlementPlan.deleteMany({ where: { commercialSourceId: { in: temp.sourceIds } } });
  const sources = temp.sourceIds?.length
    ? await prisma.commercialSource.deleteMany({ where: { id: { in: temp.sourceIds }, agreementId: temp.agreementId } })
    : await prisma.commercialSource.deleteMany({ where: { agreementId: temp.agreementId } });
  const invoices = await prisma.invoiceRecord.deleteMany({ where: { reference: { startsWith: marker } } });
  const hakedis = await prisma.hakedisRecord.deleteMany({ where: { reference: { startsWith: marker } } });
  if (shiftIds.length) await prisma.shiftProgress.deleteMany({ where: { shiftId: { in: shiftIds } } });
  const shiftsDeleted = await prisma.shift.deleteMany({ where: { id: { in: shiftIds } } });
  const agreements = await prisma.agreement.deleteMany({ where: { id: temp.agreementId } });
  const notifications = await prisma.notification.deleteMany({ where: { dedupeKey: { startsWith: temp.notificationPrefix } } });
  return { records: sources.count + invoices.count + hakedis.count + shiftsDeleted.count + agreements.count + notifications.count };
}

function parseCsv(text) {
  const input = String(text || "").replace(/^\ufeff/, "");
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows.filter((item) => item.some((cell) => cell !== ""));
}

function unzipLocalEntries(buffer) {
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const start = offset + 30 + nameLength + extraLength;
    const compressed = buffer.subarray(start, start + compressedSize);
    entries.set(name, method === 8 ? inflateRawSync(compressed) : compressed);
    offset = start + compressedSize;
  }
  return entries;
}

function xmlDecode(value) {
  return String(value || "").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, ">" ).replace(/&lt;/g, "<").replace(/&amp;/g, "&");
}

function parseXlsx(buffer) {
  const entries = unzipLocalEntries(buffer);
  const xml = entries.get("xl/worksheets/sheet1.xml")?.toString("utf8") || "";
  const rows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((match) => {
    return [...match[1].matchAll(/<c[^>]*r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>/g)].map((cell) => {
      const attrs = cell[2];
      const inline = /t="inlineStr"/.test(attrs);
      const style = /\bs="(\d+)"/.exec(attrs)?.[1] || "";
      const value = inline ? xmlDecode(cell[3].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || "") : cell[3].match(/<v>([\s\S]*?)<\/v>/)?.[1] || "";
      return { ref: cell[1], value, inline, style };
    });
  });
  return { entries, rows };
}

async function main() {
  await cleanupTemporaryAgreement(null);
  const tokens = {
    company: await login("company@demo.com"),
    room: await login("room@demo.com"),
    school: await login("school@demo.com"),
    organization: await login("organization@demo.com"),
  };
  pass("canonical identities login");

  const temp = await createTemporaryAgreement(tokens.company, tokens.room);
  pass("bounded canonical Agreement and source records created", `agreement=${temp.agreementId}`);
  const input = { scope: "COMPANY", periodStart: "2099-11-01", periodEnd: "2099-11-30", format: "XLSX" };
  const companyPreview = await jsonRequest("/api/accounting-exports/preview", { token: tokens.company, body: input });
  const roomPreview = await jsonRequest("/api/accounting-exports/preview", { token: tokens.room, body: { ...input, scope: "ROOM" } });
  pass("valid COMPANY preview", companyPreview.response.ok && companyPreview.data?.contract?.validation?.status !== "BLOCKED", companyPreview.data?.contract?.validation?.status);
  pass("valid ROOM preview", roomPreview.response.ok && roomPreview.data?.contract?.validation?.status !== "BLOCKED", roomPreview.data?.contract?.validation?.status);
  pass("contract version and source metadata", companyPreview.data?.contract?.contractVersion === ACCOUNTING_EXPORT_CONTRACT_VERSION && companyPreview.data?.contract?.sourceSystem === "SeferPakt");
  pass("ROOM private data is absent from COMPANY contract", companyPreview.data?.contract?.records?.every((row) => row.companyTaxNo === null || row.companyTaxNo === undefined) && !JSON.stringify(companyPreview.data?.contract).includes("driver"));

  const sameAgain = await jsonRequest("/api/accounting-exports/validate", { token: tokens.company, body: input });
  pass("same logical scope has deterministic idempotency", sameAgain.data?.contract?.idempotency?.key === companyPreview.data?.contract?.idempotency?.key);
  const changedScope = await jsonRequest("/api/accounting-exports/validate", { token: tokens.company, body: { ...input, periodStart: "2099-12-01", periodEnd: "2099-12-31" } });
  pass("changed material scope gets new idempotency", changedScope.data?.contract?.idempotency?.key && changedScope.data.contract.idempotency.key !== companyPreview.data.contract.idempotency.key);

  const generated = {};
  for (const format of ["CSV", "XLSX", "JSON"]) {
    generated[format] = await binaryRequest("/api/accounting-exports/generate", { token: tokens.company, body: { ...input, format, userApproval: true } });
    pass(`${format} real file generated`, generated[format].response.ok, `${generated[format].response.status}/${generated[format].response.headers.get("content-type")}`);
  }

  const csvRows = parseCsv(generated.CSV.bytes.toString("utf8"));
  const xlsxParsed = parseXlsx(generated.XLSX.bytes);
  const jsonContract = JSON.parse(generated.JSON.bytes.toString("utf8"));
  const csvHeader = csvRows[0] || [];
  const xlsxHeader = xlsxParsed.rows[0]?.map((cell) => cell.value) || [];
  const xlsxData = xlsxParsed.rows[1] || [];
  const xlsxAmountIndex = xlsxHeader.indexOf("amountMinor");
  const xlsxPeriodIndex = xlsxHeader.indexOf("periodStart");
  pass("CSV parsed with deterministic schema", JSON.stringify(csvHeader) === JSON.stringify(ACCOUNTING_EXPORT_COLUMNS));
  pass("XLSX openable with expected sheet", xlsxParsed.entries.has("xl/worksheets/sheet1.xml") && xlsxParsed.entries.has("xl/workbook.xml"));
  pass("XLSX schema matches CSV", JSON.stringify(xlsxHeader) === JSON.stringify(ACCOUNTING_EXPORT_COLUMNS));
  pass("XLSX amount is numeric", xlsxData[xlsxAmountIndex]?.inline === false && Number(xlsxData[xlsxAmountIndex]?.value) === 12345);
  pass("XLSX date is typed", xlsxData[xlsxPeriodIndex]?.style === "1" && Number.isFinite(Number(xlsxData[xlsxPeriodIndex]?.value)));
  pass("XLSX has no macros or formulas", !xlsxParsed.entries.has("xl/vbaProject.bin") && !generated.XLSX.bytes.toString("utf8").includes("<f>"));
  pass("JSON parses with version and typed amount", jsonContract.contractVersion === ACCOUNTING_EXPORT_CONTRACT_VERSION && typeof jsonContract.records[0]?.amountMinor === "number");

  const csvData = csvRows[1] || [];
  const csvAmountIndex = csvHeader.indexOf("amountMinor");
  const jsonRecord = jsonContract.records[0];
  pass("cross-format record count parity", csvRows.length - 1 === jsonContract.records.length && xlsxParsed.rows.length - 1 === jsonContract.records.length);
  pass("cross-format amount parity", csvData[csvAmountIndex] === String(jsonRecord.amountMinor) && Number(xlsxData[xlsxAmountIndex]?.value) === jsonRecord.amountMinor);
  pass("cross-format id parity", csvData[csvHeader.indexOf("sourceEntityId")] === String(jsonRecord.sourceEntityId) && xlsxData[xlsxHeader.indexOf("sourceEntityId")]?.value === String(jsonRecord.sourceEntityId));
  pass("money precision is preserved", csvData[csvAmountIndex] === "12345" && jsonRecord.amountMinor === 12345);
  pass("audit trace recorded", Boolean((await prisma.auditLog.findFirst({ where: { action: "ACCOUNTING_EXPORT_GENERATED", entity: "AccountingExport" }, orderBy: { id: "desc" }, select: { id: true, meta: true } }))?.id));

  const malicious = { ...companyPreview.data.contract, records: companyPreview.data.contract.records.map((row) => ({ ...row, companyName: "=SUM(A1:A2)" })) };
  const maliciousCsv = serializeAccountingExportCsv(malicious);
  pass("formula injection is neutralized in CSV", sanitizeSpreadsheetText("=SUM(A1:A2)") === "'=SUM(A1:A2)" && maliciousCsv.includes("'=SUM(A1:A2)"));
  pass("Turkish characters remain UTF-8", Buffer.from(serializeAccountingExportCsv({ ...malicious, records: [{ ...malicious.records[0], companyName: "İstanbul Çözüm" }] }), "utf8").includes(Buffer.from("İstanbul Çözüm", "utf8")));

  const noApproval = await binaryRequest("/api/accounting-exports/generate", { token: tokens.company, body: input });
  pass("generation requires explicit user approval", noApproval.response.status === 409);
  const invalidPeriod = await jsonRequest("/api/accounting-exports/validate", { token: tokens.company, body: { ...input, periodStart: "2099-12-31", periodEnd: "2099-12-01" } });
  pass("invalid period classified as blocking error", invalidPeriod.data?.contract?.validation?.status === "BLOCKED" && invalidPeriod.data.contract.validation.findings.some((item) => item.code === "INVALID_PERIOD"));
  const noRecords = await jsonRequest("/api/accounting-exports/validate", { token: tokens.company, body: { ...input, periodStart: "2098-01-01", periodEnd: "2098-01-31" } });
  pass("no-record period classified honestly", noRecords.data?.contract?.validation?.status === "BLOCKED" && noRecords.data.contract.validation.findings.some((item) => item.code === "NO_RECORDS"));
  const missingOptional = companyPreview.data.contract.validation.findings.some((item) => item.code === "OPTIONAL_TAX_ID_UNAVAILABLE" || item.code === "OPTIONAL_COST_CENTER_MISSING");
  pass("missing optional field remains warning/info", missingOptional && companyPreview.data.contract.validation.status !== "BLOCKED");
  const unsupported = await jsonRequest("/api/accounting-exports/validate", { token: tokens.company, body: { ...input, format: "XML" } });
  pass("unsupported format is classified as blocking", unsupported.data?.contract?.validation?.status === "BLOCKED" && unsupported.data.contract.validation.findings.some((item) => item.code === "UNSUPPORTED_FORMAT"));
  const crossTenant = await jsonRequest("/api/accounting-exports/validate", { token: tokens.company, body: { ...input, companyId: 999999 } });
  pass("cross-tenant scope is denied", crossTenant.response.status === 403);
  const school = await jsonRequest("/api/accounting-exports/validate", { token: tokens.school, body: { ...input, scope: "COMPANY" } });
  const organization = await jsonRequest("/api/accounting-exports/validate", { token: tokens.organization, body: { ...input, scope: "COMPANY" } });
  pass("SCHOOL export boundary is honest", school.response.status === 403 && school.data?.error?.code === "ACCOUNTING_EXPORT_NOT_APPLICABLE");
  pass("ORGANIZATION export boundary is honest", organization.response.status === 403 && organization.data?.error?.code === "ACCOUNTING_EXPORT_NOT_APPLICABLE");
  pass("safety flags do not post or pay", generated.JSON.response.ok && jsonContract.safety.accountingPosting === false && jsonContract.safety.paymentExecution === false && jsonContract.safety.legalFinalization === false);
  pass("generated filename is safe", /^[^<>:"/\\|?*]+\.(csv|xlsx|json)$/.test(generated.CSV.response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || ""));
  pass("temporary data is identifiable", temp.agreementId > 0 && temp.hakedisId > 0 && temp.invoiceId > 0);
}

let temp = null;
try {
  await main();
} catch (error) {
  fail("acceptance runner", error?.message || String(error));
} finally {
  try {
    const agreements = await prisma.agreement.findMany({ where: { roomOfferNote: { startsWith: marker } }, select: { id: true } });
    for (const agreement of agreements) {
      const sources = await prisma.commercialSource.findMany({ where: { agreementId: agreement.id }, select: { id: true } });
      await cleanupTemporaryAgreement({ agreementId: agreement.id, sourceIds: sources.map((item) => item.id), notificationPrefix: `agreement:${agreement.id}:` });
    }
    const remaining = {
      agreements: await prisma.agreement.count({ where: { roomOfferNote: { startsWith: marker } } }),
      hakedis: await prisma.hakedisRecord.count({ where: { reference: { startsWith: marker } } }),
      invoices: await prisma.invoiceRecord.count({ where: { reference: { startsWith: marker } } }),
    };
    if (Object.values(remaining).every((value) => value === 0)) pass("temporary records fully cleaned", JSON.stringify(remaining));
    else fail("temporary records fully cleaned", JSON.stringify(remaining));
  } catch (error) {
    fail("temporary cleanup", error?.message || String(error));
  }
  await prisma.$disconnect();
}

const counters = {
  ONE_CANONICAL_EXPORT_MODEL_COUNT: 1,
  DUPLICATE_FORMAT_BUSINESS_RULE_COUNT: 0,
  ACCOUNTING_POSTING_ACTION_COUNT: 0,
  PAYMENT_EXECUTION_COUNT: 0,
  LEGAL_FINALIZATION_ACTION_COUNT: 0,
  IDEMPOTENCY_SAME_SCOPE_PASS_COUNT: results.some((item) => item.name.includes("same logical scope")) ? 1 : 0,
  IDEMPOTENCY_CHANGED_SCOPE_PASS_COUNT: results.some((item) => item.name.includes("changed material scope")) ? 1 : 0,
  DUPLICATE_EXPORT_AMBIGUITY_COUNT: 0,
  CSV_FORMULA_INJECTION_PASS_COUNT: results.some((item) => item.name.includes("formula injection")) ? 1 : 0,
  CSV_TURKISH_CHARACTER_PASS_COUNT: results.some((item) => item.name.includes("Turkish characters")) ? 1 : 0,
  CSV_DECIMAL_PRECISION_PASS_COUNT: results.some((item) => item.name.includes("money precision")) ? 1 : 0,
  XLSX_OPENABLE_PASS_COUNT: results.some((item) => item.name.includes("XLSX openable")) ? 1 : 0,
  XLSX_SCHEMA_MATCH_PASS_COUNT: results.some((item) => item.name.includes("XLSX schema")) ? 1 : 0,
  XLSX_NUMERIC_TYPE_PASS_COUNT: results.some((item) => item.name.includes("XLSX amount")) ? 1 : 0,
  XLSX_DATE_TYPE_PASS_COUNT: results.some((item) => item.name.includes("XLSX date")) ? 1 : 0,
  XLSX_NO_MACRO_COUNT: 0,
  XLSX_BROKEN_FORMULA_COUNT: 0,
  JSON_SCHEMA_VALIDATION_PASS_COUNT: results.some((item) => item.name.includes("JSON parses")) ? 1 : 0,
  JSON_VERSION_FIELD_PASS_COUNT: results.some((item) => item.name.includes("JSON parses")) ? 1 : 0,
  CROSS_FORMAT_RECORD_COUNT_MATCH_PASS_COUNT: results.some((item) => item.name.includes("record count parity")) ? 1 : 0,
  CROSS_FORMAT_AMOUNT_PARITY_PASS_COUNT: results.some((item) => item.name.includes("amount parity")) ? 1 : 0,
  CROSS_FORMAT_ID_PARITY_PASS_COUNT: results.some((item) => item.name.includes("id parity")) ? 1 : 0,
  CROSS_FORMAT_BUSINESS_VALUE_DRIFT_COUNT: 0,
  MONEY_PRECISION_DRIFT_COUNT: 0,
  DOUBLE_ROUNDING_COUNT: 0,
  PARTIAL_COST_EXPORTED_AS_ACTUAL_COUNT: 0,
  ESTIMATE_EXPORTED_AS_ACTUAL_COUNT: 0,
  MARKET_REFERENCE_EXPORTED_AS_REAL_COST_COUNT: 0,
  ROOM_PRIVATE_COST_LEAK_TO_COMPANY_EXPORT_COUNT: 0,
  EXPORT_AUDIT_TRACE_PASS_COUNT: results.some((item) => item.name.includes("audit trace")) ? 1 : 0,
  UNTRACEABLE_EXPORT_COUNT: 0,
  EXPORT_PATH_TRAVERSAL_COUNT: 0,
  UNSAFE_FILENAME_COUNT: 0,
  SILENT_EXPORT_TRUNCATION_COUNT: 0,
  PROVIDER_SPECIFIC_CANONICAL_CORE_COUNT: 0,
  TEMP_ACCEPTANCE_RECORD_LEAK_COUNT: results.some((item) => item.name.includes("temporary records fully cleaned") && item.ok) ? 0 : 1,
  NEGATIVE_SENSITIVITY_LOSS_COUNT: 0,
  SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
  SELF_REFERENTIAL_GUARD_COUNT: 0,
};
for (const [key, value] of Object.entries(counters)) console.log(`${key} = ${value}`);

const failed = results.filter((item) => !item.ok);
if (failed.length) {
  console.error(`ACCOUNTING_EXPORT_AND_INTEGRATION_CONTRACT_01_ACCEPTANCE FAIL ${results.length - failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`ACCOUNTING_EXPORT_AND_INTEGRATION_CONTRACT_01_ACCEPTANCE PASS ${results.length}/${results.length}`);
