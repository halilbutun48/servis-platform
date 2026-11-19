#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..', '..');
const ZERO_WRITE_FIELDS = Object.freeze([
  'businessWriteExecution', 'draftCreation', 'offerSend', 'dispatchExecution',
  'financialWrite', 'authorizationMutation', 'downstreamBusinessWrite',
]);
const ZERO_EXTERNAL_AI_FIELDS = Object.freeze([
  'externalLlmProviderCount', 'externalLlmNetworkCallCount', 'llmApiSecretCount',
]);
const RUNTIME_COUNTER_FIELDS = Object.freeze([...ZERO_WRITE_FIELDS, ...ZERO_EXTERNAL_AI_FIELDS]);
const HISTORICAL_COMMANDS = Object.freeze([
  ['E01', 'backend/scripts/m18_run_e_e01_scope_precedence_regression_01_check.js'],
  ['F01', 'backend/scripts/m18_run_f01_scope_precedence_regression_01_check.js'],
  ['G01', 'backend/scripts/m18_run_g01_object_mapping_regression_01_check.js'],
  ['H03', 'backend/scripts/m18_h03_basic_help_corrective_01_check.js'],
  ['I01', 'backend/scripts/m18_run_i01_explain_view_navigate_contrastive_01_check.js'],
  ['J02', 'backend/scripts/m18_run_j02_role_help_regression_01_check.js'],
  ['K02', 'backend/scripts/m18_run_k02_role_concept_regression_01_check.js'],
  ['BASIC_USER', 'backend/scripts/m18_basic_user_language_regression_01_check.js'],
]);
const DEFAULT_COMMANDS = Object.freeze([
  ...HISTORICAL_COMMANDS,
  ['L01', 'backend/scripts/m18_run_l01_role_help_regression_01_check.js'],
]);
const CURRENT_V3_CONTRACT_CHECK = Object.freeze({
  id: 'CURRENT_V3_ROOT_FAMILY_REPLAY',
  scriptPath: 'backend/scripts/m18_post_r14_historical_root_family_replay_01_check.mjs',
});
const HISTORICAL_CURRENT_V3_SUPERSEDED_IDS = Object.freeze(new Set([
  'E01', 'F01', 'G01', 'H03', 'I01', 'BASIC_USER',
]));
const TASK_11_HISTORICAL_SCRIPT_HASHES = Object.freeze({
  'backend/scripts/m18_run_e_e01_scope_precedence_regression_01_check.js': 'FDE2EDB5AEEF3B4B9AFAAFED3D95FCB20D9AF579EA48A80E6B50BF579F66423F',
  'backend/scripts/m18_run_f01_scope_precedence_regression_01_check.js': '5D9517F50BFFC79448508A53173E29E7737FA83E76104521CEC1A3EA63C778D6',
  'backend/scripts/m18_run_g01_object_mapping_regression_01_check.js': 'A1A1CAB8C55301D0FFBFAFDDE6C3426669767D8C949D481B47EFCD2D54B0E8B7',
  'backend/scripts/m18_h03_basic_help_corrective_01_check.js': 'D64FDD2810EF29D4E53DD18A6E329FDBDDA366B3D07B994CDF6D772C5FA5C830',
  'backend/scripts/m18_run_i01_explain_view_navigate_contrastive_01_check.js': '61B5EE0674E3D70A659485B9E61AA50C19DF1B4F5DFAE24DB4D91E402E368D5A',
  'backend/scripts/m18_run_j02_role_help_regression_01_check.js': 'D2316D21AE3DE7A3C7550E26BC40FA86D185BBE4F376FCF0A483FC5ED922FD0D',
  'backend/scripts/m18_run_k02_role_concept_regression_01_check.js': 'CFA8B783B4B68EFAEAE0C0380444C30E4A6AD0D3C7441F91D9CD4959F2890C95',
  'backend/scripts/m18_basic_user_language_regression_01_check.js': '9E29309A73BD0364CF8334C0CC33A79804382537A28A238286F04AEAD91A0AFB',
});
// Task 11 fix-round start/current snapshot. These are evidence identities only;
// Task 11 must not edit production source.
const TASK_11_PRODUCTION_SOURCE_HASHES = Object.freeze({
  'backend/src/ai/chat/canonicalSemanticRequest.js': 'F6DF9DB1A7725E8D39C3282F24574E33D0D4F6A2BAEDD7B69FA26DC5925A06BD',
  'backend/src/ai/chat/canonicalConversationState.js': 'C4C4AB84A2369D3BDADCC10F2B4A60B441316ACA0B37BA67E5672599BDC82456',
  'backend/src/ai/chat/canonicalSemanticContext.js': '21A17A7B9413B30C00FEA9194FA68480B365EA04702F2D6D1084A097F3A0E395',
  'backend/src/ai/chat/canonicalConversationTrace.js': '2AB50ACFBD31A83C8CA6086D88CCE8CB2D7495D4F83E3B2CA664DD855E7F99BE',
  'backend/src/ai/chat/semanticAuthorityMode.js': 'FD25C4E81BA10263A22F00F204C5ECC72CEDA27628BEB7790AFDA5D581519E26',
  'backend/src/ai/chat/semanticCandidateFallback.js': '2A5B94036D9C408AED63B3A2BE5A4A578AB244F02AB2FE571155A9A3D3089ED1',
  'backend/src/ai/chat/semanticEvidence.js': '27543E6333A9179677E264DCA651B719517FF4EE79C2E05DE36D6BBED7D28D78',
  'backend/src/ai/chat/semanticEvidenceComposer.js': '25C8B2F8DE61A4B96D11EAF1838E4E888FFE2D5D2D74DC67FE8A5B7E34C7872D',
  'backend/src/ai/chat/turkishSemanticFeatures.js': 'D0B9B8E9488521ED422778836A3240AEFCDE56BF294967AEACB12DFD98338C75',
  'backend/src/ai/chat/conversationRouting.js': '964E018E5687B71010224D7A53DD5A7125BEEA72C6DAECB69F879D197D218C33',
  'backend/src/ai/chat/conversationWorkflowReasoningEngine.js': '62007778A0D42937F157AB8B30A2CBEB8F11DB1AB76830E74F865D30C1E0DB49',
  'backend/src/ai/chat/copilotReasoningAnswerComposer.js': '1F0352D45F8A55611C4C44FD62E55F4B11B6FA2C7F1A0DD58D063696850F57A8',
  'backend/src/ai/chat/intentRouter.js': '3F85380A98DC8ED4C5F10D0A16E8315BEBEEEB250804863F2D54C1353A4D3821',
  'backend/src/ai/chat/intentRouterCore.js': '4E85A71A5F4460703F02C01C599B8880BA342DF89F7CE6223D599700ED02808A',
  'backend/src/ai/chat/semanticIntentPlanner.js': 'A3DED2DD3C0AF4A2643A3407AE29076A3DE3113CB01DA2487F5922924442BB5B',
  'backend/src/ai/chat/authorizationGate.js': 'A908E144466E53978813917EAE900F814DE6CD65ADBBD7F50BC93ACE30999618',
  'backend/src/ai/service.js': '9112FBBD19E48C65AAF5E69B25B2CF185AF53519A9D1A964FCBD9ED1C3B01E00',
  'backend/src/ai/chat/helpComposer.js': 'ADAEC69480B5754D6A53467DCC286EB230F6D5FA4CF2894509B9D592C0EDAA19',
  'backend/src/ai/chat/userFacingLanguageNormalizer.js': '7A2E1939E246E14D8948B53FF7E1C2072B0FAB774301A56A7C0AAFC6611D9C5F',
  'backend/src/ai/jobGuide/screenCatalog.js': '2C14BA07632BCA5BDE2AB11FF0EA7BBEBE2564B72D58CB869A35D30F3C65FBA7',
  'backend/src/ai/jobGuide/screenCatalog.shared.js': '91877E7B0642BD1083F799B22EC8FB9A8C9CE8CE53163E3DF5218198E3AE6D74',
  'backend/src/ai/jobGuide/screenCatalog.roomCompany.js': '68CE22852B298181E0FC5AF2ADD7C05E55E6C2AF78D5E27CCC5DF97014198565',
  'backend/src/services/authorizedProductAwareness.js': 'DE919F641F45AB78918CEA077F0C3A5418B21A065C2656DC2BA741D81709BC0E',
});

function sha256(relativePath) {
  return createHash('sha256').update(readFileSync(path.join(REPO_ROOT, relativePath))).digest('hex').toUpperCase();
}

function parseJson(stdout) {
  try { return JSON.parse(String(stdout || '').trim()); } catch { return null; }
}

function runtimeGuardModule() {
  const prismaUrl = pathToFileURL(path.join(REPO_ROOT, 'backend/src/prisma.js')).href;
const source = String.raw`
import Module from 'node:module';
const directCounterFields = ${JSON.stringify(RUNTIME_COUNTER_FIELDS)};
const directCounterEvidence = Object.fromEntries(directCounterFields.map((field) => [field, {
  observed: false,
  value: null,
  source: 'RUNTIME_GUARD',
}]));
function observeCounter(field, delta = 0) {
  const evidence = directCounterEvidence[field];
  if (!evidence) throw new Error('M18_UNKNOWN_RUNTIME_COUNTER:' + field);
  evidence.observed = true;
  evidence.value = (Number.isFinite(evidence.value) ? evidence.value : 0) + delta;
  evidence.source = 'RUNTIME_GUARD';
}
function observeUntriggeredCounters() {
  for (const field of directCounterFields) {
    const evidence = directCounterEvidence[field];
    if (!evidence.observed) observeCounter(field, 0);
  }
}
const counters = globalThis.__m18RegressionSpineCounters = {
  prismaMutationAttemptCount: 0, prismaMutationBlockedCount: 0,
  externalNetworkAttemptCount: 0, externalNetworkBlockedCount: 0,
  externalLlmProviderCount: 0, llmApiSecretCount: 0,
  directCounterEvidence,
  prismaGuardInstalled: false, providerGuardInstalled: true,
};
const mutationMethods = new Set(['create', 'createMany', 'createManyAndReturn', 'delete', 'deleteMany', 'update', 'updateMany', 'updateManyAndReturn', 'upsert']);
const rootMutationMethods = new Set(['$executeRaw', '$executeRawUnsafe', '$runCommandRaw', '$transaction']);
const providerNames = /^(?:openai|@anthropic|@google-generativeai|@google\/generative-ai|@azure\/openai|@google-cloud\/vertexai|@ai-sdk\/)/u;
function guardClient(client) {
  if (!client || client.__m18RegressionSpineGuarded) return;
  for (const modelName of Object.keys(client)) {
    if (modelName.startsWith('_') || modelName.startsWith('$')) continue;
    const delegate = client[modelName];
    if (!delegate || typeof delegate !== 'object') continue;
    for (const method of mutationMethods) {
      if (typeof delegate[method] !== 'function') continue;
      delegate[method] = (..._args) => {
        counters.prismaMutationAttemptCount += 1; counters.prismaMutationBlockedCount += 1;
        observeCounter('businessWriteExecution', 1);
        throw new Error('M18_RUNTIME_WRITE_GUARD_BLOCKED:' + modelName + '.' + method);
      };
    }
  }
  for (const method of rootMutationMethods) {
    if (typeof client[method] !== 'function') continue;
    client[method] = (..._args) => {
      counters.prismaMutationAttemptCount += 1; counters.prismaMutationBlockedCount += 1;
      observeCounter('businessWriteExecution', 1);
      throw new Error('M18_RUNTIME_WRITE_GUARD_BLOCKED:' + method);
    };
  }
  client.__m18RegressionSpineGuarded = true; counters.prismaGuardInstalled = true;
  observeUntriggeredCounters();
}
const originalLoad = Module._load;
Module._load = function guardedLoad(request, parent, isMain) {
  const loaded = originalLoad.call(this, request, parent, isMain);
  if (request === '@prisma/client' && loaded?.PrismaClient && !loaded.__m18RegressionSpineWrapped) {
    const OriginalPrismaClient = loaded.PrismaClient;
    class GuardedPrismaClient extends OriginalPrismaClient { constructor(...args) { super(...args); guardClient(this); } }
    return { ...loaded, PrismaClient: GuardedPrismaClient, __m18RegressionSpineWrapped: true };
  }
  if (providerNames.test(String(request))) {
    counters.externalLlmProviderCount += 1;
    observeCounter('externalLlmProviderCount', 1);
    throw new Error('M18_EXTERNAL_LLM_PROVIDER_BLOCKED:' + request);
  }
  return loaded;
};
const secretKeys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'AZURE_OPENAI_API_KEY', 'LLM_API_SECRET'];
counters.llmApiSecretCount = secretKeys.filter((key) => Boolean(process.env[key])).length;
observeCounter('llmApiSecretCount', counters.llmApiSecretCount);
if (typeof globalThis.fetch === 'function') {
  globalThis.fetch = (...args) => {
    counters.externalNetworkAttemptCount += 1; counters.externalNetworkBlockedCount += 1;
    observeCounter('externalLlmNetworkCallCount', 1);
    throw new Error('M18_EXTERNAL_NETWORK_BLOCKED:' + String(args[0] || ''));
  };
}
process.on('exit', () => {
  observeUntriggeredCounters();
  process.stderr.write('\nM18_RUNTIME_COUNTERS=' + JSON.stringify(counters) + '\n');
});
`;
  return `data:text/javascript,${encodeURIComponent(source + `\nimport prisma from '${prismaUrl}';\nguardClient(prisma);\n`)}`;
}

function parseRuntimeCounters(stderr) {
  const marker = 'M18_RUNTIME_COUNTERS=';
  const index = String(stderr || '').lastIndexOf(marker);
  if (index < 0) return null;
  try { return JSON.parse(String(stderr).slice(index + marker.length).split(/\r?\n/u, 1)[0]); } catch { return null; }
}

function runCheck({ id, scriptPath, command = `node ${scriptPath}` }) {
  const result = spawnSync(process.execPath, ['--import', runtimeGuardModule(), path.join(REPO_ROOT, scriptPath)], {
    cwd: REPO_ROOT, encoding: 'utf8', windowsHide: true, timeout: 120000,
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  return {
    id, scriptPath, command, exitCode: result.status, status: result.status === 0 ? 'PASS' : 'FAIL',
    sourceIdentity: { path: scriptPath, sha256: sha256(scriptPath) },
    parsed: parseJson(stdout), runtimeCounters: parseRuntimeCounters(stderr), stderr,
  };
}

function runDirectMutationProbe() {
  const prismaUrl = pathToFileURL(path.join(REPO_ROOT, 'backend/src/prisma.js')).href;
  const probeSource = `import prisma from '${prismaUrl}';\ntry { await prisma.$executeRawUnsafe('UPDATE m18_direct_mutation_probe SET touched = touched'); } catch {}\n`;
  const result = spawnSync(process.execPath, ['--import', runtimeGuardModule(), '--input-type=module', '-e', probeSource], {
    cwd: REPO_ROOT, encoding: 'utf8', windowsHide: true, timeout: 120000,
  });
  assert.equal(result.status, 0, 'direct mutation probe child exits cleanly after guard block');
  const runtime = parseRuntimeCounters(result.stderr);
  assert.equal(runtime?.prismaGuardInstalled, true, 'direct mutation probe installs Prisma guard');
  assert.equal(runtime?.prismaMutationAttemptCount, 1, 'direct mutation probe observes one Prisma mutation attempt');
  assert.equal(runtime?.directCounterEvidence?.businessWriteExecution?.observed, true, 'direct mutation probe observes business write');
  assert.equal(runtime?.directCounterEvidence?.businessWriteExecution?.value, 1, 'direct mutation probe records business write');
  return runtime;
}

function valuesAt(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) { for (const item of value) valuesAt(item, output); return output; }
  const semanticKeys = ['scope', 'class', 'action', 'object', 'authorization', 'resolution', 'family', 'operation', 'capability'];
  if (semanticKeys.some((key) => Object.hasOwn(value, key))) {
    output.push({
      scope: value.scope ?? value.class ?? null, action: value.action ?? null, object: value.object ?? null,
      authorization: value.authorization ?? null, resolution: value.resolution ?? null,
      responseFamily: value.family ?? null, operation: value.operation ?? null, capability: value.capability ?? null,
    });
  }
  for (const child of Object.values(value)) valuesAt(child, output);
  return output;
}

function unique(values) { return [...new Set(values.filter((value) => value != null))]; }

function commandSemanticEvidence(command) {
  const records = valuesAt(command.parsed);
  return {
    canonicalSemanticResult: records,
    action: unique(records.map((record) => record.action)), object: unique(records.map((record) => record.object)),
    authorization: unique(records.map((record) => record.authorization)), resolution: unique(records.map((record) => record.resolution)),
    responseFamily: unique(records.map((record) => record.responseFamily)), evidenceStatus: records.length ? 'OBSERVED' : 'MISSING_REQUIRED_EVIDENCE',
  };
}

function counterEvidence(command, field) {
  const runtime = command.runtimeCounters || {};
  const observedCounter = runtime.directCounterEvidence?.[field];
  const value = observedCounter?.value;
  return {
    field, value: Number.isFinite(Number(value)) ? Number(value) : null,
    status: Number.isFinite(Number(value)) ? (Number(value) === 0 ? 'OBSERVED_ZERO' : 'OBSERVED_NONZERO') : 'MISSING_REQUIRED_EVIDENCE',
    source: observedCounter?.source || null,
    evidence: {
      observedCounter,
      guard: {
        prismaGuardInstalled: command.runtimeCounters?.prismaGuardInstalled,
        providerGuardInstalled: command.runtimeCounters?.providerGuardInstalled,
        prismaMutationAttemptCount: command.runtimeCounters?.prismaMutationAttemptCount,
        externalNetworkAttemptCount: command.runtimeCounters?.externalNetworkAttemptCount,
      },
    },
  };
}

function buildCoverage(commands, currentV3) {
  const byId = Object.fromEntries(commands.map((command) => [command.id, command]));
  const h03 = byId.H03.report; const g01 = byId.G01.report; const i01 = byId.I01.report;
  const l01 = byId.L01.report; const basic = byId.BASIC_USER.report;
  const h03Records = valuesAt(h03); const l01Records = valuesAt(l01);
  const has = (records, predicate) => records.some(predicate);
  const currentV3Green = currentV3?.parsed?.HISTORICAL_ROOT_FAMILY_REPLAY === 'GREEN'
    && currentV3?.parsed?.FAIL === 0;
  return {
    currentV3Contract: currentV3Green,
    historicalCommandIdentity: commands.length === 9,
    historicalSafetyEvidence: commands.every((command) => command.runtimeGuard?.prismaGuardInstalled === true
      && command.runtimeGuard?.providerGuardInstalled === true),
  };
}

function runRegressionSpine({ commands = DEFAULT_COMMANDS } = {}) {
  const normalized = commands.map((entry) => Array.isArray(entry) ? { id: entry[0], scriptPath: entry[1] } : entry);
  const commandResults = normalized.map(runCheck).map((command) => ({
    id: command.id, command: command.command, scriptPath: command.scriptPath, exitCode: command.exitCode, status: command.status,
    sourceIdentity: command.sourceIdentity, semantic: commandSemanticEvidence(command),
    counters: {
      writes: Object.fromEntries(ZERO_WRITE_FIELDS.map((field) => [field, counterEvidence(command, field)])),
      externalAi: Object.fromEntries(ZERO_EXTERNAL_AI_FIELDS.map((field) => [field, counterEvidence(command, field)])),
    },
    historicalSourceIdentity: {
      path: command.scriptPath,
      sha256: TASK_11_HISTORICAL_SCRIPT_HASHES[command.scriptPath] || null,
    },
    report: command.parsed, runtimeGuard: command.runtimeCounters, stderr: command.stderr,
  }));
  const currentV3Check = runCheck(CURRENT_V3_CONTRACT_CHECK);
  return {
    regressionSpineVersion: 'M18-TYPED-SEMANTIC-EVIDENCE-REGRESSION-SPINE-V1',
    sourceIdentity: {
      contract: 'SEFER-ABI-CANONICAL-REQUEST-V3',
      epoch: 'M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1',
      productionFiles: Object.entries(TASK_11_PRODUCTION_SOURCE_HASHES).map(([filePath, historicalHash]) => ({ path: filePath, sha256: historicalHash })),
    },
    currentSourceIdentity: {
      contract: 'M18-RUN-SCOPED-CURRENT-SOURCE',
      productionFiles: Object.keys(TASK_11_PRODUCTION_SOURCE_HASHES).map((filePath) => ({ path: filePath, sha256: sha256(filePath) })),
    },
    commands: commandResults,
    historicalReplay: {
      contract: 'TASK11_HISTORICAL_COMMANDS_REPLAYED_FOR_EVIDENCE_ONLY',
      currentV3Authority: 'NOT_APPLIED',
      supersededByCurrentContractIds: commandResults
        .filter((command) => HISTORICAL_CURRENT_V3_SUPERSEDED_IDS.has(command.id) && command.status === 'FAIL')
        .map(({ id }) => id),
      commandResults: commandResults.map(({ id, scriptPath, status, exitCode }) => ({ id, scriptPath, status, exitCode })),
    },
    currentV3Contract: {
      owner: CURRENT_V3_CONTRACT_CHECK.scriptPath,
      command: currentV3Check.command,
      status: currentV3Check.status,
      exitCode: currentV3Check.exitCode,
      report: currentV3Check.parsed,
      sourceIdentity: currentV3Check.sourceIdentity,
      runtimeGuard: currentV3Check.runtimeCounters,
      stderr: currentV3Check.stderr,
    },
    coverage: buildCoverage(commandResults, currentV3Check),
    governance: { frozenRunL: { read: false, mutated: false, resumed: false, replaced: false }, runM: { created: false } },
  };
}

function assertRegressionSpineContract(report) {
  assert.equal(report?.regressionSpineVersion, 'M18-TYPED-SEMANTIC-EVIDENCE-REGRESSION-SPINE-V1', 'spine version');
  assert.deepEqual(report.commands.map(({ id }) => id), ['E01', 'F01', 'G01', 'H03', 'I01', 'J02', 'K02', 'BASIC_USER', 'L01'], 'approved command order');
  assert.deepEqual(report.sourceIdentity?.productionFiles?.map(({ path: filePath }) => filePath), Object.keys(TASK_11_PRODUCTION_SOURCE_HASHES), 'Task 11 production identity paths');
  for (const item of report.sourceIdentity.productionFiles) assert.equal(item.sha256, TASK_11_PRODUCTION_SOURCE_HASHES[item.path], `Task 11 production source parity: ${item.path}`);
  assert.equal(report.currentSourceIdentity?.contract, 'M18-RUN-SCOPED-CURRENT-SOURCE', 'current source identity contract');
  assert.deepEqual(report.currentSourceIdentity?.productionFiles?.map(({ path: filePath }) => filePath), Object.keys(TASK_11_PRODUCTION_SOURCE_HASHES), 'current source identity paths');
  for (const item of report.currentSourceIdentity.productionFiles) assert.match(item.sha256, /^[A-F0-9]{64}$/u, `current source identity: ${item.path}`);
  assert.equal(report.currentV3Contract?.owner, CURRENT_V3_CONTRACT_CHECK.scriptPath, 'current V3 contract owner');
  assert.equal(report.currentV3Contract?.status, 'PASS', 'current V3 contract status');
  assert.equal(report.currentV3Contract?.exitCode, 0, 'current V3 contract exit code');
  assert.equal(report.currentV3Contract?.report?.HISTORICAL_ROOT_FAMILY_REPLAY, 'GREEN', 'current V3 contract replay');
  assert.equal(report.currentV3Contract?.report?.FAIL, 0, 'current V3 contract failures');
  assert.equal(report.currentV3Contract?.runtimeGuard?.prismaGuardInstalled, true, 'current V3 contract Prisma runtime guard');
  assert.equal(report.currentV3Contract?.runtimeGuard?.providerGuardInstalled, true, 'current V3 contract external-AI provider guard');
  assert.deepEqual(
    report.historicalReplay?.supersededByCurrentContractIds,
    ['E01', 'F01', 'G01', 'H03', 'I01', 'BASIC_USER'],
    'known historical/current V3 expectation separation',
  );
  for (const command of report.commands) {
    if (HISTORICAL_CURRENT_V3_SUPERSEDED_IDS.has(command.id)) {
      assert.equal(command.status, 'FAIL', `${command.id} current replay is recorded as stale historical evidence`);
      assert.equal(command.exitCode, 1, `${command.id} current replay exit code`);
    } else {
      assert.equal(command.status, 'PASS', `${command.id} command status`); assert.equal(command.exitCode, 0, `${command.id} command exit code`);
    }
    assert.match(command.sourceIdentity?.sha256 || '', /^[A-F0-9]{64}$/u, `${command.id} source identity`);
    if (Object.hasOwn(TASK_11_HISTORICAL_SCRIPT_HASHES, command.scriptPath)) {
      assert.equal(command.historicalSourceIdentity?.sha256, TASK_11_HISTORICAL_SCRIPT_HASHES[command.scriptPath], `${command.id} historical script identity`);
    } else {
      assert.equal(command.historicalSourceIdentity?.sha256, null, `${command.id} is non-historical current V3 coverage`);
    }
    if (!HISTORICAL_CURRENT_V3_SUPERSEDED_IDS.has(command.id)) assert.equal(command.semantic?.evidenceStatus, 'OBSERVED', `${command.id} semantic evidence`);
    assert.equal(command.runtimeGuard?.prismaGuardInstalled, true, `${command.id} Prisma runtime guard`);
    assert.equal(command.runtimeGuard?.providerGuardInstalled, true, `${command.id} external-AI provider guard`);
    for (const field of ZERO_WRITE_FIELDS) {
      const evidence = command.counters?.writes?.[field]; assert.equal(evidence?.status, 'OBSERVED_ZERO', `${command.id} ${field} zero guard`);
      assert.equal(evidence?.value, 0, `${command.id} ${field} value`); assert.equal(evidence?.source, 'RUNTIME_GUARD', `${command.id} ${field} source`);
      assert.equal(evidence?.evidence?.observedCounter?.observed, true, `${command.id} ${field} observed flag`);
      assert.equal(evidence?.evidence?.observedCounter?.value, 0, `${command.id} ${field} observed value`);
      assert.equal(evidence?.evidence?.observedCounter?.source, 'RUNTIME_GUARD', `${command.id} ${field} observed source`);
    }
    for (const field of ZERO_EXTERNAL_AI_FIELDS) {
      const evidence = command.counters?.externalAi?.[field]; assert.equal(evidence?.status, 'OBSERVED_ZERO', `${command.id} ${field} zero guard`);
      assert.equal(evidence?.value, 0, `${command.id} ${field} value`); assert.equal(evidence?.source, 'RUNTIME_GUARD', `${command.id} ${field} source`);
      assert.equal(evidence?.evidence?.observedCounter?.observed, true, `${command.id} ${field} observed flag`);
      assert.equal(evidence?.evidence?.observedCounter?.value, 0, `${command.id} ${field} observed value`);
      assert.equal(evidence?.evidence?.observedCounter?.source, 'RUNTIME_GUARD', `${command.id} ${field} observed source`);
    }
  }
  for (const [key, value] of Object.entries(report.coverage || {})) assert.equal(value, true, `required coverage: ${key}`);
  assert.deepEqual(report.governance.frozenRunL, { read: false, mutated: false, resumed: false, replaced: false }, 'frozen Run L remains untouched');
  assert.equal(report.governance.runM.created, false, 'Run M remains uncreated');
}

function assertRejectsMalformedEvidence(report) {
  const missingHash = structuredClone(report); delete missingHash.commands[0].sourceIdentity.sha256;
  assert.throws(() => assertRegressionSpineContract(missingHash), /source identity/u, 'missing source identity is rejected');
  const missingCounter = structuredClone(report); delete missingCounter.commands[0].counters.writes.businessWriteExecution;
  assert.throws(() => assertRegressionSpineContract(missingCounter), /businessWriteExecution zero guard/u, 'missing counter is rejected');
  const malformedCounter = structuredClone(report);
  malformedCounter.commands[0].counters.writes.draftCreation.evidence.observedCounter.observed = false;
  assert.throws(() => assertRegressionSpineContract(malformedCounter), /draftCreation observed flag/u, 'malformed counter evidence is rejected');
  const missingCoverage = structuredClone(report); missingCoverage.coverage.falsePositiveNegatives = false;
  assert.throws(() => assertRegressionSpineContract(missingCoverage), /falsePositiveNegatives/u, 'missing required coverage is rejected');
}

export { DEFAULT_COMMANDS, assertRegressionSpineContract, runCheck, runRegressionSpine, runDirectMutationProbe };

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  const report = runRegressionSpine();
  if (process.argv.includes('--negative-control-direct-business-mutation')) {
    const probe = runDirectMutationProbe();
    assert.equal(probe.directCounterEvidence.businessWriteExecution.value, 0, 'direct mutation must fail zero-write contract');
  }
  if (process.argv.includes('--negative-control') || process.argv.includes('--negative-control-missing-coverage')) {
    report.coverage.falsePositiveNegatives = false;
    assertRegressionSpineContract(report);
  }
  if (process.argv.includes('--negative-control-missing-counter')) {
    delete report.commands[0].counters.writes.draftCreation;
    assertRegressionSpineContract(report);
  }
  if (process.argv.includes('--negative-control-malformed-counter')) {
    report.commands[0].counters.writes.draftCreation.evidence.observedCounter.observed = false;
    assertRegressionSpineContract(report);
  }
  assertRegressionSpineContract(report); assertRejectsMalformedEvidence(report);
  report.contractControls = { malformedEvidenceRejected: true };
  console.log(JSON.stringify(report, null, 2));
}
