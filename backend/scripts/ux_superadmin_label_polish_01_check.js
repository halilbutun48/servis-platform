import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
}

function main() {
  console.log('=== UX-SUPERADMIN-LABEL-POLISH-01 CHECK ===');

  const superAdminPanel = read('web/src/panels/superadmin/SuperAdminPanel.jsx');
  const auditLogsPanel = read('web/src/panels/superadmin/AuditLogsPanel.jsx');
  const logExportPanel = read('web/src/panels/superadmin/LogExportPanel.jsx');
  const sharedLogsPanel = read('web/src/panels/shared/LogsPanel.jsx');
  const regionsPanel = read('web/src/panels/superadmin/RegionsPanel.jsx');
  const navDock = read('web/src/layout/NavDock.jsx');
  const screenRegistry = read('web/src/copilot/screenRegistry.js');
  const screenCatalog = read('backend/src/ai/jobGuide/screenCatalog.js');
  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');

  const combined = [
    superAdminPanel,
    auditLogsPanel,
    logExportPanel,
    sharedLogsPanel,
    regionsPanel,
    navDock,
    screenRegistry,
    screenCatalog,
    pkg,
    runner,
  ].join('\n');

  must(superAdminPanel, 'Güven ve Kalite', 'superadmin quick access label localized');
  mustNot(superAdminPanel, 'Güven + Kalite', 'legacy Güven + Kalite label removed');

  must(auditLogsPanel, 'İşlem Kayıtları', 'audit logs title localized');
  mustNot(auditLogsPanel, 'Audit Logs', 'legacy audit logs title removed');

  must(logExportPanel, 'Log Dışa Aktarımı', 'superadmin log export title localized');
  mustNot(logExportPanel, 'SuperAdmin Log Export', 'legacy superadmin log export title removed');

  must(sharedLogsPanel, 'Log Dışa Aktarımı', 'shared logs title localized');
  mustNot(sharedLogsPanel, 'Log Export', 'legacy shared logs title removed');

  must(regionsPanel, 'İller ve Bölgeler', 'regions panel title localized');
  mustNot(regionsPanel, 'İller (Region)', 'legacy region title removed');

  must(navDock, 'Ticari, Kalite ve Uyum', 'superadmin nav group localized');
  must(navDock, 'İller ve Bölgeler', 'regions nav label localized');
  must(navDock, 'Log Dışa Aktarımı', 'log export nav label localized');
  mustNot(navDock, 'Standart ve Sistem', 'legacy nav group label removed');
  mustNot(navDock, 'label: "Bölgeler", path: "/superadmin/regions"', 'legacy short region nav label removed');

  must(screenRegistry, '{ id: 9002, path: "/shared/logs", label: "Log Dışa Aktarımı" }', 'screen registry shared logs label localized');
  must(screenRegistry, '{ id: 6105, path: "/superadmin/regions", label: "İller ve Bölgeler" }', 'screen registry region label localized');
  must(screenRegistry, '{ id: 6116, path: "/superadmin/natural-copilot", label: "Doğal Copilot" }', 'screen registry natural copilot label localized');
  mustNot(screenRegistry, 'label: "Log Export"', 'legacy registry log export label removed');
  mustNot(screenRegistry, 'label: "Natural Copilot"', 'legacy registry natural copilot label removed');
  mustNot(screenRegistry, '{ id: 6105, path: "/superadmin/regions", label: "Bölgeler" }', 'legacy registry regions label removed');

  must(screenCatalog, "screen(6101, '/superadmin', 'Genel Bakış'", 'screen catalog overview localized');
  must(screenCatalog, "screen(6102, '/superadmin/companies', 'Şirketler'", 'screen catalog companies localized');
  must(screenCatalog, "screen(6105, '/superadmin/rooms', 'Operasyon Odaları'", 'screen catalog rooms localized');
  must(screenCatalog, "screen(6106, '/superadmin/users', 'Kullanıcılar'", 'screen catalog users localized');
  must(screenCatalog, "screen(6103, '/superadmin/audit', 'İşlem Kayıtları'", 'screen catalog audit localized');
  must(screenCatalog, "screen(6114, '/superadmin/regions', 'İller ve Bölgeler'", 'screen catalog regions localized');
  must(screenCatalog, "screen(6115, '/superadmin/logexport', 'Log Dışa Aktarımı'", 'screen catalog log export localized');
  must(screenCatalog, "screen(6116, '/superadmin/natural-copilot', 'Doğal Copilot'", 'screen catalog natural copilot localized');
  must(screenCatalog, "screen(6104, '/superadmin/copilot', 'Sefer Abi Terminali'", 'screen catalog copilot localized');
  must(screenCatalog, "label: 'Şirketler', path: '/superadmin/companies'", 'screen catalog menu label companies localized');
  must(screenCatalog, "label: 'Operasyon Odaları', path: '/superadmin/rooms'", 'screen catalog menu label rooms localized');
  must(screenCatalog, "label: 'Kullanıcılar', path: '/superadmin/users'", 'screen catalog menu label users localized');
  must(screenCatalog, "label: 'Log Dışa Aktarımı', path: '/superadmin/logexport'", 'screen catalog menu label log export localized');
  must(screenCatalog, "label: 'Sefer Abi Terminali', path: '/superadmin/copilot'", 'screen catalog menu label copilot localized');
  mustNot(screenCatalog, "screen(6101, '/superadmin', 'Overview'", 'legacy overview label removed from screen catalog');
  mustNot(screenCatalog, "screen(6102, '/superadmin/companies', 'Companies'", 'legacy companies label removed from screen catalog');
  mustNot(screenCatalog, "screen(6105, '/superadmin/rooms', 'Rooms'", 'legacy rooms label removed from screen catalog');
  mustNot(screenCatalog, "screen(6106, '/superadmin/users', 'Users'", 'legacy users label removed from screen catalog');
  mustNot(screenCatalog, "screen(6103, '/superadmin/audit', 'Audit'", 'legacy audit label removed from screen catalog');
  mustNot(screenCatalog, "screen(6114, '/superadmin/regions', 'Bölgeler'", 'legacy regions label removed from screen catalog');
  mustNot(screenCatalog, "screen(9002, '/shared/logs', 'Loglar'", 'legacy shared logs label removed from screen catalog');

  must(pkg, '"check:uxsuperadminlabelpolish01"', 'package.json exposes label polish check');
  must(runner, 'check:uxsuperadminlabelpolish01', 'product extensions runner includes label polish check');

  mustNot(combined, 'runtime-data', 'label polish scope does not touch runtime-data wording');
  mustNot(combined, 'prisma', 'label polish scope does not touch prisma wording');
  mustNot(combined, 'migration', 'label polish scope does not touch migration wording');

  console.log('=== UX-SUPERADMIN-LABEL-POLISH-01 CHECK PASS ===');
}

main();
