import { adaptGuideContent, normalizeGuideLevel } from './levels.js';
import { getJobGuideDefinition } from './registry.js';
import { buildJobPrecheck } from './precheck.js';
import { buildQuickActions, buildIfStuck } from './quickActions.js';
import { buildCopyOutputs } from './copyOutputs.js';

export function buildJobGuideResponse({ jobType, guideLevel, context, entityType, entityId, user }) {
  const def = getJobGuideDefinition(jobType);
  if (!def) {
    const e = new Error('UNSUPPORTED_JOB_TYPE');
    e.status = 400;
    e.code = 'UNSUPPORTED_JOB_TYPE';
    throw e;
  }
  if (String(def.entityType) !== String(entityType)) {
    const e = new Error('JOB_TYPE_ENTITY_MISMATCH');
    e.status = 400;
    e.code = 'JOB_TYPE_ENTITY_MISMATCH';
    throw e;
  }
  const level = normalizeGuideLevel(guideLevel);
  const raw = def.builder(context);
  const precheck = buildJobPrecheck({ jobType, context, user });
  const quickActions = buildQuickActions({ jobType, context, user });
  const ifStuck = buildIfStuck({ jobType, context, user });
  const copyOutputs = buildCopyOutputs({ jobType, context, precheck });
  const guided = adaptGuideContent(level, {
    ...raw,
    ...precheck,
    quickActions,
    ifStuck,
    copyOutputs,
  });
  return {
    ok: true,
    provider: 'local-job-guide',
    mode: 'JOB_GUIDE',
    copilotVersion: 'M46.6-B',
    generatedAt: new Date().toISOString(),
    intent: 'JOB_GUIDE',
    intentLabel: 'İş Rehberi',
    entityType,
    entityId: Number(entityId),
    jobType,
    guideLevel: level,
    scope: {
      role: String(user?.role || ''),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
    },
    summary: guided.plainSummary || guided.jobPurpose || guided.jobTitle,
    ...guided,
  };
}

// M46.6-B repo contract markers: beforeYouStart | canProceed | whyBlocked | lockedActionReasons | quickActions | ifStuck | copyOutputs

