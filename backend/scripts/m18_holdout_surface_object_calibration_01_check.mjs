import { readFileSync } from 'node:fs';
import {
  loadContractPacket,
  validateOracleAxes,
} from './lib/m18HoldoutGovernance.mjs';

const packetPath = 'D:/servis-platform/.superpowers/sdd/2026-10-01-m18-typed-semantic-evidence-implementation-plan/m18-holdout-contract-packet-v2.json';
const packet = loadContractPacket(readFileSync(packetPath));

const screen = Object.freeze({
  id: 2101,
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
});

function caseFor({
  text,
  scope = 'PRODUCT_EXPLICIT',
  object = 'SURFACE',
  reference = 'ABSENT',
  operation = 'EXPLAIN_CURRENT_SURFACE',
  mustReject = false,
}) {
  return {
    ROLE: 'COMPANY',
    TURN_1: text,
    TURN_2: null,
    TURN_3: null,
    EXPECTED_SEMANTIC_SCOPE: scope,
    EXPECTED_OBJECT: object,
    EXPECTED_REFERENCE_CLASS: reference,
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: operation,
    EXECUTION_CONTEXT: {
      source: 'AUTHORIZED_PRODUCT_CATALOG',
      role: 'COMPANY',
      tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' },
      screen,
      selectedEntity: null,
    },
    mustReject,
  };
}

const cases = [
  caseFor({ text: 'Planlama Merkezi ekranının nasıl çalıştığını anlatır mısın?' }),
  caseFor({ text: 'Planlama Merkezi ekranının ana kullanımını açıklar mısın?' }),
  caseFor({ text: 'Planlama Merkezi alanında hangi işleri izlemeliyim?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi içinde bugün hangi işler var?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi ekranında hangi görevleri takip edebilirim?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi içinde hangi kayıtları karşılaştırmalıyım?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi alanında hangi bilgileri kontrol etmeliyim?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi ekranında hangi tarihleri kontrol etmeliyim?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi içinde bugünkü işleri karşılaştırır mısın?', operation: 'COMPARE_AUTHORIZED_RECORDS', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi alanında bugün neyi takip etmeliyim?', mustReject: true }),
  caseFor({ text: 'Bu ekran nasıl çalışıyor?', scope: 'PRODUCT_CONTEXTUAL', reference: 'VALID_CONTEXTUAL_REFERENCE' }),
  caseFor({ text: 'Planlama Merkezi ekranındaki bu bölümü açıklar mısın?', reference: 'VALID_CONTEXTUAL_REFERENCE' }),
  caseFor({ text: 'Planlama Merkezi ekranındaki bu bölümü açıklar mısın?', reference: 'VALID_CONTEXTUAL_REFERENCE' }),
  caseFor({ text: 'Planlama Merkezi ekranına geçer misin?', operation: 'NAVIGATE_AUTHORIZED_SURFACE' }),
  caseFor({ text: 'Planlama Merkezi ekranına geçip bugünkü işleri gösterir misin?', operation: 'NAVIGATE_AUTHORIZED_SURFACE' }),
  caseFor({ text: 'Planlama Merkezi alanında seçili kaydın durumunu anlatır mısın?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi alanında hangi işleri izlemeliyim?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi sayfasında hangi görevleri gözden geçirmeliyim?', mustReject: true }),
  caseFor({ text: 'Planlama Merkezi hakkında genel bilgi verir misin?', object: null, operation: 'GENERAL_INFORMATION' }),
  caseFor({ text: 'Planlama Merkezi sayfasında bugün hangi görevleri izlemeliyim?', mustReject: true }),
];

const failures = [];
for (const [index, testCase] of cases.entries()) {
  const result = validateOracleAxes(testCase, packet);
  const rejected = !result.safe;
  if (testCase.mustReject !== rejected) {
    failures.push({ index: index + 1, expectedReject: testCase.mustReject, actualReject: rejected, reasons: result.failureReasons });
  }
}

const report = {
  status: failures.length === 0 ? 'GREEN' : 'RED',
  testCount: cases.length,
  relevantRedFailureCount: failures.length,
  relevantRedProven: failures.length > 0,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
