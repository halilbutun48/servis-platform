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
