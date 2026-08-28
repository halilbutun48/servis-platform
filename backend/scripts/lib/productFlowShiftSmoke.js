import fs from "node:fs/promises";

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function revealFirstVisibleShiftCardDetails(page) {
  const summaries = page.locator("summary");
  const deadline = Date.now() + 3500;
  while (Date.now() < deadline) {
    const count = await summaries.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const summary = summaries.nth(i);
      const visible = await summary.isVisible({ timeout: 1200 }).catch(() => false);
      const label = normalize(await summary.innerText().catch(() => ""));
      if (!visible || label !== normalize("Detayları göster")) continue;
      await summary.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await summary.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(250);
      return true;
    }
    await page.waitForTimeout(150);
  }
  return false;
}

export async function revealFirstVisibleShiftOtherActions(page) {
  const summaries = page.locator("summary");
  const count = await summaries.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const summary = summaries.nth(i);
    const visible = await summary.isVisible({ timeout: 1200 }).catch(() => false);
    const label = normalize(await summary.innerText().catch(() => ""));
    if (!visible || label !== normalize("Diğer işlemler")) continue;
    await summary.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await summary.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

export async function waitForShiftCardContent(page, timeoutMs = 10000) {
  await page.locator('[data-testid="commercial-shift-card"]').first().waitFor({ state: "attached", timeout: timeoutMs }).catch(() => {});
}

export async function relocateRepoDebugLogIfPresent({ repoDebugLogPath, artifactRoot, chromiumDebugLogPath }) {
  try {
    await fs.access(repoDebugLogPath);
  } catch {
    return;
  }

  await fs.mkdir(artifactRoot, { recursive: true });
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await fs.rm(chromiumDebugLogPath, { force: true, maxRetries: 2, retryDelay: 100 });
      await fs.rename(repoDebugLogPath, chromiumDebugLogPath);
      return;
    } catch (error) {
      lastError = error;
      if (!new Set(["EBUSY", "EPERM", "EACCES"]).has(error?.code)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  try {
    await fs.copyFile(repoDebugLogPath, chromiumDebugLogPath);
    await fs.rm(repoDebugLogPath, { force: true, maxRetries: 5, retryDelay: 200 });
    await fs.access(repoDebugLogPath);
    throw lastError || new Error("debug.log could not be removed after artifact copy");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}
