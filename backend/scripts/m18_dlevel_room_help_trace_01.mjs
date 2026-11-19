#!/usr/bin/env node
import { chromium } from '@playwright/test';

const base = (process.env.WEB_BASE_URL || 'http://127.0.0.1:5174').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
const page = await context.newPage();
try {
  await page.goto(`${base}/#/room/shifts`, { waitUntil: 'domcontentloaded' });
  const identifier = page.locator('input[autocomplete="username"]');
  if (await identifier.count()) {
    await identifier.fill('room@demo.com');
    await page.locator('input[autocomplete="current-password"]').fill('demo123');
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
  }
  await page.waitForTimeout(700);
  await page.locator('.copilotFab:visible').first().click();
  const input = page.locator('.copilotDrawer:visible textarea').first();
  for (const message of ['bu program ne işe yarıyor', 'bu promram ne işe yarıyor', 'bu promgram ne işe yarıyor', 'bu ekran ne işe yarıyor', 'burada ne yapabilirim', 'nerelere bakmam gerek']) {
    const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
    await input.fill(message);
    await input.press('Enter');
    const response = await responsePromise;
    const payload = await response.json().catch(() => ({}));
    if (message === 'nerelere bakmam gerek') {
      const request = response.request().postDataJSON();
      console.log(JSON.stringify({
        request: {
          message: request.message,
          screenContext: {
            path: request.screenContext?.path,
            selectedEntityType: request.screenContext?.selectedEntityType,
            selectedEntityId: request.screenContext?.selectedEntityId,
            selectedLabel: request.screenContext?.selectedLabel,
            selectedEntitySet: request.screenContext?.selectedEntitySet,
            uiHints: request.screenContext?.uiHints,
          },
          conversationState: {
            lastScreenPath: request.conversationState?.lastScreenPath,
            selectedEntityType: request.conversationState?.selectedEntityType,
            selectedEntityId: request.conversationState?.selectedEntityId,
            selectedLabel: request.conversationState?.selectedLabel,
            recentMessages: request.conversationState?.recentMessages?.slice(-3),
          },
        },
        response: {
          family: payload?.semanticPlan?.family,
          object: payload?.semanticPlan?.canonicalRequest?.semanticAction?.objectClass,
          action: payload?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass,
          operation: payload?.semanticPlan?.canonicalRequest?.operation,
          clarificationNeed: payload?.semanticPlan?.clarificationNeed,
          reply: payload?.reply,
        },
      }, null, 2));
    }
  }
} finally {
  await context.close();
  await browser.close();
}
