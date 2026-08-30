import { deflateRawSync } from "node:zlib";
import { ACCOUNTING_EXPORT_COLUMNS } from "./accountingExportContract.js";

const XML_ESCAPE = /[&<>"']/g;

function xmlEscape(value) {
  return String(value ?? "").replace(XML_ESCAPE, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
}

export function sanitizeSpreadsheetText(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function cellValue(record, column, contract) {
  if (column === "exportId") return contract.exportId;
  if (column === "contractVersion") return contract.contractVersion;
  if (column === "periodStart") return contract.period.periodStart;
  if (column === "periodEnd") return contract.period.periodEnd;
  if (column === "scope") return contract.tenant.scope;
  if (column === "provenance") return JSON.stringify(record.provenance);
  return record[column] ?? "";
}

function isNumericColumn(column) {
  return new Set(["companyId", "roomId", "agreementId", "sourceEntityId", "amountMinor"]).has(column);
}

function isDateColumn(column) {
  return column === "periodStart" || column === "periodEnd";
}

export function flattenAccountingExportRecord(record, contract) {
  return Object.fromEntries(ACCOUNTING_EXPORT_COLUMNS.map((column) => [column, cellValue(record, column, contract)]));
}

function csvCell(value, { spreadsheetText = false } = {}) {
  const normalized = spreadsheetText ? sanitizeSpreadsheetText(value) : String(value ?? "");
  return /[",\r\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

export function serializeAccountingExportCsv(contract) {
  const rows = [ACCOUNTING_EXPORT_COLUMNS.join(",")];
  for (const record of contract.records || []) {
    const flat = flattenAccountingExportRecord(record, contract);
    rows.push(ACCOUNTING_EXPORT_COLUMNS.map((column) => csvCell(flat[column], { spreadsheetText: !isNumericColumn(column) })).join(","));
  }
  return `\ufeff${rows.join("\r\n")}\r\n`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const out = Buffer.alloc(2);
  out.writeUInt16LE(value, 0);
  return out;
}

function u32(value) {
  const out = Buffer.alloc(4);
  out.writeUInt32LE(value >>> 0, 0);
  return out;
}

function zipEntries(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const compressed = deflateRawSync(raw, { level: 6 });
    const header = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0), u32(crc32(raw)), u32(compressed.length), u32(raw.length), u16(name.length), u16(0), name,
    ]);
    localParts.push(header, compressed);
    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0), u32(crc32(raw)), u32(compressed.length), u32(raw.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]);
    centralParts.push(central);
    offset += header.length + compressed.length;
  }
  const central = Buffer.concat(centralParts);
  const locals = Buffer.concat(localParts);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(central.length), u32(locals.length), u16(0)]);
  return Buffer.concat([locals, central, end]);
}

function excelColumn(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function excelSerial(ymdValue) {
  const date = new Date(`${ymdValue}T00:00:00.000Z`);
  return (date.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
}

function inlineStringCell(address, value) {
  return `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(sanitizeSpreadsheetText(value))}</t></is></c>`;
}

function numericCell(address, value, style = "") {
  return `<c r="${address}"${style ? ` s="${style}"` : ""}><v>${Number(value)}</v></c>`;
}

function buildWorksheet(contract) {
  const rows = [];
  rows.push(`<row r="1">${ACCOUNTING_EXPORT_COLUMNS.map((column, index) => inlineStringCell(`${excelColumn(index)}1`, column)).join("")}</row>`);
  for (const [recordIndex, record] of (contract.records || []).entries()) {
    const flat = flattenAccountingExportRecord(record, contract);
    const rowNumber = recordIndex + 2;
    const cells = ACCOUNTING_EXPORT_COLUMNS.map((column, index) => {
      const address = `${excelColumn(index)}${rowNumber}`;
      const value = flat[column];
      if (isDateColumn(column) && value) return numericCell(address, excelSerial(value), "1");
      if (isNumericColumn(column) && value !== "" && value !== null) return numericCell(address, value);
      return inlineStringCell(address, value);
    });
    rows.push(`<row r="${rowNumber}">${cells.join("")}</row>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${rows.join("")}</sheetData><autoFilter ref="A1:${excelColumn(ACCOUNTING_EXPORT_COLUMNS.length - 1)}${Math.max(1, (contract.records || []).length + 1)}"/></worksheet>`;
}

export function serializeAccountingExportXlsx(contract) {
  const entries = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dışa Aktarım" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", data: buildWorksheet(contract) },
  ];
  return zipEntries(entries);
}

export function serializeAccountingExportJson(contract) {
  return `${JSON.stringify(contract, null, 2)}\n`;
}

export function formatContentType(format) {
  if (format === "CSV") return "text/csv; charset=utf-8";
  if (format === "XLSX") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/json; charset=utf-8";
}

export function formatExtension(format) {
  return format === "XLSX" ? "xlsx" : format.toLowerCase();
}

export function safeExportFilename(contract, format) {
  const period = String(contract?.period?.periodStart || "donem").slice(0, 7).replace(/[^0-9-]/g, "");
  const scope = String(contract?.tenant?.scope || "scope").toLowerCase().replace(/[^a-z0-9_-]/gi, "-");
  const id = String(contract?.tenant?.tenantId || "0").replace(/[^0-9]/g, "") || "0";
  return `seferpakt_muhasebe_aktarim_${period}_${scope}-${id}.${formatExtension(format)}`;
}

export function serializeAccountingExport(contract, format) {
  if (format === "CSV") return Buffer.from(serializeAccountingExportCsv(contract), "utf8");
  if (format === "XLSX") return serializeAccountingExportXlsx(contract);
  return Buffer.from(serializeAccountingExportJson(contract), "utf8");
}
