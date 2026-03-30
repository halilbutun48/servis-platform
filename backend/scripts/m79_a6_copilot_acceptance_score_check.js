import { scoreGoldenQuestionPack } from '../src/ai/chat/qualityScorer.js';

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }

console.log('=== M79 A6 COPILOT ACCEPTANCE SCORE CHECK ===');
const report = scoreGoldenQuestionPack();
if (report.totalCases >= 18) ok('golden pack expanded coverage'); else fail('golden pack expanded coverage');
if (report.overall.score >= 0.78) ok(`overall score ${report.overall.score}`); else fail(`overall score ${report.overall.score}`);
for (const role of ['ROOM','COMPANY','SCHOOL','ORGANIZATION','SUPER_ADMIN','DRIVER','PERSONEL','PARENT']) {
  const row = report.byRole[role];
  if (row && row.score >= 0.7) ok(`${role} score ${row.score}`); else fail(`${role} score ${row ? row.score : 'missing'}`);
}
if ((report.byType.NEXT_SCREEN?.score || 0) >= 0.75) ok(`NEXT_SCREEN score ${report.byType.NEXT_SCREEN.score}`); else fail(`NEXT_SCREEN score ${report.byType.NEXT_SCREEN?.score || 0}`);
if ((report.byType.STATUS_HELP?.score || 0) >= 0.72) ok(`STATUS_HELP score ${report.byType.STATUS_HELP.score}`); else fail(`STATUS_HELP score ${report.byType.STATUS_HELP?.score || 0}`);
if ((report.byType.WHY_BLOCKED?.score || 0) >= 0.72) ok(`WHY_BLOCKED score ${report.byType.WHY_BLOCKED.score}`); else fail(`WHY_BLOCKED score ${report.byType.WHY_BLOCKED?.score || 0}`);
if ((report.weakestCases || []).length >= 3) ok('weakest cases reported'); else fail('weakest cases reported');
if (!process.exitCode) console.log('PASS M79 A6 copilot acceptance score check');
