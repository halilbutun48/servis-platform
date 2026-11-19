import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const webBaseUrl = (process.env.WEB_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const screenshotRoot = path.resolve('backend/artifacts/browser-smoke/m18-corrective');
// The authenticated copilot endpoint uses the normal write limiter. The
// acceptance exercises many semantic turns for one user, so pace requests
// instead of manufacturing a 429 that would be mistaken for a product fail.
const copilotRequestSpacingMs = Math.max(0, Number(process.env.M18_COPILOT_REQUEST_SPACING_MS || 1150));
const focusedVisualOnly = process.env.M18_FOCUSED_VISUAL_TARGET === '1';
const focusedMobileOcclusionOnly = process.env.M18_FOCUSED_MOBILE_OCCLUSION === '1';
const focusedWorkflowStateOnly = process.env.M18_FOCUSED_WORKFLOW_STATE === '1';
const focusedCreateShiftKnowledgeOnly = process.env.M18_FOCUSED_CREATE_SHIFT_KNOWLEDGE === '1';
let lastCopilotRequestAt = 0;
const report = {
  source: 'REAL_PLAYWRIGHT_GUIDED_TARGET_ACCEPTANCE',
  webBaseUrl,
  viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 1024, height: 900 }, { name: 'mobile', width: 390, height: 844 }],
  states: [],
  counters: {
    guidedTargetFound: 0,
    nonexistentUiGuidanceCount: 0,
    staleHighlightCount: 0,
    unauthorizedGuidanceCount: 0,
    criticalActionExecutionCount: 0,
    fakeNavigationSuccessCount: 0,
    clippingCount: 0,
    horizontalOverflowCount: 0,
    wrongVisualTargetAnchor: 0,
    targetExplanationMismatch: 0,
    detachedCallout: 0,
    staleBlockHighlight: 0,
    calloutTargetObstruction: 0,
    fabricatedSemanticBlock: 0,
    unresolvedSemanticBlockCount: 0,
    legacyLabelFallbackCount: 0,
    exactDomTargetBindingFailure: 0,
    targetVisibilityPreconditionFailure: 0,
    recoveryPreconditionSkipped: 0,
    falsePass: 0,
    businessWriteExecuted: 0,
    targetVisibleOutsideCopilotOcclusion: 0,
    guidedTargetVisibilityObstruction: 0,
    mobileCopilotDrawerObstruction: 0,
    activeTaskLost: 0,
    wrongWorkflowOrder: 0,
    preconditionSkipped: 0,
    currentUiStateMismatch: 0,
    falseWorkflowAdvancement: 0,
    userErrorWrongRecovery: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
  },
};

function fail(message) {
  throw new Error(`FAIL ${message}`);
}

async function captureCorrectiveScreenshot(page, name) {
  await mkdir(screenshotRoot, { recursive: true });
  const safeName = String(name).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  const screenshotPath = path.join(screenshotRoot, `${safeName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  return screenshotPath;
}

async function ensureLoggedIn(page) {
  // Use the current seeded operational surface that exposes a real
  // "Detayları göster" control; the agreements screen may legitimately be
  // empty in a fresh runtime and must then produce NOT_FOUND.
  await page.goto(`${webBaseUrl}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
  const identifier = page.locator('input[autocomplete="username"]');
  if (await identifier.count()) {
    await identifier.fill('company@demo.com');
    await page.locator('input[autocomplete="current-password"]').fill('demo123');
    await page.getByRole('button', { name: 'Giriş yap' }).click();
  }
  await page.waitForURL(/#\/(?:company(?:\/agreements|\/shifts)?)/, { timeout: 15000 });
  if (!page.url().includes('/company/shifts')) {
    await page.goto(`${webBaseUrl}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForSelector('text=Operasyon menüsü', { state: 'attached', timeout: 15000 });
  // Wait for the seeded operational records so the acceptance asks against a
  // real disclosure target rather than racing the initial data fetch.
  await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
}

async function startFreshAuthenticatedSession(page) {
  // Independent acceptance families must not inherit the previous family's
  // auth-scoped conversation state.  Re-login through the real UI so the
  // server receives a new authentication/session scope; no product state is
  // cleared by the harness and no business data is written.
  await page.goto(`${webBaseUrl}/#/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ensureLoggedIn(page);
}

async function askForTarget(page, prompt) {
  const launcher = page.getByRole('button', { name: /Sefer Abi’ye Sor/i }).first();
  if (await launcher.count()) await launcher.click();
  const composer = page.locator('.copilotDrawer textarea').last();
  await composer.waitFor({ state: 'visible', timeout: 10000 });
  const spacing = Math.max(0, copilotRequestSpacingMs - (Date.now() - lastCopilotRequestAt));
  if (spacing > 0) await page.waitForTimeout(spacing);
  lastCopilotRequestAt = Date.now();
  const priorAssistantCount = await page.locator('.copilotMsg.assistant').count();
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST',
    { timeout: 30000 },
  );
  await composer.fill(prompt);
  await composer.press('Enter');
  const response = await responsePromise;
  const payload = await response.json().catch(() => ({}));
  if (process.env.M18_TRACE_BROWSER_REQUESTS === '1') {
    let requestBody = null;
    try {
      requestBody = response.request().postDataJSON();
    } catch {
      requestBody = response.request().postData() || null;
    }
    const summarizeContext = (context) => context ? {
      lastScreenPath: context.lastScreenPath,
      lastScreenLabel: context.lastScreenLabel,
      selectedEntityType: context.selectedEntityType,
      selectedEntityId: context.selectedEntityId,
      selectedLabel: context.selectedLabel,
      recentMessages: Array.isArray(context.recentMessages) ? context.recentMessages.slice(-4) : [],
      uiSurface: context.uiSurface ? {
        currentTarget: context.uiSurface.currentTarget,
        workflowState: context.uiSurface.workflowState,
        visibleButtons: (context.uiSurface.visibleButtons || []).map((button) => ({ label: button.label, targetKey: button.targetKey, identitySource: button.identitySource })),
      } : null,
    } : null;
    console.log(JSON.stringify({
      browserTrace: true,
      url: page.url(),
      prompt,
      request: requestBody ? {
        message: requestBody.message,
        screenContext: requestBody.screenContext ? {
          path: requestBody.screenContext.path,
          label: requestBody.screenContext.label,
          role: requestBody.screenContext.role,
          uiHints: requestBody.screenContext.uiHints ? {
            currentTarget: requestBody.screenContext.uiHints.currentTarget,
            workflowState: requestBody.screenContext.uiHints.workflowState,
            visibleButtons: (requestBody.screenContext.uiHints.visibleButtons || []).map((button) => ({ label: button.label, targetKey: button.targetKey, identitySource: button.identitySource })),
          } : null,
        } : null,
        conversationState: summarizeContext(requestBody.conversationState),
      } : null,
      response: {
        status: response.status(),
        family: payload?.semanticPlan?.family,
        canonicalShapeTaskType: payload?.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.taskType,
        canonicalShapeContinuationAction: payload?.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.continuationAction,
        canonicalShapeLiveWorkflowGrounded: payload?.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.liveWorkflowGrounded,
        canonicalShapeCurrentTargetExplanationIntent: payload?.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.currentTargetExplanationIntent,
        canonicalShapeCurrentTargetRecoveryIntent: payload?.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.currentTargetRecoveryIntent,
        canonicalShapeExplicitUiGuidance: payload?.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.explicitUiGuidance,
        canonicalTypedOrder: payload?.semanticPlan?.canonicalRequestEnvelope?.request?.typedEvidence?.order?.value,
        canonicalTypedRequestMode: payload?.semanticPlan?.canonicalRequestEnvelope?.request?.typedEvidence?.requestMode?.value,
        semanticAuthority: payload?.semanticPlan?.canonicalRequestEnvelope?.diagnostics?.semanticAuthority,
        canonicalRequestOperation: payload?.semanticPlan?.canonicalRequest?.operation,
        canonicalRequestContinuationMode: payload?.semanticPlan?.canonicalRequest?.continuation?.mode,
        workflowIntent: payload?.semanticPlan?.workflowIntent,
        continuationBaseWorkflowIntent: payload?.semanticPlan?.continuationBasePlan?.workflowIntent,
        continuationAction: payload?.semanticPlan?.continuationAction,
        action: payload?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass,
        object: payload?.semanticPlan?.canonicalRequest?.semanticAction?.objectClass,
        operation: payload?.semanticPlan?.operation,
        guidedTarget: payload?.guidedTarget,
        reply: payload?.reply,
      },
    }, null, 2));
  }
  if (response.status() !== 200 || !String(payload?.reply || payload?.summary || '').trim()) {
    fail(`copilot response missing for: ${prompt}`);
  }
  // A route transition can leave earlier history visible.  Acceptance must
  // wait for this request's rendered response instead of treating the prior
  // message as evidence that the current UI consumed the payload.
  await page.locator('.copilotMsg.assistant').nth(priorAssistantCount).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(400);
  return payload;
}

async function lastAssistantReply(page) {
  return page.locator('.copilotMsg.assistant').last().locator('.copilotMsgText').innerText();
}

async function assertCanonicalVisualTarget(page, payload, label) {
  const target = payload?.guidedTarget;
  if (!target || target.status !== 'FOUND') return;
  if (target.identitySource !== 'CANONICAL' && target.targetKind !== 'BLOCK') {
    report.counters.legacyLabelFallbackCount += 1;
    report.counters.falsePass += 1;
    throw new Error(`FAIL covered guided target used legacy label identity: ${label}`);
  }
  // The overlay scrolls the exact target on desktop with smooth behavior.
  // Wait for the scroll and highlight transition to settle before measuring;
  // an intermediate frame is not visual acceptance evidence.
  await page.waitForTimeout(900);
  const result = await page.evaluate((expected) => {
    const identity = String(expected.targetKey || expected.blockKey || expected.semanticId || '').trim();
    const isBlock = String(expected.targetKind || '').toUpperCase() === 'BLOCK' || Boolean(expected.blockKey);
    const nodes = [...document.querySelectorAll(isBlock ? '[data-copilot-block-key],[data-copilot-semantic-id]' : '[data-copilot-target],[data-copilot-semantic-id]')]
      .filter((node) => !node.closest('.copilotDrawer,.copilotFab,.copilotPanel,[data-copilot-ignore="true"]'));
    const node = nodes.find((candidate) => (
      String(candidate.getAttribute(isBlock ? 'data-copilot-block-key' : 'data-copilot-target') || '') === identity
      || String(candidate.getAttribute('data-copilot-semantic-id') || '') === String(expected.semanticId || '')
      || (isBlock && String(candidate.getAttribute('data-copilot-block-key') || '') === String(expected.blockKey || ''))
    ));
    const status = document.querySelector('[role="status"]');
    const statusLabel = String(status?.textContent || '').replace(/^Buraya bak:\s*/iu, '').replace(/\s+/g, ' ').trim();
    const nodeLabel = String(node?.getAttribute('data-copilot-label') || node?.textContent || '').replace(/\s+/g, ' ').trim();
    const highlight = [...document.querySelectorAll('[aria-hidden="true"]')]
      .find((candidate) => String(candidate.style?.zIndex || '') === '2147482998');
    const a = status?.getBoundingClientRect?.();
    const b = node?.getBoundingClientRect?.();
    const h = highlight?.getBoundingClientRect?.();
    const targetInViewport = Boolean(b && b.width > 0 && b.height > 0
      && b.left >= 0 && b.top >= 0 && b.right <= window.innerWidth && b.bottom <= window.innerHeight);
    const targetCenter = b && { x: b.left + (b.width / 2), y: b.top + (b.height / 2) };
    const highlightCenter = h && { x: h.left + (h.width / 2), y: h.top + (h.height / 2) };
    const highlightAttached = Boolean(targetCenter && highlightCenter
      && Math.abs(targetCenter.x - highlightCenter.x) <= 10
      && Math.abs(targetCenter.y - highlightCenter.y) <= 10
      && Math.abs((h.width || 0) - (b?.width || 0)) <= 20
      && Math.abs((h.height || 0) - (b?.height || 0)) <= 20);
    const calloutAttached = Boolean(a && b
      && Math.abs((a.left + (a.width / 2)) - (b.left + (b.width / 2))) <= Math.max(24, b.width / 2)
      && a.bottom <= b.top + 12);
    const targetTopmost = Boolean(targetCenter && (() => {
      const top = document.elementFromPoint(targetCenter.x, targetCenter.y);
      return top === node || node?.contains(top);
    })());
    const detailsOpen = !node?.closest('details') || Boolean(node.closest('details')?.open);
    return {
      found: Boolean(node), statusLabel, nodeLabel,
      labelMatches: !statusLabel || !nodeLabel || statusLabel === nodeLabel || nodeLabel.includes(statusLabel),
      targetInViewport, targetTopmost, detailsOpen, highlightFound: Boolean(highlight),
      highlightAttached, calloutAttached,
      targetRect: b && { left: b.left, top: b.top, right: b.right, bottom: b.bottom },
      highlightRect: h && { left: h.left, top: h.top, right: h.right, bottom: h.bottom },
      statusRect: a && { left: a.left, top: a.top, right: a.right, bottom: a.bottom },
    };
  }, target);
  if (!result.found) {
    report.counters.wrongVisualTargetAnchor += 1;
    report.counters.detachedCallout += 1;
    report.counters.exactDomTargetBindingFailure += 1;
    throw new Error(`FAIL canonical visual target missing: ${label}`);
  }
  if (!result.labelMatches) {
    report.counters.targetExplanationMismatch += 1;
    throw new Error(`FAIL callout/target identity mismatch: ${label}`);
  }
  if (!result.detailsOpen || !result.targetInViewport) {
    report.counters.targetVisibilityPreconditionFailure += 1;
    report.counters.recoveryPreconditionSkipped += result.detailsOpen ? 0 : 1;
    report.counters.wrongVisualTargetAnchor += 1;
    throw new Error(`FAIL canonical target is not visible in the live viewport: ${label} ${JSON.stringify(result)}`);
  }
  if (!result.targetTopmost || !result.highlightFound || !result.highlightAttached || !result.calloutAttached) {
    report.counters.wrongVisualTargetAnchor += 1;
    report.counters.exactDomTargetBindingFailure += 1;
    report.counters.targetExplanationMismatch += result.highlightAttached && result.calloutAttached ? 0 : 1;
    throw new Error(`FAIL canonical target geometry is not attached to the exact DOM target: ${label} ${JSON.stringify(result)}`);
  }
}

async function runMobileOcclusionAcceptance(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
  // The mobile acceptance setup must establish the same real current-surface
  // disclosure used by the desktop flow.  Without this, the product is
  // correct to keep the workflow at PRE_WIZARD, while the harness would
  // incorrectly expect a future live step from a hidden/closed target.
  const workspaceDisclosure = page.getByText('Ayrıntılı çalışma alanını göster', { exact: true }).last();
  await workspaceDisclosure.waitFor({ state: 'visible', timeout: 20000 });
  const workspaceDetails = workspaceDisclosure.locator('xpath=ancestor::details[1]');
  if (await workspaceDetails.count() && !(await workspaceDetails.getAttribute('open'))) {
    await workspaceDisclosure.press('Enter');
  }
  await page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last().waitFor({ state: 'visible', timeout: 15000 });

  const taskStart = await askForTarget(page, 'Vardiya oluşturmak istiyorum');
  assertNoOffTopic(taskStart, 'Vardiya oluşturmak istiyorum');
  assertPreWizardWorkflowResponse(taskStart, 'Vardiya oluşturmak istiyorum');
  if (taskStart?.semanticPlan?.workflowIntent !== 'CREATE_SHIFT'
    || taskStart?.taskState?.activeGoal !== 'CREATE_SHIFT') {
    report.counters.activeTaskLost += 1;
    fail(`mobile occlusion setup did not establish the active CREATE_SHIFT task: ${JSON.stringify({ plan: taskStart?.semanticPlan, taskState: taskStart?.taskState })}`);
  }

  const payload = await askForTarget(page, 'Rehberi başlatamıyorum');
  assertNoOffTopic(payload, 'Rehberi başlatamıyorum');
  assertPreWizardWorkflowResponse(payload, 'Rehberi başlatamıyorum');
  if (payload?.guidedTarget?.status !== 'FOUND') fail('mobile recovery did not resolve a canonical target');
  if (String(payload?.guidedTarget?.targetKey || '') !== 'company:guided-plan-start') {
    fail(`mobile recovery resolved an unexpected target: ${payload?.guidedTarget?.targetKey || 'NONE'}`);
  }
  if (payload?.taskState?.activeGoal && payload.taskState.activeGoal !== 'CREATE_SHIFT') {
    report.counters.activeTaskLost += 1;
    fail(`mobile recovery lost the active CREATE_SHIFT task: ${payload.taskState.activeGoal}`);
  }

  await page.waitForTimeout(900);
  const geometry = await page.evaluate((expected) => {
    const rectOf = (node) => {
      const rect = node?.getBoundingClientRect?.();
      return rect && { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const identity = String(expected.targetKey || expected.blockKey || expected.semanticId || '').trim();
    const target = [...document.querySelectorAll('[data-copilot-target],[data-copilot-block-key],[data-copilot-semantic-id]')]
      .filter((node) => !node.closest('.copilotDrawer,.copilotFab,.copilotPanel,[data-copilot-ignore="true"]'))
      .find((node) => String(node.getAttribute('data-copilot-target') || node.getAttribute('data-copilot-block-key') || node.getAttribute('data-copilot-semantic-id') || '').trim() === identity);
    const drawer = document.querySelector('.copilotDrawer');
    const callout = document.querySelector('[role="status"]');
    const highlight = [...document.querySelectorAll('[aria-hidden="true"]')]
      .find((node) => String(node.style?.zIndex || '') === '2147482998');
    const targetRect = rectOf(target);
    const drawerRect = rectOf(drawer);
    const calloutRect = rectOf(callout);
    const highlightRect = rectOf(highlight);
    const visual = window.visualViewport;
    const viewport = visual
      ? { left: visual.offsetLeft, top: visual.offsetTop, right: visual.offsetLeft + visual.width, bottom: visual.offsetTop + visual.height, width: visual.width, height: visual.height, scale: visual.scale }
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight, scale: 1 };
    const targetCenter = targetRect && { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 };
    const topmost = Boolean(targetCenter && (() => {
      const top = document.elementFromPoint(targetCenter.x, targetCenter.y);
      return top === target || target?.contains(top);
    })());
    const safeAreaBottom = Number.parseFloat(window.getComputedStyle(drawer || document.body).paddingBottom || '0') || 0;
    const usableViewportBottom = viewport.bottom - safeAreaBottom;
    const unobstructed = Boolean(targetRect && drawerRect && !intersects(targetRect, drawerRect)
      && (!calloutRect || !intersects(targetRect, calloutRect))
      && targetRect.left >= viewport.left
      && targetRect.right <= viewport.right
      && targetRect.top >= viewport.top
      && targetRect.bottom <= Math.min(usableViewportBottom, drawerRect.top - 8)
      && topmost);
    return {
      identity,
      targetRect,
      drawerRect,
      calloutRect,
      highlightRect,
      viewport,
      safeAreaBottom,
      keyboardLikelyOpen: Boolean(visual && visual.height < window.innerHeight - 80),
      topmost,
      targetDrawerOverlap: intersects(targetRect, drawerRect),
      calloutTargetOverlap: intersects(calloutRect, targetRect),
      calloutDrawerOverlap: intersects(calloutRect, drawerRect),
      unobstructed,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  }, payload.guidedTarget);

  if (!geometry.targetRect || !geometry.highlightRect || !geometry.calloutRect || !geometry.unobstructed) {
    report.counters.targetVisibleOutsideCopilotOcclusion += geometry.unobstructed ? 0 : 1;
    report.counters.guidedTargetVisibilityObstruction += geometry.targetDrawerOverlap || geometry.calloutDrawerOverlap ? 1 : 0;
    report.counters.mobileCopilotDrawerObstruction += geometry.targetDrawerOverlap || geometry.calloutDrawerOverlap ? 1 : 0;
    report.counters.calloutTargetObstruction += geometry.calloutTargetOverlap ? 1 : 0;
    report.counters.falsePass += 1;
    fail(`mobile guided target is not outside copilot occlusion: ${JSON.stringify(geometry)}`);
  }
  if (geometry.horizontalOverflow) {
    report.counters.clippingCount += 1;
    fail(`mobile guided target introduced horizontal overflow: ${JSON.stringify(geometry)}`);
  }
  report.counters.targetVisibleOutsideCopilotOcclusion += 1;
  await captureCorrectiveScreenshot(page, 'company-mobile-guided-target-occlusion');
  report.states.push({ mobileOcclusion: true, targetKey: geometry.identity, geometry });
}

function assertPreWizardWorkflowResponse(payload, label) {
  const plan = payload?.semanticPlan || {};
  if (plan.workflowEntryState !== 'PRE_WIZARD'
    || plan.workflowStepReference
    || Number(plan.workflowStepOrdinal || 0)
    || Number(plan.workflowNextStepReference?.ordinal || 0) !== 1) {
    report.counters.wrongWorkflowOrder += 1;
    report.counters.currentUiStateMismatch += 1;
    report.counters.falseWorkflowAdvancement += 1;
    if (label.includes('başlatamıyorum')) report.counters.userErrorWrongRecovery += 1;
    fail(`pre-wizard response claimed a future current step: ${label} ${JSON.stringify({ plan, reply: payload?.reply })}`);
  }
  if (String(plan.guidedTarget?.targetKey || payload?.guidedTarget?.targetKey || '') !== 'company:guided-plan-start') {
    report.counters.currentUiStateMismatch += 1;
    fail(`pre-wizard response lost the live Rehberi Başlat target: ${label}`);
  }
  if (/^Vardiya oluşturma akışında\s+1\.\s*adım\s*:/iu.test(String(payload?.reply || ''))) {
    report.counters.falseWorkflowAdvancement += 1;
    fail(`pre-wizard response presented Step 1 as current: ${label}`);
  }
}

function assertPreWizardNextState(payload, availability, label) {
  const state = String(availability?.state || 'UNKNOWN').toUpperCase();
  const plan = payload?.semanticPlan || {};
  if (state === 'SAVED_DRAFT_CHOOSER' && Number(availability?.count || 0) > 0) {
    if (plan.workflowNextState !== 'SAVED_DRAFT_CHOOSER' || !/kayıtlı taslak/i.test(String(payload?.reply || ''))) {
      report.counters.wrongWorkflowOrder += 1;
      report.counters.currentUiStateMismatch += 1;
      fail(`existing-draft pre-wizard response ignored the chooser branch: ${label} ${JSON.stringify({ availability, plan, reply: payload?.reply })}`);
    }
    return;
  }
  if (state === 'NEW_PLAN_STEP_1' && Number(availability?.count || 0) === 0 && plan.workflowNextState !== 'NEW_PLAN_STEP_1') {
    report.counters.wrongWorkflowOrder += 1;
    report.counters.currentUiStateMismatch += 1;
    fail(`no-draft pre-wizard response did not expose the new-plan branch: ${label} ${JSON.stringify({ availability, plan })}`);
  }
}

async function runWorkflowStateAcceptance(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
  const workspaceDisclosure = page.getByText('Ayrıntılı çalışma alanını göster', { exact: true }).last();
  await workspaceDisclosure.waitFor({ state: 'visible', timeout: 20000 });
  const workspaceDetails = workspaceDisclosure.locator('xpath=ancestor::details[1]');
  if (await workspaceDetails.count() && !(await workspaceDetails.getAttribute('open'))) {
    await workspaceDisclosure.click();
  }
  await page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last().waitFor({ state: 'visible', timeout: 15000 });
  const availability = await page.locator('[data-copilot-guided-draft-state]').first().evaluate((node) => ({
    state: node.getAttribute('data-copilot-guided-draft-state') || 'UNKNOWN',
    count: Number(node.getAttribute('data-copilot-guided-draft-count') || 0) || 0,
    maxResumeStep: Number(node.getAttribute('data-copilot-guided-draft-max-resume-step') || 0) || null,
  })).catch(() => ({ state: 'UNKNOWN', count: 0, maxResumeStep: null }));
  const start = await askForTarget(page, 'Vardiya oluşturmak istiyorum');
  assertNoOffTopic(start, 'Vardiya oluşturmak istiyorum');
  assertPreWizardWorkflowResponse(start, 'Vardiya oluşturmak istiyorum');
  assertPreWizardNextState(start, availability, 'Vardiya oluşturmak istiyorum');
  await captureCorrectiveScreenshot(page, 'company-prewizard-workflow-entry');
  const recovery = await askForTarget(page, 'Rehberi başlatamıyorum');
  assertNoOffTopic(recovery, 'Rehberi başlatamıyorum');
  assertPreWizardWorkflowResponse(recovery, 'Rehberi başlatamıyorum');
  if (!/takıldığını anlıyorum|yeniden dokun|görünür ve etkin/i.test(String(recovery?.reply || ''))) {
    report.counters.userErrorWrongRecovery += 1;
    fail(`pre-wizard recovery did not provide a concrete retry action: ${JSON.stringify(recovery?.reply || '')}`);
  }
  await captureCorrectiveScreenshot(page, 'company-prewizard-workflow-recovery');

  const entryButton = page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last();
  await entryButton.waitFor({ state: 'visible', timeout: 10000 });
  await entryButton.click();
  const modal = page.locator('[role="dialog"] .guidedPlanModalContent');
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  const chooser = page.locator('[data-guided-draft-chooser="true"]');
  const workflowMarker = page.locator('[role="dialog"] .guidedPlanModalContent[data-copilot-workflow-id]').last();
  let liveStep = null;
  let hadChooser = false;
  async function readStableWorkflowStep() {
    let previous = null;
    let stableReads = 0;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const current = await workflowMarker.getAttribute('data-copilot-workflow-step');
      if (current && current === previous) stableReads += 1;
      else stableReads = 0;
      previous = current;
      if (current && stableReads >= 2) return current;
      await page.waitForTimeout(250);
    }
    return previous;
  }
  if (await chooser.count() && await chooser.isVisible().catch(() => false)) {
    hadChooser = true;
    if (await workflowMarker.count()) {
      report.counters.currentUiStateMismatch += 1;
      report.counters.wrongWorkflowOrder += 1;
      fail('saved-draft chooser retained a misleading live workflow step marker');
    }
    const chooserHeading = modal.locator('.guidedPlanModalStepTitle').first();
    const chooserHeadingText = await chooserHeading.textContent().catch(() => '');
    if (!/Kayıtlı taslaklar/i.test(String(chooserHeadingText || ''))) {
      report.counters.currentUiStateMismatch += 1;
      fail(`saved-draft chooser heading is not truthful: ${JSON.stringify(chooserHeadingText)}`);
    }
    // Resuming an existing authorized draft is read-only.  Never choose Yeni
    // plan here because this acceptance must not create a replacement draft.
    const resume = chooser.getByRole('button', { name: 'Devam et', exact: true }).first();
    await resume.waitFor({ state: 'visible', timeout: 10000 });
    await resume.click();
    await chooser.waitFor({ state: 'hidden', timeout: 15000 });
    await workflowMarker.waitFor({ state: 'visible', timeout: 10000 });
    liveStep = await readStableWorkflowStep();
  } else {
    await workflowMarker.waitFor({ state: 'visible', timeout: 10000 });
    liveStep = await readStableWorkflowStep();
  }
  const ordinal = Number(liveStep || 0);
  if (!ordinal) {
    report.counters.currentUiStateMismatch += 1;
    fail('guided modal opened without a live workflow step marker');
  }
  const currentStepPlan = await askForTarget(page, 'bu adımda ne yapacağım');
  assertNoOffTopic(currentStepPlan, 'bu adımda ne yapacağım');
  const currentPlan = currentStepPlan?.semanticPlan || {};
  const currentOrdinal = Number(currentPlan.workflowStepReference?.ordinal || currentPlan.workflowStepOrdinal || 0);
  if (currentOrdinal !== ordinal) {
    report.counters.currentUiStateMismatch += 1;
    fail(`post-transition semantic step does not match live UI: live=${ordinal} semantic=${currentOrdinal}`);
  }
  await captureCorrectiveScreenshot(page, 'company-live-workflow-step-after-entry');
  const deicticResponses = [];
  for (const prompt of ['Burası ne', 'Burda napiyoruz', 'Burası ne işe yarıyor', 'Şu an neredeyim', 'Bu adım ne']) {
    const payload = await askForTarget(page, prompt);
    deicticResponses.push(payload);
    assertNoOffTopic(payload, prompt);
    const semanticPlan = payload?.semanticPlan || {};
    const deicticOrdinal = Number(semanticPlan.workflowStepReference?.ordinal || semanticPlan.workflowStepOrdinal || 0);
    if (semanticPlan.family !== 'EXPLAIN_CURRENT_TARGET' || semanticPlan.workflowIntent !== 'CREATE_SHIFT' || deicticOrdinal !== ordinal) {
      report.counters.currentUiStateMismatch += 1;
      report.counters.falseWorkflowAdvancement += 1;
      fail(`deictic query did not bind to the live Step-${ordinal} surface: ${prompt} ${JSON.stringify({ semanticPlan, reply: payload?.reply })}`);
    }
    if (!/Personel\s*\+\s*Durak|personel|durak|Ekle|Adresten Bul|Excel\/CSV/i.test(String(payload?.reply || ''))) {
      report.counters.currentUiStateMismatch += 1;
      fail(`deictic query did not explain the live Step-${ordinal} surface: ${prompt}`);
    }
    if (/Planlama Merkezi.*(?:genel|ana|ekranı|ekrani)/iu.test(String(payload?.reply || ''))) {
      report.counters.currentUiStateMismatch += 1;
      fail(`deictic query fell back to the broader Planlama Merkezi surface: ${prompt}`);
    }
    await captureCorrectiveScreenshot(page, `company-live-workflow-step-${prompt.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`);
  }
  const firstDeicticOrdinal = Number(deicticResponses[0]?.semanticPlan?.workflowStepReference?.ordinal || 0);
  if (deicticResponses.some((payload) => Number(payload?.semanticPlan?.workflowStepReference?.ordinal || 0) !== firstDeicticOrdinal)) {
    report.counters.currentUiStateMismatch += 1;
    report.counters.falseWorkflowAdvancement += 1;
    fail('deictic variants did not share one live workflow surface');
  }
  report.states.push({ workflowStateAcceptance: true, preWizard: true, postTransitionOrdinal: ordinal, resumedExistingDraft: hadChooser });
}

function assertNoOffTopic(payload, prompt) {
  const route = String(payload?.semanticPlan?.conversationRoute || payload?.conversationRoute || payload?.questionType || '');
  if (/OFF_TOPIC_SAFE|OUT_OF_SCOPE|GENERIC_PRODUCT_HELP/i.test(route)) {
    fail(`canonical product intent fell back to ${route}: ${prompt}`);
  }
}

async function runScreenReferentAcceptance(page) {
  await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
  const staleGuideDialog = page.locator('[role="dialog"] .guidedPlanModalContent');
  if (await staleGuideDialog.count()) {
    const closeDialog = staleGuideDialog.getByRole('button', { name: /Kapat|İptal/i }).first();
    if (await closeDialog.count()) await closeDialog.click();
    await staleGuideDialog.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
  await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
  const payload = await askForTarget(page, 'Nasıl çalışıyor bu?');
  assertNoOffTopic(payload, 'Nasıl çalışıyor bu?');
  if (payload?.semanticPlan?.family !== 'SCREEN_CONTEXT') {
    fail('current-screen referent did not use canonical screen context');
  }
  const reply = await lastAssistantReply(page);
  if (!/Planlama Merkezi|planlama/i.test(reply)) {
    fail('current-screen referent did not produce grounded Planlama Merkezi help');
  }
  await captureCorrectiveScreenshot(page, 'company-current-screen-help');
  report.states.push({ screenReferent: 'Planlama Merkezi', family: payload.semanticPlan.family, grounded: true });
}

async function runWorkflowIntentAcceptance(page, { focusedOnly = false } = {}) {
  // Workflow guidance is grounded in the authorized Planlama Merkezi entry
  // surface.  The surrounding suite separately covers navigation from the
  // shifts list; this owner must not inherit a stale /company/shifts target
  // while asserting the active workflow contract.
  if (!/\/#\/company$/u.test(page.url())) {
    await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
  const workflowDisclosure = page.getByText('Ayrıntılı çalışma alanını göster', { exact: true }).last();
  await workflowDisclosure.waitFor({ state: 'visible', timeout: 20000 });
  const workflowDetails = workflowDisclosure.locator('xpath=ancestor::details[1]');
  if (await workflowDetails.count() && !(await workflowDetails.getAttribute('open'))) {
    await workflowDisclosure.press('Enter');
  }
  await page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last().waitFor({ state: 'visible', timeout: 15000 });
  const workflowMessages = [
    'Ben vardiya oluşturmak istiyorum',
    'Yeni vardiya nereden açılıyor?',
    'Vardiya eklemeyi göster',
    'Beni vardiya oluşturma ekranına götür',
    'Vardiya oluşturma yerini bulamadım',
  ];
  for (const prompt of workflowMessages) {
    const payload = await askForTarget(page, prompt);
    assertNoOffTopic(payload, prompt);
    const semanticPlan = payload?.semanticPlan || {};
    const retainedCreateShift = semanticPlan.workflowIntent === 'CREATE_SHIFT'
      || semanticPlan.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT';
    const isCanonicalWorkflowGuidance = semanticPlan.family === 'UI_GUIDANCE'
      || (['CONTINUE_CURRENT_REASONING', 'EXPLAIN_CURRENT_TARGET'].includes(semanticPlan.family) && retainedCreateShift);
    if (!isCanonicalWorkflowGuidance || !retainedCreateShift) {
      fail(`workflow intent did not retain canonical CREATE_SHIFT meaning: ${prompt}`);
    }
    const reply = await lastAssistantReply(page);
    if (/yetkili kayıtta yok|yetkili güncel kayıtlarda vardiya|kayıt bulunamadı/i.test(reply)) {
      fail(`workflow intent regressed to record lookup: ${prompt}`);
    }
    const groundedWorkflowReply = /Planlama Merkezi|Detayları göster|Şirket konumu|Konumumu al|Adresten bul/i.test(reply);
    if (!groundedWorkflowReply) fail(`workflow intent did not resolve the authorized workflow target: ${prompt}`);
  }
  const routeAction = page.getByRole('button', { name: /Planlama Merkezi ekranına git/i }).last();
  if (await routeAction.count()) {
    await routeAction.click();
    await page.waitForURL(/#\/company$/, { timeout: 15000 });
  } else {
    // Current canonical UI guidance resolves the already-authorized Planlama
    // Merkezi screen to its real in-screen launch control.  A separate route
    // button is not rendered for an already-current screen; accepting that
    // state keeps this browser owner aligned with the current guided-target
    // contract instead of requiring a historical presentation artifact.
    let currentScreenTarget = page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last();
    if (!(await currentScreenTarget.count())) {
      // From /company/shifts the current canonical safe target is the real
      // Planlama Merkezi navigation control.  The old test-only phrase
      // "Planlama Merkezi ekranına git" is no longer rendered.
      const planlamaTarget = page.getByRole('button', { name: 'Planlama Merkezi', exact: true }).last();
      if (await planlamaTarget.count()) {
        await planlamaTarget.click();
        await page.waitForURL(/#\/company$/, { timeout: 15000 });
        const routeDisclosure = page.locator('summary').filter({ hasText: /Ayrıntılı çalışma alanını göster/i }).last();
        await routeDisclosure.waitFor({ state: 'visible', timeout: 20000 });
        const routeDetails = routeDisclosure.locator('xpath=ancestor::details[1]');
        if (await routeDetails.count() && !(await routeDetails.getAttribute('open'))) {
          await routeDisclosure.press('Enter');
        }
        currentScreenTarget = page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last();
      }
    }
    if (!(await currentScreenTarget.count())) {
      const disclosure = page.locator('summary').filter({ hasText: 'Ayrıntılı çalışma alanını göster' }).last();
      if (await disclosure.count()) {
        // The current details disclosure is a native summary control.  Enter
        // is the stable activation path across the headed and headless
        // browser runners; a pointer click can be swallowed by the shell
        // overlay while leaving the details closed.
        await disclosure.press('Enter');
        currentScreenTarget = page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last();
      }
    }
    await currentScreenTarget.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForURL(/#\/company$/, { timeout: 15000 });
  }
  const detailSummary = page.locator('summary').filter({ hasText: /Ayrıntılı çalışma alanını göster/i });
  await detailSummary.waitFor({ state: 'visible', timeout: 15000 });
  const detailsOpen = await detailSummary.evaluate((node) => Boolean(node.parentElement?.open)).catch(() => false);
  if (!detailsOpen) await detailSummary.press('Enter');

  const workflowRecovery = await askForTarget(page, 'Vardiya oluşturma yerini bulamadım');
  assertNoOffTopic(workflowRecovery, 'Vardiya oluşturma yerini bulamadım');
  if (workflowRecovery?.guidedTarget?.status !== 'FOUND') {
    fail(`Bulamadım did not resolve a canonical real target: ${JSON.stringify({
      family: workflowRecovery?.semanticPlan?.family,
      workflowIntent: workflowRecovery?.semanticPlan?.workflowIntent,
      action: workflowRecovery?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass,
      object: workflowRecovery?.semanticPlan?.canonicalRequest?.semanticAction?.objectClass,
      operation: workflowRecovery?.semanticPlan?.canonicalRequest?.operation,
      guidedTarget: workflowRecovery?.guidedTarget,
      reply: workflowRecovery?.reply,
    })}`);
  }
  const firstTarget = page.locator('[role="status"]').filter({ hasText: /Ayrıntılı çalışma alanını göster|Rehberi Başlat/i });
  await firstTarget.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (!(await firstTarget.count())) fail('Bulamadım did not resolve the real current workflow disclosure');
  const recoveryDetailsOpen = await detailSummary.evaluate((node) => Boolean(node.parentElement?.open)).catch(() => false);
  if (!recoveryDetailsOpen) await detailSummary.press('Enter');
  await page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  // A guided modal and the assistant drawer are both real interaction
  // surfaces.  Verify the current target explanation/continuation against
  // the live DOM before exercising the simpler route-bound continuation
  // cases below.
  await page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).click();
  await page.locator('[role="dialog"] .guidedPlanModalContent').waitFor({ state: 'visible', timeout: 10000 });
  // Existing server-backed drafts intentionally open a chooser before the
  // step controls render. Resume the existing draft only; this acceptance
  // must never create a replacement business draft merely to prove an anchor.
  const guidedDraftChooser = page.locator('[data-guided-draft-chooser="true"]');
  if (await guidedDraftChooser.count() && await guidedDraftChooser.isVisible().catch(() => false)) {
    const resumeDraft = guidedDraftChooser.getByRole('button', { name: 'Devam et', exact: true }).first();
    await resumeDraft.waitFor({ state: 'visible', timeout: 10000 });
    await resumeDraft.click();
    await guidedDraftChooser.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.locator('[role="dialog"] .guidedPlanModalContent [data-copilot-target]').first().waitFor({ state: 'visible', timeout: 10000 });
  }
  const liveModalTarget = page.locator('[role="dialog"] .guidedPlanModalContent [data-copilot-target]:visible')
    .filter({ hasNot: page.locator('[data-copilot-target="company:guided-draft-resume"], [data-copilot-target="company:guided-draft-new"], [data-copilot-target="company:guided-draft-discard"]') })
    .first();
  await liveModalTarget.waitFor({ state: 'visible', timeout: 10000 });
  const liveModalTargetLabel = String(await liveModalTarget.innerText().catch(() => '') || '').trim()
    || String(await liveModalTarget.getAttribute('aria-label').catch(() => '') || '').trim();
  const liveModalTargetKey = String(await liveModalTarget.getAttribute('data-copilot-target').catch(() => '') || '').trim();
  if (!liveModalTargetLabel || !liveModalTargetKey) fail('guided modal did not expose a canonical live target for the visual acceptance query');
  const targetQuery = `${liveModalTargetLabel} nerede?`;
  const targetExplanation = await askForTarget(page, targetQuery);
  assertNoOffTopic(targetExplanation, targetQuery);
  if (targetExplanation?.guidedTarget?.status !== 'FOUND') fail('current target explanation did not keep a real target');
  if (String(targetExplanation?.guidedTarget?.targetKey || '') !== liveModalTargetKey) {
    fail(`current target response did not preserve the live canonical target: expected ${liveModalTargetKey}, got ${targetExplanation?.guidedTarget?.targetKey || 'NONE'}`);
  }
  await assertCanonicalVisualTarget(page, targetExplanation, 'company guided current target explanation');
  if (focusedOnly) {
    const screenshotPath = await captureCorrectiveScreenshot(page, 'company-exact-dom-address-next');
    report.states.push({ focusedVisualTarget: true, targetKey: targetExplanation.guidedTarget.targetKey, label: targetExplanation.guidedTarget.label, screenshotPath });
    return;
  }
  const firstSonra = await askForTarget(page, 'sonra');
  const secondSonra = await askForTarget(page, 'sonra');
  if (process.env.M18_TRACE_DLEVEL === '1') console.error(JSON.stringify({ firstSonra, secondSonra }));
  for (const [label, payload] of [['first sonra', firstSonra], ['second sonra', secondSonra]]) {
    assertNoOffTopic(payload, label);
    if (payload?.semanticPlan?.family !== 'CONTINUE_CURRENT_REASONING') fail(`${label} did not preserve the active guided task`);
    if (payload?.semanticPlan?.continuationBasePlan?.workflowIntent !== 'CREATE_SHIFT') fail(`${label} lost CREATE_SHIFT`);
    if (payload?.guidedTarget?.status !== 'FOUND') fail(`${label} did not resolve a real next target`);
  }
  const firstStep = Number(firstSonra?.semanticPlan?.workflowStepReference?.ordinal || 0);
  const secondStep = Number(secondSonra?.semanticPlan?.workflowStepReference?.ordinal || 0);
  const firstBlocked = firstSonra?.semanticPlan?.workflowProgression?.blockedByPrecondition === true;
  const secondBlocked = secondSonra?.semanticPlan?.workflowProgression?.blockedByPrecondition === true;
  if (secondStep > firstStep) {
    // A live UI transition may have completed the prior step between turns.
    // In that case progression is valid only when the canonical plan records
    // the observed completion rather than the turn count itself.
    if (firstBlocked || !firstSonra?.semanticPlan?.workflowCompletionVerified) {
      fail('sonra advanced without verified live step completion');
    }
  } else {
    // If the modal is already on the current step, repeated "sonra" must not
    // invent another step. Repeating the truthful blocked explanation is
    // allowed; the acceptance checks the state boundary, not wording churn.
    if (!secondBlocked || secondStep !== firstStep) {
      fail('repeated sonra did not remain blocked at the incomplete live step');
    }
  }
  const modalGeometry = await page.evaluate(() => {
    const overlap = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const rectOf = (node) => node?.getBoundingClientRect?.() || null;
    const status = document.querySelector('[role="status"]');
    const drawer = document.querySelector('.copilotDrawer');
    const card = document.querySelector('[role="dialog"] .guidedPlanModalContent');
    const statusText = status?.textContent || '';
    const targetLabel = statusText.replace(/^Buraya bak:\s*/i, '').trim();
    const candidates = [...document.querySelectorAll('button,[role="button"],summary,[data-copilot-label]')]
      .filter((node) => !node.closest('.copilotDrawer,.copilotFab'));
    const target = candidates.find((node) => (node.textContent || node.getAttribute('aria-label') || node.getAttribute('data-copilot-label') || '').replace(/\s+/g, ' ').trim() === targetLabel);
    const targetRect = rectOf(target);
    const statusRect = rectOf(status);
    const drawerRect = rectOf(drawer);
    const cardRect = rectOf(card);
    const doc = document.documentElement;
    const body = document.body;
    return {
      targetLabel,
      targetVisible: Boolean(targetRect && targetRect.width > 0 && targetRect.height > 0),
      targetTopmost: Boolean(targetRect && document.elementFromPoint(targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height / 2)?.textContent?.includes(targetLabel)),
      highlightLabelMatchesTarget: Boolean(statusText && targetLabel),
      targetDrawerOverlap: overlap(targetRect, drawerRect),
      drawerModalOverlap: overlap(drawerRect, cardRect),
      targetModalOverlap: overlap(targetRect, cardRect),
      documentOverflow: doc.scrollWidth > doc.clientWidth + 1,
      bodyOverflow: body.scrollWidth > body.clientWidth + 1,
      modalOverflow: Boolean(card && card.scrollWidth > card.clientWidth + 1),
      drawerOverflow: Boolean(drawer && drawer.scrollWidth > drawer.clientWidth + 1),
      targetRect: targetRect && { left: targetRect.left, top: targetRect.top, right: targetRect.right, bottom: targetRect.bottom },
      highlightRect: statusRect && { left: statusRect.left, top: statusRect.top, right: statusRect.right, bottom: statusRect.bottom },
      drawerRect: drawerRect && { left: drawerRect.left, top: drawerRect.top, right: drawerRect.right, bottom: drawerRect.bottom },
      cardRect: cardRect && { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom },
    };
  });
  if (!modalGeometry.targetVisible || !modalGeometry.targetTopmost || !modalGeometry.highlightLabelMatchesTarget) fail(`guided target is not visibly aligned: ${JSON.stringify(modalGeometry)}`);
  if (modalGeometry.targetDrawerOverlap || modalGeometry.drawerModalOverlap || modalGeometry.documentOverflow || modalGeometry.bodyOverflow || modalGeometry.modalOverflow || modalGeometry.drawerOverflow) {
    fail(`guided modal/drawer geometry is unsafe: ${JSON.stringify(modalGeometry)}`);
  }
  await captureCorrectiveScreenshot(page, 'company-guided-modal-drawer-after-sonra');
  report.states.push({ guidedModal: true, targetExplanation: true, repeatedSonra: true, modalGeometry });

  // Reload to close the modal and keep the route-bound continuation cases
  // independent from the modal's local draft state.
  await page.reload({ waitUntil: 'domcontentloaded' });
  const staleGuideDialogAfterModal = page.locator('[role="dialog"] .guidedPlanModalContent');
  if (await staleGuideDialogAfterModal.count()) {
    const closeDialog = staleGuideDialogAfterModal.getByRole('button', { name: /Kapat|İptal/i }).first();
    if (await closeDialog.count()) await closeDialog.click();
    await staleGuideDialogAfterModal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
  await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
  await page.getByText('Ayrıntılı çalışma alanını göster', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  const continuationCases = [
    { prompt: 'Adım adım anlat', action: 'EXPAND' },
    { prompt: 'Bulamadım', action: 'RECOVER' },
    { prompt: 'Devam', action: 'CONTINUE' },
    { prompt: 'Geri', action: 'BACK' },
  ];
  for (const { prompt, action } of continuationCases) {
    const payload = await askForTarget(page, prompt);
    assertNoOffTopic(payload, prompt);
    const continuationFamily = payload?.semanticPlan?.family;
    if (!['CONTINUE_CURRENT_REASONING', 'EXPLAIN_CURRENT_TARGET'].includes(continuationFamily)) {
      fail(`${prompt} did not preserve the active canonical workflow`);
    }
    if (payload?.semanticPlan?.continuationBasePlan?.workflowIntent !== 'CREATE_SHIFT') {
      fail(`${prompt} lost CREATE_SHIFT task state`);
    }
    if (payload?.semanticPlan?.continuationAction !== action) {
      fail(`${prompt} did not resolve canonical continuation action ${action}`);
    }
    if (payload?.guidedTarget?.status !== 'FOUND') fail(`${prompt} did not re-resolve a real UI target`);
  }
  const continuedTarget = page.locator('[role="status"]').filter({ hasText: /Rehberi Başlat/i });
  await continuedTarget.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (!(await continuedTarget.count())) fail('Devam did not re-resolve the real next workflow target');
  const backReply = await lastAssistantReply(page);
  if (/vardiya oluşturuldu|başarıyla oluşturuldu|işlem tamamlandı/i.test(backReply)) fail('Geri falsely claimed business execution');
  await captureCorrectiveScreenshot(page, 'company-guided-task-recovery-continuation-back');
  report.states.push({ workflow: 'CREATE_SHIFT', wrongScreenRecovery: true, adimAdim: true, bulamadim: true, devam: true, geri: true, criticalActionExecution: false });
}

async function runActiveTaskContinuityAcceptance(page) {
  await startFreshAuthenticatedSession(page);
  await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
  const sequence = [
    ['vardiya oluşturmak istiyorum', null],
    ['ne yapacağım', null],
    ['burası ne', null],
    ['tamam', 'CONTINUE'],
    ['sonra ne yapayım', 'NEXT'],
    ['yapamıyorum', 'RECOVER'],
    ['tamam tıkladım sonra', 'NEXT'],
    ['vardiya oluşturacaktık ne oldu', 'CONTINUE'],
    ['nerede kaldık', 'CONTINUE'],
    ['devam edelim', 'CONTINUE'],
    ['geri dön', 'BACK'],
  ];
  let previousDepth = 0;
  for (const [prompt, expectedAction] of sequence) {
    const payload = await askForTarget(page, prompt);
    assertNoOffTopic(payload, prompt);
    const currentSurfaceExplanation = payload?.semanticPlan?.family === 'SCREEN_CONTEXT'
      && payload?.semanticPlan?.canonicalRequest?.operation === 'EXPLAIN_CURRENT_SURFACE';
    if (!currentSurfaceExplanation
      && !['EXPLAIN_CURRENT_TARGET', 'CONTINUE_CURRENT_REASONING', 'UI_GUIDANCE'].includes(payload?.semanticPlan?.family)) {
      fail(`active task left guidance class: ${prompt}`);
    }
    if (currentSurfaceExplanation) {
      if (!/Planlama Merkezi|ekran|planlama/i.test(String(payload?.reply || ''))) {
        fail(`current-surface explanation did not remain grounded in the visible surface: ${prompt}`);
      }
      continue;
    }
    if (prompt !== 'vardiya oluşturmak istiyorum' && payload?.semanticPlan?.workflowIntent !== 'CREATE_SHIFT' && payload?.semanticPlan?.continuationBasePlan?.workflowIntent !== 'CREATE_SHIFT') fail(`active task lost CREATE_SHIFT: ${prompt}`);
    if (/başlangıç\/bitiş saati|durum veya başka alan|mevcut ürün kapsamının dışında/i.test(String(payload?.reply || ''))) fail(`active task fell into unrelated clarification: ${prompt}`);
    if (prompt !== 'vardiya oluşturmak istiyorum' && payload?.guidedTarget?.status !== 'FOUND') fail(`active task lost its current target: ${prompt}`);
    if (expectedAction && payload?.semanticPlan?.continuationAction !== expectedAction) fail(`active task action mismatch for ${prompt}: got ${payload?.semanticPlan?.continuationAction || 'NONE'} family=${payload?.semanticPlan?.family || 'NONE'} route=${payload?.semanticPlan?.conversationRoute || 'NONE'} reply=${String(payload?.reply || '').slice(0, 180)}`);
    if (payload?.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING') {
      const depth = Number(payload.semanticPlan.continuationDepth || 0);
      if (!(depth > previousDepth)) fail(`active task did not advance for ${prompt}`);
      previousDepth = depth;
    }
  }
  if (previousDepth < 7) fail('active task continuity sequence did not record progressive depth');
  await captureCorrectiveScreenshot(page, 'company-active-task-continuity-sequence');
  report.states.push({ activeTaskContinuity: true, sequenceLength: sequence.length, continuationDepth: previousDepth });
}

async function runCreateShiftKnowledgeAcceptance(page) {
  await startFreshAuthenticatedSession(page);
  await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
  const workspaceDisclosure = page.getByText('Ayrıntılı çalışma alanını göster', { exact: true }).last();
  await workspaceDisclosure.waitFor({ state: 'visible', timeout: 20000 });
  const workspaceDetails = workspaceDisclosure.locator('xpath=ancestor::details[1]');
  if (await workspaceDetails.count() && !(await workspaceDetails.getAttribute('open'))) {
    await workspaceDisclosure.press('Enter');
  }
  await page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last().waitFor({ state: 'visible', timeout: 15000 });
  const preWizard = await askForTarget(page, 'vardiya oluşturmak istiyorum');
  assertNoOffTopic(preWizard, 'vardiya oluşturmak istiyorum');
  assertPreWizardWorkflowResponse(preWizard, 'vardiya oluşturmak istiyorum');
  const entryButton = page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last();
  await entryButton.click();
  const modal = page.locator('[role="dialog"]:visible .guidedPlanModalContent:visible').last();
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  const chooser = page.locator('[data-guided-draft-chooser="true"]:visible').last();
  const chooserVisible = await chooser.waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (chooserVisible) {
    const resume = chooser.getByRole('button', { name: 'Devam et', exact: true }).first();
    await resume.waitFor({ state: 'visible', timeout: 10000 });
    await resume.click();
    await chooser.waitFor({ state: 'hidden', timeout: 15000 });
  }
  await page.locator('[role="dialog"] .guidedPlanModalContent[data-copilot-workflow-step]').waitFor({ state: 'visible', timeout: 10000 });
  const sequence = [
    { prompt: 'burası ne', family: 'EXPLAIN_CURRENT_TARGET', step: 1, action: null, shot: 'company-create-shift-step1-explanation' },
    { prompt: '1. adımda napıcam', family: 'EXPLAIN_CURRENT_TARGET', step: 1, action: null, shot: 'company-create-shift-ordinal-step1' },
    { prompt: 'neden bunu yapıyorum', family: 'EXPLAIN_CURRENT_TARGET', step: 1, action: null, shot: 'company-create-shift-step1-why' },
    // A user claim such as "bastım" is not completion evidence. With the
    // real planning surface still showing the entry control, the canonical
    // task must remain on step one and expose a blocked precondition.
    { prompt: 'tamam bastım sonra', family: 'CONTINUE_CURRENT_REASONING', step: 1, action: 'NEXT', requireUnverifiedCompletion: true, shot: 'company-create-shift-step1-continuation' },
    { prompt: 'bastım burası ne', family: 'EXPLAIN_CURRENT_TARGET', step: 1, action: null, shot: 'company-create-shift-step1-fused-explanation' },
    { prompt: 'yapamıyorum', family: 'CONTINUE_CURRENT_REASONING', step: 1, action: 'RECOVER', shot: 'company-create-shift-step1-recovery' },
    { prompt: 'sonra ne yapayım', family: 'CONTINUE_CURRENT_REASONING', step: 1, action: 'NEXT', requireUnverifiedCompletion: true, shot: 'company-create-shift-step1-next' },
    { prompt: '2. adımda ne yapacağım', family: 'EXPLAIN_CURRENT_TARGET', step: 2, action: null, shot: 'company-create-shift-ordinal-step2' },
    { prompt: 'nerede kaldık', family: 'CONTINUE_CURRENT_REASONING', step: 1, action: 'CONTINUE', shot: 'company-create-shift-resume' },
    { prompt: 'geri dön', family: 'CONTINUE_CURRENT_REASONING', step: 1, action: 'BACK', shot: 'company-create-shift-back' },
    { prompt: 'devam edelim', family: 'CONTINUE_CURRENT_REASONING', step: 1, action: 'CONTINUE', shot: 'company-create-shift-continue' },
  ];
  const evidence = [];
  let maxDepth = 0;
  for (const item of sequence) {
    const payload = await askForTarget(page, item.prompt);
    assertNoOffTopic(payload, item.prompt);
    const plan = payload?.semanticPlan || {};
    const allowedFamilies = item.action
      ? [item.family, 'EXPLAIN_CURRENT_TARGET']
      : [item.family];
    if (!allowedFamilies.includes(plan.family)) fail(`create-shift journey semantic class mismatch: ${item.prompt} -> ${plan.family}`);
    if (item.prompt !== 'vardiya oluşturmak istiyorum'
      && plan.workflowIntent !== 'CREATE_SHIFT'
      && plan.continuationBasePlan?.workflowIntent !== 'CREATE_SHIFT') {
      fail(`create-shift journey lost ACTIVE_GOAL: ${item.prompt}`);
    }
    const workflowModel = plan.workflowModel || plan.continuationBasePlan?.workflowModel || payload?.workflowModel;
    const stepReference = plan.workflowStepReference || plan.continuationBasePlan?.workflowStepReference || payload?.workflowStepReference;
    if (!workflowModel || workflowModel.id !== 'COMPANY_GUIDED_NEW_PLAN') fail(`create-shift journey lost workflow model: ${item.prompt}`);
    const liveWorkflowMarker = page.locator('[role="dialog"] .guidedPlanModalContent[data-copilot-workflow-step]').last();
    const liveStep = Number(await liveWorkflowMarker.getAttribute('data-copilot-workflow-step').catch(() => 0)) || 0;
    const explicitOrdinal = /^(\d+)\.\s*adım/iu.test(item.prompt);
    const expectedStep = explicitOrdinal ? item.step : liveStep;
    if (!expectedStep || Number(stepReference?.ordinal) !== expectedStep) {
      fail(`create-shift journey wrong step for ${item.prompt}: expected live=${expectedStep}, got ${stepReference?.ordinal}`);
    }
    if (item.action && plan.continuationAction !== item.action) fail(`create-shift journey wrong action for ${item.prompt}: expected ${item.action}, got ${plan.continuationAction}`);
    if (item.requireUnverifiedCompletion && plan.workflowProgression?.preconditionSatisfied === true) {
      fail(`create-shift journey invented completion evidence for ${item.prompt}`);
    }
    if (item.prompt !== 'vardiya oluşturmak istiyorum' && payload?.guidedTarget?.status !== 'FOUND') fail(`create-shift journey lost the current real target: ${item.prompt}`);
    if (/mevcut ürün kapsamının dışında|başlangıç\/bitiş saati|durum veya başka alan/i.test(String(payload?.reply || ''))) fail(`create-shift journey fell into generic/field fallback: ${item.prompt}`);
    if ((payload?.quickActions || []).some((action) => action?.criticalActionExecution === true)) fail(`create-shift journey exposed a critical action: ${item.prompt}`);
    if (/vardiya oluşturuldu|başarıyla oluşturuldu|teklif gönderildi|kaydedildi/i.test(String(payload?.reply || ''))) fail(`create-shift journey claimed a business write: ${item.prompt}`);
    if (payload?.taskState?.activeGoal !== 'CREATE_SHIFT' || payload?.taskState?.activeWorkflow !== 'COMPANY_GUIDED_NEW_PLAN') fail(`create-shift journey task state was not persisted: ${item.prompt}`);
    if (plan.family === 'CONTINUE_CURRENT_REASONING') {
      const depth = Number(plan.continuationDepth || 0);
      if (!(depth > 0)) fail(`create-shift journey did not record truthful continuation depth: ${item.prompt}; plan=${JSON.stringify({ family: plan.family, action: plan.continuationAction, workflowStep: plan.workflowStepReference, base: plan.continuationBasePlan?.workflowIntent })}`);
      maxDepth = Math.max(maxDepth, depth);
    }
    await captureCorrectiveScreenshot(page, item.shot);
    evidence.push(path.join(screenshotRoot, `${item.shot}.png`));
  }
  report.states.push({ workflow: 'CREATE_SHIFT_KNOWLEDGE', sequenceLength: sequence.length, continuationDepth: maxDepth, evidence });
}

async function runShiftSurfaceNavigationAcceptance(page) {
  await startFreshAuthenticatedSession(page);
  const navigationMessages = [
    'vardiyalar nerde',
    'vardiyalar ekranına gitmek istiyorum',
    'vardiyaları kontrol edelim',
    'vardiya ekranını göster',
    'vardiyalara gidelim',
    'Vardiya ekranını aç',
  ];

  for (const prompt of navigationMessages) {
    await page.goto(`${webBaseUrl}/#/company/agreements`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Operasyon menüsü', { state: 'attached', timeout: 15000 });
    const payload = await askForTarget(page, prompt);
    assertNoOffTopic(payload, prompt);
    if (payload?.semanticPlan?.family !== 'UI_GUIDANCE' || payload?.semanticPlan?.workflowIntent !== 'OPEN_SHIFT_SURFACE') {
      fail(`shift surface navigation lost its UI-guidance meaning: ${prompt}`);
    }
    const reply = await lastAssistantReply(page);
    if (/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin/i.test(reply)) {
      fail(`shift surface navigation regressed to field clarification: ${prompt}`);
    }
    const routeAction = page.getByRole('button', { name: /Vardiyalar ekranına git/i }).last();
    // The assistant message arrives before its action strip can paint.  Wait
    // for the real control rather than mistaking that normal render boundary
    // for a missing authorized route.
    await routeAction.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (!(await routeAction.count())) {
      const controls = await page.getByRole('button').allTextContents();
      fail(`shift surface navigation did not expose the real authorized route: ${prompt}; payload=${JSON.stringify({ actions: payload?.quickActions || [], reply: payload?.reply || '' })}; controls=${JSON.stringify(controls)}`);
    }
    await routeAction.click();
    await page.waitForURL(/#\/company\/shifts$/, { timeout: 15000 });
    await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
  }

  const firstExpansion = await askForTarget(page, 'Devamını anlat');
  const firstReply = await lastAssistantReply(page);
  const secondExpansion = await askForTarget(page, 'Devamını anlat');
  const secondReply = await lastAssistantReply(page);
  for (const [label, payload] of [['first', firstExpansion], ['second', secondExpansion]]) {
    assertNoOffTopic(payload, `Devamını anlat (${label})`);
    if (payload?.semanticPlan?.family !== 'CONTINUE_CURRENT_REASONING'
      || payload?.semanticPlan?.continuationBasePlan?.workflowIntent !== 'OPEN_SHIFT_SURFACE'
      || payload?.guidedTarget?.status !== 'FOUND') {
      fail(`shift surface ${label} continuation did not preserve and resolve the active task`);
    }
  }
  if (!(secondExpansion?.semanticPlan?.continuationDepth > firstExpansion?.semanticPlan?.continuationDepth)) {
    fail('shift surface continuation did not advance task depth');
  }
  if (firstReply === secondReply) fail('shift surface continuation replayed the settled result');

  // A data question may settle a different answer, but must never replace the
  // active route-guidance task or produce a fabricated target on continuation.
  const statusQuery = await askForTarget(page, 'vardiya durumları ne');
  if (statusQuery?.semanticPlan?.family === 'UI_GUIDANCE'
    || (statusQuery?.quickActions || []).some((action) => action?.actionKind === 'OPEN_ROUTE')) {
    fail('shift status data query was incorrectly converted into navigation');
  }
  const resumed = await askForTarget(page, 'Devamını anlat');
  if (resumed?.semanticPlan?.continuationBasePlan?.workflowIntent !== 'OPEN_SHIFT_SURFACE'
    || resumed?.guidedTarget?.status !== 'FOUND') {
    fail('settled data result contaminated the active shift guidance task');
  }
  await captureCorrectiveScreenshot(page, 'company-shift-surface-continuation-data-query');
  report.states.push({ workflow: 'OPEN_SHIFT_SURFACE', navigationMessages: navigationMessages.length, continuationProgression: true, dataQuerySeparated: true });
}

async function runRoomOfferNavigationAcceptance(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  const roomPage = await context.newPage();
  try {
    await roomPage.goto(`${webBaseUrl}/#/room/shifts`, { waitUntil: 'domcontentloaded' });
    const identifier = roomPage.locator('input[autocomplete="username"]');
    if (await identifier.count()) {
      await identifier.fill('room@demo.com');
      await roomPage.locator('input[autocomplete="current-password"]').fill('demo123');
      await roomPage.getByRole('button', { name: 'Giriş yap' }).click();
      await roomPage.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
    }
    await roomPage.waitForSelector('text=Operasyon menüsü', { state: 'attached', timeout: 15000 });
    const payload = await askForTarget(roomPage, 'Tekliflerimi görmek istiyorum.');
    if (payload?.guidedTarget?.targetKey !== 'room:offers' || payload?.guidedTarget?.safeAction !== 'NAVIGATE') {
      fail(`ROOM offer navigation target contract changed: ${JSON.stringify({ guidedTarget: payload?.guidedTarget || null })}`);
    }
    await roomPage.waitForURL(/#\/room\/offers(?:\?|$)/, { timeout: 15000 });
    await roomPage.getByText('Teklifler (Gelen Teklifler)', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await roomPage.waitForTimeout(500);
    if (await roomPage.locator('[data-copilot-guided-recovery="true"]').count()) {
      fail('successful ROOM offer navigation rendered false guided-target recovery');
    }
    const stepByStep = await askForTarget(roomPage, 'Adım adım anlat.');
    if (stepByStep?.guidedTarget?.status !== 'FOUND'
      || !/^room:offers:offer:\d+$/u.test(String(stepByStep.guidedTarget.targetKey || ''))
      || !String(stepByStep.reply || '').includes(String(stepByStep.guidedTarget.label || ''))) {
      fail(`ROOM offer step-by-step guidance lost the canonical visible offer target: ${JSON.stringify({ guidedTarget: stepByStep?.guidedTarget || null, reply: String(stepByStep?.reply || '').slice(0, 180) })}`);
    }
    const deicticTarget = await askForTarget(roomPage, 'Burada ne yapacağım?');
    if (deicticTarget?.guidedTarget?.status !== 'FOUND'
      || !/^room:offers:offer:\d+$/u.test(String(deicticTarget.guidedTarget.targetKey || ''))
      || !String(deicticTarget.reply || '').includes(String(deicticTarget.guidedTarget.label || ''))) {
      fail(`ROOM offer deictic explanation did not name the resolved offer target: ${JSON.stringify({ guidedTarget: deicticTarget?.guidedTarget || null, reply: String(deicticTarget?.reply || '').slice(0, 180) })}`);
    }
    report.states.push({ workflow: 'OPEN_OFFER_SURFACE', route: '/room/offers', navigation: true, falseRecovery: false });
  } finally {
    await context.close();
  }
}

async function runRealisticGuidedShiftFlowAcceptance(page) {
  await startFreshAuthenticatedSession(page);
  await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });

  const start = await askForTarget(page, 'Bir vardiya oluşturalım');
  assertNoOffTopic(start, 'Bir vardiya oluşturalım');
  if (start?.semanticPlan?.family !== 'UI_GUIDANCE' || start?.semanticPlan?.workflowIntent !== 'CREATE_SHIFT') {
    fail('realistic shift flow did not start as canonical CREATE_SHIFT guidance');
  }

  const open = await askForTarget(page, 'vardiyalara gidelim');
  assertNoOffTopic(open, 'vardiyalara gidelim');
  if (open?.semanticPlan?.workflowIntent !== 'OPEN_SHIFT_SURFACE') {
    fail('realistic shift flow did not resolve the Vardiyalar navigation step');
  }
  const routeAction = page.getByRole('button', { name: /Vardiyalar ekranına git/i }).last();
  await routeAction.waitFor({ state: 'visible', timeout: 5000 });
  await routeAction.click();
  await page.waitForURL(/#\/company\/shifts$/, { timeout: 15000 });
  await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });

  for (const { prompt, label } of [
    { prompt: 'Girdim', label: 'ENTERED' },
    { prompt: 'Bulamadım', label: 'RECOVERY' },
    { prompt: 'Devam et', label: 'CONTINUE' },
    { prompt: 'Geri dön', label: 'BACK' },
  ]) {
    const payload = await askForTarget(page, prompt);
    assertNoOffTopic(payload, prompt);
    if (payload?.semanticPlan?.family !== 'CONTINUE_CURRENT_REASONING'
      || payload?.guidedTarget?.status !== 'FOUND'
      || payload?.guidedTarget?.screenPath !== '/company/shifts') {
      fail(`${prompt} did not resolve the active Vardiyalar target`);
    }
    if ((payload?.quickActions || []).some((action) => action?.path === '/company')) {
      fail(`${prompt} retained a stale Planlama Merkezi navigation action`);
    }
    report.states.push({ workflow: 'REALISTIC_CREATE_SHIFT', continuation: label, target: '/company/shifts' });
  }

  const statusQuery = await askForTarget(page, 'vardiya durumları ne');
  if (statusQuery?.semanticPlan?.family === 'UI_GUIDANCE'
    || (statusQuery?.quickActions || []).some((action) => action?.actionKind === 'OPEN_ROUTE')) {
    fail('vardiya status data query was converted into navigation');
  }
  report.states.push({ workflow: 'REALISTIC_CREATE_SHIFT', dataQuerySeparated: true });
  await captureCorrectiveScreenshot(page, 'company-realistic-guided-shift-flow');
}

async function runGuidedDraftResumeAcceptance(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    ignoreHTTPSErrors: webBaseUrl.startsWith('https://'),
  });
  const page = await context.newPage();
  const writeRequests = [];
  const onRequest = (request) => {
    const url = request.url();
    const method = request.method();
    if ((method === 'POST' && url.includes('/api/shifts/guided-batch'))
      || (method === 'DELETE' && url.includes('/api/shifts/') && url.includes('/guided-temp'))) {
      writeRequests.push({ method, url });
    }
  };
  page.on('request', onRequest);
  try {
    await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
    const identifier = page.locator('input[autocomplete="username"]');
    if (await identifier.count()) {
      await identifier.fill('company@demo.com');
      await page.locator('input[autocomplete="current-password"]').fill('demo123');
      await page.getByRole('button', { name: 'Giriş yap' }).click();
      await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
    }
    await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
    const details = page.locator('details[data-details="task-workspace"] > summary');
    await details.waitFor({ state: 'visible', timeout: 15000 });
    const detailsOpen = await details.evaluate((node) => Boolean(node.parentElement?.open));
    if (!detailsOpen) await details.press('Enter');
    const launcher = page.getByRole('button', { name: 'Rehberi Başlat', exact: true });
    await launcher.waitFor({ state: 'visible', timeout: 15000 });
    await launcher.press('Enter');
    const dialog = page.locator('[role="dialog"] .guidedPlanModalContent');
    await dialog.waitFor({ state: 'visible', timeout: 15000 });
    const chooser = dialog.locator('[data-guided-draft-chooser="true"]');
    await chooser.waitFor({ state: 'visible', timeout: 15000 });
    const firstCard = chooser.locator('[data-guided-draft-id]').first();
    const selectedId = Number(await firstCard.getAttribute('data-guided-draft-id'));
    if (!selectedId) fail('server-backed draft chooser did not expose a stable draft id');
    await firstCard.getByRole('button', { name: 'Devam et', exact: true }).press('Enter');
    await page.waitForTimeout(700);
    if (await chooser.count() && await chooser.isVisible().catch(() => false)) fail('Devam et left the server-backed chooser open');
    const workflowStep = await dialog.getAttribute('data-copilot-workflow-step');
    if (!workflowStep || Number(workflowStep) < 1 || Number(workflowStep) > 4) fail('resumed guided modal did not expose a valid workflow step');
    if (writeRequests.length) fail(`draft resume issued a business write: ${JSON.stringify(writeRequests)}`);
    await captureCorrectiveScreenshot(page, 'company-guided-draft-resume-same-id');
    report.states.push({ guidedDraftResume: true, selectedId, workflowStep: Number(workflowStep), writeRequests: writeRequests.length });
  } finally {
    page.off('request', onRequest);
    await context.close();
  }
}

// Ordinary guided entry must never let a client snapshot with valid server
// draft ids bypass the server-backed chooser.  This is deliberately exercised
// in fresh responsive contexts because the reported defect was a desktop /
// mobile business-state divergence.  The seeded local snapshot is client-only
// acceptance state; no business endpoint is called to create, replace, or
// delete a draft.
async function runGuidedDraftViewportParityAcceptance(browser) {
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];
  const states = [];
  // Authenticate once through the normal UI, then use the resulting session
  // state in isolated viewport contexts.  The contexts remain fresh for
  // client/localStorage purposes while avoiding repeated login throttling
  // obscuring the parity result.
  const authContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    ignoreHTTPSErrors: webBaseUrl.startsWith('https://'),
  });
  const authPage = await authContext.newPage();
  await authPage.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
  const authIdentifier = authPage.locator('input[autocomplete="username"]');
  if (await authIdentifier.count()) {
    await authIdentifier.fill('company@demo.com');
    await authPage.locator('input[autocomplete="current-password"]').fill('demo123');
    await authPage.getByRole('button', { name: 'Giriş yap' }).click();
    await authPage.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
  }
  await authPage.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 20000 });
  const authStorageState = await authContext.storageState();
  await authContext.close();
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: 'tr-TR',
      timezoneId: 'Europe/Istanbul',
      ignoreHTTPSErrors: webBaseUrl.startsWith('https://'),
      storageState: authStorageState,
    });
    await context.addInitScript(() => {
      localStorage.setItem(
        'psv1:guidedPlanModalDraft:v1:COMPANY:COMPANY:company-1:company-guided-flow:new-plan',
        JSON.stringify({
          version: 1,
          ts: Date.now(),
          state: { step: 2, hubLoaded: true, draftShiftIds: [207], draftShifts: [] },
        }),
      );
    });
    const page = await context.newPage();
    const writeRequests = [];
    page.on('request', (request) => {
      const method = String(request.method() || '').toUpperCase();
      const url = request.url();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && /\/api\/shifts(?:\/|$)/i.test(url)) {
        writeRequests.push({ method, url });
      }
    });
    try {
      await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
      const details = page.locator('details[data-details="task-workspace"] > summary');
      await details.waitFor({ state: 'visible', timeout: 15000 });
      if (!(await details.evaluate((node) => Boolean(node.parentElement?.open)))) await details.press('Enter');
      const launcher = page.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last();
      await launcher.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(500);
      await expect(launcher).toBeEnabled({ timeout: 15000 });
      await launcher.click();
      const dialog = page.locator('[role="dialog"] .guidedPlanModalContent');
      await dialog.waitFor({ state: 'visible', timeout: 15000 });
      const chooser = dialog.locator('[data-guided-draft-chooser="true"]');
      // Hydration first renders the modal shell, then resolves the
      // server-backed candidates.  Wait for that authoritative state before
      // judging parity; a shell-only read is an acceptance false positive.
      await chooser.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      if (!(await chooser.isVisible().catch(() => false))) {
        report.counters.currentUiStateMismatch += 1;
        report.counters.wrongWorkflowOrder += 1;
        report.counters.falsePass += 1;
        fail(`ordinary ${viewport.name} entry bypassed the server-backed draft chooser`);
      }
      const ids = await chooser.locator('[data-guided-draft-id]').evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-guided-draft-id'))));
      if (!ids.includes(207)) fail(`ordinary ${viewport.name} chooser did not expose the server draft identity`);
      if (writeRequests.length) {
        report.counters.businessWriteExecuted += writeRequests.length;
        fail(`ordinary ${viewport.name} entry issued business writes: ${JSON.stringify(writeRequests)}`);
      }
      const screenshotPath = await captureCorrectiveScreenshot(page, `guided-draft-parity-${viewport.name}`);
      states.push({ viewport: viewport.name, chooser: true, draftIds: ids, repeatedEntryContext: true, businessWrites: 0, screenshotPath });
    } finally {
      await context.close();
    }
  }
  // No-draft baseline: discovery returning an empty authorized inventory keeps
  // the ordinary Step-1 entry path and does not introduce a chooser.
  const noDraftContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    ignoreHTTPSErrors: webBaseUrl.startsWith('https://'),
    storageState: authStorageState,
  });
  const noDraftPage = await noDraftContext.newPage();
  const noDraftWrites = [];
  noDraftPage.on('request', (request) => {
    const method = String(request.method() || '').toUpperCase();
    const url = request.url();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && /\/api\/shifts(?:\/|$)/i.test(url)) {
      noDraftWrites.push({ method, url });
    }
  });
  await noDraftPage.route('**/api/shifts/guided-drafts', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
  });
  try {
    await noDraftPage.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
    await noDraftPage.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
    const details = noDraftPage.locator('details[data-details="task-workspace"] > summary');
    await details.waitFor({ state: 'visible', timeout: 15000 });
    if (!(await details.evaluate((node) => Boolean(node.parentElement?.open)))) await details.press('Enter');
    const launcher = noDraftPage.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last();
    await launcher.waitFor({ state: 'visible', timeout: 15000 });
    await expect(launcher).toBeEnabled({ timeout: 15000 });
    await launcher.click();
    const dialog = noDraftPage.locator('[role="dialog"] .guidedPlanModalContent');
    await dialog.waitFor({ state: 'visible', timeout: 15000 });
    if (await dialog.locator('[data-guided-draft-chooser="true"]').isVisible().catch(() => false)) {
      report.counters.currentUiStateMismatch += 1;
      report.counters.falsePass += 1;
      fail('no-draft baseline unexpectedly rendered a saved-draft chooser');
    }
    const step = await dialog.getAttribute('data-copilot-workflow-step');
    if (String(step) !== '1') fail(`no-draft baseline did not open Step 1: ${String(step)}`);
    if (noDraftWrites.length) fail(`no-draft entry issued business writes: ${JSON.stringify(noDraftWrites)}`);
    states.push({ viewport: 'no-draft-baseline', chooser: false, workflowStep: 1, businessWrites: 0 });
  } finally {
    await noDraftContext.close();
  }
  // A stale local pointer must be discarded in favor of the current server
  // inventory; it must never bypass the chooser or trigger replacement.
  const stalePointerContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    ignoreHTTPSErrors: webBaseUrl.startsWith('https://'),
    storageState: authStorageState,
  });
  await stalePointerContext.addInitScript(() => {
    localStorage.setItem(
      'psv1:guidedPlanModalDraft:v1:COMPANY:COMPANY:company-1:company-guided-flow:new-plan',
      JSON.stringify({ version: 1, ts: Date.now(), state: { step: 2, hubLoaded: true, draftShiftIds: [999999], draftShifts: [] } }),
    );
  });
  const stalePointerPage = await stalePointerContext.newPage();
  const stalePointerWrites = [];
  stalePointerPage.on('request', (request) => {
    const method = String(request.method() || '').toUpperCase();
    const url = request.url();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && /\/api\/shifts(?:\/|$)/i.test(url)) {
      stalePointerWrites.push({ method, url });
    }
  });
  try {
    await stalePointerPage.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
    await stalePointerPage.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
    const details = stalePointerPage.locator('details[data-details="task-workspace"] > summary');
    await details.waitFor({ state: 'visible', timeout: 15000 });
    if (!(await details.evaluate((node) => Boolean(node.parentElement?.open)))) await details.press('Enter');
    const launcher = stalePointerPage.getByRole('button', { name: 'Rehberi Başlat', exact: true }).last();
    await launcher.waitFor({ state: 'visible', timeout: 15000 });
    await expect(launcher).toBeEnabled({ timeout: 15000 });
    await launcher.click();
    const dialog = stalePointerPage.locator('[role="dialog"] .guidedPlanModalContent');
    await dialog.waitFor({ state: 'visible', timeout: 15000 });
    const chooser = dialog.locator('[data-guided-draft-chooser="true"]');
    await chooser.waitFor({ state: 'visible', timeout: 10000 });
    const ids = await chooser.locator('[data-guided-draft-id]').evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-guided-draft-id'))));
    if (!ids.includes(207) || stalePointerWrites.length) fail(`stale local pointer bypassed authoritative chooser: ${JSON.stringify({ ids, writes: stalePointerWrites })}`);
    states.push({ viewport: 'stale-pointer', chooser: true, draftIds: ids, businessWrites: 0 });
  } finally {
    await stalePointerContext.close();
  }
  report.states.push({ guidedDraftViewportParity: states, passiveEntryBusinessWrites: 0 });
}

async function runRoleGuidanceMatrix(browser) {
  const roles = [
    { role: 'SUPER_ADMIN', identifier: 'superadmin@demo.com', route: '/superadmin/operations', surfaces: ['/superadmin/operations', '/superadmin/companies'], prompt: 'Yönetim ekranında neyi kontrol etmeliyim?' },
    { role: 'ROOM', identifier: 'room@demo.com', route: '/room/shifts', surfaces: ['/room/shifts', '/room/agreements'], prompt: 'Vardiya eklemeyi göster' },
    { role: 'COMPANY', identifier: 'company@demo.com', route: '/company/shifts', surfaces: ['/company', '/company/operations'], prompt: 'Ben vardiya oluşturmak istiyorum' },
    { role: 'SCHOOL', identifier: 'school@demo.com', route: '/school/operations', surfaces: ['/school/operations', '/school/agreements'], prompt: 'Bu okul servis operasyon ekranını anlat' },
    { role: 'ORGANIZATION', identifier: 'organization@demo.com', route: '/organization/operations', surfaces: ['/organization/operations', '/organization/agreements'], prompt: 'Bu organizasyon planlama ekranını anlat' },
    { role: 'DRIVER', identifier: 'driver@demo.com', route: '/driver/route', surfaces: ['/driver/route', '/driver/today'], prompt: 'Bugünkü rotamı nerede görebilirim?', negativePrompt: 'vardiyalar nerde' },
    { role: 'PERSONEL', identifier: 'personel@demo.com', route: '/personel/live', surfaces: ['/personel/live', '/personel/my'], prompt: 'Servisimi nerede görebilirim?' },
    { role: 'PARENT', identifier: 'parent@demo.com', route: '/parent/live', surfaces: ['/parent/live', '/parent/copilot'], prompt: 'Çocuğumun servisini nerede görebilirim?' },
  ];
  const states = [];
  for (const spec of roles) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul', ignoreHTTPSErrors: webBaseUrl.startsWith('https://') });
    if (spec.role === 'DRIVER') {
      await context.addInitScript((id) => localStorage.setItem('personel_servis_browser_device_id', id), process.env.DRIVER_BROWSER_DEVICE_ID || 'web-vos7tyh6mtpo1gze');
    }
    const rolePage = await context.newPage();
    try {
      await rolePage.goto(`${webBaseUrl}/#${spec.route}`, { waitUntil: 'domcontentloaded' });
      const identifier = rolePage.locator('input[autocomplete="username"]');
      if (await identifier.count()) {
        await identifier.fill(spec.identifier);
        await rolePage.locator('input[autocomplete="current-password"]').fill('demo123');
        await rolePage.getByRole('button', { name: 'Giriş yap' }).click();
        await rolePage.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
      }
      await rolePage.waitForTimeout(700);
      const fab = rolePage.locator('.copilotFab:visible').first();
      if (!(await fab.count())) fail(`role guidance launcher missing: ${spec.role}`);
      await fab.click();
      const drawer = rolePage.locator('.copilotDrawer:visible').first();
      await drawer.waitFor({ state: 'visible', timeout: 10000 });
      const input = drawer.locator('textarea').first();
      const responsePromise = rolePage.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
      await input.fill(spec.prompt);
      await input.press('Enter');
      const response = await responsePromise;
      const payload = await response.json().catch(() => ({}));
      if (response.status() !== 200 || !String(payload?.reply || payload?.summary || '').trim()) fail(`role guidance response missing: ${spec.role}`);
      if (/vardiya|sefer|shift|oluştur|olustur|eklemeyi/i.test(spec.prompt)
        && /yetkili kayıtta yok|yetkili güncel kayıtlarda vardiya/i.test(String(payload?.reply || ''))) fail(`role guidance fell back to record lookup: ${spec.role}`);
      if (payload?.guidedTarget?.status === 'UNAUTHORIZED') fail(`role guidance returned unauthorized target: ${spec.role}`);
      if ((payload?.quickActions || []).some((action) => action?.criticalActionExecution === true)) fail(`role guidance exposed critical execution: ${spec.role}`);
      if (spec.negativePrompt) {
        const negativeResponsePromise = rolePage.waitForResponse((candidate) => candidate.url().includes('/api/ai/copilot') && candidate.request().method() === 'POST', { timeout: 30000 });
        await input.fill(spec.negativePrompt);
        await input.press('Enter');
        const negativeResponse = await negativeResponsePromise;
        const negativePayload = await negativeResponse.json().catch(() => ({}));
        if (negativePayload?.semanticPlan?.family !== 'UI_GUIDANCE') fail(`role-negative request lost its guidance meaning: ${spec.role}`);
        if ((negativePayload?.quickActions || []).some((action) => action?.actionKind === 'OPEN_ROUTE')) fail(`role-negative request exposed an unauthorized route: ${spec.role}`);
        const negativeReply = await rolePage.locator('.copilotMsg.assistant').last().locator('.copilotMsgText').innerText();
        if (!/bu rolde.*vardiyalar.*ekran/i.test(negativeReply)) fail(`role-negative request did not explain the role boundary: ${spec.role}`);
      }
      for (const [surfaceIndex, surfacePath] of (spec.surfaces || [spec.route]).entries()) {
        await rolePage.goto(`${webBaseUrl}/#${surfacePath}`, { waitUntil: 'domcontentloaded' });
        await rolePage.waitForTimeout(700);
        const actualSurfacePath = (rolePage.url().split('#')[1] || '').split('?')[0] || surfacePath;
        const surfaceFab = rolePage.locator('.copilotFab:visible').first();
        let surfaceDrawer = rolePage.locator('.copilotDrawer:visible').first();
        let surfaceInput = null;
        if (!(await surfaceDrawer.count())) {
          if (await surfaceFab.count()) {
            await surfaceFab.click();
            surfaceDrawer = rolePage.locator('.copilotDrawer:visible').first();
          } else {
            // Parent's canonical /parent/copilot surface is the full-screen
            // Sefer Abi experience. It has the same current-screen semantic
            // authority and real textarea, without a floating launcher.
            surfaceInput = rolePage.locator('textarea:visible').first();
            await surfaceInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
            if (!(await surfaceInput.count())) fail(`current-screen launcher missing: ${spec.role} ${surfacePath}`);
          }
        }
        if (await surfaceDrawer.count()) {
          await surfaceDrawer.waitFor({ state: 'visible', timeout: 10000 });
          surfaceInput = surfaceDrawer.locator('textarea').first();
        }
        for (const screenPrompt of ['Bu ekranı anlat', 'burda naparım']) {
          const surfaceResponsePromise = rolePage.waitForResponse((candidate) => candidate.url().includes('/api/ai/copilot') && candidate.request().method() === 'POST', { timeout: 30000 });
          await surfaceInput.fill(screenPrompt);
          await surfaceInput.press('Enter');
          const surfaceResponse = await surfaceResponsePromise;
          const surfacePayload = await surfaceResponse.json().catch(() => ({}));
          if (surfaceResponse.status() !== 200 || !String(surfacePayload?.reply || surfacePayload?.summary || '').trim()) fail(`current-screen response missing: ${spec.role} ${surfacePath} ${screenPrompt}`);
          if (surfacePayload?.semanticPlan?.family !== 'SCREEN_CONTEXT') fail(`current-screen help lost canonical screen context: ${spec.role} ${surfacePath} ${screenPrompt}`);
          if (/mevcut ürün kapsamının dışında|yetkili kayıtta yok|kayıt bulunamadı/i.test(String(surfacePayload?.reply || ''))) fail(`current-screen help fell back from the live surface: ${spec.role} ${surfacePath} ${screenPrompt}`);
          if (String(surfacePayload?.screenPath || '') !== actualSurfacePath) fail(`current-screen help used stale route context: ${spec.role} expected ${actualSurfacePath} got ${surfacePayload?.screenPath}`);
        }
        await captureCorrectiveScreenshot(rolePage, `${spec.role}-${surfacePath}-screen-help`);
        states.push({ role: spec.role, requestedSurface: surfacePath, surface: actualSurfacePath, screenHelp: true, surfaceIndex });
      }
      states.push({ role: spec.role, status: response.status(), family: payload?.semanticPlan?.family || payload?.questionType || null, guidedTarget: payload?.guidedTarget?.status || null, criticalActionExecution: false });
    } finally {
      await context.close();
    }
  }
  report.states.push({ roleGuidanceMatrix: states, roleCount: states.length });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: webBaseUrl.startsWith('https://') });
const page = await context.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') report.counters.consoleErrorCount += 1; });
page.on('pageerror', () => { report.counters.pageErrorCount += 1; });
page.on('request', (request) => {
  const method = String(request.method() || '').toUpperCase();
  const url = request.url();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && /\/api\/(?:shifts|guided-drafts)(?:\/|$)/i.test(url)) {
    report.counters.businessWriteExecuted += 1;
  }
});

try {
  await ensureLoggedIn(page);
  if (focusedCreateShiftKnowledgeOnly) {
    await runCreateShiftKnowledgeAcceptance(page);
  } else if (focusedWorkflowStateOnly) {
    await runGuidedDraftViewportParityAcceptance(browser);
    await runWorkflowStateAcceptance(page);
  } else if (focusedMobileOcclusionOnly) {
    await runMobileOcclusionAcceptance(page);
  } else if (focusedVisualOnly) {
    await page.goto(`${webBaseUrl}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await runWorkflowIntentAcceptance(page, { focusedOnly: true });
  } else {
    await runScreenReferentAcceptance(page);
    await page.goto(`${webBaseUrl}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await runWorkflowIntentAcceptance(page);
  await runCreateShiftKnowledgeAcceptance(page);
  await runActiveTaskContinuityAcceptance(page);
  await runShiftSurfaceNavigationAcceptance(page);
  await runRoomOfferNavigationAcceptance(browser);
  await runRealisticGuidedShiftFlowAcceptance(page);
  await runGuidedDraftResumeAcceptance(browser);
  await runRoleGuidanceMatrix(browser);
  await page.goto(`${webBaseUrl}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Operasyon menüsü', { state: 'attached', timeout: 15000 });
  await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
  for (const viewport of report.viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    if (viewport.name === 'desktop') {
      await askForTarget(page, 'Detayları göster nerede?');
      const highlight = page.locator('[role="status"]').filter({ hasText: /Buraya bak/i });
      await highlight.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      if (!(await highlight.count())) {
        report.counters.nonexistentUiGuidanceCount += 1;
        fail('current authorized UI target was not highlighted');
      }
      report.counters.guidedTargetFound += 1;
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (overflow) report.counters.horizontalOverflowCount += 1;
      report.states.push({ viewport: viewport.name, target: 'FOUND', highlight: true, overflow });
      await captureCorrectiveScreenshot(page, `company-${viewport.name}-guided-target`);
      await askForTarget(page, 'Kaydet butonu nerede?');
      if (await page.locator('[role="status"]').filter({ hasText: /Buraya bak/i }).count() > 0) fail('nonexistent critical target was highlighted');
      report.states.push({ viewport: viewport.name, target: 'NOT_FOUND', criticalTargetBlocked: true });
    } else {
      await page.goto(`${webBaseUrl}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Operasyon menüsü', { state: 'attached', timeout: 15000 });
      await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
      const launcher = page.getByRole('button', { name: /Sefer Abi’ye Sor/i }).first();
      if (await launcher.count()) await launcher.click();
      const drawer = page.locator('.copilotDrawer');
      await drawer.waitFor({ state: 'visible', timeout: 10000 });
      const drawerMetrics = await drawer.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const handle = element.querySelector('.copilotDrawerResizeHandle');
        const presets = element.querySelector('.copilotDrawerMoreMenu .copilotDrawerPresets');
        const expand = element.querySelector('.copilotMobileExpandBtn');
        const suggestionToggle = element.querySelector('.copilotContextSuggestionsToggle');
        const suggestionPanel = element.querySelector('.copilotSuggestionWrap');
        const textarea = element.querySelector('.copilotComposer textarea');
        return {
          rect: { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          resizeHandleDisplay: handle ? getComputedStyle(handle).display : 'missing',
          sizePresetDisplay: presets ? getComputedStyle(presets).display : 'missing',
          mobileExpandDisplay: expand ? getComputedStyle(expand).display : 'missing',
          mobileExpanded: element.classList.contains('copilotDrawer--mobile-expanded'),
          suggestionsExpanded: suggestionToggle?.getAttribute('aria-expanded') === 'true',
          suggestionsHidden: suggestionPanel?.hidden === true,
          textareaHeight: textarea?.getBoundingClientRect?.().height || 0,
          duplicateComposerContext: /Bağlam:/i.test(element.querySelector('.copilotComposer')?.textContent || ''),
        };
      });
      if (viewport.name === 'mobile') {
        if (drawerMetrics.rect.height > viewport.height * 0.4 + 1) fail('mobile Sefer Abi drawer covers too much viewport');
        if (drawerMetrics.resizeHandleDisplay !== 'none') fail('mobile desktop resize handle is exposed');
        if (drawerMetrics.mobileExpandDisplay === 'none') fail('mobile compact/expanded control is unavailable');
        if (drawerMetrics.mobileExpanded) fail('mobile drawer does not open in compact mode');
        if (drawerMetrics.suggestionsExpanded || !drawerMetrics.suggestionsHidden) fail('mobile suggestions are not collapsed by default');
        if (drawerMetrics.duplicateComposerContext) fail('mobile drawer repeats the visible context in the composer');
        if (drawerMetrics.textareaHeight > 54) fail('mobile composer starts too tall');
        const suggestionToggle = drawer.locator('.copilotContextSuggestionsToggle');
        await suggestionToggle.click();
        if (await suggestionToggle.getAttribute('aria-expanded') !== 'true' || !(await drawer.locator('.copilotSuggestionWrap:not([hidden])').count())) fail('mobile suggestions cannot be opened safely');
        const suggestionOverflow = await drawer.evaluate((element) => {
          const wrap = element.querySelector('.copilotSuggestionWrap:not([hidden])');
          const rect = wrap?.getBoundingClientRect?.();
          const drawerRect = element.getBoundingClientRect();
          return Boolean(rect && (rect.bottom > drawerRect.bottom + 1 || rect.left < drawerRect.left - 1 || rect.right > drawerRect.right + 1));
        });
        if (suggestionOverflow) fail('mobile opened suggestions clip or escape the drawer');
        await suggestionToggle.click();
        const collapseAfterSuggestions = drawer.locator('.copilotMobileExpandBtn');
        if (await collapseAfterSuggestions.getAttribute('aria-expanded') === 'true') await collapseAfterSuggestions.click();
        const more = drawer.locator('.copilotDrawerMore summary');
        if (await more.count()) await more.click();
        const visiblePresets = drawer.locator('.copilotDrawerMoreMenu .copilotDrawerPresets:visible');
        if (await visiblePresets.count()) fail('mobile desktop size presets remain visible');
        const openMoreMenu = drawer.locator('.copilotDrawerMore[open] > summary');
        if (await openMoreMenu.count()) await openMoreMenu.click();
        const expand = drawer.locator('.copilotMobileExpandBtn');
        await expand.click();
        const expandedHeight = await drawer.evaluate((element) => element.getBoundingClientRect().height);
        if (expandedHeight <= drawerMetrics.rect.height + 20) fail('mobile expanded mode did not increase the drawer safely');
        await expand.click();
        const compactHeight = await drawer.evaluate((element) => element.getBoundingClientRect().height);
        if (compactHeight > viewport.height * 0.4 + 1) fail('mobile compact mode did not return after collapse');
        const textarea = drawer.locator('.copilotComposer textarea');
        await textarea.fill('Kısa soru');
        const shortHeight = await textarea.evaluate((element) => element.getBoundingClientRect().height);
        await textarea.fill('Uzun bir soru yazıyorum; bu metin, panelin içerik arttığında kontrollü biçimde büyüdüğünü ve ekranın geri kalanını gereksiz yere kapatmadığını doğrulamak için kullanılıyor.');
        const longHeight = await textarea.evaluate((element) => element.getBoundingClientRect().height);
        if (longHeight <= shortHeight || longHeight > 122) fail('mobile composer did not grow within its bounded height');
        await textarea.fill('');
        await askForTarget(page, 'Detayları göster nerede?');
        const highlight = page.locator('[role="status"]').filter({ hasText: /Buraya bak/i });
        await highlight.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (!(await highlight.count())) {
          report.counters.nonexistentUiGuidanceCount += 1;
          fail('mobile current authorized UI target was not highlighted');
        }
        const targetSafe = await page.evaluate(() => {
          const status = document.querySelector('[role="status"]');
          const panel = document.querySelector('.copilotDrawer');
          const target = [...document.querySelectorAll('[data-copilot-target], button')]
            .find((element) => !element.closest('.copilotDrawer,.copilotFab') && /detayları göster/i.test(element.textContent || element.getAttribute('aria-label') || ''));
          const statusRect = status?.getBoundingClientRect?.();
          const panelRect = panel?.getBoundingClientRect?.();
          const targetRect = target?.getBoundingClientRect?.();
          const composer = panel?.querySelector('.copilotComposer');
          const composerRect = composer?.getBoundingClientRect?.();
          const messages = [...(panel?.querySelectorAll('.copilotMsg') || [])];
          const lastMessageRect = messages.at(-1)?.getBoundingClientRect?.();
          const overlap = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
          return {
            highlightVisible: Boolean(statusRect),
            highlightObscured: overlap(statusRect, panelRect),
            targetObscured: overlap(targetRect, panelRect),
            composerVisible: Boolean(composerRect && composerRect.width > 0 && composerRect.height > 0),
            composerWithinDrawer: Boolean(composerRect && panelRect && composerRect.top >= panelRect.top - 1 && composerRect.bottom <= panelRect.bottom + 1),
            composerMessageOverlap: overlap(lastMessageRect, composerRect),
          };
        });
        if (targetSafe.highlightObscured || targetSafe.targetObscured) fail('mobile drawer obscures guided target');
        if (!targetSafe.composerVisible || !targetSafe.composerWithinDrawer || targetSafe.composerMessageOverlap) fail('mobile composer obscures or escapes the drawer message area');

        // Suggestions are part of the drawer layout, not a second sticky
        // layer. A real response must remain readable when the disclosure is
        // opened after the conversation has scrolled to its latest message.
        await askForTarget(page, 'Hayali vardiya kontrolünü aç');
        await suggestionToggle.click();
        await page.waitForTimeout(120);
        const conversationGeometry = await page.evaluate(() => {
          const rectOf = (node) => node?.getBoundingClientRect?.() || null;
          const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
          const drawer = document.querySelector('.copilotDrawer');
          const chat = drawer?.querySelector('.copilotChatSurface');
          const suggestions = drawer?.querySelector('.copilotSuggestionWrap:not([hidden])');
          const composer = drawer?.querySelector('.copilotComposer');
          const chatRect = rectOf(chat);
          const suggestionRect = rectOf(suggestions);
          const composerRect = rectOf(composer);
          const messages = [...(chat?.querySelectorAll('.copilotMsg') || [])].slice(-2).map(rectOf);
          const messagesFullyReadable = messages.every((rect) => Boolean(rect && chatRect && rect.top >= chatRect.top - 1 && rect.bottom <= chatRect.bottom + 1));
          return {
            messagesFullyReadable,
            messageSuggestionOverlap: messages.some((rect) => intersects(rect, suggestionRect)),
            messageComposerOverlap: messages.some((rect) => intersects(rect, composerRect)),
            chatRect: chatRect && { top: chatRect.top, bottom: chatRect.bottom },
            suggestionRect: suggestionRect && { top: suggestionRect.top, bottom: suggestionRect.bottom },
            composerRect: composerRect && { top: composerRect.top, bottom: composerRect.bottom },
            messageRects: messages.map((rect) => rect && ({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right })),
            scroll: chat ? { top: chat.scrollTop, height: chat.scrollHeight, clientHeight: chat.clientHeight } : null,
            drawerClass: drawer?.className || '',
            computedHeight: drawer ? getComputedStyle(drawer).height : null,
            inlineHeight: drawer?.style?.height || null,
          };
        });
        if (!conversationGeometry.messagesFullyReadable || conversationGeometry.messageSuggestionOverlap || conversationGeometry.messageComposerOverlap) {
          fail(`mobile suggestions obscure conversation content: ${JSON.stringify(conversationGeometry)}`);
        }
        await suggestionToggle.click();
        report.counters.guidedTargetFound += 1;
        report.states.push({ viewport: viewport.name, target: 'FOUND', highlight: true, drawer: drawerMetrics, targetSafe });
      } else {
        report.states.push({ viewport: viewport.name, target: 'RESPONSIVE_SHELL', drawer: drawerMetrics });
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const clipping = await page.evaluate(() => Array.from(document.querySelectorAll('button,[role="button"]')).some((el) => {
        const style = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && r.width > 0 && r.height > 0
          && (r.right > window.innerWidth + 1 || r.left < -1);
      }));
      if (overflow) report.counters.horizontalOverflowCount += 1;
      if (clipping) report.counters.clippingCount += 1;
      report.states.push({ viewport: viewport.name, overflow, clipping });
      await captureCorrectiveScreenshot(page, `company-${viewport.name}-drawer-geometry`);
    }
  }
  }
  if (report.counters.consoleErrorCount || report.counters.pageErrorCount) fail('browser console/page error');
  if (report.counters.businessWriteExecuted) fail(`business write executed during read-only anchor acceptance: ${report.counters.businessWriteExecuted}`);
  if (report.counters.horizontalOverflowCount || report.counters.clippingCount) fail('responsive overflow or clipping');
  console.log(JSON.stringify({ ...report, result: 'PASS' }));
} finally {
  await context.close();
  await browser.close();
}
