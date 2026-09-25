import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

async function runWithCleanup(resource, callback) {
  let result;
  let callbackError = null;

  try {
    result = await callback();
  } catch (error) {
    callbackError = error;
  }

  try {
    await resource.close();
  } catch (cleanupError) {
    if (!callbackError) throw cleanupError;
  }

  if (callbackError) throw callbackError;
  return result;
}

export async function withLaunchedBrowser(launchOptions, callback) {
  const browser = await chromium.launch(launchOptions);
  return runWithCleanup(browser, () => callback(browser));
}

export async function withSeededBrowserContext(browser, contextOptions, initialStorage, callback) {
  const context = await browser.newContext(contextOptions);
  const storage = initialStorage ?? {};

  if (Object.keys(storage).length > 0) {
    await context.addInitScript((values) => {
      for (const [key, value] of Object.entries(values)) {
        localStorage.setItem(key, String(value));
      }
    }, storage);
  }

  return runWithCleanup(context, () => callback({ context, initialStorage: storage }));
}

export async function captureScreenshot(page, absolutePath, options = {}) {
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await page.screenshot({ ...options, path: absolutePath });
}
