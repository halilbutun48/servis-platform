import { chromium } from '@playwright/test';

const base = (process.env.WEB_BASE_URL || 'http://127.0.0.1:5174').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(`${base}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
const identifier = page.locator('input[autocomplete="username"]');
if (await identifier.count()) {
  await identifier.fill('company@demo.com');
  await page.locator('input[autocomplete="current-password"]').fill('demo123');
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL(/#\/company(?:\/shifts)?/, { timeout: 15000 });
}
await page.goto(`${base}/#/company/shifts`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Operasyon menüsü', { state: 'attached', timeout: 15000 });
await page.getByText('Detayları göster', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
{
  const launcher = page.getByRole('button', { name: /Sefer Abi’ye Sor/i }).first();
  if (await launcher.count()) await launcher.click().catch(() => {});
  const composer = page.locator('.copilotDrawer textarea').last();
  await composer.waitFor({ state: 'visible', timeout: 10000 });
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
  await composer.fill('Detayları göster nerede?');
  await composer.press('Enter');
  await responsePromise;
  await page.waitForTimeout(500);
}
await page.goto(`${base}/#/company`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Planlama Merkezi', { state: 'attached', timeout: 15000 });
const disclosure = page.getByText('Ayrıntılı çalışma alanını göster', { exact: true }).last();
if (await disclosure.count()) await disclosure.click().catch(() => {});

let last = 0;
for (const message of [
  'Ben vardiya oluşturmak istiyorum',
  'Yeni vardiya nereden açılıyor?',
  'Vardiya eklemeyi göster',
  'Beni vardiya oluşturma ekranına göt',
  'Vardiya oluşturma yerini bulamadım',
]) {
  const launcher = page.getByRole('button', { name: /Sefer Abi’ye Sor/i }).first();
  if (await launcher.count()) await launcher.click().catch(() => {});
  const composer = page.locator('.copilotDrawer textarea').last();
  await composer.waitFor({ state: 'visible', timeout: 10000 });
  const prior = await page.locator('.copilotMsg.assistant').count();
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
  await composer.fill(message);
  await composer.press('Enter');
  const response = await responsePromise;
  const payload = await response.json();
  await page.locator('.copilotMsg.assistant').nth(prior).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(400);
  console.log(JSON.stringify({
    message,
    status: response.status(),
    family: payload?.semanticPlan?.family,
    workflowIntent: payload?.semanticPlan?.workflowIntent,
    action: payload?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass,
    object: payload?.semanticPlan?.canonicalRequest?.semanticAction?.objectClass,
    operation: payload?.semanticPlan?.canonicalRequest?.operation,
    guidedTarget: payload?.guidedTarget && { status: payload.guidedTarget.status, targetKey: payload.guidedTarget.targetKey, label: payload.guidedTarget.label, identitySource: payload.guidedTarget.identitySource },
    reply: String(payload?.reply || '').slice(0, 260),
  }));
}
const routeAction = page.getByRole('button', { name: /Planlama Merkezi ekranına git/i }).last();
if (await routeAction.count()) {
  await routeAction.click();
  await page.waitForURL(/#\/company$/, { timeout: 15000 });
  await page.waitForTimeout(500);
  const staleBeforeRecovery = await page.locator('[role="status"]').allTextContents().catch(() => []);
  console.log(JSON.stringify({ afterRouteAction: page.url(), staleBeforeRecovery }));
}
const recoveryMessage = 'Vardiya oluşturma yerini bulamadım';
const launcher = page.getByRole('button', { name: /Sefer Abi’ye Sor/i }).first();
if (await launcher.count()) await launcher.click().catch(() => {});
const composer = page.locator('.copilotDrawer textarea').last();
await composer.waitFor({ state: 'visible', timeout: 10000 });
const prior = await page.locator('.copilotMsg.assistant').count();
const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
await composer.fill(recoveryMessage);
await composer.press('Enter');
const response = await responsePromise;
const payload = await response.json();
await page.locator('.copilotMsg.assistant').nth(prior).waitFor({ state: 'visible', timeout: 20000 });
console.log(JSON.stringify({ afterRouteRecovery: { status: response.status(), url: page.url(), family: payload?.semanticPlan?.family, workflowIntent: payload?.semanticPlan?.workflowIntent, operation: payload?.semanticPlan?.canonicalRequest?.operation, guidedTarget: payload?.guidedTarget, reply: payload?.reply } }));
await context.close();
await browser.close();
