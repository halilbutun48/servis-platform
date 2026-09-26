import { chromium } from '@playwright/test';

const webBaseUrl = (process.env.WEB_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
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
    consoleErrorCount: 0,
    pageErrorCount: 0,
  },
};

function fail(message) {
  throw new Error(`FAIL ${message}`);
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

async function askForTarget(page, prompt) {
  const launcher = page.getByRole('button', { name: /Sefer Abi’ye Sor/i }).first();
  if (await launcher.count()) await launcher.click();
  const composer = page.locator('.copilotDrawer textarea').last();
  await composer.waitFor({ state: 'visible', timeout: 10000 });
  const priorAssistantCount = await page.locator('.copilotMsg.assistant').count();
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST',
    { timeout: 30000 },
  );
  await composer.fill(prompt);
  await composer.press('Enter');
  const response = await responsePromise;
  const payload = await response.json().catch(() => ({}));
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

function assertNoOffTopic(payload, prompt) {
  const route = String(payload?.semanticPlan?.conversationRoute || payload?.conversationRoute || payload?.questionType || '');
  if (/OFF_TOPIC_SAFE|OUT_OF_SCOPE|GENERIC_PRODUCT_HELP/i.test(route)) {
    fail(`canonical product intent fell back to ${route}: ${prompt}`);
  }
}

async function runScreenReferentAcceptance(page) {
  await page.goto(`${webBaseUrl}/#/company`, { waitUntil: 'domcontentloaded' });
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
  report.states.push({ screenReferent: 'Planlama Merkezi', family: payload.semanticPlan.family, grounded: true });
}

async function runWorkflowIntentAcceptance(page) {
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
    if (payload?.semanticPlan?.family !== 'UI_GUIDANCE' || payload?.semanticPlan?.workflowIntent !== 'CREATE_SHIFT') {
      fail(`workflow intent did not retain canonical CREATE_SHIFT meaning: ${prompt}`);
    }
    const reply = await lastAssistantReply(page);
    if (/yetkili kayıtta yok|yetkili güncel kayıtlarda vardiya|kayıt bulunamadı/i.test(reply)) {
      fail(`workflow intent regressed to record lookup: ${prompt}`);
    }
    if (!/Planlama Merkezi/i.test(reply)) fail(`workflow intent did not resolve the authorized plan screen: ${prompt}`);
  }
  const routeAction = page.getByRole('button', { name: /Planlama Merkezi ekranına git/i }).last();
  if (!(await routeAction.count())) fail('workflow intent did not expose a safe route action');
  await routeAction.click();
  await page.waitForURL(/#\/company$/, { timeout: 15000 });
  const detailSummary = page.locator('summary').filter({ hasText: /Ayrıntılı çalışma alanını göster/i });
  await detailSummary.waitFor({ state: 'visible', timeout: 15000 });

  const workflowRecovery = await askForTarget(page, 'Vardiya oluşturma yerini bulamadım');
  assertNoOffTopic(workflowRecovery, 'Vardiya oluşturma yerini bulamadım');
  if (workflowRecovery?.guidedTarget?.status !== 'FOUND') fail('Bulamadım did not resolve a canonical real target');
  const firstTarget = page.locator('[role="status"]').filter({ hasText: /Ayrıntılı çalışma alanını göster/i });
  await firstTarget.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (!(await firstTarget.count())) fail('Bulamadım did not resolve the real current workflow disclosure');
  await detailSummary.click();
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
    if (payload?.semanticPlan?.family !== 'CONTINUE_CURRENT_REASONING') {
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
  report.states.push({ workflow: 'CREATE_SHIFT', wrongScreenRecovery: true, adimAdim: true, bulamadim: true, devam: true, geri: true, criticalActionExecution: false });
}

async function runShiftSurfaceNavigationAcceptance(page) {
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
  report.states.push({ workflow: 'OPEN_SHIFT_SURFACE', navigationMessages: navigationMessages.length, continuationProgression: true, dataQuerySeparated: true });
}

async function runRealisticGuidedShiftFlowAcceptance(page) {
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
}

async function runRoleGuidanceMatrix(browser) {
  const roles = [
    { role: 'SUPER_ADMIN', identifier: 'superadmin@demo.com', route: '/superadmin', prompt: 'Yönetim ekranında neyi kontrol etmeliyim?' },
    { role: 'ROOM', identifier: 'room@demo.com', route: '/room/shifts', prompt: 'Vardiya eklemeyi göster' },
    { role: 'COMPANY', identifier: 'company@demo.com', route: '/company/shifts', prompt: 'Ben vardiya oluşturmak istiyorum' },
    { role: 'SCHOOL', identifier: 'school@demo.com', route: '/school/operations', prompt: 'Vardiya eklemeyi göster' },
    { role: 'ORGANIZATION', identifier: 'organization@demo.com', route: '/organization/operations', prompt: 'Vardiya eklemeyi göster' },
    { role: 'DRIVER', identifier: 'driver@demo.com', route: '/driver/route', prompt: 'Bugünkü rotamı nerede görebilirim?', negativePrompt: 'vardiyalar nerde' },
    { role: 'PERSONEL', identifier: 'personel@demo.com', route: '/personel/live', prompt: 'Servisimi nerede görebilirim?' },
    { role: 'PARENT', identifier: 'parent@demo.com', route: '/parent/live', prompt: 'Çocuğumun servisini nerede görebilirim?' },
  ];
  const states = [];
  for (const spec of roles) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
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
      states.push({ role: spec.role, status: response.status(), family: payload?.semanticPlan?.family || payload?.questionType || null, guidedTarget: payload?.guidedTarget?.status || null, criticalActionExecution: false });
    } finally {
      await context.close();
    }
  }
  report.states.push({ roleGuidanceMatrix: states, roleCount: states.length });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') report.counters.consoleErrorCount += 1; });
page.on('pageerror', () => { report.counters.pageErrorCount += 1; });

try {
  await ensureLoggedIn(page);
  await runScreenReferentAcceptance(page);
  await page.goto(`${webBaseUrl}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
  await runWorkflowIntentAcceptance(page);
  await runShiftSurfaceNavigationAcceptance(page);
  await runRealisticGuidedShiftFlowAcceptance(page);
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
      await page.locator('.copilotDrawer textarea').last().fill('Kaydet butonu nerede?');
      await page.locator('.copilotDrawer textarea').last().press('Enter');
      await page.waitForTimeout(500);
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
          const overlap = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
          return { highlightVisible: Boolean(statusRect), highlightObscured: overlap(statusRect, panelRect), targetObscured: overlap(targetRect, panelRect) };
        });
        if (targetSafe.highlightObscured || targetSafe.targetObscured) fail('mobile drawer obscures guided target');
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
    }
  }
  if (report.counters.consoleErrorCount || report.counters.pageErrorCount) fail('browser console/page error');
  if (report.counters.horizontalOverflowCount || report.counters.clippingCount) fail('responsive overflow or clipping');
  console.log(JSON.stringify({ ...report, result: 'PASS' }));
} finally {
  await context.close();
  await browser.close();
}
